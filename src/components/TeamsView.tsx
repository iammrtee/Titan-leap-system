import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, TrendingUp, DollarSign, Target, ArrowUpRight, CheckCircle2, Calendar, LayoutGrid, FileText, BarChart3, Clock, Zap, Sparkles, Search, Filter, ChevronRight, Share2, MoreHorizontal, Instagram, Linkedin, Twitter, Youtube, Play, RefreshCw, Mail, Cpu, LayoutDashboard, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { getPerformanceInsight } from '@/src/services/ai';

const ClientMetric = ({ label, value, trend, icon: Icon, color }: any) => (
  <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-center justify-between mb-6">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-lg shadow-black/5", color)}>
        <Icon size={28} />
      </div>
      <div className="text-xs font-black text-success bg-success-container/10 px-3 py-1.5 rounded-full border border-success/10">{trend}</div>
    </div>
    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">{label}</p>
    <p className="text-4xl font-black text-on-surface tracking-tighter mt-2">{value}</p>
  </div>
);

export const TeamsView: React.FC = () => {
  const [insight, setInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  const metrics = {
    revenue: '$142,500',
    leads: '2,450',
    conversion: '5.8%',
    growth: '+24.5%'
  };

  const fetchInsight = async () => {
    setIsLoadingInsight(true);
    try {
      const text = await getPerformanceInsight(metrics);
      setInsight(text);
    } catch (error) {
      console.error("Failed to fetch insight:", error);
    } finally {
      setIsLoadingInsight(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, []);

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* Client Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/10">
            <Sparkles size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Client Portal</span>
          </div>
          <h2 className="text-4xl font-black tracking-tighter text-on-surface">Growth Summary</h2>
          <p className="text-sm font-medium text-on-surface-variant">Real-time performance overview for <span className="text-primary font-bold">Acme Corp</span></p>
        </div>
        <div className="flex items-center gap-4">
          <button className="bg-surface-container-low text-on-surface-variant px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-outline-variant/20 flex items-center gap-2 hover:bg-surface-container transition-all">
            <Share2 size={16} />
            Share Report
          </button>
          <button className="monolith-gradient text-white px-8 py-3 rounded-xl font-black text-sm shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-all active:scale-95">
            <Clock size={18} />
            Schedule Audit
          </button>
        </div>
      </div>

      {/* AI Insight Banner */}
      <div className="bg-secondary/5 border border-secondary/10 rounded-[32px] p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <Sparkles size={120} className="text-secondary" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
          <div className="w-16 h-16 rounded-2xl bg-secondary text-white flex items-center justify-center shadow-xl shadow-secondary/20 shrink-0">
            <Zap size={32} fill="white" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-widest text-secondary">Gemini Performance Insight</h3>
              <div className="px-2 py-0.5 bg-secondary/10 text-secondary rounded text-[8px] font-black uppercase tracking-widest">Live Analysis</div>
            </div>
            {isLoadingInsight ? (
              <div className="flex items-center gap-3 py-2">
                <Loader2 size={18} className="text-secondary animate-spin" />
                <p className="text-sm font-medium text-on-surface-variant animate-pulse">Gemini is analyzing your growth velocity...</p>
              </div>
            ) : (
              <p className="text-lg font-bold text-on-surface leading-tight max-w-3xl">
                {insight || "No insights available at this time."}
              </p>
            )}
          </div>
          <button 
            onClick={fetchInsight}
            disabled={isLoadingInsight}
            className="px-6 py-3 bg-white border border-secondary/20 rounded-xl text-secondary font-black text-[10px] uppercase tracking-widest hover:bg-secondary hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            Refresh Analysis
          </button>
        </div>
      </div>

      {/* High-Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ClientMetric 
          label="Total Revenue" 
          value="$142,500" 
          trend="+14.2%" 
          icon={DollarSign} 
          color="bg-primary/10 text-primary" 
        />
        <ClientMetric 
          label="Leads Generated" 
          value="2,450" 
          trend="+18%" 
          icon={Users} 
          color="bg-secondary/10 text-secondary" 
        />
        <ClientMetric 
          label="Conversion Rate" 
          value="5.8%" 
          trend="+1.2%" 
          icon={Target} 
          color="bg-tertiary/10 text-tertiary" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Active Campaigns */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight text-on-surface">Active Campaigns</h3>
            <button className="text-xs font-black uppercase tracking-widest text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {[
              { name: 'SaaS Growth VSL', platform: 'Instagram', status: 'Scaling', spend: '$4,200', roas: '5.8x' },
              { name: 'Bootstrap Manifesto', platform: 'LinkedIn', status: 'Active', spend: '$2,800', roas: '3.2x' },
              { name: 'Growth OS Demo', platform: 'Instagram', status: 'Scaling', spend: '$3,450', roas: '4.1x' },
            ].map((campaign, i) => (
              <div key={i} className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    {campaign.platform === 'Instagram' ? <Instagram size={20} /> : <Linkedin size={20} />}
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-on-surface tracking-tight">{campaign.name}</h4>
                    <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold mt-1">{campaign.platform} Ads</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">ROAS</p>
                    <p className="text-sm font-black text-secondary">{campaign.roas}</p>
                  </div>
                  <div className="px-3 py-1 bg-success-container/10 text-success rounded-lg text-[10px] font-black uppercase tracking-widest border border-success/10">
                    {campaign.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Calendar Preview */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight text-on-surface">Upcoming Content</h3>
            <button className="text-xs font-black uppercase tracking-widest text-primary hover:underline">Full Calendar</button>
          </div>
          <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 shadow-sm space-y-6">
            {[
              { day: 'Today', title: 'The Hidden Growth Hack for SaaS Founders', platform: 'TikTok', time: '18:00' },
              { day: 'Tomorrow', title: 'Why we raised $0 and scaled to $1M ARR', platform: 'LinkedIn', time: '09:00' },
              { day: 'Mar 24', title: 'Day in the life of a Growth Engineer', platform: 'Instagram', time: '20:00' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-6 relative group">
                {i !== 2 && <div className="absolute left-6 top-12 w-0.5 h-10 bg-outline-variant/20" />}
                <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex flex-col items-center justify-center text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <span className="text-[8px] font-black uppercase tracking-widest mb-0.5">{item.day}</span>
                  <Clock size={14} />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">{item.platform}</span>
                    <span className="text-[10px] font-bold text-on-surface-variant">{item.time}</span>
                  </div>
                  <h4 className="font-bold text-sm text-on-surface leading-tight">{item.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dedicated Team Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tight text-on-surface">Dedicated TitanLeap Team</h3>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/10">
            <CheckCircle2 size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">All Roles Active</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { role: 'Content Strategist', name: 'Elena Vance', icon: FileText, color: 'bg-primary/10 text-primary', focus: 'Q2 Content Pillars' },
            { role: 'Ad Specialist', name: 'Marcus Thorne', icon: Target, color: 'bg-secondary/10 text-secondary', focus: 'Retargeting Optimization' },
            { role: 'Creative Designer', name: 'Sarah Jenkins', icon: LayoutGrid, color: 'bg-tertiary/10 text-tertiary', focus: 'New VSL Assets' },
            { role: 'Video Editor', name: 'David Chen', icon: Play, color: 'bg-error/10 text-error', focus: 'Short-form Batching' },
            { role: 'Automation Specialist', name: 'Isaac Clarke', icon: Cpu, color: 'bg-primary/10 text-primary', focus: 'CRM Lead Sync' },
            { role: 'Account Manager', name: 'Gordon Freeman', icon: Users, color: 'bg-secondary/10 text-secondary', focus: 'Monthly Strategy Review' },
            { role: 'Social Manager', name: 'Alyx Vance', icon: Share2, color: 'bg-tertiary/10 text-tertiary', focus: 'Community Engagement' },
            { role: 'Email Specialist', name: 'Barney Calhoun', icon: Mail, color: 'bg-error/10 text-error', focus: 'Welcome Sequence V2' },
          ].map((member, i) => (
            <div key={i} className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant/40 hover:text-primary transition-colors">
                  <Mail size={14} />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-110", member.color)}>
                  <member.icon size={24} />
                </div>
                <div>
                  <h4 className="font-black text-sm text-on-surface tracking-tight">{member.name}</h4>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold mt-1">{member.role}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-outline-variant/5">
                <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-1">Focus this week</p>
                <p className="text-xs font-bold text-on-surface line-clamp-1">{member.focus}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Availability Table */}
      <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 shadow-sm overflow-hidden relative">
        <div className="absolute top-8 right-8">
          <button className="monolith-gradient text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95">
            Upgrade Tier
          </button>
        </div>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-1.5 h-8 bg-primary rounded-full" />
          <h3 className="text-xl font-black tracking-tight text-on-surface">Service Tier Comparison</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/10">
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Role</th>
                <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Core</th>
                <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Growth</th>
                <th className="py-4 px-4 text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Scale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {[
                { role: 'Content strategist', tiers: [true, true, true] },
                { role: 'Ad specialist', tiers: [true, true, true] },
                { role: 'Creative designer', tiers: [true, true, true] },
                { role: 'Video editor', tiers: [false, true, true] },
                { role: 'Automation specialist', tiers: [false, true, true] },
                { role: 'Account manager', tiers: [false, false, true] },
                { role: 'Social manager', tiers: [false, false, true] },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-surface-container-highest/20 transition-colors">
                  <td className="py-4 px-4 text-sm font-bold text-on-surface">{row.role}</td>
                  {row.tiers.map((active, j) => (
                    <td key={j} className="py-4 px-4 text-center">
                      {active ? (
                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary">
                          <CheckCircle2 size={14} />
                        </div>
                      ) : (
                        <span className="text-on-surface-variant/20">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue Velocity Chart Placeholder */}
      <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="font-black text-on-surface tracking-tight">Revenue Velocity</h3>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold">Last 30 Days</p>
          </div>
          <div className="flex items-center gap-2 text-success">
            <TrendingUp size={16} />
            <span className="text-sm font-black">+24.5% Growth</span>
          </div>
        </div>
        
        <div className="h-48 flex items-end gap-2 px-4">
          {Array.from({ length: 30 }).map((_, i) => {
            const height = 20 + Math.random() * 80;
            return (
              <div 
                key={i} 
                className="flex-1 bg-primary/10 rounded-t-sm group relative"
                style={{ height: `${height}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-on-surface text-surface text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  ${(height * 100).toFixed(0)}
                </div>
                {i % 5 === 0 && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-on-surface-variant/40">
                    {i + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
