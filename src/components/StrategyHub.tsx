import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Anchor, Network, LineChart, Download, Clapperboard, Info, Bolt, Search, Users, TrendingUp, Calendar, Upload, Clock, CheckCircle2, List, LayoutGrid, Filter, Plus, ChevronRight, Share2, MoreHorizontal, Instagram, Twitter, Linkedin, Youtube, Play, Zap, Rocket, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { generateContentScripts } from '@/src/services/ai';

type StrategyTab = 'competitor' | 'calendar' | 'autopost';

export const StrategyHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StrategyTab>('competitor');
  const [mode, setMode] = useState<'general' | 'per-link'>('general');
  const [handle, setHandle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScripts, setGeneratedScripts] = useState<any[]>([]);

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
                        mode === 'general' ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/60 hover:text-on-surface"
                      )}
                    >
                      General
                    </button>
                    <button 
                      onClick={() => setMode('per-link')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                        mode === 'per-link' ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/60 hover:text-on-surface"
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
                  <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px]">30 Days</span>
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
      case 'calendar':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-black tracking-tight text-on-surface">March 2026</h3>
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-surface-container rounded-lg transition-colors"><ChevronRight className="rotate-180 text-on-surface-variant" size={18} /></button>
                  <button className="p-2 hover:bg-surface-container rounded-lg transition-colors"><ChevronRight className="text-on-surface-variant" size={18} /></button>
                </div>
              </div>
              <button className="bg-surface-container-highest text-on-surface-variant px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-outline-variant/20 flex items-center gap-2 hover:bg-surface-container transition-all">
                <Share2 size={14} />
                Regen for Notion
              </button>
            </div>

            <div className="grid grid-cols-7 gap-px bg-outline-variant/20 rounded-3xl overflow-hidden border border-outline-variant/20 shadow-sm">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-surface-container-low py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">
                  {day}
                </div>
              ))}
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const hasContent = day % 3 === 0;
                return (
                  <div key={i} className="bg-surface-container-lowest min-h-[140px] p-4 group hover:bg-surface-container-low transition-colors relative">
                    <span className="text-sm font-black text-on-surface-variant/40 group-hover:text-primary transition-colors">{day}</span>
                    {hasContent && (
                      <div className="mt-2 space-y-2">
                        <div className="p-2 bg-primary/5 border border-primary/10 rounded-lg space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-widest text-primary">TikTok</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(var(--success-rgb),0.5)]" />
                          </div>
                          <p className="text-[10px] font-bold leading-tight text-on-surface line-clamp-2">The Hidden Growth Hack for SaaS Founders</p>
                        </div>
                        {day === 12 && (
                          <div className="p-2 bg-secondary/5 border border-secondary/10 rounded-lg space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-black uppercase tracking-widest text-secondary">LinkedIn</span>
                              <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                            </div>
                            <p className="text-[10px] font-bold leading-tight text-on-surface line-clamp-2">Why we raised $0 and scaled to $1M ARR</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'autopost':
        return (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Upload Area */}
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">
                  Media Asset
                </label>
                <div className="aspect-square bg-surface-container-low border-2 border-dashed border-outline-variant/30 rounded-3xl flex flex-col items-center justify-center gap-4 group hover:border-primary/40 transition-all cursor-pointer">
                  <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <Upload size={28} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-on-surface">Drop video or image</p>
                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-1">MP4, MOV, PNG, JPG (Max 500MB)</p>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">
                    Schedule Date & Time
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
                      <input type="date" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface" />
                    </div>
                    <div className="w-32 relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={16} />
                      <input type="time" className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">
                    Content Script
                  </label>
                  <select className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-on-surface">
                    <option>Select from Calendar...</option>
                    <option>The Hidden Growth Hack for SaaS Founders</option>
                    <option>Why we raised $0 and scaled to $1M ARR</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">
                    Target Platforms
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'ig', label: 'Instagram', icon: Instagram },
                      { id: 'tt', label: 'TikTok', icon: Play },
                      { id: 'tw', label: 'Twitter/X', icon: Twitter },
                      { id: 'li', label: 'LinkedIn', icon: Linkedin },
                      { id: 'yt', label: 'YouTube', icon: Youtube },
                    ].map(platform => (
                      <button 
                        key={platform.id}
                        className="flex flex-col items-center gap-2 p-3 bg-surface-container-low border border-outline-variant/10 rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all group"
                      >
                        <platform.icon size={18} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant group-hover:text-primary">{platform.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button className="w-full monolith-gradient text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/30 flex items-center justify-center gap-3 hover:scale-[1.02] transition-all active:scale-95 mt-4">
                  <Bolt size={18} fill="white" />
                  Schedule & Publish
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex items-center justify-center">
        <div className="bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/10 shadow-sm flex gap-1">
          {[
            { id: 'competitor', label: 'Competitor Analysis', icon: Network },
            { id: 'calendar', label: 'Content Calendar', icon: Calendar },
            { id: 'autopost', label: 'Autopost', icon: Rocket },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as StrategyTab)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                activeTab === tab.id 
                  ? "bg-surface-container-lowest text-primary shadow-md shadow-primary/5" 
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
