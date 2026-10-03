// Real posts for X, LinkedIn, Facebook and YouTube via Treg (server-only, no scraping on our box).
// ~$0.003-0.006 per profile, cached 24h in treg.ts. Returns null when Treg isn't configured
// or the platform returns too little, so the caller can fall back to the web-read audit.
import { tregCall, tregEnabled } from './treg.ts';

export interface NormPost {
  ts: number | null;      // ms epoch, null when the provider gives no date
  text: string;
  engagement: number | null; // likes + comments/replies/shares, null when not provided
  views: number | null;
  url: string | null;
}

export interface PlatformPosts {
  followers: number | null;
  posts: NormPost[];
  datesAvailable: boolean;
  engagementAvailable: boolean;
  note: string;
}

export const TREG_POST_PLATFORMS = ['Twitter-X', 'LinkedIn', 'Facebook', 'YouTube'];

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// "3M subscribers" / "12.4K" / "1,234" -> number
const parseCount = (v: unknown): number | null => {
  if (typeof v === 'number') return v;
  const m = String(v ?? '').replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return null;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase() as 'K' | 'M' | 'B'] || 1;
  return Math.round(parseFloat(m[1]) * mult);
};

const asData = <T,>(r: any): T | null => (r && !r.skipped ? (r.data as T) : null);

async function xPosts(handleUrl: string): Promise<PlatformPosts | null> {
  const username = handleUrl.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '').split(/[/?#]/)[0].replace(/^@/, '');
  if (!username) return null;
  const [posts, profile] = await Promise.all([
    tregCall<{ posts: any[] }>('treg.x.user.posts', { username, limit: 40 }),
    tregCall<any>('treg.x.user.profile', { username }),
  ]);
  const all = asData<{ posts: any[] }>(posts)?.posts || [];
  // Replies are mostly customer service, not content. Judge original posts when there are enough.
  const originals = all.filter(p => !p.isReply);
  const used = originals.length >= 6 ? originals : all;
  return {
    followers: num(asData<any>(profile)?.followers),
    posts: used.map(p => ({
      ts: num(p.createdUtc) ? p.createdUtc * 1000 : null,
      text: String(p.text || ''),
      engagement: (num(p.likes) || 0) + (num(p.replies) || 0) + (num(p.retweets) || 0) + (num(p.quotes) || 0),
      views: num(p.views),
      url: p.url || null,
    })),
    datesAvailable: true,
    engagementAvailable: true,
    note: originals.length >= 6 ? `${originals.length} original posts (replies excluded)` : `${all.length} recent posts and replies`,
  };
}

async function linkedinPosts(handleUrl: string): Promise<PlatformPosts | null> {
  const linkedin_url = handleUrl.split('?')[0];
  const [posts, profile] = await Promise.all([
    tregCall<{ posts: any[] }>('treg.linkedin.company.posts', { linkedin_url }),
    tregCall<any>('treg.linkedin.company.profile', { linkedin_url }),
  ]);
  const all = asData<{ posts: any[] }>(posts)?.posts || [];
  return {
    followers: parseCount(asData<any>(profile)?.followers),
    posts: all.map(p => ({
      ts: p.datePublished ? +new Date(p.datePublished) || null : null,
      text: String(p.text || ''),
      engagement: null, // LinkedIn's public data carries no likes/comments
      views: null,
      url: p.url || null,
    })),
    datesAvailable: all.some(p => p.datePublished),
    engagementAvailable: false,
    note: 'LinkedIn shows posts and dates but no likes or comments, so engagement is not scored',
  };
}

async function facebookPosts(handleUrl: string): Promise<PlatformPosts | null> {
  const url = handleUrl.split('?')[0];
  const [posts, profile] = await Promise.all([
    tregCall<{ posts: any[] }>('treg.facebook.user.posts', { url }),
    tregCall<any>('treg.facebook.user.profile', { url }),
  ]);
  const all = asData<{ posts: any[] }>(posts)?.posts || [];
  const p0 = asData<any>(profile);
  return {
    followers: parseCount(p0?.followers ?? p0?.followers_count ?? p0?.likes),
    posts: all.map(p => ({
      ts: num(p.createdUtc) ? p.createdUtc * 1000 : null,
      text: String(p.text || ''),
      engagement: (num(p.likes) || 0) + (num(p.comments) || 0),
      views: null,
      url: p.url || null,
    })),
    datesAvailable: true,
    engagementAvailable: true,
    note: 'Facebook posts with reactions and comments',
  };
}

// The channel id is in the page source of any channel URL (free); only the data calls cost money.
async function youtubeChannelId(handleUrl: string): Promise<string | null> {
  const direct = handleUrl.match(/\/channel\/(UC[\w-]{22})/);
  if (direct) return direct[1];
  try {
    const r = await fetch(handleUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(10_000) });
    const html = await r.text();
    return html.match(/"(?:channelId|externalId)":"(UC[\w-]{22})"/)?.[1] || null;
  } catch { return null; }
}

async function youtubePosts(handleUrl: string): Promise<PlatformPosts | null> {
  const channelId = await youtubeChannelId(handleUrl);
  if (!channelId) return null;
  const [videos, profile] = await Promise.all([
    tregCall<{ videos: any[] }>('scrapecreators.x.v1-youtube-channel-videos', { channelId }, 'GET'),
    tregCall<any>('treg.youtube.channel.profile', { channel_id: channelId }),
  ]);
  const all = asData<{ videos: any[] }>(videos)?.videos || [];
  return {
    followers: parseCount(asData<any>(profile)?.subscribers),
    posts: all.map(v => ({
      ts: null, // the provider does not return publish dates for channel videos
      text: [v.title, v.description].filter(Boolean).join('\n'),
      engagement: null,
      views: num(v.viewCountInt),
      url: v.url || null,
    })),
    datesAvailable: false,
    engagementAvailable: false,
    note: 'YouTube shows titles and view counts but no publish dates, so posting cadence is not scored',
  };
}

export async function fetchPlatformPosts(platform: string, handleUrl: string): Promise<PlatformPosts | null> {
  if (!tregEnabled()) return null;
  const result =
    platform === 'Twitter-X' ? await xPosts(handleUrl)
    : platform === 'LinkedIn' ? await linkedinPosts(handleUrl)
    : platform === 'Facebook' ? await facebookPosts(handleUrl)
    : platform === 'YouTube' ? await youtubePosts(handleUrl)
    : null;
  // Facebook's provider returns very few posts per page, too thin to score.
  const min = platform === 'Facebook' ? 5 : 3;
  return result && result.posts.length >= min ? result : null;
}
