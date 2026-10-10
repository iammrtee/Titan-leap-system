import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Loader2, Play, Check, AlertCircle, ExternalLink, Info } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import { getAuthHeader } from '@/src/lib/supabase';

// Follows TikTok's Content Sharing Guidelines for Direct Post: fresh creator info, no default
// privacy, interactions off by default, commercial content disclosure, music/branded content
// declarations, preview, explicit consent, and a processing notice with live status.

interface Asset { url: string; type: 'image' | 'video'; name: string }
interface CreatorInfo {
  creator_avatar_url?: string;
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
}

const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: 'Everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me',
};
const MUSIC_URL = 'https://www.tiktok.com/legal/page/global/music-usage-confirmation/en';
const BC_POLICY_URL = 'https://www.tiktok.com/legal/page/global/bc-policy/en';
const STATUS_LABELS: Record<string, string> = {
  PROCESSING_DOWNLOAD: 'TikTok is downloading your media…',
  PROCESSING_UPLOAD: 'TikTok is processing your media…',
  SEND_TO_USER_INBOX: 'Sent to your TikTok inbox to finish posting.',
  PUBLISH_COMPLETE: 'Posted to TikTok.',
  FAILED: 'TikTok could not publish this post.',
};

export interface TikTokComposerHandle {
  /** Things still missing before this can post; empty when ready. */
  validate: () => string[];
  /** Sends the post to TikTok. Resolves true when TikTok accepted it. */
  post: () => Promise<boolean>;
}

export const TikTokComposer = forwardRef<TikTokComposerHandle, { assets: Asset[]; caption: string; profileId: string; embedded?: boolean }>(
({ assets, caption, profileId, embedded }, ref) => {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const isVideo = assets.some(a => a.type === 'video');
  const mixedMedia = isVideo && assets.length > 1;

  const firstLine = (caption.split('\n').find(l => l.trim()) || '').trim();
  const [title, setTitle] = useState(isVideo ? caption : firstLine.slice(0, 90));
  const [description, setDescription] = useState(caption);
  // Follow the main caption until the user edits these fields themselves.
  const touched = useRef(false);
  useEffect(() => {
    if (touched.current) return;
    setTitle(isVideo ? caption.slice(0, 2200) : firstLine.slice(0, 90));
    setDescription(caption.slice(0, 4000));
  }, [caption, isVideo]);
  const [privacy, setPrivacy] = useState('');
  const [allowComment, setAllowComment] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [disclose, setDisclose] = useState(false);
  const [yourBrand, setYourBrand] = useState(false);
  const [brandedContent, setBrandedContent] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const [posting, setPosting] = useState(false);
  const [publish, setPublish] = useState<{ id: string; postId: string | null; status: string; failReason?: string | null } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Creator info is fetched fresh every time the panel renders, as TikTok requires.
  const loadCreator = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tiktok/creator-info?profile_id=${encodeURIComponent(profileId)}`, { headers: await getAuthHeader() });
      const data = await res.json();
      setConnected(!!data.connected);
      setCreator(data.creator || null);
      setBlockedReason(data.blocked ? data.error : null);
      setConnectError(!data.connected ? data.error || null : null);
    } catch {
      setConnectError('Could not reach TikTok. Try again.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadCreator(); }, [profileId]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Branded content can't be private.
  useEffect(() => {
    if (brandedContent && privacy === 'SELF_ONLY') {
      setPrivacy('');
      toast.info('Branded content visibility cannot be set to private. Choose who can view it.');
    }
  }, [brandedContent]);

  const connect = async () => {
    try {
      const res = await fetch(`/api/auth/tiktok/url?profile_id=${encodeURIComponent(profileId)}`, { headers: await getAuthHeader() });
      const { url } = await res.json();
      if (!url) throw new Error();
      window.location.href = url;
    } catch {
      toast.error('Could not start the TikTok connection.');
    }
  };

  const maxDuration = creator?.max_video_post_duration_sec;
  const tooLong = isVideo && videoDuration !== null && !!maxDuration && videoDuration > maxDuration;
  const disclosureIncomplete = disclose && !yourBrand && !brandedContent;

  const problems = useMemo(() => {
    const list: string[] = [];
    if (assets.length === 0) list.push('Add a video or photos above.');
    if (mixedMedia) list.push('TikTok takes one video, or photos only. Remove the extra media.');
    if (!isVideo && assets.length > 35) list.push('TikTok photo posts take up to 35 photos.');
    if (tooLong) list.push(`This video is ${Math.round(videoDuration!)}s; this account can post up to ${maxDuration}s.`);
    if (!privacy) list.push('Choose who can view this post.');
    if (disclosureIncomplete) list.push('You need to indicate if your content promotes yourself, a third party, or both.');
    return list;
  }, [assets.length, mixedMedia, isVideo, tooLong, privacy, disclosureIncomplete, videoDuration, maxDuration]);

  const canPost = connected && !blockedReason && !posting && problems.length === 0 && !publish;

  const pollStatus = (publishId: string, postId: string | null) => {
    let tries = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      tries++;
      try {
        const res = await fetch('/api/tiktok/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
          body: JSON.stringify({ profile_id: profileId, publish_id: publishId, post_id: postId }),
        });
        const data = await res.json();
        if (data.status) setPublish(p => p ? { ...p, status: data.status, failReason: data.fail_reason } : p);
        if (['PUBLISH_COMPLETE', 'FAILED', 'SEND_TO_USER_INBOX'].includes(data.status) || tries > 40) {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    }, 5000);
  };

  const postToTikTok = async (): Promise<boolean> => {
    if (!canPost) return false;
    setPosting(true);
    try {
      const res = await fetch('/api/tiktok/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
        body: JSON.stringify({
          profile_id: profileId,
          media: assets.map(a => a.url),
          title, description: isVideo ? undefined : description,
          privacy_level: privacy,
          allow_comment: allowComment, allow_duet: allowDuet, allow_stitch: allowStitch,
          brand_organic: disclose && yourBrand, brand_content: disclose && brandedContent,
          consent: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'TikTok post failed');
      setPublish({ id: data.publish_id, postId: data.post_id, status: 'PROCESSING_DOWNLOAD' });
      toast.success('Sent to TikTok', { description: 'Processing can take a few minutes before it appears on your profile.' });
      pollStatus(data.publish_id, data.post_id);
      return true;
    } catch (err: any) {
      toast.error('TikTok post failed', { description: err.message });
      return false;
    } finally {
      setPosting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    validate: () => {
      if (loading) return ['TikTok is still loading. Try again in a moment.'];
      if (!connected) return ['Connect TikTok first.'];
      if (blockedReason) return [blockedReason];
      return problems;
    },
    post: postToTikTok,
  }));

  const labelNotice = !disclose ? null
    : brandedContent ? `Your ${isVideo ? 'video' : 'photo'} will be labeled as "Paid partnership"`
    : yourBrand ? `Your ${isVideo ? 'video' : 'photo'} will be labeled as "Promotional content"`
    : null;

  const sectionLabel = "text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60";
  const checkboxRow = (checked: boolean, onChange: (v: boolean) => void, label: string, disabled?: boolean, note?: string) => (
    <label className={cn("flex items-center gap-2.5 text-sm font-medium", disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer")} title={note}>
      <input type="checkbox" checked={checked && !disabled} disabled={disabled} onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#7c3aed]" />
      {label}{disabled && note && <span className="text-[10px] text-on-surface-variant/60">({note})</span>}
    </label>
  );

  return (
    <div className="bg-surface-container-low rounded-2xl border border-cyan-500/20 p-6 space-y-5" data-testid="tiktok-composer">
      <div className="flex items-center justify-between">
        <div className={cn(sectionLabel, "flex items-center gap-2")}><Play size={12} /> Post to TikTok</div>
        {connected && <button onClick={loadCreator} className="text-[10px] font-bold text-primary">Refresh account</button>}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-on-surface-variant"><Loader2 size={16} className="animate-spin" /> Checking your TikTok account…</div>
      ) : !connected ? (
        <div className="space-y-3">
          <p className="text-sm text-on-surface-variant">Connect a TikTok account to post your content to it directly from TitanLeap.</p>
          {connectError && <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertCircle size={12} /> {connectError}</p>}
          <button onClick={connect} className="px-4 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-black/80 transition-all">Connect TikTok</button>
        </div>
      ) : (
        <>
          {/* Which account this goes to */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-highest/30 border border-outline-variant/10">
            {creator?.creator_avatar_url
              ? <img src={creator.creator_avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              : <div className="w-10 h-10 rounded-full bg-surface-container-highest" />}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Posting to</p>
              <p className="text-sm font-bold text-on-surface truncate">{creator?.creator_nickname || 'TikTok account'}</p>
              {creator?.creator_username && <p className="text-xs text-on-surface-variant/70 truncate">@{creator.creator_username}</p>}
            </div>
          </div>

          {blockedReason && (
            <p className="text-sm text-red-500 flex items-start gap-2"><AlertCircle size={14} className="mt-0.5 shrink-0" /> {blockedReason}</p>
          )}

          {/* Preview */}
          <div className="space-y-2">
            <div className={sectionLabel}>Preview</div>
            {assets.length === 0 ? (
              <p className="text-xs text-on-surface-variant/60">Add a video or photos in Media Assets above.</p>
            ) : isVideo ? (
              <video src={assets[0].url} controls className="w-48 rounded-xl bg-black"
                onLoadedMetadata={e => setVideoDuration((e.target as HTMLVideoElement).duration)} />
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {assets.map((a, i) => (
                  <div key={a.url} className="relative shrink-0">
                    <img src={a.url} alt={a.name} className="w-20 h-24 object-cover rounded-lg" />
                    <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/70 text-white text-[10px] font-black flex items-center justify-center">{i + 1}</span>
                  </div>
                ))}
              </div>
            )}
            {isVideo && maxDuration ? <p className="text-[10px] text-on-surface-variant/50">This account can post videos up to {maxDuration}s.</p> : null}
          </div>

          {/* Title / description */}
          {isVideo ? (
            <div className="space-y-1.5">
              <div className={sectionLabel}>Caption</div>
              <textarea value={title} onChange={e => { touched.current = true; setTitle(e.target.value.slice(0, 2200)); }} rows={4}
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
              <p className="text-[10px] text-on-surface-variant/40 text-right">{title.length}/2200</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className={sectionLabel}>Title</div>
                <input value={title} onChange={e => { touched.current = true; setTitle(e.target.value.slice(0, 90)); }}
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                <p className="text-[10px] text-on-surface-variant/40 text-right">{title.length}/90</p>
              </div>
              <div className="space-y-1.5">
                <div className={sectionLabel}>Description</div>
                <textarea value={description} onChange={e => { touched.current = true; setDescription(e.target.value.slice(0, 4000)); }} rows={4}
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary" />
                <p className="text-[10px] text-on-surface-variant/40 text-right">{description.length}/4000</p>
              </div>
            </div>
          )}

          {/* Privacy: no default, options from creator info */}
          <div className="space-y-1.5">
            <div className={sectionLabel}>Who can view this post</div>
            <select value={privacy} onChange={e => setPrivacy(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary">
              <option value="" disabled>Select privacy</option>
              {(creator?.privacy_level_options || []).map(opt => {
                const lockPrivate = opt === 'SELF_ONLY' && disclose && brandedContent;
                return (
                  <option key={opt} value={opt} disabled={lockPrivate} title={lockPrivate ? 'Branded content visibility cannot be set to private.' : undefined}>
                    {PRIVACY_LABELS[opt] || opt}{lockPrivate ? ' (not available for branded content)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Interactions: all off by default; greyed out when the creator has turned them off */}
          <div className="space-y-2">
            <div className={sectionLabel}>Allow users to</div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {checkboxRow(allowComment, setAllowComment, 'Comment', creator?.comment_disabled, 'turned off in your TikTok settings')}
              {isVideo && checkboxRow(allowDuet, setAllowDuet, 'Duet', creator?.duet_disabled, 'turned off in your TikTok settings')}
              {isVideo && checkboxRow(allowStitch, setAllowStitch, 'Stitch', creator?.stitch_disabled, 'turned off in your TikTok settings')}
            </div>
          </div>

          {/* Commercial content disclosure */}
          <div className="space-y-3 p-4 rounded-xl border border-outline-variant/15">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-on-surface">Disclose post content</p>
                <p className="text-xs text-on-surface-variant/70">Turn on to disclose that this post promotes goods or services in exchange for something of value. Your post could promote yourself, a third party, or both.</p>
              </div>
              <button role="switch" aria-checked={disclose} onClick={() => { setDisclose(!disclose); if (disclose) { setYourBrand(false); setBrandedContent(false); } }}
                className={cn("relative w-11 h-6 rounded-full transition-colors shrink-0", disclose ? "bg-primary" : "bg-outline-variant/40")}>
                <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", disclose ? "left-[22px]" : "left-0.5")} />
              </button>
            </div>
            {disclose && (
              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={yourBrand} onChange={e => setYourBrand(e.target.checked)} className="w-4 h-4 mt-0.5 accent-[#7c3aed]" />
                  <span><span className="text-sm font-bold block">Your brand</span>
                    <span className="text-xs text-on-surface-variant/70">You are promoting yourself or your own business. This content will be classified as Brand Organic.</span></span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={brandedContent} onChange={e => setBrandedContent(e.target.checked)} className="w-4 h-4 mt-0.5 accent-[#7c3aed]" />
                  <span><span className="text-sm font-bold block">Branded content</span>
                    <span className="text-xs text-on-surface-variant/70">You are promoting another brand or a third party. This content will be classified as Branded Content.</span></span>
                </label>
                {labelNotice && <p className="text-xs font-medium text-primary flex items-center gap-1.5"><Info size={12} /> {labelNotice}</p>}
                {disclosureIncomplete && <p className="text-xs text-amber-500">You need to indicate if your content promotes yourself, a third party, or both.</p>}
              </div>
            )}
          </div>

          {/* Declaration + consent */}
          <p className="text-xs text-on-surface-variant">
            By posting, you agree to TikTok's{' '}
            {disclose && brandedContent && (<><a href={BC_POLICY_URL} target="_blank" rel="noreferrer" className="text-primary underline">Branded Content Policy</a>{' and '}</>)}
            <a href={MUSIC_URL} target="_blank" rel="noreferrer" className="text-primary underline">Music Usage Confirmation</a>.
          </p>

          {problems.length > 0 && !publish && (
            <ul className="text-xs text-on-surface-variant/70 space-y-1">{problems.map(p => <li key={p}>• {p}</li>)}</ul>
          )}

          {publish ? (
            <div className={cn("p-4 rounded-xl border text-sm space-y-1",
              publish.status === 'FAILED' ? "border-red-500/30 text-red-500" : publish.status === 'PUBLISH_COMPLETE' ? "border-green-500/30 text-green-500" : "border-amber-500/30 text-amber-500")}>
              <p className="font-bold flex items-center gap-2">
                {publish.status === 'PUBLISH_COMPLETE' ? <Check size={14} /> : publish.status === 'FAILED' ? <AlertCircle size={14} /> : <Loader2 size={14} className="animate-spin" />}
                {STATUS_LABELS[publish.status] || publish.status}
              </p>
              {publish.status !== 'PUBLISH_COMPLETE' && publish.status !== 'FAILED' && (
                <p className="text-xs text-on-surface-variant">Your post is being processed by TikTok. It can take a few minutes to appear on your profile.</p>
              )}
              {publish.failReason && <p className="text-xs">Reason: {publish.failReason}</p>}
              {publish.status === 'PUBLISH_COMPLETE' && creator?.creator_username && (
                <a href={`https://www.tiktok.com/@${creator.creator_username}`} target="_blank" rel="noreferrer" className="text-xs underline inline-flex items-center gap-1">View profile <ExternalLink size={10} /></a>
              )}
            </div>
          ) : embedded ? (
            <p className="text-xs text-on-surface-variant/60">TikTok posts right away when you press Schedule &amp; Publish. It does not wait for the schedule time.</p>
          ) : (
            <button onClick={postToTikTok} disabled={!canPost}
              title={disclosureIncomplete ? 'You need to indicate if your content promotes yourself, a third party, or both.' : undefined}
              className={cn("w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
                canPost ? "bg-black text-white hover:bg-black/80 shadow-lg" : "bg-black/30 text-white/60 cursor-not-allowed")}>
              {posting ? <><Loader2 size={16} className="animate-spin" /> Sending to TikTok…</> : 'Post to TikTok'}
            </button>
          )}
        </>
      )}
    </div>
  );
});
