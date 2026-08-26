import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Play, Image, Check, AlertCircle, Link as LinkIcon, ExternalLink, Upload, Clock, Send, Instagram, Twitter, Linkedin, Youtube, Facebook, Loader2, Calendar, Trash2, FileText, ChevronDown, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import { supabase, isSupabaseConfigured } from '@/src/lib/supabase';

// ─── Content Manager Tab Types ───
type ContentManagerTab = 'production' | 'autopost';

// ─── Production Types ───
type TaskType = 'video' | 'design';
type Platform = 'youtube' | 'tiktok' | 'instagram' | 'linkedin' | 'flyer' | 'poster';
type TaskStatus = 'inprogress' | 'review' | 'done';

interface Task {
  id: number;
  type: TaskType;
  platform: Platform;
  title: string;
  brief: string;
  assignee: string;
  due: string;
  status: TaskStatus;
  checks: Record<number, boolean>;
  reviewLink?: string;
}

// ─── Auto Post Types ───
type PostPlatform = 'ig' | 'tt' | 'li' | 'fb' | 'tw' | 'yt';

interface UploadedAsset {
  url: string;
  type: 'image' | 'video';
  name: string;
}

interface DistributionJob {
  id: string;
  platform: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  scheduledFor: string;
  caption: string;
  createdAt: string;
}

// ─── Production Constants ───
const VIDEO_CHECKLIST = [
  { phase: "Setup", items: ["Ingest & organize raw footage", "Set up proxy workflow", "Sync multi-camera / audio"] },
  { phase: "Edit", items: ["Assembly cut", "Rough cut & story shape", "Dialogue & B-roll edit", "Picture lock"] },
  { phase: "Audio", items: ["Dialogue cleanup (noise removal)", "Music & SFX placement", "Mix & loudness normalize"] },
  { phase: "Color & Graphics", items: ["Color correction (scene match)", "Creative color grade", "Titles, lower thirds, motion graphics"] },
  { phase: "Delivery", items: ["Client review export", "Platform-specific renders", "Archive project files"] }
];

const DESIGN_CHECKLIST = [
  { phase: "Discovery", items: ["Define single core objective", "Confirm format & bleed specs", "Finalize copy & headline"] },
  { phase: "Concept", items: ["Mood board & references", "Typography & color shortlist", "Thumbnail sketches (3+ directions)"] },
  { phase: "Execution", items: ["Hero visual selection & retouch", "Grid & hierarchy layout", "Type setting & optical spacing"] },
  { phase: "QA", items: ["Fresh-eye review at distance", "Contrast & readability check", "Brand standards audit", "Proof read all text"] },
  { phase: "Delivery", items: ["Print-ready PDF export (300dpi, bleed)", "Digital exports (PNG, JPG, WebP)", "Source file handoff"] }
];

const INITIAL_TASKS: Task[] = [
  {
    id: 1, type: 'video', platform: 'youtube',
    title: 'The future of AI in B2B SaaS',
    brief: 'Script: Open with a bold stat about AI adoption in SaaS (60% of SaaS tools will be AI-native by 2026). Walk through 3 shifts: AI as a feature → AI as the product → AI as the entire workflow. Close with CTA: "Which shift is your SaaS at right now?"',
    assignee: 'David Chen', due: 'Apr 02', status: 'inprogress',
    checks: { 0: true, 1: true, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false, 10: false, 11: false, 12: false, 13: false, 14: false }
  },
  {
    id: 2, type: 'video', platform: 'tiktok',
    title: 'Why your growth is stalled (and how to fix it)',
    brief: 'Hook: "Your funnel isn\'t broken — your audience temperature is wrong." 60-sec format. Show the 3 audience temperatures (cold/warm/hot) and the content that matches each. End with the TitanLeap Audience Temperature framework.',
    assignee: 'Marcus Thorne', due: 'Mar 30', status: 'review',
    checks: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: false, 8: false, 9: false, 10: false, 11: false, 12: false, 13: false, 14: false },
    reviewLink: 'https://frame.io/review/example'
  },
  {
    id: 3, type: 'design', platform: 'flyer',
    title: 'TitanLeap Q2 Strategy Sprint — Flyer',
    brief: 'Brief: Promote the free Strategy Sprint offer. Target: SaaS founders. Key message: "Stop paying for 5 tools. One growth system." Include: CTA button, TitanLeap logo, URL. Tone: Bold, confident, dark-mode aesthetic. Output: A4 print + Instagram square.',
    assignee: 'Elena Vance', due: 'Mar 31', status: 'inprogress',
    checks: { 0: true, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false, 10: false, 11: false, 12: false, 13: false, 14: false }
  },
  {
    id: 4, type: 'design', platform: 'linkedin',
    title: 'I tried contrarian marketing for 30 days — graphic',
    brief: 'Brief: Companion graphic for the LinkedIn post. Text overlay: "30 days of contrarian marketing. Here\'s what actually happened." Dark background, bold type, results callout boxes (e.g. +340% reach, 2x leads). Brand: purple + white on dark.',
    assignee: 'Sarah Jenkins', due: 'Mar 28', status: 'done',
    checks: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true, 11: true, 12: true, 13: true, 14: true },
    reviewLink: 'https://figma.com/file/example'
  }
];

const AVATAR_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-amber-500', 'bg-cyan-500'];

const POST_PLATFORMS: { id: PostPlatform; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'ig', label: 'Instagram', icon: <Instagram size={16} />, color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  { id: 'tt', label: 'TikTok', icon: <Play size={16} />, color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  { id: 'li', label: 'LinkedIn', icon: <Linkedin size={16} />, color: 'bg-blue-600/10 text-blue-600 border-blue-600/20' },
  { id: 'fb', label: 'Facebook', icon: <Facebook size={16} />, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'tw', label: 'Twitter / X', icon: <Twitter size={16} />, color: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  { id: 'yt', label: 'YouTube', icon: <Youtube size={16} />, color: 'bg-red-500/10 text-red-500 border-red-500/20' },
];

// ─── Helpers ───
function getAvatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function getInitials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
const STATUS_LABELS: Record<TaskStatus, string> = { inprogress: 'In Progress', review: 'In Review', done: 'Done' };

function getPlatformBadgeColor(platform: Platform) {
  switch (platform) {
    case 'youtube': return 'bg-red-500/10 text-red-500';
    case 'tiktok': return 'bg-cyan-500/10 text-cyan-500';
    case 'instagram': return 'bg-pink-500/10 text-pink-500';
    case 'linkedin': return 'bg-blue-500/10 text-blue-500';
    case 'flyer': return 'bg-blue-400/10 text-blue-400';
    case 'poster': return 'bg-purple-500/10 text-purple-500';
    default: return 'bg-surface-container-highest text-on-surface-variant';
  }
}

function getChecklist(type: TaskType) { return type === 'video' ? VIDEO_CHECKLIST : DESIGN_CHECKLIST; }
function getTotalChecks(type: TaskType) { return getChecklist(type).reduce((s, p) => s + p.items.length, 0); }
function getCountChecked(card: Task) { return Object.values(card.checks).filter(Boolean).length; }
function getProgressPct(card: Task) { return Math.round((getCountChecked(card) / getTotalChecks(card.type)) * 100); }

// ═══════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════
export const ContentManager: React.FC = () => {
  const [managerTab, setManagerTab] = useState<ContentManagerTab>('production');
  const [sendToProductionSignal, setSendToProductionSignal] = useState<number>(0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-on-surface mb-2 md:mb-4">Content Production</h1>
          <p className="text-sm md:text-base text-on-surface-variant font-medium max-w-2xl">Manage your content pipeline and distribute across platforms.</p>
        </div>
      </div>

      {/* Top-Level Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 p-1 bg-surface-container-highest/30 rounded-2xl w-fit">
          {([
            { id: 'production' as const, label: 'Production Queue', icon: <Play size={14} /> },
            { id: 'autopost' as const, label: 'Auto Post', icon: <Send size={14} /> },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setManagerTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 md:px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all",
                managerTab === tab.id
                  ? "bg-primary text-white shadow-md"
                  : "text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-low"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        {managerTab === 'production' && (
          <button onClick={() => setSendToProductionSignal(Date.now())}
            className="bg-surface-container-low border border-outline-variant/20 text-on-surface px-4 py-2 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 hover:bg-surface-container transition-all whitespace-nowrap shrink-0">
            <Plus size={16} /> Send to Production
          </button>
        )}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={managerTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {managerTab === 'production' ? <ProductionQueue externalOpenSignal={sendToProductionSignal} /> : <AutoPostTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════
//  PRODUCTION QUEUE (original ContentManager)
// ═══════════════════════════════════════════
// ─── Supabase Persistence (production_tasks table) ───
const TASKS_TABLE = 'production_tasks';

const taskToRow = (task: Task) => ({
  id: task.id,
  type: task.type,
  platform: task.platform,
  title: task.title,
  brief: task.brief,
  assignee: task.assignee,
  due: task.due,
  status: task.status,
  checks: task.checks,
  review_link: task.reviewLink ?? null,
});

const rowToTask = (row: any): Task => ({
  id: row.id,
  type: row.type,
  platform: row.platform,
  title: row.title,
  brief: row.brief,
  assignee: row.assignee,
  due: row.due,
  status: row.status,
  checks: row.checks || {},
  reviewLink: row.review_link || undefined,
});

const persistTask = async (task: Task) => {
  if (!isSupabaseConfigured) return;
  try {
    const { error } = await supabase.from(TASKS_TABLE).upsert(taskToRow(task));
    if (error) throw error;
  } catch (err) {
    console.error('Failed to sync task to Supabase:', err);
  }
};

const ProductionQueue: React.FC<{ externalOpenSignal?: number }> = ({ externalOpenSignal }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('titanleap_production_tasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_TASKS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('titanleap_production_tasks', JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  // Load tasks from Supabase (shared, durable storage) on mount
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      try {
        const { data, error } = await supabase.from(TASKS_TABLE).select('*').order('id', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          setTasks(data.map(rowToTask));
        } else {
          await supabase.from(TASKS_TABLE).upsert(tasks.map(taskToRow));
        }
      } catch (err) {
        console.error('Failed to load tasks from Supabase:', err);
      }
    })();
  }, []);
  const [currentTab, setCurrentTab] = useState<'all' | TaskStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  useEffect(() => {
    if (externalOpenSignal) setIsModalOpen(true);
  }, [externalOpenSignal]);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);

  useEffect(() => {
    setTasks(prevTasks => {
      let changed = false;
      const newTasks = prevTasks.map(task => {
        if ((task.status === 'review' || task.status === 'done') && (!task.reviewLink || !task.reviewLink.trim())) {
          changed = true;
          return { ...task, status: 'inprogress' as TaskStatus };
        }
        return task;
      });
      return changed ? newTasks : prevTasks;
    });
  }, []);

  useEffect(() => {
    try {
      const pendingRaw = localStorage.getItem('titanleap_pending_production');
      if (pendingRaw) {
        const pending: Task[] = JSON.parse(pendingRaw);
        if (Array.isArray(pending) && pending.length > 0) {
          const newTasks = pending.map((item, index) => ({ ...item, id: Date.now() + index }));
          setTasks(prevTasks => [...prevTasks, ...newTasks]);
          newTasks.forEach(persistTask);
        }
        localStorage.removeItem('titanleap_pending_production');
      }
    } catch (err) {
      console.error('Failed to import pending production tasks:', err);
    }
  }, []);

  const [newTask, setNewTask] = useState<Partial<Task>>({ title: '', platform: 'youtube', brief: '', assignee: '', due: '' });

  const filteredTasks = tasks.filter(t => currentTab === 'all' || t.status === currentTab);
  const videoTasks = filteredTasks.filter(t => t.type === 'video');
  const designTasks = filteredTasks.filter(t => t.type === 'design');

  const handleToggleCheck = (cardId: number, checkIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTasks = tasks.map(t => t.id === cardId ? { ...t, checks: { ...t.checks, [checkIdx]: !t.checks[checkIdx] } } : t);
    setTasks(updatedTasks);
    const changed = updatedTasks.find(t => t.id === cardId);
    if (changed) persistTask(changed);
  };

  const handleSetStatus = (cardId: number, status: TaskStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === cardId);
    if (!task) return;
    if ((status === 'review' || status === 'done') && !task.reviewLink?.trim()) {
      toast.error("Review Link Required", { description: "Please attach a review link before moving this task to review." });
      return;
    }
    const updatedTasks = tasks.map(t => t.id === cardId ? { ...t, status } : t);
    setTasks(updatedTasks);
    const changed = updatedTasks.find(t => t.id === cardId);
    if (changed) persistTask(changed);
  };

  const handleUpdateReviewLink = (cardId: number, link: string) => {
    const updatedTasks = tasks.map(t => t.id === cardId ? { ...t, reviewLink: link } : t);
    setTasks(updatedTasks);
    const changed = updatedTasks.find(t => t.id === cardId);
    if (changed) persistTask(changed);
  };

  const handleAddTask = () => {
    if (!newTask.title) return;
    const type = ['youtube', 'tiktok', 'instagram'].includes(newTask.platform as string) ? 'video' : 'design';
    const total = getTotalChecks(type as TaskType);
    const checks: Record<number, boolean> = {};
    for (let i = 0; i < total; i++) checks[i] = false;
    const dueFormatted = newTask.due ? new Date(newTask.due).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : 'TBD';
    const task: Task = {
      id: Date.now(), type: type as TaskType, platform: newTask.platform as Platform,
      title: newTask.title, brief: newTask.brief || 'No brief provided.',
      assignee: newTask.assignee || 'Unassigned', due: dueFormatted, status: 'inprogress', checks
    };
    setTasks([task, ...tasks]);
    persistTask(task);
    setIsModalOpen(false);
    setNewTask({ title: '', platform: 'youtube', brief: '', assignee: '', due: '' });
    setCurrentTab('all');
  };

  const renderCard = (card: Task) => {
    const isExpanded = expandedCardId === card.id;
    const pct = getProgressPct(card);
    const isOverdue = card.due === 'Mar 28' && card.status !== 'done';
    return (
      <motion.div layout key={card.id} onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
        className={cn("bg-surface-container-low border rounded-2xl mb-4 transition-all cursor-pointer overflow-hidden",
          isExpanded ? "border-primary shadow-md" : "border-outline-variant/20 hover:border-outline-variant/40 hover:-translate-y-0.5")}>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest", getPlatformBadgeColor(card.platform))}>{card.platform}</span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-md bg-surface-container-highest text-on-surface-variant font-medium flex items-center gap-1">
              {card.type === 'video' ? <Play size={10} /> : <Image size={10} />}
              {card.type === 'video' ? 'Video' : 'Design'}
            </span>
          </div>
          <h4 className="text-sm font-bold text-on-surface mb-3 leading-snug">{card.title}</h4>
          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-surface-container-highest/50 rounded-xl p-3 mb-4 border-l-2 border-primary text-xs text-on-surface-variant leading-relaxed italic">"{card.brief}"</div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-0">
            {(['inprogress', 'review', 'done'] as TaskStatus[]).map((s, i) => {
              const isActive = card.status === s;
              return (
                <React.Fragment key={s}>
                  {i > 0 && <div className="flex-1 h-px bg-outline-variant/20 max-w-[24px]" />}
                  <button onClick={(e) => handleSetStatus(card.id, s, e)}
                    className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                      isActive ? (s === 'inprogress' ? "text-amber-500" : s === 'review' ? "text-cyan-500" : "text-green-500") : "text-on-surface-variant/50 hover:text-on-surface-variant")}>
                    <div className={cn("w-2 h-2 rounded-full border transition-all",
                      isActive ? (s === 'inprogress' ? "bg-amber-500 border-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]" :
                        s === 'review' ? "bg-cyan-500 border-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.4)]" :
                        "bg-green-500 border-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]") : "bg-surface-container-highest border-outline-variant/30")} />
                    {STATUS_LABELS[s]}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="px-4 pb-3">
                <div className="h-1 bg-surface-container-highest rounded-full mb-4 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3">Process Checklist — {pct}% complete</div>
                <div className="space-y-4">
                  {getChecklist(card.type).map((phase, pIdx) => {
                    const prev = getChecklist(card.type).slice(0, pIdx).reduce((s, p) => s + p.items.length, 0);
                    return (
                      <div key={pIdx}>
                        <div className="text-[11px] font-bold text-on-surface-variant/50 mb-1 ml-1">{phase.phase}</div>
                        <div className="space-y-1">
                          {phase.items.map((item, iIdx) => {
                            const gi = prev + iIdx;
                            const checked = card.checks[gi];
                            return (
                              <button key={iIdx} onClick={(e) => handleToggleCheck(card.id, gi, e)}
                                className="w-full flex items-start gap-2 p-1.5 rounded-lg hover:bg-surface-container-highest/50 transition-colors text-left group">
                                <div className={cn("w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                                  checked ? "bg-primary border-primary text-white" : "border-outline-variant/30 group-hover:border-outline-variant/60")}>
                                  {checked && <Check size={10} strokeWidth={3} />}
                                </div>
                                <span className={cn("text-xs leading-snug transition-all", checked ? "text-on-surface-variant/50 line-through" : "text-on-surface-variant")}>{item}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 p-3 bg-surface-container-highest/30 rounded-xl border border-outline-variant/10">
                  <div className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2 flex items-center gap-1.5"><LinkIcon size={12} /> Review Asset Link</div>
                  <div className="flex items-center gap-2">
                    <input type="url" placeholder="Paste Figma, Frame.io, or Drive link..." value={card.reviewLink || ''}
                      onChange={(e) => handleUpdateReviewLink(card.id, e.target.value)} onClick={(e) => e.stopPropagation()}
                      readOnly={card.status === 'review' || card.status === 'done'}
                      className={cn("flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors",
                        (card.status === 'review' || card.status === 'done') && "opacity-70 cursor-not-allowed focus:border-outline-variant/20")} />
                    {card.reviewLink && (
                      <a href={card.reviewLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"><ExternalLink size={14} /></a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-2 px-4 py-3 border-t border-outline-variant/10 bg-surface-container-lowest/50">
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0", getAvatarColor(card.assignee))}>{getInitials(card.assignee)}</div>
          <span className="text-xs font-medium text-on-surface-variant">{card.assignee}</span>
          <span className={cn("ml-auto text-xs font-mono font-medium flex items-center gap-1", isOverdue ? "text-red-500" : "text-on-surface-variant/50")}>
            {card.due}{isOverdue && <AlertCircle size={12} />}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-1 border-b border-outline-variant/10">
        {(['all', 'inprogress', 'review', 'done'] as const).map(tab => (
          <button key={tab} onClick={() => setCurrentTab(tab)}
            className={cn("px-4 py-2 text-sm font-bold border-b-2 transition-all capitalize",
              currentTab === tab ? "border-primary text-primary" : "border-transparent text-on-surface-variant/60 hover:text-on-surface")}>
            {tab === 'all' ? 'All Queue' : tab === 'inprogress' ? 'In Progress' : tab === 'review' ? 'In Review' : 'Done'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: tasks.length, sub: '↑ 2 from last week', sc: 'text-green-500' },
          { label: 'In Progress', value: tasks.filter(t => t.status === 'inprogress').length, sub: 'Active now', sc: 'text-amber-500' },
          { label: 'In Review', value: tasks.filter(t => t.status === 'review').length, sub: 'Awaiting feedback', sc: 'text-cyan-500' },
          { label: 'Done', value: tasks.filter(t => t.status === 'done').length, sub: '↑ On track', sc: 'text-green-500' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">{s.label}</div>
            <div className="text-3xl font-mono font-bold text-on-surface">{s.value}</div>
            <div className={cn("text-[10px] font-bold mt-1", s.sc)}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center"><Play size={16} /></div>
            <h3 className="font-black text-on-surface">Video Editor</h3>
            <span className="ml-auto bg-surface-container-highest text-on-surface-variant/60 text-[10px] font-black px-2 py-0.5 rounded-full">{videoTasks.length} tasks</span>
          </div>
          {videoTasks.length > 0 ? videoTasks.map(renderCard) : (
            <div className="border border-dashed border-outline-variant/20 rounded-2xl p-8 text-center text-on-surface-variant/50">
              <Play size={24} className="mx-auto mb-2 opacity-50" /><p className="text-xs font-medium">No video tasks {currentTab !== 'all' ? 'in this stage' : 'yet'}.</p>
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><Image size={16} /></div>
            <h3 className="font-black text-on-surface">Designer</h3>
            <span className="ml-auto bg-surface-container-highest text-on-surface-variant/60 text-[10px] font-black px-2 py-0.5 rounded-full">{designTasks.length} tasks</span>
          </div>
          {designTasks.length > 0 ? designTasks.map(renderCard) : (
            <div className="border border-dashed border-outline-variant/20 rounded-2xl p-8 text-center text-on-surface-variant/50">
              <Image size={24} className="mx-auto mb-2 opacity-50" /><p className="text-xs font-medium">No design tasks {currentTab !== 'all' ? 'in this stage' : 'yet'}.</p>
            </div>
          )}
        </div>
      </div>
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-surface-container-low rounded-3xl shadow-2xl border border-outline-variant/10 p-6 md:p-8">
                <div className="mb-6">
                  <h3 className="text-xl font-black tracking-tight text-on-surface">Send to Production</h3>
                  <p className="text-xs text-on-surface-variant/60 mt-1">Route a content piece from the calendar to the right queue</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Content Title</label>
                    <input type="text" value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} placeholder="e.g. The 3-step framework to scale your SaaS"
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Platform</label>
                    <select value={newTask.platform} onChange={(e) => setNewTask({...newTask, platform: e.target.value as Platform})}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all appearance-none">
                      <option value="youtube">YouTube</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option>
                      <option value="linkedin">LinkedIn</option><option value="flyer">Flyer</option><option value="poster">Poster</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Script / Creative Brief</label>
                    <textarea value={newTask.brief} onChange={(e) => setNewTask({...newTask, brief: e.target.value})} placeholder="Paste the script or content brief..."
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all min-h-[80px] resize-y" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Assignee</label>
                      <input type="text" value={newTask.assignee} onChange={(e) => setNewTask({...newTask, assignee: e.target.value})} placeholder="e.g. Marcus Thorne"
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Due Date</label>
                      <input type="date" value={newTask.due} onChange={(e) => setNewTask({...newTask, due: e.target.value})}
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all">Cancel</button>
                    <button onClick={handleAddTask} className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 transition-all">Send to Queue</button>
                </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

// ═════════════════════════�═══════════════════
//  AUTO POST TAB
// ═══════════════════════════════════════════
const AutoPostTab: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PostPlatform[]>(['ig', 'li']);
  const [caption, setCaption] = useState('');
  const [postDate, setPostDate] = useState(new Date().toISOString().split('T')[0]);
  const [postTime, setPostTime] = useState('09:00');
  const [isPublishing, setIsPublishing] = useState(false);
  const [distributionJobs, setDistributionJobs] = useState<DistributionJob[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [linkedinCompanyId, setLinkedinCompanyId] = useState('');
  const [profileId, setProfileId] = useState('default');

  useEffect(() => {
    const savedCaption = localStorage.getItem('titanleap_autopost_caption');
    const savedPlatforms = localStorage.getItem('titanleap_autopost_platforms');
    const savedLiCompany = localStorage.getItem('titanleap_li_company_id');
    if (savedCaption) setCaption(savedCaption);
    if (savedPlatforms) { try { setSelectedPlatforms(JSON.parse(savedPlatforms)); } catch {} }
    if (savedLiCompany) setLinkedinCompanyId(savedLiCompany);
  }, []);

  useEffect(() => {
    if (caption) localStorage.setItem('titanleap_autopost_caption', caption);
    if (selectedPlatforms.length > 0) localStorage.setItem('titanleap_autopost_platforms', JSON.stringify(selectedPlatforms));
  }, [caption, selectedPlatforms]);

  const togglePlatform = (id: PostPlatform) => {
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleFileUpload = async (files: FileList) => {
    const newAssets: UploadedAsset[] = [];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) { toast.error(`Unsupported file type: ${file.name}`); continue; }

      if (isSupabaseConfigured()) {
        try {
          const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
          const filePath = `${profileId}/${fileName}`;
          const { error } = await supabase.storage.from('post-media').upload(filePath, file);
          if (error) throw error;
          const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(filePath);
          newAssets.push({ url: publicUrl, type: isVideo ? 'video' : 'image', name: file.name });
        } catch (err) {
          console.error('Upload error:', err);
          const blobUrl = URL.createObjectURL(file);
          newAssets.push({ url: blobUrl, type: isVideo ? 'video' : 'image', name: file.name });
        }
      } else {
        const blobUrl = URL.createObjectURL(file);
        newAssets.push({ url: blobUrl, type: isVideo ? 'video' : 'image', name: file.name });
      }
    }
    setUploadedAssets(prev => [...prev, ...newAssets]);
    if (newAssets.length > 0) toast.success(`Uploaded ${newAssets.length} file(s)`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
  };

  const removeAsset = (index: number) => { setUploadedAssets(prev => prev.filter((_, i) => i !== index)); };

  const handlePublish = async () => {
    if (!caption.trim() && uploadedAssets.length === 0) { toast.error("Add a caption or media before publishing."); return; }
    if (selectedPlatforms.length === 0) { toast.error("Select at least one platform."); return; }
    if (selectedPlatforms.includes('li') && !linkedinCompanyId.trim()) {
      toast.error("LinkedIn Company ID required.", { description: "Add it in Advanced Settings." });
      setShowAdvanced(true);
      return;
    }

    setIsPublishing(true);
    try {
      const scheduledTime = new Date(`${postDate}T${postTime}:00`).toISOString();
      const mediaUrls = uploadedAssets.map(a => a.url);
      const platformMap: Record<string, string> = { ig: 'instagram', tt: 'tiktok', li: 'linkedin', fb: 'facebook', tw: 'twitter', yt: 'youtube' };

      const response = await fetch('/api/daemon/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: selectedPlatforms.map(p => platformMap[p] || p),
          scheduledTime, caption, mediaUrls, linkedinCompanyId, profile_id: profileId,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Server responded with ${response.status}`);

      const newJobs: DistributionJob[] = selectedPlatforms.map(pId => ({
        id: `${Date.now()}-${pId}`, platform: platformMap[pId] || pId, status: 'queued' as const,
        scheduledFor: scheduledTime, caption: caption.substring(0, 80) + (caption.length > 80 ? '...' : ''),
        createdAt: new Date().toISOString(),
      }));

      setDistributionJobs(prev => [...newJobs, ...prev].slice(0, 20));
      toast.success(`Scheduled across ${selectedPlatforms.length} platform(s)!`);
      setCaption('');
      setUploadedAssets([]);
      localStorage.removeItem('titanleap_autopost_caption');
    } catch (error: any) {
      console.error('Publish error:', error);
      toast.error(`Publishing failed: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: Compose */}
        <div className="lg:col-span-2 space-y-6">
          {/* Media Upload */}
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-4 flex items-center gap-2"><Upload size={12} /> Media Assets</div>
            <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn("border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
                isDragging ? "border-primary bg-primary/5" : "border-outline-variant/20 hover:border-outline-variant/40 hover:bg-surface-container-highest/20")}>
              <Upload size={32} className="mx-auto mb-3 text-on-surface-variant/40" />
              <p className="text-sm font-bold text-on-surface-variant/60">{isDragging ? "Drop files here" : "Drag & drop media or click to browse"}</p>
              <p className="text-[10px] text-on-surface-variant/40 mt-1">Supports images (PNG, JPG, WebP) and videos (MP4, MOV)</p>
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files && handleFileUpload(e.target.files)} />
            {uploadedAssets.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {uploadedAssets.map((asset, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-outline-variant/10 bg-surface-container-highest/30">
                    {asset.type === 'image' ? (
                      <img src={asset.url} alt={asset.name} className="w-full h-24 object-cover" />
                    ) : (
                      <div className="w-full h-24 flex items-center justify-center bg-surface-container-highest"><Play size={24} className="text-on-surface-variant/50" /></div>
                    )}
                    <button onClick={() => removeAsset(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                    <div className="p-2"><p className="text-[10px] font-medium text-on-surface-variant truncate">{asset.name}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-4 flex items-center gap-2"><FileText size={12} /> Caption</div>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your post caption here... Use line breaks for formatting. Add hashtags at the end."
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[140px] resize-y" />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] font-bold text-on-surface-variant/40">{caption.length} characters</span>
              <div className="flex gap-2">
                {caption.length > 2200 && <span className="text-[10px] font-bold text-amber-500">Over Instagram 2,200 char limit</span>}
                {caption.length > 280 && selectedPlatforms.includes('tw') && <span className="text-[10px] font-bold text-red-500">Over Twitter 280 char limit</span>}
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-4 flex items-center gap-2"><Calendar size={12} /> Schedule</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Date</label>
                <input type="date" value={postDate} onChange={(e) => setPostDate(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Time</label>
                <input type="time" value={postTime} onChange={(e) => setPostTime(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all" />
              </div>
            </div>
          </div>

          {/* Advanced */}
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-hidden">
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-container-highest/20 transition-colors">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 flex items-center gap-2"><Zap size={12} /> Advanced Settings</span>
              <ChevronDown size={14} className={cn("text-on-surface-variant/40 transition-transform", showAdvanced && "rotate-180")} />
            </button>
            <AnimatePresence>
              {showAdvanced && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-6 pb-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Profile ID</label>
                      <input type="text" value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="default"
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">LinkedIn Company ID</label>
                      <input type="text" value={linkedinCompanyId}
                        onChange={(e) => { setLinkedinCompanyId(e.target.value); localStorage.setItem('titanleap_li_company_id', e.target.value); }}
                        placeholder="e.g. 12345678"
                        className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all" />
                      <p className="text-[9px] text-on-surface-variant/40 ml-1">Required for LinkedIn company page posts</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* RIGHT: Platforms + Publish + Jobs */}
        <div className="space-y-6">
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-4">Platforms</div>
            <div className="space-y-2">
              {POST_PLATFORMS.map(platform => {
                const isSelected = selectedPlatforms.includes(platform.id);
                return (
                  <button key={platform.id} onClick={() => togglePlatform(platform.id)}
                    className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                      isSelected ? cn(platform.color, "border-current/30") : "border-outline-variant/10 text-on-surface-variant/50 hover:border-outline-variant/30 hover:text-on-surface-variant")}>
                    {platform.icon}
                    <span className="text-sm font-bold flex-1">{platform.label}</span>
                    {isSelected && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={handlePublish} disabled={isPublishing}
            className={cn("w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
              isPublishing ? "bg-primary/50 text-white cursor-not-allowed" : "bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl")}>
            {isPublishing ? (<><Loader2 size={18} className="animate-spin" /> Publishing...</>) : (<><Send size={18} /> Schedule & Publish</>)}
          </button>

          {distributionJobs.length > 0 && (
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
              <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-4">Recent Jobs</div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {distributionJobs.map(job => (
                  <div key={job.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-highest/30 border border-outline-variant/5">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
                      job.status === 'completed' ? "bg-green-500" : job.status === 'failed' ? "bg-red-500" :
                      job.status === 'processing' ? "bg-amber-500 animate-pulse" : "bg-on-surface-variant/30")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-on-surface capitalize">{job.platform}</p>
                      <p className="text-[10px] text-on-surface-variant/50 truncate">{job.caption}</p>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/40">{job.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6">
            <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-4">Quick Info</div>
            <div className="space-y-3">
              {[
                { l: 'Media attached', v: String(uploadedAssets.length) },
                { l: 'Platforms selected', v: String(selectedPlatforms.length) },
                { l: 'Scheduled for', v: `${new Date(postDate + 'T' + postTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${postTime}` },
                { l: 'Total jobs', v: String(distributionJobs.length) },
              ].map(r => (
                <div key={r.l} className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant/60">{r.l}</span>
                  <span className="text-xs font-bold text-on-surface">{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
