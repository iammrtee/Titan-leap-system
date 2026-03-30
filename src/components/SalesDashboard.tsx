import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Users, TrendingUp, DollarSign, Target, ArrowUpRight, MoreHorizontal, Rocket, Zap, CheckCircle2, AlertCircle, LayoutGrid, List, Filter, Plus, ChevronRight, Share2, Clock, Upload, Instagram, Twitter, Linkedin, Youtube, Play, FileText, BarChart3, Sparkles, PieChart, RefreshCw, Search, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/services/supabase';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  product: string;
  score: number;
  score_reason: string;
  synced_at: string;
  created_at: string;
}

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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalConverted, setTotalConverted] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    // Fetch initial data
    const fetchLeads = async () => {
      const { data, error, count } = await supabase
        .from('leads')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
      } else {
        setLeads(data || []);
        setTotalLeads(count || 0);
        setTotalConverted((data || []).filter(lead => lead.status.toUpperCase() === 'CONVERTED').length);
      }
    };

    fetchLeads();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'HOT') return "bg-red-500/10 text-red-500 border border-red-500/20";
    if (s === 'WARM') return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
    if (s === 'COLD') return "bg-gray-500/10 text-gray-500 border border-gray-500/20";
    if (s === 'CONVERTED') return "bg-success-container text-on-success-container border border-success/20";
    return "bg-surface-container-highest text-on-surface-variant";
  };

  return (
    <div className="space-y-8">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricPanel 
          label="Total Leads" 
          value={totalLeads.toLocaleString()} 
          trend="+18%" 
          icon={Users} 
          color="bg-primary/10 text-primary" 
        />
        <MetricPanel 
          label="Converts" 
          value={totalConverted.toLocaleString()} 
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
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-surface-container-lowest transition-colors group">
                <td className="px-8 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-[10px] font-black text-on-surface-variant">
                      {lead.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{lead.name}</span>
                      <span className="text-[10px] font-medium text-on-surface-variant/60">{lead.email}</span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-4 text-xs font-medium text-on-surface-variant">{lead.source}</td>
                <td className="px-8 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest",
                    getStatusColor(lead.status)
                  )}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-8 py-4">
                  <span className="px-2 py-1 bg-surface-container-highest rounded-md text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                    {lead.product}
                  </span>
                </td>
                <td className="px-8 py-4 text-xs font-medium text-on-surface-variant">
                  {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-8 py-4 text-right">
                  <button 
                    onClick={() => setSelectedLead(lead)}
                    className="text-on-surface-variant/40 hover:text-on-surface transition-colors"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-8 py-12 text-center text-on-surface-variant/60 text-sm font-medium">
                  No leads found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        <div className="px-8 py-4 bg-surface-container-highest/10 flex items-center justify-between">
          <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Showing {leads.length} of {totalLeads} leads</p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Prev</button>
            <button className="px-3 py-1 bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Next</button>
          </div>
        </div>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedLead && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-outline-variant/20"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 bg-surface-container-low">
                <h3 className="text-lg font-black tracking-tight text-on-surface">Lead Details</h3>
                <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-surface-container-highest rounded-full transition-colors">
                  <X size={20} className="text-on-surface-variant" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-black text-primary">
                    {selectedLead.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-on-surface">{selectedLead.name}</h4>
                    <p className="text-sm font-medium text-on-surface-variant">{selectedLead.company || 'No Company'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1">Email</p>
                    <p className="text-sm font-medium text-on-surface truncate" title={selectedLead.email}>{selectedLead.email}</p>
                  </div>
                  <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1">Phone</p>
                    <p className="text-sm font-medium text-on-surface">{selectedLead.phone || 'N/A'}</p>
                  </div>
                  <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1">Source</p>
                    <p className="text-sm font-medium text-on-surface">{selectedLead.source}</p>
                  </div>
                  <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1">Product</p>
                    <p className="text-sm font-medium text-on-surface">{selectedLead.product}</p>
                  </div>
                  <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1">Score</p>
                    <p className="text-sm font-medium text-on-surface">{selectedLead.score || 'N/A'}</p>
                  </div>
                  <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1">Status</p>
                    <span className={cn(
                      "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest inline-block",
                      getStatusColor(selectedLead.status)
                    )}>
                      {selectedLead.status}
                    </span>
                  </div>
                </div>
                
                {selectedLead.score_reason && (
                  <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-1">Score Reason</p>
                    <p className="text-sm font-medium text-on-surface">{selectedLead.score_reason}</p>
                  </div>
                )}
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
