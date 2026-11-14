import React from 'react';
import { Logo } from './Logo';
import { 
  LayoutDashboard, 
  Search, 
  TrendingUp, 
  ImagePlay, 
  Megaphone, 
  DollarSign, 
  Mail, 
  Cpu, 
  Users, 
  HelpCircle, 
  LogOut,
  Bolt,
  Rocket,
  Moon,
  Sun,
  Filter,
  X
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export type ViewType = 'dashboard' | 'audit' | 'strategy' | 'content' | 'ads' | 'sales' | 'funnel' | 'emails' | 'ai' | 'teams';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout?: () => void;
}

// Grouped by job: run the work, win clients, keep it running.
const navGroups = [
  { label: 'Work', items: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'audit', label: 'Audit', icon: Search },
    { id: 'strategy', label: 'Strategy', icon: TrendingUp },
    { id: 'content', label: 'Creatives', icon: ImagePlay },
  ] },
  { label: 'Grow', items: [
    { id: 'funnel', label: 'Funnels', icon: Filter },
    { id: 'sales', label: 'Sales', icon: DollarSign },
    { id: 'emails', label: 'Emails', icon: Mail },
    { id: 'ads', label: 'Ads', icon: Megaphone },
  ] },
  { label: 'System', items: [
    { id: 'ai', label: 'AI Automation', icon: Cpu },
    { id: 'teams', label: 'Teams', icon: Users },
  ] },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, darkMode, onToggleDarkMode, isOpen, onClose, isCollapsed, onToggleCollapse, onLogout }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "h-screen fixed left-0 top-0 flex flex-col bg-surface-container-lowest border-r border-outline-variant/15 z-50 overflow-y-auto no-scrollbar transition-all duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className="flex flex-col h-full py-6">
          {/* Brand */}
          <div className={cn("mb-7 flex items-center", isCollapsed ? "justify-center" : "px-5 justify-between")}>
            <button onClick={onToggleCollapse} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} className={cn("flex items-center gap-3 text-left", isCollapsed && "justify-center")}>
              <Logo className="w-9 h-9 rounded-[11px] shrink-0" />
              {!isCollapsed && (
                <div className="leading-tight">
                  <p className="text-[17px] font-bold tracking-tight text-on-surface">TitanLeap</p>
                  <p className="text-xs text-on-surface-variant/60">Growth system</p>
                </div>
              )}
            </button>
            {!isCollapsed && (
              <button onClick={onClose} aria-label="Close menu" className="md:hidden text-on-surface-variant hover:text-on-surface shrink-0"><X size={20} /></button>
            )}
          </div>

          {/* Navigation */}
          <nav aria-label="Main" className={cn("flex-1 space-y-5", isCollapsed ? "px-3" : "px-3")}>
            {navGroups.map(group => (
              <div key={group.label} className="space-y-0.5">
                {!isCollapsed ? <p className="px-3 pb-1 text-[11px] font-medium text-on-surface-variant/50">{group.label}</p> : <div className="mx-3 mb-2 border-t border-outline-variant/15" />}
                {group.items.map(item => {
                  const isActive = activeView === item.id;
                  return (
                    <button key={item.id} onClick={() => { onViewChange(item.id as ViewType); onClose(); }}
                      title={isCollapsed ? item.label : undefined} aria-current={isActive ? 'page' : undefined}
                      className={cn("w-full flex items-center rounded-[10px] transition-colors",
                        isCollapsed ? "justify-center h-11" : "gap-3 px-3 h-10",
                        isActive ? "bg-primary/10 text-primary font-semibold" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface")}>
                      <item.icon size={18} className="shrink-0" />
                      {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className={cn("mt-6 pt-4 border-t border-outline-variant/15", isCollapsed ? "px-3 space-y-1" : "px-3 space-y-0.5")}>
            <button onClick={onToggleDarkMode} title={darkMode ? 'Light mode' : 'Dark mode'}
              className={cn("w-full flex items-center rounded-[10px] text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors", isCollapsed ? "justify-center h-11" : "gap-3 px-3 h-10")}>
              {darkMode ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
              {!isCollapsed && <span className="text-sm">{darkMode ? 'Light mode' : 'Dark mode'}</span>}
            </button>
            <button onClick={() => { window.location.href = 'mailto:info@titanleap.co?subject=TitanLeap%20Monolith%20support'; }} title={isCollapsed ? 'Support' : 'Email info@titanleap.co'}
              className={cn("w-full flex items-center rounded-[10px] text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors", isCollapsed ? "justify-center h-11" : "gap-3 px-3 h-10")}>
              <HelpCircle size={18} className="shrink-0" />
              {!isCollapsed && <span className="text-sm">Support</span>}
            </button>
            <button onClick={onLogout} title={isCollapsed ? 'Log out' : undefined}
              className={cn("w-full flex items-center rounded-[10px] text-on-surface-variant hover:bg-red-50 hover:text-red-600 transition-colors", isCollapsed ? "justify-center h-11" : "gap-3 px-3 h-10")}>
              <LogOut size={18} className="shrink-0" />
              {!isCollapsed && <span className="text-sm">Log out</span>}
            </button>
          </div>
        </div>
    </aside>
    </>
  );
};
