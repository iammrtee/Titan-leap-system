import React, { useState, useEffect } from 'react';
import { Sidebar, ViewType } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardOverview } from './components/DashboardOverview';
import { StrategyHub } from './components/StrategyHub';
import { ContentManager } from './components/ContentManager';
import { AuditView } from './components/AuditView';
import { AdsManager } from './components/AdsManager';
import { SalesDashboard } from './components/SalesDashboard';
import { FunnelHub } from './components/FunnelHub';
import { EmailCampaigns } from './components/EmailCampaigns';
import { AIAutomation } from './components/AIAutomation';
import { TeamsView } from './components/TeamsView';
import { Logo } from './components/Logo';
import { motion, AnimatePresence } from 'motion/react';
import { Instagram, Twitter, Linkedin, Youtube, Github, Globe, Plus } from 'lucide-react';
import { Toaster } from 'sonner';
import { cn } from './lib/utils';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [auditData, setAuditData] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [forceRegenerateTimestamp, setForceRegenerateTimestamp] = useState<number>(0);

  // Persistence: Load saved state on mount
  useEffect(() => {
    const savedView = localStorage.getItem('titanleap_active_view');
    const savedAuditData = localStorage.getItem('titanleap_audit_report'); // Share with AuditView
    const savedDarkMode = localStorage.getItem('titanleap_dark_mode');

    if (savedView) setActiveView(savedView as ViewType);
    if (savedAuditData) {
      try {
        setAuditData(JSON.parse(savedAuditData));
      } catch (e) {
        console.error("Failed to parse saved audit data", e);
      }
    }
    if (savedDarkMode) setDarkMode(savedDarkMode === 'true');
  }, []);

  // Persistence: Save state on change
  useEffect(() => {
    localStorage.setItem('titanleap_active_view', activeView);
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem('titanleap_dark_mode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleStartStrategy = (data: any) => {
    setAuditData(data);
    setForceRegenerateTimestamp(Date.now());
    setActiveView('strategy');
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'audit':
        return <AuditView onStartStrategy={handleStartStrategy} />;
      case 'strategy':
        return <StrategyHub auditData={auditData} forceRegenerateTimestamp={forceRegenerateTimestamp} />;
      case 'content':
        return <ContentManager />;
      case 'ads':
        return <AdsManager />;
      case 'sales':
        return <SalesDashboard />;
      case 'funnel':
        return <FunnelHub />;
      case 'emails':
        return <EmailCampaigns />;
      case 'ai':
        return <AIAutomation />;
      case 'teams':
        return <TeamsView />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 opacity-40">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center">
              <span className="text-2xl font-black text-on-surface-variant">?</span>
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">View Under Construction</p>
          </div>
        );
    }
  };

  const getViewConfig = (): { title: string; subtitle?: string; badge?: string } => {
    switch (activeView) {
      case 'dashboard':
        return { title: 'Monolith Dash', subtitle: 'Dashboard Overview' };
      case 'audit':
        return { title: 'Audit', subtitle: 'Intake Assessment' };
      case 'strategy':
        return { title: 'Strategy Hub', subtitle: 'Intelligent Framework' };
      case 'content':
        return { title: 'Content Production', subtitle: 'Content auto-routed from calendar → Video Editor & Designer queues' };
      case 'ads':
        return { title: 'Ads Manager', subtitle: 'Campaign Scaling' };
      case 'sales':
        return { title: 'Sales Dashboard', subtitle: 'Revenue Velocity' };
      case 'funnel':
        return { title: 'Funnels', subtitle: 'Conversion Optimization' };
      case 'emails':
        return { title: 'Email Campaigns', subtitle: 'Lifecycle Marketing' };
      case 'ai':
        return { title: 'AI Automation', subtitle: 'Growth Engines' };
      case 'teams':
        return { title: 'Client Portal', subtitle: 'Account Summary' };
      default:
        return { title: activeView.charAt(0).toUpperCase() + activeView.slice(1) };
    }
  };

  const config = getViewConfig();

  return (
    <div className="min-h-screen bg-surface transition-colors duration-700 relative overflow-hidden">
      {/* Atmospheric Background Effects for Dark Mode */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full dark:opacity-20 opacity-0 transition-opacity duration-1000" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full dark:opacity-20 opacity-0 transition-opacity duration-1000" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-primary-container/5 blur-[100px] rounded-full dark:opacity-10 opacity-0 transition-opacity duration-1000" />
      </div>

      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        darkMode={darkMode} 
        onToggleDarkMode={() => setDarkMode(!darkMode)} 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <Toaster position="top-right" richColors />
      
      <main className="md:ml-64 min-h-screen flex flex-col relative">
        <TopBar 
          title={config.title} 
          subtitle={config.subtitle} 
          badge={config.badge} 
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
        />
        
        <div className={cn(
          "w-full flex-1",
          activeView === 'funnel' ? "p-0" : "p-4 md:p-8 max-w-7xl mx-auto"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global Footer */}
        <footer className="p-12 border-t border-outline-variant/10 bg-surface-container-lowest/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <Logo className="w-8 h-8 rounded-full" />
              <span className="text-lg font-black uppercase tracking-tighter text-on-surface">TitanLeap</span>
            </div>
            
            <div className="flex items-center gap-6">
              <a href="#" className="text-on-surface-variant/40 hover:text-primary transition-colors"><Instagram size={20} /></a>
              <a href="#" className="text-on-surface-variant/40 hover:text-primary transition-colors"><Twitter size={20} /></a>
              <a href="#" className="text-on-surface-variant/40 hover:text-primary transition-colors"><Linkedin size={20} /></a>
              <a href="#" className="text-on-surface-variant/40 hover:text-primary transition-colors"><Youtube size={20} /></a>
              <a href="#" className="text-on-surface-variant/40 hover:text-primary transition-colors"><Github size={20} /></a>
            </div>

            <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 md:pr-20">
              © 2026 TitanLeap AI. All Rights Reserved.
            </div>
          </div>
        </footer>
      </main>

      {/* Contextual FAB */}
      <motion.button 
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-on-primary rounded-2xl shadow-2xl shadow-primary/20 flex items-center justify-center z-50 group border border-white/10"
      >
        <div className="relative">
          <Plus size={28} className="group-hover:rotate-90 transition-transform duration-500" />
        </div>
      </motion.button>
    </div>
  );
}
