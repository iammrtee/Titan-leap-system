import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ZoomIn,
  ZoomOut,
  Filter, 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Target, 
  BarChart2,
  BarChart3,
  MousePointer2, 
  Layout, 
  ShoppingBag, 
  CreditCard, 
  Users,
  ArrowRight,
  ShieldCheck,
  Trophy,
  Loader2,
  Plus,
  Settings,
  Download,
  Share2,
  MoreHorizontal,
  Globe,
  Trash2,
  Search,
  ArrowDown,
  Layers,
  Sparkles,
  Eye,
  Edit3,
  Activity,
  Maximize2,
  Minimize2,
  X,
  Megaphone,
  Mail,
  Play,
  Upload,
  FileText,
  PartyPopper,
  Instagram,
  Youtube,
  Anchor,
  Megaphone as Campaign,
  Globe as Web,
  ShoppingCart,
  PartyPopper as Celebration,
  Droplets as LeakAdd,
  MoveRight as TrendingFlat,
  History as HistoryIcon,
  ClipboardList,
  MessageSquare,
  DollarSign,
  UserPlus,
  MailOpen,
  CreditCard as SalesIcon,
  Heart,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { auditMarketingFunnel, analyzeCompetitorFunnel } from '@/src/services/ai';
import { toast } from 'sonner';

type FunnelTab = 'current' | 'editor' | 'audit' | 'competitor';

interface LandingPageScore {
  score: number;
  issue: string;
  fix: string;
}

interface TopKiller {
  rank: number;
  problem: string;
  why: string;
  fix: string;
  impact: string;
}

interface QuickWin {
  win: string;
  effort: string;
  impact: string;
  steps: string[];
}

interface FunnelsPlusResult {
  landing_page_scores: {
    headline_clarity: LandingPageScore;
    value_prop: LandingPageScore;
    cta_button: LandingPageScore;
    form_friction: LandingPageScore;
    social_proof: LandingPageScore;
    mobile_friendly: LandingPageScore;
  };
  funnel_steps: string[];
  friction_points: string[];
  top_killers: TopKiller[];
  quick_wins: QuickWin[];
  traffic_fit: string;
  priority: string;
}

interface CompetitorAnalysis {
  profile: {
    name: string;
    platforms: string[];
    niche: string;
    audienceSize: string;
    strength: 'Weak' | 'Moderate' | 'Strong' | 'Elite';
  };
  map: {
    stage: string;
    platform: string;
    strength: 'Weak' | 'Moderate' | 'Strong';
  }[];
  deepBreakdown: {
    stage: string;
    whatTheyDo: string;
    effectiveness: string;
    whyItWorks: string;
  }[];
  dangerousTraits: {
    trait: string;
    detail: string;
  }[];
  actionPlan: {
    whatTheyDo: string;
    whyItWorks: string;
    howToApply: string;
    expectedImpact: string;
  }[];
  competitiveEdge: {
    gap: string;
    advantage: string;
    difficulty: 'Low' | 'Medium' | 'High';
  }[];
  sources?: {
    title: string;
    url: string;
  }[];
}

interface BusinessIntake {
  trafficSources: string;
  hookStrategy: string;
  landingPage: string;
  offerPricing: string;
  backendRetention: string;
}

const INITIAL_INTAKE: BusinessIntake = {
  trafficSources: '',
  hookStrategy: '',
  landingPage: '',
  offerPricing: '',
  backendRetention: '',
};

export const FunnelHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FunnelTab>('current');
  const [intakeData, setIntakeData] = useState<BusinessIntake | null>(null);
  const [auditResult, setAuditResult] = useState<FunnelsPlusResult | null>(null);
  const [showIntake, setShowIntake] = useState(false);

  return (
    <div className={cn(
      activeTab !== 'editor' ? "pb-20 space-y-8" : "h-[calc(100vh-64px)] flex flex-col overflow-hidden"
    )}>
      {/* Header Section */}
      <div className={cn(
        "flex flex-col gap-6 pt-4 md:pt-8 shrink-0",
        activeTab === 'editor' ? "px-4 md:px-8 lg:px-12 xl:px-16" : "px-4 md:px-8 lg:px-12 xl:px-16 w-full"
      )}>
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 md:gap-0">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black text-on-surface tracking-tight">Funnels</h1>
            <p className="text-lg md:text-xl font-medium text-on-surface-variant/80">Build, analyse, and optimise your client conversion systems.</p>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 pt-2">
              <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">3 Funnels Active</span>
              </div>
              <div className="bg-surface-container-low text-on-surface-variant/60 px-4 py-1.5 rounded-full border border-outline-variant/10">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Last Updated: Today</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4 w-full md:w-auto">
            <button 
              onClick={() => toast.info("AI Funnel Import is coming soon!")}
              className="flex-1 md:flex-none px-4 md:px-6 py-3 bg-white border border-outline-variant/20 rounded-xl text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={18} className="text-[#6200EA]" />
              Import funnel
            </button>
            <button 
              onClick={() => {
                setActiveTab('current');
                setShowIntake(true);
              }}
              className="flex-1 md:flex-none px-4 md:px-6 py-3 bg-[#6200EA] hover:bg-[#5000C0] text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#6200EA]/20"
            >
              <Plus size={18} />
              Map your funnel
            </button>
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className={cn(
        "flex items-center gap-6 md:gap-8 border-b border-outline-variant/10 pb-0 mt-6 md:mt-8 shrink-0 overflow-x-auto no-scrollbar",
        activeTab === 'editor' ? "px-4 md:px-8 lg:px-12 xl:px-16 mb-0" : "px-4 md:px-8 lg:px-12 xl:px-16 w-full"
      )}>
        {(['current', 'editor', 'audit', 'competitor'] as FunnelTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "text-sm md:text-base font-bold transition-all relative py-4 flex items-center gap-2 whitespace-nowrap shrink-0",
              activeTab === tab ? "text-[#6200EA]" : "text-on-surface-variant/50 hover:text-on-surface"
            )}
          >
            {tab === 'current' ? 'Current Funnel' : 
             tab === 'editor' ? 'Funnel Editor' : 
             tab === 'audit' ? 'Audit' : 'Benchmarks'}
            
            {tab === 'audit' && (
              <span className="bg-[#FFB300] text-black text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest">PRO</span>
            )}

            {activeTab === tab && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-1 bg-[#6200EA] rounded-t-full"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className={cn(
            activeTab !== 'editor' ? "px-4 md:px-8 lg:px-12 xl:px-16 w-full" : "flex-1 min-h-0 flex flex-col"
          )}
        >
          {activeTab === 'current' && (
            showIntake ? (
              <BusinessIntakeView 
                initialData={intakeData || INITIAL_INTAKE}
                onComplete={(data) => {
                  setIntakeData(data);
                  setShowIntake(false);
                }}
                onCancel={() => setShowIntake(false)}
              />
            ) : (
              <CurrentFunnelView 
                intakeData={intakeData} 
                onStartIntake={() => setShowIntake(true)}
                auditResult={auditResult}
              />
            )
          )}
          {activeTab === 'editor' && <FunnelEditorView />}
          {activeTab === 'audit' && (
            <FunnelsPlusView 
              result={auditResult} 
              onAuditComplete={setAuditResult}
              intakeData={intakeData}
            />
          )}
          {activeTab === 'competitor' && <CompetitorFunnelsView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// --- Business Intake View ---
const BusinessIntakeView = ({ 
  onComplete, 
  onCancel,
  initialData 
}: { 
  onComplete: (data: BusinessIntake) => void,
  onCancel?: () => void,
  initialData: BusinessIntake
}) => {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BusinessIntake>(initialData);

  const questions = [
    { id: 'trafficSources', label: 'Layer 1: Traffic Sources', placeholder: 'Where do you get your traffic? (e.g. Meta Ads, SEO, TikTok)', icon: Megaphone },
    { id: 'hookStrategy', label: 'Layer 2: Hook & Content Strategy', placeholder: 'What is your main hook? How do you stop the scroll?', icon: Target },
    { id: 'landingPage', label: 'Layer 3: Landing Page Structure', placeholder: 'Describe your landing page. (e.g. VSL, Long-form, Opt-in)', icon: Layout },
    { id: 'offerPricing', label: 'Layer 4: Offer & Pricing', placeholder: 'What are you selling and for how much?', icon: ShoppingBag },
    { id: 'backendRetention', label: 'Layer 5: Backend & Retention', placeholder: 'What happens after the first sale? Upsells? Emails?', icon: Mail },
  ];

  const currentQuestion = questions[step - 1];

  const handleNext = () => {
    if (step < questions.length) {
      setStep(step + 1);
    } else {
      onComplete(data);
      toast.success("Analysis Framework Initialized!");
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="bg-surface-container-lowest rounded-[48px] p-12 border border-outline-variant/10 shadow-2xl shadow-primary/5 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <currentQuestion.icon size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-on-surface tracking-tight">{currentQuestion.label}</h3>
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Step {step} of {questions.length}</p>
            </div>
          </div>
          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div key={i} className={cn("w-8 h-1 rounded-full transition-all", i + 1 <= step ? "bg-primary" : "bg-surface-container-high")} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <textarea
            rows={5}
            placeholder={currentQuestion.placeholder}
            value={(data as any)[currentQuestion.id]}
            onChange={(e) => setData({ ...data, [currentQuestion.id]: e.target.value })}
            className="w-full bg-surface-container-low border-none rounded-3xl p-8 text-lg font-medium focus:ring-4 focus:ring-primary/10 outline-none resize-none text-on-surface"
          />
          <p className="text-xs text-outline font-medium px-4 italic">
            Be as specific as possible. The more detail you provide, the better our AI can audit your process.
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          {(step > 1 || onCancel) && (
            <button 
              onClick={() => step > 1 ? setStep(step - 1) : onCancel?.()}
              className="flex-1 py-5 bg-surface-container-low text-on-surface font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-surface-container transition-all"
            >
              {step > 1 ? 'Back' : 'Cancel'}
            </button>
          )}
          <button 
            onClick={handleNext}
            className="flex-[2] py-5 bg-primary text-on-primary font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:brightness-110 transition-all"
          >
            {step === questions.length ? 'Initialize Analysis' : 'Next Step'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Current Funnel View (Improved) ---
const CurrentFunnelView = ({ 
  intakeData, 
  onStartIntake,
  auditResult
}: { 
  intakeData: BusinessIntake | null, 
  onStartIntake: () => void,
  auditResult: FunnelsPlusResult | null
}) => {
  const calculateHealthScore = (data: BusinessIntake | null, audit: FunnelsPlusResult | null) => {
    if (!data && !audit) return 62;
    
    let score = 60;
    
    if (data) {
      const fields = ['trafficSources', 'hookStrategy', 'landingPage', 'offerPricing', 'backendRetention'] as const;
      fields.forEach(field => {
        if (data[field].length > 10) score += 2;
        if (data[field].length > 50) score += 3;
      });
    }

    if (audit) {
      const avgAuditScore = audit.stages.reduce((acc, s) => acc + s.score, 0) / audit.stages.length;
      score = (score + (avgAuditScore * 10)) / 2;
    }

    return Math.min(Math.round(score), 98);
  };

  const getPotentialLeak = (data: BusinessIntake | null, audit: FunnelsPlusResult | null) => {
    if (!data) return { stage: 'Missing Data', detail: 'Complete your business intake to identify revenue leaks.', recovery: 0, color: 'text-error' };

    if (audit) {
      const weakestStage = [...audit.stages].sort((a, b) => a.score - b.score)[0];
      return {
        stage: weakestStage.name,
        detail: weakestStage.analysis,
        recovery: parseInt(weakestStage.moneyLeak.replace(/[^0-9]/g, '')) || 12500,
        color: weakestStage.score < 5 ? 'text-error' : 'text-warning'
      };
    }

    return { 
      stage: 'Bundle Alpha Offer', 
      detail: 'The conversion rate has dropped below the threshold of 1.5%. Approximately $4,200 in monthly revenue is being lost at this specific junction.', 
      recovery: 12500,
      color: 'text-error'
    };
  };

  const healthScore = calculateHealthScore(intakeData, auditResult);
  const leak = getPotentialLeak(intakeData, auditResult);

  const [selectedStageId, setSelectedStageId] = useState<number | null>(3); // Default to Landing

  const layers = [
    { id: 1, name: 'TRAFFIC SOURCE', icon: Megaphone, color: 'text-blue-500', bg: 'bg-blue-500/10', detail: intakeData?.trafficSources || 'Direct, Organic Search, and Social Media channels.', conversion: '4.2%' },
    { id: 2, name: 'HOOK & CONTENT', icon: Target, color: 'text-purple-500', bg: 'bg-purple-500/10', detail: intakeData?.hookStrategy || 'Educational blog posts and viral video hooks.', conversion: '12.8%' },
    { id: 3, name: 'LANDING PAGE', icon: Layout, color: 'text-blue-600', bg: 'bg-blue-600/10', detail: intakeData?.landingPage || 'High-converting VSL and lead magnet opt-in.', conversion: '24.5%' },
    { id: 4, name: 'OFFER & PRICING', icon: ShoppingBag, color: 'text-red-500', bg: 'bg-red-500/10', detail: intakeData?.offerPricing || 'Core product offer with limited-time discount.', conversion: '8.2%' },
    { id: 5, name: 'BACKEND & RETENTION', icon: Mail, color: 'text-amber-500', bg: 'bg-amber-500/10', detail: intakeData?.backendRetention || 'Email follow-up sequence and upsell flow.', conversion: '15.0%' },
  ];

  const selectedStage = layers.find(l => l.id === selectedStageId);

  return (
    <div className="relative min-h-screen pb-24 space-y-8">
      {/* Top Row: Health & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Health Score */}
        <div className="lg:col-span-4 bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/10 shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/10 transition-colors" />
          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant/40 mb-8 z-10">Overall Funnel Health</p>
          
          <div className="relative flex items-center justify-center mb-6 z-10">
            <svg className="w-48 h-48 -rotate-90">
              <circle className="text-surface-container-high/30" cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" strokeWidth="16"></circle>
              <motion.circle 
                initial={{ strokeDashoffset: 502.65 }}
                animate={{ strokeDashoffset: 502.65 * (1 - (healthScore / 100)) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                cx="96" 
                cy="96" 
                fill="transparent" 
                r="80" 
                stroke="currentColor" 
                strokeDasharray="502.65" 
                strokeLinecap="round" 
                strokeWidth="16"
                className="text-primary"
                style={{ stroke: 'url(#healthGradientSmall)' }}
              ></motion.circle>
              <defs>
                <linearGradient id="healthGradientSmall" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-black text-on-surface tracking-tighter leading-none">{healthScore}</span>
              <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mt-1">Score</span>
            </div>
          </div>

          <div className="flex gap-6 z-10">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[8px] font-black text-on-surface-variant/60 uppercase tracking-widest">Stable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[8px] font-black text-on-surface-variant/60 uppercase tracking-widest">-4.2% MoM</span>
            </div>
          </div>
        </div>

        {/* Revenue Forecast - Large Purple Card */}
        <div className="lg:col-span-8 bg-indigo-600 p-10 rounded-[40px] shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/15 transition-colors" />
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Revenue Forecast</h5>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Projected Next 30 Days</p>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10">
                <span className="text-xs font-black text-white">+12.4%</span>
              </div>
            </div>
            
            <div className="flex items-end justify-between gap-12">
              <div>
                <p className="text-7xl font-black text-white tracking-tighter">$142,850</p>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-2">Based on current conversion velocity</p>
              </div>
              
              <div className="flex items-end gap-3 h-24 flex-1 max-w-md">
                {[30, 45, 35, 60, 85, 40, 70, 55, 90, 65].map((h, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05, duration: 0.8 }}
                    className={cn(
                      "flex-1 rounded-t-xl transition-all",
                      i === 8 ? "bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "bg-white/20"
                    )} 
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Funnel Architecture Map */}
      <div className="bg-surface-container-lowest p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-outline-variant/10 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 mb-8 md:mb-12">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-on-surface tracking-tight">Funnel Architecture Map</h3>
            <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">Visualizing the end-to-end customer journey</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-xl border border-outline-variant/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Live Tracking Active</span>
            </div>
            <button 
              onClick={() => toast.info("Full map view coming soon!")}
              className="px-6 py-2.5 bg-surface-container-low border border-outline-variant/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 hover:text-primary hover:border-primary/40 transition-all"
            >
              View Full Map
            </button>
          </div>
        </div>

        <div className="relative py-12 overflow-x-auto no-scrollbar">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-12 right-12 h-[2px] bg-outline-variant/10 -translate-y-1/2 min-w-[800px]" />
          
          <div className="flex justify-between items-center relative z-10 px-4 min-w-[800px]">
            {layers.map((layer, idx) => (
              <React.Fragment key={layer.id}>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedStageId(layer.id)}
                  className="flex flex-col items-center gap-6 group cursor-pointer"
                >
                  <div className={cn(
                    "w-24 h-24 rounded-[32px] flex items-center justify-center shrink-0 shadow-lg border border-outline-variant/5 transition-all relative",
                    selectedStageId === layer.id ? "scale-110 -translate-y-2 ring-4 ring-primary/20" : "group-hover:scale-110 group-hover:-translate-y-1",
                    layer.bg, layer.color
                  )}>
                    <layer.icon size={32} />
                    {/* Pulse Effect */}
                    {selectedStageId === layer.id && (
                      <div className={cn("absolute inset-0 rounded-[32px] animate-ping opacity-20", layer.bg)} style={{ animationDuration: '3s' }} />
                    )}
                  </div>
                  <div className="text-center space-y-1">
                    <h4 className={cn(
                      "text-[10px] font-black tracking-widest uppercase transition-colors",
                      selectedStageId === layer.id ? "text-primary" : "text-on-surface"
                    )}>{layer.name}</h4>
                    <p className="text-[8px] font-bold text-on-surface-variant/30 uppercase tracking-widest">Stage 0{layer.id}</p>
                  </div>
                </motion.div>
                {idx < layers.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 + 0.05 }}
                    className="hidden md:flex flex-col items-center justify-center -mt-12"
                  >
                    <div className="px-3 py-1 bg-surface-container-low border border-outline-variant/10 rounded-full mb-2">
                      <span className="text-[8px] font-black text-primary uppercase tracking-widest">{layers[idx+1].conversion}</span>
                    </div>
                    <ArrowRight size={20} className="text-outline-variant/30 animate-pulse" />
                  </motion.div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Selected Stage Breakdown */}
        <AnimatePresence mode="wait">
          {selectedStage && (
            <motion.div 
              key={selectedStage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12 p-8 bg-surface-container-low/50 rounded-[32px] border border-outline-variant/10 grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", selectedStage.bg, selectedStage.color)}>
                    <selectedStage.icon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Selected Stage</p>
                    <h4 className="text-lg font-black text-on-surface">{selectedStage.name}</h4>
                  </div>
                </div>
                <p className="text-xs text-on-surface/60 font-medium leading-relaxed">{selectedStage.detail}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-outline-variant/5">
                  <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Conversion</p>
                  <p className="text-xl font-black text-primary">{selectedStage.conversion}</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-outline-variant/5">
                  <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">Drop-off</p>
                  <p className="text-xl font-black text-red-500">{(100 - parseFloat(selectedStage.conversion)).toFixed(1)}%</p>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-3">
                <button 
                  onClick={() => setActiveTab('audit')}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  <Zap size={14} />
                  Optimize Stage
                </button>
                <button 
                  onClick={() => toast.info("Detailed analytics coming soon!")}
                  className="w-full py-3 bg-white border border-outline-variant/10 text-on-surface rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-low transition-all"
                >
                  View Analytics
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Row: Leak, Traffic, Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Potential Leak Detected */}
        <div className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/10 shadow-lg group">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
              <AlertCircle size={24} />
            </div>
            <h4 className="text-xs font-black text-on-surface uppercase tracking-widest">Potential Leak Detected</h4>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100">
              <p className="text-[11px] font-black text-red-600 mb-1">{leak.stage}</p>
              <p className="text-[10px] text-red-500/70 font-medium leading-relaxed">{leak.detail}</p>
            </div>
            <button 
              onClick={() => setActiveTab('audit')}
              className="w-full py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
            >
              Fix Leak Now
            </button>
          </div>
        </div>

        {/* Traffic Distribution */}
        <div className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/10 shadow-lg">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-xs font-black text-on-surface uppercase tracking-widest">Traffic Distribution</h4>
            <BarChart2 size={18} className="text-on-surface-variant/30" />
          </div>
          <div className="space-y-5">
            {[
              { label: 'Direct & Search', value: 42, color: 'bg-indigo-500' },
              { label: 'Social Media', value: 38, color: 'bg-purple-500' },
              { label: 'Paid Ads', value: 20, color: 'bg-emerald-500' },
            ].map((origin, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-on-surface-variant/60 uppercase tracking-widest">{origin.label}</span>
                  <span className="text-[10px] font-black text-on-surface">{origin.value}%</span>
                </div>
                <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${origin.value}%` }}
                    className={cn("h-full rounded-full", origin.color)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Logs */}
        <div className="bg-surface-container-lowest p-8 rounded-[40px] border border-outline-variant/10 shadow-lg">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-xs font-black text-on-surface uppercase tracking-widest">Performance Logs</h4>
            <HistoryIcon size={18} className="text-on-surface-variant/30" />
          </div>
          <div className="space-y-4">
            {[
              { time: '2m ago', event: 'New Lead: "Sarah J."', status: 'success' },
              { time: '15m ago', event: 'Ad CTR Spike: +1.2%', status: 'info' },
              { time: '1h ago', event: 'Checkout Abandoned', status: 'warning' },
            ].map((log, i) => (
              <div key={i} className="flex items-center gap-4 p-3 hover:bg-surface-container-low rounded-2xl transition-colors cursor-pointer group">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  log.status === 'success' ? "bg-emerald-500" : log.status === 'warning' ? "bg-amber-500" : "bg-blue-500"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-on-surface truncate group-hover:text-primary transition-colors">{log.event}</p>
                  <p className="text-[9px] font-bold text-on-surface-variant/30 uppercase tracking-widest">{log.time}</p>
                </div>
                <ChevronRight size={14} className="text-on-surface-variant/20 group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button 
        onClick={onStartIntake}
        className="fixed bottom-12 right-12 w-16 h-16 rounded-[24px] bg-primary text-on-primary shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 hover:rotate-90 transition-all z-50 group"
      >
        <Plus size={32} className="group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
};

// --- Funnel Editor View (Improved) ---
interface FunnelNode {
  id: string;
  type: string;
  name: string;
  sub: string;
  icon: any;
  color: string;
  category: string;
  url: string;
  goal: string;
  cta: string;
  notes: string;
  x: number;
  y: number;
  metrics?: {
    label: string;
    value: string;
  }[];
  config?: Record<string, any>;
}

interface Connection {
  id: string;
  from: string;
  to: string;
}

interface BlockTemplate {
  id: string;
  name: string;
  sub: string;
  icon: any;
  color: string;
  category: string;
  defaultGoal: string;
  defaultCta: string;
}

const BLOCK_TEMPLATES: BlockTemplate[] = [
  { id: 'paid-ads', name: 'Paid Ads', sub: 'Meta, TikTok, Google', icon: Megaphone, color: 'bg-indigo-500', category: 'TRAFFIC SOURCE', defaultGoal: 'Drive high-quality traffic to the landing page.', defaultCta: 'Learn More' },
  { id: 'organic-content', name: 'Organic Content', sub: 'SEO, Social, Blog', icon: Globe, color: 'bg-emerald-500', category: 'TRAFFIC SOURCE', defaultGoal: 'Build authority and drive organic traffic.', defaultCta: 'Read More' },
  { id: 'hook', name: 'The Hook', sub: 'Pain-Agitate-Solve', icon: Target, color: 'bg-primary', category: 'HOOK & CONTENT', defaultGoal: 'Capture attention and create curiosity.', defaultCta: 'Watch Video' },
  { id: 'vsl', name: 'VSL / Video', sub: 'Sales Letter Video', icon: Play, color: 'bg-red-500', category: 'HOOK & CONTENT', defaultGoal: 'Educate and persuade the lead.', defaultCta: 'Watch Now' },
  { id: 'landing-page', name: 'Landing Page', sub: 'Conversion Focused', icon: Layout, color: 'bg-blue-500', category: 'LANDING PAGE', defaultGoal: 'Convert visitors into leads or customers.', defaultCta: 'Get Started' },
  { id: 'opt-in', name: 'Opt-in Form', sub: 'Lead Capture', icon: FileText, color: 'bg-emerald-500', category: 'LANDING PAGE', defaultGoal: 'Capture emails in exchange for a lead magnet.', defaultCta: 'Download Now' },
  { id: 'sales-page', name: 'Sales Page', sub: 'Checkout Flow', icon: ShoppingBag, color: 'bg-purple-500', category: 'OFFER & PRICING', defaultGoal: 'Close the sale and process payment.', defaultCta: 'Buy Now' },
  { id: 'upsell', name: 'Upsell / Bump', sub: 'AOV Boost', icon: TrendingUp, color: 'bg-warning', category: 'OFFER & PRICING', defaultGoal: 'Increase average order value.', defaultCta: 'Add to Order' },
  { id: 'thank-you', name: 'Thank You Page', sub: 'Confirmation', icon: PartyPopper, color: 'bg-success', category: 'BACKEND & RETENTION', defaultGoal: 'Confirm action and provide next steps.', defaultCta: 'Join Community' },
  { id: 'email', name: 'Email Sequence', sub: 'Nurture/Retention', icon: Mail, color: 'bg-blue-400', category: 'BACKEND & RETENTION', defaultGoal: 'Nurture leads and drive repeat sales.', defaultCta: 'Read More' },
  { id: 'sales-call', name: 'Sales Call', sub: 'High-Ticket Close', icon: Users, color: 'bg-indigo-400', category: 'OFFER & PRICING', defaultGoal: 'Close high-ticket clients on the phone.', defaultCta: 'Book Call' },
  { id: 'post-purchase', name: 'Post-Purchase', sub: 'Fulfillment', icon: ShieldCheck, color: 'bg-emerald-400', category: 'BACKEND & RETENTION', defaultGoal: 'Deliver value and ensure customer success.', defaultCta: 'Access' },
];

const INITIAL_NODES: FunnelNode[] = [
  { 
    id: '1', 
    type: 'paid-ads', 
    name: 'FB Ad: "Q4 Monolith"', 
    sub: 'Enterprise SaaS Founders', 
    icon: Megaphone, 
    color: 'bg-indigo-500', 
    category: 'TRAFFIC SOURCE',
    url: 'facebook.com/ads/123',
    goal: 'Drive high-quality traffic to the landing page.',
    cta: 'Learn More',
    notes: 'Targeting SaaS founders with $1M+ ARR.',
    x: 400,
    y: 50,
    metrics: [{ label: 'CTR', value: '3.2%' }, { label: 'CLICKS', value: '1,402' }]
  },
  { 
    id: '2', 
    type: 'hook', 
    name: 'The "Gap" Hook', 
    sub: 'Pain-Agitate-Solve', 
    icon: Target, 
    color: 'bg-primary', 
    category: 'HOOK & CONTENT',
    url: 'titanleap.app/hook-1',
    goal: 'Capture attention and create curiosity.',
    cta: 'Watch Video',
    notes: 'Focus on the "Revenue Gap" pain point.',
    x: 400,
    y: 400,
    metrics: [{ label: 'CVR', value: '24.5%' }, { label: 'LEADS', value: '343' }]
  },
  { 
    id: '3', 
    type: 'landing-page', 
    name: 'Main Landing Page', 
    sub: 'Conversion Focused', 
    icon: Layout, 
    color: 'bg-blue-500', 
    category: 'LANDING PAGE',
    url: 'titanleap.app/offer',
    goal: 'Convert visitors into leads.',
    cta: 'Get Started',
    notes: 'A/B testing the headline.',
    x: 400,
    y: 750,
    metrics: [{ label: 'BOOKINGS', value: '12' }]
  },
];

const FunnelEditorView = () => {
  const [nodes, setNodes] = useState<FunnelNode[]>(INITIAL_NODES);
  const [connections, setConnections] = useState<Connection[]>([
    { id: 'c1', from: '1', to: '2' },
    { id: 'c2', from: '2', to: '3' }
  ]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FunnelNode | null>(null);
  const [zoom, setZoom] = useState(0.8);
  const [isPanning, setIsPanning] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'canvas' | 'flow'>('canvas');
  const [flowDirection, setFlowDirection] = useState<'vertical' | 'horizontal'>('vertical');

  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const getSuggestedNext = (category: string) => {
    switch (category) {
      case 'TRAFFIC SOURCE': return BLOCK_TEMPLATES.filter(t => t.category === 'HOOK & CONTENT');
      case 'HOOK & CONTENT': return BLOCK_TEMPLATES.filter(t => t.category === 'LANDING PAGE');
      case 'LANDING PAGE': return BLOCK_TEMPLATES.filter(t => t.category === 'OFFER & PRICING');
      case 'OFFER & PRICING': return BLOCK_TEMPLATES.filter(t => t.category === 'BACKEND & RETENTION');
      default: return [];
    }
  };

  const handleSelectNode = (node: FunnelNode) => {
    setSelectedNodeId(node.id);
    setEditForm({ ...node });
  };

  const handleAddNode = (template: BlockTemplate) => {
    const newNode: FunnelNode = {
      id: Math.random().toString(36).substr(2, 9),
      type: template.id,
      name: `New ${template.name}`,
      sub: template.sub,
      icon: template.icon,
      color: template.color,
      category: template.category,
      url: '',
      goal: template.defaultGoal,
      cta: template.defaultCta,
      notes: '',
      x: (500 - canvasOffset.x) / zoom,
      y: (300 - canvasOffset.y) / zoom,
    };
    setNodes([...nodes, newNode]);
    handleSelectNode(newNode);
    toast.success(`${template.name} added to funnel`);
  };

  const handleAddCustomNode = () => {
    const newNode: FunnelNode = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'custom',
      name: 'Custom Block',
      sub: 'Custom Stage',
      icon: Sparkles,
      color: 'bg-primary',
      category: 'CUSTOM',
      url: '',
      goal: 'Define your goal...',
      cta: 'Action',
      notes: '',
      x: (500 - canvasOffset.x) / zoom,
      y: (300 - canvasOffset.y) / zoom,
    };
    setNodes([...nodes, newNode]);
    handleSelectNode(newNode);
    toast.success('Custom block added');
  };

  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    const blockId = e.dataTransfer.getData('blockType');
    const block = BLOCK_TEMPLATES.find(t => t.id === blockId);
    if (!block) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left - canvasOffset.x) / zoom - 128;
    const y = (e.clientY - rect.top - canvasOffset.y) / zoom - 60;

    const newNode: FunnelNode = {
      id: Math.random().toString(36).substr(2, 9),
      type: block.id,
      name: `New ${block.name}`,
      sub: block.sub,
      icon: block.icon,
      color: block.color,
      category: block.category,
      url: '',
      goal: block.defaultGoal,
      cta: block.defaultCta,
      notes: '',
      x,
      y,
    };
    setNodes([...nodes, newNode]);
    handleSelectNode(newNode);
    toast.success(`${block.name} added to funnel`);
  };

  const handleApplyChanges = () => {
    if (!editForm) return;
    setNodes(nodes.map(n => n.id === editForm.id ? editForm : n));
    toast.success('Changes applied to node');
  };

  const handleDeleteNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
    setConnections(connections.filter(c => c.from !== id && c.to !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
      setEditForm(null);
    }
    toast.error('Node removed from funnel');
  };

  const handleConnect = (toId: string) => {
    if (!connectingFrom || connectingFrom === toId) {
      setConnectingFrom(null);
      return;
    }
    
    // Prevent duplicate connections
    if (connections.some(c => c.from === connectingFrom && c.to === toId)) {
      setConnectingFrom(null);
      return;
    }

    const newConn: Connection = {
      id: Math.random().toString(36).substr(2, 9),
      from: connectingFrom,
      to: toId
    };
    
    setConnections([...connections, newConn]);
    setConnectingFrom(null);
    toast.success('Nodes connected');
  };

  const dragPositions = React.useRef<{ [key: string]: { x: number, y: number } }>({});
  const dragFrame = React.useRef<number | null>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleDrag = (id: string, info: any) => {
    if (!dragPositions.current[id]) {
      const node = nodes.find(n => n.id === id);
      if (node) dragPositions.current[id] = { x: node.x, y: node.y };
      else return;
    }

    dragPositions.current[id].x += info.delta.x / zoom;
    dragPositions.current[id].y += info.delta.y / zoom;

    if (!dragFrame.current) {
      dragFrame.current = requestAnimationFrame(() => {
        setNodes(prev => prev.map(n => {
          const pos = dragPositions.current[n.id];
          return pos ? { ...n, x: pos.x, y: pos.y } : n;
        }));
        dragFrame.current = null;
      });
    }
  };

  const handleDragEnd = (id: string, info: any) => {
    if (dragFrame.current) {
      cancelAnimationFrame(dragFrame.current);
      dragFrame.current = null;
    }
    
    const finalPos = dragPositions.current[id];
    delete dragPositions.current[id];
    
    setNodes(prev => {
      const updatedNodes = prev.map(n => 
        n.id === id ? { 
          ...n, 
          x: Math.round((finalPos?.x || n.x) / 50) * 50, // Snap to grid
          y: Math.round((finalPos?.y || n.y) / 50) * 50 
        } : n
      );

      // Vertical Snapping Logic: If nodes are close horizontally, snap them to the same column
      const draggedNode = updatedNodes.find(n => n.id === id);
      if (draggedNode) {
        updatedNodes.forEach(other => {
          if (other.id !== id && Math.abs(other.x - draggedNode.x) < 100) {
            draggedNode.x = other.x;
          }
        });
      }

      return updatedNodes;
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (connectingFrom) {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePos({
        x: (e.clientX - rect.left - canvasOffset.x) / zoom,
        y: (e.clientY - rect.top - canvasOffset.y) / zoom
      });
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-surface-container-lowest relative border-t border-outline-variant/10">
      {/* Left Sidebar - Block Library */}
      <motion.aside 
        initial={false}
        animate={{ width: leftSidebarOpen ? 260 : 0, opacity: leftSidebarOpen ? 1 : 0 }}
        className="bg-surface-container-low border-r border-outline-variant/10 flex flex-col overflow-hidden z-30 relative"
      >
        <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-2 mb-8">
            <Layers size={18} className="text-primary" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface">Block Library</h3>
          </div>
          <div className="space-y-3">
            {BLOCK_TEMPLATES.map((block) => (
              <div 
                key={block.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('blockType', block.id)}
                onClick={() => handleAddNode(block)}
                className="group cursor-grab active:cursor-grabbing bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/10 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all flex items-center gap-3"
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shadow-sm",
                  block.color,
                  // Ensure white text is visible on warning/success colors in light mode
                  (block.id === 'upsell' || block.id === 'thank-you') ? "text-white" : "text-white"
                )}>
                  <block.icon size={16} />
                </div>
                <span className="text-[11px] font-black text-on-surface group-hover:text-primary transition-colors">
                  {block.name}
                </span>
              </div>
            ))}
            <button 
              onClick={handleAddCustomNode}
              className="w-full py-4 border-2 border-dashed border-outline-variant/20 rounded-xl flex items-center justify-center gap-2 text-on-surface-variant/40 hover:text-primary hover:border-primary/40 transition-all text-[10px] font-black uppercase tracking-widest mt-4"
            >
              <Plus size={14} />
              Add Custom
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Left Toggle */}
      <button 
        onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
        className="absolute left-[260px] top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-12 bg-surface-container-low border border-outline-variant/10 rounded-full flex items-center justify-center z-40 hover:bg-surface-container transition-all shadow-md group"
        style={{ left: leftSidebarOpen ? 260 : 12 }}
      >
        {leftSidebarOpen ? <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> : <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />}
      </button>

      {/* Main Canvas / Flow Editor */}
      <section 
        className="flex-1 relative bg-surface overflow-hidden cursor-crosshair flex flex-col"
        onMouseMove={handleCanvasMouseMove}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropOnCanvas}
      >
        {/* Editor Toolbar */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 p-1.5 bg-surface-container-lowest/80 backdrop-blur-xl border border-outline-variant/10 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl">
            <button 
              onClick={() => setLayoutMode('canvas')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                layoutMode === 'canvas' ? "bg-primary text-on-primary shadow-lg" : "text-on-surface-variant/60 hover:text-on-surface"
              )}
            >
              <Maximize2 size={14} />
              Canvas
            </button>
            <button 
              onClick={() => setLayoutMode('flow')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                layoutMode === 'flow' ? "bg-primary text-on-primary shadow-lg" : "text-on-surface-variant/60 hover:text-on-surface"
              )}
            >
              <Activity size={14} />
              Flow
            </button>
          </div>
          
          {layoutMode === 'flow' && (
            <div className="h-6 w-px bg-outline-variant/20 mx-1" />
          )}
          
          {layoutMode === 'flow' && (
            <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl">
              <button 
                onClick={() => setFlowDirection('vertical')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  flowDirection === 'vertical' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant/40 hover:text-on-surface"
                )}
                title="Vertical Flow"
              >
                <ArrowDown size={14} />
              </button>
              <button 
                onClick={() => setFlowDirection('horizontal')}
                className={cn(
                  "p-2 rounded-lg transition-all",
                  flowDirection === 'horizontal' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant/40 hover:text-on-surface"
                )}
                title="Horizontal Flow"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          <div className="h-6 w-px bg-outline-variant/20 mx-1" />
          
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant/60 transition-colors"><ZoomOut size={16} /></button>
            <span className="text-[10px] font-black text-on-surface-variant/40 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className="p-2 hover:bg-surface-container rounded-lg text-on-surface-variant/60 transition-colors"><ZoomIn size={16} /></button>
          </div>

          <div className="h-6 w-px bg-outline-variant/20 mx-1" />
          
          <button 
            onClick={() => { setZoom(1); setCanvasOffset({ x: 0, y: 0 }); }}
            className="px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 hover:text-primary hover:bg-primary/5 transition-all flex items-center gap-2"
          >
            <Target size={14} />
            Reset
          </button>
        </div>

        {layoutMode === 'canvas' ? (
          <div className="flex-1 relative overflow-hidden">
            {/* Grid Background */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-[0.1] dark:opacity-[0.05]"
              style={{ 
                backgroundImage: `radial-gradient(circle at 2px 2px, var(--color-outline-variant) 1px, transparent 0)`,
                backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
                backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`
              }}
            />

            {/* Analysis Framework Lanes */}
            <div 
              className="absolute inset-0 flex flex-col pointer-events-none z-0"
              style={{ 
                transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                width: '4000px',
                height: '2000px'
              }}
            >
              {[
                { label: 'Layer 1: Traffic Sources', color: 'border-indigo-500/20 dark:border-indigo-400/10' },
                { label: 'Layer 2: Hook & Content Strategy', color: 'border-primary/20 dark:border-primary/10' },
                { label: 'Layer 3: Landing Page Structure', color: 'border-blue-500/20 dark:border-blue-400/10' },
                { label: 'Layer 4: Offer & Pricing', color: 'border-pink-500/20 dark:border-pink-400/10' },
                { label: 'Layer 5: Backend & Retention', color: 'border-purple-500/20 dark:border-purple-400/10' },
              ].map((lane, idx) => (
                <div key={idx} className={cn("flex-1 border-b flex items-center justify-end pr-12", lane.color)}>
                  <span className="text-[11px] font-black uppercase tracking-[0.5em] text-on-surface-variant/20 dark:text-on-surface-variant/10">{lane.label}</span>
                </div>
              ))}
            </div>

            {/* Canvas Stage */}
            <div className="absolute inset-0 z-10">
              {/* Panning Layer */}
              <motion.div 
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
                drag
                dragMomentum={false}
                onDrag={(e, info) => {
                  setCanvasOffset(prev => ({
                    x: prev.x + info.delta.x,
                    y: prev.y + info.delta.y
                  }));
                }}
              />

              <motion.div 
                className="relative min-w-[4000px] min-h-[2000px] p-40 pointer-events-none"
                style={{ 
                  scale: zoom, 
                  originX: 0, 
                  originY: 0,
                  x: canvasOffset.x,
                  y: canvasOffset.y
                }}
              >
                {/* Connections Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orientation="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
                    </marker>
                    <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                      <stop offset="50%" stopColor="#10b981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                  
                  {connections.map(conn => {
                    const fromNode = nodes.find(n => n.id === conn.from);
                    const toNode = nodes.find(n => n.id === conn.to);
                    if (!fromNode || !toNode) return null;

                    // Orthogonal Connector Logic
                    const startX = fromNode.x + 128;
                    const startY = fromNode.y + 210; // Bottom of upper node
                    const endX = toNode.x + 128;
                    const endY = toNode.y - 10;      // Top of lower node
                    
                    const midY = startY + (endY - startY) / 2;
                    const pathData = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;

                    return (
                      <g key={conn.id} className="group/conn">
                        {/* Background Glow (Hover only) */}
                        <path 
                          d={pathData}
                          stroke="#10b981"
                          strokeWidth="12"
                          fill="none"
                          className="opacity-0 group-hover/conn:opacity-10 transition-opacity blur-md"
                        />

                        {/* Main Orthogonal Wire */}
                        <path 
                          d={pathData}
                          stroke="#10b981"
                          strokeWidth="2"
                          fill="none"
                          className={cn(
                            "transition-all opacity-40 group-hover/conn:opacity-100",
                            highlightedNodeId === fromNode.id || highlightedNodeId === toNode.id ? "opacity-100 stroke-[3px]" : ""
                          )}
                        />

                        {/* Arrowhead at the end */}
                        <path 
                          d={`M ${endX - 5} ${endY} L ${endX + 5} ${endY} L ${endX} ${endY + 8} Z`}
                          fill="#10b981"
                          className="opacity-40 group-hover/conn:opacity-100"
                        />

                        {/* Connection Dots */}
                        <circle cx={startX} cy={startY} r="3" fill="#10b981" className="opacity-60" />
                        
                        {/* Delete Connection Button */}
                        <foreignObject 
                          x={(startX + endX) / 2 - 12} 
                          y={midY - 12} 
                          width="24" 
                          height="24" 
                          className="opacity-0 group-hover/conn:opacity-100 transition-opacity pointer-events-auto"
                        >
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConnections(connections.filter(c => c.id !== conn.id));
                              toast.error('Connection removed');
                            }}
                            className="w-6 h-6 bg-surface-container-lowest border border-outline-variant/20 rounded-full flex items-center justify-center text-outline hover:text-error shadow-lg hover:scale-110 transition-all"
                            title="Remove Connection"
                          >
                            <X size={10} />
                          </button>
                        </foreignObject>
                      </g>
                    );
                  })}

                  {/* Active Connection Line */}
                  {connectingFrom && (() => {
                    const node = nodes.find(n => n.id === connectingFrom)!;
                    const startX = node.x + 128;
                    const startY = node.y + 210;
                    const curEndX = mousePos.x;
                    const curEndY = mousePos.y;
                    const midY = startY + (curEndY - startY) / 2;
                    
                    return (
                      <path 
                        d={`M ${startX} ${startY} L ${startX} ${midY} L ${curEndX} ${midY} L ${curEndX} ${curEndY}`}
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        fill="none"
                        className="animate-pulse"
                      />
                    );
                  })()}
                </svg>

                {/* Nodes Layer */}
                <div className="relative z-20 pointer-events-auto">
                  {nodes.map((node) => (
                    <motion.div 
                      key={node.id}
                      drag
                      dragMomentum={false}
                      dragElastic={0}
                      onDragStart={() => setIsPanning(false)}
                      onDrag={(e, info) => handleDrag(node.id, info)}
                      onDragEnd={(e, info) => handleDragEnd(node.id, info)}
                      initial={false}
                      style={{ x: node.x, y: node.y }}
                      onClick={() => handleSelectNode(node)}
                      className={cn(
                        "absolute w-64 bg-surface-container-lowest rounded-3xl p-6 border-2 shadow-xl cursor-grab active:cursor-grabbing transition-all flex flex-col group",
                        selectedNodeId === node.id || highlightedNodeId === node.id 
                          ? "border-primary ring-4 ring-primary/20 scale-105 shadow-2xl shadow-primary/20 z-20" 
                          : "border-outline-variant/10 hover:border-primary/20 z-10",
                      )}
                    >
                    {/* Icon & Title */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={cn(
                        "w-12 h-12 rounded-[20px] flex items-center justify-center text-white shadow-lg shrink-0",
                        node.color || 'bg-primary'
                      )}>
                        {node.icon ? <node.icon size={24} /> : <Sparkles size={24} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-on-surface text-sm leading-tight mb-1 truncate">{node.name}</h4>
                        <div className={cn(
                          "px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest w-fit",
                          node.category === 'TRAFFIC SOURCE' ? "bg-indigo-500/10 text-indigo-500" :
                          node.category === 'LANDING PAGE' ? "bg-blue-500/10 text-blue-500" :
                          node.category === 'OFFER & PRICING' ? "bg-purple-500/10 text-purple-500" :
                          "bg-emerald-500/10 text-emerald-500"
                        )}>
                          {node.category}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-error/10 hover:text-error rounded-xl transition-all shrink-0 self-start -mr-2 -mt-2"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Subtext */}
                    <div className="mb-4">
                      <p className="text-[10px] text-on-surface-variant/60 font-medium leading-relaxed line-clamp-2">
                        {node.notes || node.goal}
                      </p>
                    </div>

                    {/* Metrics */}
                    {node.metrics && node.metrics.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 pt-4 border-t border-outline-variant/5">
                        {node.metrics.map((m, i) => (
                          <div key={i} className={cn(
                            "p-2 rounded-xl",
                            i === 0 ? "bg-amber-50" : "bg-blue-50"
                          )}>
                            <p className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-0.5">{m.label}</p>
                            <p className={cn(
                              "text-[10px] font-black",
                              i === 0 ? "text-amber-600" : "text-blue-600"
                            )}>{m.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Connection Points - Left & Right */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleConnect(node.id); }}
                      className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-surface-container-lowest border-2 border-primary rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-sm z-30"
                    >
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setConnectingFrom(node.id); }}
                      className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-surface-container-lowest border-2 border-primary rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-sm z-30"
                    >
                      <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", connectingFrom === node.id ? "bg-primary scale-150" : "bg-primary")} />
                    </button>
                  </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-20 relative">
            <motion.div 
              animate={{ scale: zoom }}
              transition={{ duration: 0.2 }}
              style={{ originX: 0.5, originY: 0.5 }}
              className="flex items-center justify-center min-h-full min-w-full"
            >
              <div className={cn("funnel-flow", flowDirection)}>
                {nodes.map((node, idx) => (
                  <React.Fragment key={node.id}>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => handleSelectNode(node)}
                      className={cn(
                        "w-64 bg-surface-container-lowest rounded-3xl p-6 border-2 shadow-xl cursor-pointer transition-all flex flex-col group relative",
                        selectedNodeId === node.id 
                          ? "border-primary ring-4 ring-primary/5" 
                          : "border-outline-variant/10 hover:border-primary/20"
                      )}
                    >
                      {/* Icon & Title */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className={cn(
                          "w-12 h-12 rounded-[20px] flex items-center justify-center text-white shadow-lg shrink-0",
                          node.color || 'bg-primary'
                        )}>
                          {node.icon ? <node.icon size={24} /> : <Sparkles size={24} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-on-surface text-sm leading-tight mb-1 truncate">{node.name}</h4>
                          <div className={cn(
                            "px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest w-fit",
                            node.category === 'TRAFFIC SOURCE' ? "bg-indigo-500/10 text-indigo-500" :
                            node.category === 'LANDING PAGE' ? "bg-blue-500/10 text-blue-500" :
                            node.category === 'OFFER & PRICING' ? "bg-purple-500/10 text-purple-500" :
                            "bg-emerald-500/10 text-emerald-500"
                          )}>
                            {node.category}
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-error/10 hover:text-error rounded-xl transition-all shrink-0 self-start -mr-2 -mt-2"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-2 truncate">{node.sub}</p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/5">
                        <span className="text-[10px] font-black text-primary truncate">{node.cta}</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const newNodes = [...nodes];
                              const index = newNodes.findIndex(n => n.id === node.id);
                              if (index > 0) {
                                [newNodes[index-1], newNodes[index]] = [newNodes[index], newNodes[index-1]];
                                setNodes(newNodes);
                              }
                            }}
                            className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant/40 transition-colors"
                          >
                            {flowDirection === 'vertical' ? <ChevronDown size={14} className="rotate-180" /> : <ChevronLeft size={14} />}
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const newNodes = [...nodes];
                              const index = newNodes.findIndex(n => n.id === node.id);
                              if (index < newNodes.length - 1) {
                                [newNodes[index+1], newNodes[index]] = [newNodes[index], newNodes[index+1]];
                                setNodes(newNodes);
                              }
                            }}
                            className="p-1.5 hover:bg-surface-container rounded-lg text-on-surface-variant/40 transition-colors"
                          >
                            {flowDirection === 'vertical' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                    {idx < nodes.length - 1 && <div className="connector"></div>}
                  </React.Fragment>
                ))}
                <button 
                  onClick={handleAddCustomNode}
                  className={cn(
                    "border-2 border-dashed border-outline-variant/20 rounded-[32px] flex flex-col items-center justify-center gap-2 text-on-surface-variant/40 hover:text-primary hover:border-primary/40 transition-all group",
                    flowDirection === 'vertical' ? "w-64 h-32 mt-8" : "w-32 h-64 ml-8"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Plus size={20} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Add Stage</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </section>

      {/* Right Sidebar - Node Settings */}
      <motion.aside 
        initial={false}
        animate={{ width: rightSidebarOpen ? 320 : 0, opacity: rightSidebarOpen ? 1 : 0 }}
        className="bg-surface-container-lowest border-l border-outline-variant/10 flex flex-col z-30 shadow-[-10px_0_30px_rgba(0,0,0,0.02)] overflow-hidden relative"
      >
        <div className="w-[320px] flex flex-col h-full">
          {selectedNode && editForm ? (
          <>
            <div className="p-6 border-b border-surface-container-low flex justify-between items-center">
              <div>
                <h2 className="text-sm font-extrabold text-on-surface">Node Settings</h2>
                <p className="text-[10px] text-outline font-bold uppercase tracking-wider">{selectedNode.name} Active</p>
              </div>
              <button 
                onClick={() => { setSelectedNodeId(null); setEditForm(null); }}
                className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center text-outline transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              {/* Context-Aware Suggestions */}
              {getSuggestedNext(editForm.category).length > 0 && (
                <div className="space-y-3">
                  <label className="block text-[10px] font-extrabold text-primary uppercase tracking-widest">Suggested Next Stage</label>
                  <div className="grid grid-cols-1 gap-2">
                    {getSuggestedNext(editForm.category).map(template => (
                      <button 
                        key={template.id}
                        onClick={() => handleAddNode(template)}
                        className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/10 rounded-xl hover:bg-primary/10 transition-all text-left group"
                      >
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", template.color)}>
                          <template.icon size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-on-surface">{template.name}</p>
                          <p className="text-[8px] text-on-surface-variant/60 font-bold uppercase tracking-tighter">Add to Funnel</p>
                        </div>
                        <Plus size={14} className="ml-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stage Name */}
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Stage Name</label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none text-on-surface" 
                />
              </div>

              {/* Category Specific Config */}
              {editForm.type === 'paid-ads' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Platform</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.platform || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, platform: e.target.value } })}
                    >
                      <option value="Meta">Meta</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Google">Google</option>
                      <option value="YouTube">YouTube</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Monthly Budget</label>
                    <input 
                      type="text" 
                      placeholder="$5,000"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.budget || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, budget: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">CTR (%)</label>
                    <input 
                      type="text" 
                      placeholder="1.5%"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.ctr || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, ctr: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, status: e.target.value } })}
                    >
                      <option value="Live">Live</option>
                      <option value="Paused">Paused</option>
                      <option value="Not set up">Not set up</option>
                    </select>
                  </div>
                </div>
              )}

              {editForm.type === 'organic-content' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Platform</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.platform || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, platform: e.target.value } })}
                    >
                      <option value="Instagram">Instagram</option>
                      <option value="TikTok">TikTok</option>
                      <option value="YouTube">YouTube</option>
                      <option value="LinkedIn">LinkedIn</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Handle / URL</label>
                    <input 
                      type="text" 
                      placeholder="@username"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.url || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, url: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Frequency</label>
                    <input 
                      type="text" 
                      placeholder="3x / week"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.frequency || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, frequency: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, status: e.target.value } })}
                    >
                      <option value="Consistent">Consistent</option>
                      <option value="Inconsistent">Inconsistent</option>
                      <option value="Not posting">Not posting</option>
                    </select>
                  </div>
                </div>
              )}

              {editForm.type === 'hook' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Hook Type</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.hookType || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, hookType: e.target.value } })}
                    >
                      <option value="Pain">Pain</option>
                      <option value="Curiosity">Curiosity</option>
                      <option value="Claim">Claim</option>
                      <option value="Story">Story</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Format</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.format || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, format: e.target.value } })}
                    >
                      <option value="Video">Video</option>
                      <option value="Caption">Caption</option>
                      <option value="Ad copy">Ad copy</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Hook Text / URL</label>
                    <textarea 
                      rows={3}
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none"
                      value={editForm.config?.hookText || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, hookText: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, status: e.target.value } })}
                    >
                      <option value="Strong">Strong</option>
                      <option value="Weak">Weak</option>
                      <option value="Missing">Missing</option>
                    </select>
                  </div>
                </div>
              )}

              {editForm.type === 'vsl' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Video URL</label>
                    <input 
                      type="text" 
                      placeholder="https://youtube.com/..."
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.videoUrl || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, videoUrl: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Video Length</label>
                    <input 
                      type="text" 
                      placeholder="12:45"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.length || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, length: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Type</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.type || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, type: e.target.value } })}
                    >
                      <option value="VSL">VSL</option>
                      <option value="Testimonial">Testimonial</option>
                      <option value="Demo">Demo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, status: e.target.value } })}
                    >
                      <option value="Live">Live</option>
                      <option value="Draft">Draft</option>
                      <option value="Missing">Missing</option>
                    </select>
                  </div>
                </div>
              )}

              {editForm.type === 'landing-page' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Page URL</label>
                    <input 
                      type="text" 
                      placeholder="https://..."
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.url || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, url: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Headline Text</label>
                    <textarea 
                      rows={2}
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none"
                      value={editForm.config?.headline || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, headline: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">CTA Text</label>
                    <input 
                      type="text" 
                      placeholder="Get Started"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.cta || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, cta: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, status: e.target.value } })}
                    >
                      <option value="Live">Live</option>
                      <option value="Weak">Weak</option>
                      <option value="Missing">Missing</option>
                    </select>
                  </div>
                </div>
              )}

              {editForm.type === 'opt-in' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Number of Fields</label>
                    <input 
                      type="number" 
                      placeholder="2"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.fields || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, fields: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Offer</label>
                    <input 
                      type="text" 
                      placeholder="Free PDF Guide"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.offer || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, offer: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, status: e.target.value } })}
                    >
                      <option value="Live">Live</option>
                      <option value="High friction">High friction</option>
                      <option value="Missing">Missing</option>
                    </select>
                  </div>
                </div>
              )}

              {editForm.type === 'sales-page' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Page URL</label>
                    <input 
                      type="text" 
                      placeholder="https://..."
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.url || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, url: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Offer Name + Price</label>
                    <input 
                      type="text" 
                      placeholder="Growth OS - $997"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.offer || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, offer: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Guarantee</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.guarantee || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, guarantee: e.target.value } })}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, status: e.target.value } })}
                    >
                      <option value="Live">Live</option>
                      <option value="Weak">Weak</option>
                      <option value="Missing">Missing</option>
                    </select>
                  </div>
                </div>
              )}

              {editForm.type === 'upsell' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Offer Name + Price</label>
                    <input 
                      type="text" 
                      placeholder="VIP Coaching - $497"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.offer || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, offer: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Type</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.type || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, type: e.target.value } })}
                    >
                      <option value="Bump">Bump</option>
                      <option value="Post-purchase upsell">Post-purchase upsell</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, status: e.target.value } })}
                    >
                      <option value="Live">Live</option>
                      <option value="Missing">Missing</option>
                    </select>
                  </div>
                </div>
              )}

              {editForm.type === 'thank-you' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Page URL</label>
                    <input 
                      type="text" 
                      placeholder="https://..."
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.url || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, url: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Next Step Shown</label>
                    <input 
                      type="text" 
                      placeholder="Join Community"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.nextStep || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, nextStep: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">OTO Present</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.oto || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, oto: e.target.value } })}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, status: e.target.value } })}
                    >
                      <option value="Live">Live</option>
                      <option value="Dead end">Dead end</option>
                      <option value="Missing">Missing</option>
                    </select>
                  </div>
                </div>
              )}

              {editForm.type === 'email' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Sequence Name</label>
                    <input 
                      type="text" 
                      placeholder="Indoctrination"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, name: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Number of Emails</label>
                    <input 
                      type="number" 
                      placeholder="7"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.count || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, count: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Trigger</label>
                    <input 
                      type="text" 
                      placeholder="Opt-in"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.trigger || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, trigger: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, status: e.target.value } })}
                    >
                      <option value="Live">Live</option>
                      <option value="Draft">Draft</option>
                      <option value="Missing">Missing</option>
                    </select>
                  </div>
                </div>
              )}

              {editForm.type === 'sales-call' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Booking Link</label>
                    <input 
                      type="text" 
                      placeholder="https://calendly.com/..."
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.link || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, link: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Qualification Criteria</label>
                    <textarea 
                      rows={2}
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none"
                      value={editForm.config?.criteria || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, criteria: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, status: e.target.value } })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              )}

              {editForm.type === 'post-purchase' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Delivery Method</label>
                    <input 
                      type="text" 
                      placeholder="Email + Portal"
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.delivery || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, delivery: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Support Link</label>
                    <input 
                      type="text" 
                      placeholder="https://..."
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.support || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, support: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Status</label>
                    <select 
                      className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      value={editForm.config?.status || ''}
                      onChange={(e) => setEditForm({ ...editForm, config: { ...editForm.config, status: e.target.value } })}
                    >
                      <option value="Live">Live</option>
                      <option value="Not set up">Not set up</option>
                    </select>
                  </div>
                </div>
              )}
              
              {/* URL Input */}
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Destination URL</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-outline">titanleap.app/</span>
                  <input 
                    type="text" 
                    value={editForm.url} 
                    onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                    className="w-full bg-surface-container-low border-none rounded-xl pl-24 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none text-on-surface" 
                  />
                </div>
              </div>
              
              {/* Goal */}
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Primary Goal</label>
                <textarea 
                  rows={3}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none text-on-surface"
                  value={editForm.goal}
                  onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}
                />
              </div>
              
              {/* CTA */}
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Main CTA Text</label>
                <input 
                  type="text" 
                  value={editForm.cta} 
                  onChange={(e) => setEditForm({ ...editForm, cta: e.target.value })}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none text-on-surface" 
                />
              </div>
              
              {/* Team Notes */}
              <div className="space-y-2">
                <label className="block text-[10px] font-extrabold text-outline uppercase tracking-widest">Internal Team Notes</label>
                <textarea 
                  rows={4}
                  placeholder="Add context for your team..."
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none text-on-surface"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>
            </div>
            
            {/* Footer Actions */}
            <div className="p-6 bg-surface-container-low/50 border-t border-surface-container-low flex gap-3">
              <button 
                onClick={() => { setEditForm({ ...selectedNode }); }}
                className="flex-1 py-3 px-4 bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-bold text-xs rounded-xl shadow-sm hover:bg-surface-container-low transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleApplyChanges}
                className="flex-1 py-3 px-4 bg-primary text-white font-bold text-xs rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
              >
                Apply Changes
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-surface-container-low flex items-center justify-center text-outline-variant">
              <Settings size={32} />
            </div>
            <div>
              <h3 className="text-sm font-black text-on-surface">No Node Selected</h3>
              <p className="text-xs text-outline font-medium mt-1">Select a stage on the canvas to configure its settings and goals.</p>
            </div>
          </div>
        )}
        </div>
      </motion.aside>

      {/* Right Toggle */}
      <button 
        onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
        className="absolute right-[320px] top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-12 bg-surface-container-low border border-outline-variant/10 rounded-full flex items-center justify-center z-40 hover:bg-surface-container transition-all shadow-md group"
        style={{ right: rightSidebarOpen ? 320 : 12 }}
      >
        {rightSidebarOpen ? <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" /> : <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />}
      </button>

      {/* Floating Canvas Controls removed as per request, Reset moved to top */}
    </div>
  );
};

// --- Audit View (Image 4) ---
interface FunnelsPlusViewProps {
  result: FunnelsPlusResult | null;
  onAuditComplete: (result: FunnelsPlusResult) => void;
  intakeData: BusinessIntake | null;
}

const FunnelsPlusView: React.FC<FunnelsPlusViewProps> = ({ result, onAuditComplete, intakeData }) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [formData, setFormData] = useState({
    landingPageUrl: '',
    middleStepUrls: '',
    thankYouPageUrl: '',
    trafficSource: '',
    conversionGoal: ''
  });

  const handleRunAudit = async () => {
    if (!formData.landingPageUrl) {
      toast.error("Please enter at least a landing page URL.");
      return;
    }

    setIsAuditing(true);
    try {
      const auditResult = await auditMarketingFunnel({ ...formData, ...(intakeData || {}) });
      if (auditResult) {
        onAuditComplete(auditResult);
        toast.success("Audit analysis complete!");
      } else {
        toast.error("Failed to generate audit. Please try again.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during the audit.");
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      {/* Left Sidebar - Configuration */}
      <div className="lg:col-span-4 space-y-8">
        <div className="bg-surface-container-lowest rounded-[32px] p-8 border border-outline-variant/10 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Settings size={20} />
              </div>
              <h3 className="text-lg font-black text-on-surface">Audit Config</h3>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Landing Page URL</label>
              <input 
                type="text" 
                placeholder="https://titanleap.io/offer" 
                value={formData.landingPageUrl}
                onChange={e => setFormData({...formData, landingPageUrl: e.target.value})}
                className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Middle Step URLs (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g., /checkout, /quiz" 
                value={formData.middleStepUrls}
                onChange={e => setFormData({...formData, middleStepUrls: e.target.value})}
                className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Thank You Page URL</label>
              <input 
                type="text" 
                placeholder="https://titanleap.io/success" 
                value={formData.thankYouPageUrl}
                onChange={e => setFormData({...formData, thankYouPageUrl: e.target.value})}
                className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Traffic Source (Optional)</label>
              <select 
                value={formData.trafficSource}
                onChange={e => setFormData({...formData, trafficSource: e.target.value})}
                className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none appearance-none" 
              >
                <option value="">Select source...</option>
                <option value="Email">Email</option>
                <option value="Paid Ads">Paid Ads</option>
                <option value="Organic">Organic</option>
                <option value="Affiliates">Affiliates</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Conversion Goal (Optional)</label>
              <select 
                value={formData.conversionGoal}
                onChange={e => setFormData({...formData, conversionGoal: e.target.value})}
                className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none appearance-none" 
              >
                <option value="">Select goal...</option>
                <option value="Email Opt-in">Email Opt-in</option>
                <option value="Phone Number">Phone Number</option>
                <option value="Purchase">Purchase</option>
                <option value="Demo Booking">Demo Booking</option>
              </select>
            </div>

            <button 
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="w-full py-4 bg-primary text-on-primary font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {isAuditing ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
              {isAuditing ? 'Analyzing Funnel...' : 'Analyse My Funnel Plus'}
              <span className="px-2 py-0.5 bg-white/20 text-white rounded-md text-[10px] font-black uppercase tracking-widest shrink-0">Ultra</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Column - Results */}
      <div className="lg:col-span-8">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full min-h-[600px] bg-surface-container-lowest rounded-[48px] border border-dashed border-outline-variant/30 flex flex-col items-center justify-center p-12 text-center"
            >
              <div className="w-24 h-24 rounded-[32px] bg-surface-container-low flex items-center justify-center text-on-surface-variant/20 mb-6">
                <BarChart3 size={48} />
              </div>
              <h4 className="text-2xl font-display font-black text-on-surface tracking-tight mb-2">Awaiting Analysis</h4>
              <p className="text-sm font-medium text-on-surface-variant/40 max-w-xs">
                Configure your funnel endpoints to generate a high-performance revenue roadmap.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Priority & Traffic Fit */}
              <div className="bg-primary rounded-[48px] p-12 text-on-primary relative overflow-hidden shadow-2xl shadow-primary/20">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">#1 Priority Fix</p>
                    <h3 className="text-4xl font-display font-black tracking-tighter leading-tight">{result.priority}</h3>
                  </div>
                  <div className="flex flex-col items-start justify-center p-8 bg-white/5 backdrop-blur-xl rounded-[40px] border border-white/10 space-y-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Traffic Fit</p>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                        result.traffic_fit.toLowerCase().includes('optimized') ? "bg-[#00ff85]/20 text-[#00ff85]" :
                        result.traffic_fit.toLowerCase().includes('partial') ? "bg-warning/20 text-warning" : "bg-error/20 text-error"
                      )}>
                        <Target size={24} />
                      </div>
                      <span className="text-2xl font-black capitalize">{result.traffic_fit}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Landing Page Scores */}
              <div className="bg-surface-container-lowest rounded-[48px] p-12 border border-outline-variant/10 shadow-sm">
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Layout size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black text-on-surface tracking-tight">Landing Page Evaluation</h3>
                    <p className="text-sm text-on-surface-variant/40">Core conversion elements scored out of 10</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(result.landing_page_scores || {}).map(([key, data]) => (
                    <div key={key} className="p-6 bg-surface-container-low rounded-3xl border border-outline-variant/5 space-y-4">
                      <div className="flex justify-between items-center">
                        <h5 className="text-sm font-black text-on-surface capitalize">{key.replace('_', ' ')}</h5>
                        <div className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black",
                          data.score >= 8 ? "bg-success/10 text-success" :
                          data.score >= 5 ? "bg-warning/10 text-warning" : "bg-error/10 text-error"
                        )}>
                          {data.score}/10
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex gap-2 items-start">
                          <AlertCircle size={14} className="text-error shrink-0 mt-0.5" />
                          <p className="text-xs font-medium text-on-surface-variant/80">{data.issue}</p>
                        </div>
                        <div className="flex gap-2 items-start">
                          <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
                          <p className="text-xs font-medium text-on-surface-variant/80">{data.fix}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Funnel Flow & Friction */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-surface-container-lowest rounded-[40px] p-10 border border-outline-variant/10 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                      <TrendingFlat size={20} />
                    </div>
                    <h4 className="text-xl font-black text-on-surface">Funnel Steps</h4>
                  </div>
                  <div className="space-y-4">
                    {(result.funnel_steps || []).map((step, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-black text-on-surface-variant">
                          {idx + 1}
                        </div>
                        <p className="text-sm font-medium text-on-surface">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-[40px] p-10 border border-outline-variant/10 shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error">
                      <AlertTriangle size={20} />
                    </div>
                    <h4 className="text-xl font-black text-on-surface">Friction Points</h4>
                  </div>
                  <ul className="space-y-3">
                    {(result.friction_points || []).map((point, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm font-medium text-on-surface-variant/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-error mt-2 shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Top Killers */}
              <div className="bg-surface-container-lowest rounded-[48px] p-12 border border-outline-variant/10 shadow-sm">
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center text-error">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black text-on-surface tracking-tight">Top Conversion Killers</h3>
                    <p className="text-sm text-on-surface-variant/40">The biggest leaks in your funnel</p>
                  </div>
                </div>
                <div className="space-y-6">
                  {(result.top_killers || []).map((killer, idx) => (
                    <div key={idx} className="p-8 bg-surface-container-low rounded-3xl border border-outline-variant/5 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                      <div className="md:col-span-1 text-4xl font-black text-error/20 italic">
                        0{killer.rank || idx + 1}
                      </div>
                      <div className="md:col-span-8 space-y-3">
                        <h5 className="text-lg font-black text-on-surface">{killer.problem}</h5>
                        <p className="text-sm text-on-surface-variant/80 leading-relaxed">{killer.why}</p>
                        <div className="pt-3 border-t border-outline-variant/10">
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Exact Fix</p>
                          <p className="text-sm font-medium text-on-surface">{killer.fix}</p>
                        </div>
                      </div>
                      <div className="md:col-span-3 bg-surface-container-highest/30 rounded-2xl p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-1">Impact</p>
                        <p className="text-2xl font-black text-error">{killer.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Wins */}
              <div className="bg-surface-container-lowest rounded-[48px] p-12 border border-outline-variant/10 shadow-sm">
                <div className="flex items-center gap-3 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center text-success">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-display font-black text-on-surface tracking-tight">Quick Wins (This Week)</h3>
                    <p className="text-sm text-on-surface-variant/40">Low effort, high impact changes</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(result.quick_wins || []).map((win, idx) => (
                    <div key={idx} className="p-8 bg-surface-container-low rounded-3xl border border-outline-variant/5 space-y-6">
                      <div className="flex justify-between items-start">
                        <h5 className="text-base font-black text-on-surface pr-4">{win.win}</h5>
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shrink-0",
                          (win.effort || '').toLowerCase() === 'low' ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        )}>
                          {win.effort} Effort
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Implementation Steps</p>
                        <ul className="space-y-2">
                          {(win.steps || []).map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs font-medium text-on-surface-variant/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 border-t border-outline-variant/10 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Impact Potential</span>
                        <span className="text-sm font-black text-success">{win.impact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button 
                  onClick={() => toast.success("Audit report exported successfully!")}
                  className="flex-1 py-5 bg-surface-container-low text-on-surface font-black rounded-2xl text-xs uppercase tracking-widest border border-outline-variant/10 flex items-center justify-center gap-3 hover:bg-surface-container transition-all"
                >
                  <Download size={18} />
                  Export Audit Report
                </button>
                <button 
                  onClick={() => toast.info("Opening Funnel Editor with suggested fixes...")}
                  className="flex-1 py-5 bg-primary text-on-primary font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 hover:brightness-110 transition-all"
                >
                  <Zap size={18} fill="currentColor" />
                  Apply Fixes in Editor
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Competitor Card Component ---
// --- Competitor Card Component ---
const CompetitorCard = ({ analysis, isFullWidth = false }: { analysis: CompetitorAnalysis, isFullWidth?: boolean }) => {
  const [activeTab, setActiveTab] = useState<'funnel' | 'strategy' | 'steal' | 'edge'>('funnel');

  return (
    <div className={cn(
      "bg-surface-container-lowest rounded-[48px] border border-outline-variant/10 shadow-sm overflow-hidden flex flex-col",
      isFullWidth ? "lg:flex-row lg:min-h-[750px] lg:max-h-[850px]" : "h-full min-h-[600px]"
    )}>
      {/* Sidebar / Header Section */}
      <div className={cn(
        "bg-surface-container-low/30 flex flex-col",
        isFullWidth ? "lg:w-[320px] lg:border-r border-outline-variant/5" : "border-b border-outline-variant/5"
      )}>
        {/* Profile Header */}
        <div className="p-8 pb-6">
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <Globe size={28} />
              </div>
              <div className={cn(
                "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm",
                analysis.profile.strength === 'Elite' ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary/10 text-secondary border-secondary/20"
              )}>
                {analysis.profile.strength}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-3xl font-display font-black text-on-surface tracking-tight leading-[1.1]">
                {analysis.profile.name}
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/70 leading-relaxed">{analysis.profile.niche}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary/40" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-secondary/70 leading-relaxed">{analysis.profile.audienceSize} Audience</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className={cn(
            "flex items-center gap-4 overflow-x-auto no-scrollbar pb-2",
            isFullWidth ? "lg:flex-col lg:items-stretch lg:gap-1 lg:pb-0" : ""
          )}>
            {(['funnel', 'strategy', 'steal', 'edge'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em] transition-all relative py-2 px-1 whitespace-nowrap text-left group",
                  activeTab === tab ? "text-secondary" : "text-on-surface-variant/40 hover:text-on-surface",
                  isFullWidth ? "lg:px-4 lg:py-3 lg:rounded-xl lg:hover:bg-surface-container-high/50" : ""
                )}
              >
                <span className="relative z-10">
                  {tab === 'funnel' ? 'Funnel Map' : 
                   tab === 'strategy' ? 'Strategy' : 
                   tab === 'steal' ? 'Steal This' : 'The Edge'}
                </span>
                {activeTab === tab && (
                  <motion.div 
                    layoutId={`activeCompetitorTab-${analysis.profile.name}`}
                    className={cn(
                      "absolute bg-secondary",
                      isFullWidth ? "lg:left-0 lg:top-3 lg:bottom-3 lg:w-1 lg:h-auto lg:right-auto lg:rounded-full" : "bottom-0 left-0 right-0 h-0.5"
                    )}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Quick Stats (Full Width Only) */}
        {isFullWidth && (
          <div className="hidden lg:block p-8 pt-4 mt-auto">
            <div className="bg-surface-container-high/20 rounded-3xl p-6 border border-outline-variant/5">
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/30 mb-4">Market Benchmarks</p>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-on-surface-variant/60">Est. Revenue</span>
                  <span className="text-xs font-black text-on-surface">$250k - $500k</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-on-surface-variant/60">Ad Spend</span>
                  <span className="text-xs font-black text-on-surface">$15k - $30k</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface-container-lowest">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-3xl mx-auto"
            >
              {activeTab === 'funnel' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40">Revenue Architecture</h4>
                    <span className="text-[10px] font-bold text-on-surface-variant/30">{analysis.map.length} Stages Identified</span>
                  </div>
                  <div className="space-y-3">
                    {analysis.map.map((step, idx) => (
                      <React.Fragment key={idx}>
                        <div className="bg-surface-container-low/50 rounded-2xl p-5 border border-outline-variant/5 flex items-center justify-between group hover:border-secondary/20 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-secondary">
                              {idx === 0 && <Megaphone size={18} />}
                              {idx === 1 && <Target size={18} />}
                              {idx === 2 && <Layout size={18} />}
                              {idx === 3 && <ShoppingBag size={18} />}
                              {idx === 4 && <Mail size={18} />}
                              {idx >= 5 && <ArrowDown size={18} />}
                            </div>
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">{step.stage}</p>
                              <h5 className="text-xs font-black text-on-surface">{step.platform}</h5>
                            </div>
                          </div>
                          <div className={cn(
                            "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                            step.strength === 'Strong' ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                          )}>
                            {step.strength}
                          </div>
                        </div>
                        {idx < analysis.map.length - 1 && (
                          <div className="flex justify-center text-on-surface-variant/10 py-1">
                            <ArrowDown size={16} />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'strategy' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40">Strategic Deep Dive</h4>
                    <div className="space-y-4">
                      {analysis.deepBreakdown.map((item, idx) => (
                        <div key={idx} className="bg-surface-container-low/50 rounded-2xl p-6 border border-outline-variant/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-black text-on-surface tracking-tight">{item.stage}</h5>
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Effectiveness: {item.effectiveness}</span>
                          </div>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">The Strategy</p>
                              <p className="text-xs font-medium text-on-surface-variant/70 leading-relaxed">{item.whatTheyDo}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">Why it converts</p>
                              <p className="text-xs font-medium text-on-surface-variant/70 leading-relaxed">{item.whyItWorks}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40">Dangerous Traits</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {analysis.dangerousTraits.map((trait, idx) => (
                        <div key={idx} className="bg-error/5 rounded-2xl p-5 border border-error/10 flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
                            <AlertCircle size={20} />
                          </div>
                          <div className="space-y-1">
                            <h5 className="text-xs font-black text-on-surface tracking-tight">{trait.trait}</h5>
                            <p className="text-[11px] font-medium text-on-surface-variant/70 leading-relaxed">{trait.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'steal' && (
                <div className="space-y-6">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40">Winning Tactics to Apply</h4>
                  <div className="space-y-4">
                    {analysis.actionPlan.map((action, idx) => (
                      <div key={idx} className="bg-surface-container-low/50 rounded-3xl p-6 border border-outline-variant/5 space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-black text-xs">
                            {idx + 1}
                          </div>
                          <h5 className="text-sm font-black text-on-surface tracking-tight">{action.whatTheyDo}</h5>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">Why it works</p>
                            <p className="text-xs font-medium text-on-surface-variant/70 leading-relaxed">{action.whyItWorks}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-secondary">How to apply</p>
                            <p className="text-xs font-black text-on-surface leading-relaxed">{action.howToApply}</p>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-outline-variant/5 flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Expected Impact</span>
                          <span className="text-xs font-black text-success">{action.expectedImpact}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'edge' && (
                <div className="space-y-6">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40">The Edge — Gaps to Exploit</h4>
                  <div className="space-y-4">
                    {analysis.competitiveEdge?.map((item, idx) => (
                      <div key={idx} className="bg-surface-container-low/50 rounded-3xl p-6 border border-outline-variant/5 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest",
                            item.difficulty === 'Low' ? "bg-success/10 text-success" :
                            item.difficulty === 'Medium' ? "bg-warning/10 text-warning" : "bg-error/10 text-error"
                          )}>
                            {item.difficulty} Effort
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
                            <Zap size={20} />
                          </div>
                          <h5 className="text-sm font-black text-on-surface tracking-tight pr-16">{item.gap}</h5>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[8px] font-black uppercase tracking-widest text-primary">Your Advantage</p>
                          <p className="text-xs font-medium text-on-surface-variant/70 leading-relaxed">{item.advantage}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Section */}
        <div className="border-t border-outline-variant/5 bg-surface-container-low/30">
          <div className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {analysis.profile.platforms.map((p, i) => (
                  <div key={p} className="w-8 h-8 rounded-full bg-surface-container-high border-2 border-surface-container-lowest flex items-center justify-center text-on-surface-variant/60 z-[10-i]">
                    {p === 'Instagram' && <Instagram size={14} />}
                    {p === 'YouTube' && <Youtube size={14} />}
                    {p === 'Twitter' && <Globe size={14} />}
                    {p !== 'Instagram' && p !== 'YouTube' && p !== 'Twitter' && <Globe size={14} />}
                  </div>
                ))}
              </div>
              <button 
                onClick={() => toast.info("Full competitor report coming soon!")}
                className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2 hover:gap-3 transition-all"
              >
                Full Report <ArrowRight size={14} />
              </button>
            </div>

            {analysis.sources && analysis.sources.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 justify-end max-w-[50%]">
                <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/30 mr-1">Sources:</span>
                {analysis.sources.slice(0, 3).map((source, i) => (
                  <a 
                    key={i} 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title={source.title}
                    className="px-2 py-0.5 bg-surface-container-high/50 hover:bg-primary/10 hover:text-primary rounded-md text-[8px] font-bold text-on-surface-variant/60 transition-all flex items-center gap-1"
                  >
                    <Globe size={8} />
                    <span className="max-w-[80px] truncate">{source.title}</span>
                  </a>
                ))}
                {analysis.sources.length > 3 && (
                  <span className="text-[8px] font-bold text-on-surface-variant/40">+{analysis.sources.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Competitor Funnels View ---
const CompetitorFunnelsView = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [analyses, setAnalyses] = useState<CompetitorAnalysis[]>([]);

  const handleAnalyze = async () => {
    if (!competitorUrl) {
      toast.error("Please enter a competitor URL or profile.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeCompetitorFunnel(competitorUrl);
      if (result) {
        setAnalyses(prev => [result, ...prev]);
        setCompetitorUrl('');
        toast.success("Competitor analysis complete!");
      } else {
        toast.error("Failed to analyze competitor. Please try again.");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Search Header */}
      <div className="bg-surface-container-lowest rounded-[48px] p-12 border border-outline-variant/10 shadow-2xl shadow-primary/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-secondary/10 transition-all duration-700" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 group-hover:bg-primary/10 transition-all duration-700" />
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary shadow-inner">
                <Search size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-secondary">Intelligence Engine</span>
            </div>
            <h3 className="text-5xl font-display font-black text-on-surface tracking-tighter leading-[0.9]">
              Reverse-Engineer <br />
              <span className="text-on-surface-variant/40 italic serif">The Competition.</span>
            </h3>
            <p className="text-sm font-medium text-on-surface-variant/50 max-w-md leading-relaxed">
              Enter any URL or social handle. Our AI will dissect their funnel, identify their tech stack, and find the gaps in their strategy.
            </p>
          </div>
          
          <div className="flex items-center gap-6 pb-2">
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/30">Active Scans</p>
              <p className="text-2xl font-display font-black text-on-surface">1,240+</p>
            </div>
            <div className="w-px h-10 bg-outline-variant/10" />
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/30">Data Points</p>
              <p className="text-2xl font-display font-black text-on-surface">45.8k</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 relative z-10">
          <div className="flex-1 relative group/input">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within/input:text-secondary transition-colors">
              <Globe size={20} />
            </div>
            <input 
              type="text" 
              placeholder="Paste competitor URL or social handle..." 
              value={competitorUrl}
              onChange={e => setCompetitorUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              className="w-full bg-surface-container-low border border-outline-variant/10 rounded-3xl p-6 pl-16 text-lg font-bold focus:ring-4 focus:ring-secondary/10 transition-all outline-none text-on-surface placeholder:text-on-surface-variant/20" 
            />
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-secondary text-on-secondary px-12 py-6 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4 group/btn"
          >
            {isAnalyzing ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} className="group-hover/btn:rotate-12 transition-transform" />}
            {isAnalyzing ? 'Decoding Funnel...' : 'Analyse Competitor'}
            <span className="px-2 py-0.5 bg-white/20 text-white rounded-md text-[10px] font-black uppercase tracking-widest shrink-0">Pro</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {analyses.length === 0 && !isAnalyzing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Placeholder Cards */}
            {[
              { name: 'Competitor Intelligence', tag: 'READY', icon: Target, color: 'text-primary', niche: 'B2B SaaS / Agency' },
              { name: 'Market Benchmarks', tag: 'READY', icon: BarChart3, color: 'text-secondary', niche: 'E-commerce / Coaching' }
            ].map(item => (
              <div key={item.name} className="bg-surface-container-lowest rounded-[48px] border border-outline-variant/10 overflow-hidden group hover:border-secondary/30 transition-all cursor-pointer">
                <div className="p-10 border-b border-outline-variant/5 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className={cn("w-16 h-16 rounded-[24px] bg-surface-container-high flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform", item.color)}>
                      <item.icon size={32} />
                    </div>
                    <div>
                      <h5 className="text-xl font-black text-on-surface tracking-tight">{item.name}</h5>
                      <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">{item.niche} • Waiting for URL</p>
                    </div>
                  </div>
                  <span className="px-4 py-1.5 bg-surface-container-high text-on-surface-variant/40 rounded-xl text-[10px] font-black uppercase tracking-widest">{item.tag}</span>
                </div>
                <div className="p-12 flex flex-col items-center justify-center text-on-surface-variant/10 space-y-4">
                  <Globe size={80} strokeWidth={1} />
                  <p className="text-xs font-black uppercase tracking-[0.3em]">Enter URL Above</p>
                </div>
              </div>
            ))}
          </div>
        ) : isAnalyzing ? (
          <div className="h-[400px] flex flex-col items-center justify-center space-y-6 bg-surface-container-lowest rounded-[48px] border border-outline-variant/10 shadow-inner">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-secondary/10 border-t-secondary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-secondary">
                <Sparkles size={32} />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h4 className="text-2xl font-display font-black text-on-surface tracking-tight">Reverse-Engineering Funnel</h4>
              <p className="text-sm font-medium text-on-surface-variant/40 max-w-xs mx-auto">TitanLeap AI is scanning social signals, ad libraries, and landing page structures...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            <div className={cn(
              "grid gap-8",
              analyses.length === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
            )}>
              {analyses.map((analysis, idx) => (
                <motion.div
                  key={analysis.profile.name + idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <CompetitorCard analysis={analysis} isFullWidth={analyses.length === 1} />
                </motion.div>
              ))}
            </div>

            {/* Market Intelligence Overview */}
            <div className="bg-surface-container-low/50 rounded-[48px] p-12 border border-outline-variant/10">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-2xl font-display font-black text-on-surface tracking-tight">Market Intelligence Overview</h3>
                  <p className="text-sm text-on-surface-variant/60">Aggregate insights from your competitor landscape</p>
                </div>
                <button 
                  onClick={() => toast.success("Market intelligence report exported successfully!")}
                  className="text-primary text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
                >
                  Export Report <ArrowRight size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-surface-container-lowest rounded-[32px] p-8 border border-outline-variant/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-4">Average Traffic Strength</p>
                  <div className="text-4xl font-display font-black text-on-surface mb-4">84/100</div>
                  <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '84%' }} />
                  </div>
                </div>
                <div className="bg-surface-container-lowest rounded-[32px] p-8 border border-outline-variant/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-4">Primary Offer Type</p>
                  <div className="text-2xl font-display font-black text-on-surface mb-2">Low Ticket Tripwire</div>
                  <div className="flex items-center gap-2 text-xs font-bold text-primary">
                    <CheckCircle2 size={14} />
                    Found in 65% of competitors
                  </div>
                </div>
                <div className="bg-surface-container-lowest rounded-[32px] p-8 border border-outline-variant/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-4">Lead Magnet Trends</p>
                  <div className="text-2xl font-display font-black text-on-surface mb-2">Interactive Quizzes</div>
                  <div className="px-3 py-1 bg-success/10 text-success rounded-lg text-[9px] font-black uppercase tracking-widest inline-block">Growing Fast</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
