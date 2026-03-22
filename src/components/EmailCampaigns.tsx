import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Target, FileText, Layout, Plus, MoreHorizontal, Download, Upload, Trash2, Flag, CheckCircle2, AlertCircle, TrendingUp, Zap, Sparkles, Search, Filter, ChevronRight, Share2, Clock, Instagram, Twitter, Linkedin, Youtube, Play, BarChart3, PieChart, RefreshCw, Users, X, Eye, Send } from 'lucide-react';
import { cn } from '@/src/lib/utils';

type EmailTab = 'strategy' | 'scripts' | 'design';

const EmailScriptCard = ({ campaign, subject, body, status, color, onPreview }: any) => (
  <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-center justify-between mb-4">
      <div className={cn("px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest", color)}>
        {campaign}
      </div>
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === 'Active' ? "bg-success" : status === 'Draft' ? "bg-warning" : "bg-primary"
        )} />
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{status}</span>
      </div>
    </div>
    <div className="space-y-3 mb-6">
      <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Subject Line</p>
        <p className="text-sm font-black text-on-surface group-hover:text-primary transition-colors">{subject}</p>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Body Preview</p>
        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{body}</p>
      </div>
    </div>
    <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
      <div className="flex gap-4">
        <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline transition-all">Edit Copy</button>
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

const EmailDesignCard = ({ campaign, previewUrl, status, onPreview }: any) => (
  <div className="bg-surface-container-low rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
    <div className="aspect-[4/5] bg-surface-container-highest relative overflow-hidden">
      <img 
        src={previewUrl} 
        alt={campaign} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
        <div className="flex gap-2 w-full">
          <button 
            onClick={onPreview}
            className="flex-1 bg-white text-primary py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
          >
            Preview
          </button>
          <button className="p-2 bg-white/20 backdrop-blur-md text-white rounded-lg hover:bg-white/30 transition-all">
            <Share2 size={16} />
          </button>
        </div>
      </div>
    </div>
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-black text-sm text-on-surface tracking-tight">{campaign}</h4>
        <div className="flex items-center gap-2">
          <button className="text-on-surface-variant/40 hover:text-error transition-colors"><Trash2 size={16} /></button>
          <button className="text-on-surface-variant/40 hover:text-warning transition-colors"><Flag size={16} /></button>
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold">Design Asset</p>
    </div>
  </div>
);

export const EmailCampaigns: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EmailTab>('strategy');
  const [previewEmail, setPreviewEmail] = useState<any>(null);

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
                    <h3 className="font-black text-on-surface tracking-tight">Email Strategy Notes</h3>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold">Campaign Lifecycle</p>
                  </div>
                </div>
                <button className="text-xs font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-2">
                  <Download size={14} />
                  Export Strategy
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">
                    Lifecycle & Automation Strategy
                  </label>
                  <textarea 
                    rows={10}
                    placeholder="Describe your email sequence, triggers, and segmentation strategy..."
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none text-on-surface"
                    defaultValue="Implementing a 7-day 'Indoctrination Sequence' for new leads. Day 1: The Origin Story + Value. Day 3: Case Study. Day 5: The Contrarian Take. Day 7: Hard CTA for Growth Audit. Segmenting based on lead source (Ads vs Organic)."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Avg Open Rate', value: '42.8%', trend: '+4.2%', icon: Mail },
                    { label: 'Avg CTR', value: '8.4%', trend: '+1.1%', icon: TrendingUp },
                    { label: 'Total Subs', value: '12,450', trend: '+840', icon: Users },
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
                  <button className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface">Sequence</button>
                  <button className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 hover:text-on-surface">Broadcast</button>
                </div>
              </div>
              <button className="monolith-gradient text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-all active:scale-95">
                <Plus size={18} />
                New Script
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <EmailScriptCard 
                campaign="Indoctrination" 
                subject="Why your SaaS growth is stalled (and how to fix it)" 
                status="Active" 
                color="bg-primary/10 text-primary"
                body="Hey [First Name], most founders think they need more traffic. But the reality is they have a conversion leak. In this email, I'm breaking down the 3-step framework we use to..."
                onPreview={() => setPreviewEmail({ subject: "Why your SaaS growth is stalled (and how to fix it)", body: "Hey [First Name], most founders think they need more traffic. But the reality is they have a conversion leak. In this email, I'm breaking down the 3-step framework we use to scale SaaS companies from $10k to $100k/mo without increasing ad spend." })}
              />
              <EmailScriptCard 
                campaign="Case Study" 
                subject="How Alex scaled to $100k/mo in 90 days" 
                status="Active" 
                color="bg-secondary/10 text-secondary"
                body="We just published a new case study showing exactly how Alex used the TitanLeap Growth OS to double his revenue velocity without increasing his ad spend..."
                onPreview={() => setPreviewEmail({ subject: "How Alex scaled to $100k/mo in 90 days", body: "We just published a new case study showing exactly how Alex used the TitanLeap Growth OS to double his revenue velocity without increasing his ad spend. Check out the full breakdown below." })}
              />
              <EmailScriptCard 
                campaign="Re-engagement" 
                subject="Still interested in scaling?" 
                status="Draft" 
                color="bg-warning/10 text-warning"
                body="It's been a while since we last spoke. I wanted to share a new resource we just released that might help you with your current growth challenges..."
                onPreview={() => setPreviewEmail({ subject: "Still interested in scaling?", body: "It's been a while since we last spoke. I wanted to share a new resource we just released that might help you with your current growth challenges. Are you still looking to scale your SaaS this quarter?" })}
              />
              <EmailScriptCard 
                campaign="Broadcast" 
                subject="[Live] Growth Workshop starting in 10 mins" 
                status="Active" 
                color="bg-error/10 text-error"
                body="We're going live in 10 minutes to break down the exact funnel we're using to drive $10k/day in revenue. Don't miss this one..."
                onPreview={() => setPreviewEmail({ subject: "[Live] Growth Workshop starting in 10 mins", body: "We're going live in 10 minutes to break down the exact funnel we're using to drive $10k/day in revenue. Don't miss this one. Click the link below to join the Zoom room." })}
              />
            </div>
          </div>
        );
      case 'design':
        return (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black tracking-tight text-on-surface">Email Design Assets</h3>
              <button className="bg-surface-container-low text-on-surface-variant px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-outline-variant/20 flex items-center gap-2 hover:bg-surface-container transition-all">
                <Upload size={14} />
                Upload Design
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <EmailDesignCard 
                campaign="Welcome Series" 
                previewUrl="https://picsum.photos/seed/email1/800/1000" 
                status="Active"
                onPreview={() => setPreviewEmail({ subject: "Welcome to TitanLeap", body: "Welcome to the family! We're excited to help you scale your SaaS.", isDesign: true, url: "https://picsum.photos/seed/email1/800/1000" })}
              />
              <EmailDesignCard 
                campaign="Growth Audit VSL" 
                previewUrl="https://picsum.photos/seed/email2/800/1000" 
                status="Active"
                onPreview={() => setPreviewEmail({ subject: "Your Growth Audit is Ready", body: "Click below to watch your personalized growth audit video.", isDesign: true, url: "https://picsum.photos/seed/email2/800/1000" })}
              />
              <EmailDesignCard 
                campaign="Monthly Newsletter" 
                previewUrl="https://picsum.photos/seed/email3/800/1000" 
                status="Draft"
                onPreview={() => setPreviewEmail({ subject: "TitanLeap Monthly Update", body: "Here's what happened in the world of SaaS growth this month.", isDesign: true, url: "https://picsum.photos/seed/email3/800/1000" })}
              />
              <EmailDesignCard 
                campaign="Black Friday Promo" 
                previewUrl="https://picsum.photos/seed/email4/800/1000" 
                status="Archived"
                onPreview={() => setPreviewEmail({ subject: "Black Friday: 50% Off Growth OS", body: "The biggest deal of the year is here. Scale your SaaS for half the price.", isDesign: true, url: "https://picsum.photos/seed/email4/800/1000" })}
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
            { id: 'strategy', label: 'Strategy', icon: Target },
            { id: 'scripts', label: 'Scripts', icon: FileText },
            { id: 'design', label: 'Design', icon: Layout },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as EmailTab)}
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

      {/* Email Preview Modal */}
      <AnimatePresence>
        {previewEmail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewEmail(null)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-surface-container-low rounded-3xl shadow-2xl border border-outline-variant/10 overflow-hidden"
            >
              <div className="bg-surface-container-highest/50 p-6 flex items-center justify-between border-b border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Mail size={16} />
                  </div>
                  <h3 className="font-black text-on-surface tracking-tight">Email Client Preview</h3>
                </div>
                <button onClick={() => setPreviewEmail(null)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 bg-surface-container-lowest">
                <div className="bg-white rounded-2xl border border-outline-variant/20 shadow-xl overflow-hidden">
                  {/* Email Header */}
                  <div className="p-6 border-b border-outline-variant/10 bg-surface-container-low/30">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 w-12">From:</span>
                        <span className="text-xs font-bold text-on-surface">TitanLeap Growth OS &lt;growth@titanleap.io&gt;</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 w-12">Subject:</span>
                        <span className="text-xs font-black text-primary">{previewEmail.subject}</span>
                      </div>
                    </div>
                  </div>

                  {/* Email Content */}
                  <div className="p-10 space-y-8">
                    {previewEmail.isDesign ? (
                      <div className="space-y-6">
                        <img src={previewEmail.url} alt="Email Design" className="w-full rounded-xl shadow-lg" referrerPolicy="no-referrer" />
                        <p className="text-sm text-on-surface-variant leading-relaxed text-center italic">
                          {previewEmail.body}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8">
                          <Zap size={32} />
                        </div>
                        <p className="text-base text-on-surface leading-relaxed whitespace-pre-wrap">
                          {previewEmail.body}
                        </p>
                        <div className="pt-8">
                          <button className="monolith-gradient text-white px-8 py-4 rounded-xl font-black text-sm shadow-xl shadow-primary/20">
                            Scale Your SaaS Now
                          </button>
                        </div>
                        <div className="pt-12 border-t border-outline-variant/10">
                          <p className="text-xs font-bold text-on-surface">Best regards,</p>
                          <p className="text-xs font-black text-primary mt-1">The TitanLeap Growth Team</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-highest/30 p-6 border-t border-outline-variant/10 flex justify-between items-center">
                <button className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-primary transition-all flex items-center gap-2">
                  <Send size={14} />
                  Send Test Email
                </button>
                <button 
                  onClick={() => setPreviewEmail(null)}
                  className="bg-surface-container-highest text-on-surface px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-surface-container transition-all"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
