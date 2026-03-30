import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Anchor, Network, LineChart, Download, Clapperboard, Info, Bolt, Search, Users, TrendingUp, Calendar, Upload, Clock, CheckCircle2, List, LayoutGrid, Filter, Plus, ChevronRight, Share2, MoreHorizontal, Instagram, Twitter, Linkedin, Youtube, Play, Zap, Rocket, Loader2, Sparkles, AlertCircle, FileText, ExternalLink, MoreVertical, Target, RefreshCw } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { generateContentScripts, generate30DayPlan, refinePlan, generateNotionContent } from '@/src/services/ai';
import { toast } from 'sonner';

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

const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

const INITIAL_CALENDAR_ITEMS: CalendarItem[] = [
  {
    id: '1',
    day: 2,
    month: currentMonth,
    year: currentYear,
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
    month: currentMonth,
    year: currentYear,
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
    month: currentMonth,
    year: currentYear,
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
    month: currentMonth,
    year: currentYear,
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
    month: currentMonth,
    year: currentYear,
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
    month: currentMonth,
    year: currentYear,
    platform: 'LinkedIn',
    title: 'The Monolith Architecture: Why Speed is Your Only Moat',
    description: 'Deep dive into the TitanLeap technical stack and how we achieve 99th percentile rendering speeds across mobile devices. We explore the trade-offs between microservices and monoliths in early-stage scaling.',
    status: 'scheduled',
    type: 'article',
    time: '09:00 AM',
    tags: ['architecture', 'saas']
  }
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const StrategyHub: React.FC<{ auditData?: any; forceRegenerateTimestamp?: number }> = ({ auditData, forceRegenerateTimestamp }) => {
  const [activeTab, setActiveTab] = useState<StrategyTab>(auditData ? 'plan' : 'calendar');
  const [mode, setMode] = useState<'general' | 'per-link'>('general');
  const [handle, setHandle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
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

  // Calendar State
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>(INITIAL_CALENDAR_ITEMS);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return { day: today.getDate(), month: today.getMonth(), year: today.getFullYear() };
  });
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);
  const [newItem, setNewItem] = useState<Partial<CalendarItem>>({
    platform: 'Instagram',
    type: 'video',
    status: 'scheduled',
    time: '09:00 AM'
  });

  // Filter State
  const [filters, setFilters] = useState({
    platform: [] as string[],
    status: [] as string[],
    type: [] as string[]
  });
  const [showFilters, setShowFilters] = useState(false);

  // Regen for Notion State
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const filteredCalendarItems = calendarItems.filter(item => {
    const platformMatch = filters.platform.length === 0 || filters.platform.includes(item.platform);
    const statusMatch = filters.status.length === 0 || filters.status.includes(item.status);
    const typeMatch = filters.type.length === 0 || filters.type.includes(item.type);
    return platformMatch && statusMatch && typeMatch;
  });

  const toggleFilter = (category: 'platform' | 'status' | 'type', value: string) => {
    setFilters(prev => {
      const current = prev[category];
      const next = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: next };
    });
  };

  const clearFilters = () => {
    setFilters({ platform: [], status: [], type: [] });
  };

  // Persistence: Load saved data on mount
  useEffect(() => {
    const savedPlan = localStorage.getItem('titanleap_strategy_plan');
    const savedCalendar = localStorage.getItem('titanleap_calendar_items');
    
    if (savedPlan) {
      try {
        setThirtyDayPlan(JSON.parse(savedPlan));
      } catch (e) {
        console.error("Failed to parse saved plan", e);
      }
    }
    
    if (savedCalendar) {
      try {
        setCalendarItems(JSON.parse(savedCalendar));
      } catch (e) {
        console.error("Failed to parse saved calendar items", e);
      }
    }
  }, []);

  // Persistence: Save data on change
  useEffect(() => {
    if (thirtyDayPlan) {
      localStorage.setItem('titanleap_strategy_plan', JSON.stringify(thirtyDayPlan));
    }
  }, [thirtyDayPlan]);

  useEffect(() => {
    localStorage.setItem('titanleap_calendar_items', JSON.stringify(calendarItems));
  }, [calendarItems]);

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

  const selectedDayItems = filteredCalendarItems.filter(item => 
    item.day === selectedDate.day && 
    item.month === selectedDate.month && 
    item.year === selectedDate.year
  );

  const handleSaveContent = () => {
    if (!newItem.title) return;
    
    if (editingItem) {
      setCalendarItems(prev => prev.map(item => 
        item.id === editingItem.id ? { ...item, ...newItem } as CalendarItem : item
      ));
    } else {
      const item: CalendarItem = {
        id: Math.random().toString(36).substr(2, 9),
        platform: 'Instagram',
        title: '',
        description: '',
        status: 'scheduled',
        type: 'video',
        time: '09:00 AM',
        ...newItem,
        day: selectedDate.day,
        month: selectedDate.month,
        year: selectedDate.year,
      } as CalendarItem;
      setCalendarItems([...calendarItems, item]);
    }

    setShowAddModal(false);
    setEditingItem(null);
    setNewItem({
      platform: 'Instagram',
      type: 'video',
      status: 'scheduled',
      time: '09:00 AM'
    });
  };

  const handleDeleteContent = (id: string) => {
    setCalendarItems(prev => prev.filter(item => item.id !== id));
  };

  const handleEditClick = (item: CalendarItem) => {
    setEditingItem(item);
    setNewItem(item);
    setShowAddModal(true);
  };

  const handleGenerateScripts = async () => {
    if (!handle) return;
    setIsGenerating(true);
    try {
      const result = await generateContentScripts(handle, mode);
      setAuditResult(result);
    } catch (error) {
      console.error("Failed to generate scripts:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const [generationState, setGenerationState] = useState<'idle' | 'crafting' | 'building' | 'completed'>('idle');

  const handleGeneratePlan = async () => {
    if (!auditData || isGeneratingPlan) return;
    setIsGeneratingPlan(true);
    setGenerationState('crafting');
    try {
      // Simulate the "crafting strategy" phase
      await new Promise(resolve => setTimeout(resolve, 2000));
      setGenerationState('building');
      
      const plan = await generate30DayPlan(auditData);
      
      if (plan) {
        setGenerationState('completed');
        setThirtyDayPlan(plan);
        // Keep the completed state visible for a moment before resetting
        setTimeout(() => {
          setGenerationState('idle');
          setIsGeneratingPlan(false);
        }, 2000);
      } else {
        toast.error("Failed to generate plan. Please try again.");
        setGenerationState('idle');
        setIsGeneratingPlan(false);
      }
    } catch (error: any) {
      console.error("Failed to generate 30-day plan:", error);
      if (error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
        toast.error("Rate limit exceeded. Please wait a moment and try again.");
      } else {
        toast.error(`Error generating plan: ${error?.message || 'Unknown error'}`);
      }
      setGenerationState('idle');
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
      } else {
        toast.error("Failed to refine plan. Please try again.");
      }
    } catch (error: any) {
      console.error("Failed to refine plan:", error);
      if (error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
        toast.error("Rate limit exceeded. Please wait a moment and try again.");
      } else {
        toast.error("An error occurred while refining the plan.");
      }
    } finally {
      setIsRefiningPlan(false);
    }
  };

  const handleSyncToCalendar = () => {
    if (!thirtyDayPlan || !thirtyDayPlan.calendar) return;

    const newItems: CalendarItem[] = thirtyDayPlan.calendar.map((content: any, index: number) => {
      const date = new Date(); // Start from today
      date.setDate(date.getDate() + index);
      
      // Sanitize platform
      const platforms: any[] = ['TikTok', 'LinkedIn', 'Instagram', 'YouTube', 'Twitter'];
      let platform = content.platform || 'LinkedIn';
      if (!platforms.includes(platform)) {
        platform = 'LinkedIn';
      }

      return {
        id: `ai-${index}-${Math.random().toString(36).substr(2, 5)}`,
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        platform: platform as any,
        title: content.hook || content.message?.substring(0, 50) || 'AI Generated Post',
        description: content.message || 'Content strategy post',
        status: 'draft',
        type: content.format?.toLowerCase().includes('video') ? 'video' : 
              content.format?.toLowerCase().includes('article') ? 'article' : 'post',
        time: content.postTime || '09:00 AM',
        tags: ['ai-generated', 'strategy', content.pillar || '']
      };
    });

    setCalendarItems(prev => {
      // Filter out previous AI generated items to avoid cluttering if synced multiple times
      const nonAiItems = prev.filter(item => !item.id.startsWith('ai-'));
      return [...nonAiItems, ...newItems];
    });
    setSelectedDate({ day: 23, month: 2, year: 2026 });
    setActiveTab('calendar');
    toast.success("Calendar Synced!", {
      description: "30-day strategy has been mapped to your content calendar."
    });
  };

  const handleExportCSV = () => {
    if (filteredCalendarItems.length === 0) {
      toast.error("No Content to Export", {
        description: filters.platform.length > 0 || filters.status.length > 0 || filters.type.length > 0
          ? "No items match your current filters."
          : "Your calendar is currently empty."
      });
      return;
    }
    
    const headers = ['Date', 'Platform', 'Title', 'Type', 'Status', 'Time', 'Description', 'Tags'];
    const rows = filteredCalendarItems.map(item => [
      `${item.year}-${String(item.month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`,
      item.platform,
      `"${item.title.replace(/"/g, '""')}"`,
      item.type,
      item.status,
      item.time,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${(item.tags || []).join(', ')}"`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TitanLeap_Content_Calendar_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV Exported!", {
      description: "Your content calendar has been downloaded."
    });
  };

  const handleRegenForNotion = async () => {
    if (!regenPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    
    setIsRegenerating(true);
    try {
      const generatedItems = await generateNotionContent(regenPrompt);
      
      if (generatedItems && generatedItems.length > 0) {
        const newCalendarItems: CalendarItem[] = generatedItems.map((item: any, index: number) => {
          const date = new Date();
          const offset = item.dayOffset || index;
          date.setDate(date.getDate() + offset);
          
          return {
            id: `regen-${Math.random().toString(36).substr(2, 9)}`,
            day: date.getDate(),
            month: date.getMonth(),
            year: date.getFullYear(),
            platform: item.platform || 'LinkedIn',
            title: item.title || 'Generated Content',
            description: item.description || '',
            status: 'draft',
            type: item.type || 'post',
            time: item.time || '09:00 AM',
            tags: item.tags || ['regen']
          } as CalendarItem;
        });
        
        setCalendarItems(prev => [...prev, ...newCalendarItems]);
        setShowRegenModal(false);
        setRegenPrompt('');
        toast.success("Content Generated!", {
          description: `Added ${newCalendarItems.length} new items to your calendar.`
        });
      } else {
        toast.error("Generation Failed", {
          description: "Could not generate content from your prompt."
        });
      }
    } catch (error) {
      console.error("Regen error:", error);
      toast.error("An error occurred during generation.");
    } finally {
      setIsRegenerating(false);
    }
  };

  useEffect(() => {
    const isPlanEmpty = !thirtyDayPlan || !thirtyDayPlan.calendar || thirtyDayPlan.calendar.length === 0;
    if (auditData && isPlanEmpty && activeTab === 'plan' && !isGeneratingPlan) {
      handleGeneratePlan();
    }
  }, [auditData, activeTab, thirtyDayPlan, isGeneratingPlan]);

  useEffect(() => {
    if (forceRegenerateTimestamp && forceRegenerateTimestamp > 0) {
      setActiveTab('plan');
      handleGeneratePlan();
    }
  }, [forceRegenerateTimestamp]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'competitor':
        return (
          <div className="space-y-6 md:space-y-8">
            {/* Input Section */}
            <div className="bg-surface-container-low rounded-2xl md:rounded-3xl p-5 md:p-8 border border-outline-variant/10 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="flex-1 w-full space-y-1.5 md:space-y-2">
                  <label className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">
                    Social Handle or Link
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                      <Search size={16} className="md:w-[18px] md:h-[18px]" />
                    </div>
                    <input 
                      type="text" 
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="e.g. @growth_titan or instagram.com/p/..."
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl pl-10 md:pl-12 pr-3 md:pr-4 py-3 md:py-4 text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col items-start md:items-center gap-1.5 md:gap-2 w-full md:w-auto">
                  <label className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">
                    Audit Mode
                  </label>
                  <div className="flex w-full md:w-auto bg-surface-container-highest p-1 rounded-xl border border-outline-variant/20">
                    <button 
                      onClick={() => setMode('general')}
                      className={cn(
                        "flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all",
                        mode === 'general' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant/60 hover:text-on-surface"
                      )}
                    >
                      General
                    </button>
                    <button 
                      onClick={() => setMode('per-link')}
                      className={cn(
                        "flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all",
                        mode === 'per-link' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant/60 hover:text-on-surface"
                      )}
                    >
                      Per Link
                    </button>
                  </div>
                </div>
              </div>

              {/* Results Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-surface-container-lowest rounded-xl md:rounded-2xl p-4 md:p-6 border border-outline-variant/10">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Zap size={14} className="md:w-4 md:h-4" fill="currentColor" />
                    </div>
                    <h4 className="font-black text-xs md:text-sm uppercase tracking-widest text-on-surface">Viral Hooks</h4>
                  </div>
                  <ul className="space-y-2 md:space-y-3">
                    {(auditResult?.scripts?.length > 0 
                      ? auditResult.scripts.map((s: any) => s.hook)
                      : ['"The 3-step framework to..."', '"Why your growth is stalled..."', '"I tried X for 30 days..."']
                    ).map((hook: string, i: number) => (
                      <li key={i} className="text-xs md:text-sm text-on-surface-variant flex items-start gap-2 md:gap-3 p-2.5 md:p-3 bg-surface-container-low rounded-lg md:rounded-xl border border-outline-variant/5">
                        <span className="text-primary font-black mt-0.5">0{i+1}</span>
                        <span className="leading-tight">{hook}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-surface-container-lowest rounded-xl md:rounded-2xl p-4 md:p-6 border border-outline-variant/10">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                      <TrendingUp size={14} className="md:w-4 md:h-4" />
                    </div>
                    <h4 className="font-black text-xs md:text-sm uppercase tracking-widest text-on-surface">Content Strategy</h4>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <p className="text-[11px] md:text-xs text-on-surface-variant leading-relaxed">
                      {auditResult?.overallStrategy 
                        ? auditResult.overallStrategy
                        : "High-frequency short-form video (3x/day) focusing on \"contrarian\" takes within the SaaS niche."}
                    </p>
                    <div className="space-y-1.5 md:space-y-2">
                      <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-secondary/60">Trending Content Pillars</p>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {(auditResult?.trendingTopics || ['Contrarian', 'Educational', 'Behind-the-scenes']).map((tag: string) => (
                          <span key={tag} className="px-1.5 md:px-2 py-0.5 md:py-1 bg-surface-container-highest rounded-md text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl md:rounded-2xl p-4 md:p-6 border border-outline-variant/10">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
                      <Clapperboard size={14} className="md:w-4 md:h-4" />
                    </div>
                    <h4 className="font-black text-xs md:text-sm uppercase tracking-widest text-on-surface">Content Structure</h4>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <p className="text-[11px] md:text-xs text-on-surface-variant leading-relaxed">
                      {auditResult?.contentStructure
                        ? auditResult.contentStructure
                        : "Standard 3-act structure: Hook (0-3s), Value Delivery (3-25s), CTA (25-30s)."}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                      <div className="h-1 bg-primary/20 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-1/3" />
                      </div>
                      <div className="h-1 bg-secondary/20 rounded-full overflow-hidden">
                        <div className="h-full bg-secondary w-full" />
                      </div>
                      <div className="h-1 bg-tertiary/20 rounded-full overflow-hidden">
                        <div className="h-full bg-tertiary w-1/2" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl md:rounded-2xl p-4 md:p-6 border border-outline-variant/10">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <Users size={14} className="md:w-4 md:h-4" />
                    </div>
                    <h4 className="font-black text-xs md:text-sm uppercase tracking-widest text-on-surface">Audience Insights</h4>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    {auditResult?.audienceInsights ? (
                      <p className="text-[11px] md:text-xs text-on-surface-variant leading-relaxed">
                        {auditResult.audienceInsights}
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] md:text-xs font-bold text-on-surface-variant">Primary Age</span>
                          <span className="text-[11px] md:text-xs font-black text-primary">24-34</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] md:text-xs font-bold text-on-surface-variant">Active Hours</span>
                          <span className="text-[11px] md:text-xs font-black text-primary">18:00 - 21:00</span>
                        </div>
                        <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full w-[78%]" />
                        </div>
                        <p className="text-[9px] md:text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-widest text-center">78% Engagement Velocity</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 md:mt-8 flex justify-center">
                <button 
                  onClick={handleGenerateScripts}
                  disabled={isGenerating || !handle}
                  className={cn(
                    "w-full sm:w-auto monolith-gradient text-white px-6 md:px-10 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-sm shadow-lg md:shadow-xl shadow-primary/20 md:shadow-primary/30 flex items-center justify-center gap-2 md:gap-3 hover:scale-[1.02] md:hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100",
                    isGenerating && "animate-pulse"
                  )}
                >
                  {isGenerating ? <Loader2 className="animate-spin shrink-0 w-4 h-4 md:w-[18px] md:h-[18px]" /> : <Clapperboard className="shrink-0 w-4 h-4 md:w-[18px] md:h-[18px]" fill="white" />}
                  <span className="truncate">{isGenerating ? "AI Engineering Scripts..." : (mode === 'per-link' ? "Deep Audit Content Link" : "Generate Top-Performing Scripts")}</span>
                  <span className="px-1.5 md:px-2 py-0.5 bg-on-surface/20 rounded-md text-[8px] md:text-[10px] shrink-0">{mode === 'per-link' ? "Deep Scrape" : "30 Days"}</span>
                </button>
              </div>
            </div>

            {/* Generated Scripts List */}
            <AnimatePresence>
              {auditResult?.scripts?.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "grid gap-4 md:gap-6",
                    mode === 'per-link' ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  )}
                >
                  {auditResult.scripts.map((script: any, idx: number) => (
                    <div key={idx} className="bg-surface-container-low p-4 md:p-6 rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Sparkles size={14} className="md:w-4 md:h-4" />
                        </div>
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                          {mode === 'per-link' ? "Deep Audit Breakdown" : `Script 0${idx+1}`}
                        </span>
                      </div>
                      <h5 className="font-black text-xs md:text-sm text-on-surface mb-2 md:mb-3 group-hover:text-primary transition-colors leading-tight">{script.title}</h5>
                      
                      {mode === 'per-link' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                          <div className="p-3 md:p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-primary mb-1">The Viral Hook</p>
                            <p className="text-[11px] md:text-xs text-on-surface font-bold leading-tight">{script.hook}</p>
                          </div>
                          <div className="p-3 md:p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-secondary mb-1">Content Strategy</p>
                            <p className="text-[10px] md:text-[11px] text-on-surface-variant leading-relaxed">{script.strategy}</p>
                          </div>
                          <div className="p-3 md:p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-tertiary mb-1">Content Structure</p>
                            <p className="text-[10px] md:text-[11px] text-on-surface-variant leading-relaxed">{script.structure}</p>
                          </div>
                          <div className="p-3 md:p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Audience Insights</p>
                            <p className="text-[10px] md:text-[11px] text-on-surface-variant leading-relaxed">{script.insights}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 md:space-y-3">
                          <div className="p-2.5 md:p-3 bg-surface-container-lowest rounded-lg md:rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-primary mb-0.5 md:mb-1">Hook</p>
                            <p className="text-[11px] md:text-xs text-on-surface font-bold leading-tight">{script.hook}</p>
                          </div>
                          <div className="p-2.5 md:p-3 bg-surface-container-lowest rounded-lg md:rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-secondary mb-0.5 md:mb-1">Body</p>
                            <p className="text-[10px] md:text-[11px] text-on-surface-variant leading-relaxed">{script.body}</p>
                          </div>
                          <div className="p-2.5 md:p-3 bg-surface-container-lowest rounded-lg md:rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-tertiary mb-0.5 md:mb-1">CTA</p>
                            <p className="text-[11px] md:text-xs text-on-surface font-bold">{script.cta}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      case 'plan':
        return (
          <div className="space-y-6 md:space-y-8">
            {!thirtyDayPlan && isGeneratingPlan ? (
              <div className="flex flex-col items-center justify-center py-16 md:py-24 space-y-4 md:space-y-6 px-4">
                <div className="relative">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-primary animate-pulse w-6 h-6 md:w-8 md:h-8" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl md:text-2xl font-black text-on-surface tracking-tight">Engineering Your 30-Day Strategy</h3>
                  <p className="text-sm md:text-base text-on-surface-variant/60 font-medium max-w-md mx-auto">Analyzing your audit data to build a high-conversion content roadmap...</p>
                </div>
              </div>
            ) : thirtyDayPlan ? (
              <div className="space-y-12">
                {/* Strategy Header & Refinement */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                  <h3 className="text-2xl md:text-3xl font-black tracking-tight text-on-surface">30-Day Viral Strategy</h3>
                  <div className="flex flex-wrap items-center gap-3 md:gap-4">
                    <button 
                      onClick={handleGeneratePlan}
                      disabled={isGeneratingPlan}
                      className={cn(
                        "flex items-center justify-center rounded-full bg-surface-container-low border border-outline-variant/20 transition-all disabled:opacity-100 overflow-hidden",
                        isGeneratingPlan ? "h-8 px-4 w-auto" : "w-8 h-8 text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                      )}
                      title="Regenerate Plan"
                    >
                      <AnimatePresence mode="wait">
                        {isGeneratingPlan ? (
                          <motion.div
                            key="generating"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary"
                          >
                            <Zap size={12} fill="currentColor" className="animate-pulse" />
                            <motion.span
                              key={generationState}
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="w-32 text-left"
                            >
                              {generationState === 'crafting' && 'Crafting Strategy...'}
                              {generationState === 'building' && 'Building Content Plan...'}
                              {generationState === 'completed' && 'Completed Boss 🫡'}
                            </motion.span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="idle"
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                          >
                            <Zap size={16} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                    <button 
                      onClick={() => setShowRefineInput(!showRefineInput)}
                      className="flex items-center gap-2 text-secondary font-black text-[10px] md:text-xs uppercase tracking-widest hover:underline"
                    >
                      <Sparkles size={16} />
                      Refine with Gemini
                    </button>
                    <button className="flex items-center gap-2 text-primary font-black text-[10px] md:text-xs uppercase tracking-widest hover:underline">
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
                      <div className="bg-surface-container-low p-4 md:p-6 rounded-2xl md:rounded-3xl border border-secondary/20 shadow-lg space-y-3 md:space-y-4">
                        <div className="flex items-center gap-2 md:gap-3 text-secondary">
                          <Sparkles size={16} className="md:w-[18px] md:h-[18px]" />
                          <h4 className="text-xs md:text-sm font-black uppercase tracking-widest">AI Strategy Refinement</h4>
                        </div>
                        <textarea 
                          value={refinementFeedback}
                          onChange={(e) => setRefinementFeedback(e.target.value)}
                          placeholder="e.g. 'Make it more focused on LinkedIn' or 'Include more video content ideas'..."
                          className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl p-3 md:p-4 text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary/20 min-h-[80px] md:min-h-[100px] resize-none"
                        />
                        <div className="flex flex-col sm:flex-row justify-end gap-2 md:gap-3">
                          <button 
                            onClick={() => setShowRefineInput(false)}
                            className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleRefinePlan}
                            disabled={isRefiningPlan || !refinementFeedback}
                            className="w-full sm:w-auto bg-secondary text-on-secondary px-6 md:px-8 py-2.5 md:py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isRefiningPlan ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} fill="currentColor" />}
                            Refine Strategy
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Strategic Sync Summary */}
                <div className="bg-surface-container-low p-6 md:p-8 rounded-3xl md:rounded-[32px] border border-outline-variant/10 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 text-primary">
                    <Target size={24} />
                    <h4 className="font-black text-lg md:text-xl tracking-tight">Strategic Sync Summary</h4>
                  </div>
                  <div className="space-y-4 text-sm md:text-base text-on-surface-variant/80 font-medium leading-relaxed">
                    {thirtyDayPlan.strategicSyncSummary?.map((paragraph: string, idx: number) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>
                </div>

                {/* KPIs and A/B Testing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="bg-surface-container-low p-6 md:p-8 rounded-3xl md:rounded-[32px] border border-outline-variant/10 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-secondary">
                      <TrendingUp size={24} />
                      <h4 className="font-black text-lg md:text-xl tracking-tight">Weekly KPIs</h4>
                    </div>
                    <div className="space-y-3">
                      {thirtyDayPlan.weeklyKPIs?.map((kpi: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                          <span className="text-xs md:text-sm font-bold text-on-surface-variant">{kpi.kpi}</span>
                          <span className="text-xs md:text-sm font-black text-primary">{kpi.target}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-surface-container-low p-6 md:p-8 rounded-3xl md:rounded-[32px] border border-outline-variant/10 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-tertiary">
                      <Zap size={24} />
                      <h4 className="font-black text-lg md:text-xl tracking-tight">A/B Test Plan</h4>
                    </div>
                    <div className="space-y-3">
                      {thirtyDayPlan.abTestPlan?.map((test: any, idx: number) => (
                        <div key={idx} className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/5 space-y-1">
                          <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-tertiary/60">Test: {test.variable}</p>
                          <p className="text-xs md:text-sm font-bold text-on-surface-variant">{test.hypothesis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hook Library */}
                <div className="bg-surface-container-low p-6 md:p-8 rounded-3xl md:rounded-[32px] border border-outline-variant/10 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 text-on-surface">
                    <Sparkles size={24} />
                    <h4 className="font-black text-lg md:text-xl tracking-tight">Hook Library</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {thirtyDayPlan.hookLibrary?.map((hook: string, idx: number) => (
                      <div key={idx} className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                        <p className="text-sm font-bold text-on-surface-variant italic">"{hook}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Daily Content Grid Preview */}
                <div className="bg-surface-container-low rounded-3xl md:rounded-[40px] p-6 md:p-10 border border-outline-variant/10 shadow-sm space-y-6 md:space-y-8">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                    <div className="space-y-1">
                      <h3 className="text-xl md:text-2xl font-black tracking-tight text-on-surface">Daily Content Execution</h3>
                      <p className="text-xs md:text-sm font-medium text-on-surface-variant/60">The first 7 days of your high-velocity content sprint.</p>
                    </div>
                    <button 
                      onClick={handleSyncToCalendar}
                      className="w-full md:w-auto bg-primary text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg md:shadow-xl shadow-primary/20 md:shadow-primary/30 hover:scale-[1.02] md:hover:scale-105 transition-all active:scale-95"
                    >
                      Sync to Calendar
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
                    {thirtyDayPlan.calendar?.slice(0, 7).map((day: any, idx: number) => (
                      <div key={idx} className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl md:rounded-3xl border border-outline-variant/5 space-y-3 md:space-y-4 hover:border-primary/20 transition-all group cursor-pointer flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] md:text-xs font-black text-on-surface-variant/40 group-hover:text-primary transition-colors">Day 0{idx + 1}</span>
                          <div className="w-5 h-5 md:w-6 md:h-6 rounded-md md:rounded-lg bg-primary/5 text-primary flex items-center justify-center shrink-0">
                            <Zap size={10} className="md:w-3 md:h-3" fill="currentColor" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary/60 truncate">{day.platform}</p>
                          <p className="text-[11px] md:text-xs font-bold text-on-surface line-clamp-2 md:line-clamp-3 leading-tight">{day.hook || day.message?.substring(0, 50)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 md:py-24 space-y-6 md:space-y-8 text-center px-4">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl md:rounded-[32px] bg-surface-container-low flex items-center justify-center text-on-surface-variant/20">
                  <Rocket size={40} className="md:w-12 md:h-12" />
                </div>
                <div className="space-y-3 md:space-y-4">
                  <h3 className="text-xl md:text-2xl font-black text-on-surface tracking-tight">No Strategy Data Found</h3>
                  <p className="text-sm md:text-base text-on-surface-variant/60 font-medium max-w-md mx-auto">Complete a business audit first to generate your custom 30-day high-performance roadmap.</p>
                  {auditData && (
                    <button 
                      onClick={handleGeneratePlan}
                      className="w-full sm:w-auto bg-primary text-white px-6 md:px-8 py-3 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:scale-105 transition-all mt-4"
                    >
                      Generate Roadmap
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => window.location.reload()} // Simple way to go back to audit if we don't have a view switcher here
                  className="w-full sm:w-auto bg-surface-container-highest text-on-surface px-8 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm border border-outline-variant/10 hover:bg-surface-container transition-all"
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
                "space-y-6 md:space-y-8 transition-all duration-500",
                isSidePanelOpen ? "lg:col-span-8" : "max-w-6xl mx-auto w-full"
              )}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full md:w-auto">
                    <h3 className="text-2xl md:text-3xl font-black tracking-tight text-on-surface">{MONTH_NAMES[selectedDate.month]} {selectedDate.year}</h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const newMonth = selectedDate.month === 0 ? 11 : selectedDate.month - 1;
                          const newYear = selectedDate.month === 0 ? selectedDate.year - 1 : selectedDate.year;
                          setSelectedDate({ ...selectedDate, month: newMonth, year: newYear, day: 1 });
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-surface-container-low hover:bg-surface-container rounded-xl transition-all border border-outline-variant/10 shadow-sm"
                      >
                        <ChevronRight className="rotate-180 text-on-surface-variant" size={20} />
                      </button>
                      <button 
                        onClick={() => {
                          const newMonth = selectedDate.month === 11 ? 0 : selectedDate.month + 1;
                          const newYear = selectedDate.month === 11 ? selectedDate.year + 1 : selectedDate.year;
                          setSelectedDate({ ...selectedDate, month: newMonth, year: newYear, day: 1 });
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-surface-container-low hover:bg-surface-container rounded-xl transition-all border border-outline-variant/10 shadow-sm"
                      >
                        <ChevronRight className="text-on-surface-variant" size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 relative w-full md:w-auto">
                    <button 
                      onClick={() => setShowFilters(!showFilters)}
                      className={cn(
                        "flex-1 md:flex-none justify-center bg-surface-container-low text-on-surface-variant px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest border border-outline-variant/10 flex items-center gap-2 md:gap-3 hover:bg-surface-container transition-all shadow-sm",
                        (filters.platform.length > 0 || filters.status.length > 0 || filters.type.length > 0) && "border-primary/50 bg-primary/5"
                      )}
                    >
                      <Filter size={14} className={cn("text-primary md:w-4 md:h-4", (filters.platform.length > 0 || filters.status.length > 0 || filters.type.length > 0) ? "text-primary" : "text-on-surface-variant/40")} />
                      Filters
                      {(filters.platform.length + filters.status.length + filters.type.length) > 0 && (
                        <span className="bg-primary text-white w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex items-center justify-center text-[7px] md:text-[8px]">
                          {filters.platform.length + filters.status.length + filters.type.length}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {showFilters && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full left-0 md:left-auto md:right-0 mt-4 w-[calc(100vw-3rem)] md:w-80 bg-surface-container-low rounded-3xl border border-outline-variant/10 shadow-2xl z-[100] p-6 space-y-6"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface">Filter Content</h4>
                            <button 
                              onClick={clearFilters}
                              className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline"
                            >
                              Clear All
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Platform</p>
                              <div className="flex flex-wrap gap-2">
                                {['TikTok', 'LinkedIn', 'Instagram', 'YouTube', 'Twitter'].map(p => (
                                  <button
                                    key={p}
                                    onClick={() => toggleFilter('platform', p)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                      filters.platform.includes(p) 
                                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                                        : "bg-surface-container-highest/30 text-on-surface-variant/60 border-outline-variant/10 hover:bg-surface-container-highest"
                                    )}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Status</p>
                              <div className="flex flex-wrap gap-2">
                                {['scheduled', 'published', 'draft'].map(s => (
                                  <button
                                    key={s}
                                    onClick={() => toggleFilter('status', s)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                      filters.status.includes(s) 
                                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                                        : "bg-surface-container-highest/30 text-on-surface-variant/60 border-outline-variant/10 hover:bg-surface-container-highest"
                                    )}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Type</p>
                              <div className="flex flex-wrap gap-2">
                                {['video', 'article', 'post'].map(t => (
                                  <button
                                    key={t}
                                    onClick={() => toggleFilter('type', t)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                      filters.type.includes(t) 
                                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                                        : "bg-surface-container-highest/30 text-on-surface-variant/60 border-outline-variant/10 hover:bg-surface-container-highest"
                                    )}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button 
                      onClick={handleExportCSV}
                      className="flex-1 md:flex-none justify-center bg-surface-container-highest text-on-surface-variant px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest border border-outline-variant/10 flex items-center gap-2 md:gap-3 hover:bg-surface-container-high transition-all shadow-lg shadow-black/5"
                    >
                      <Download size={14} className="md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Export CSV</span>
                      <span className="sm:hidden">CSV</span>
                    </button>
                    <button 
                      onClick={() => setShowRegenModal(true)}
                      className="flex-1 md:flex-none justify-center bg-[#FFD600] text-black px-4 md:px-6 py-2.5 md:py-3 rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest border border-outline-variant/10 flex items-center gap-2 md:gap-3 hover:brightness-105 transition-all shadow-lg shadow-[#FFD600]/20"
                    >
                      <Share2 size={14} className="md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Regen for Notion</span>
                      <span className="sm:hidden">Notion</span>
                    </button>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-3xl md:rounded-[40px] overflow-hidden border border-outline-variant/10 shadow-xl shadow-black/5 overflow-x-auto">
                  <div className="min-w-[700px]">
                    <div className="grid grid-cols-7 border-b border-outline-variant/10">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-4 md:py-6 text-center text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-on-surface-variant/40">
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-px bg-outline-variant/10">
                    {(() => {
                      const daysInMonth = new Date(selectedDate.year, selectedDate.month + 1, 0).getDate();
                      const firstDayOfMonth = new Date(selectedDate.year, selectedDate.month, 1).getDay();
                      const today = new Date();
                      const isCurrentMonth = today.getMonth() === selectedDate.month && today.getFullYear() === selectedDate.year;
                      const todayDate = today.getDate();

                      const cells = [];
                      // Empty cells for padding
                      for (let i = 0; i < firstDayOfMonth; i++) {
                        cells.push(<div key={`empty-${i}`} className="bg-surface-container-lowest/50 min-h-[120px] md:min-h-[180px]" />);
                      }

                      // Actual days
                      for (let day = 1; day <= daysInMonth; day++) {
                        const items = filteredCalendarItems.filter(item => item.day === day && item.month === selectedDate.month && item.year === selectedDate.year);
                        const isSelected = selectedDate.day === day && isSidePanelOpen;
                        const isToday = isCurrentMonth && day === todayDate;

                        cells.push(
                          <div 
                            key={`day-${day}`} 
                            onClick={() => {
                              setSelectedDate({ ...selectedDate, day });
                              setIsSidePanelOpen(true);
                            }}
                            className={cn(
                              "bg-surface-container-lowest min-h-[120px] md:min-h-[180px] p-2 md:p-4 group hover:bg-surface-container-low/50 transition-all relative cursor-pointer",
                              isSelected && "ring-2 ring-inset ring-primary/20 bg-primary/5",
                              isToday && "bg-primary/5"
                            )}
                          >
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-2 md:mb-3 gap-1 md:gap-0">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-xs md:text-sm font-black transition-colors",
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
                                <span className="text-[8px] font-black uppercase tracking-widest text-primary bg-primary/10 px-1.5 md:px-2 py-0.5 rounded-full">Today</span>
                              )}
                            </div>

                            <div className="space-y-2 md:space-y-3">
                              {items.map(item => (
                                <div 
                                  key={item.id}
                                  className={cn(
                                    "p-2 md:p-3 rounded-xl md:rounded-2xl border shadow-sm space-y-1 md:space-y-2 relative group/item",
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
                                    <span className="hidden md:inline text-[8px] font-black uppercase tracking-widest opacity-60">{item.platform}</span>
                                    <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditClick(item);
                                        }}
                                        className="text-[8px] font-black uppercase tracking-widest text-primary hover:underline"
                                      >
                                        Edit
                                      </button>
                                      <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{item.status}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDate({ ...selectedDate, day });
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
                      }
                      return cells;
                    })()}
                  </div>
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
                    className="lg:col-span-4 space-y-6 md:space-y-8"
                  >
                    <div className="bg-surface-container-low rounded-3xl md:rounded-[40px] p-6 md:p-10 border border-outline-variant/10 shadow-xl shadow-black/5 space-y-6 md:space-y-10 sticky top-24">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                        <div className="space-y-1">
                          <h4 className="text-lg md:text-xl font-black tracking-tight text-on-surface">{MONTH_NAMES[selectedDate.month]} {selectedDate.day}, {selectedDate.year}</h4>
                          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Daily Content Schedule</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
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
                      <div className="flex justify-between gap-1 md:gap-2 overflow-x-auto no-scrollbar pb-2">
                        {(() => {
                          // Calculate the week containing the selected date
                          const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                          
                          // Find the actual day of week for the selected date.
                          const selectedDateObj = new Date(selectedDate.year, selectedDate.month, selectedDate.day);
                          const dayOfWeek = selectedDateObj.getDay();
                          
                          // Find the Sunday of this week
                          const sundayOfThisWeek = new Date(selectedDate.year, selectedDate.month, selectedDate.day - dayOfWeek);
                          
                          return Array.from({ length: 7 }).map((_, i) => {
                            const d = new Date(sundayOfThisWeek);
                            d.setDate(sundayOfThisWeek.getDate() + i);
                            
                            const isSelected = selectedDate.day === d.getDate() && 
                                             selectedDate.month === d.getMonth() && 
                                             selectedDate.year === d.getFullYear();
                            
                            return (
                              <div 
                                key={i}
                                onClick={() => setSelectedDate({ day: d.getDate(), month: d.getMonth(), year: d.getFullYear() })}
                                className={cn(
                                  "flex flex-col items-center gap-1 md:gap-2 p-2 md:p-3 rounded-xl md:rounded-2xl transition-all cursor-pointer min-w-[48px] md:min-w-[56px] shrink-0",
                                  isSelected 
                                    ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105 md:scale-110" 
                                    : "bg-surface-container-highest/30 text-on-surface-variant/60 hover:bg-surface-container-highest"
                                )}
                              >
                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-60">{weekDays[i]}</span>
                                <span className="text-base md:text-lg font-black">{d.getDate()}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Selected Day Content */}
                      <div className="space-y-6">
                        {selectedDayItems.length > 0 ? (
                          selectedDayItems.map(item => (
                            <div key={item.id} className="bg-surface-container-lowest rounded-2xl md:rounded-[32px] p-6 md:p-8 border border-outline-variant/10 shadow-sm space-y-4 md:space-y-6 group">
                              <div className="flex items-center justify-between">
                                <span className="text-4xl md:text-6xl font-black text-on-surface-variant/10 group-hover:text-primary/10 transition-colors">{item.day}</span>
                                <span className={cn(
                                  "px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest",
                                  item.status === 'scheduled' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                )}>
                                  {item.status}
                                </span>
                              </div>

                              <div className="space-y-3 md:space-y-4">
                                <div className="space-y-1">
                                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">{item.platform} / {item.type}</p>
                                  <h5 className="text-xl md:text-2xl font-black text-on-surface leading-tight tracking-tight">{item.title}</h5>
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
                                <button 
                                  onClick={() => handleEditClick(item)}
                                  className="p-3 text-on-surface-variant/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                >
                                  <Sparkles size={18} />
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
            {typeof document !== 'undefined' && createPortal(
              <AnimatePresence>
                {showAddModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
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
                    className="bg-surface-container-low w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl md:rounded-[40px] border border-outline-variant/10 shadow-2xl relative z-10"
                  >
                    <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                      <div className="flex items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xl md:text-2xl font-black tracking-tight text-on-surface">
                            {editingItem ? 'Edit Content' : 'Add Content'}
                          </h4>
                          <p className="text-xs md:text-sm font-medium text-on-surface-variant/60">
                            {editingItem ? 'Modify your scheduled content' : `Schedule new content for ${MONTH_NAMES[selectedDate.month].substring(0, 3)} ${selectedDate.day}, ${selectedDate.year}`}
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            setShowAddModal(false);
                            setEditingItem(null);
                            setNewItem({
                              platform: 'Instagram',
                              type: 'video',
                              status: 'scheduled',
                              time: '09:00 AM'
                            });
                          }}
                          className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-surface-container-highest/50 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-4 md:space-y-6">
                        <div className="space-y-1.5 md:space-y-2">
                          <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Title</label>
                          <input 
                            type="text" 
                            placeholder="Enter content title..."
                            value={newItem.title || ''}
                            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>

                        <div className="space-y-1.5 md:space-y-2">
                          <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Description</label>
                          <textarea 
                            placeholder="Enter content description..."
                            value={newItem.description || ''}
                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                            rows={3}
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                          <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Platform</label>
                            <select 
                              value={newItem.platform}
                              onChange={(e) => setNewItem({ ...newItem, platform: e.target.value as any })}
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                            >
                              <option value="Instagram">Instagram</option>
                              <option value="TikTok">TikTok</option>
                              <option value="LinkedIn">LinkedIn</option>
                              <option value="Twitter">Twitter/X</option>
                              <option value="YouTube">YouTube</option>
                            </select>
                          </div>
                          <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Type</label>
                            <select 
                              value={newItem.type}
                              onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                            >
                              <option value="video">Video</option>
                              <option value="article">Article</option>
                              <option value="post">Post</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                          <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Time</label>
                            <input 
                              type="time" 
                              value={newItem.time}
                              onChange={(e) => setNewItem({ ...newItem, time: e.target.value })}
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Status</label>
                            <select 
                              value={newItem.status}
                              onChange={(e) => setNewItem({ ...newItem, status: e.target.value as any })}
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="draft">Draft</option>
                              <option value="published">Published</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                        {editingItem && (
                          <button 
                            onClick={() => {
                              handleDeleteContent(editingItem.id);
                              setShowAddModal(false);
                              setEditingItem(null);
                              setNewItem({
                                platform: 'Instagram',
                                type: 'video',
                                status: 'scheduled',
                                time: '09:00 AM'
                              });
                            }}
                            className="flex-1 bg-rose-500/10 text-rose-500 py-4 md:py-6 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                          >
                            Delete
                          </button>
                        )}
                        <button 
                          onClick={handleSaveContent}
                          className={cn(
                            "py-4 md:py-6 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-xl md:shadow-2xl transition-all active:scale-95",
                            editingItem ? "flex-[2] bg-secondary text-on-secondary shadow-secondary/30" : "w-full bg-primary text-white shadow-primary/30 hover:scale-[1.02]"
                          )}
                        >
                          {editingItem ? 'Save Changes' : 'Add to Calendar'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
              </AnimatePresence>,
              document.body
            )}

            {/* Regen for Notion Modal */}
            {typeof document !== 'undefined' && createPortal(
              <AnimatePresence>
                {showRegenModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowRegenModal(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-surface-container-low w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl md:rounded-[40px] border border-outline-variant/10 shadow-2xl relative z-10"
                  >
                    <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                      <div className="flex items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xl md:text-2xl font-black tracking-tight text-on-surface">
                            Regen for Notion
                          </h4>
                          <p className="text-xs md:text-sm font-medium text-on-surface-variant/60">
                            Generate a content calendar based on a simple prompt.
                          </p>
                        </div>
                        <button 
                          onClick={() => setShowRegenModal(false)}
                          className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-surface-container-highest/50 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-4 md:space-y-6">
                        <div className="space-y-1.5 md:space-y-2">
                          <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Prompt</label>
                          <textarea 
                            placeholder="e.g. Generate a 2-week launch plan for my new SaaS product targeting developers..."
                            value={regenPrompt}
                            onChange={(e) => setRegenPrompt(e.target.value)}
                            rows={4}
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50 transition-all resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                        <button 
                          onClick={handleRegenForNotion}
                          disabled={isRegenerating || !regenPrompt.trim()}
                          className={cn(
                            "w-full py-4 md:py-6 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-xl md:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3",
                            isRegenerating || !regenPrompt.trim() ? "bg-surface-container-highest text-on-surface-variant/50 cursor-not-allowed" : "bg-[#FFD600] text-black shadow-[#FFD600]/30 hover:scale-[1.02]"
                          )}
                        >
                          {isRegenerating ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} />
                              Generate Content
                            </>
                          )}
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
      case 'autopost':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
            {/* Asset Management */}
            <div className="lg:col-span-8 space-y-6 md:space-y-10">
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileUpload}
                className={cn(
                  "bg-surface-container-lowest border-2 border-dashed rounded-3xl md:rounded-[40px] aspect-square md:aspect-[16/9] flex flex-col items-center justify-center gap-6 md:gap-8 group transition-all cursor-pointer shadow-sm relative overflow-hidden p-6 md:p-0",
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
                      "w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-[32px] flex items-center justify-center transition-all duration-500 shadow-lg shadow-primary/5",
                      isDragging ? "bg-primary text-white scale-110" : "bg-surface-container-low text-primary group-hover:scale-110"
                    )}>
                      <Upload size={32} className="md:w-10 md:h-10" />
                    </div>
                    <div className="text-center space-y-2 md:space-y-3 relative z-10">
                      <h4 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight">
                        {isDragging ? "Drop to upload" : "Drag and drop assets"}
                      </h4>
                      <p className="text-sm md:text-base font-medium text-on-surface-variant/60">Supports MP4, MOV, PNG, JPG (Max 500MB)</p>
                    </div>
                    <button className="bg-surface-container-low text-on-surface px-8 md:px-12 py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-xs md:text-sm border border-outline-variant/10 hover:bg-surface-container transition-all shadow-sm active:scale-95 relative z-10">
                      Browse Files
                    </button>
                  </>
                )}
              </div>

              {/* Asset Gallery */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-8">
                {uploadedAssets.map((img, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="aspect-square rounded-2xl md:rounded-[32px] overflow-hidden border border-outline-variant/10 shadow-md group cursor-pointer relative"
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
                  className="aspect-square rounded-2xl md:rounded-[32px] border-2 border-dashed border-outline-variant/20 flex items-center justify-center text-on-surface-variant/40 hover:border-primary/40 hover:text-primary transition-all bg-surface-container-low/30 group"
                >
                  <Plus size={32} className="md:w-10 md:h-10 group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>
            </div>

            {/* Post Configuration Sidebar */}
            <div className="lg:col-span-4 space-y-6 md:space-y-8">
              <div className="bg-surface-container-low rounded-3xl md:rounded-[40px] p-6 md:p-10 border border-outline-variant/10 shadow-xl shadow-black/5 space-y-8 md:space-y-10">
                <div className="space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">Post Configuration</h4>
                  <p className="text-sm font-medium text-on-surface-variant/60 leading-relaxed">Automate your distribution across the hub.</p>
                </div>

                <div className="space-y-6 md:space-y-8">
                  {/* Content Script */}
                  <div className="space-y-3 md:space-y-4">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">Content Script (From Calendar)</label>
                    <div className="relative group">
                      <select className="w-full bg-surface-container-highest/40 border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3.5 md:py-5 text-xs md:text-sm font-bold text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                        <option>Q4 Strategy Reveal - Video Script v2</option>
                        <option>The Hidden Growth Hack</option>
                        <option>Why we raised $0 and scaled</option>
                      </select>
                      <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/40 group-hover:text-primary transition-colors">
                        <Clapperboard size={16} className="md:w-5 md:h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="space-y-3 md:space-y-4">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">Schedule Date & Time</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      <div className="relative group">
                        <input type="date" defaultValue="2023-10-24" className="w-full bg-surface-container-highest/40 border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3.5 md:py-5 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer" />
                        <Calendar size={16} className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-hover:text-primary transition-colors pointer-events-none md:w-[18px] md:h-[18px]" />
                      </div>
                      <div className="relative group">
                        <input type="time" defaultValue="09:00" className="w-full bg-surface-container-highest/40 border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3.5 md:py-5 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer" />
                        <Clock size={16} className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-hover:text-primary transition-colors pointer-events-none md:w-[18px] md:h-[18px]" />
                      </div>
                    </div>
                  </div>

                  {/* Platforms */}
                  <div className="space-y-3 md:space-y-4">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">Publishing Platforms</label>
                    <div className="grid grid-cols-3 gap-3 md:gap-4">
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
                            "flex flex-col items-center justify-center gap-2 md:gap-3 aspect-square rounded-xl md:rounded-[24px] border transition-all group relative overflow-hidden",
                            p.active 
                              ? "bg-surface-container-lowest border-primary text-primary shadow-lg shadow-primary/5" 
                              : "bg-surface-container-highest/30 border-outline-variant/10 text-on-surface-variant/30 hover:bg-surface-container-highest/50"
                          )}
                        >
                          {p.active && <div className="absolute top-0 right-0 w-6 h-6 md:w-8 md:h-8 bg-primary/10 rounded-bl-xl md:rounded-bl-2xl flex items-center justify-center"><CheckCircle2 size={10} className="md:w-3 md:h-3" /></div>}
                          {p.isX ? <span className="text-lg md:text-xl font-black">✕</span> : <p.icon size={20} className="md:w-6 md:h-6" />}
                          <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 md:pt-6 space-y-4 md:space-y-5">
                    <button className="w-full bg-secondary-container text-on-secondary-container py-4 md:py-6 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-xl md:shadow-2xl shadow-secondary/20 md:shadow-secondary/30 hover:scale-[1.02] hover:brightness-105 active:scale-95 transition-all">
                      Schedule / Publish
                    </button>
                    <p className="text-[9px] md:text-[10px] font-black text-on-surface-variant/30 uppercase tracking-[0.2em] text-center">Estimated Reach: 45.2k Impressions</p>
                  </div>
                </div>
              </div>

              {/* Efficiency Card */}
              <div className="bg-primary rounded-3xl md:rounded-[40px] p-6 md:p-10 text-white shadow-2xl shadow-primary/30 space-y-4 md:space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 bg-on-surface/10 blur-[60px] md:blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
                <div className="relative z-10 space-y-2">
                  <h5 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-white/60">Autopost Efficiency</h5>
                  <p className="text-4xl md:text-5xl font-black tracking-tighter">94.8%</p>
                  <div className="flex items-center gap-2 md:gap-3 text-[9px] md:text-[11px] font-black text-white/90 bg-on-surface/10 w-fit px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-white/10">
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
    <div className="space-y-6 md:space-y-10 relative">
      {createPortal(
        <AnimatePresence>
          {isGeneratingPlan && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface/95 backdrop-blur-md"
            >
              <div className="relative flex items-center justify-center w-32 h-32 mb-8">
                {/* Spinner */}
                <svg className="absolute inset-0 w-full h-full animate-[spin_3s_linear_infinite]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" className="text-outline-variant/20" />
                  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="60 200" strokeLinecap="round" className="text-primary" />
                </svg>
                {/* Sparkle Icon */}
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <div className="h-12 relative flex items-center justify-center overflow-hidden mb-4 w-full">
                <AnimatePresence mode="wait">
                  <motion.h2 
                    key={generationState}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 1 }}
                    className="text-3xl md:text-4xl font-black tracking-tight text-on-surface text-center absolute"
                  >
                    {generationState === 'crafting' && 'Crafting Strategy...'}
                    {generationState === 'building' && 'Building Content Plan...'}
                    {generationState === 'completed' && 'Completed Boss 🫡'}
                  </motion.h2>
                </AnimatePresence>
              </div>
              <p className="text-on-surface-variant/60 max-w-md text-center text-sm font-medium">
                TitanLeap AI is scanning social signals, ad libraries, and landing page structures...
              </p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Header with Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 md:gap-6">
        <div className="space-y-1 md:space-y-2">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-on-surface">Strategy Hub</h2>
          <p className="text-xs md:text-sm font-medium text-on-surface-variant/60">Orchestrate your multi-channel growth engine.</p>
        </div>

        <div className="bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10 shadow-sm flex gap-1 overflow-x-auto no-scrollbar w-full lg:w-auto">
          {auditData && (
            <button
              onClick={() => setActiveTab('plan')}
              className={cn(
                "flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0",
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
                "flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0",
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
