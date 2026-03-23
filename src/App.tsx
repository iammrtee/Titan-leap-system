import React, { useState, useEffect } from 'react';
import { Sidebar, ViewType } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardOverview } from './components/DashboardOverview';
import { StrategyHub } from './components/StrategyHub';
import { ContentManager } from './components/ContentManager';
import { AuditView } from './components/AuditView';
import { AdsManager } from './components/AdsManager';
import { SalesDashboard } from './components/SalesDashboard';
import { EmailCampaigns } from './components/EmailCampaigns';
import { AIAutomation } from './components/AIAutomation';
import { TeamsView } from './components/TeamsView';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [auditData, setAuditData] = useState<any>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleStartStrategy = (data: any) => {
    setAuditData(data);
    setActiveView('strategy');
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'audit':
        return <AuditView onStartStrategy={handleStartStrategy} />;
      case 'strategy':
        return <StrategyHub auditData={auditData} />;
      case 'content':
        return <ContentManager />;
      case 'ads':
        return <AdsManager />;
      case 'sales':
        return <SalesDashboard />;
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

  const getViewConfig = () => {
    switch (activeView) {
      case 'dashboard':
        return { title: 'Monolith Dash', subtitle: 'Dashboard Overview' };
      case 'audit':
        return { title: 'Growth Audit', subtitle: 'Intake Assessment' };
      case 'strategy':
        return { title: 'Strategy Hub', subtitle: 'Intelligent Framework' };
      case 'content':
        return { title: 'Content Manager', subtitle: 'Active Projects', badge: 24 };
      case 'ads':
        return { title: 'Ads Manager', subtitle: 'Campaign Scaling' };
      case 'sales':
        return { title: 'Sales Dashboard', subtitle: 'Revenue Velocity' };
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
    <div className="min-h-screen bg-surface transition-colors duration-500">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        darkMode={darkMode} 
        onToggleDarkMode={() => setDarkMode(!darkMode)} 
      />
      
      <main className="ml-64 min-h-screen flex flex-col">
        <TopBar 
          title={config.title} 
          subtitle={config.subtitle} 
          badge={config.badge} 
        />
        
        <div className="p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Contextual FAB */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary-container text-on-primary rounded-full shadow-lg shadow-primary/20 flex items-center justify-center z-50 group"
      >
        <div className="relative">
          <span className="material-symbols-outlined text-[28px] group-hover:rotate-90 transition-transform duration-300">add</span>
        </div>
      </motion.button>
    </div>
  );
}
