import express from 'express';
import crypto from 'crypto';
import { seal } from './tokenVault.ts';

// "Connect account" OAuth flows. Each flow starts from /api/auth/<platform>/url (signed-in
// users only, enforced where the router is mounted), and the callback stores the tokens
// server-side, encrypted, in user_settings for that profile. Tokens never reach the browser.

function base64url(input: Buffer) {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Pending OAuth flows, keyed by a random state (in memory: fine for one small instance).
type Platform = 'twitter' | 'linkedin' | 'tiktok' | 'meta';
const pending = new Map<string, { platform: Platform; profileId: string; verifier?: string; expires: number }>();
function startFlow(platform: Platform, req: express.Request, withPkce = false) {
  for (const [k, v] of pending) if (v.expires < Date.now()) pending.delete(k);
  const state = crypto.randomBytes(16).toString('hex');
  const verifier = withPkce ? base64url(crypto.randomBytes(32)) : undefined;
  const profileId = String(req.query.profile_id || 'default').slice(0, 100);
  pending.set(state, { platform, profileId, verifier, expires: Date.now() + 10 * 60 * 1000 });
  const challenge = verifier ? base64url(crypto.createHash('sha256').update(verifier).digest()) : undefined;
  return { state, challenge };
}
function takeFlow(req: express.Request, platform: Platform) {
  if (req.query.error) throw new Error(String(req.query.error_description || req.query.error_message || req.query.error));
  const flow = pending.get(String(req.query.state || ''));
  pending.delete(String(req.query.state || ''));
  if (!flow || flow.platform !== platform || flow.expires < Date.now()) throw new Error('This connection link expired. Start again from TitanLeap.');
  if (!req.query.code) throw new Error('No authorization code returned');
  return flow;
}

// server.ts provides how account fields are saved (upsert into user_settings).
type AccountStore = (profileId: string, fields: Record<string, any>) => Promise<void>;
let storeAccount: AccountStore | null = null;
export function setAccountStore(fn: AccountStore) { storeAccount = fn; }
async function store(profileId: string, fields: Record<string, any>) {
  if (!storeAccount) throw new Error('Account storage is not configured');
  await storeAccount(profileId, { ...fields, updated_at: new Date().toISOString() });
}

const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const redirectUri = (platform: Platform) => `${appUrl()}/api/auth/${platform}/callback`;

// Popup flows tell the opener (same origin only); same-tab flows return to Auto Post.
function finish(res: express.Response, platform: Platform, error?: string) {
  const payload = JSON.stringify({ type: 'ACCOUNT_CONNECTED', platform, ok: !error, error: error || null });
  const back = error
    ? `/?connect_error=${encodeURIComponent(error.slice(0, 200))}&platform=${platform}`
    : `/?connected=${platform}`;
  const safe = (s: string) => s.replace(/[<>&]/g, '');
  res.status(error ? 400 : 200).send(`<!doctype html><html><body style="font-family:system-ui;padding:24px">
<p>${error ? `Connection failed: ${safe(error)}` : 'Connected. Returning to TitanLeap…'}</p>
<script>
  if (window.opener) { window.opener.postMessage(${payload}, window.location.origin); window.close(); }
  else { window.location.replace(${JSON.stringify(back)}); }
</script></body></html>`);
}

const router = express.Router();

// ─── X (Twitter): OAuth 2.0 with PKCE ───
router.get('/twitter/url', (req, res) => {
  const { state, challenge } = startFlow('twitter', req, true);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TWITTER_CLIENT_ID || '',
    redirect_uri: redirectUri('twitter'),
    scope: 'tweet.read tweet.write users.read offline.access',
    state, code_challenge: challenge!, code_challenge_method: 'S256',
  });
  res.json({ url: `https://twitter.com/i/oauth2/authorize?${params}` });
});

router.get('/twitter/callback', async (req, res) => {
  try {
    const flow = takeFlow(req, 'twitter');
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code: String(req.query.code), grant_type: 'authorization_code',
        client_id: process.env.TWITTER_CLIENT_ID || '', redirect_uri: redirectUri('twitter'),
        code_verifier: flow.verifier!,
      }),
    });
    const t: any = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !t.access_token) throw new Error(t.error_description || 'X did not return a token');
    await store(flow.profileId, { twitter_token: seal(t.access_token), twitter_refresh_token: seal(t.refresh_token) });
    finish(res, 'twitter');
  } catch (err: any) {
    finish(res, 'twitter', err?.message || 'X connection failed');
  }
});

// ─── LinkedIn ───
// Company page posting needs the Community Management API; set LINKEDIN_COMPANY_POSTING=true
// once LinkedIn approves it, or LinkedIn rejects the extra scopes.
const linkedinScopes = () => [
  'openid', 'profile', 'w_member_social',
  ...(process.env.LINKEDIN_COMPANY_POSTING === 'true' ? ['w_organization_social', 'rw_organization_admin'] : []),
].join(' ');

router.get('/linkedin/url', (req, res) => {
  const { state } = startFlow('linkedin', req);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID || '',
    redirect_uri: redirectUri('linkedin'),
    state, scope: linkedinScopes(),
  });
  res.json({ url: `https://www.linkedin.com/oauth/v2/authorization?${params}` });
});

router.get('/linkedin/callback', async (req, res) => {
  try {
    const flow = takeFlow(req, 'linkedin');
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code', code: String(req.query.code), redirect_uri: redirectUri('linkedin'),
        client_id: process.env.LINKEDIN_CLIENT_ID || '', client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      }),
    });
    const t: any = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !t.access_token) throw new Error(t.error_description || 'LinkedIn did not return a token');

    // Who this token can post as: the member always; a company page if it administers one.
    const headers = { Authorization: `Bearer ${t.access_token}`, 'X-Restli-Protocol-Version': '2.0.0' };
    let personId: string | null = null;
    let orgId: string | null = null;
    const me = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${t.access_token}` } });
    if (me.ok) personId = ((await me.json()) as any)?.sub || null;
    if (String(t.scope || '').includes('rw_organization_admin')) {
      const acl = await fetch('https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED', { headers });
      if (acl.ok) {
        const urn = ((await acl.json()) as any)?.elements?.[0]?.organization;
        if (urn) orgId = String(urn).split(':').pop() || null;
      }
    }
    await store(flow.profileId, {
      linkedin_token: seal(t.access_token), linkedin_refresh_token: seal(t.refresh_token),
      linkedin_person_id: personId, ...(orgId ? { linkedin_org_id: orgId } : {}),
    });
    finish(res, 'linkedin');
  } catch (err: any) {
    finish(res, 'linkedin', err?.message || 'LinkedIn connection failed');
  }
});

// ─── TikTok: OAuth 2.0 with PKCE ───
router.get('/tiktok/url', (req, res) => {
  const { state, challenge } = startFlow('tiktok', req, true);
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY || '',
    response_type: 'code',
    scope: 'user.info.basic,video.publish,video.upload',
    redirect_uri: redirectUri('tiktok'),
    state, code_challenge: challenge!, code_challenge_method: 'S256',
  });
  res.json({ url: `https://www.tiktok.com/v2/auth/authorize/?${params}` });
});

router.get('/tiktok/callback', async (req, res) => {
  try {
    const flow = takeFlow(req, 'tiktok');
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || '', client_secret: process.env.TIKTOK_CLIENT_SECRET || '',
        code: String(req.query.code), grant_type: 'authorization_code',
        redirect_uri: redirectUri('tiktok'), code_verifier: flow.verifier!,
      }),
    });
    const t: any = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || t.error || !t.access_token) throw new Error(t.error_description || 'TikTok did not return a token');
    await store(flow.profileId, {
      tiktok_token: seal(t.access_token), tiktok_refresh_token: seal(t.refresh_token), tiktok_open_id: t.open_id || null,
    });
    finish(res, 'tiktok');
  } catch (err: any) {
    finish(res, 'tiktok', err?.message || 'TikTok connection failed');
  }
});

// ─── Meta: one login connects the Facebook Page and its Instagram business account ───
const META_GRAPH = 'https://graph.facebook.com/v21.0';
router.get('/meta/url', (req, res) => {
  const { state } = startFlow('meta', req);
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || '',
    redirect_uri: redirectUri('meta'),
    state, response_type: 'code',
    scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management',
  });
  res.json({ url: `https://www.facebook.com/v21.0/dialog/oauth?${params}` });
});

router.get('/meta/callback', async (req, res) => {
  try {
    const flow = takeFlow(req, 'meta');
    const app = { client_id: process.env.META_APP_ID || '', client_secret: process.env.META_APP_SECRET || '' };
    const short: any = await (await fetch(`${META_GRAPH}/oauth/access_token?` + new URLSearchParams({
      ...app, redirect_uri: redirectUri('meta'), code: String(req.query.code),
    }))).json();
    if (!short.access_token) throw new Error(short?.error?.message || 'Meta did not return a token');
    // Long-lived user token -> Page tokens that don't expire.
    const long: any = await (await fetch(`${META_GRAPH}/oauth/access_token?` + new URLSearchParams({
      ...app, grant_type: 'fb_exchange_token', fb_exchange_token: short.access_token,
    }))).json();
    const userToken = long.access_token || short.access_token;
    const pages: any = await (await fetch(`${META_GRAPH}/me/accounts?` + new URLSearchParams({
      fields: 'id,name,access_token,instagram_business_account{id,username}', access_token: userToken, limit: '50',
    }))).json();
    const list: any[] = pages?.data || [];
    if (list.length === 0) throw new Error('No Facebook Page found. Log in with the Facebook account that manages your Page, and select the Page when asked.');
    const page = list.find(p => p.instagram_business_account) || list[0];
    await store(flow.profileId, {
      facebook_token: seal(page.access_token),
      meta_fb_page_id: page.id,
      meta_ig_user_id: page.instagram_business_account?.id || null,
    });
    finish(res, 'meta');
  } catch (err: any) {
    finish(res, 'meta', err?.message || 'Meta connection failed');
  }
});

export const authRouter = router;
