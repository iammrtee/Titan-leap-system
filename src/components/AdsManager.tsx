import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, TrendingUp, DollarSign, Target, ArrowUpRight, MoreHorizontal, Rocket, Zap, CheckCircle2, AlertCircle, LayoutGrid, List, Filter, Plus, ChevronRight, Share2, Clock, Upload, Instagram, Twitter, Linkedin, Youtube, Play, FileText, BarChart3, Sparkles, Download, X, Eye } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Logo } from './Logo';

type AdsTab = 'strategy' | 'scripts' | 'performance';

const AdScriptCard = ({ platform, body, status, color, onPreview }: any) => (
  <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-center justify-between mb-4">
      <div className={cn("px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest", color)}>
        {platform}
      </div>
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === 'Active' ? "bg-success" : status === 'Draft' ? "bg-warning" : "bg-primary"
        )} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{status}</span>
      </div>
    </div>
    <p className="text-sm text-on-surface-variant leading-relaxed mb-6 line-clamp-4 group-hover:text-on-surface transition-colors">{body}</p>
    <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
      <div className="flex gap-4">
        <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline transition-all">Edit Script</button>
        <button 
          onClick={onPreview}
          className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-all flex items-center gap-1"
        >
          <Eye size={12} />
          Preview
        </button>
      </div>
      <button className="text-on-surface-variant/40 hover:text-on-surface transition-colors"><MoreHorizontal size={16} /></button>
    </div>
  </div>
);

const PerformanceCard = ({ title, platform, spend, roas, clicks, conversions, thresholdHit }: any) => (
  <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
    {thresholdHit && (
      <div className="absolute top-0 right-0 p-4">
        <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_12px_rgba(var(--secondary-rgb),0.8)] animate-pulse" />
      </div>
    )}
    
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-all">
        {platform === 'Instagram' ? <Instagram size={20} /> : <Linkedin size={20} />}
      </div>
      <div>
        <h4 className="font-black text-sm text-on-surface tracking-tight leading-none">{title}</h4>
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold mt-1">{platform} Ads</p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Spend</p>
        <p className="text-sm font-black text-on-surface">${spend}</p>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">ROAS</p>
        <p className="text-sm font-black text-secondary">{roas}x</p>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Clicks</p>
        <p className="text-sm font-black text-on-surface">{clicks}</p>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Conversions</p>
        <p className="text-sm font-black text-on-surface">{conversions}</p>
      </div>
    </div>

    <div className="pt-4 border-t border-outline-variant/10 flex items-center justify-between">
      <button className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">View Details</button>
      {thresholdHit && (
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-secondary text-on-secondary px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-secondary/20 flex items-center gap-2 group/btn"
        >
          <Sparkles size={12} fill="white" className="group-hover/btn:animate-spin" />
          Scale
        </motion.button>
      )}
    </div>
  </div>
);

export const AdsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdsTab>('strategy');
  const [previewScript, setPreviewScript] = useState<any>(null);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'strategy':
        return (
          <div className="space-y-8">
            <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Target size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-on-surface tracking-tight">Ad Strategy Framework</h3>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold">Campaign Architecture</p>
                  </div>
                </div>
                <button className="text-xs font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-2">
                  <Download size={14} />
                  Pull from Calendar
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">
                    Core Campaign Strategy
                  </label>
                  <textarea 
                    rows={8}
                    placeholder="Describe your ad strategy, targeting, and funnel structure..."
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none text-on-surface"
                    defaultValue="Focusing on retargeting users who have interacted with our 'contrarian' SaaS growth content. Funnel leads into a free 15-minute growth audit VSL. Primary KPI is CPA < $45."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Target CPA', value: '$45.00', icon: DollarSign },
                    { label: 'Daily Budget', value: '$250.00', icon: TrendingUp },
                    { label: 'Primary Funnel', value: 'VSL Audit', icon: Play },
                  ].map((stat, i) => (
                    <div key={i} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                        <stat.icon size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">{stat.label}</p>
                        <p className="text-sm font-black text-on-surface">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'scripts':
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
                  <button className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white text-primary shadow-sm">All</button>
                  <button className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface">Instagram</button>
                  <button className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface">LinkedIn</button>
                </div>
              </div>
              <button className="monolith-gradient text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-all active:scale-95">
                <Plus size={18} />
                New Script
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AdScriptCard 
                platform="Instagram" 
                status="Active" 
                color="bg-primary/10 text-primary"
                body="Stop trying to scale your SaaS with cold email. It's 2026, and the game has changed. Your prospects are drowning in automated messages. Here's what's actually working..."
                onPreview={() => setPreviewScript({ platform: 'Instagram', body: "Stop trying to scale your SaaS with cold email. It's 2026, and the game has changed. Your prospects are drowning in automated messages. Here's what's actually working..." })}
              />
              <AdScriptCard 
                platform="LinkedIn" 
                status="Active" 
                color="bg-secondary/10 text-secondary"
                body="We scaled TitanLeap to $1M ARR with zero VC funding. No fancy pitch decks, no board meetings, just pure growth engineering. Want to see the framework we used?"
                onPreview={() => setPreviewScript({ platform: 'LinkedIn', body: "We scaled TitanLeap to $1M ARR with zero VC funding. No fancy pitch decks, no board meetings, just pure growth engineering. Want to see the framework we used?" })}
              />
              <AdScriptCard 
                platform="YouTube" 
                status="Draft" 
                color="bg-error/10 text-error"
                body="[Hook] You're one funnel away from scaling to $100k/mo. [Body] Most founders overcomplicate their growth. They think they need 10 different channels. You only need one that works."
                onPreview={() => setPreviewScript({ platform: 'YouTube', body: "[Hook] You're one funnel away from scaling to $100k/mo. [Body] Most founders overcomplicate their growth. They think they need 10 different channels. You only need one that works." })}
              />
              <AdScriptCard 
                platform="TikTok" 
                status="Active" 
                color="bg-primary/10 text-primary"
                body="POV: You finally switched to a Growth OS and your revenue velocity doubled in 30 days. 🚀 #SaaS #GrowthMarketing #TitanLeap"
                onPreview={() => setPreviewScript({ platform: 'TikTok', body: "POV: You finally switched to a Growth OS and your revenue velocity doubled in 30 days. 🚀 #SaaS #GrowthMarketing #TitanLeap" })}
              />
            </div>
          </div>
        );
      case 'performance':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Spend', value: '$12,450', trend: '+12%', icon: DollarSign },
                { label: 'Avg ROAS', value: '4.2x', trend: '+0.4x', icon: TrendingUp },
                { label: 'Total Clicks', value: '45.2k', trend: '+8.1k', icon: BarChart3 },
                { label: 'Conversions', value: '1,240', trend: '+142', icon: Target },
              ].map((stat, i) => (
                <div key={i} className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                      <stat.icon size={20} />
                    </div>
                    <div className="text-[10px] font-black text-success bg-success-container/10 px-2 py-1 rounded-md">{stat.trend}</div>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{stat.label}</p>
                  <p className="text-2xl font-black text-on-surface tracking-tight mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <PerformanceCard 
                title="SaaS Growth VSL" 
                platform="Instagram" 
                spend="4,200" 
                roas="5.8" 
                clicks="12.4k" 
                conversions="420" 
                thresholdHit={true}
              />
              <PerformanceCard 
                title="Bootstrap Manifesto" 
                platform="LinkedIn" 
                spend="2,800" 
                roas="3.2" 
                clicks="8.1k" 
                conversions="180" 
                thresholdHit={false}
              />
              <PerformanceCard 
                title="Growth OS Demo" 
                platform="Instagram" 
                spend="3,450" 
                roas="4.1" 
                clicks="10.2k" 
                conversions="310" 
                thresholdHit={true}
              />
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
            { id: 'strategy', label: 'Ad Strategy', icon: Target },
            { id: 'scripts', label: 'Ad Scripts', icon: FileText },
            { id: 'performance', label: 'Performance', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdsTab)}
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

      {/* Script Preview Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {previewScript && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewScript(null)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-surface-container-low rounded-3xl shadow-2xl border border-outline-variant/10 overflow-hidden"
            >
              <div className="bg-surface-container-highest/50 p-6 flex items-center justify-between border-b border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="font-black text-on-surface tracking-tight">Ad Mockup Preview</h3>
                </div>
                <button onClick={() => setPreviewScript(null)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8">
                <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-inner p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Logo className="w-10 h-10 rounded-full" />
                    <div>
                      <p className="text-sm font-black text-on-surface">TitanLeap Growth OS</p>
                      <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Sponsored</p>
                    </div>
                  </div>
                  
                  <div className="aspect-video bg-surface-container-highest rounded-xl flex items-center justify-center text-on-surface-variant/40">
                    <div className="text-center">
                      <Play size={48} className="mx-auto mb-2 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Video Creative Placeholder</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-on-surface leading-relaxed">{previewScript.body}</p>
                    <div className="flex items-center justify-between pt-4">
                      <div className="flex items-center gap-4 text-on-surface-variant/40">
                        <div className="flex items-center gap-1"><TrendingUp size={14} /><span className="text-[10px] font-bold">1.2k</span></div>
                        <div className="flex items-center gap-1"><Share2 size={14} /><span className="text-[10px] font-bold">42</span></div>
                      </div>
                      <button className="bg-primary text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                        Learn More
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-highest/30 p-6 border-t border-outline-variant/10 flex justify-end">
                <button 
                  onClick={() => setPreviewScript(null)}
                  className="bg-surface-container-highest text-on-surface px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-surface-container transition-all"
                >
                  Close Preview
                </button>
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
