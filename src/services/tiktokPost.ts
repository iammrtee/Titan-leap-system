// TikTok Direct Post (Content Posting API), built to TikTok's Content Sharing Guidelines:
// the user picks privacy and interactions on every post, discloses commercial content,
// and consents before anything is sent. Server-only.
import { Readable } from 'stream';
import { seal, unseal } from './tokenVault.ts';
import type { Express, RequestHandler } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';

const TT_API = 'https://open.tiktokapis.com/v2';
const PRIVACY_LEVELS = ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'];
const isVideoUrl = (u: string) => /\.(mp4|mov|webm)(\?|$)/i.test(u);

class TikTokError extends Error {
  constructor(message: string, public code?: string, public status = 400) { super(message); }
}

const FRIENDLY: Record<string, string> = {
  spam_risk_too_many_posts: 'This TikTok account has hit its daily posting limit. Try again tomorrow.',
  spam_risk_user_banned_from_posting: 'TikTok is not allowing this account to post right now.',
  reached_active_user_cap: 'TitanLeap has reached its daily TikTok posting quota. Try again later.',
  unaudited_client_can_only_post_to_private_accounts: 'Until TikTok approves TitanLeap, the TikTok account must be set to private and posts must be "Only me".',
  url_ownership_unverified: "TikTok couldn't verify the media link's domain. Verify monolith.titanleap.co under URL properties in the TikTok developer portal.",
  privacy_level_option_mismatch: 'That privacy option is not available for this account. Pick another.',
  access_token_invalid: 'The TikTok connection has expired. Connect TikTok again.',
  scope_not_authorized: 'TikTok posting permission was not granted. Connect TikTok again and allow posting.',
  rate_limit_exceeded: 'Too many TikTok requests. Wait a minute and try again.',
};

export function registerTikTokRoutes(app: Express, opts: {
  supabase: SupabaseClient;
  supabaseUrl: string;
  requireUser: RequestHandler;
}) {
  const { supabase, supabaseUrl, requireUser } = opts;
  const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  async function saveTokens(profileId: string, t: any) {
    const { error } = await supabase.from('user_settings').upsert({
      profile_id: profileId,
      tiktok_token: seal(t.access_token),
      tiktok_refresh_token: seal(t.refresh_token),
      tiktok_open_id: t.open_id || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'profile_id' });
    if (error) {
      throw new Error(/column/i.test(error.message)
        ? 'The database is missing the TikTok columns. Run section 12 of supabase-schema.sql in Supabase.'
        : error.message);
    }
  }

  async function loadTokens(profileId: string) {
    const { data } = await supabase.from('user_settings')
      .select('tiktok_token, tiktok_refresh_token').eq('profile_id', profileId).maybeSingle();
    const access = unseal((data as any)?.tiktok_token) || (profileId === 'default' ? process.env.TIKTOK_ACCESS_TOKEN : null) || null;
    return { access, refresh: unseal((data as any)?.tiktok_refresh_token) };
  }

  async function refreshTokens(profileId: string, refreshToken: string) {
    const res = await fetch(`${TT_API}/oauth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY || '',
        client_secret: process.env.TIKTOK_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data.error || !data.access_token) throw new TikTokError(FRIENDLY.access_token_invalid, 'access_token_invalid', 401);
    await saveTokens(profileId, data);
    return data.access_token as string;
  }

  // POST to the Content Posting API, refreshing the access token once if it has expired.
  async function ttPost(profileId: string, path: string, body: any) {
    let { access, refresh } = await loadTokens(profileId);
    if (!access) throw new TikTokError('TikTok is not connected', 'not_connected', 401);
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`${TT_API}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(body ?? {}),
      });
      const data: any = await res.json().catch(() => ({}));
      const code = data?.error?.code;
      if (code === 'ok') return data.data || {};
      if (code === 'access_token_invalid' && refresh && attempt === 0) {
        access = await refreshTokens(profileId, refresh);
        continue;
      }
      throw new TikTokError(FRIENDLY[code] || data?.error?.message || `TikTok error ${res.status}`, code, res.status >= 400 ? res.status : 400);
    }
    throw new TikTokError('TikTok request failed');
  }

  const sendError = (res: any, err: any) =>
    res.status(err instanceof TikTokError ? err.status : 500).json({ error: err?.message || 'TikTok request failed', code: err?.code });

  // Stored media served from our own (TikTok-verified) domain, since PULL_FROM_URL only
  // accepts URLs on a verified domain. Streams, so memory use stays flat.
  app.get('/tt-media/*', async (req, res) => {
    const objectPath = (req.params as any)[0] as string;
    if (!objectPath || objectPath.includes('..') || !/^[A-Za-z0-9._\-/]+$/.test(objectPath)) return res.status(400).end();
    try {
      const upstream = await fetch(`${supabaseUrl}/storage/v1/object/public/media/${objectPath}`);
      if (!upstream.ok || !upstream.body) return res.status(upstream.status || 502).end();
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
      const len = upstream.headers.get('content-length');
      if (len) res.setHeader('Content-Length', len);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      Readable.fromWeb(upstream.body as any).pipe(res);
    } catch {
      res.status(502).end();
    }
  });

  const toProxyUrl = (url: string) => {
    const marker = '/storage/v1/object/public/media/';
    const i = url.indexOf(marker);
    if (i < 0 || !url.startsWith(supabaseUrl)) throw new TikTokError('Media must be uploaded in TitanLeap before posting to TikTok.');
    return `${appUrl()}/tt-media/${url.slice(i + marker.length)}`;
  };

  // Fresh creator info on every render of the TikTok panel (required by the guidelines).
  app.get('/api/tiktok/creator-info', requireUser, async (req, res) => {
    const profileId = String(req.query.profile_id || 'default');
    try {
      const creator = await ttPost(profileId, '/post/publish/creator_info/query/', {});
      res.json({ connected: true, creator });
    } catch (err: any) {
      if (err?.code === 'not_connected') return res.json({ connected: false });
      if (err?.code === 'access_token_invalid' || err?.code === 'scope_not_authorized') return res.json({ connected: false, error: err.message });
      // Connected, but TikTok says this creator can't post right now.
      res.json({ connected: true, blocked: true, error: err?.message, code: err?.code });
    }
  });

  app.post('/api/tiktok/publish', requireUser, async (req, res) => {
    const {
      profile_id, media, title, description, privacy_level,
      allow_comment, allow_duet, allow_stitch, brand_organic, brand_content, consent,
    } = req.body || {};
    const profileId = String(profile_id || 'default');
    try {
      if (consent !== true) throw new TikTokError('Confirm you want to post before sending to TikTok.');
      if (!Array.isArray(media) || media.length === 0) throw new TikTokError('Add a video or photos first.');
      if (!PRIVACY_LEVELS.includes(privacy_level)) throw new TikTokError('Choose who can view this post.');
      if (brand_content && privacy_level === 'SELF_ONLY') throw new TikTokError('Branded content visibility cannot be set to private.');

      // Re-check the creator's current options server-side; the UI could be stale.
      const creator = await ttPost(profileId, '/post/publish/creator_info/query/', {});
      if (!(creator.privacy_level_options || []).includes(privacy_level)) throw new TikTokError(FRIENDLY.privacy_level_option_mismatch, 'privacy_level_option_mismatch');

      const videos = media.filter((u: string) => isVideoUrl(u));
      const isVideo = videos.length > 0;
      if (isVideo && media.length > 1) throw new TikTokError('TikTok takes one video, or up to 35 photos. Not both.');
      if (!isVideo && media.length > 35) throw new TikTokError('TikTok photo posts take up to 35 photos.');
      const urls = media.map(toProxyUrl);

      const brand = { brand_organic_toggle: !!brand_organic, brand_content_toggle: !!brand_content };
      let result: any;
      if (isVideo) {
        result = await ttPost(profileId, '/post/publish/video/init/', {
          post_info: {
            title: String(title || '').slice(0, 2200),
            privacy_level,
            disable_comment: !allow_comment || !!creator.comment_disabled,
            disable_duet: !allow_duet || !!creator.duet_disabled,
            disable_stitch: !allow_stitch || !!creator.stitch_disabled,
            ...brand,
          },
          source_info: { source: 'PULL_FROM_URL', video_url: urls[0] },
        });
      } else {
        result = await ttPost(profileId, '/post/publish/content/init/', {
          media_type: 'PHOTO',
          post_mode: 'DIRECT_POST',
          post_info: {
            title: String(title || '').slice(0, 90),
            description: String(description || '').slice(0, 4000),
            privacy_level,
            disable_comment: !allow_comment || !!creator.comment_disabled,
            ...brand,
          },
          source_info: { source: 'PULL_FROM_URL', photo_images: urls, photo_cover_index: 0 },
        });
      }

      // Keep a record alongside the other platforms' posts.
      let postId: string | null = null;
      const { data: row } = await supabase.from('scheduled_posts').insert({
        profile_id: profileId,
        caption: isVideo ? String(title || '') : [title, description].filter(Boolean).join('\n\n'),
        media_urls: media,
        platforms: ['tiktok'],
        scheduled_for: new Date().toISOString(),
        status: 'publishing',
        platform_results: { tiktok: { publish_id: result.publish_id, status: 'PROCESSING' } },
      }).select('id').single();
      postId = (row as any)?.id || null;

      res.json({ publish_id: result.publish_id, post_id: postId });
    } catch (err: any) {
      sendError(res, err);
    }
  });

  app.post('/api/tiktok/status', requireUser, async (req, res) => {
    const { profile_id, publish_id, post_id } = req.body || {};
    const profileId = String(profile_id || 'default');
    try {
      if (!publish_id) throw new TikTokError('publish_id is required');
      const data = await ttPost(profileId, '/post/publish/status/fetch/', { publish_id });
      const done = data.status === 'PUBLISH_COMPLETE' || data.status === 'SEND_TO_USER_INBOX';
      const failed = data.status === 'FAILED';
      if (post_id && (done || failed)) {
        await supabase.from('scheduled_posts').update({
          status: done ? 'sent' : 'failed',
          platform_results: { tiktok: done
            ? { success: true, publish_id, status: data.status }
            : { success: false, publish_id, error: data.fail_reason || 'TikTok could not publish the post' } },
          updated_at: new Date().toISOString(),
        }).eq('id', post_id);
      }
      res.json({ status: data.status, fail_reason: data.fail_reason || null });
    } catch (err: any) {
      sendError(res, err);
    }
  });

  // Account name for the Connected Accounts list.
  async function status(profileId: string) {
    try {
      const c = await ttPost(profileId, '/post/publish/creator_info/query/', {});
      return { connected: true, account: c.creator_username ? `@${c.creator_username}` : c.creator_nickname || 'Connected' };
    } catch (err: any) {
      if (err?.code === 'not_connected') return { connected: false, error: 'Not connected' };
      if (err?.code === 'access_token_invalid' || err?.code === 'scope_not_authorized') return { connected: false, error: err.message };
      return { connected: true, account: 'Connected', error: err?.message };
    }
  }

  return { saveTokens, status };
}
