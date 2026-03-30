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
  Trash2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { auditLandingPage, smartFillForm } from '@/src/services/ai';
import { toast } from 'sonner';
import { Sparkles, Wand2, Loader2, FileDown, Printer, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Logo } from './Logo';

interface FormData {
  // Section 1
  businessName: string;
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

export const AuditView: React.FC<{ onStartStrategy?: (data: any) => void }> = ({ onStartStrategy }) => {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [expandedSections, setExpandedSections] = useState<number[]>([1]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isSmartFilling, setIsSmartFilling] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [auditReport, setAuditReport] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'intake' | 'result'>('intake');
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
        setAuditReport(JSON.parse(savedAuditReport));
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

  const handleSmartFill = async () => {
    if (!formData.websiteUrl) {
      alert("Please enter a website URL first.");
      return;
    }
    setIsSmartFilling(true);
    try {
      const data = await smartFillForm(formData.websiteUrl);
      if (data) {
        // Sanitize numerical strings to ensure they work with type="number" inputs
        const sanitizeNumber = (val: any) => {
          if (!val) return '';
          const cleaned = String(val).replace(/[^0-9.]/g, '');
          return cleaned;
        };

        setFormData(prev => ({
          ...prev,
          ...data,
          pricePoint: sanitizeNumber(data.pricePoint),
          currentRevenue: sanitizeNumber(data.currentRevenue),
          targetRevenue: sanitizeNumber(data.targetRevenue),
        }));
      }
    } catch (error) {
      console.error("Smart fill failed:", error);
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
    const auditToast = toast.loading("Engineering Audit...", {
      description: "Analyzing your funnel, offer, and market position."
    });

    try {
      const [result] = await Promise.all([
        auditLandingPage(formData),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);
      if (result) {
        setAuditReport({
          ...result,
          ...formData, // Include all form data
          businessName: formData.businessName || 'Your Business',
          timestamp: new Date().toLocaleString(),
        });
        toast.success("Audit Complete!", {
          id: auditToast,
          description: "Your algorithmic growth report is ready."
        });
        setActiveTab('result');
      } else {
        throw new Error("Empty result from AI");
      }
    } catch (error) {
      console.error("Audit failed:", error);
      toast.error("Audit Failed", {
        id: auditToast,
        description: "There was an error generating your report. Please try again."
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleExportPDF = async () => {
    if (!auditReport || !reportRef.current) return;
    
    setIsExporting(true);
    try {
      // Ensure we are at the top of the page for clean capture
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 0);

      // Small delay to ensure any layout shifts are settled
      await new Promise(resolve => setTimeout(resolve, 500));

      const container = reportRef.current;
      if (!container) throw new Error("PDF container not found");
      
      // Temporarily move into viewport to ensure html2canvas can render it
      const parent = container.parentElement;
      let originalLeft = '';
      let originalTop = '';
      let originalZIndex = '';
      
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
        // Restore before throwing
        if (parent) {
          parent.style.left = originalLeft;
          parent.style.top = originalTop;
          parent.style.zIndex = originalZIndex;
        }
        throw new Error("PDF container has 0 width or height");
      }

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: true,
        backgroundColor: '#f5f5f0',
        windowWidth: container.scrollWidth,
        windowHeight: container.scrollHeight
      });
      
      // Restore position
      if (parent) {
        parent.style.left = originalLeft;
        parent.style.top = originalTop;
        parent.style.zIndex = originalZIndex;
      }
      
      // Restore scroll position
      window.scrollTo(0, originalScrollY);

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("Canvas dimensions are zero");
      }

      // Calculate dimensions to fit A4 if possible, or use canvas size
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height, undefined, 'FAST');
      
      const fileName = `TitanLeap_FunnelsPlus_${formData.businessName.trim().replace(/\s+/g, '_') || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success("PDF Generated Successfully");
    } catch (error) {
      console.error("PDF Export failed:", error);
      toast.error(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
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
    <div className="max-w-[1600px] mx-auto p-4 md:p-12 space-y-8 md:space-y-16">
      {/* Top Header - Consistent with rest of system */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 relative">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/10">
            <Sparkles size={14} className="text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Audit</span>
          </div>
          <h1 className="text-3xl md:text-[38px] font-black tracking-tight text-on-surface">Revenue Leakage Analysis</h1>
          <p className="text-sm md:text-[17px] text-on-surface-variant font-sans font-normal max-w-2xl leading-relaxed">
            Tell us about your business — we'll show you exactly where you're leaving money on the table.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <div className="relative group w-full sm:w-auto">
            <button 
              onClick={handleSmartFill}
              disabled={isSmartFilling || !formData.websiteUrl}
              className="w-full sm:w-auto bg-secondary text-on-secondary px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-secondary/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 group"
            >
              {isSmartFilling ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} className="group-hover:rotate-12 transition-transform" />}
              {isSmartFilling ? 'Analyzing Site...' : 'Smart Fill with AI'}
            </button>
            {!formData.websiteUrl && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-on-surface text-surface text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                Enter a website URL first
              </div>
            )}
          </div>
          
          {/* Floating Progress Card - Compact */}
          <div className="w-full sm:w-auto bg-surface-container-low p-6 rounded-[24px] border border-outline-variant/10 shadow-xl flex flex-col gap-3 min-w-[280px] relative overflow-hidden group">
            <div className="flex justify-between items-center relative z-10">
              <span className="text-[10px] font-normal uppercase tracking-[0.2em] text-primary">Audit Progress: {progress}%</span>
            </div>
            <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden relative z-10">
              <motion.div 
                className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "circOut" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mini Tab Navigation */}
      <div className="flex items-center justify-between mb-8 md:mb-12">
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
            Audit Intake
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
            <Sparkles size={16} />
            Audit Result
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'intake' ? (
            <div className="max-w-3xl mx-auto space-y-8 md:space-y-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/40">Audit Intake</h2>
            <button 
              onClick={handleClearAudit}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 hover:text-destructive transition-colors"
            >
              <Trash2 size={14} />
              Clear Data
            </button>
          </div>
          <div className="space-y-4">
            {/* Section 1 */}
            <CollapsibleSection 
              id={1} 
              title="Business Basics" 
              isOpen={expandedSections.includes(1)} 
              isComplete={isSectionComplete(1)}
              onToggle={() => toggleSection(1)}
            >
              <div className="space-y-8 p-8">
                <InputGroup label="Business Name" tooltip="Your brand identity. We use this to personalize your report and analyze brand consistency across platforms.">
                  <input 
                    type="text" 
                    value={formData.businessName}
                    onChange={e => setFormData({...formData, businessName: e.target.value})}
                    placeholder="Lumina Digital"
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
                  Engineering Report...
                </>
              ) : (
                <>
                  <Zap size={28} fill="currentColor" />
                  Run Audit
                </>
              )}
            </button>
            <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 max-w-xs mx-auto leading-relaxed">
              By running this audit, you agree to our data processing terms. TitanLeap uses advanced algorithmic modeling to estimate revenue gaps based on provided metrics.
            </p>
          </div>
        </div>
        ) : (
          <div className="max-w-5xl mx-auto w-full">
              <div className="bg-surface-container-lowest rounded-[48px] border border-outline-variant/10 shadow-2xl min-h-[900px] flex flex-col overflow-hidden">
                {auditReport && (
                  <div className="flex-1 flex flex-col p-6 md:p-12 space-y-12">
                    {/* Report Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#00ff85]">
                        <div className="w-2 h-2 rounded-full bg-[#00ff85] animate-pulse" />
                        Analysis Generated
                      </div>
                      <h2 className="text-4xl font-display font-black text-on-surface tracking-tight">
                        Audit Report — {auditReport.businessName}
                      </h2>
                      <p className="text-xs font-bold text-on-surface-variant/40 uppercase tracking-widest">
                        Last updated: {auditReport.timestamp}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button className="w-12 h-12 bg-surface-container-low border border-outline-variant/10 rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all shadow-sm">
                        <Share2 size={20} />
                      </button>
                      <button className="w-12 h-12 bg-surface-container-low border border-outline-variant/10 rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all shadow-sm">
                        <Download size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-[#3b00b9] rounded-[40px] p-12 text-white relative overflow-hidden shadow-2xl shadow-primary/20">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-on-surface/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 space-y-8">
                      <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Estimated Monthly Revenue Gap</p>
                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <h3 className="text-8xl font-display font-black tracking-tighter text-[#00ff85]">
                          ${auditReport.revenueGap.toLocaleString()}
                          <span className="text-3xl text-white/30 ml-3 font-medium">/mo</span>
                        </h3>
                        <div className="bg-on-surface/10 backdrop-blur-xl px-6 py-3 rounded-[24px] border border-white/10 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#00ff85]/20 flex items-center justify-center">
                            <TrendingUp size={18} className="text-[#00ff85]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-[#00ff85]">24%</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">Potential Increase</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Social Links Found */}
                      {formData.socialHandles.some(h => h.trim() !== '') && (
                        <div className="pt-4 border-t border-white/10 flex flex-wrap gap-4">
                          {formData.socialHandles.filter(h => h.trim() !== '').map((handle, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60">
                              <Globe size={12} />
                              {handle}
                            </div>
                          ))}
                        </div>
                      )}

                      <p className="text-base font-medium text-white/70 max-w-xl leading-relaxed">
                        Our analysis shows high leakage in your middle-of-funnel conversion. Fixing these 3 critical items will bridge this gap within 45 days.
                      </p>
                    </div>
                  </div>

                  {/* Issue Cards */}
                  <div className="space-y-8">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40">Critical Leakage Points</h4>
                    <div className="grid grid-cols-1 gap-6">
                      {auditReport.issues.map((issue: any) => {
                        const Icon = getIconForArea(issue.area);
                        return (
                          <div key={issue.id} className="bg-surface-container-lowest rounded-[32px] p-8 border border-outline-variant/10 shadow-sm group hover:border-primary/20 transition-all">
                            <div className="flex items-start gap-8">
                              <div className={cn(
                                "w-16 h-16 rounded-[24px] flex items-center justify-center shadow-sm",
                                issue.status === 'critical' ? "bg-error/5 text-error" : 
                                issue.status === 'improve' ? "bg-warning/5 text-warning" : "bg-success/5 text-success"
                              )}>
                                <Icon size={32} />
                              </div>
                              <div className="flex-1 space-y-6">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <h5 className="text-xl font-black text-on-surface tracking-tight">{issue.area}</h5>
                                    <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em]">Technical Optimization</p>
                                  </div>
                                  <span className={cn(
                                    "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest",
                                    issue.status === 'critical' ? "bg-error/10 text-error border border-error/20" : 
                                    issue.status === 'improve' ? "bg-warning/10 text-warning border border-warning/20" : "bg-success/10 text-success border border-success/20"
                                  )}>
                                    {issue.priority}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-on-surface-variant/70 leading-relaxed">
                                  {issue.problem}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                  <div className="bg-surface-container-low/50 rounded-2xl p-5 border border-outline-variant/5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-2">Rev Impact</p>
                                    <p className={cn(
                                      "text-xl font-black",
                                      issue.status === 'critical' ? "text-error" : "text-warning"
                                    )}>
                                      -${issue.impact.toLocaleString()}/mo
                                    </p>
                                  </div>
                                  <div className="bg-surface-container-low/50 rounded-2xl p-5 border border-outline-variant/5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-2">Action</p>
                                    <p className="text-sm font-black text-on-surface">
                                      {issue.action}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-auto pt-12 border-t border-outline-variant/10 flex items-center gap-4">
                    <button 
                      onClick={runAudit}
                      disabled={isAuditing}
                      className="flex-1 py-5 bg-surface-container-low border border-outline-variant/10 rounded-2xl font-black text-[11px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      {isAuditing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {isAuditing ? 'Regenerating...' : 'Regenerate'}
                    </button>
                    <button 
                      onClick={handleExportPDF}
                      disabled={isExporting}
                      className="flex-1 py-5 bg-surface-container-low border border-outline-variant/10 rounded-2xl font-black text-[11px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                      {isExporting ? 'Generating...' : 'Export Report'}
                    </button>
                    <button 
                      onClick={() => onStartStrategy?.(auditReport)}
                      className="flex-[1.5] py-5 bg-[#00ff85] text-on-surface font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-[0_20px_40px_rgba(0,255,133,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      Start Strategy
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </motion.div>
    </AnimatePresence>

      {/* Hidden PDF Template */}
      <div id="pdf-report-container" style={{ position: 'absolute', top: 0, left: '-9999px', width: '800px', zIndex: -100 }}>
        <div 
          ref={reportRef}
          className="w-[800px] bg-[#f5f5f0] p-16 space-y-12 font-serif"
          style={{ minHeight: '1131px' }} // A4 aspect ratio approx
        >
          {/* Header */}
          <div className="flex justify-between items-end border-b-2 border-on-surface pb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Logo className="w-10 h-10 rounded-full" />
                <span className="text-2xl font-black uppercase tracking-tighter">TitanLeap</span>
              </div>
              <h1 className="text-5xl font-black tracking-tight text-on-surface">Audit Report</h1>
            </div>
            <div className="text-right space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Confidential Analysis</p>
              <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Business Info */}
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Client</p>
              <p className="text-2xl font-black">{formData.businessName || 'Untitled Business'}</p>
              <p className="text-sm text-on-surface-variant">{formData.websiteUrl}</p>
            </div>
            <div className="space-y-2 text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Industry</p>
              <p className="text-xl font-bold">{formData.industry || 'Not Specified'}</p>
            </div>
          </div>

          {/* Revenue Gap Section */}
          <div className="bg-[#3b00b9] rounded-[40px] p-12 text-white relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Estimated Monthly Revenue Gap</p>
              <h2 className="text-7xl font-black tracking-tighter text-[#00ff85]">
                ${auditReport?.revenueGap?.toLocaleString() || '0'}
                <span className="text-2xl text-white/30 ml-3 font-medium">/mo</span>
              </h2>
              
              {/* Social Links in PDF */}
              {formData.socialHandles.some(h => h.trim() !== '') && (
                <div className="pt-4 border-t border-white/10 flex flex-wrap gap-4">
                  {formData.socialHandles.filter(h => h.trim() !== '').map((handle, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60">
                      {handle}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-lg font-medium text-white/70 max-w-xl leading-relaxed">
                This figure represents the immediate growth opportunity identified through our algorithmic analysis of your current funnel efficiency and market benchmarks.
              </p>
            </div>
          </div>

          {/* Pricing & Offer Details */}
          <div className="grid grid-cols-2 gap-8 bg-surface-container-low p-8 rounded-3xl border border-outline-variant/10">
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Primary Offer</p>
              <p className="text-lg font-black text-on-surface">{formData.mainOffer || 'N/A'}</p>
              <p className="text-xs text-on-surface-variant italic">"{formData.differentiator}"</p>
            </div>
            <div className="space-y-2 text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Price Point</p>
              <p className="text-2xl font-black text-primary">{formData.currency} {formData.pricePoint}</p>
              <p className="text-[10px] font-bold text-on-surface-variant/60">Pricing Page: {formData.pricingPageUrl || 'N/A'}</p>
            </div>
          </div>

          {/* Key Findings */}
          <div className="space-y-8">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/40 border-b border-outline-variant/10 pb-4">Critical Leakage Points</h3>
            <div className="space-y-8">
              {auditReport?.issues?.map((issue: any, idx: number) => (
                <div key={idx} className="grid grid-cols-12 gap-8 items-start">
                  <div className="col-span-1 text-4xl font-black text-on-surface-variant/20 italic">
                    0{idx + 1}
                  </div>
                  <div className="col-span-11 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-2xl font-black text-on-surface">{issue.area}</h4>
                      <span className="px-4 py-1 bg-error/10 text-error rounded-full text-[10px] font-black uppercase tracking-widest">
                        {issue.priority}
                      </span>
                    </div>
                    <p className="text-lg font-medium text-on-surface-variant leading-relaxed">
                      {issue.problem}
                    </p>
                    <div className="grid grid-cols-2 gap-8 pt-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Revenue Impact</p>
                        <p className="text-xl font-black text-error">-${issue.impact?.toLocaleString()}/mo</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Strategic Action</p>
                        <p className="text-base font-black text-on-surface">{issue.action}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-12 border-t border-outline-variant/10 flex justify-between items-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
              Generated by TitanLeap AI Growth Engine
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
              titanleap.ai
            </p>
          </div>
        </div>
      </div>
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
      className="w-full flex items-center justify-between p-8 hover:bg-primary/5 transition-colors group"
    >
      <div className="flex items-center gap-6">
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
