import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, TrendingUp, DollarSign, Target, ArrowUpRight, MoreHorizontal, Rocket, Zap, CheckCircle2, AlertCircle, LayoutGrid, List, Filter, Plus, ChevronRight, Share2, Clock, Upload, Instagram, Twitter, Linkedin, Youtube, Play, FileText, BarChart3, Sparkles, PieChart, RefreshCw, Search } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const MetricPanel = ({ label, value, trend, icon: Icon, color }: any) => (
  <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-center justify-between mb-4">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110", color)}>
        <Icon size={20} />
      </div>
      <div className="text-[10px] font-black text-success bg-success-container/10 px-2 py-1 rounded-md">{trend}</div>
    </div>
    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{label}</p>
    <p className="text-2xl font-black text-on-surface tracking-tight mt-1">{value}</p>
  </div>
);

export const SalesDashboard: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState('30d');

  const leads = [
    { name: 'Jonathan Wick', source: 'Instagram Ad', status: 'Hot', product: 'Growth OS', date: 'Mar 22, 2026' },
    { name: 'Sarah Connor', source: 'LinkedIn Post', status: 'Warm', product: 'Audit VSL', date: 'Mar 21, 2026' },
    { name: 'Bruce Wayne', source: 'YouTube VSL', status: 'Converted', product: 'Growth OS', date: 'Mar 20, 2026' },
    { name: 'Peter Parker', source: 'Twitter/X Thread', status: 'Cold', product: 'Audit VSL', date: 'Mar 19, 2026' },
    { name: 'Tony Stark', source: 'Instagram Ad', status: 'Converted', product: 'Growth OS', date: 'Mar 18, 2026' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricPanel 
          label="Total Leads" 
          value="2,450" 
          trend="+18%" 
          icon={Users} 
          color="bg-primary/10 text-primary" 
        />
        <MetricPanel 
          label="Converts" 
          value="142" 
          trend="+22%" 
          icon={CheckCircle2} 
          color="bg-secondary/10 text-secondary" 
        />
        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Product Breakdown</p>
            <PieChart size={16} className="text-on-surface-variant/40" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-on-surface-variant">Growth OS</span>
              <span className="text-xs font-black text-primary">68%</span>
            </div>
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[68%]" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-on-surface-variant">Audit VSL</span>
              <span className="text-xs font-black text-secondary">32%</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Total Revenue</p>
            <div className="flex bg-surface-container-highest p-0.5 rounded-lg border border-outline-variant/10">
              {['7d', '30d', '1y'].map(f => (
                <button 
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={cn(
                    "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
                    timeFilter === f ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/40 hover:text-on-surface"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <p className="text-2xl font-black text-on-surface tracking-tight">$142,500</p>
          <div className="flex items-center gap-1 text-success mt-1">
            <TrendingUp size={12} />
            <span className="text-[10px] font-black">+14.2% vs prev period</span>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/10 shadow-sm">
        <div className="px-8 py-6 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container-highest/20">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-black tracking-tight text-on-surface">Recent Leads</h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-success-container/10 rounded-full border border-success/10">
              <RefreshCw size={12} className="text-success animate-spin-slow" />
              <span className="text-[9px] font-black uppercase tracking-widest text-success">Auto-Synced via Bot</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={14} />
              <input 
                type="text" 
                placeholder="Search leads..."
                className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl pl-9 pr-4 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
              />
            </div>
            <button className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-highest/30">
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Name</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Source</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Status</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Product</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Date</th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {leads.map((lead, idx) => (
              <tr key={idx} className="hover:bg-surface-container-lowest transition-colors group">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-[10px] font-black text-on-surface-variant">
                      {lead.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{lead.name}</span>
                  </div>
                </td>
                <td className="px-8 py-4 text-xs font-medium text-on-surface-variant">{lead.source}</td>
                <td className="px-8 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest",
                    lead.status === 'Converted' ? "bg-success-container text-on-success-container" :
                    lead.status === 'Hot' ? "bg-error-container text-on-error-container" :
                    lead.status === 'Warm' ? "bg-warning-container text-on-warning-container" :
                    "bg-surface-container-highest text-on-surface-variant"
                  )}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-8 py-4">
                  <span className="px-2 py-1 bg-surface-container-highest rounded-md text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                    {lead.product}
                  </span>
                </td>
                <td className="px-8 py-4 text-xs font-medium text-on-surface-variant">{lead.date}</td>
                <td className="px-8 py-4 text-right">
                  <button className="text-on-surface-variant/40 hover:text-on-surface transition-colors">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="px-8 py-4 bg-surface-container-highest/10 flex items-center justify-between">
          <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Showing 5 of 2,450 leads</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Prev</button>
            <button className="px-3 py-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};
