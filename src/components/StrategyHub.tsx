import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Anchor, Network, LineChart, Download, Clapperboard, Info, Bolt, Search, Users, TrendingUp, Calendar, Upload, Clock, CheckCircle2, List, LayoutGrid, Filter, Plus, ChevronRight, Share2, MoreHorizontal, Instagram, Twitter, Linkedin, Youtube, Play, Zap, Rocket, Loader2, Sparkles, AlertCircle, FileText, ExternalLink, MoreVertical, Target } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { generateContentScripts, generate30DayPlan, refinePlan } from '@/src/services/ai';

type StrategyTab = 'competitor' | 'calendar' | 'autopost' | 'plan';

interface CalendarItem {
  id: string;
  day: number;
  month: number; // 0-indexed
  year: number;
  platform: 'TikTok' | 'LinkedIn' | 'Instagram' | 'YouTube' | 'Twitter';
  title: string;
  description: string;
  status: 'scheduled' | 'published' | 'draft';
  type: 'video' | 'article' | 'post';
  time: string;
  link?: string;
  tags?: string[];
}

const INITIAL_CALENDAR_ITEMS: CalendarItem[] = [
  {
    id: '1',
    day: 2,
    month: 9, // October
    year: 2023,
    platform: 'LinkedIn',
    title: 'Q4 Growth Strategy',
    description: '"Why SaaS founders are pivoting to..."',
    status: 'draft',
    type: 'article',
    time: '10:00 AM',
    link: 'docs.google.com/doc/1C...',
    tags: ['strategy', 'growth']
  },
  {
    id: '2',
    day: 4,
    month: 9,
    year: 2023,
    platform: 'Twitter',
    title: 'The Monolith Architecture',
    description: 'Why Speed is Your Only Moat',
    status: 'scheduled',
    type: 'post',
    time: '02:00 PM',
    link: 'notion.so/post/123',
    tags: ['tech', 'architecture']
  },
  {
    id: '3',
    day: 6,
    month: 9,
    year: 2023,
    platform: 'Instagram',
    title: 'Pro Announcement',
    description: '"Before joining any firm — ask better questions."',
    status: 'scheduled',
    type: 'video',
    time: '09:00 AM',
    link: 's3.assets/video_v4.mp4',
    tags: ['announcement', 'pro']
  },
  {
    id: '4',
    day: 7,
    month: 9,
    year: 2023,
    platform: 'YouTube',
    title: 'Weekly Tech Recap',
    description: '"Three truths and a lie about Thesaurus Guru."',
    status: 'published',
    type: 'video',
    time: '11:00 AM',
    link: 'youtu.be/x8d2...',
    tags: ['recap', 'tech']
  },
  {
    id: '5',
    day: 10,
    month: 9,
    year: 2023,
    platform: 'TikTok',
    title: 'POV: Automation',
    description: '"When the pipeline is full and you\'re..."',
    status: 'scheduled',
    type: 'video',
    time: '04:30 PM',
    link: 'tiktok.com/v/9218...',
    tags: ['automation', 'pov']
  },
  {
    id: '6',
    day: 24,
    month: 9,
    year: 2023,
    platform: 'LinkedIn',
    title: 'The Monolith Architecture: Why Speed is Your Only Moat',
    description: 'Deep dive into the TitanLeap technical stack and how we achieve 99th percentile rendering speeds across mobile devices. We explore the trade-offs between microservices and monoliths in early-stage scaling.',
    status: 'scheduled',
    type: 'article',
    time: '09:00 AM',
    tags: ['architecture', 'saas']
  }
];

export const StrategyHub: React.FC<{ auditData?: any }> = ({ auditData }) => {
  const [activeTab, setActiveTab] = useState<StrategyTab>(auditData ? 'plan' : 'calendar');
  const [mode, setMode] = useState<'general' | 'per-link'>('general');
  const [handle, setHandle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScripts, setGeneratedScripts] = useState<any[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isRefiningPlan, setIsRefiningPlan] = useState(false);
  const [refinementFeedback, setRefinementFeedback] = useState('');
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [thirtyDayPlan, setThirtyDayPlan] = useState<any>(null);
  
  // Autopost State
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<string[]>([
    'https://picsum.photos/seed/titan1/600/600',
    'https://picsum.photos/seed/titan2/600/600'
  ]);

  const handleFileUpload = (e: React.DragEvent | React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Simulate upload
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          const newAsset = `https://picsum.photos/seed/titan${Math.floor(Math.random() * 1000)}/600/600`;
          setUploadedAssets(prevAssets => [newAsset, ...prevAssets]);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  // Calendar State
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>(INITIAL_CALENDAR_ITEMS);
  const [selectedDate, setSelectedDate] = useState({ day: 24, month: 9, year: 2023 });
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState<Partial<CalendarItem>>({
    platform: 'Instagram',
    type: 'video',
    status: 'scheduled',
    time: '09:00 AM'
  });

  const selectedDayItems = calendarItems.filter(item => 
    item.day === selectedDate.day && 
    item.month === selectedDate.month && 
    item.year === selectedDate.year
  );

  const handleAddContent = () => {
    if (!newItem.title) return;
    
    const item: CalendarItem = {
      id: Math.random().toString(36).substr(2, 9),
      platform: 'Instagram',
      title: '',
      description: '',
      status: 'scheduled',
      type: 'video',
      time: '09:00 AM',
      ...newItem,
      // Ensure these are set from the current context
      day: selectedDate.day,
      month: selectedDate.month,
      year: selectedDate.year,
    } as CalendarItem;

    setCalendarItems([...calendarItems, item]);
    setShowAddModal(false);
    setNewItem({
      platform: 'Instagram',
      type: 'video',
      status: 'scheduled',
      time: '09:00 AM'
    });
  };

  const handleGenerateScripts = async () => {
    if (!handle) return;
    setIsGenerating(true);
    try {
      const scripts = await generateContentScripts(handle, mode);
      setGeneratedScripts(scripts);
    } catch (error) {
      console.error("Failed to generate scripts:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!auditData) return;
    setIsGeneratingPlan(true);
    try {
      const plan = await generate30DayPlan(auditData);
      setThirtyDayPlan(plan);
    } catch (error) {
      console.error("Failed to generate 30-day plan:", error);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleRefinePlan = async () => {
    if (!thirtyDayPlan || !refinementFeedback) return;
    setIsRefiningPlan(true);
    try {
      const refined = await refinePlan(thirtyDayPlan, refinementFeedback);
      if (refined) {
        setThirtyDayPlan(refined);
        setRefinementFeedback('');
        setShowRefineInput(false);
      }
    } catch (error) {
      console.error("Failed to refine plan:", error);
    } finally {
      setIsRefiningPlan(false);
    }
  };

  useEffect(() => {
    if (auditData && !thirtyDayPlan && activeTab === 'plan') {
      handleGeneratePlan();
    }
  }, [auditData, activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'competitor':
        return (
          <div className="space-y-8">
            {/* Input Section */}
            <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                <div className="flex-1 w-full space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">
                    Social Handle or Link
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                      <Search size={18} />
                    </div>
                    <input 
                      type="text" 
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="e.g. @growth_titan or instagram.com/p/..."
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">
                    Audit Mode
                  </label>
                  <div className="flex bg-surface-container-highest p-1 rounded-xl border border-outline-variant/20">
                    <button 
                      onClick={() => setMode('general')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                        mode === 'general' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant/60 hover:text-on-surface"
                      )}
                    >
                      General
                    </button>
                    <button 
                      onClick={() => setMode('per-link')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                        mode === 'per-link' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant/60 hover:text-on-surface"
                      )}
                    >
                      Per Link
                    </button>
                  </div>
                </div>
              </div>

              {/* Results Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Zap size={16} fill="currentColor" />
                    </div>
                    <h4 className="font-black text-sm uppercase tracking-widest text-on-surface">Viral Hooks</h4>
                  </div>
                  <ul className="space-y-3">
                    {(generatedScripts.length > 0 ? generatedScripts.map(s => s.hook) : ['"The 3-step framework to..."', '"Why your growth is stalled..."', '"I tried X for 30 days..."']).map((hook, i) => (
                      <li key={i} className="text-sm text-on-surface-variant flex items-start gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/5">
                        <span className="text-primary font-black">0{i+1}</span>
                        {hook}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                      <TrendingUp size={16} />
                    </div>
                    <h4 className="font-black text-sm uppercase tracking-widest text-on-surface">Content Strategy</h4>
                  </div>
                  <div className="space-y-4">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {generatedScripts.length > 0 
                        ? "AI-Generated Strategy: Focus on these hooks to maximize engagement velocity based on competitor patterns."
                        : "High-frequency short-form video (3x/day) focusing on \"contrarian\" takes within the SaaS niche."}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Contrarian', 'Educational', 'Behind-the-scenes'].map(tag => (
                        <span key={tag} className="px-2 py-1 bg-surface-container-highest rounded-md text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">
                      <Users size={16} />
                    </div>
                    <h4 className="font-black text-sm uppercase tracking-widest text-on-surface">Audience Insights</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface-variant">Primary Age</span>
                      <span className="text-xs font-black text-primary">24-34</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface-variant">Active Hours</span>
                      <span className="text-xs font-black text-primary">18:00 - 21:00</span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-[78%]" />
                    </div>
                    <p className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-widest text-center">78% Engagement Velocity</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <button 
                  onClick={handleGenerateScripts}
                  disabled={isGenerating || !handle}
                  className={cn(
                    "monolith-gradient text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/30 flex items-center gap-3 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100",
                    isGenerating && "animate-pulse"
                  )}
                >
                  {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Clapperboard size={18} fill="white" />}
                  {isGenerating ? "AI Engineering Scripts..." : "Generate Top-Performing Scripts"}
                  <span className="px-2 py-0.5 bg-on-surface/20 rounded-md text-[10px]">30 Days</span>
                </button>
              </div>
            </div>

            {/* Generated Scripts List */}
            <AnimatePresence>
              {generatedScripts.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  {generatedScripts.map((script, idx) => (
                    <div key={idx} className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Sparkles size={16} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Script 0{idx+1}</span>
                      </div>
                      <h5 className="font-black text-sm text-on-surface mb-2 group-hover:text-primary transition-colors">{script.title}</h5>
                      <div className="space-y-3">
                        <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Hook</p>
                          <p className="text-xs text-on-surface font-bold leading-tight">{script.hook}</p>
                        </div>
                        <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-secondary mb-1">Body</p>
                          <p className="text-[11px] text-on-surface-variant leading-relaxed">{script.body}</p>
                        </div>
                        <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-tertiary mb-1">CTA</p>
                          <p className="text-xs text-on-surface font-bold">{script.cta}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      case 'plan':
        return (
          <div className="space-y-8">
            {!thirtyDayPlan && isGeneratingPlan ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-primary animate-pulse" size={32} />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-on-surface tracking-tight">Engineering Your 30-Day Strategy</h3>
                  <p className="text-on-surface-variant/60 font-medium max-w-md">Analyzing your audit data to build a high-conversion content roadmap...</p>
                </div>
              </div>
            ) : thirtyDayPlan ? (
              <div className="space-y-12">
                {/* Strategy Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-surface-container-low p-8 rounded-[32px] border border-outline-variant/10 shadow-sm space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Target size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-widest text-on-surface-variant/60 mb-1">Core Objective</h4>
                      <p className="text-lg font-black text-on-surface">{thirtyDayPlan.strategyOverview?.objective || "Market Dominance"}</p>
                    </div>
                  </div>
                  <div className="bg-surface-container-low p-8 rounded-[32px] border border-outline-variant/10 shadow-sm space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center">
                      <Users size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-widest text-on-surface-variant/60 mb-1">Target Audience</h4>
                      <p className="text-lg font-black text-on-surface">{thirtyDayPlan.strategyOverview?.audience || "High-Value Clients"}</p>
                    </div>
                  </div>
                  <div className="bg-surface-container-low p-8 rounded-[32px] border border-outline-variant/10 shadow-sm space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-widest text-on-surface-variant/60 mb-1">Growth Lever</h4>
                      <p className="text-lg font-black text-on-surface">{thirtyDayPlan.strategyOverview?.primaryLever || "Content Velocity"}</p>
                    </div>
                  </div>
                </div>

                {/* Weekly Breakdown */}
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-black tracking-tight text-on-surface">The 4-Week Roadmap</h3>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setShowRefineInput(!showRefineInput)}
                        className="flex items-center gap-2 text-secondary font-black text-xs uppercase tracking-widest hover:underline"
                      >
                        <Sparkles size={16} />
                        Refine with Gemini
                      </button>
                      <button className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest hover:underline">
                        <Download size={16} />
                        Export Full PDF
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showRefineInput && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-surface-container-low p-6 rounded-3xl border border-secondary/20 shadow-lg space-y-4">
                          <div className="flex items-center gap-3 text-secondary">
                            <Sparkles size={18} />
                            <h4 className="text-sm font-black uppercase tracking-widest">AI Strategy Refinement</h4>
                          </div>
                          <textarea 
                            value={refinementFeedback}
                            onChange={(e) => setRefinementFeedback(e.target.value)}
                            placeholder="e.g. 'Make it more focused on LinkedIn' or 'Include more video content ideas'..."
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary/20 min-h-[100px] resize-none"
                          />
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => setShowRefineInput(false)}
                              className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={handleRefinePlan}
                              disabled={isRefiningPlan || !refinementFeedback}
                              className="bg-secondary text-on-secondary px-8 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                            >
                              {isRefiningPlan ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} fill="currentColor" />}
                              Refine Strategy
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {thirtyDayPlan.weeks?.map((week: any, idx: number) => (
                      <div key={idx} className="bg-surface-container-low rounded-[40px] p-8 border border-outline-variant/10 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-4xl font-black text-primary/20">0{idx + 1}</span>
                            <h4 className="text-xl font-black text-on-surface">{week.theme}</h4>
                          </div>
                          <span className="px-4 py-1 bg-surface-container-highest rounded-full text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                            Week {idx + 1}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-on-surface-variant/60 leading-relaxed italic">
                          "{week.focus}"
                        </p>
                        <div className="space-y-4">
                          {week.milestones?.map((milestone: string, mIdx: number) => (
                            <div key={mIdx} className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/5">
                              <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                <CheckCircle2 size={14} />
                              </div>
                              <span className="text-xs font-bold text-on-surface-variant">{milestone}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily Content Grid Preview */}
                <div className="bg-surface-container-low rounded-[40px] p-10 border border-outline-variant/10 shadow-sm space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black tracking-tight text-on-surface">Daily Content Execution</h3>
                      <p className="text-sm font-medium text-on-surface-variant/60">The first 7 days of your high-velocity content sprint.</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('calendar')}
                      className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/30 hover:scale-105 transition-all active:scale-95"
                    >
                      Sync to Calendar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {thirtyDayPlan.dailyContent?.slice(0, 7).map((day: any, idx: number) => (
                      <div key={idx} className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/5 space-y-4 hover:border-primary/20 transition-all group cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-on-surface-variant/40 group-hover:text-primary transition-colors">Day 0{idx + 1}</span>
                          <div className="w-6 h-6 rounded-lg bg-primary/5 text-primary flex items-center justify-center">
                            <Zap size={12} fill="currentColor" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">{day.platform}</p>
                          <p className="text-xs font-bold text-on-surface line-clamp-2">{day.title}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 space-y-8 text-center">
                <div className="w-24 h-24 rounded-[32px] bg-surface-container-low flex items-center justify-center text-on-surface-variant/20">
                  <Rocket size={48} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-on-surface tracking-tight">No Strategy Data Found</h3>
                  <p className="text-on-surface-variant/60 font-medium max-w-md mx-auto">Complete a business audit first to generate your custom 30-day high-performance roadmap.</p>
                </div>
                <button 
                  onClick={() => window.location.reload()} // Simple way to go back to audit if we don't have a view switcher here
                  className="bg-surface-container-highest text-on-surface px-10 py-4 rounded-2xl font-black text-sm border border-outline-variant/10 hover:bg-surface-container transition-all"
                >
                  Return to Audit
                </button>
              </div>
            )}
          </div>
        );
      case 'calendar':
        return (
          <div className="relative">
            <div className={cn(
              "grid grid-cols-1 gap-10 transition-all duration-500 ease-in-out",
              isSidePanelOpen ? "lg:grid-cols-12" : "grid-cols-1"
            )}>
              {/* Main Calendar Grid */}
              <div className={cn(
                "space-y-8 transition-all duration-500",
                isSidePanelOpen ? "lg:col-span-8" : "max-w-6xl mx-auto w-full"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <h3 className="text-3xl font-black tracking-tight text-on-surface">October 2023</h3>
                    <div className="flex gap-2">
                      <button className="w-10 h-10 flex items-center justify-center bg-surface-container-low hover:bg-surface-container rounded-xl transition-all border border-outline-variant/10 shadow-sm"><ChevronRight className="rotate-180 text-on-surface-variant" size={20} /></button>
                      <button className="w-10 h-10 flex items-center justify-center bg-surface-container-low hover:bg-surface-container rounded-xl transition-all border border-outline-variant/10 shadow-sm"><ChevronRight className="text-on-surface-variant" size={20} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button className="bg-surface-container-low text-on-surface-variant px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-outline-variant/10 flex items-center gap-3 hover:bg-surface-container transition-all shadow-sm">
                      <Filter size={16} className="text-primary" />
                      Filters
                    </button>
                    <button className="bg-secondary-container text-on-secondary-fixed-variant px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-outline-variant/10 flex items-center gap-3 hover:brightness-105 transition-all shadow-lg shadow-secondary/20">
                      <Share2 size={16} />
                      Regen for Notion
                    </button>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-[40px] overflow-hidden border border-outline-variant/10 shadow-xl shadow-black/5">
                  <div className="grid grid-cols-7 border-b border-outline-variant/10">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="py-6 text-center text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-px bg-outline-variant/10">
                    {/* Empty cells for padding if month doesn't start on Sunday */}
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={`empty-${i}`} className="bg-surface-container-lowest min-h-[180px]" />
                    ))}
                    
                    {Array.from({ length: 31 }).map((_, i) => {
                      const day = i + 1;
                      const items = calendarItems.filter(item => item.day === day && item.month === 9);
                      const isSelected = selectedDate.day === day && isSidePanelOpen;
                      const isToday = day === 6; // Mocking today

                      return (
                        <div 
                          key={i} 
                          onClick={() => {
                            setSelectedDate({ day, month: 9, year: 2023 });
                            setIsSidePanelOpen(true);
                          }}
                          className={cn(
                            "bg-surface-container-lowest min-h-[180px] p-4 group hover:bg-surface-container-low/50 transition-all relative cursor-pointer",
                            isSelected && "ring-2 ring-inset ring-primary/20 bg-primary/5",
                            isToday && "bg-primary/5"
                          )}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm font-black transition-colors",
                                isSelected ? "text-primary" : "text-on-surface-variant/40 group-hover:text-on-surface"
                              )}>{day}</span>
                              {items.length > 0 && (
                                <div className="flex gap-1">
                                  {Array.from(new Set(items.map(i => i.platform))).slice(0, 3).map((p, idx) => (
                                    <div 
                                      key={idx} 
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full shadow-[0_0_5px_rgba(0,0,0,0.1)]",
                                        p === 'LinkedIn' && "bg-indigo-400",
                                        p === 'Twitter' && "bg-sky-400",
                                        p === 'Instagram' && "bg-amber-400",
                                        p === 'YouTube' && "bg-emerald-400",
                                        p === 'TikTok' && "bg-rose-400"
                                      )} 
                                    />
                                  ))}
                                  {items.length > 3 && <div className="w-1 h-1 rounded-full bg-on-surface-variant/20" />}
                                </div>
                              )}
                            </div>
                            {isToday && (
                              <span className="text-[8px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">Today</span>
                            )}
                          </div>

                          <div className="space-y-3">
                            {items.map(item => (
                              <div 
                                key={item.id}
                                className={cn(
                                  "p-3 rounded-2xl border shadow-sm space-y-2 relative group/item",
                                  item.platform === 'LinkedIn' && "bg-indigo-50/50 border-indigo-200/50 text-indigo-900",
                                  item.platform === 'Twitter' && "bg-sky-50/50 border-sky-200/50 text-sky-900",
                                  item.platform === 'Instagram' && "bg-amber-50/50 border-amber-200/50 text-amber-900",
                                  item.platform === 'YouTube' && "bg-emerald-50/50 border-emerald-200/50 text-emerald-900",
                                  item.platform === 'TikTok' && "bg-rose-50/50 border-rose-200/50 text-rose-900"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="w-6 h-6 rounded-lg bg-on-surface/80 flex items-center justify-center shadow-sm">
                                    {item.type === 'video' ? <Play size={10} fill="currentColor" /> : <FileText size={10} />}
                                  </div>
                                  <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    item.status === 'published' ? "bg-emerald-500" : item.status === 'scheduled' ? "bg-amber-500" : "bg-slate-400"
                                  )} />
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black leading-tight line-clamp-2">{item.title}</p>
                                  <p className="text-[9px] font-medium opacity-60 line-clamp-1 italic">{item.description}</p>
                                </div>
                                {item.link && (
                                  <div className="flex items-center gap-1 text-[8px] font-bold opacity-40">
                                    <ExternalLink size={8} />
                                    <span className="truncate">{item.link}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between pt-1 border-t border-black/5">
                                  <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{item.platform}</span>
                                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{item.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate({ day, month: 9, year: 2023 });
                              setShowAddModal(true);
                            }}
                            className="absolute bottom-4 right-4 w-10 h-10 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 flex flex-col items-center justify-center text-on-surface-variant/40 opacity-0 group-hover:opacity-100 hover:text-primary hover:border-primary/40 hover:shadow-lg hover:scale-110 transition-all shadow-sm z-10"
                            title="Quick Add Content"
                          >
                            <Plus size={18} />
                            <span className="text-[7px] font-black uppercase tracking-tighter">Add</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Side Detail Panel */}
              <AnimatePresence>
                {isSidePanelOpen && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="lg:col-span-4 space-y-8"
                  >
                    <div className="bg-surface-container-low rounded-[40px] p-10 border border-outline-variant/10 shadow-xl shadow-black/5 space-y-10 sticky top-24">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-xl font-black tracking-tight text-on-surface">October {selectedDate.day}, {selectedDate.year}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Daily Content Schedule</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setShowAddModal(true)}
                            className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all"
                          >
                            <Plus size={20} />
                          </button>
                          <button 
                            onClick={() => setIsSidePanelOpen(false)}
                            className="w-10 h-10 rounded-full bg-surface-container-highest/50 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Week Strip */}
                      <div className="flex justify-between gap-2">
                        {[
                          { day: 23, label: 'MON' },
                          { day: 24, label: 'TUE', active: true },
                          { day: 25, label: 'WED' },
                          { day: 26, label: 'THU', dot: true },
                          { day: 27, label: 'FRI' },
                          { day: 28, label: 'SAT' },
                        ].map(d => (
                          <div 
                            key={d.day}
                            onClick={() => setSelectedDate({ day: d.day, month: 9, year: 2023 })}
                            className={cn(
                              "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer min-w-[56px]",
                              selectedDate.day === d.day 
                                ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110" 
                                : "bg-surface-container-highest/30 text-on-surface-variant/60 hover:bg-surface-container-highest"
                            )}
                          >
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">{d.label}</span>
                            <span className="text-lg font-black">{d.day}</span>
                            {d.dot && selectedDate.day !== d.day && <div className="w-1 h-1 rounded-full bg-amber-500" />}
                          </div>
                        ))}
                      </div>

                      {/* Selected Day Content */}
                      <div className="space-y-6">
                        {selectedDayItems.length > 0 ? (
                          selectedDayItems.map(item => (
                            <div key={item.id} className="bg-surface-container-lowest rounded-[32px] p-8 border border-outline-variant/10 shadow-sm space-y-6 group">
                              <div className="flex items-center justify-between">
                                <span className="text-6xl font-black text-on-surface-variant/10 group-hover:text-primary/10 transition-colors">{item.day}</span>
                                <span className={cn(
                                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                                  item.status === 'scheduled' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                )}>
                                  {item.status}
                                </span>
                              </div>

                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">{item.platform} / {item.type}</p>
                                  <h5 className="text-2xl font-black text-on-surface leading-tight tracking-tight">{item.title}</h5>
                                </div>
                                <p className="text-sm font-medium text-on-surface-variant/60 leading-relaxed">
                                  {item.description}
                                </p>
                              </div>

                              {item.tags && (
                                <div className="flex flex-wrap gap-2">
                                  {item.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-surface-container-low rounded-lg text-[10px] font-bold text-on-surface-variant/60 border border-outline-variant/5">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="pt-6 border-t border-outline-variant/10 flex items-center justify-between">
                                <div className="flex items-center gap-3 text-on-surface-variant">
                                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                    <CheckCircle2 size={18} />
                                  </div>
                                  <span className="text-sm font-black tracking-tight">{item.time}</span>
                                </div>
                                <button className="p-3 text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container rounded-xl transition-all">
                                  <MoreVertical size={20} />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-surface-container-lowest rounded-[32px] p-12 border border-outline-variant/10 border-dashed flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant/20">
                              <Calendar size={32} />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-black text-on-surface">No content scheduled</p>
                              <p className="text-xs font-medium text-on-surface-variant/40">Click the plus icon to add content for this day.</p>
                            </div>
                            <button 
                              onClick={() => setShowAddModal(true)}
                              className="bg-primary text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
                            >
                              Add Content
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Add Content Modal */}
            <AnimatePresence>
              {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAddModal(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-surface-container-low w-full max-w-xl rounded-[40px] border border-outline-variant/10 shadow-2xl relative z-10 overflow-hidden"
                  >
                    <div className="p-10 space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-2xl font-black tracking-tight text-on-surface">Add Content</h4>
                          <p className="text-sm font-medium text-on-surface-variant/60">Schedule new content for Oct {selectedDate.day}, {selectedDate.year}</p>
                        </div>
                        <button 
                          onClick={() => setShowAddModal(false)}
                          className="w-10 h-10 rounded-full bg-surface-container-highest/50 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Title</label>
                          <input 
                            type="text" 
                            placeholder="Enter content title..."
                            value={newItem.title || ''}
                            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Description</label>
                          <textarea 
                            placeholder="Enter content description..."
                            value={newItem.description || ''}
                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                            rows={3}
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Platform</label>
                            <select 
                              value={newItem.platform}
                              onChange={(e) => setNewItem({ ...newItem, platform: e.target.value as any })}
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                            >
                              <option value="Instagram">Instagram</option>
                              <option value="TikTok">TikTok</option>
                              <option value="LinkedIn">LinkedIn</option>
                              <option value="Twitter">Twitter/X</option>
                              <option value="YouTube">YouTube</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Type</label>
                            <select 
                              value={newItem.type}
                              onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                            >
                              <option value="video">Video</option>
                              <option value="article">Article</option>
                              <option value="post">Post</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Time</label>
                            <input 
                              type="time" 
                              value={newItem.time}
                              onChange={(e) => setNewItem({ ...newItem, time: e.target.value })}
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Status</label>
                            <select 
                              value={newItem.status}
                              onChange={(e) => setNewItem({ ...newItem, status: e.target.value as any })}
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="draft">Draft</option>
                              <option value="published">Published</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={handleAddContent}
                        className="w-full bg-primary text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        Add to Calendar
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        );
      case 'autopost':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Asset Management */}
            <div className="lg:col-span-8 space-y-10">
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileUpload}
                className={cn(
                  "bg-surface-container-lowest border-2 border-dashed rounded-[40px] aspect-[16/9] flex flex-col items-center justify-center gap-8 group transition-all cursor-pointer shadow-sm relative overflow-hidden",
                  isDragging ? "border-primary bg-primary/5 scale-[0.99]" : "border-outline-variant/20 hover:border-primary/40"
                )}
              >
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                  onChange={handleFileUpload}
                  multiple
                />
                
                {isUploading ? (
                  <div className="w-full max-w-md space-y-6 px-10 relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-black uppercase tracking-widest text-primary">Uploading Assets...</span>
                      <span className="text-sm font-black text-primary">{uploadProgress}%</span>
                    </div>
                    <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                    <p className="text-center text-xs font-bold text-on-surface-variant/40 animate-pulse">Processing high-quality render...</p>
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className={cn(
                      "w-24 h-24 rounded-[32px] flex items-center justify-center transition-all duration-500 shadow-lg shadow-primary/5",
                      isDragging ? "bg-primary text-white scale-110" : "bg-surface-container-low text-primary group-hover:scale-110"
                    )}>
                      <Upload size={40} />
                    </div>
                    <div className="text-center space-y-3 relative z-10">
                      <h4 className="text-3xl font-black text-on-surface tracking-tight">
                        {isDragging ? "Drop to upload" : "Drag and drop assets"}
                      </h4>
                      <p className="text-base font-medium text-on-surface-variant/60">Supports MP4, MOV, PNG, JPG (Max 500MB)</p>
                    </div>
                    <button className="bg-surface-container-low text-on-surface px-12 py-5 rounded-2xl font-black text-sm border border-outline-variant/10 hover:bg-surface-container transition-all shadow-sm active:scale-95 relative z-10">
                      Browse Files
                    </button>
                  </>
                )}
              </div>

              {/* Asset Gallery */}
              <div className="grid grid-cols-3 md:grid-cols-4 gap-8">
                {uploadedAssets.map((img, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="aspect-square rounded-[32px] overflow-hidden border border-outline-variant/10 shadow-md group cursor-pointer relative"
                  >
                    <img src={img} alt="Asset" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {i === 0 && !isUploading && uploadProgress === 100 && (
                      <div className="absolute top-4 right-4 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg">
                        <CheckCircle2 size={14} />
                      </div>
                    )}
                  </motion.div>
                ))}
                <button 
                  onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                  className="aspect-square rounded-[32px] border-2 border-dashed border-outline-variant/20 flex items-center justify-center text-on-surface-variant/40 hover:border-primary/40 hover:text-primary transition-all bg-surface-container-low/30 group"
                >
                  <Plus size={40} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>
            </div>

            {/* Post Configuration Sidebar */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-surface-container-low rounded-[40px] p-10 border border-outline-variant/10 shadow-xl shadow-black/5 space-y-10">
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Post Configuration</h4>
                  <p className="text-sm font-medium text-on-surface-variant/60 leading-relaxed">Automate your distribution across the hub.</p>
                </div>

                <div className="space-y-8">
                  {/* Content Script */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">Content Script (From Calendar)</label>
                    <div className="relative group">
                      <select className="w-full bg-surface-container-highest/40 border border-outline-variant/20 rounded-2xl px-6 py-5 text-sm font-bold text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                        <option>Q4 Strategy Reveal - Video Script v2</option>
                        <option>The Hidden Growth Hack</option>
                        <option>Why we raised $0 and scaled</option>
                      </select>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/40 group-hover:text-primary transition-colors">
                        <Clapperboard size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">Schedule Date & Time</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative group">
                        <input type="date" defaultValue="2023-10-24" className="w-full bg-surface-container-highest/40 border border-outline-variant/20 rounded-2xl px-6 py-5 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer" />
                        <Calendar size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-hover:text-primary transition-colors pointer-events-none" />
                      </div>
                      <div className="relative group">
                        <input type="time" defaultValue="09:00" className="w-full bg-surface-container-highest/40 border border-outline-variant/20 rounded-2xl px-6 py-5 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer" />
                        <Clock size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-hover:text-primary transition-colors pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Platforms */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">Publishing Platforms</label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: 'ig', label: 'Instagram', icon: Instagram, active: true },
                        { id: 'tt', label: 'TikTok', icon: Zap, active: true },
                        { id: 'tw', label: 'Twitter/X', icon: Twitter, active: false, isX: true },
                        { id: 'li', label: 'LinkedIn', icon: Linkedin, active: true },
                        { id: 'yt', label: 'YouTube', icon: Youtube, active: false },
                      ].map(p => (
                        <button 
                          key={p.id}
                          className={cn(
                            "flex flex-col items-center justify-center gap-3 aspect-square rounded-[24px] border transition-all group relative overflow-hidden",
                            p.active 
                              ? "bg-surface-container-lowest border-primary text-primary shadow-lg shadow-primary/5" 
                              : "bg-surface-container-highest/30 border-outline-variant/10 text-on-surface-variant/30 hover:bg-surface-container-highest/50"
                          )}
                        >
                          {p.active && <div className="absolute top-0 right-0 w-8 h-8 bg-primary/10 rounded-bl-2xl flex items-center justify-center"><CheckCircle2 size={12} /></div>}
                          {p.isX ? <span className="text-xl font-black">✕</span> : <p.icon size={24} />}
                          <span className="text-[9px] font-black uppercase tracking-widest">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 space-y-5">
                    <button className="w-full bg-secondary-container text-on-secondary-container py-6 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-secondary/30 hover:scale-[1.02] hover:brightness-105 active:scale-95 transition-all">
                      Schedule / Publish
                    </button>
                    <p className="text-[10px] font-black text-on-surface-variant/30 uppercase tracking-[0.2em] text-center">Estimated Reach: 45.2k Impressions</p>
                  </div>
                </div>
              </div>

              {/* Efficiency Card */}
              <div className="bg-primary rounded-[40px] p-10 text-white shadow-2xl shadow-primary/30 space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-on-surface/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
                <div className="relative z-10 space-y-2">
                  <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60">Autopost Efficiency</h5>
                  <p className="text-5xl font-black tracking-tighter">94.8%</p>
                  <div className="flex items-center gap-3 text-[11px] font-black text-white/90 bg-on-surface/10 w-fit px-4 py-2 rounded-full border border-white/10">
                    <TrendingUp size={14} />
                    <span className="uppercase tracking-widest">+12% VS LAST MONTH</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-10">
      {/* Header with Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tight text-on-surface">Strategy Hub</h2>
          <p className="text-sm font-medium text-on-surface-variant/60">Orchestrate your multi-channel growth engine.</p>
        </div>

        <div className="bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10 shadow-sm flex gap-1">
          {auditData && (
            <button
              onClick={() => setActiveTab('plan')}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'plan' 
                  ? "bg-surface-container-lowest text-primary shadow-md shadow-primary/5 border border-outline-variant/10" 
                  : "text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container"
              )}
            >
              <Sparkles size={16} />
              30 Day Plan
            </button>
          )}
          {[
            { id: 'competitor', label: 'Competitor Analysis', icon: Network },
            { id: 'calendar', label: 'Content Calendar', icon: Calendar },
            { id: 'autopost', label: 'Autopost', icon: Rocket },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as StrategyTab)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab.id 
                  ? "bg-surface-container-lowest text-primary shadow-md shadow-primary/5 border border-outline-variant/10" 
                  : "text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
