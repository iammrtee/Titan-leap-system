import React from 'react';
import { Search, Bell, Settings } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface TopBarProps {
  title: string;
  subtitle?: string;
  badge?: string | number;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, badge }) => {
  return (
    <header className="w-full sticky top-0 z-40 bg-surface/80 backdrop-blur-xl shadow-ambient h-16 flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-on-surface tracking-tighter">{title}</h2>
        {subtitle && (
          <>
            <div className="h-6 w-[1px] bg-outline-variant/30 mx-2" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-on-surface-variant">{subtitle}</span>
              {badge !== undefined && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {badge}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={18} />
          <input 
            type="text" 
            placeholder="Search assets..." 
            className="bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/40"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative active:scale-95">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-secondary-container rounded-full border-2 border-surface" />
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors active:scale-95">
            <Settings size={20} />
          </button>
          
          <div className="h-8 w-[1px] bg-outline-variant/30 mx-2" />
          
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-on-surface leading-none">Alex Sterling</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mt-1">Admin</p>
            </div>
            <div className="w-8 h-8 rounded-full border border-outline-variant/20 overflow-hidden ring-2 ring-primary/5 group-hover:ring-primary/20 transition-all">
              <img 
                src="https://picsum.photos/seed/alex/100/100" 
                alt="User profile" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
