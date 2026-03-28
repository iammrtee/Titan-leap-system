import React from 'react';
import { Search, Bell, HelpCircle, Menu } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface TopBarProps {
  title: string;
  subtitle?: string;
  badge?: string | number;
  onToggleMobileMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, badge, onToggleMobileMenu }) => {
  return (
    <header className="w-full sticky top-0 z-40 bg-surface/60 backdrop-blur-2xl border-b border-outline-variant/5 h-16 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-4 md:gap-6">
        {onToggleMobileMenu && (
          <button 
            onClick={onToggleMobileMenu}
            className="p-2 -ml-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg md:hidden transition-colors"
          >
            <Menu size={20} />
          </button>
        )}
        <h1 className="text-lg md:text-xl font-bold text-primary tracking-tight truncate">FunnelMonolith</h1>
      </div>

      <div className="flex items-center gap-8">
        {/* Search */}
        <div className="relative hidden xl:block group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" size={14} />
          <input 
            type="text" 
            placeholder="Search architecture..." 
            className="bg-surface-container-low/50 border border-outline-variant/10 rounded-md py-1.5 pl-9 pr-4 text-xs w-64 focus:w-80 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-low transition-all placeholder:text-on-surface-variant/40 font-medium"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant/60 hover:text-on-surface transition-colors relative">
            <Bell size={18} />
          </button>
          <button className="text-on-surface-variant/60 hover:text-on-surface transition-colors">
            <HelpCircle size={18} />
          </button>
          
          <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/10 ml-2">
            <img 
              src="https://picsum.photos/seed/alex/100/100" 
              alt="User profile" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
