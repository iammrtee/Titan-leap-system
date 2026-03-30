import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Play, Image, Check, AlertCircle, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

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
    checks: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: false, 8: false, 9: false, 10: false, 11: false, 12: false, 13: false, 14: false }
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
    checks: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true, 11: true, 12: true, 13: true, 14: true }
  }
];

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-amber-500', 'bg-cyan-500'
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  inprogress: 'In Progress',
  review: 'In Review',
  done: 'Done'
};

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

function getChecklist(type: TaskType) {
  return type === 'video' ? VIDEO_CHECKLIST : DESIGN_CHECKLIST;
}

function getTotalChecks(type: TaskType) {
  return getChecklist(type).reduce((s, p) => s + p.items.length, 0);
}

function getCountChecked(card: Task) {
  return Object.values(card.checks).filter(Boolean).length;
}

function getProgressPct(card: Task) {
  return Math.round((getCountChecked(card) / getTotalChecks(card.type)) * 100);
}

export const ContentManager: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [currentTab, setCurrentTab] = useState<'all' | TaskStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);

  // Sanitize tasks on mount: if a task is 'review' or 'done' but has no reviewLink, move it back to 'inprogress'
  useEffect(() => {
    setTasks(prevTasks => {
      let changed = false;
      const newTasks = prevTasks.map(task => {
        if ((task.status === 'review' || task.status === 'done') && (!task.reviewLink || !task.reviewLink.trim())) {
          changed = true;
          return { ...task, status: 'inprogress' };
        }
        return task;
      });
      return changed ? newTasks : prevTasks;
    });
  }, []);

  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    platform: 'youtube',
    brief: '',
    assignee: '',
    due: ''
  });

  const filteredTasks = tasks.filter(t => currentTab === 'all' || t.status === currentTab);
  const videoTasks = filteredTasks.filter(t => t.type === 'video');
  const designTasks = filteredTasks.filter(t => t.type === 'design');

  const handleToggleCheck = (cardId: number, checkIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(tasks.map(t => {
      if (t.id === cardId) {
        return {
          ...t,
          checks: { ...t.checks, [checkIdx]: !t.checks[checkIdx] }
        };
      }
      return t;
    }));
  };

  const handleSetStatus = (cardId: number, status: TaskStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const task = tasks.find(t => t.id === cardId);
    if (!task) return;

    if ((status === 'review' || status === 'done') && !task.reviewLink?.trim()) {
      toast.error("Review Link Required", {
        description: "Please attach a review link before moving this task to review."
      });
      return;
    }

    setTasks(tasks.map(t => t.id === cardId ? { ...t, status } : t));
  };

  const handleUpdateReviewLink = (cardId: number, link: string) => {
    setTasks(tasks.map(t => t.id === cardId ? { ...t, reviewLink: link } : t));
  };

  const handleAddTask = () => {
    if (!newTask.title) return;
    
    const type = ['youtube', 'tiktok', 'instagram'].includes(newTask.platform as string) ? 'video' : 'design';
    const total = getTotalChecks(type as TaskType);
    const checks: Record<number, boolean> = {};
    for (let i = 0; i < total; i++) checks[i] = false;

    const dueFormatted = newTask.due 
      ? new Date(newTask.due).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) 
      : 'TBD';

    const task: Task = {
      id: Date.now(),
      type: type as TaskType,
      platform: newTask.platform as Platform,
      title: newTask.title,
      brief: newTask.brief || 'No brief provided.',
      assignee: newTask.assignee || 'Unassigned',
      due: dueFormatted,
      status: 'inprogress',
      checks
    };

    setTasks([task, ...tasks]);
    setIsModalOpen(false);
    setNewTask({ title: '', platform: 'youtube', brief: '', assignee: '', due: '' });
    setCurrentTab('all');
  };

  const renderCard = (card: Task) => {
    const isExpanded = expandedCardId === card.id;
    const pct = getProgressPct(card);
    const isOverdue = card.due === 'Mar 28' && card.status !== 'done'; // Mock overdue logic

    return (
      <motion.div 
        layout
        key={card.id}
        onClick={() => setExpandedCardId(isExpanded ? null : card.id)}
        className={cn(
          "bg-surface-container-low border rounded-2xl mb-4 transition-all cursor-pointer overflow-hidden",
          isExpanded ? "border-primary shadow-md" : "border-outline-variant/20 hover:border-outline-variant/40 hover:-translate-y-0.5"
        )}
      >
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest", getPlatformBadgeColor(card.platform))}>
              {card.platform}
            </span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-md bg-surface-container-highest text-on-surface-variant font-medium flex items-center gap-1">
              {card.type === 'video' ? <Play size={10} /> : <Image size={10} />}
              {card.type === 'video' ? 'Video' : 'Design'}
            </span>
          </div>
          
          <h4 className="text-sm font-bold text-on-surface mb-3 leading-snug">{card.title}</h4>
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-surface-container-highest/50 rounded-xl p-3 mb-4 border-l-2 border-primary text-xs text-on-surface-variant leading-relaxed italic">
                  "{card.brief}"
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-0">
            {(['inprogress', 'review', 'done'] as TaskStatus[]).map((s, i) => {
              const isActive = card.status === s;
              return (
                <React.Fragment key={s}>
                  {i > 0 && <div className="flex-1 h-px bg-outline-variant/20 max-w-[24px]" />}
                  <button 
                    onClick={(e) => handleSetStatus(card.id, s, e)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all",
                      isActive 
                        ? (s === 'inprogress' ? "text-amber-500" : s === 'review' ? "text-cyan-500" : "text-green-500")
                        : "text-on-surface-variant/50 hover:text-on-surface-variant"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full border transition-all",
                      isActive 
                        ? (s === 'inprogress' ? "bg-amber-500 border-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]" : 
                           s === 'review' ? "bg-cyan-500 border-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.4)]" : 
                           "bg-green-500 border-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]")
                        : "bg-surface-container-highest border-outline-variant/30"
                    )} />
                    {STATUS_LABELS[s]}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3">
                <div className="h-1 bg-surface-container-highest rounded-full mb-4 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
                
                <div className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3">
                  Process Checklist — {pct}% complete
                </div>
                
                <div className="space-y-4">
                  {getChecklist(card.type).map((phase, pIdx) => {
                    // Calculate global index for checks
                    const previousItemsCount = getChecklist(card.type).slice(0, pIdx).reduce((s, p) => s + p.items.length, 0);
                    
                    return (
                      <div key={pIdx}>
                        <div className="text-[11px] font-bold text-on-surface-variant/50 mb-1 ml-1">{phase.phase}</div>
                        <div className="space-y-1">
                          {phase.items.map((item, iIdx) => {
                            const globalIdx = previousItemsCount + iIdx;
                            const isChecked = card.checks[globalIdx];
                            return (
                              <button 
                                key={iIdx}
                                onClick={(e) => handleToggleCheck(card.id, globalIdx, e)}
                                className="w-full flex items-start gap-2 p-1.5 rounded-lg hover:bg-surface-container-highest/50 transition-colors text-left group"
                              >
                                <div className={cn(
                                  "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                                  isChecked ? "bg-primary border-primary text-white" : "border-outline-variant/30 group-hover:border-outline-variant/60"
                                )}>
                                  {isChecked && <Check size={10} strokeWidth={3} />}
                                </div>
                                <span className={cn(
                                  "text-xs leading-snug transition-all",
                                  isChecked ? "text-on-surface-variant/50 line-through" : "text-on-surface-variant"
                                )}>
                                  {item}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 p-3 bg-surface-container-highest/30 rounded-xl border border-outline-variant/10">
                  <div className="text-[11px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2 flex items-center gap-1.5">
                    <LinkIcon size={12} />
                    Review Asset Link
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="url" 
                      placeholder="Paste Figma, Frame.io, or Drive link..."
                      value={card.reviewLink || ''}
                      onChange={(e) => handleUpdateReviewLink(card.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      readOnly={card.status === 'review' || card.status === 'done'}
                      className={cn(
                        "flex-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary transition-colors",
                        (card.status === 'review' || card.status === 'done') && "opacity-70 cursor-not-allowed focus:border-outline-variant/20"
                      )}
                    />
                    {card.reviewLink && (
                      <a 
                        href={card.reviewLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-outline-variant/10 bg-surface-container-lowest/50">
          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0", getAvatarColor(card.assignee))}>
            {getInitials(card.assignee)}
          </div>
          <span className="text-xs font-medium text-on-surface-variant">{card.assignee}</span>
          <span className={cn(
            "ml-auto text-xs font-mono font-medium flex items-center gap-1",
            isOverdue ? "text-red-500" : "text-on-surface-variant/50"
          )}>
            {card.due}
            {isOverdue && <AlertCircle size={12} />}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8 md:mb-12">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-on-surface mb-2 md:mb-4">Content Production</h1>
          <p className="text-sm md:text-base text-on-surface-variant font-medium max-w-2xl">Manage and track your content pipeline.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-surface-container-low border border-outline-variant/20 text-on-surface px-4 py-2 rounded-xl font-bold text-sm shadow-sm flex items-center gap-2 hover:bg-surface-container transition-all whitespace-nowrap shrink-0"
        >
          <Plus size={16} />
          Send to Production
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-outline-variant/10">
        {(['all', 'inprogress', 'review', 'done'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setCurrentTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-bold border-b-2 transition-all capitalize",
              currentTab === tab 
                ? "border-primary text-primary" 
                : "border-transparent text-on-surface-variant/60 hover:text-on-surface"
            )}
          >
            {tab === 'all' ? 'All Queue' : tab === 'inprogress' ? 'In Progress' : tab === 'review' ? 'In Review' : 'Done'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">Total Tasks</div>
          <div className="text-3xl font-mono font-bold text-on-surface">{tasks.length}</div>
          <div className="text-[10px] font-bold text-green-500 mt-1">↑ 2 from last week</div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">In Progress</div>
          <div className="text-3xl font-mono font-bold text-on-surface">{tasks.filter(t => t.status === 'inprogress').length}</div>
          <div className="text-[10px] font-bold text-amber-500 mt-1">Active now</div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">In Review</div>
          <div className="text-3xl font-mono font-bold text-on-surface">{tasks.filter(t => t.status === 'review').length}</div>
          <div className="text-[10px] font-bold text-cyan-500 mt-1">Awaiting feedback</div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">Done</div>
          <div className="text-3xl font-mono font-bold text-on-surface">{tasks.filter(t => t.status === 'done').length}</div>
          <div className="text-[10px] font-bold text-green-500 mt-1">↑ On track</div>
        </div>
      </div>

      {/* Queues */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Video Queue */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
              <Play size={16} />
            </div>
            <h3 className="font-black text-on-surface">Video Editor</h3>
            <span className="ml-auto bg-surface-container-highest text-on-surface-variant/60 text-[10px] font-black px-2 py-0.5 rounded-full">
              {videoTasks.length} tasks
            </span>
          </div>
          <div>
            {videoTasks.length > 0 ? (
              videoTasks.map(renderCard)
            ) : (
              <div className="border border-dashed border-outline-variant/20 rounded-2xl p-8 text-center text-on-surface-variant/50">
                <Play size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No video tasks {currentTab !== 'all' ? 'in this stage' : 'yet'}.</p>
              </div>
            )}
          </div>
        </div>

        {/* Design Queue */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Image size={16} />
            </div>
            <h3 className="font-black text-on-surface">Designer</h3>
            <span className="ml-auto bg-surface-container-highest text-on-surface-variant/60 text-[10px] font-black px-2 py-0.5 rounded-full">
              {designTasks.length} tasks
            </span>
          </div>
          <div>
            {designTasks.length > 0 ? (
              designTasks.map(renderCard)
            ) : (
              <div className="border border-dashed border-outline-variant/20 rounded-2xl p-8 text-center text-on-surface-variant/50">
                <Image size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No design tasks {currentTab !== 'all' ? 'in this stage' : 'yet'}.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-surface-container-low rounded-3xl shadow-2xl border border-outline-variant/10 p-6 md:p-8"
            >
              <div className="mb-6">
                <h3 className="text-xl font-black tracking-tight text-on-surface">Send to Production</h3>
                <p className="text-xs text-on-surface-variant/60 mt-1">Route a content piece from the calendar to the right queue</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Content Title</label>
                  <input 
                    type="text" 
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    placeholder="e.g. The 3-step framework to scale your SaaS"
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Platform</label>
                  <select 
                    value={newTask.platform}
                    onChange={(e) => setNewTask({...newTask, platform: e.target.value as Platform})}
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all appearance-none"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="flyer">Flyer</option>
                    <option value="poster">Poster</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Script / Creative Brief</label>
                  <textarea 
                    value={newTask.brief}
                    onChange={(e) => setNewTask({...newTask, brief: e.target.value})}
                    placeholder="Paste the script or content brief from the content calendar..."
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all min-h-[80px] resize-y"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Assignee</label>
                    <input 
                      type="text" 
                      value={newTask.assignee}
                      onChange={(e) => setNewTask({...newTask, assignee: e.target.value})}
                      placeholder="e.g. Marcus Thorne"
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Due Date</label>
                    <input 
                      type="date" 
                      value={newTask.due}
                      onChange={(e) => setNewTask({...newTask, due: e.target.value})}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddTask}
                    className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 transition-all"
                  >
                    Send to Queue
                  </button>
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
