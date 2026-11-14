import React from 'react';
import { Plus, Play, FileText } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type CalPost = {
  id: string; day: number; month: number; year: number; platform: string; title: string;
  status: string; type: string; time: string; media?: string[]; brand?: string;
};

export const STAGE_ORDER = ['draft', 'ready', 'approved', 'scheduled', 'published'] as const;
export const STAGE_STYLE: Record<string, { label: string; dot: string; text: string }> = {
  draft: { label: 'Needs design', dot: 'bg-slate-400', text: 'text-slate-600' },
  ready: { label: 'Ready', dot: 'bg-sky-600', text: 'text-sky-700' },
  approved: { label: 'Approved', dot: 'bg-emerald-600', text: 'text-emerald-700' },
  scheduled: { label: 'Scheduled', dot: 'bg-amber-500', text: 'text-amber-700' },
  published: { label: 'Posted', dot: 'bg-violet-600', text: 'text-violet-700' },
};
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const sameDay = (p: CalPost, d: Date) => p.year === d.getFullYear() && p.month === d.getMonth() && p.day === d.getDate();
const isVideoUrl = (u: string) => /\.(mp4|mov|webm)(\?|$)/i.test(u);
const platformName = (p: string) => (p === 'Twitter' ? 'X' : p);

// Monday of the week that contains `d`.
export const weekStartOf = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

const PostCard: React.FC<{ post: CalPost; onOpen: (p: CalPost) => void; showBrand?: boolean }> = ({ post, onOpen, showBrand }) => {
  const st = STAGE_STYLE[post.status] || STAGE_STYLE.draft;
  const first = post.media?.[0];
  return (
    <button onClick={() => onOpen(post)}
      className="w-full text-left bg-surface-container-lowest rounded-[14px] p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)] transition-shadow flex flex-col gap-2 min-w-0">
      <div className="h-[72px] rounded-[10px] overflow-hidden flex items-center justify-center text-[11px] font-semibold bg-surface-container-low text-on-surface-variant/60">
        {first ? (isVideoUrl(first)
          ? <video src={first} className="w-full h-full object-cover" muted playsInline />
          : <img src={first} alt="" className="w-full h-full object-cover" />)
          : post.status === 'draft'
            ? <span>No design yet</span>
            : <span className="flex items-center gap-1 text-primary">{post.type === 'video' ? <Play size={12} /> : <FileText size={12} />}{post.type === 'video' ? 'Video' : 'Text post'}</span>}
      </div>
      <span className="text-[11px] font-semibold text-primary truncate">{platformName(post.platform)} · {post.time}{showBrand && post.brand === 'personal' ? ' · Personal' : ''}</span>
      <span className="text-[13px] font-semibold leading-snug text-on-surface line-clamp-3">{post.title}</span>
      <span className={cn("flex items-center gap-1.5 text-[11px] font-semibold", st.text)}><span className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />{st.label}</span>
    </button>
  );
};

// Seven columns, Monday to Sunday, each post as a card with its design and stage.
export const CalendarWeek: React.FC<{
  posts: CalPost[]; weekStart: Date; onOpen: (p: CalPost) => void; onAdd: (d: Date) => void; showBrand?: boolean;
}> = ({ posts, weekStart, onOpen, onAdd, showBrand }) => {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid grid-cols-7 gap-3 min-w-[900px]">
        {days.map((d, i) => {
          const list = posts.filter(p => sameDay(p, d)).sort((a, b) => a.time.localeCompare(b.time));
          const isToday = d.toDateString() === today.toDateString();
          return (
            <div key={i} className="flex flex-col gap-2.5 min-w-0">
              <div className="flex items-baseline gap-1.5 px-1">
                <span className={cn("text-[13px]", isToday ? "text-primary font-semibold" : "text-on-surface-variant/70")}>{DOW[i]}</span>
                <span className={cn("text-xl font-semibold", isToday ? "text-primary" : "text-on-surface")}>{d.getDate()}</span>
              </div>
              {list.map(p => <PostCard key={p.id} post={p} onOpen={onOpen} showBrand={showBrand} />)}
              <button onClick={() => onAdd(d)} aria-label={`Add a post on ${DOW[i]} ${d.getDate()}`}
                className={cn("rounded-[14px] border-[1.5px] border-dashed border-outline-variant/30 text-on-surface-variant/50 hover:text-primary hover:border-primary/40 text-[13px] font-medium flex items-center justify-center gap-1 transition-colors",
                  list.length ? "h-10" : "h-28")}>
                <Plus size={14} /> Add post
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Posts grouped by stage, for the designer and editor: what needs work next.
export const CalendarBoard: React.FC<{
  posts: CalPost[]; onOpen: (p: CalPost) => void; showBrand?: boolean;
}> = ({ posts, onOpen, showBrand }) => {
  const sorted = [...posts].sort((a, b) => +new Date(a.year, a.month, a.day) - +new Date(b.year, b.month, b.day));
  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid grid-cols-5 gap-3 min-w-[1000px]">
        {STAGE_ORDER.map(stage => {
          const list = sorted.filter(p => (p.status || 'draft') === stage);
          const st = STAGE_STYLE[stage];
          return (
            <div key={stage} className="rounded-[18px] bg-surface-container-low/70 p-3 flex flex-col gap-2.5 min-w-0">
              <div className="flex items-center gap-2 px-1 py-1">
                <span className={cn("w-2 h-2 rounded-full", st.dot)} />
                <span className="text-sm font-semibold text-on-surface">{st.label}</span>
                <span className="text-[13px] text-on-surface-variant/60">{list.length}</span>
              </div>
              {list.map(p => (
                <div key={p.id} className="space-y-1">
                  <span className="text-[11px] text-on-surface-variant/60 px-1">{new Date(p.year, p.month, p.day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <PostCard post={p} onOpen={onOpen} showBrand={showBrand} />
                </div>
              ))}
              {!list.length && <p className="text-[13px] text-on-surface-variant/50 px-1 py-4">Nothing here</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
