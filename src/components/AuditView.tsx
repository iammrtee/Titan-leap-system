import React, { useState, useMemo } from 'react';
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
  MousePointer2
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { auditLandingPage } from '@/src/services/ai';

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
  const [auditReport, setAuditReport] = useState<any>(null);

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
    setIsAuditing(true);
    try {
      const result = await auditLandingPage(formData);
      if (result) {
        setAuditReport({
          ...result,
          businessName: formData.businessName || 'Your Business',
          timestamp: new Date().toLocaleString(),
        });
      }
    } catch (error) {
      console.error("Audit failed:", error);
    } finally {
      setIsAuditing(false);
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
    <div className="max-w-[1600px] mx-auto p-8 space-y-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-6xl font-display font-black tracking-tight text-on-surface">Audit</h1>
          <p className="text-lg text-on-surface-variant font-medium max-w-2xl">
            Tell us about your business — we'll show you exactly where you're leaving money on the table.
          </p>
        </div>
        
        <div className="w-full md:w-80 space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Form Progress</span>
            <span className="text-2xl font-display font-black text-primary">{progress}%</span>
          </div>
          <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column - Intake Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-4">
            {/* Section 1 */}
            <CollapsibleSection 
              id={1} 
              title="Business Basics" 
              isOpen={expandedSections.includes(1)} 
              isComplete={isSectionComplete(1)}
              onToggle={() => toggleSection(1)}
            >
              <div className="space-y-6 p-6">
                <InputGroup label="Business Name">
                  <input 
                    type="text" 
                    value={formData.businessName}
                    onChange={e => setFormData({...formData, businessName: e.target.value})}
                    placeholder="e.g. Lumina Digital"
                    className="audit-input"
                  />
                </InputGroup>
                <InputGroup label="Industry / Niche">
                  <select 
                    value={formData.industry}
                    onChange={e => setFormData({...formData, industry: e.target.value})}
                    className="audit-input"
                  >
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </InputGroup>
                <InputGroup label="Business Website URL">
                  <input 
                    type="text" 
                    value={formData.websiteUrl}
                    onChange={e => setFormData({...formData, websiteUrl: e.target.value})}
                    placeholder="https://yourbusiness.com"
                    className="audit-input"
                  />
                </InputGroup>
                <InputGroup label="How long have you been in business?">
                  <select 
                    value={formData.businessDuration}
                    onChange={e => setFormData({...formData, businessDuration: e.target.value})}
                    className="audit-input"
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
                <InputGroup label="Primary platform">
                  <select 
                    value={formData.primaryPlatform}
                    onChange={e => setFormData({...formData, primaryPlatform: e.target.value})}
                    className="audit-input"
                  >
                    <option value="">Select Platform</option>
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </InputGroup>
                <InputGroup label="Social media handle(s)">
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
                <InputGroup label="Average monthly reach or impressions">
                  <input 
                    type="number" 
                    value={formData.monthlyReach}
                    onChange={e => setFormData({...formData, monthlyReach: e.target.value})}
                    placeholder="e.g. 50000"
                    className="audit-input"
                  />
                </InputGroup>
                <InputGroup label="Are you currently posting consistently?">
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
                <InputGroup label="What is your main product or service?">
                  <textarea 
                    value={formData.mainOffer}
                    onChange={e => setFormData({...formData, mainOffer: e.target.value})}
                    placeholder="Describe your offer..."
                    className="audit-input min-h-[100px] resize-none"
                  />
                </InputGroup>
                <InputGroup label="What is the price point?">
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
                <InputGroup label="Do you have an upsell or down-sell?">
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
                <InputGroup label="What makes your offer different from competitors?">
                  <textarea 
                    value={formData.differentiator}
                    onChange={e => setFormData({...formData, differentiator: e.target.value})}
                    placeholder="Your unique selling proposition..."
                    className="audit-input min-h-[100px] resize-none"
                  />
                </InputGroup>
                <InputGroup label="Current conversion rate if known (%)">
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
                  <InputGroup label="Current monthly revenue">
                    <input 
                      type="number" 
                      value={formData.currentRevenue}
                      onChange={e => setFormData({...formData, currentRevenue: e.target.value})}
                      placeholder="5000"
                      className="audit-input"
                    />
                  </InputGroup>
                  <InputGroup label="Target monthly revenue">
                    <input 
                      type="number" 
                      value={formData.targetRevenue}
                      onChange={e => setFormData({...formData, targetRevenue: e.target.value})}
                      placeholder="20000"
                      className="audit-input"
                    />
                  </InputGroup>
                </div>
                <InputGroup label="Timeline to hit target">
                  <select 
                    value={formData.timeline}
                    onChange={e => setFormData({...formData, timeline: e.target.value})}
                    className="audit-input"
                  >
                    <option value="">Select Timeline</option>
                    {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </InputGroup>
                <InputGroup label="Biggest challenge right now">
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
                <InputGroup label="Do you have a landing page?">
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
                <InputGroup label="Do you have a thank you page?">
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
                <InputGroup label="Do you have an email sequence?">
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
                <InputGroup label="What tools are you currently using?">
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
                <InputGroup label="Are you currently running paid ads?">
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
                <InputGroup label="Do you have existing content scripts or copy?">
                  <Toggle 
                    value={formData.hasScripts} 
                    onChange={v => setFormData({...formData, hasScripts: v})} 
                  />
                </InputGroup>
                <InputGroup label="What type of content do you post?">
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

          <div className="pt-8 space-y-4">
            <button 
              onClick={runAudit}
              disabled={isAuditing}
              className="w-full py-6 bg-[#00d1ff] text-on-surface font-black text-xl uppercase tracking-[0.2em] rounded-2xl shadow-[0_0_30px_rgba(0,209,255,0.3)] hover:shadow-[0_0_50px_rgba(0,209,255,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isAuditing ? (
                <>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap size={24} />
                  </motion.div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap size={24} fill="currentColor" />
                  Run Audit
                </>
              )}
            </button>
            <p className="text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
              Our AI will analyze your inputs and generate your revenue opportunity report
            </p>
          </div>
        </div>

        {/* Right Column - Audit Output */}
        <div className="lg:col-span-7">
          <div className="bg-surface-container-low rounded-[40px] border border-outline-variant/10 shadow-2xl min-h-[800px] flex flex-col sticky top-8 overflow-hidden">
            <AnimatePresence mode="wait">
              {!auditReport ? (
                <motion.div 
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center p-12 relative"
                >
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#00d1ff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                  <div className="w-24 h-24 rounded-3xl bg-surface-container-highest flex items-center justify-center text-[#00d1ff]/20 mb-6">
                    <BarChart3 size={48} />
                  </div>
                  <p className="text-xl font-display font-black text-[#00d1ff]/40 uppercase tracking-widest text-center">
                    Your audit report will appear here
                  </p>
                </motion.div>
              ) : (
                <motion.div 
                  key="report"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 flex flex-col p-10 space-y-10"
                >
                  {/* Report Header */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-success">
                        <CheckCircle2 size={12} />
                        Audit Generated
                      </div>
                      <h2 className="text-3xl font-display font-black text-on-surface">
                        Audit Report — {auditReport.businessName}
                      </h2>
                      <p className="text-xs font-medium text-on-surface-variant/60">
                        Last updated: {auditReport.timestamp}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-3 bg-surface-container-highest rounded-xl text-on-surface-variant hover:text-on-surface transition-colors">
                        <Share2 size={20} />
                      </button>
                      <button className="p-3 bg-surface-container-highest rounded-xl text-on-surface-variant hover:text-on-surface transition-colors">
                        <Download size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-primary rounded-[32px] p-10 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10 space-y-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Estimated Monthly Revenue Gap</p>
                      <div className="flex items-baseline gap-4">
                        <h3 className="text-7xl font-display font-black tracking-tighter text-[#00ff85]">
                          ${auditReport.revenueGap.toLocaleString()}
                          <span className="text-2xl text-white/40 ml-2">/mo</span>
                        </h3>
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
                          <TrendingUp size={16} className="text-[#00ff85]" />
                          <span className="text-xs font-black">24% Potential Increase</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-white/80 max-w-md leading-relaxed">
                        Our analysis shows high leakage in your middle-of-funnel conversion. Fixing these 3 critical items will bridge this gap within 45 days.
                      </p>
                    </div>
                  </div>

                  {/* Issue Cards */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Critical Leakage Points</h4>
                    <div className="grid grid-cols-1 gap-4">
                      {auditReport.issues.map((issue: any) => {
                        const Icon = getIconForArea(issue.area);
                        return (
                          <div key={issue.id} className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/10 shadow-sm group hover:border-primary/20 transition-all">
                            <div className="flex items-start gap-6">
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center",
                                issue.status === 'critical' ? "bg-error/10 text-error" : 
                                issue.status === 'improve' ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                              )}>
                                <Icon size={28} />
                              </div>
                              <div className="flex-1 space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <h5 className="text-lg font-black text-on-surface">{issue.area}</h5>
                                    <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Technical Optimization</p>
                                  </div>
                                  <span className={cn(
                                    "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                                    issue.status === 'critical' ? "bg-error/10 text-error border border-error/20" : 
                                    issue.status === 'improve' ? "bg-warning/10 text-warning border border-warning/20" : "bg-success/10 text-success border border-success/20"
                                  )}>
                                    {issue.priority}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-on-surface-variant leading-relaxed">
                                  {issue.problem}
                                </p>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                  <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/5">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-1">Rev Impact</p>
                                    <p className={cn(
                                      "text-lg font-black",
                                      issue.status === 'critical' ? "text-error" : "text-warning"
                                    )}>
                                      +${issue.impact.toLocaleString()}/mo
                                    </p>
                                  </div>
                                  <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/5">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40 mb-1">Action</p>
                                    <p className="text-xs font-black text-on-surface">
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
                  <div className="mt-auto pt-10 border-t border-outline-variant/10 flex items-center gap-4">
                    <button className="flex-1 py-4 bg-surface-container-highest rounded-2xl font-black text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-all">
                      Export Report
                    </button>
                    <button className="flex-1 py-4 bg-surface-container-highest rounded-2xl font-black text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-all">
                      Share with Client
                    </button>
                    <button 
                      onClick={() => onStartStrategy?.(auditReport)}
                      className="flex-[1.5] py-4 bg-[#00ff85] text-on-surface font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-[0_0_20px_rgba(0,255,133,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      Start Strategy
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const CollapsibleSection = ({ id, title, isOpen, isComplete, onToggle, children }: any) => (
  <div className="bg-surface-container-low rounded-[32px] border border-outline-variant/10 shadow-sm overflow-hidden">
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-6 hover:bg-surface-container-highest/50 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isComplete ? "bg-[#00ff85] shadow-[0_0_10px_rgba(0,255,133,0.5)]" : "bg-surface-container-highest"
        )} />
        <h3 className={cn(
          "text-xs font-black uppercase tracking-[0.2em]",
          isComplete ? "text-[#00ff85]" : "text-on-surface-variant"
        )}>
          Section {id} — {title}
        </h3>
      </div>
      {isOpen ? <ChevronUp size={20} className="text-on-surface-variant" /> : <ChevronDown size={20} className="text-on-surface-variant" />}
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="border-t border-outline-variant/10">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const InputGroup = ({ label, children }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">
      {label}
    </label>
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
      className="w-4 h-4 bg-white rounded-full shadow-sm"
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
