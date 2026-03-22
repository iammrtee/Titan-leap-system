import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, List, Filter, Plus, ChevronRight, Share2, MoreHorizontal, Instagram, Twitter, Linkedin, Youtube, Play, FileText, BarChart3, Clock, Search, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

type ContentStatus = 'Draft' | 'Scheduled' | 'Published';
type Platform = 'Instagram' | 'TikTok' | 'Twitter' | 'LinkedIn' | 'YouTube';

interface ContentItem {
  id: string;
  title: string;
  platform: Platform;
  status: ContentStatus;
  dueDate: string;
  author: string;
  hasScript: boolean;
  campaign: string;
}

const ContentCard = ({ item }: any) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group cursor-pointer"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-all">
          {item.platform === 'Instagram' && <Instagram size={16} />}
          {item.platform === 'TikTok' && <Play size={16} />}
          {item.platform === 'Twitter' && <Twitter size={16} />}
          {item.platform === 'LinkedIn' && <Linkedin size={16} />}
          {item.platform === 'YouTube' && <Youtube size={16} />}
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{item.platform}</span>
      </div>
      <div className={cn(
        "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
        item.status === 'Published' ? "bg-success-container text-on-success-container" :
        item.status === 'Scheduled' ? "bg-primary-container text-on-primary-container" :
        "bg-surface-container-highest text-on-surface-variant"
      )}>
        {item.status}
      </div>
    </div>
    
    <h4 className="font-black text-sm text-on-surface leading-tight mb-4 line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h4>
    
    <div className="flex items-center justify-between pt-4 border-t border-outline-variant/5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
          {item.author.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-on-surface-variant leading-none">{item.author}</span>
          <span className="text-[8px] font-medium text-on-surface-variant/40 mt-0.5">{item.dueDate}</span>
        </div>
      </div>
      {item.hasScript && (
        <div className="text-primary" title="Script Attached">
          <FileText size={14} />
        </div>
      )}
    </div>
  </motion.div>
);

export const ContentManager: React.FC = () => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [items, setItems] = useState<ContentItem[]>([
    { id: '1', title: 'The 3-step framework to scale your SaaS', platform: 'Instagram', status: 'Draft', dueDate: 'Mar 24', author: 'Elena Vance', hasScript: true, campaign: 'Growth Accelerator' },
    { id: '2', title: 'Why your growth is stalled (and how to fix it)', platform: 'TikTok', status: 'Scheduled', dueDate: 'Mar 25', author: 'Marcus Thorne', hasScript: true, campaign: 'Growth Accelerator' },
    { id: '3', title: 'I tried contrarian marketing for 30 days', platform: 'LinkedIn', status: 'Published', dueDate: 'Mar 20', author: 'Sarah Jenkins', hasScript: false, campaign: 'Brand Awareness' },
    { id: '4', title: 'The future of AI in B2B SaaS', platform: 'YouTube', status: 'Draft', dueDate: 'Mar 28', author: 'David Chen', hasScript: true, campaign: 'AI Launch' },
  ]);

  const [newItem, setNewItem] = useState<Partial<ContentItem>>({
    title: '',
    platform: 'Instagram',
    status: 'Draft',
    author: 'Elena Vance',
    campaign: 'Growth Accelerator'
  });

  const handleAddItem = () => {
    if (!newItem.title) return;
    const item: ContentItem = {
      id: Math.random().toString(36).substr(2, 9),
      title: newItem.title!,
      platform: newItem.platform as Platform,
      status: newItem.status as ContentStatus,
      dueDate: 'Today',
      author: newItem.author!,
      hasScript: false,
      campaign: newItem.campaign!
    };
    setItems([item, ...items]);
    setIsModalOpen(false);
    setNewItem({ title: '', platform: 'Instagram', status: 'Draft', author: 'Elena Vance', campaign: 'Growth Accelerator' });
  };

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-surface-container-low p-1 rounded-xl border border-outline-variant/20 flex">
            <button 
              onClick={() => setViewMode('kanban')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'kanban' ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/40 hover:text-on-surface"
              )}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded-lg transition-all",
                viewMode === 'list' ? "bg-white text-primary shadow-sm" : "text-on-surface-variant/40 hover:text-on-surface"
              )}
            >
              <List size={18} />
            </button>
          </div>
          <div className="h-8 w-px bg-outline-variant/20" />
          <div className="flex items-center gap-2">
            <button className="bg-surface-container-low px-4 py-2 rounded-xl border border-outline-variant/20 text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2 hover:bg-surface-container transition-all">
              <Filter size={14} />
              Platform
            </button>
            <button className="bg-surface-container-low px-4 py-2 rounded-xl border border-outline-variant/20 text-xs font-black uppercase tracking-widest text-on-surface-variant flex items-center gap-2 hover:bg-surface-container transition-all">
              Campaign
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="monolith-gradient text-white px-6 py-3 rounded-xl font-black text-sm shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-105 transition-all active:scale-95"
        >
          <Plus size={18} />
          New Content
        </button>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(['Draft', 'Scheduled', 'Published'] as ContentStatus[]).map((status) => (
            <div key={status} className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-black text-on-surface tracking-tight">{status}</h3>
                  <span className="bg-surface-container-highest text-on-surface-variant/60 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {items.filter(i => i.status === status).length}
                  </span>
                </div>
                <button className="text-on-surface-variant/40 hover:text-on-surface">
                  <Plus size={18} />
                </button>
              </div>
              <div className="space-y-4 min-h-[400px] bg-surface-container-lowest/30 rounded-3xl p-4 border border-dashed border-outline-variant/20">
                {items.filter(i => i.status === status).map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-surface-container-low rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/10">
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Content Piece</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Platform</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Status</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Due Date</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-surface-container-highest/20 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary transition-all">
                        <FileText size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{item.title}</p>
                        <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{item.campaign}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-on-surface-variant">{item.platform}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                      item.status === 'Published' ? "bg-success-container text-on-success-container" :
                      item.status === 'Scheduled' ? "bg-primary-container text-on-primary-container" :
                      "bg-surface-container-highest text-on-surface-variant"
                    )}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-bold text-on-surface-variant">{item.dueDate}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-on-surface-variant/40 hover:text-on-surface">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Content Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-surface-container-low rounded-3xl shadow-2xl border border-outline-variant/10 p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black tracking-tight text-on-surface">New Content Piece</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Content Title</label>
                  <input 
                    type="text" 
                    value={newItem.title}
                    onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                    placeholder="e.g. The 3-step framework to scale..."
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl px-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Platform</label>
                    <select 
                      value={newItem.platform}
                      onChange={(e) => setNewItem({...newItem, platform: e.target.value as Platform})}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl px-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    >
                      {['Instagram', 'TikTok', 'Twitter', 'LinkedIn', 'YouTube'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Initial Status</label>
                    <select 
                      value={newItem.status}
                      onChange={(e) => setNewItem({...newItem, status: e.target.value as ContentStatus})}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl px-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                    >
                      {['Draft', 'Scheduled', 'Published'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">Campaign</label>
                  <input 
                    type="text" 
                    value={newItem.campaign}
                    onChange={(e) => setNewItem({...newItem, campaign: e.target.value})}
                    placeholder="e.g. Growth Accelerator"
                    className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-2xl px-4 py-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <button 
                  onClick={handleAddItem}
                  className="w-full monolith-gradient text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-primary/30 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all active:scale-95 mt-4"
                >
                  <Plus size={18} />
                  Create Content Piece
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
