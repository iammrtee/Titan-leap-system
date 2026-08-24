import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Circle, 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  Layout, 
  Mail, 
  Target, 
  DollarSign, 
  Download, 
  Share2, 
  ArrowRight,
  Plus,
  X,
  Globe,
  Briefcase,
  History,
  Users,
  BarChart3,
  Rocket,
  Megaphone,
  FileText,
  MousePointer2,
  HelpCircle,
  Trash2,
  FileCode2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { auditLandingPage, smartFillForm, getAIEngine, setAIEngine, type AIEngine } from '@/src/services/ai';
import { supabase } from '@/src/services/supabase';
import { toast } from 'sonner';
import { Sparkles, Wand2, Loader2, FileDown, Printer, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { Logo } from './Logo';
import { StrategyHub } from './StrategyHub';

interface FormData {
  // Section 1
  businessName: string;
  email: string;
  industry: string;
  websiteUrl: string;
  businessDuration: string;
  // Section 2
  primaryPlatform: string;
  socialHandles: string[];
  monthlyReach: string;
  postingConsistently: 'Yes' | 'No' | 'Sometimes';
  // Section 3
  mainOffer: string;
  pricePoint: string;
  currency: string;
  hasUpsell: boolean;
  upsellDetails: string;
  differentiator: string;
  conversionRate: string;
  // Section 4
  currentRevenue: string;
  targetRevenue: string;
  pricingPageUrl: string;
  timeline: string;
  challenges: string[];
  // Section 5
  hasLandingPage: boolean;
  landingPageUrl: string;
  hasThankYouPage: boolean;
  thankYouPageUrl: string;
  emailSequence: 'Yes' | 'No' | 'In progress';
  tools: string[];
  // Section 6
  runningAds: boolean;
  adPlatform: string;
  adSpend: string;
  hasScripts: boolean;
  contentTypes: string[];
}

const INITIAL_FORM_DATA: FormData = {
  businessName: '',
  email: '',
  industry: '',
  websiteUrl: '',
  businessDuration: '',
  primaryPlatform: '',
  socialHandles: [''],
  monthlyReach: '',
  postingConsistently: 'Sometimes',
  mainOffer: '',
  pricePoint: '',
  currency: 'USD',
  hasUpsell: false,
  upsellDetails: '',
  differentiator: '',
  conversionRate: '',
  currentRevenue: '',
  targetRevenue: '',
  pricingPageUrl: '',
  timeline: '',
  challenges: [],
  hasLandingPage: false,
  landingPageUrl: '',
  hasThankYouPage: false,
  thankYouPageUrl: '',
  emailSequence: 'No',
  tools: [],
  runningAds: false,
  adPlatform: '',
  adSpend: '',
  hasScripts: false,
  contentTypes: [],
};

const INDUSTRIES = ['B2B SaaS', 'E-commerce', 'Coaching/Consulting', 'Agency', 'Local Business', 'Other'];
const DURATIONS = ['Less than 6 months', '6–12 months', '1–3 years', '3+ years'];
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn', 'Twitter-X', 'Other'];
const TIMELINES = ['30 days', '60 days', '90 days', '6 months', '1 year'];
const CHALLENGES = ['Getting leads', 'Converting leads', 'Retaining clients', 'Content creation', 'Ads not working', 'No clear strategy', 'Other'];
const TOOLS = ['Mailchimp', 'ConvertKit', 'ClickFunnels', 'Webflow', 'Shopify', 'Kajabi', 'None', 'Other'];
const CONTENT_TYPES = ['Short-form video', 'Long-form video', 'Carousels', 'Blogs', 'Emails', 'Podcasts'];

export const AuditView: React.FC<{ onStartStrategy?: (data: any) => void; onViewStrategy?: (data: any) => void }> = ({ onStartStrategy, onViewStrategy }) => {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [expandedSections, setExpandedSections] = useState<number[]>([1]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [engine, setEngine] = useState<AIEngine>(getAIEngine());
  const [isSmartFilling, setIsSmartFilling] = useState(false);
  const [showSmartFillInput, setShowSmartFillInput] = useState(false);
  const [smartFillUrl, setSmartFillUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [auditReport, setAuditReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'intake' | 'result' | 'strategy'>('intake');
  const [strategyTimestamp, setStrategyTimestamp] = useState(0);
  const reportRef = React.useRef<HTMLDivElement>(null);

  // Persistence: Load saved data on mount
  useEffect(() => {
    const savedFormData = localStorage.getItem('titanleap_audit_form');
    const savedAuditReport = localStorage.getItem('titanleap_audit_report');
    
    if (savedFormData) {
      try {
        setFormData(JSON.parse(savedFormData));
      } catch (e) {
        console.error("Failed to parse saved form data", e);
      }
    }
    
    if (savedAuditReport) {
      try {
        const parsed = JSON.parse(savedAuditReport);
        if (parsed && parsed.primaryConstraint) {
          setAuditReport(parsed);
        } else {
          // Old format, clear it
          localStorage.removeItem('titanleap_audit_report');
        }
      } catch (e) {
        console.error("Failed to parse saved audit report", e);
      }
    }
  }, []);

  // Persistence: Save data on change
  useEffect(() => {
    localStorage.setItem('titanleap_audit_form', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    if (auditReport) {
      localStorage.setItem('titanleap_audit_report', JSON.stringify(auditReport));
    } else {
      localStorage.removeItem('titanleap_audit_report');
    }
  }, [auditReport]);

  const handleClearAudit = () => {
    if (window.confirm("Are you sure you want to clear all audit data? This cannot be undone.")) {
      setFormData(INITIAL_FORM_DATA);
      setAuditReport(null);
      localStorage.removeItem('titanleap_audit_form');
      localStorage.removeItem('titanleap_audit_report');
      toast.success("Audit data cleared");
    }
  };

  const handleSmartFill = async (urlOverride?: string) => {
    const url = urlOverride || smartFillUrl || formData.websiteUrl;
    if (!url) {
      setShowSmartFillInput(true);
      return;
    }
    setShowSmartFillInput(false);
    setIsSmartFilling(true);
    const fillToast = toast.loading("Analysing your website with Claude...");
    try {
      const data = await smartFillForm(url);
      const sanitizeNumber = (val: any) => {
        if (!val) return '';
        return String(val).replace(/[^0-9.]/g, '');
      };
      setFormData(prev => ({
        ...prev,
        ...data,
        websiteUrl: data.websiteUrl || url,
        pricePoint: sanitizeNumber(data.pricePoint),
        currentRevenue: sanitizeNumber(data.currentRevenue),
        targetRevenue: sanitizeNumber(data.targetRevenue),
      }));
      setSmartFillUrl('');
      toast.success("Form filled from your website!", { id: fillToast });
    } catch (error: any) {
      console.error("Smart fill failed:", error);
      toast.error("Smart Fill failed", {
        id: fillToast,
        description: error.message || "Could not analyse website. Check the URL and try again."
      });
    } finally {
      setIsSmartFilling(false);
    }
  };

  const toggleSection = (id: number) => {
    setExpandedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const progress = useMemo(() => {
    const fields = [
      formData.businessName,
      formData.industry,
      formData.websiteUrl,
      formData.businessDuration,
      formData.primaryPlatform,
      formData.mainOffer,
      formData.pricePoint,
      formData.currentRevenue,
      formData.targetRevenue,
      formData.timeline,
    ];
    const filled = fields.filter(f => f.trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  }, [formData]);

  const isSectionComplete = (id: number) => {
    switch (id) {
      case 1: return !!(formData.businessName && formData.industry && formData.websiteUrl && formData.businessDuration);
      case 2: return !!(formData.primaryPlatform && formData.socialHandles.some(h => h.trim() !== '') && formData.monthlyReach);
      case 3: return !!(formData.mainOffer && formData.pricePoint && formData.differentiator);
      case 4: return !!(formData.currentRevenue && formData.targetRevenue && formData.timeline && formData.challenges.length > 0);
      case 5: return !!(formData.emailSequence && formData.tools.length > 0);
      case 6: return !!(formData.contentTypes.length > 0);
      default: return false;
    }
  };

  const runAudit = async () => {
    // Validation check
    if (!formData.businessName.trim() || !formData.websiteUrl.trim()) {
      toast.error("Required Fields Missing", {
        description: "Please provide at least a Business Name and Website URL to run the audit."
      });
      return;
    }

    setIsAuditing(true);
    const auditToast = toast.loading("Building Growth Blueprint...", {
      description: "Analyzing your funnel, offer, and market position."
    });

    try {
      const dashboardResult = await auditLandingPage(formData);
      if (dashboardResult) {
        setAuditReport({
          ...dashboardResult,
          ...formData, // Include all form data
          businessName: formData.businessName || 'Your Business',
          timestamp: new Date().toLocaleString(),
        });

        // Track Lead in Supabase
        try {
          await supabase.from('leads').insert({
            name: formData.businessName || 'Anonymous',
            email: formData.email || 'no-email@provided.com',
            company: formData.businessName,
            source: 'Inbound Audit',
            product: 'Growth Blueprint',
            status: 'HOT',
            score: 85,
            score_reason: 'Growth Blueprint completed. Primary constraint: ' + (dashboardResult.primaryConstraint?.category || 'Unknown')
          });
        } catch (dbError) {
          console.error("Failed to track lead in Supabase:", dbError);
        }

        toast.success("Growth Blueprint Ready!", {
          id: auditToast,
          description: "Your personalised Growth Blueprint has been generated."
        });
        setActiveTab('result');
      } else {
        throw new Error("Empty result from AI");
      }
    } catch (error: any) {
      console.error("Audit failed:", error);
      let errorMessage = error?.message || 'Please try again.';
      
      // Clean up JSON error strings if present
      try {
        const parsed = JSON.parse(errorMessage);
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {}

      if (errorMessage === 'Forbidden' || errorMessage.includes('403')) {
        const engine = getAIEngine() === 'claude' ? 'Claude' : 'Gemini';
        const keyName = getAIEngine() === 'claude' ? 'CLAUDE_API_KEY' : 'GEMINI_API_KEY';
        errorMessage = `${engine} API access restricted. Please ensure your '${keyName}' is valid in the Settings > Secrets panel.`;
      } else if (errorMessage.includes('not_found_error')) {
        errorMessage = `Model not found. Please check if your account has access to the requested Claude model.`;
      }

      toast.error("Audit Failed", {
        id: auditToast,
        description: errorMessage
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!auditReport || !reportRef.current) return;
    
    setIsExporting(true);
    const container = reportRef.current;
    const parent = container.parentElement;
    let originalLeft = '';
    let originalTop = '';
    let originalZIndex = '';
    const originalScrollY = window.scrollY;

    try {
      // Ensure we are at the top of the page for clean capture
      window.scrollTo(0, 0);

      // Small delay to ensure any layout shifts are settled
      await new Promise(resolve => setTimeout(resolve, 500));

      // Temporarily move into viewport to ensure it can render it
      if (parent) {
        originalLeft = parent.style.left;
        originalTop = parent.style.top;
        originalZIndex = parent.style.zIndex;
        
        parent.style.left = '0';
        parent.style.top = `${window.scrollY}px`;
        parent.style.zIndex = '-1000';
      }
      
      // Wait a frame for layout
      await new Promise(resolve => setTimeout(resolve, 100));

      if (container.scrollWidth === 0 || container.scrollHeight === 0) {
        throw new Error("PDF container has 0 width or height");
      }

      const imgData = await toPng(container, {
        cacheBust: true,
        backgroundColor: '#f5f5f0',
        pixelRatio: 2,
        width: container.scrollWidth,
        height: container.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      // Calculate dimensions to fit A4 if possible, or use canvas size
      const pdf = new jsPDF({
        orientation: container.scrollWidth > container.scrollHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [container.scrollWidth, container.scrollHeight]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, container.scrollWidth, container.scrollHeight, undefined, 'FAST');
      
      const fileName = `TitanLeap_FunnelsPlus_${formData.businessName.trim().replace(/\s+/g, '_') || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success("PDF Generated Successfully");
    } catch (error) {
      console.error("PDF Export failed:", error);
      toast.error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Restore position
      if (parent) {
        parent.style.left = originalLeft;
        parent.style.top = originalTop;
        parent.style.zIndex = originalZIndex;
      }
      
      // Restore scroll position
      window.scrollTo(0, originalScrollY);
      setIsExporting(false);
    }
  };

  const getIconForArea = (area: string) => {
    const a = area.toLowerCase();
    if (a.includes('landing') || a.includes('funnel')) return Layout;
    if (a.includes('offer') || a.includes('product')) return Target;
    if (a.includes('email')) return Mail;
    if (a.includes('ads') || a.includes('marketing')) return Megaphone;
    if (a.includes('content')) return FileText;
    return AlertCircle;
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* ── Compact Control Bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: label + progress */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/10 shrink-0">
            <Sparkles size={12} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Audit</span>
          </div>
          {progress > 0 && (
            <div className="flex items-center gap-2 min-w-0">
              {isAuditing && <Loader2 size={12} className="animate-spin text-primary shrink-0" />}
              <div className="w-28 h-1.5 bg-surface-container-highest rounded-full overflow-hidden shrink-0">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: isAuditing ? '100%' : `${progress}%` }}
                  transition={{ duration: isAuditing ? 15 : 0.8, ease: isAuditing ? 'easeOut' : 'circOut' }}
                />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 shrink-0">
                {isAuditing ? 'Building…' : `${progress}%`}
              </span>
            </div>
          )}
        </div>

        {/* Right: engine toggle + smart fill */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Engine toggle */}
          <div className="flex items-center gap-1 p-1 bg-surface-container-highest/50 rounded-xl border border-outline-variant/10">
            <button
              onClick={() => { setAIEngine('gemini'); setEngine('gemini'); toast.success("Switched to Gemini", { icon: <Wand2 size={12} /> }); }}
              className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all", engine === 'gemini' ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : "text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-highest")}
              title="Gemini Flash (Fast)"
            >
              <Zap size={12} fill={engine === 'gemini' ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => { setAIEngine('claude'); setEngine('claude'); toast.success("Switched to Claude", { icon: <Sparkles size={12} /> }); }}
              className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all", engine === 'claude' ? "bg-secondary text-white shadow-lg shadow-secondary/20 scale-105" : "text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-highest")}
              title="Claude (Elite)"
            >
              <Sparkles size={12} fill={engine === 'claude' ? 'currentColor' : 'none'} />
            </button>
          </div>
          {/* Smart Fill button */}
          <button
            onClick={() => {
              if (isSmartFilling) return;
              if (formData.websiteUrl && !showSmartFillInput) { handleSmartFill(formData.websiteUrl); }
              else { setShowSmartFillInput(v => !v); }
            }}
            disabled={isSmartFilling}
            className="bg-secondary text-on-secondary px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-secondary/20 flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSmartFilling ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
            {isSmartFilling ? 'Analyzing…' : 'Smart Fill'}
          </button>
        </div>
      </div>

      {/* Smart Fill URL input - drops inline when open */}
      {showSmartFillInput && !isSmartFilling && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <input
            autoFocus
            type="url"
            value={smartFillUrl}
            onChange={e => setSmartFillUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && smartFillUrl.trim()) handleSmartFill(smartFillUrl.trim());
              if (e.key === 'Escape') setShowSmartFillInput(false);
            }}
            placeholder="https://yourwebsite.com"
            className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30"
          />
          <button
            onClick={() => { if (smartFillUrl.trim()) handleSmartFill(smartFillUrl.trim()); }}
            disabled={!smartFillUrl.trim()}
            className="px-4 py-2.5 rounded-xl bg-secondary text-on-secondary text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >Go</button>
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-1.5 bg-surface-container-low rounded-2xl border border-outline-variant/10 overflow-x-auto no-scrollbar w-full lg:w-auto">
          <button
            onClick={() => setActiveTab('intake')}
            className={cn(
              "flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0",
              activeTab === 'intake' 
                ? "bg-surface-container-lowest text-primary shadow-md shadow-primary/5 border border-outline-variant/10" 
                : "text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container"
            )}
          >
            <FileText size={16} />
            Business Assessment
          </button>
          <button
            onClick={() => setActiveTab('result')}
            disabled={!auditReport}
            className={cn(
              "flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0",
              activeTab === 'result'
                ? "bg-surface-container-lowest text-primary shadow-md shadow-primary/5 border border-outline-variant/10"
                : "text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container",
              !auditReport && "opacity-50 cursor-not-allowed"
            )}
          >
            <FileText size={16} />
            Audit Result
          </button>
          <button
            onClick={() => setActiveTab('strategy')}
            disabled={!auditReport}
            className={cn(
              "flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0",
              activeTab === 'strategy'
                ? "bg-surface-container-lowest text-primary shadow-md shadow-primary/5 border border-outline-variant/10"
                : "text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container",
              !auditReport && "opacity-50 cursor-not-allowed"
            )}
          >
            <Rocket size={16} />
            Growth Blueprint
          </button>
        </div>
      </div>

      {/* ── Scrollable Tab Content ── */}
      <div className="overflow-y-auto rounded-2xl" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'intake' ? (
            <div className="w-full space-y-4">
          <div className="flex items-center justify-between pt-1">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/40">Business Assessment</h2>
            <button
              onClick={handleClearAudit}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 hover:text-destructive transition-colors"
            >
              <Trash2 size={14} />
              Clear Data
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Section 1 */}
              <CollapsibleSection 
                id={1} 
                title="Business Basics" 
                isOpen={expandedSections.includes(1)} 
                isComplete={isSectionComplete(1)}
                onToggle={() => toggleSection(1)}
              >
                <div className="space-y-5 p-5">
                  <InputGroup label="Business Name" tooltip="Your brand identity. We use this to personalize your report and analyze brand consistency across platforms.">
                    <input 
                      type="text" 
                      value={formData.businessName}
                      onChange={e => setFormData({...formData, businessName: e.target.value})}
                      placeholder="Lumina Digital"
                      className="audit-input"
                    />
                  </InputGroup>
                  <InputGroup label="Contact Email" tooltip="Where should we send your deep-dive strategy report?">
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="founder@lumina.digital"
                      className="audit-input"
                    />
                  </InputGroup>
                  <InputGroup label="Industry" tooltip="Critical for benchmarking. Conversion rates and marketing costs vary wildly between niches; we need this for accurate gap analysis.">
                    <select 
                      value={formData.industry}
                      onChange={e => setFormData({...formData, industry: e.target.value})}
                      className="audit-input appearance-none"
                    >
                      <option value="">Select Industry</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </InputGroup>
                  <InputGroup label="Business Website URL" tooltip="The foundation of your digital presence. Our AI scans your site to identify technical leaks and messaging inconsistencies.">
                    <input 
                      type="text" 
                      value={formData.websiteUrl}
                      onChange={e => setFormData({...formData, websiteUrl: e.target.value})}
                      placeholder="https://lumina.digital"
                      className="audit-input"
                    />
                  </InputGroup>
                  <InputGroup label="Duration" tooltip="Business maturity dictates strategy. A startup needs different growth levers than an established 5-year brand.">
                    <select 
                      value={formData.businessDuration}
                      onChange={e => setFormData({...formData, businessDuration: e.target.value})}
                      className="audit-input appearance-none"
                    >
                      <option value="">Select Duration</option>
                      {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </InputGroup>
                </div>
              </CollapsibleSection>

              {/* Section 3 */}
              <CollapsibleSection 
                id={3} 
                title="Offer" 
                isOpen={expandedSections.includes(3)} 
                isComplete={isSectionComplete(3)}
                onToggle={() => toggleSection(3)}
              >
                <div className="space-y-6 p-6">
                  <InputGroup label="What is your main product or service?" tooltip="The core of your business. We audit your messaging to ensure this value is crystal clear to cold traffic.">
                    <textarea 
                      value={formData.mainOffer}
                      onChange={e => setFormData({...formData, mainOffer: e.target.value})}
                      placeholder="Describe your offer..."
                      className="audit-input min-h-[100px] resize-none"
                    />
                  </InputGroup>
                  <InputGroup label="What is the price point?" tooltip="Determines your sales cycle. A $50 product needs a different funnel than a $5,000 high-ticket service.">
                    <div className="flex gap-2">
                      <select 
                        value={formData.currency}
                        onChange={e => setFormData({...formData, currency: e.target.value})}
                        className="audit-input w-24"
                      >
                        <option value="USD">$ USD</option>
                        <option value="GBP">£ GBP</option>
                        <option value="EUR">€ EUR</option>
                      </select>
                      <input 
                        type="number" 
                        value={formData.pricePoint}
                        onChange={e => setFormData({...formData, pricePoint: e.target.value})}
                        placeholder="997"
                        className="audit-input flex-1"
                      />
                    </div>
                  </InputGroup>
                  <InputGroup label="Pricing Page URL" tooltip="The page where your offers and pricing are listed. We audit this for clarity and conversion triggers.">
                    <input 
                      type="text" 
                      value={formData.pricingPageUrl}
                      onChange={e => setFormData({...formData, pricingPageUrl: e.target.value})}
                      placeholder="https://lumina.digital/pricing"
                      className="audit-input"
                    />
                  </InputGroup>
                  <InputGroup label="Do you have an upsell or down-sell?" tooltip="The secret to profitability. Without these, you're likely over-paying for every customer you acquire.">
                    <div className="space-y-4">
                      <Toggle 
                        value={formData.hasUpsell} 
                        onChange={v => setFormData({...formData, hasUpsell: v})} 
                      />
                      {formData.hasUpsell && (
                        <input 
                          type="text" 
                          value={formData.upsellDetails}
                          onChange={e => setFormData({...formData, upsellDetails: e.target.value})}
                          placeholder="What is the upsell?"
                          className="audit-input"
                        />
                      )}
                    </div>
                  </InputGroup>
                  <InputGroup label="What makes your offer different from competitors?" tooltip="Your competitive edge. If this isn't obvious, you're competing on price alone—a race to the bottom.">
                    <textarea 
                      value={formData.differentiator}
                      onChange={e => setFormData({...formData, differentiator: e.target.value})}
                      placeholder="Your unique selling proposition..."
                      className="audit-input min-h-[100px] resize-none"
                    />
                  </InputGroup>
                  <InputGroup label="Current conversion rate if known (%)" tooltip="The most important number. Even a 1% increase can double your revenue without spending more on ads.">
                    <input 
                      type="number" 
                      value={formData.conversionRate}
                      onChange={e => setFormData({...formData, conversionRate: e.target.value})}
                      placeholder="e.g. 2.5"
                      className="audit-input"
                    />
                  </InputGroup>
                </div>
              </CollapsibleSection>

              {/* Section 5 */}
              <CollapsibleSection 
                id={5} 
                title="Funnel" 
                isOpen={expandedSections.includes(5)} 
                isComplete={isSectionComplete(5)}
                onToggle={() => toggleSection(5)}
              >
                <div className="space-y-6 p-6">
                  <InputGroup label="Do you have a landing page?" tooltip="Your 24/7 salesperson. If this page isn't optimized, you're wasting every dollar spent on traffic.">
                    <div className="space-y-4">
                      <Toggle 
                        value={formData.hasLandingPage} 
                        onChange={v => setFormData({...formData, hasLandingPage: v})} 
                      />
                      {formData.hasLandingPage && (
                        <input 
                          type="text" 
                          value={formData.landingPageUrl}
                          onChange={e => setFormData({...formData, landingPageUrl: e.target.value})}
                          placeholder="Landing page URL"
                          className="audit-input"
                        />
                      )}
                    </div>
                  </InputGroup>
                  <InputGroup label="Do you have a thank you page?" tooltip="Prime real estate. This is the moment of highest intent—perfect for immediate upsells or community invites.">
                    <div className="space-y-4">
                      <Toggle 
                        value={formData.hasThankYouPage} 
                        onChange={v => setFormData({...formData, hasThankYouPage: v})} 
                      />
                      {formData.hasThankYouPage && (
                        <input 
                          type="text" 
                          value={formData.thankYouPageUrl}
                          onChange={e => setFormData({...formData, thankYouPageUrl: e.target.value})}
                          placeholder="Thank you page URL"
                          className="audit-input"
                        />
                      )}
                    </div>
                  </InputGroup>
                  <InputGroup label="Do you have an email sequence?" tooltip="Your automated revenue engine. 70% of sales happen in the follow-up; without this, you're leaving 70% on the table.">
                    <div className="flex bg-surface-container-highest rounded-xl p-1">
                      {['Yes', 'No', 'In progress'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => setFormData({...formData, emailSequence: opt as any})}
                          className={cn(
                            "flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all",
                            formData.emailSequence === opt ? "bg-on-surface text-surface shadow-lg" : "text-on-surface-variant hover:text-on-surface"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </InputGroup>
                  <InputGroup label="What tools are you currently using?" tooltip="Your tech stack. We identify if your tools are helping you scale or holding you back with 'tech debt'.">
                    <div className="flex flex-wrap gap-2">
                      {TOOLS.map(t => (
                        <Chip 
                          key={t} 
                          label={t} 
                          selected={formData.tools.includes(t)}
                          onClick={() => {
                            const newTools = formData.tools.includes(t)
                              ? formData.tools.filter(item => item !== t)
                              : [...formData.tools, t];
                            setFormData({...formData, tools: newTools});
                          }}
                        />
                      ))}
                    </div>
                  </InputGroup>
                </div>
              </CollapsibleSection>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Section 2 */}
              <CollapsibleSection 
                id={2} 
                title="Social Media Presence" 
                isOpen={expandedSections.includes(2)} 
                isComplete={isSectionComplete(2)}
                onToggle={() => toggleSection(2)}
              >
                <div className="space-y-6 p-6">
                  <InputGroup label="Primary platform" tooltip="Where your audience lives. We'll focus our engagement and content strategy recommendations here.">
                    <select 
                      value={formData.primaryPlatform}
                      onChange={e => setFormData({...formData, primaryPlatform: e.target.value})}
                      className="audit-input"
                    >
                      <option value="">Select Platform</option>
                      {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </InputGroup>
                  <InputGroup label="Social media handle(s)" tooltip="Your direct line to customers. We analyze your profile to see if your 'front door' is actually inviting people in.">
                    <div className="space-y-3">
                      {formData.socialHandles.map((handle, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input 
                            type="text" 
                            value={handle}
                            onChange={e => {
                              const newHandles = [...formData.socialHandles];
                              newHandles[idx] = e.target.value;
                              setFormData({...formData, socialHandles: newHandles});
                            }}
                            placeholder="@handle"
                            className="audit-input"
                          />
                          {idx > 0 && (
                            <button 
                              onClick={() => setFormData({...formData, socialHandles: formData.socialHandles.filter((_, i) => i !== idx)})}
                              className="p-2 text-error hover:bg-error/10 rounded-xl transition-colors"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button 
                        onClick={() => setFormData({...formData, socialHandles: [...formData.socialHandles, '']})}
                        className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 hover:opacity-70 transition-opacity"
                      >
                        <Plus size={14} /> Add another
                      </button>
                    </div>
                  </InputGroup>
                  <InputGroup label="Average monthly reach or impressions" tooltip="Your top-of-funnel volume. This tells us if your problem is 'not enough people' or 'not enough conversions'.">
                    <input 
                      type="number" 
                      value={formData.monthlyReach}
                      onChange={e => setFormData({...formData, monthlyReach: e.target.value})}
                      placeholder="e.g. 50000"
                      className="audit-input"
                    />
                  </InputGroup>
                  <InputGroup label="Are you currently posting consistently?" tooltip="The algorithm's favorite metric. Inconsistency is often the #1 reason for stagnant growth despite good content.">
                    <div className="flex bg-surface-container-highest rounded-xl p-1">
                      {['Yes', 'No', 'Sometimes'].map(opt => (
                        <button
                          key={opt}
                          onClick={() => setFormData({...formData, postingConsistently: opt as any})}
                          className={cn(
                            "flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all",
                            formData.postingConsistently === opt ? "bg-on-surface text-surface shadow-lg" : "text-on-surface-variant hover:text-on-surface"
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </InputGroup>
                </div>
              </CollapsibleSection>

              {/* Section 4 */}
              <CollapsibleSection 
                id={4} 
                title="Revenue & Goals" 
                isOpen={expandedSections.includes(4)} 
                isComplete={isSectionComplete(4)}
                onToggle={() => toggleSection(4)}
              >
                <div className="space-y-6 p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Current monthly revenue" tooltip="Our starting point. We use this to calculate the exact dollar amount you're losing to inefficient systems.">
                      <input 
                        type="number" 
                        value={formData.currentRevenue}
                        onChange={e => setFormData({...formData, currentRevenue: e.target.value})}
                        placeholder="5000"
                        className="audit-input"
                      />
                    </InputGroup>
                    <InputGroup label="Target monthly revenue" tooltip="Your North Star. We reverse-engineer the exact traffic and conversion numbers needed to hit this goal.">
                      <div className="relative">
                        <input 
                          type="number" 
                          value={formData.targetRevenue}
                          onChange={e => setFormData({...formData, targetRevenue: e.target.value})}
                          placeholder="20000"
                          className="audit-input pr-24"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-primary/10 rounded-lg border border-primary/10 flex items-center gap-1.5 group/goal">
                          <Target size={10} className="text-primary" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-primary">5-10 Clients</span>
                          <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-on-surface text-surface text-[9px] font-bold rounded-xl opacity-0 group-hover/goal:opacity-100 pointer-events-none transition-all shadow-xl z-50 border border-white/10">
                            Calculated based on your price point assuming a goal of 5-10 new clients per month.
                          </div>
                        </div>
                      </div>
                    </InputGroup>
                  </div>
                  <InputGroup label="Timeline to hit target" tooltip="Sets the pace. A 30-day goal requires aggressive scaling; a 1-year goal allows for deeper brand building.">
                    <select 
                      value={formData.timeline}
                      onChange={e => setFormData({...formData, timeline: e.target.value})}
                      className="audit-input"
                    >
                      <option value="">Select Timeline</option>
                      {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </InputGroup>
                  <InputGroup label="Biggest challenge right now" tooltip="Your primary bottleneck. We prioritize solutions for this specific pain point in your final report.">
                    <div className="flex flex-wrap gap-2">
                      {CHALLENGES.map(c => (
                        <Chip 
                          key={c} 
                          label={c} 
                          selected={formData.challenges.includes(c)}
                          onClick={() => {
                            const newChallenges = formData.challenges.includes(c)
                              ? formData.challenges.filter(item => item !== c)
                              : [...formData.challenges, c];
                            setFormData({...formData, challenges: newChallenges});
                          }}
                        />
                      ))}
                    </div>
                  </InputGroup>
                </div>
              </CollapsibleSection>

              {/* Section 6 */}
              <CollapsibleSection 
                id={6} 
                title="Content & Ads" 
                isOpen={expandedSections.includes(6)} 
                isComplete={isSectionComplete(6)}
                onToggle={() => toggleSection(6)}
              >
                <div className="space-y-6 p-6">
                  <InputGroup label="Are you currently running paid ads?" tooltip="The fuel for your fire. If your funnel is leaking, ads just accelerate the loss. We'll check your 'bucket' first.">
                    <div className="space-y-4">
                      <Toggle 
                        value={formData.runningAds} 
                        onChange={v => setFormData({...formData, runningAds: v})} 
                      />
                      {formData.runningAds && (
                        <div className="grid grid-cols-2 gap-4">
                          <input 
                            type="text" 
                            value={formData.adPlatform}
                            onChange={e => setFormData({...formData, adPlatform: e.target.value})}
                            placeholder="Which platform?"
                            className="audit-input"
                          />
                          <input 
                            type="number" 
                            value={formData.adSpend}
                            onChange={e => setFormData({...formData, adSpend: e.target.value})}
                            placeholder="Monthly spend"
                            className="audit-input"
                          />
                        </div>
                      )}
                    </div>
                  </InputGroup>
                  <InputGroup label="Do you have existing content scripts or copy?" tooltip="Your brand's voice. We audit your scripts to ensure they follow high-conversion psychological frameworks.">
                    <Toggle 
                      value={formData.hasScripts} 
                      onChange={v => setFormData({...formData, hasScripts: v})} 
                    />
                  </InputGroup>
                  <InputGroup label="What type of content do you post?" tooltip="Your engagement strategy. Different formats serve different stages of the customer journey (Awareness vs. Intent).">
                    <div className="flex flex-wrap gap-2">
                      {CONTENT_TYPES.map(t => (
                        <Chip 
                          key={t} 
                          label={t} 
                          selected={formData.contentTypes.includes(t)}
                          onClick={() => {
                            const newTypes = formData.contentTypes.includes(t)
                              ? formData.contentTypes.filter(item => item !== t)
                              : [...formData.contentTypes, t];
                            setFormData({...formData, contentTypes: newTypes});
                          }}
                        />
                      ))}
                    </div>
                  </InputGroup>
                </div>
              </CollapsibleSection>
            </div>
          </div>

          <div className="pt-10 space-y-6">
            <button 
              onClick={runAudit}
              disabled={isAuditing}
              className="w-full py-8 bg-primary text-on-primary font-black text-xl uppercase tracking-[0.3em] rounded-[32px] shadow-[0_20px_60px_rgba(71,0,175,0.3)] hover:shadow-[0_30px_80px_rgba(71,0,175,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {isAuditing ? (
                <>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap size={28} />
                  </motion.div>
                  Building Blueprint...
                </>
              ) : (
                <>
                  <Zap size={28} fill="currentColor" />
                  Run Audit
                  <span className="ml-2 px-2.5 py-1 bg-white/20 text-white text-[10px] font-black rounded-full uppercase tracking-widest leading-none">Ultra</span>
                </>
              )}
            </button>
            <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 max-w-xs mx-auto leading-relaxed">
              By running this audit, you agree to our data processing terms. TitanLeap uses advanced algorithmic modeling to estimate revenue gaps based on provided metrics.
            </p>
          </div>
        </div>
        ) : activeTab === 'result' ? (
          <div ref={reportRef}>
            {auditReport ? (
              <RevenueLeakBlueprint
                auditReport={auditReport}
                formData={formData}
                onStartStrategy={(data) => {
                  setStrategyTimestamp(Date.now());
                  setActiveTab('strategy');
                }}
                onExport={handleExportPDF}
                isExporting={isExporting}
                onBack={() => setActiveTab('intake')}
                onClear={handleClearAudit}
              />
            ) : (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,gap:24,textAlign:'center',padding:'48px 24px',background:'#06030D',color:'#EDE9F5'}}>
                <div style={{width:64,height:64,borderRadius:16,background:'#100823',border:'1px solid #1F1430',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>📋</div>
                <div>
                  <h3 style={{fontSize:21,fontWeight:800,margin:'0 0 8px'}}>No Audit Yet</h3>
                  <p style={{fontSize:15,color:'#9B91B4',maxWidth:'36ch',margin:0}}>Complete the assessment and run the analysis to generate your Revenue Leak Audit.</p>
                </div>
                <button onClick={() => setActiveTab('intake')} style={{padding:'14px 28px',background:'#6B21E8',color:'#EDE9F5',border:'none',borderRadius:10,fontWeight:700,fontSize:13,textTransform:'uppercase',letterSpacing:'0.1em',cursor:'pointer'}}>
                  Start Assessment
                </button>
              </div>
            )}
          </div>
        ) : activeTab === 'strategy' ? (
          <div>
            {auditReport ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,gap:24,textAlign:'center',padding:'48px 24px',background:'#06030D',color:'#EDE9F5'}}>
                <div style={{width:64,height:64,borderRadius:16,background:'#100823',border:'1px solid #1F1430',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>🚀</div>
                <div>
                  <h3 style={{fontSize:21,fontWeight:800,margin:'0 0 8px'}}>Growth Blueprint Ready</h3>
                  <p style={{fontSize:15,color:'#9B91B4',maxWidth:'40ch',margin:0}}>Your 30-day strategy, content calendar, and blueprint live in Strategy Hub — not here.</p>
                </div>
                <button onClick={() => (onViewStrategy || onStartStrategy) && (onViewStrategy || onStartStrategy)(auditReport)} style={{padding:'14px 28px',background:'#6B21E8',color:'#EDE9F5',border:'none',borderRadius:10,fontWeight:700,fontSize:13,textTransform:'uppercase',letterSpacing:'0.1em',cursor:'pointer'}}>
                  Open in Strategy Hub
                </button>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,gap:24,textAlign:'center',padding:'48px 24px',background:'#06030D',color:'#EDE9F5'}}>
                <div style={{width:64,height:64,borderRadius:16,background:'#100823',border:'1px solid #1F1430',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>🚀</div>
                <div>
                  <h3 style={{fontSize:21,fontWeight:800,margin:'0 0 8px'}}>No Blueprint Yet</h3>
                  <p style={{fontSize:15,color:'#9B91B4',maxWidth:'36ch',margin:0}}>Run your audit first — the Growth Blueprint is built from your audit results.</p>
                </div>
                <button onClick={() => setActiveTab('intake')} style={{padding:'14px 28px',background:'#6B21E8',color:'#EDE9F5',border:'none',borderRadius:10,fontWeight:700,fontSize:13,textTransform:'uppercase',letterSpacing:'0.1em',cursor:'pointer'}}>
                  Start Assessment
                </button>
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
      </AnimatePresence>
      </div>{/* end scrollable container */}
    </div>
  );
};


// Helper Components
const CollapsibleSection = ({ id, title, isOpen, isComplete, onToggle, children }: any) => (
  <div className={cn(
    "rounded-[32px] border transition-all duration-500 overflow-hidden",
    isOpen 
      ? "bg-surface-container-low border-primary/20 shadow-xl shadow-primary/5" 
      : "bg-surface-container-lowest border-outline-variant/10 shadow-sm"
  )}>
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-5 hover:bg-primary/5 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-2.5 h-2.5 rounded-full transition-all duration-500",
          isComplete ? "bg-[#00ff85] shadow-[0_0_10px_rgba(0,255,133,0.5)]" : 
          isOpen ? "bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" : "bg-surface-container-highest"
        )} />
        <h3 className={cn(
          "text-xs font-black uppercase tracking-[0.25em] transition-colors",
          isOpen ? "text-primary" : "text-on-surface-variant/60 group-hover:text-on-surface"
        )}>
          {title}
        </h3>
      </div>
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
        isOpen ? "bg-primary/10 text-primary rotate-180" : "bg-surface-container-highest/50 text-on-surface-variant"
      )}>
        <ChevronDown size={20} />
      </div>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="border-t border-outline-variant/10">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const InputGroup = ({ label, children, tooltip }: any) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 ml-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
        {label}
      </label>
      {tooltip && (
        <div className="group relative">
          <HelpCircle size={12} className="text-on-surface-variant/40 hover:text-primary transition-colors cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-on-surface text-surface text-[11px] font-bold rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 shadow-2xl z-50 leading-relaxed border border-white/10">
            {tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-on-surface" />
          </div>
        </div>
      )}
    </div>
    {children}
  </div>
);

const Toggle = ({ value, onChange }: { value: boolean, onChange: (v: boolean) => void }) => (
  <button 
    onClick={() => onChange(!value)}
    className={cn(
      "w-12 h-6 rounded-full p-1 transition-colors relative",
      value ? "bg-primary" : "bg-surface-container-highest"
    )}
  >
    <motion.div 
      className="w-4 h-4 bg-on-primary rounded-full shadow-sm"
      animate={{ x: value ? 24 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    />
  </button>
);

const Chip: React.FC<{ label: string, selected: boolean, onClick: () => void }> = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
      selected 
        ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10" 
        : "bg-surface-container-highest border-outline-variant/10 text-on-surface-variant hover:border-outline-variant"
    )}
  >
    {label}
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
//  REVENUE LEAK BLUEPRINT  —  matches revenue-leak-audit.html exactly
// ─────────────────────────────────────────────────────────────────────────────
const BG_DEEP  = '#06030D';
const BG       = '#0B0418';
const CARD     = '#100823';
const CARD_HI  = '#160B30';
const INK      = '#EDE9F5';
const INK_DIM  = '#9B91B4';
const INK_FAINT= '#665C7E';
const LINE     = '#1F1430';
const LINE_BR  = '#2E1F47';
const PURPLE   = '#6B21E8';
const GOLD     = '#F5C518';
const DANGER   = '#FF5A5A';
const MONO     = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const W: React.CSSProperties = { maxWidth: 760, margin: '0 auto', padding: '0 24px' };
const M: React.CSSProperties = { fontFamily: MONO };

const RevenueLeakBlueprint: React.FC<{
  auditReport: any;
  formData: FormData;
  onStartStrategy?: (data: any) => void;
  onExport: () => void;
  isExporting: boolean;
  onBack: () => void;
  onClear: () => void;
}> = ({ auditReport, formData, onStartStrategy, onExport, isExporting, onBack, onClear }) => {

  const leaks = [
    { data: auditReport.primaryConstraint,   sev: 'high' },
    { data: auditReport.secondaryConstraint, sev: 'med'  },
    { data: auditReport.thirdConstraint,     sev: 'med'  },
  ].filter(l => l.data);

  // Dollar-range math — conservative, assumption-visible
  const rev = Math.max(Number(formData.currentRevenue) || 0, 500);
  const RATES = [
    { lo: 0.15, hi: 0.25, note: `Primary constraint recovery at 15–25% of $${rev.toLocaleString()}/mo baseline.` },
    { lo: 0.08, hi: 0.13, note: `Secondary constraint recovery at 8–13% of $${rev.toLocaleString()}/mo baseline.` },
    { lo: 0.04, hi: 0.08, note: `Third constraint recovery at 4–8% of $${rev.toLocaleString()}/mo baseline.` },
  ];
  const costs = RATES.map(r => ({
    low:  Math.round(rev * r.lo),
    high: Math.round(rev * r.hi),
    note: r.note,
  }));
  const totalLow  = costs.slice(0, leaks.length).reduce((s, c) => s + c.low,  0);
  const totalHigh = costs.slice(0, leaks.length).reduce((s, c) => s + c.high, 0);

  const moves: string[] = auditReport.quickWins?.length
    ? auditReport.quickWins
    : leaks.map((l: any) => l.data?.recommendedActions?.[0]).filter(Boolean);

  const EFFORT = ['~1–3 hrs · Do this first', '~2–4 hrs · This week', '~1–2 hrs · This week'];

  return (
    <div style={{ background: BG_DEEP, color: INK, fontFamily: "-apple-system,'SF Pro Display','Archivo',system-ui,sans-serif", lineHeight: 1.5, WebkitFontSmoothing: 'antialiased' }}>
      <style>{`
        @media (max-width: 540px) {
          .rlb-topbar   { flex-direction: column; gap: 10px; align-items: flex-start !important; }
          .rlb-meta-row { flex-direction: column !important; }
          .rlb-meta-row > div { border-right: none !important; border-bottom: 1px solid ${LINE}; padding: 14px 0 !important; min-width: unset !important; }
          .rlb-meta-row > div:last-child { border-bottom: none; }
          .rlb-sec-head { flex-direction: column !important; gap: 4px; }
          .rlb-cost     { flex-direction: column !important; }
          .rlb-cost > div:first-child { border-right: none !important; border-bottom: 1px solid ${LINE_BR}; }
          .rlb-leak-top { flex-wrap: wrap; }
          .rlb-footer-btns { flex-direction: column !important; }
        }
      `}</style>

      {/* ── TOP BAR ── */}
      <div className="rlb-topbar" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${LINE}`, maxWidth: 760, margin: '0 auto' }}>
        <span style={{ ...M, fontSize: 11, color: INK_FAINT, letterSpacing: '0.12em' }}>TitanLeap · Revenue Leak Audit</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onBack} style={{ ...M, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_FAINT, background: 'transparent', border: `1px solid ${LINE}`, borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}>← Edit</button>
          <button onClick={onExport} disabled={isExporting} style={{ ...M, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_DIM, background: CARD, border: `1px solid ${LINE_BR}`, borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}>
            {isExporting ? 'Exporting…' : '↓ PDF'}
          </button>
        </div>
      </div>

      {/* ── HEADER ── */}
      <header style={{ padding: '64px 0 0', background: `radial-gradient(120% 80% at 80% -10%, rgba(107,33,232,.28), transparent 60%), ${BG_DEEP}`, borderBottom: `1px solid ${LINE}` }}>
        <div style={W}>
          <div style={{ ...M, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
            <span style={{ display: 'inline-block', width: 26, height: 1, background: GOLD }} />
            Revenue Leak Audit
          </div>
          <h1 style={{ fontSize: 'clamp(34px,7vw,52px)', fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
            {leaks.length} revenue {leaks.length === 1 ? 'leak is' : 'leaks are'} quietly holding you back.
          </h1>
          <p style={{ color: INK_DIM, fontSize: 16, maxWidth: '50ch', marginBottom: 36 }}>
            A focused teardown of where revenue is escaping — and what each leak is worth when you fix it.
          </p>
          <div className="rlb-meta-row" style={{ display: 'flex', flexWrap: 'wrap', borderTop: `1px solid ${LINE}`, marginTop: 8 }}>
            {[
              { k: 'Prepared for', v: auditReport.businessName || formData.businessName || '—' },
              { k: 'Date', v: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
              { k: 'Industry', v: formData.industry || '—' },
              { k: 'Leaks found', v: `${leaks.length} critical`, flag: true },
            ].map((m, i, arr) => (
              <div key={i} style={{ flex: 1, minWidth: 140, padding: '18px 20px 22px 0', borderRight: i < arr.length - 1 ? `1px solid ${LINE}` : 'none' }}>
                <div style={{ ...M, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: INK_FAINT, marginBottom: 7 }}>{m.k}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: (m as any).flag ? GOLD : INK }}>{m.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── UNCOMFORTABLE TRUTH ── */}
      {auditReport.executiveSummary && (
        <div style={{ padding: '44px 24px', background: BG, borderBottom: `1px solid ${LINE}` }}>
          <div style={W}>
            <div style={{ border: `1px solid ${LINE_BR}`, borderLeft: `3px solid ${GOLD}`, background: `linear-gradient(180deg,${CARD_HI},${CARD})`, padding: '30px 32px', borderRadius: 4 }}>
              <div style={{ ...M, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, marginBottom: 14 }}>The uncomfortable truth</div>
              <p style={{ fontSize: 21, lineHeight: 1.45, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
                {auditReport.executiveSummary.businessUnderstanding}
              </p>
              {auditReport.executiveSummary.mainObservations && (
                <div style={{ marginTop: 18, fontSize: 13, color: INK_DIM }}>{auditReport.executiveSummary.mainObservations}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LEAKS ── */}
      <section style={{ padding: '52px 24px', borderBottom: `1px solid ${LINE}`, background: BG_DEEP }}>
        <div style={W}>
          <div className="rlb-sec-head" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ ...M, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: INK_FAINT }}>The Leaks</div>
            <div style={{ ...M, fontSize: 13, color: GOLD, fontWeight: 600 }}>{leaks.length} found · ranked by $ impact</div>
          </div>
          <p style={{ fontSize: 15, color: INK_DIM, marginBottom: 34, maxWidth: '54ch' }}>
            No fluff. Here are the constraints actually bleeding revenue, biggest first.
          </p>

          {leaks.map(({ data, sev }, i) => {
            const cost = costs[i];
            const isHigh = sev === 'high';
            return (
              <div key={i} style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 6, marginBottom: 20, overflow: 'hidden' }}>
                {/* top row */}
                <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', padding: '24px 26px 20px', flexWrap: 'wrap' }}>
                  <div style={{ ...M, fontSize: 13, fontWeight: 700, color: PURPLE, border: `1px solid ${LINE_BR}`, borderRadius: 6, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: BG_DEEP }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 6px' }}>{data.category}</h3>
                    <div style={{ ...M, fontSize: 12, color: INK_FAINT }}>{(data.evidence || 'Identified in business audit').slice(0, 80)}</div>
                  </div>
                  <div style={{ ...M, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '5px 9px', borderRadius: 4, flexShrink: 0, fontWeight: 600, ...(isHigh ? { background: 'rgba(255,90,90,.12)', color: DANGER, border: '1px solid rgba(255,90,90,.3)' } : { background: 'rgba(245,197,24,.1)', color: GOLD, border: '1px solid rgba(245,197,24,.28)' }) }}>
                    {isHigh ? 'High' : 'Med'}
                  </div>
                </div>

                {/* body */}
                <div style={{ padding: '0 26px 8px' }}>
                  {data.whatWeFound  && <p style={{ fontSize: 15, color: INK_DIM, margin: '0 0 10px', maxWidth: '58ch' }}>{data.whatWeFound}</p>}
                  {data.whyItMatters && <p style={{ fontSize: 14, color: INK_DIM, margin: '0 0 18px', maxWidth: '58ch' }}>{data.whyItMatters}</p>}

                  {/* cost box */}
                  <div className="rlb-cost" style={{ display: 'flex', alignItems: 'stretch', border: `1px solid ${LINE_BR}`, borderRadius: 6, margin: '4px 0 20px', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 22px', background: BG_DEEP, borderRight: `1px solid ${LINE_BR}`, flexShrink: 0 }}>
                      <div style={{ ...M, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: INK_FAINT, marginBottom: 6 }}>Est. monthly loss</div>
                      <div style={{ ...M, fontSize: 22, fontWeight: 700, color: DANGER, letterSpacing: '-0.01em' }}>${cost.low.toLocaleString()}–${cost.high.toLocaleString()}</div>
                    </div>
                    <div style={{ padding: '18px 22px', fontSize: 13, color: INK_FAINT, display: 'flex', alignItems: 'center', flex: 1 }}>
                      {data.businessImpact || cost.note}
                    </div>
                  </div>
                </div>

                {/* fix footer */}
                <div style={{ borderTop: `1px solid ${LINE}`, padding: '18px 26px 24px', display: 'flex', gap: 14, alignItems: 'flex-start', background: 'linear-gradient(180deg,transparent,rgba(107,33,232,.05))' }}>
                  <div style={{ ...M, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: PURPLE, fontWeight: 700, paddingTop: 2, flexShrink: 0 }}>Fix</div>
                  <div>
                    <p style={{ fontSize: 14, color: INK, margin: 0 }}>{data.recommendedActions?.[0] || 'Implement the recommended fix outlined above.'}</p>
                    {data.recommendedActions?.[1] && <p style={{ fontSize: 13, color: INK_DIM, margin: '6px 0 0' }}>{data.recommendedActions[1]}</p>}
                    <div style={{ ...M, fontSize: 11, color: INK_FAINT, marginTop: 6 }}>{EFFORT[i] || '~2–4 hrs'}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── TOTAL ── */}
      <div style={{ background: BG, textAlign: 'center', padding: '48px 24px' }}>
        <div style={W}>
          <div style={{ ...M, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: INK_DIM, marginBottom: 14 }}>Total estimated monthly leak</div>
          <div style={{ ...M, fontSize: 'clamp(34px,8vw,52px)' as any, fontWeight: 800, color: GOLD, letterSpacing: '-0.02em' }}>${totalLow.toLocaleString()} – ${totalHigh.toLocaleString()}</div>
          <div style={{ fontSize: 14, color: INK_FAINT, marginTop: 14, maxWidth: '46ch', marginLeft: 'auto', marginRight: 'auto' }}>
            Conservative estimate based on ${rev.toLocaleString()}/mo revenue baseline. The primary fix recovers the most.
          </div>
        </div>
      </div>

      {/* ── THIS WEEK'S MOVES ── */}
      {moves.length > 0 && (
        <section style={{ padding: '52px 24px', borderBottom: `1px solid ${LINE}`, background: BG_DEEP }}>
          <div style={W}>
            <div className="rlb-sec-head" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ ...M, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: INK_FAINT }}>This Week's Moves</div>
              <div style={{ ...M, fontSize: 13, color: GOLD, fontWeight: 600 }}>in order</div>
            </div>
            <p style={{ fontSize: 15, color: INK_DIM, marginBottom: 34, maxWidth: '54ch' }}>Do them top to bottom. Highest-dollar fix first.</p>
            {moves.slice(0, 5).map((move: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 18, alignItems: 'flex-start', padding: '20px 0', borderTop: i > 0 ? `1px solid ${LINE}` : 'none' }}>
                <div style={{ ...M, fontSize: 13, color: GOLD, fontWeight: 700, flexShrink: 0, paddingTop: 1 }}>{String(i + 1).padStart(2, '0')}</div>
                <div>
                  <p style={{ fontSize: 14, color: INK, margin: '0 0 4px' }}>{move}</p>
                  {i < leaks.length && <div style={{ ...M, fontSize: 11, color: INK_FAINT }}>Recovers Leak {String(i + 1).padStart(2, '0')} · {['~1–3 hrs', '~2–4 hrs', '~1–2 hrs'][i] || '~2 hrs'}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <div style={{ background: `radial-gradient(120% 100% at 50% 0%, rgba(107,33,232,.3), transparent 65%), ${BG_DEEP}`, textAlign: 'center', padding: '60px 24px 70px' }}>
        <div style={W}>
          <h2 style={{ fontSize: 'clamp(26px,5vw,34px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
            {onStartStrategy ? 'Ready to build your growth strategy?' : 'Want us to fix all of this for you?'}
          </h2>
          <p style={{ color: INK_DIM, fontSize: 16, maxWidth: '48ch', margin: '0 auto 30px' }}>
            {auditReport.nextStep || "We'll implement every fix in this report and rebuild your funnel so it converts the traffic you're already paying for."}
          </p>
          {onStartStrategy && (
            <button onClick={() => onStartStrategy(auditReport)} style={{ display: 'inline-block', background: GOLD, color: '#1a1205', fontWeight: 700, fontSize: 15, padding: '15px 34px', borderRadius: 8, border: 'none', cursor: 'pointer', letterSpacing: '0.01em', boxShadow: '0 8px 30px rgba(245,197,24,.2)' }}>
              Build Growth Strategy
            </button>
          )}
          <div style={{ marginTop: 18, ...M, fontSize: 12, color: INK_FAINT }}>Or export this report and share it with your team.</div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '30px 24px 40px', textAlign: 'center', background: BG_DEEP }}>
        <div style={W}>
          <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>Titan<span style={{ color: PURPLE }}>Leap</span></div>
          <div style={{ fontSize: 11, color: INK_FAINT, marginTop: 8, maxWidth: '52ch', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
            Dollar ranges are directional estimates based on reported revenue and typical conversion benchmarks — not guarantees. Actual results depend on traffic quality and offer fit.
          </div>
          <div className="rlb-footer-btns" style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={onBack} style={{ ...M, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_FAINT, background: 'transparent', border: `1px solid ${LINE}`, borderRadius: 4, padding: '7px 16px', cursor: 'pointer' }}>← Edit Assessment</button>
            <button onClick={onClear} style={{ ...M, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: INK_FAINT, background: 'transparent', border: `1px solid ${LINE}`, borderRadius: 4, padding: '7px 16px', cursor: 'pointer' }}>Clear & Restart</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
