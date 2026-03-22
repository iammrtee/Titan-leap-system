import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Plus, Play, Pause, Clock, Zap, CheckCircle2, AlertCircle, MoreHorizontal, Settings, Trash2, Power, RefreshCw, TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const AutomationCard = ({ name, description, status: initialStatus, lastRun, icon: Icon, color }: any) => {
  const [status, setStatus] = useState(initialStatus);
  const [isTesting, setIsTesting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleTest = () => {
    setIsTesting(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsTesting(false), 500);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  return (
    <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
      {isTesting && (
        <div className="absolute inset-0 bg-surface-container-low/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="text-primary animate-spin mb-4" size={32} />
          <p className="text-sm font-black text-on-surface mb-2">Running Test Sequence...</p>
          <div className="w-full max-w-[200px] h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-primary"
            />
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant/60 mt-2 uppercase tracking-widest">{progress}% Complete</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-lg shadow-black/5", color)}>
          <Icon size={24} />
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
            status === 'Active' ? "bg-success-container text-on-success-container" : "bg-surface-container-highest text-on-surface-variant"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", status === 'Active' ? "bg-success animate-pulse" : "bg-on-surface-variant/40")} />
            {status}
          </div>
          <button className="text-on-surface-variant/40 hover:text-on-surface transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      <h4 className="font-black text-lg text-on-surface tracking-tight mb-2 group-hover:text-primary transition-colors">{name}</h4>
      <p className="text-sm text-on-surface-variant leading-relaxed mb-6 line-clamp-2">{description}</p>

      <div className="flex items-center justify-between pt-6 border-t border-outline-variant/10">
        <div className="flex items-center gap-2 text-on-surface-variant/60">
          <Clock size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Last run: {lastRun}</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleTest}
            className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary"
            title="Test Automation"
          >
            <RefreshCw size={16} />
          </button>
          <button 
            onClick={() => setStatus(status === 'Active' ? 'Paused' : 'Active')}
            className={cn(
              "p-2 rounded-lg transition-all",
              status === 'Active' ? "bg-error/10 text-error hover:bg-error/20" : "bg-success/10 text-success hover:bg-success/20"
            )}
          >
            {status === 'Active' ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AIAutomation: React.FC = () => {
  const automations = [
    {
      name: 'Competitor Hook Scraper',
      description: 'Automatically scrapes top-performing hooks from 50+ competitor accounts every 24 hours.',
      status: 'Active',
      lastRun: '2 hours ago',
      icon: Zap,
      color: 'bg-primary/10 text-primary'
    },
    {
      name: 'Lead Enrichment Bot',
      description: 'Enriches new leads with LinkedIn profile data and company revenue estimates.',
      status: 'Active',
      lastRun: '15 mins ago',
      icon: Cpu,
      color: 'bg-secondary/10 text-secondary'
    },
    {
      name: 'Content Repurposer',
      description: 'Converts YouTube VSL scripts into 10+ TikTok/Reels hooks and LinkedIn posts.',
      status: 'Paused',
      lastRun: 'Yesterday',
      icon: RefreshCw,
      color: 'bg-tertiary/10 text-tertiary'
    },
    {
      name: 'Ad Performance Scaler',
      description: 'Automatically increases budget by 20% for ads hitting ROAS > 4.5x.',
      status: 'Active',
      lastRun: '1 hour ago',
      icon: TrendingUp,
      color: 'bg-success-container/10 text-success'
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-on-surface">Automation Hub</h2>
          <p className="text-sm font-medium text-on-surface-variant">Manage your internal growth engines</p>
        </div>
        <button className="monolith-gradient text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-all active:scale-95">
          <Plus size={18} />
          New Automation
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {automations.map((automation, idx) => (
          <AutomationCard key={idx} {...automation} />
        ))}
        
        {/* Empty State / Create New */}
        <button className="bg-surface-container-low rounded-2xl p-6 border-2 border-dashed border-outline-variant/20 flex flex-col items-center justify-center gap-4 group hover:border-primary/40 hover:bg-primary/5 transition-all min-h-[280px]">
          <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all">
            <Plus size={24} />
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-on-surface">Add Custom Logic</p>
            <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-1">Connect your own API endpoints</p>
          </div>
        </button>
      </div>

      {/* System Health */}
      <div className="bg-surface-container-low rounded-3xl p-8 border border-outline-variant/10 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-success-container/10 text-success flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 className="font-black text-on-surface tracking-tight">System Integrity</h3>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold">Real-time Status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { label: 'API Uptime', value: '99.98%', status: 'Healthy' },
            { label: 'Queue Depth', value: '12 Tasks', status: 'Optimal' },
            { label: 'Avg Latency', value: '142ms', status: 'Healthy' },
            { label: 'Error Rate', value: '0.02%', status: 'Healthy' },
          ].map((stat, i) => (
            <div key={i} className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">{stat.label}</p>
              <div className="flex items-end gap-2">
                <p className="text-xl font-black text-on-surface">{stat.value}</p>
                <span className="text-[8px] font-black text-success uppercase tracking-widest mb-1">{stat.status}</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                <div className="bg-success h-full w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
