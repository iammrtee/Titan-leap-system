import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeSocialTrends } from '@/src/services/ai';
import { Cpu, Plus, Play, Pause, Clock, Zap, CheckCircle2, AlertCircle, MoreHorizontal, Settings, Trash2, Power, RefreshCw, TrendingUp, Loader2, Sparkles, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const AutomationCard = ({ name, description, status: initialStatus, lastRun, icon: Icon, color, onAction }: any) => {
  const [status, setStatus] = useState(initialStatus);
  const [isTesting, setIsTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleTest = () => {
    if (onAction) {
      onAction();
      return;
    }
    setError(null);
    setIsTesting(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          
          // Simulate a random failure (30% chance, but decreases with retries)
          const failureRate = Math.max(0.05, 0.3 - (retryCount * 0.1));
          const failed = Math.random() < failureRate;
          
          setTimeout(() => {
            setIsTesting(false);
            if (failed) {
              const errors = [
                'Connection timeout: Failed to reach the automation endpoint. Please check your API configuration.',
                'Invalid Data: The automation received malformed input from the source trigger.',
                'Rate Limit Exceeded: Too many requests sent to the third-party service in a short period.',
                'Authentication Error: The API key for this service has expired or is invalid.'
              ];
              setError(errors[Math.floor(Math.random() * errors.length)]);
              setRetryCount(prev => prev + 1);
            } else {
              setRetryCount(0);
              setStatus('Active');
            }
          }, 500);
          
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

      {error && (
        <div className="absolute inset-0 bg-error/5 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-12 h-12 rounded-full bg-error/20 text-error flex items-center justify-center mb-4">
            <AlertCircle size={24} />
          </div>
          <p className="text-sm font-black text-on-surface mb-2">Automation Failed</p>
          <p className="text-[11px] font-medium text-on-surface-variant leading-relaxed mb-6 max-w-[220px]">
            {error}
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => setError(null)}
              className="px-4 py-2 bg-surface-container-highest text-on-surface-variant rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-on-surface transition-all"
            >
              Dismiss
            </button>
            <button 
              onClick={handleTest}
              className="px-6 py-2 bg-error text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-error/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trends, setTrends] = useState<any[]>([]);
  const [showTrendsModal, setShowTrendsModal] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleFetchTrends = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setShowTrendsModal(true);
    try {
      const data = await analyzeSocialTrends('Instagram & LinkedIn');
      setTrends(data);
    } catch (error) {
      console.error("Failed to fetch trends:", error);
      setAnalysisError("The AI engine encountered an unexpected error while scanning social signals. This usually happens due to API rate limits or network instability.");
    } finally {
      setIsAnalyzing(false);
    }
  };

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
    },
    {
      name: 'Social Trend Monitor',
      description: 'Monitors social media trends and competitor activity to suggest high-relevance content topics and keywords.',
      status: 'Active',
      lastRun: 'Just now',
      icon: RefreshCw,
      color: 'bg-primary/10 text-primary',
      onAction: handleFetchTrends
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

      {/* Trends Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showTrendsModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl border border-outline-variant/10"
            >
              <div className="p-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-on-surface tracking-tight">AI Trend Analysis</h3>
                      <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Powered by Gemini Pro</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowTrendsModal(false)}
                    className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {isAnalyzing ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-6 text-center">
                    <Loader2 className="text-primary animate-spin" size={48} />
                    <div className="space-y-2">
                      <p className="text-lg font-black text-on-surface">Analyzing Global Signals...</p>
                      <p className="text-xs font-medium text-on-surface-variant/60 max-w-xs">Gemini is scanning social media APIs and competitor activity for high-velocity trends.</p>
                    </div>
                  </div>
                ) : analysisError ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-error/10 text-error flex items-center justify-center">
                      <AlertCircle size={32} />
                    </div>
                    <div className="space-y-2 px-10">
                      <p className="text-lg font-black text-on-surface">Analysis Failed</p>
                      <p className="text-xs font-medium text-on-surface-variant/60">{analysisError}</p>
                    </div>
                    <button 
                      onClick={handleFetchTrends}
                      className="px-8 py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <RefreshCw size={14} />
                      Retry Analysis
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {trends.map((trend, i) => (
                      <div key={i} className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-4 group hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-primary/20">0{i+1}</span>
                            <h4 className="text-lg font-black text-on-surface group-hover:text-primary transition-colors">{trend.topic}</h4>
                          </div>
                          <div className="px-3 py-1 bg-success-container/10 text-success rounded-full text-[9px] font-black uppercase tracking-widest">High Velocity</div>
                        </div>
                        <p className="text-sm font-medium text-on-surface-variant/70 leading-relaxed">
                          <span className="text-primary font-black uppercase text-[10px] tracking-widest block mb-1">Strategy</span>
                          {trend.strategy}
                        </p>
                      </div>
                    ))}
                    <button 
                      onClick={() => setShowTrendsModal(false)}
                      className="w-full py-5 bg-on-surface text-surface rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      <Sparkles size={18} />
                      Sync to Content Calendar
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}

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
