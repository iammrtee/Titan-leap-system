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
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'audit', label: 'Audit', icon: Search },
  { id: 'strategy', label: 'Strategy', icon: TrendingUp },
  { id: 'content', label: 'Creatives', icon: ImagePlay },
  { id: 'ads', label: 'Ads', icon: Megaphone },
  { id: 'funnel', label: 'Funnels', icon: Filter },
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'ai', label: 'AI Automation', icon: Cpu },
  { id: 'teams', label: 'Teams', icon: Users },
] as const;

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, darkMode, onToggleDarkMode, isOpen, onClose, isCollapsed, onToggleCollapse }) => {
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
        "h-screen fixed left-0 top-0 flex flex-col bg-surface-container-low border-r-0 z-50 overflow-y-auto no-scrollbar transition-all duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className="flex flex-col h-full py-6">
          {/* Brand */}
          <div className={cn("mb-10 flex items-center", isCollapsed ? "px-0 justify-center" : "px-8 justify-between")}>
            <div 
              className={cn("flex items-center gap-3 cursor-pointer", isCollapsed && "justify-center")}
              onClick={onToggleCollapse}
              title="Toggle Sidebar"
            >
              <Logo className="w-10 h-10 shadow-lg shadow-primary/20 rounded-full shrink-0" />
              {!isCollapsed && (
                <div>
                  <h1 className="text-xl font-black text-primary tracking-tighter leading-none">TitanLeap</h1>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold mt-1">Growth System</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button onClick={onClose} className="md:hidden text-on-surface-variant hover:text-on-surface shrink-0">
                <X size={20} />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    onClose();
                  }}
                  title={isCollapsed ? item.label : undefined}
                className={cn(
                  "w-full flex items-center transition-all duration-300 ease-in-out group",
                  isCollapsed ? "justify-center px-0 py-4" : "gap-4 px-8 py-3",
                  isActive 
                    ? "text-primary font-bold border-r-2 border-primary bg-surface-container-lowest shadow-sm" 
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                <item.icon 
                  size={20} 
                  className={cn(
                    "transition-colors shrink-0",
                    isActive ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface"
                  )} 
                />
                {!isCollapsed && <span className="text-sm font-medium tracking-tight truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn("mt-auto space-y-4", isCollapsed ? "px-2" : "px-6")}>
          <button 
            onClick={onToggleDarkMode}
            title={darkMode ? 'Light Mode' : 'Dark Mode'}
            className={cn(
              "w-full bg-surface-container-highest text-on-surface-variant font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-surface-container transition-all active:scale-95",
              isCollapsed ? "py-4" : "py-3 px-4"
            )}
          >
            {darkMode ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
            {!isCollapsed && (darkMode ? 'Light Mode' : 'Dark Mode')}
          </button>

          <button 
            title={isCollapsed ? "Upgrade Plan" : undefined}
            className={cn(
              "w-full bg-secondary-container text-on-secondary-container font-black rounded-2xl text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-secondary/20 hover:brightness-105 transition-all active:scale-95",
              isCollapsed ? "py-4 px-0" : "py-4 px-4"
            )}
          >
            <Bolt size={18} fill="currentColor" className="shrink-0" />
            {!isCollapsed && "Upgrade Plan"}
          </button>
          
          <div className={cn("pt-4 border-t border-outline-variant/20 space-y-1", isCollapsed ? "px-2" : "px-0")}>
            <button 
              title={isCollapsed ? "Support" : undefined}
              className={cn(
                "w-full flex items-center text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium",
                isCollapsed ? "justify-center py-3 px-0" : "gap-4 py-2 px-2"
              )}
            >
              <HelpCircle size={18} className="shrink-0" />
              {!isCollapsed && "Support"}
            </button>
            <button 
              title={isCollapsed ? "Logout" : undefined}
              className={cn(
                "w-full flex items-center text-on-surface-variant hover:text-error transition-colors text-sm font-medium",
                isCollapsed ? "justify-center py-3 px-0" : "gap-4 py-2 px-2"
              )}
            >
              <LogOut size={18} className="shrink-0" />
              {!isCollapsed && "Logout"}
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
