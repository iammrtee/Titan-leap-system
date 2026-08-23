import React, { useState } from 'react';
import { AuditFormData } from '../types';
import { ChevronRight, Loader2, Sparkles } from 'lucide-react';

interface AuditFormProps {
  onSubmit: (data: AuditFormData) => void;
  isLoading: boolean;
}

const INITIAL_STATE: AuditFormData = {
  businessName: '',
  industry: '',
  websiteUrl: '',
  duration: 'Less than 6 months',
  primaryPlatform: 'LinkedIn',
  socialHandles: '',
  monthlyReach: '',
  postingConsistency: 'Sometimes',
  mainProduct: '',
  pricePoint: '',
  pricingUrl: '',
  upsellDownsell: 'No',
  competitiveDifference: '',
  conversionRate: '',
  currentRevenue: '',
  targetRevenue: '',
  timeline: '90 days',
  biggestChallenge: 'Getting leads',
  landingPage: 'No',
  thankYouPage: 'No',
  emailSequence: 'No',
  toolsUsed: 'None',
  runningAds: 'No',
  existingScripts: 'No',
  contentTypes: 'Short-form video'
};

export function AuditForm({ onSubmit, isLoading }: AuditFormProps) {
  const [formData, setFormData] = useState<AuditFormData>(INITIAL_STATE);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-surface-container-low p-6 sm:p-8 rounded-3xl border border-outline-variant/10 shadow-sm">
      
      {/* Business Basics */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-on-surface tracking-tight flex items-center gap-2">
          <span className="bg-primary/10 text-primary p-1 rounded">01</span> Business Basics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Business Name</label>
            <input required type="text" name="businessName" value={formData.businessName} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" placeholder="Acme Corp" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Industry</label>
            <input required type="text" name="industry" value={formData.industry} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" placeholder="SaaS, Agency, etc." />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Website URL</label>
            <input required type="url" name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Duration</label>
            <select name="duration" value={formData.duration} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none">
              <option>Less than 6 months</option>
              <option>6 months - 1 year</option>
              <option>1-3 years</option>
              <option>3+ years</option>
            </select>
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-on-surface tracking-tight flex items-center gap-2">
          <span className="bg-primary/10 text-primary p-1 rounded">02</span> Social Media
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Primary Platform</label>
            <select name="primaryPlatform" value={formData.primaryPlatform} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none">
              <option>LinkedIn</option>
              <option>Twitter</option>
              <option>Instagram</option>
              <option>TikTok</option>
              <option>Facebook</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Social Handle(s)</label>
            <input type="text" name="socialHandles" value={formData.socialHandles} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" placeholder="@handle" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Average Monthly Reach</label>
            <input type="text" name="monthlyReach" value={formData.monthlyReach} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" placeholder="e.g. 10,000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Posting Consistency</label>
            <select name="postingConsistency" value={formData.postingConsistency} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none">
              <option>Yes</option>
              <option>No</option>
              <option>Sometimes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Offer */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-on-surface tracking-tight flex items-center gap-2">
          <span className="bg-primary/10 text-primary p-1 rounded">03</span> The Offer
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Main Product/Service</label>
            <input required type="text" name="mainProduct" value={formData.mainProduct} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" placeholder="What do you sell?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Price Point ($)</label>
            <input required type="number" name="pricePoint" value={formData.pricePoint} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" placeholder="2999" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Current Conv. Rate (%)</label>
            <input type="text" name="conversionRate" value={formData.conversionRate} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" placeholder="e.g. 2.5" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Competitive Difference</label>
            <textarea name="competitiveDifference" value={formData.competitiveDifference} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none h-20 resize-none" placeholder="Why do people buy from you instead of competitors?" />
          </div>
        </div>
      </div>

      {/* Revenue & Goals */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-on-surface tracking-tight flex items-center gap-2">
          <span className="bg-primary/10 text-primary p-1 rounded">04</span> Revenue & Goals
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Current Monthly Revenue ($)</label>
            <input required type="number" name="currentRevenue" value={formData.currentRevenue} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" placeholder="10000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Target Monthly Revenue ($)</label>
            <input required type="number" name="targetRevenue" value={formData.targetRevenue} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" placeholder="50000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Timeline to Target</label>
            <select name="timeline" value={formData.timeline} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none">
              <option>30 days</option>
              <option>60 days</option>
              <option>90 days</option>
              <option>6 months</option>
              <option>1 year</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Biggest Challenge</label>
            <select name="biggestChallenge" value={formData.biggestChallenge} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none">
              <option>Getting leads</option>
              <option>Converting leads</option>
              <option>Retaining clients</option>
              <option>Content creation</option>
              <option>Ads not working</option>
              <option>No clear strategy</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Funnel & Content */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-on-surface tracking-tight flex items-center gap-2">
          <span className="bg-primary/10 text-primary p-1 rounded">05</span> Funnel & Content
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Landing Page</label>
            <input type="text" name="landingPage" value={formData.landingPage} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" placeholder="Yes / No / URL" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Email Sequence</label>
            <select name="emailSequence" value={formData.emailSequence} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none">
              <option>Yes</option>
              <option>No</option>
              <option>In progress</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Running Paid Ads</label>
            <select name="runningAds" value={formData.runningAds} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none">
              <option>Yes</option>
              <option>No</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Content Types</label>
            <input type="text" name="contentTypes" value={formData.contentTypes} onChange={handleChange} className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2.5 text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-transparent outline-none" placeholder="Short-form video, blogs, etc." />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary hover:bg-primary/90 text-on-surface font-black py-4 px-6 uppercase tracking-widest text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Audit Report...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate TitanLeap Audit
            <ChevronRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
}
