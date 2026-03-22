import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Target, Layout, Heart, CheckCircle2, AlertCircle, ArrowRight, TrendingUp, Zap, Sparkles, Loader2, Search } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { auditLandingPage } from '@/src/services/ai';

const AuditSection = ({ title, icon: Icon, score, children }: any) => (
  <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 shadow-sm space-y-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
          <Icon size={24} />
        </div>
        <h3 className="text-xl font-black tracking-tight text-on-surface">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Health Score</p>
          <p className={cn("text-lg font-black", score > 80 ? "text-success" : score > 50 ? "text-warning" : "text-error")}>{score}%</p>
        </div>
        <div className="w-12 h-12 rounded-full border-4 border-surface-container-highest flex items-center justify-center relative">
          <svg className="w-full h-full -rotate-90">
            <circle 
              cx="24" cy="24" r="20" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="4" 
              className="text-surface-container-highest"
            />
            <circle 
              cx="24" cy="24" r="20" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="4" 
              strokeDasharray={125.6}
              strokeDashoffset={125.6 * (1 - score / 100)}
              className={cn(score > 80 ? "text-success" : score > 50 ? "text-warning" : "text-error")}
            />
          </svg>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {children}
    </div>
  </div>
);

export const AuditView: React.FC = () => {
  const [url, setUrl] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);

  const handleAudit = async () => {
    if (!url) return;
    setIsAuditing(true);
    try {
      const result = await auditLandingPage(url);
      setAuditResult(result);
    } catch (error) {
      console.error("Audit failed:", error);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* AI Audit Trigger */}
      <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 shadow-sm monolith-gradient-subtle">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full space-y-2">
            <h3 className="text-xl font-black tracking-tight text-on-surface flex items-center gap-2">
              <Sparkles size={20} className="text-primary" />
              AI Growth Audit
            </h3>
            <p className="text-sm text-on-surface-variant font-medium">Paste your landing page URL for an instant conversion audit.</p>
            <div className="relative group mt-4">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-saas.com/landing"
                className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
          <button 
            onClick={handleAudit}
            disabled={isAuditing || !url}
            className={cn(
              "monolith-gradient text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/30 flex items-center gap-3 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100",
              isAuditing && "animate-pulse"
            )}
          >
            {isAuditing ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} fill="white" />}
            {isAuditing ? "Analyzing Funnel..." : "Run AI Audit"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {auditResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-10"
          >
            <div className="grid grid-cols-1 gap-8">
              <AuditSection title="Landing Page Performance" icon={Layout} score={auditResult.score || 65}>
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant/60">AI Improvements</h4>
                  <ul className="space-y-3">
                    {auditResult.improvements?.map((imp: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-on-surface font-medium p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                        <div className="mt-1 text-primary"><CheckCircle2 size={14} /></div>
                        {imp}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-surface-container-highest/30 p-6 rounded-2xl border border-outline-variant/10 flex flex-col justify-center items-center text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2">Estimated Revenue Lift</p>
                  <p className="text-4xl font-black text-primary tracking-tighter">{auditResult.revenueGain || "+$0"}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant mt-2">Per Month</p>
                </div>
              </AuditSection>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-8">
        <AuditSection title="Offer & Positioning" icon={ShieldCheck} score={82}>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Core Promise</label>
            <input type="text" defaultValue="Scale your SaaS to $1M ARR in 12 months" className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-medium" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Risk Reversal</label>
            <input type="text" defaultValue="100% Money Back Guarantee" className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-medium" />
          </div>
        </AuditSection>

        <AuditSection title="Social Proof & Bios" icon={Target} score={45}>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Founder Bio</label>
            <textarea rows={2} defaultValue="Ex-Google Engineer building the future of growth." className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-medium resize-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Testimonials</label>
            <div className="flex items-center gap-2 p-3 bg-error/5 border border-error/10 rounded-xl">
              <AlertCircle size={16} className="text-error" />
              <p className="text-xs font-bold text-error">Missing high-authority logos</p>
            </div>
          </div>
        </AuditSection>
      </div>

      {/* Revenue Opportunity Card */}
      <div className="bg-on-surface rounded-3xl p-10 text-surface shadow-2xl shadow-black/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/30 transition-all duration-700" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10">
              <TrendingUp size={14} className="text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Revenue Opportunity</span>
            </div>
            <h3 className="text-3xl font-black tracking-tighter leading-tight">
              Fix Landing Page Conversion <br />
              <span className="text-primary">→ Gain $12,400/mo</span>
            </h3>
            <p className="text-sm text-surface/60 font-medium max-w-md">Based on your current traffic of 12.5k monthly visitors and a 1.2% conversion rate.</p>
          </div>
          <button className="bg-white text-on-surface px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 hover:scale-105 transition-all active:scale-95 whitespace-nowrap">
            Implement Fixes
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
