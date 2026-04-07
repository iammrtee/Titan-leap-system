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

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, darkMode, onToggleDarkMode, isOpen, onClose }) => {
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
        "h-screen w-64 fixed left-0 top-0 flex flex-col bg-surface-container-low border-r-0 z-50 overflow-y-auto no-scrollbar transition-transform duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full py-6">
          {/* Brand */}
          <div className="px-8 mb-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo className="w-10 h-10 shadow-lg shadow-primary/20 rounded-full" />
              <div>
                <h1 className="text-xl font-black text-primary tracking-tighter leading-none">TitanLeap</h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold mt-1">Growth System</p>
              </div>
            </div>
            <button onClick={onClose} className="md:hidden text-on-surface-variant hover:text-on-surface">
              <X size={20} />
            </button>
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
                className={cn(
                  "w-full flex items-center gap-4 px-8 py-3 transition-all duration-300 ease-in-out group",
                  isActive 
                    ? "text-primary font-bold border-r-2 border-primary bg-surface-container-lowest shadow-sm" 
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                )}
              >
                <item.icon 
                  size={20} 
                  className={cn(
                    "transition-colors",
                    isActive ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface"
                  )} 
                />
                <span className="text-sm font-medium tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto px-6 space-y-4">
          <button 
            onClick={onToggleDarkMode}
            className="w-full py-3 px-4 bg-surface-container-highest text-on-surface-variant font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm hover:bg-surface-container transition-all active:scale-95"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>

          <button className="w-full py-4 px-4 bg-secondary-container text-on-secondary-container font-black rounded-2xl text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-secondary/20 hover:brightness-105 transition-all active:scale-95">
            <Bolt size={18} fill="currentColor" />
            Upgrade Plan
          </button>
          
          <div className="pt-4 border-t border-outline-variant/20 space-y-1">
            <button className="w-full flex items-center gap-4 text-on-surface-variant py-2 px-2 hover:text-on-surface transition-colors text-sm font-medium">
              <HelpCircle size={18} />
              Support
            </button>
            <button className="w-full flex items-center gap-4 text-on-surface-variant py-2 px-2 hover:text-error transition-colors text-sm font-medium">
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
