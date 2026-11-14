import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Anchor, Network, LineChart, Download, Clapperboard, Info, Bolt, Search, Users, TrendingUp, Calendar, Upload, Clock, CheckCircle2, List, LayoutGrid, Filter, Plus, ChevronRight, Share2, MoreHorizontal, Instagram, Twitter, Linkedin, Youtube, Facebook, Play, Zap, Rocket, Loader2, Sparkles, AlertCircle, FileText, ExternalLink, MoreVertical, Target, RefreshCw, X, Terminal, Trash2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { generateContentScripts, generate30DayPlan, refinePlan, generateNotionContent, generateCalendarFromBlueprint, researchCompetitors, getAIBudget, smartFillForm, writeFullPost, fullPostToText, type CompetitorIntel } from '@/src/services/ai';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured, getAuthHeader } from '@/src/lib/supabase';
import { safeStorageName, toPostableJpeg } from '@/src/lib/postMedia';
import localforage from 'localforage';
import { ContentImport, type ImportedPost } from '@/src/components/ContentImport';
import { CalendarWeek, CalendarBoard, weekStartOf, STAGE_ORDER, STAGE_STYLE } from '@/src/components/CalendarViews';
import { ClientSwitcher } from '@/src/components/ClientSwitcher';
import { useClientId, clientKey, clientLabel } from '@/src/lib/clientProfile';
import { PlanStart, PlanCompetitors, OneIdea, PlanTabs, PlanOverview, EMPTY_BRIEF, type PlanBrief } from '@/src/components/ClientEngine';

type StrategyTab = 'competitor' | 'calendar' | 'plan';

interface CalendarItem {
  id: string;
  day: number;
  month: number; // 0-indexed
  year: number;
  platform: 'TikTok' | 'LinkedIn' | 'Instagram' | 'YouTube' | 'Twitter';
  title: string;
  description: string;
  // Workflow: draft = needs design/video · ready = asset attached · approved · scheduled · published = posted
  status: 'draft' | 'ready' | 'approved' | 'scheduled' | 'published';
  type: 'video' | 'article' | 'post';
  time: string;
  link?: string;
  tags?: string[];
  brand?: string;
  client?: string; // profile id ('default' = TitanLeap)
  media?: string[]; // attached design/video URLs
}

// The post's journey from idea to posted. Shown as a coloured dot/label everywhere.
const STAGES: Record<CalendarItem['status'], { label: string; dot: string; chip: string }> = {
  draft: { label: 'Needs design', dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600 border-slate-200' },
  ready: { label: 'Ready', dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  approved: { label: 'Approved', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  scheduled: { label: 'Scheduled', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  published: { label: 'Posted', dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700 border-violet-200' },
};
const stageOf = (s?: string) => STAGES[(s as CalendarItem['status'])] || STAGES.draft;

const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

interface DistributionJob {
  id: string;
  platform: string;
  caption: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  error_message?: string;
  scheduled_time: string;
  created_at: string;
}

const INITIAL_CALENDAR_ITEMS: CalendarItem[] = [
  {
    id: '1',
    day: 2,
    month: currentMonth,
    year: currentYear,
    platform: 'LinkedIn',
    title: 'Q4 Growth Strategy',
    description: '"Why SaaS founders are pivoting to..."',
    status: 'draft',
    type: 'article',
    time: '10:00 AM',
    link: 'docs.google.com/doc/1C...',
    tags: ['strategy', 'growth']
  },
  {
    id: '2',
    day: 4,
    month: currentMonth,
    year: currentYear,
    platform: 'Twitter',
    title: 'The Monolith Architecture',
    description: 'Why Speed is Your Only Moat',
    status: 'scheduled',
    type: 'post',
    time: '02:00 PM',
    link: 'notion.so/post/123',
    tags: ['tech', 'architecture']
  },
  {
    id: '3',
    day: 6,
    month: currentMonth,
    year: currentYear,
    platform: 'Instagram',
    title: 'Pro Announcement',
    description: '"Before joining any firm — ask better questions."',
    status: 'scheduled',
    type: 'video',
    time: '09:00 AM',
    link: 's3.assets/video_v4.mp4',
    tags: ['announcement', 'pro']
  },
  {
    id: '4',
    day: 7,
    month: currentMonth,
    year: currentYear,
    platform: 'YouTube',
    title: 'Weekly Tech Recap',
    description: '"Three truths and a lie about Thesaurus Guru."',
    status: 'published',
    type: 'video',
    time: '11:00 AM',
    link: 'youtu.be/x8d2...',
    tags: ['recap', 'tech']
  },
  {
    id: '5',
    day: 10,
    month: currentMonth,
    year: currentYear,
    platform: 'TikTok',
    title: 'POV: Automation',
    description: '"When the pipeline is full and you\'re..."',
    status: 'scheduled',
    type: 'video',
    time: '04:30 PM',
    link: 'tiktok.com/v/9218...',
    tags: ['automation', 'pov']
  },
  {
    id: '6',
    day: 24,
    month: currentMonth,
    year: currentYear,
    platform: 'LinkedIn',
    title: 'The Monolith Architecture: Why Speed is Your Only Moat',
    description: 'Deep dive into the TitanLeap technical stack and how we achieve 99th percentile rendering speeds across mobile devices. We explore the trade-offs between microservices and monoliths in early-stage scaling.',
    status: 'scheduled',
    type: 'article',
    time: '09:00 AM',
    tags: ['architecture', 'saas']
  }
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const StrategyHub: React.FC<{ auditData?: any; forceRegenerateTimestamp?: number }> = ({ auditData, forceRegenerateTimestamp }) => {
  const [activeTab, setActiveTab] = useState<StrategyTab>(auditData ? 'plan' : 'calendar');
  const [mode, setMode] = useState<'general' | 'per-link'>('general');
  const [handle, setHandle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isRefiningPlan, setIsRefiningPlan] = useState(false);
  const [refinementFeedback, setRefinementFeedback] = useState('');
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [thirtyDayPlan, setThirtyDayPlan] = useState<any>(null);
  // This view belongs to one client (App remounts it when the client changes).
  const clientId = useClientId();
  const clientOf = (it: { client?: string }) => it.client || 'default';
  // Competitor evidence the 30-day plan is built on (real top posts → proven patterns/hooks).
  const [competitorInput, setCompetitorInput] = useState<string>(() => { try { return localStorage.getItem(clientKey('titanleap_competitors')) || ''; } catch { return ''; } });
  const [competitorIntel, setCompetitorIntel] = useState<CompetitorIntel | null>(() => { try { return JSON.parse(localStorage.getItem(clientKey('titanleap_competitor_intel')) || 'null'); } catch { return null; } });
  const [isResearching, setIsResearching] = useState(false);
  const [openDay, setOpenDay] = useState<number | null>(0);
  const [planPlatforms, setPlanPlatforms] = useState<string[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem(clientKey('titanleap_plan_platforms')) || 'null'); if (Array.isArray(saved) && saved.length) return saved; } catch {}
    const p = String(auditData?.primaryPlatform || 'Instagram');
    return [/twitter|x\b/i.test(p) ? 'Twitter' : (['Instagram', 'TikTok', 'LinkedIn', 'YouTube', 'Facebook'].find(x => p.toLowerCase().includes(x.toLowerCase())) || 'Instagram')];
  });
  const choosePlatforms = (p: string[]) => { setPlanPlatforms(p); try { localStorage.setItem(clientKey('titanleap_plan_platforms'), JSON.stringify(p)); } catch {} };
  const [aiBudget, setAiBudget] = useState<{ spent: number; budget: number } | null>(null);
  const refreshBudget = () => { getAIBudget().then(b => b && setAiBudget(b)); };
  useEffect(() => { refreshBudget(); }, []);
  
  // File Input Ref to prevent bubbling issues
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Autopost State
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['ig', 'tt', 'li']);
  const [postScript, setPostScript] = useState('');
  const [profileId, setProfileId] = useState('default');
  const [postDate, setPostDate] = useState('2023-10-24');
  const [postTime, setPostTime] = useState('09:00');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [linkedinCompanyId, setLinkedinCompanyId] = useState(localStorage.getItem('titanleap_li_company_id') || '');

  // Daemon Terminal State
  const [showDaemonTerminal, setShowDaemonTerminal] = useState(false);
  const [daemonLogs, setDaemonLogs] = useState<string[]>([]);
  const [daemonProgress, setDaemonProgress] = useState(0);
  
  // Credentials State
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentialsPlatform, setCredentialsPlatform] = useState<'twitter' | 'linkedin' | 'facebook' | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [twitterCredentials, setTwitterCredentials] = useState({ username: '', password: '' });
  
  // Load persisted state from Supabase on mount
  useEffect(() => {
    const loadCloudData = async () => {
      if (!isSupabaseConfigured) {
        // Fallback to local storage if Supabase is not configured
        const savedCreds = localStorage.getItem('titanleap_twitter_creds');
        if (savedCreds) setTwitterCredentials(JSON.parse(savedCreds));
        const savedScript = localStorage.getItem('titanleap_post_script');
        if (savedScript) setPostScript(savedScript);
        const savedPlatforms = localStorage.getItem('titanleap_selected_platforms');
        if (savedPlatforms) setSelectedPlatforms(JSON.parse(savedPlatforms));
        const savedAssets = await localforage.getItem<{url: string, type: 'image' | 'video'}[]>('titanleap_uploaded_assets');
        if (savedAssets && savedAssets.length > 0) setUploadedAssets(savedAssets);
        return;
      }

      try {
        // Account credentials never load into the browser; connected accounts are handled server-side.

        // 2. Load Latest Draft
        const { data: draftData } = await supabase
          .from('posts')
          .select('*')
          .eq('profile_id', profileId)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (draftData) {
          setDraftId(draftData.id);
          if (draftData.caption) setPostScript(draftData.caption);
          if (draftData.platforms) setSelectedPlatforms(draftData.platforms);
          if (draftData.media_urls) setUploadedAssets(draftData.media_urls);
        }
      } catch (err) {
        console.error('Failed to load cloud data:', err);
      }
    };
    loadCloudData();
  }, [profileId]);

  // Sync Draft to Supabase (Debounced)
  useEffect(() => {
    // Don't sync empty initial state
    if (!postScript && uploadedAssets.length === 0) return;
    
    if (!isSupabaseConfigured) {
      localStorage.setItem('titanleap_post_script', postScript);
      localStorage.setItem('titanleap_selected_platforms', JSON.stringify(selectedPlatforms));
      localforage.setItem('titanleap_uploaded_assets', uploadedAssets).catch(console.error);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const payload = {
          profile_id: profileId,
          caption: postScript,
          platforms: selectedPlatforms,
          media_urls: uploadedAssets,
          status: 'draft',
          updated_at: new Date().toISOString()
        };
        
        if (draftId) {
          await supabase.from('posts').update(payload).eq('id', draftId);
        } else {
          const { data } = await supabase.from('posts').insert(payload).select().single();
          if (data) setDraftId(data.id);
        }
      } catch (e) {
        console.error('Failed to sync draft', e);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [postScript, selectedPlatforms, uploadedAssets, profileId, draftId]);

  const [isExtensionReady, setIsExtensionReady] = useState(
    // @ts-ignore
    !!window.__EXT_READY__
  );
  const [publishMode, setPublishMode] = useState<'api' | 'extension'>('api');

  // Listen for Extension Ready message
  useEffect(() => {
    // Check again on mount just in case
    // @ts-ignore
    if (window.__EXT_READY__) {
      setIsExtensionReady(true);
    }

    const pingInterval = setInterval(() => {
      window.postMessage({ type: 'TITANLEAP_PING_EXTENSION' }, '*');
      
      // Also do the bulletproof DOM probe check:
      if (document.getElementById('titanleap-extension-probe')) {
        setIsExtensionReady(true);
      }
    }, 1000);

    const handleMessage = (event: MessageEvent) => {
      // Intentionally removed source check to bypass inner/outer iframe window blocking
      if (event.data && event.data.type === 'TITANLEAP_EXTENSION_READY') {
        // @ts-ignore
        window.__EXT_READY__ = true;
        setIsExtensionReady(true);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(pingInterval);
    };
  }, []);

  const handlePublishClick = async () => {
    if (publishMode === 'api' && selectedAssets.length === 0) {
      toast.error('Please select at least one asset to publish via API.');
      return;
    }
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform.');
      return;
    }

    if (publishMode === 'extension') {
      if (!isExtensionReady) {
        toast.error('Extension not completely detected. Make sure you REFRESH the page after installing! Attempting forced execution anyway...');
        console.warn('Forcing execution even though extension flag might be off (in case of miscommunication).');
      }

      if (selectedPlatforms.includes('li') && !linkedinCompanyId.trim()) {
        toast.error('LinkedIn Company ID is required to post to a company page.');
        return;
      }

      if (selectedAssets.length === 0 && !postScript.trim()) {
        toast.error('You must have either selected a media asset or typed a caption.');
        return;
      }

      const mediaUrls = selectedAssets.map(index => uploadedAssets[index].url);
      let mediaBase64: string[] = [];
      
      if (mediaUrls.length > 0) {
        toast.info('Converting media for browser extension...');
        try {
          mediaBase64 = await Promise.all(mediaUrls.map(url => getBase64FromUrl(url)));
        } catch (e) {
          console.error("Media conversion error (CORS?). The extension will attempt to fetch it directly.", e);
        }
      }

      // Send command to the Chrome Extension
      toast.success('Executing via Local Extension (Auto-Uploading & Posting)...');
      window.postMessage({
        type: "TITANLEAP_EXECUTE_POST",
        payload: {
          platforms: selectedPlatforms,
          caption: postScript,
          mediaBase64,
          mediaUrls, // Added mediaUrls as backup for CORS-blocked content
          linkedinCompanyId
        }
      }, "*");
    } else {
      // API Mode
      if (selectedPlatforms.includes('tw') || selectedPlatforms.includes('x')) {
        setCredentialsPlatform('twitter');
        setShowCredentialsModal(true);
      } else if (selectedPlatforms.includes('li')) {
        setCredentialsPlatform('linkedin');
        setShowCredentialsModal(true);
      } else if (selectedPlatforms.includes('fb')) {
        setCredentialsPlatform('facebook');
        setShowCredentialsModal(true);
      } else {
        executePublish();
      }
    }
  };

  const togglePlatformSelection = (id: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) 
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const getBase64FromUrl = async (url: string): Promise<string> => {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob); 
      reader.onloadend = () => {
        resolve(reader.result as string);
      }
    });
  };

  const executePublish = async () => {
    setShowCredentialsModal(false);
    setIsPublishing(true);
    setShowDaemonTerminal(true);
    setDaemonLogs(['[SYSTEM] Initializing headless daemon environment...']);
    setDaemonProgress(10);
    
    try {
      const mediaUrls = selectedAssets.map(index => uploadedAssets[index].url);
      
      // If only Twitter/X is selected, use the manual OAuth 1.0a route
      if (selectedPlatforms.length === 1 && (selectedPlatforms[0] === 'tw' || selectedPlatforms[0] === 'x')) {
        setDaemonLogs(prev => [...prev, '[TWITTER] Converting media to base64...']);
        setDaemonProgress(30);
        
        const mediaBase64 = await Promise.all(mediaUrls.map(url => getBase64FromUrl(url)));
        
        setDaemonLogs(prev => [...prev, '[TWITTER] Executing OAuth 1.0a signing and posting...']);
        setDaemonProgress(60);

        const response = await fetch('/api/twitter/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
          body: JSON.stringify({
            text: postScript,
            mediaBase64
          })
        });

        const data = await response.json();
        
        if (data.success) {
          setDaemonLogs(prev => [...prev, '[TWITTER] Successfully posted to X!']);
          setDaemonProgress(100);
          toast.success('Successfully posted to X (Twitter)!');
        } else {
          throw new Error(data.error || "Failed to post to X");
        }
        
        setTimeout(() => {
          setIsPublishing(false);
          setShowDaemonTerminal(false);
          setPostScript('');
          setSelectedAssets([]);
          setSelectedPlatforms([]);
        }, 2000);
        
        return;
      }

      const platformMap: Record<string, string> = {
        'ig': 'instagram',
        'tt': 'tiktok',
        'fb': 'facebook',
        'tw': 'x',
        'li': 'linkedin',
        'yt': 'youtube'
      };

      const scheduledTime = new Date(`${postDate}T${postTime}:00`).toISOString();

      const jobs = selectedPlatforms.map(pId => ({
        platform: platformMap[pId] || pId,
        caption: postScript,
        media_urls: mediaUrls,
        scheduled_time: scheduledTime,
        status: 'pending',
        metadata: {
          profile_id: profileId,
          expected_handle: null
        }
      }));

      // Simulate the bot process with logs
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
      
      await delay(800);
      setDaemonLogs(prev => [...prev, `[AUTH] Establishing secure connection to ${selectedPlatforms.length} platforms...`]);
      setDaemonProgress(30);
      
      await delay(1200);
      setDaemonLogs(prev => [...prev, '[NETWORK] Bypassing rate limits via residential proxy pool...']);
      setDaemonProgress(50);
      
      await delay(1000);
      setDaemonLogs(prev => [...prev, `[MEDIA] Transcoding and uploading ${selectedAssets.length} assets...`]);
      setDaemonProgress(70);
      
      await delay(1500);
      setDaemonLogs(prev => [...prev, '[API] Dispatching payload to backend Node.js server...']);
      
      // Actual API call to our new Node.js backend
      try {
        // Gather tokens from local storage (fallback) - check profile specific first
        const tokens = {
          linkedin: localStorage.getItem(`titanleap_linkedin_token_${profileId}`) || localStorage.getItem('titanleap_linkedin_token'),
          twitter: localStorage.getItem(`titanleap_twitter_token_${profileId}`) || localStorage.getItem('titanleap_twitter_token'),
          facebook: localStorage.getItem(`titanleap_facebook_token_${profileId}`) || localStorage.getItem('titanleap_facebook_token')
        };

        const daemonAuthHeader = await getAuthHeader();
        const response = await fetch('/api/daemon/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...daemonAuthHeader },
          body: JSON.stringify({
            platforms: selectedPlatforms.map(p => platformMap[p] || p),
            mediaUrls,
            caption: postScript,
            scheduledTime,
            tokens, // Pass tokens to backend
            linkedinCompanyId
          })
        });
        
        const data = await response.json();
        
        if (data.logs && Array.isArray(data.logs)) {
          // Append the real backend logs
          setDaemonLogs(prev => [...prev, ...data.logs]);
        }
        
        if (!data.success) {
          throw new Error(data.error || "Backend daemon failed to execute");
        }
      } catch (e: any) {
        console.warn("Backend execution error", e);
        throw e;
      }
      
      setDaemonProgress(90);
      await delay(800);
      setDaemonLogs(prev => [...prev, '[SUCCESS] Jobs successfully queued in distribution engine.']);
      setDaemonProgress(100);
      
      await delay(1000);

      const newJobs = jobs.map(job => ({
        ...job,
        id: Math.random().toString(36).substring(7),
        created_at: new Date().toISOString()
      })) as DistributionJob[];

      setDistributionJobs(prev => [...newJobs, ...prev].slice(0, 10));

      toast.success(`Successfully scheduled across ${selectedPlatforms.length} platforms!`);
      setSelectedAssets([]);
      setShowDaemonTerminal(false);
    } catch (error: any) {
      console.error('Failed to schedule posts:', error);
      setDaemonLogs(prev => [...prev, `[ERROR] ${error.message || 'Unknown error occurred'}`]);
      toast.error(`Failed to schedule: ${error.message || 'Unknown error'}`);
      await new Promise(res => setTimeout(res, 2000));
      setShowDaemonTerminal(false);
    } finally {
      setIsPublishing(false);
    }
  };

  // Calendar State
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>(() => {
    try {
      const saved = localStorage.getItem('titanleap_calendar_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_CALENDAR_ITEMS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('titanleap_calendar_items', JSON.stringify(calendarItems));
    } catch {}
  }, [calendarItems]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return { day: today.getDate(), month: today.getMonth(), year: today.getFullYear() };
  });
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);
  const [newItem, setNewItem] = useState<Partial<CalendarItem>>({
    platform: 'Instagram',
    type: 'video',
    status: 'scheduled',
    time: '09:00 AM'
  });

  // Filter State
  const [filters, setFilters] = useState({
    platform: [] as string[],
    status: [] as string[],
    type: [] as string[]
  });
  const [showFilters, setShowFilters] = useState(false);
  // Two brands only: Company (default) and Personal. Personal is an opt-in per user, saved in
  // Supabase (user_prefs) with localStorage as a fallback.
  type Brand = 'company' | 'personal';
  const BRAND_LABEL: Record<Brand, string> = { company: 'Company', personal: 'Personal' };
  const [personalEnabled, setPersonalEnabledState] = useState<boolean>(() => { try { return localStorage.getItem('titanleap_personal_brand') === '1'; } catch { return false; } });
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/prefs', { headers: await getAuthHeader() });
        if (r.ok) { const d = await r.json(); setPersonalEnabledState(!!d.personalBrand); try { localStorage.setItem('titanleap_personal_brand', d.personalBrand ? '1' : '0'); } catch {} }
      } catch {}
    })();
  }, []);
  const setPersonalEnabled = async (on: boolean) => {
    setPersonalEnabledState(on);
    if (!on) setActiveBrand('company');
    try { localStorage.setItem('titanleap_personal_brand', on ? '1' : '0'); } catch {}
    try { await fetch('/api/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) }, body: JSON.stringify({ personalBrand: on }) }); } catch {}
    toast.success(on ? 'Personal brand added. Switch between Company and Personal above the calendar.' : 'Personal brand turned off');
  };
  // View: one brand, or All (both together, each post labelled).
  type BrandView = Brand | 'all';
  const [activeBrand, setActiveBrandState] = useState<BrandView>(() => { try { const v = localStorage.getItem('titanleap_active_brand'); return v === 'personal' || v === 'all' ? v : 'company'; } catch { return 'company'; } });
  const setActiveBrand = (b: BrandView) => { setActiveBrandState(b); try { localStorage.setItem('titanleap_active_brand', b); } catch {} };
  const brandOf = (it: { brand?: string }): Brand => (it.brand === 'personal' ? 'personal' : 'company');
  // Before syncing a plan to the calendar, people with a personal brand pick which one.
  const [brandPick, setBrandPick] = useState<null | 'sync' | 'draft'>(null);
  const [showImport, setShowImport] = useState(false);

  // Regen for Notion State
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDraftingCalendar, setIsDraftingCalendar] = useState(false);

  // Queue / History State
  const [distributionJobs, setDistributionJobs] = useState<DistributionJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  const fetchJobs = async () => {
    setIsLoadingJobs(true);
    try {
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 800));
      // Keep existing local state instead of fetching from non-existent Supabase table
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setIsLoadingJobs(false);
    }
  };


  const filteredCalendarItems = calendarItems.filter(item => {
    const platformMatch = filters.platform.length === 0 || filters.platform.includes(item.platform);
    const statusMatch = filters.status.length === 0 || filters.status.includes(item.status);
    const typeMatch = filters.type.length === 0 || filters.type.includes(item.type);
    const brandMatch = !personalEnabled || activeBrand === 'all' || brandOf(item) === activeBrand;
    return clientOf(item) === clientId && platformMatch && statusMatch && typeMatch && brandMatch;
  });

  const toggleFilter = (category: 'platform' | 'status' | 'type', value: string) => {
    setFilters(prev => {
      const current = prev[category];
      const next = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: next };
    });
  };

  const clearFilters = () => {
    setFilters({ platform: [], status: [], type: [] });
  };

  // Persistence: Load saved data on mount
  useEffect(() => {
    const savedPlan = localStorage.getItem(clientKey('titanleap_strategy_plan'));
    const savedCalendar = localStorage.getItem('titanleap_calendar_items');
    
    if (savedPlan) {
      try {
        const parsedPlan = JSON.parse(savedPlan);
        if (parsedPlan && parsedPlan.strategicSyncSummary) {
          setThirtyDayPlan(parsedPlan);
        }
      } catch (e) {
        console.error("Failed to parse saved plan", e);
      }
    }
    
    if (savedCalendar) {
      try {
        setCalendarItems(JSON.parse(savedCalendar));
      } catch (e) {
        console.error("Failed to parse saved calendar items", e);
      }
    }
  }, []);

  // Calendar lives in Supabase per user and per brand (server: /api/calendar). localStorage
  // stays as the offline copy. Saves are debounced and send the whole calendar, so deletes
  // and Clear stick too.
  const calendarLoaded = React.useRef(false);
  const calendarMigrated = React.useRef(false);
  const [calendarCloud, setCalendarCloud] = useState<'loading' | 'on' | 'off'>('loading');
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/calendar', { headers: await getAuthHeader() });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) { setCalendarCloud('off'); if (data.needsSetup) console.warn('[Calendar] Supabase needs schema section 17:', data.error); return; }
        calendarMigrated.current = !!data.migrated;
        if (Array.isArray(data.items) && data.items.length) setCalendarItems(data.items);
        else if (Array.isArray(data.items)) {
          // Nothing in the cloud yet: keep this browser's calendar and upload it (minus the demo posts).
          setCalendarItems(prev => prev.filter(it => !/^\d+$/.test(it.id)));
        }
        setCalendarCloud('on');
      } catch { setCalendarCloud('off'); }
      finally { calendarLoaded.current = true; }
    })();
  }, []);
  useEffect(() => {
    if (!calendarLoaded.current || calendarCloud !== 'on') return;
    const t = setTimeout(async () => {
      try {
        const r = await fetch('/api/calendar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) },
          body: JSON.stringify({ items: calendarItems, migrated: calendarMigrated.current }),
        });
        if (r.ok) calendarMigrated.current = false;
      } catch (e) { console.error('Failed to save the calendar', e); }
    }, 1200);
    return () => clearTimeout(t);
  }, [calendarItems, calendarCloud]);

  // Persistence: Save data on change
  useEffect(() => {
    if (thirtyDayPlan && thirtyDayPlan.strategicSyncSummary) {
      localStorage.setItem(clientKey('titanleap_strategy_plan'), JSON.stringify(thirtyDayPlan));
    }
  }, [thirtyDayPlan]);

  useEffect(() => {
    try { localStorage.setItem('titanleap_calendar_items', JSON.stringify(calendarItems)); } catch {}
  }, [calendarItems]);

  const handleFileUpload = async (e: React.DragEvent | React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    let files: FileList | null = null;
    
    if ('dataTransfer' in e) {
      files = e.dataTransfer.files;
    } else if ('target' in e && e.target.files) {
      files = e.target.files;
    }

    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);

    setIsUploading(true);
    setUploadProgress(0);
    
    const newAssets: {url: string, type: 'image' | 'video'}[] = [];
    let invalidFilesCount = 0;
    
    const progressStep = 100 / filesArray.length;
    let currentProgress = 0;

    for (const file of filesArray) {
      const isImage = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name || '');
      const isVideo = file.type?.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name || '');

      if (isImage || isVideo) {
        // Platforms fetch media by URL, so a failed upload is reported instead of
        // falling back to a browser-only blob: URL that can never be published.
        try {
          if (!isSupabaseConfigured) throw new Error('Storage is not configured');
          if (file.size > 50 * 1024 * 1024) throw new Error('File is over 50MB');
          const upload = isImage ? (await toPostableJpeg(file)).file : file;
          const filePath = `${profileId}/${Date.now()}_${safeStorageName(upload.name)}`;

          const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(filePath, upload, {
              cacheControl: '3600',
              contentType: upload.type || undefined,
              upsert: false
            });
          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);
          newAssets.push({ url: publicUrl, type: isImage ? 'image' : 'video' });
        } catch (error: any) {
          console.error('Error uploading file:', error);
          toast.error(`Couldn't upload ${file.name}`, { description: error?.message || 'Storage upload failed.' });
        }
      } else {
        invalidFilesCount++;
      }
      
      currentProgress += progressStep;
      setUploadProgress(Math.round(currentProgress));
    }

    setIsUploading(false);
    
    // Clear the input value at the end so the same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    if (newAssets.length > 0) {
      setUploadedAssets(prevAssets => [...prevAssets, ...newAssets]);
      if (invalidFilesCount > 0) {
        toast.warning(`Uploaded ${newAssets.length} files. Skipped ${invalidFilesCount} invalid files.`);
      } else {
        toast.success(`Successfully uploaded ${newAssets.length} files.`);
      }
    } else if (invalidFilesCount > 0) {
      toast.error('Please upload valid image or video files (e.g. .jpg, .png, .mp4).');
    }
  };

  const handleDeleteAsset = (indexToDelete: number) => {
    setUploadedAssets(prevAssets => prevAssets.filter((_, index) => index !== indexToDelete));
    setSelectedAssets(prev => prev.filter(i => i !== indexToDelete).map(i => i > indexToDelete ? i - 1 : i));
  };

  const toggleAssetSelection = (index: number) => {
    setSelectedAssets(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const selectedDayItems = filteredCalendarItems.filter(item => 
    item.day === selectedDate.day && 
    item.month === selectedDate.month && 
    item.year === selectedDate.year
  );

  const handleSaveContent = () => {
    if (!newItem.title) return;
    
    if (editingItem) {
      setCalendarItems(prev => prev.map(item => 
        item.id === editingItem.id ? { ...item, ...newItem } as CalendarItem : item
      ));
    } else {
      const item: CalendarItem = {
        id: Math.random().toString(36).substr(2, 9),
        platform: 'Instagram',
        title: '',
        description: '',
        status: 'scheduled',
        type: 'video',
        time: '09:00 AM',
        ...newItem,
        day: selectedDate.day,
        month: selectedDate.month,
        year: selectedDate.year,
        client: clientId,
      } as CalendarItem;
      setCalendarItems([...calendarItems, item]);
    }

    setShowAddModal(false);
    setEditingItem(null);
    setNewItem({
      platform: 'Instagram',
      type: 'video',
      status: 'scheduled',
      time: '09:00 AM'
    });
  };

  const handleDeleteContent = (id: string) => {
    setCalendarItems(prev => prev.filter(item => item.id !== id));
  };

  // Click a post → popup with everything. Clear empties the calendar (with Undo).
  const [viewItem, setViewItemState] = useState<CalendarItem | null>(null);
  const [popupMax, setPopupMax] = useState(false);
  const setViewItem = (it: CalendarItem | null) => { setViewItemState(it); if (!it) setPopupMax(false); };
  // (popupTab resets to Post whenever a different post opens; see the effect below)
  const [confirmClear, setConfirmClear] = useState(false);
  const handleClearCalendar = () => {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3500); return; }
    const before = calendarItems;
    const keep = before.filter(it => clientOf(it) !== clientId || (personalEnabled && activeBrand !== 'all' && brandOf(it) !== activeBrand));
    setCalendarItems(keep);
    setConfirmClear(false);
    toast.success(`${personalEnabled && activeBrand !== 'all' ? `${BRAND_LABEL[activeBrand]} calendar` : 'Calendar'} cleared (${before.length - keep.length} posts)`, { action: { label: 'Undo', onClick: () => setCalendarItems(before) }, duration: 8000 });
  };

  const handleImportContent = (posts: ImportedPost[], brandName: string, replace: boolean) => {
    const brand: Brand = brandName === 'personal' ? 'personal' : 'company';
    const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const dates = new Set(posts.map(p => key(p.date)));
    const fresh: CalendarItem[] = posts.map(p => ({
      id: `imp-${Math.random().toString(36).slice(2, 10)}`,
      day: p.date.getDate(), month: p.date.getMonth(), year: p.date.getFullYear(),
      platform: p.platform as CalendarItem['platform'], title: p.title, description: p.description,
      status: (p.status as CalendarItem['status']) || 'draft', type: p.type, time: p.time, tags: ['imported'], brand, client: clientId,
    }));
    const before = calendarItems;
    setCalendarItems(prev => [
      ...prev.filter(it => !(replace && clientOf(it) === clientId && brandOf(it) === brand && dates.has(`${it.year}-${it.month}-${it.day}`))),
      ...fresh,
    ]);
    if (personalEnabled && activeBrand !== 'all') setActiveBrand(brand);
    const first = posts[0]?.date;
    if (first) setSelectedDate({ day: first.getDate(), month: first.getMonth(), year: first.getFullYear() });
    toast.success(`Added ${fresh.length} posts${personalEnabled ? ` to ${BRAND_LABEL[brand]}` : ''}`, { action: { label: 'Undo', onClick: () => setCalendarItems(before) }, duration: 8000 });
  };

  // Calendar views: Week (default), Month, Board (by stage).
  const [calView, setCalViewState] = useState<'week' | 'month' | 'board'>(() => { try { const v = localStorage.getItem('titanleap_cal_view'); return v === 'month' || v === 'board' ? v : 'week'; } catch { return 'week'; } });
  const setCalView = (v: 'week' | 'month' | 'board') => { setCalViewState(v); try { localStorage.setItem('titanleap_cal_view', v); } catch {} };
  const [weekStart, setWeekStart] = useState<Date>(() => weekStartOf(new Date()));
  const shiftWeek = (n: number) => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7 * n); return d; });
  const addPostOn = (d: Date) => {
    setSelectedDate({ day: d.getDate(), month: d.getMonth(), year: d.getFullYear() });
    setEditingItem(null);
    setNewItem({ platform: 'Instagram', type: 'post', status: 'draft', time: '09:00 AM' });
    setShowAddModal(true);
  };
  const weekLabel = (() => {
    const end = new Date(weekStart); end.setDate(end.getDate() + 6);
    const m = (d: Date) => d.toLocaleDateString(undefined, { month: 'short' });
    return weekStart.getMonth() === end.getMonth()
      ? `${m(weekStart)} ${weekStart.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
      : `${m(weekStart)} ${weekStart.getDate()} – ${m(end)} ${end.getDate()}, ${end.getFullYear()}`;
  })();

  const handleEditClick = (item: CalendarItem) => {
    setEditingItem(item);
    setNewItem(item);
    setShowAddModal(true);
  };

  const handleSendToProduction = (item: CalendarItem) => {
    const platformMap: Record<CalendarItem['platform'], { platform: string; forceType?: 'video' | 'design' }> = {
      'TikTok': { platform: 'tiktok', forceType: 'video' },
      'YouTube': { platform: 'youtube', forceType: 'video' },
      'Instagram': { platform: 'instagram' },
      'LinkedIn': { platform: 'linkedin' },
      'Twitter': { platform: 'poster', forceType: 'design' },
    };
    const mapping = platformMap[item.platform] || { platform: 'poster' };
    const taskType: 'video' | 'design' = mapping.forceType || (item.type === 'video' ? 'video' : 'design');
    const dueDate = new Date(item.year, item.month, item.day);
    const task = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: taskType,
      platform: mapping.platform,
      title: item.title,
      brief: item.description,
      assignee: '',
      due: dueDate.toISOString().split('T')[0],
      status: 'inprogress',
      checks: {},
      reviewLink: item.link,
    };
    try {
      const existingRaw = localStorage.getItem('titanleap_pending_production');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      existing.push(task);
      localStorage.setItem('titanleap_pending_production', JSON.stringify(existing));
      toast.success('Sent to Production queue', {
        description: `${item.title} added to the ${taskType === 'video' ? 'Video Editor' : 'Designer'} lane.`
      });
    } catch (err) {
      console.error('Failed to send to production:', err);
      toast.error('Failed to send to production queue');
    }
  };

  const handleGenerateScripts = async () => {
    if (!handle) return;
    setIsGenerating(true);
    try {
      const result = await generateContentScripts(handle, mode);
      setAuditResult(result);
    } catch (error: any) {
      console.error("Failed to generate scripts:", error);
      toast.error(`Error generating scripts: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const [generationState, setGenerationState] = useState<'idle' | 'crafting' | 'building' | 'completed'>('idle');

  // Write one planned day out in full (every slide / script beat / tweet), save it on the plan
  // and on the synced calendar item.
  const [writingDay, setWritingDay] = useState<number | null>(null);
  const handleWriteFull = async (idx: number): Promise<string | null> => {
    const day = thirtyDayPlan?.calendar?.[idx];
    if (!day || writingDay !== null) return null;
    setWritingDay(idx);
    try {
      const full = await writeFullPost(day, thirtyDayPlan, { ...businessContext(), voice: personalEnabled && activeBrand === 'personal' ? 'personal' : 'company' });
      setThirtyDayPlan((p: any) => { const cal = [...(p?.calendar || [])]; cal[idx] = { ...cal[idx], full }; return { ...p, calendar: cal }; });
      const text = fullPostToText(full);
      setCalendarItems(prev => prev.map(it => it.id.startsWith(`ai-${idx}-`) ? { ...it, description: text } : it));
      return text;
    } catch (err: any) {
      toast.error(err.message || 'Could not write the full post');
      return null;
    } finally {
      setWritingDay(null);
      refreshBudget();
    }
  };
  // Expand any calendar post (imported or typed) into the full thing, using its hook/body/
  // caption/CTA as the brief. Saved back onto the post.
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const handleExpandItem = async (item: CalendarItem) => {
    if (expandingId) return;
    const part = (label: string) => {
      const m = String(item.description || '').match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=\\n(?:HOOK|BODY|CAPTION|CTA|OTHER PLATFORMS|NOTES|Modeled on)\\b|$)`));
      return m ? m[1].trim() : '';
    };
    const day = {
      platform: item.platform, format: item.type === 'video' ? 'Video' : item.type === 'article' ? 'Article' : 'Post',
      hook: part('HOOK') || item.title, message: item.title, body: part('BODY') || item.description,
      caption: part('CAPTION'), cta: part('CTA'),
    };
    setExpandingId(item.id);
    try {
      const full = await writeFullPost(day, { engine: { cta: day.cta || thirtyDayPlan?.engine?.cta } }, { ...businessContext(), voice: brandOf(item) });
      const text = fullPostToText(full);
      setCalendarItems(prev => prev.map(it => it.id === item.id ? { ...it, description: text } : it));
      toast.success('Full post written');
    } catch (err: any) {
      toast.error(err.message || 'Could not expand the post');
    } finally {
      setExpandingId(null);
      refreshBudget();
    }
  };
  const to24h = (t?: string) => {
    const m = String(t || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return '';
    let h = Number(m[1]) % 12;
    if (m[3]?.toUpperCase() === 'PM') h += 12; else if (!m[3]) h = Number(m[1]);
    return `${String(h).padStart(2, '0')}:${m[2]}`;
  };
  const to12h = (t: string) => {
    const [hh, mm] = t.split(':').map(Number);
    if (Number.isNaN(hh)) return t;
    return `${String(((hh + 11) % 12) + 1).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  };

  // A plan can come from the audit or from a quick brief (no audit needed).
  const [planSource, setPlanSource] = useState<'audit' | 'brief'>(() => (auditData ? 'audit' : 'brief'));
  const [brief, setBriefState] = useState<PlanBrief>(() => {
    try { return { ...EMPTY_BRIEF, ...JSON.parse(localStorage.getItem(clientKey('titanleap_plan_brief')) || '{}') }; }
    catch { return { ...EMPTY_BRIEF }; }
  });
  const setBrief = (b: PlanBrief) => { setBriefState(b); try { localStorage.setItem(clientKey('titanleap_plan_brief'), JSON.stringify(b)); } catch {} };
  const [smartFilling, setSmartFilling] = useState(false);
  const [showPlanStart, setShowPlanStart] = useState(false);
  useEffect(() => { if (!auditData && planSource === 'audit') setPlanSource('brief'); }, [auditData]);

  const handleBriefSmartFill = async () => {
    if (!brief.websiteUrl.trim()) return;
    setSmartFilling(true);
    try {
      const d: any = await smartFillForm(brief.websiteUrl.trim());
      setBrief({
        ...brief,
        businessName: d?.businessName || brief.businessName,
        industry: d?.industry || brief.industry,
        mainOffer: d?.mainOffer || brief.mainOffer,
        result: brief.result || d?.differentiator || '',
        audience: d?.targetAudience || d?.audience || brief.audience,
        socialHandles: Array.isArray(d?.socialHandles) ? d.socialHandles.join(', ') : (d?.socialHandles || brief.socialHandles),
      });
      toast.success('Filled from the website. Check it, then generate.');
    } catch (err: any) {
      toast.error(err.message || 'Smart Fill failed. Fill the fields in yourself.');
    } finally {
      setSmartFilling(false);
    }
  };

  // Business details for research and the plan: the audit (report + intake form) or the brief.
  const businessContext = () => {
    if (planSource === 'brief' || !auditData) {
      return { ...brief, targetAudience: brief.audience, socialHandles: brief.socialHandles || (/instagram|tiktok|x\.com|twitter/i.test(brief.websiteUrl) ? brief.websiteUrl : '') };
    }
    let form: any = {};
    try { form = JSON.parse(localStorage.getItem('titanleap_audit_form') || '{}') || {}; } catch {}
    return { ...form, ...(auditData || {}), websiteUrl: auditData?.websiteUrl || form.websiteUrl, socialHandles: auditData?.socialHandles || form.socialHandles };
  };

  // Empty box = smart fill: the server finds the competitors itself, then scrapes them.
  const handleResearchCompetitors = async (silent = false, autoPick = false): Promise<CompetitorIntel | null> => {
    const typed = competitorInput.trim() || (planSource === 'brief' ? (brief.competitors || '') : '');
    const list = autoPick ? [] : typed.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (list.length > 5 && !silent) toast.message('Using the first 5 competitors');
    setIsResearching(true);
    try {
      const ctx = businessContext();
      const intel = { ...(await researchCompetitors(list.slice(0, 5), ctx)), forBusiness: ctx.businessName || '' };
      setCompetitorIntel(intel);
      try { localStorage.setItem(clientKey('titanleap_competitor_intel'), JSON.stringify(intel)); } catch {}
      if (!list.length && intel.competitors?.length) {
        const filled = intel.competitors.map((c: any) => c.input).join('\n');
        setCompetitorInput(filled);
        try { localStorage.setItem(clientKey('titanleap_competitors'), filled); } catch {}
      } else {
        try { localStorage.setItem(clientKey('titanleap_competitors'), competitorInput); } catch {}
      }
      const posts = intel.competitors.reduce((n: number, c: any) => n + (c.postsAnalyzed || 0), 0);
      if (!silent) toast.success('Competitor research done', { description: `${intel.competitors.length} competitors, ${posts} real posts analysed.` });
      return intel;
    } catch (err: any) {
      toast.error(err.message || 'Competitor research failed');
      return null;
    } finally {
      setIsResearching(false);
      refreshBudget();
    }
  };

  const handleGeneratePlan = async () => {
    const ctx = businessContext();
    if (isGeneratingPlan || !(ctx.businessName || ctx.mainOffer || ctx.mainProduct)) {
      if (!isGeneratingPlan) toast.error('Add your brand name and what you sell first');
      return;
    }
    setIsGeneratingPlan(true);
    setShowPlanStart(false);
    setGenerationState('crafting');
    try {
      // No evidence yet (or it was for another business): find and study competitors first.
      let intel = competitorIntel;
      const sameBusiness = !!intel && ((intel as any).forBusiness ?? ctx.businessName ?? '') === (ctx.businessName || '');
      if (!intel || !sameBusiness) intel = await handleResearchCompetitors(true, !sameBusiness && !!intel);
      setGenerationState('building');

      const plan = await generate30DayPlan(ctx, intel, planPlatforms, personalEnabled && activeBrand === 'personal' ? 'personal' : 'company');
      refreshBudget();
      
      if (plan && plan.strategicSyncSummary) {
        setGenerationState('completed');
        setThirtyDayPlan({ ...plan, builtOnEvidence: !!intel, evidenceDate: intel?.researchedAt || null, builtFor: ctx.businessName || '', source: planSource, platforms: planPlatforms, voice: personalEnabled && activeBrand === 'personal' ? 'personal' : 'company' });
        // Keep the completed state visible for a moment before resetting
        setTimeout(() => {
          setGenerationState('idle');
          setIsGeneratingPlan(false);
        }, 2000);
      } else {
        toast.error("Failed to generate plan. Please try again.");
        setGenerationState('idle');
        setIsGeneratingPlan(false);
      }
    } catch (error: any) {
      console.error("Failed to generate 30-day plan:", error);
      
      // Extract the actual error message from the JSON string if possible
      let errorMessage = error?.message || 'Unknown error';
      try {
        if (errorMessage.startsWith('{')) {
          const parsed = JSON.parse(errorMessage);
          if (parsed.error && parsed.error.message) {
            errorMessage = parsed.error.message;
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }

      if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        toast.error("Rate limit exceeded. Please wait a moment and try again.");
      } else if (errorMessage.includes("502") || errorMessage.includes("Bad Gateway")) {
        toast.error("The AI service is temporarily unavailable (502 Bad Gateway). Please try again in a few minutes.");
      } else {
        toast.error(`Error generating plan: ${errorMessage}`);
      }
      setGenerationState('idle');
      setIsGeneratingPlan(false);
    }
  };

  const handleRefinePlan = async () => {
    if (!thirtyDayPlan || !refinementFeedback) return;
    setIsRefiningPlan(true);
    try {
      const refined = await refinePlan(thirtyDayPlan, refinementFeedback);
      if (refined) {
        setThirtyDayPlan(refined);
        setRefinementFeedback('');
        setShowRefineInput(false);
      } else {
        toast.error("Failed to refine plan. Please try again.");
      }
    } catch (error: any) {
      console.error("Failed to refine plan:", error);
      if (error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
        toast.error("Rate limit exceeded. Please wait a moment and try again.");
      } else {
        toast.error("An error occurred while refining the plan.");
      }
    } finally {
      setIsRefiningPlan(false);
    }
  };

  const handleSyncToCalendar = (brandArg?: Brand) => {
    if (!thirtyDayPlan || !thirtyDayPlan.calendar) return;
    if (personalEnabled && !brandArg) { setBrandPick('sync'); return; }
    const syncBrand: Brand = brandArg || 'company';

    // One calendar post per platform version: the day's main post, plus the native version
    // for the plan's second platform when it wrote one.
    const VALID = ['TikTok', 'LinkedIn', 'Instagram', 'YouTube', 'Twitter'];
    const planPlatformsUsed: string[] = (thirtyDayPlan.platforms || planPlatforms || []).filter((p: string) => VALID.includes(p));
    const typeOf = (f?: string) => (f || '').toLowerCase().match(/video|reel|short/) ? 'video' : (f || '').toLowerCase().includes('article') ? 'article' : 'post';
    const newItems: CalendarItem[] = thirtyDayPlan.calendar.flatMap((content: any, index: number) => {
      const date = new Date();
      date.setDate(date.getDate() + index);
      const platform = VALID.includes(content.platform) ? content.platform : (planPlatformsUsed[0] || 'Instagram');
      const base = {
        day: date.getDate(), month: date.getMonth(), year: date.getFullYear(),
        title: content.hook || content.message?.substring(0, 80) || 'Post',
        status: 'draft' as const,
        tags: ['ai-generated', content.pillar || ''].filter(Boolean),
        brand: syncBrand, client: clientId,
      };
      const main: CalendarItem = {
        ...base,
        id: `ai-${index}-${Math.random().toString(36).slice(2, 7)}`,
        platform: platform as any,
        description: content.full ? fullPostToText(content.full) : [
          content.hook && `HOOK: ${content.hook}`,
          content.body && `BODY: ${content.body}`,
          content.caption && `CAPTION: ${content.caption}`,
          content.hashtags && content.hashtags,
          content.notes && `NOTES: ${content.notes}`,
          content.modeledOn && `Modeled on: ${content.modeledOn}`,
        ].filter(Boolean).join('\n') || content.message || '',
        type: typeOf(content.format) as any,
        time: content.postTime || '09:00 AM',
      };
      const second = planPlatformsUsed.find(p => p !== platform);
      if (!content.crossPost || !second) return [main];
      return [main, {
        ...base,
        id: `ai-${index}x-${Math.random().toString(36).slice(2, 7)}`,
        platform: second as any,
        description: [`HOOK: ${content.hook || ''}`, `BODY: ${content.crossPost}`].join('\n'),
        type: (second === 'Twitter' ? 'post' : typeOf(content.format)) as any,
        time: main.time,
      }];
    });

    setCalendarItems(prev => {
      // Re-syncing replaces this brand's earlier plan posts instead of piling up duplicates.
      const keep = prev.filter(item => !(item.id.startsWith('ai-') && clientOf(item) === clientId && brandOf(item) === syncBrand));
      return [...keep, ...newItems];
    });
    if (personalEnabled && activeBrand !== 'all') setActiveBrand(syncBrand);
    setSelectedDate({ day: new Date().getDate(), month: new Date().getMonth(), year: new Date().getFullYear() });
    setActiveTab('calendar');
    toast.success("Calendar Synced!", {
      description: "30-day strategy has been mapped to your content calendar."
    });
  };

  const handleExportCSV = () => {
    if (filteredCalendarItems.length === 0) {
      toast.error("No Content to Export", {
        description: filters.platform.length > 0 || filters.status.length > 0 || filters.type.length > 0
          ? "No items match your current filters."
          : "Your calendar is currently empty."
      });
      return;
    }
    
    const headers = ['Date', 'Platform', 'Title', 'Type', 'Status', 'Time', 'Description', 'Tags'];
    const rows = filteredCalendarItems.map(item => [
      `${item.year}-${String(item.month + 1).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`,
      item.platform,
      `"${item.title.replace(/"/g, '""')}"`,
      item.type,
      item.status,
      item.time,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${(item.tags || []).join(', ')}"`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TitanLeap_Content_Calendar_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV Exported!", {
      description: "Your content calendar has been downloaded."
    });
  };

  const handleRegenForNotion = async () => {
    if (!regenPrompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    
    setIsRegenerating(true);
    try {
      const generatedItems = await generateNotionContent(regenPrompt);
      
      if (generatedItems && generatedItems.length > 0) {
        const newCalendarItems: CalendarItem[] = generatedItems.map((item: any, index: number) => {
          const date = new Date();
          const offset = item.dayOffset || index;
          date.setDate(date.getDate() + offset);
          
          return {
            id: `regen-${Math.random().toString(36).substr(2, 9)}`,
            day: date.getDate(),
            month: date.getMonth(),
            year: date.getFullYear(),
            platform: item.platform || 'LinkedIn',
            title: item.title || 'Generated Content',
            description: item.description || '',
            status: 'draft',
            type: item.type || 'post',
            time: item.time || '09:00 AM',
            tags: item.tags || ['regen'],
            client: clientId,
          } as CalendarItem;
        });
        
        setCalendarItems(prev => [...prev, ...newCalendarItems]);
        setShowRegenModal(false);
        setRegenPrompt('');
        toast.success("Content Generated!", {
          description: `Added ${newCalendarItems.length} new items to your calendar.`
        });
      } else {
        toast.error("Generation Failed", {
          description: "Could not generate content from your prompt."
        });
      }
    } catch (error: any) {
      console.error("Regen error:", error);
      toast.error(`An error occurred during generation: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDraftCalendarFromBlueprint = async (brandArg?: Brand) => {
    if (personalEnabled && !brandArg) { setBrandPick('draft'); return; }
    const draftBrand: Brand = brandArg || 'company';
    if (!thirtyDayPlan) {
      toast.error("Generate the 30-Day Plan first");
      return;
    }
    setIsDraftingCalendar(true);
    try {
      const generatedItems = await generateCalendarFromBlueprint(auditData, thirtyDayPlan);

      if (generatedItems && generatedItems.length > 0) {
        const newCalendarItems: CalendarItem[] = generatedItems.map((item: any, index: number) => {
          const date = new Date();
          const offset = item.dayOffset ?? index;
          date.setDate(date.getDate() + offset);

          return {
            id: `blueprint-${Math.random().toString(36).substr(2, 9)}`,
            day: date.getDate(),
            month: date.getMonth(),
            year: date.getFullYear(),
            platform: item.platform || 'LinkedIn',
            title: item.title || 'Generated Content',
            description: item.description || '',
            status: 'draft',
            type: item.type || 'post',
            time: item.time || '09:00 AM',
            tags: item.tags || ['blueprint'],
            brand: draftBrand,
            client: clientId,
          } as CalendarItem;
        });

        setCalendarItems(prev => [...prev, ...newCalendarItems]);
        setActiveTab('calendar');
        toast.success("30-Day Calendar Drafted!", {
          description: `Added ${newCalendarItems.length} items mapped from your Growth Blueprint.`
        });
      } else {
        toast.error("Failed to draft calendar. Please try again.");
      }
    } catch (error: any) {
      console.error("Failed to draft calendar from blueprint:", error);
      toast.error(`Error drafting calendar: ${error?.message || 'Please try again.'}`);
    } finally {
      setIsDraftingCalendar(false);
    }
  };

  useEffect(() => {
    if (forceRegenerateTimestamp && forceRegenerateTimestamp > 0) {
      setActiveTab('plan');
      handleGeneratePlan();
    }
  }, [forceRegenerateTimestamp]);

  const renderPlanStart = (onCancel?: () => void) => (
    <PlanStart auditName={auditData ? (auditData.businessName || 'your business') : null}
      source={planSource} onSource={setPlanSource} brief={brief} onBrief={setBrief}
      onSmartFill={handleBriefSmartFill} smartFilling={smartFilling}
      platforms={planPlatforms} onPlatforms={choosePlatforms}
      onGenerate={handleGeneratePlan} busy={isGeneratingPlan} budget={aiBudget} onCancel={onCancel} />
  );

  // Change one calendar post (stage, attached media…).
  const updateItem = (id: string, patch: Partial<CalendarItem>) =>
    setCalendarItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  const [attaching, setAttaching] = useState(false);
  const attachMedia = async (item: CalendarItem, files: FileList | null) => {
    if (!files?.length) return;
    setAttaching(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 10)) {
        if (file.size > 200 * 1024 * 1024) { toast.error(`${file.name} is over 200MB`); continue; }
        const path = `${clientId}/calendar/${Date.now()}_${safeStorageName(file.name)}`;
        const { error } = await supabase.storage.from('media').upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw new Error(error.message);
        urls.push(supabase.storage.from('media').getPublicUrl(path).data.publicUrl);
      }
      if (urls.length) {
        const media = [...(item.media || []), ...urls];
        updateItem(item.id, { media, status: item.status === 'draft' ? 'ready' : item.status });
        toast.success(`${urls.length} file${urls.length > 1 ? 's' : ''} attached${item.status === 'draft' ? ' · marked Ready' : ''}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setAttaching(false);
    }
  };

  // Post detail: a panel from the right, so the calendar stays visible behind it.
  const [popupTab, setPopupTab] = useState<'post' | 'media' | 'notes'>('post');
  useEffect(() => {
    if (!viewItem) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewItem(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewItem]);
  useEffect(() => { setPopupTab('post'); }, [viewItem?.id]);
  const highlightFills = (t: string) => t.split(/(⟦[^⟧]*⟧)/g).map((part, i) =>
    part.startsWith('⟦') ? <mark key={i} className="bg-amber-100 text-amber-800 rounded px-1">{part.slice(1, -1)}</mark> : <React.Fragment key={i}>{part}</React.Fragment>);

  const renderViewPopup = () => {
    if (!viewItem) return null;
    const item = calendarItems.find(i => i.id === viewItem.id) || viewItem;
    const m = item.id.match(/^ai-(\d+)-/);
    const planIdx = m ? Number(m[1]) : -1;
    const canWrite = planIdx >= 0 && !!thirtyDayPlan?.calendar?.[planIdx];
    const planFull = canWrite ? thirtyDayPlan.calendar[planIdx].full : null;
    const text = planFull ? fullPostToText(planFull) : String(item.description || '');
    const sections = text.split(/\n(?=(?:HOOK|BODY|CAPTION|CTA|SLIDE \d+|\[\d|OTHER PLATFORMS|NOTES|Modeled on)\b)/);
    const parsed = sections.map(sec => {
      const head = sec.match(/^(HOOK|BODY|CAPTION|CTA|OTHER PLATFORMS|NOTES|Modeled on|SLIDE \d+)\s*:?\s*/);
      return { label: head ? head[1].charAt(0) + head[1].slice(1).toLowerCase() : '', body: head ? sec.slice(head[0].length) : sec };
    });
    const postParts = parsed.filter(p => !/^(Notes|Modeled on)$/.test(p.label));
    const noteParts = parsed.filter(p => /^(Notes|Modeled on)$/.test(p.label));
    const fills = (text.match(/⟦/g) || []).length;
    const ordered = [...filteredCalendarItems].sort((a, b) => +new Date(a.year, a.month, a.day) - +new Date(b.year, b.month, b.day) || a.time.localeCompare(b.time));
    const pos = ordered.findIndex(x => x.id === item.id);
    const go = (d: number) => { const next = ordered[pos + d]; if (next) setViewItem(next); };
    const busy = canWrite ? writingDay === planIdx : expandingId === item.id;
    const done = canWrite ? !!thirtyDayPlan.calendar[planIdx].full : /^(SLIDE 1|\[0|1\/ )/m.test(item.description || '');
    const pill = "h-[42px] px-4 rounded-full text-sm font-semibold transition-colors";
    return createPortal(
      <div className="fixed inset-0 z-[100] flex justify-end bg-black/30" onClick={() => setViewItem(null)}>
        <aside aria-label="Post" onClick={e => e.stopPropagation()}
          className="w-full max-w-[640px] h-full flex flex-col bg-surface-container-lowest shadow-[-8px_0_40px_rgba(0,0,0,0.12)]">
          <div className="flex items-start justify-between gap-4 px-6 md:px-8 pt-7 pb-4 border-b border-outline-variant/10">
            <div className="space-y-2 min-w-0">
              <p className="text-[13px] text-on-surface-variant/70">
                {personalEnabled ? `${BRAND_LABEL[brandOf(item)]} · ` : ''}{item.platform === 'Twitter' ? 'X' : item.platform} · {new Date(item.year, item.month, item.day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {item.time}
              </p>
              <h3 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface leading-snug">{item.title}</h3>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => go(-1)} disabled={pos <= 0} aria-label="Previous post" className="w-9 h-9 rounded-full bg-surface-container-high/70 flex items-center justify-center text-on-surface-variant disabled:opacity-30"><ChevronRight size={16} className="rotate-180" /></button>
              <button onClick={() => go(1)} disabled={pos < 0 || pos >= ordered.length - 1} aria-label="Next post" className="w-9 h-9 rounded-full bg-surface-container-high/70 flex items-center justify-center text-on-surface-variant disabled:opacity-30"><ChevronRight size={16} /></button>
              <button onClick={() => setViewItem(null)} aria-label="Close" className="w-9 h-9 rounded-full bg-surface-container-high/70 flex items-center justify-center text-on-surface-variant"><X size={16} /></button>
            </div>
          </div>

          <div className="px-6 md:px-8 py-4 border-b border-outline-variant/10 space-y-2.5">
            <p className="text-xs font-semibold text-on-surface-variant/70">Stage</p>
            <div className="flex rounded-[10px] overflow-hidden">
              {STAGE_ORDER.map(st => (
                <button key={st} onClick={() => updateItem(item.id, { status: st })}
                  className={cn("flex-1 h-[34px] text-xs transition-colors border-r border-surface-container-lowest last:border-0",
                    item.status === st ? "bg-primary text-white font-semibold" : "bg-surface-container-high/70 text-on-surface-variant/70 font-medium hover:text-on-surface")}>
                  {STAGE_STYLE[st].label}
                </button>
              ))}
            </div>
          </div>

          <div role="tablist" aria-label="Post sections" className="px-6 md:px-8 pt-3 flex gap-6 border-b border-outline-variant/10">
            {([['post', 'Post'], ['media', `Design & video${item.media?.length ? ` (${item.media.length})` : ''}`], ['notes', 'Notes']] as const).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={popupTab === id} onClick={() => setPopupTab(id)}
                className={cn("h-10 text-sm border-b-2 -mb-px transition-colors", popupTab === id ? "border-primary text-on-surface font-semibold" : "border-transparent text-on-surface-variant/70 font-medium hover:text-on-surface")}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-5">
            {popupTab === 'post' && (
              <>
                {fills > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-[14px] bg-amber-50 text-amber-800">
                    <span className="text-[13px] flex-1">{fills} spot{fills > 1 ? 's need' : ' needs'} real facts (highlighted). Edit the post to fill {fills > 1 ? 'them' : 'it'} in.</span>
                    <button onClick={() => { setViewItem(null); handleEditClick(item); }} className="h-8 px-3 rounded-lg bg-amber-800 text-white text-xs font-semibold">Fill in</button>
                  </div>
                )}
                {postParts.length && text ? postParts.map((p, i) => (
                  <div key={i} className="space-y-1.5">
                    {p.label && <p className="text-xs font-semibold text-primary">{p.label}</p>}
                    <p className="text-[15px] text-on-surface leading-relaxed whitespace-pre-line break-words">{highlightFills(p.body)}</p>
                  </div>
                )) : <p className="text-sm text-on-surface-variant/60">No content yet. Write the full post, or Edit to add it.</p>}
              </>
            )}
            {popupTab === 'media' && (
              <div className="space-y-4">
                <label className={cn("flex flex-col items-center justify-center gap-2 h-32 rounded-[14px] border-[1.5px] border-dashed border-outline-variant/30 text-sm font-medium text-on-surface-variant/70 cursor-pointer hover:border-primary/40 hover:text-primary transition-colors", attaching && "opacity-50 pointer-events-none")}>
                  {attaching ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  {attaching ? 'Uploading…' : 'Attach the finished design or video'}
                  <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => { attachMedia(item, e.target.files); e.target.value = ''; }} />
                </label>
                {item.media?.length ? (
                  <div className="grid grid-cols-3 gap-2">
                    {item.media.map((u, i) => (
                      <div key={u} className="relative group/m aspect-square rounded-xl overflow-hidden bg-surface-container-low">
                        {/\.(mp4|mov|webm)(\?|$)/i.test(u)
                          ? <video src={u} className="w-full h-full object-cover" muted playsInline controls />
                          : <img src={u} alt={`Attachment ${i + 1}`} className="w-full h-full object-cover" />}
                        <button onClick={() => updateItem(item.id, { media: item.media!.filter(x => x !== u) })} aria-label="Remove attachment"
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/m:opacity-100 transition-opacity"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[13px] text-on-surface-variant/60">Nothing attached yet. Attaching moves the post to Ready.</p>}
              </div>
            )}
            {popupTab === 'notes' && (
              noteParts.length ? noteParts.map((p, i) => (
                <div key={i} className="space-y-1.5">
                  <p className="text-xs font-semibold text-primary">{p.label}</p>
                  <p className="text-[15px] text-on-surface leading-relaxed whitespace-pre-line">{p.body}</p>
                </div>
              )) : <p className="text-sm text-on-surface-variant/60">No production notes for this post.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 px-6 md:px-8 py-4 border-t border-outline-variant/10">
            <button disabled={writingDay !== null || !!expandingId} onClick={() => canWrite ? handleWriteFull(planIdx) : handleExpandItem(item)}
              className={cn(pill, "bg-primary text-white flex items-center gap-2 disabled:opacity-50")}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
              {busy ? 'Writing…' : done ? 'Rewrite full post' : 'Write full post'}
            </button>
            <button onClick={() => setPopupTab('media')} className={cn(pill, "bg-surface-container-high/70 text-on-surface hover:bg-surface-container-high")}>Attach design</button>
            <button onClick={() => { navigator.clipboard?.writeText(text).then(() => toast.success('Copied')).catch(() => {}); }} className={cn(pill, "bg-surface-container-high/70 text-on-surface hover:bg-surface-container-high")}>Copy</button>
            <button onClick={() => handleSendToProduction(item)} className={cn(pill, "bg-surface-container-high/70 text-on-surface hover:bg-surface-container-high")}>Send to Production</button>
            <button onClick={() => { setViewItem(null); handleEditClick(item); }} className={cn(pill, "ml-auto text-primary hover:bg-primary/5")}>Edit</button>
          </div>
        </aside>
      </div>,
      document.body
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'competitor':
        return (
          <div className="space-y-6 md:space-y-8">
            <PlanCompetitors intel={competitorIntel} input={competitorInput} onInput={setCompetitorInput}
              onResearch={() => handleResearchCompetitors()} busy={isResearching} />
            {/* Input Section */}
            <div className="bg-surface-container-low rounded-2xl md:rounded-3xl p-5 md:p-8 border border-outline-variant/10 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="flex-1 w-full space-y-1.5 md:space-y-2">
                  <label className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">
                    Social Handle or Link
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                      <Search size={16} className="md:w-[18px] md:h-[18px]" />
                    </div>
                    <input 
                      type="text" 
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="e.g. @growth_titan or instagram.com/p/..."
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl pl-10 md:pl-12 pr-3 md:pr-4 py-3 md:py-4 text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col items-start md:items-center gap-1.5 md:gap-2 w-full md:w-auto">
                  <label className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">
                    Audit Mode
                  </label>
                  <div className="flex w-full md:w-auto bg-surface-container-highest p-1 rounded-xl border border-outline-variant/20">
                    <button 
                      onClick={() => setMode('general')}
                      className={cn(
                        "flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all",
                        mode === 'general' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant/60 hover:text-on-surface"
                      )}
                    >
                      General
                    </button>
                    <button 
                      onClick={() => setMode('per-link')}
                      className={cn(
                        "flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all",
                        mode === 'per-link' ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant/60 hover:text-on-surface"
                      )}
                    >
                      Per Link
                    </button>
                  </div>
                </div>
              </div>

              {/* Results Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-surface-container-lowest rounded-xl md:rounded-2xl p-4 md:p-6 border border-outline-variant/10">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Zap size={14} className="md:w-4 md:h-4" fill="currentColor" />
                    </div>
                    <h4 className="font-black text-xs md:text-sm uppercase tracking-widest text-on-surface">Viral Hooks</h4>
                  </div>
                  <ul className="space-y-2 md:space-y-3">
                    {(auditResult?.scripts?.length > 0 
                      ? auditResult.scripts.map((s: any) => s.hook)
                      : ['"The 3-step framework to..."', '"Why your growth is stalled..."', '"I tried X for 30 days..."']
                    ).map((hook: string, i: number) => (
                      <li key={i} className="text-xs md:text-sm text-on-surface-variant flex items-start gap-2 md:gap-3 p-2.5 md:p-3 bg-surface-container-low rounded-lg md:rounded-xl border border-outline-variant/5">
                        <span className="text-primary font-black mt-0.5">0{i+1}</span>
                        <span className="leading-tight">{hook}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-surface-container-lowest rounded-xl md:rounded-2xl p-4 md:p-6 border border-outline-variant/10">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                      <TrendingUp size={14} className="md:w-4 md:h-4" />
                    </div>
                    <h4 className="font-black text-xs md:text-sm uppercase tracking-widest text-on-surface">Content Strategy</h4>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <p className="text-[11px] md:text-xs text-on-surface-variant leading-relaxed">
                      {auditResult?.overallStrategy 
                        ? auditResult.overallStrategy
                        : "High-frequency short-form video (3x/day) focusing on \"contrarian\" takes within the SaaS niche."}
                    </p>
                    <div className="space-y-1.5 md:space-y-2">
                      <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-secondary/60">Trending Content Pillars</p>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {(auditResult?.trendingTopics || ['Contrarian', 'Educational', 'Behind-the-scenes']).map((tag: string) => (
                          <span key={tag} className="px-1.5 md:px-2 py-0.5 md:py-1 bg-surface-container-highest rounded-md text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl md:rounded-2xl p-4 md:p-6 border border-outline-variant/10">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
                      <Clapperboard size={14} className="md:w-4 md:h-4" />
                    </div>
                    <h4 className="font-black text-xs md:text-sm uppercase tracking-widest text-on-surface">Content Structure</h4>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <p className="text-[11px] md:text-xs text-on-surface-variant leading-relaxed">
                      {auditResult?.contentStructure
                        ? auditResult.contentStructure
                        : "Standard 3-act structure: Hook (0-3s), Value Delivery (3-25s), CTA (25-30s)."}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                      <div className="h-1 bg-primary/20 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-1/3" />
                      </div>
                      <div className="h-1 bg-secondary/20 rounded-full overflow-hidden">
                        <div className="h-full bg-secondary w-full" />
                      </div>
                      <div className="h-1 bg-tertiary/20 rounded-full overflow-hidden">
                        <div className="h-full bg-tertiary w-1/2" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl md:rounded-2xl p-4 md:p-6 border border-outline-variant/10">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <Users size={14} className="md:w-4 md:h-4" />
                    </div>
                    <h4 className="font-black text-xs md:text-sm uppercase tracking-widest text-on-surface">Audience Insights</h4>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    {auditResult?.audienceInsights ? (
                      <p className="text-[11px] md:text-xs text-on-surface-variant leading-relaxed">
                        {auditResult.audienceInsights}
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] md:text-xs font-bold text-on-surface-variant">Primary Age</span>
                          <span className="text-[11px] md:text-xs font-black text-primary">24-34</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] md:text-xs font-bold text-on-surface-variant">Active Hours</span>
                          <span className="text-[11px] md:text-xs font-black text-primary">18:00 - 21:00</span>
                        </div>
                        <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full w-[78%]" />
                        </div>
                        <p className="text-[9px] md:text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-widest text-center">78% Engagement Velocity</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 md:mt-8 flex justify-center">
                <button 
                  onClick={handleGenerateScripts}
                  disabled={isGenerating || !handle}
                  className={cn(
                    "w-full sm:w-auto monolith-gradient text-white px-6 md:px-10 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-sm shadow-lg md:shadow-xl shadow-primary/20 md:shadow-primary/30 flex items-center justify-center gap-2 md:gap-3 hover:scale-[1.02] md:hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100",
                    isGenerating && "animate-pulse"
                  )}
                >
                  {isGenerating ? <Loader2 className="animate-spin shrink-0 w-4 h-4 md:w-[18px] md:h-[18px]" /> : <Clapperboard className="shrink-0 w-4 h-4 md:w-[18px] md:h-[18px]" fill="white" />}
                  <span className="truncate">{isGenerating ? "AI Engineering Scripts..." : (mode === 'per-link' ? "Deep Audit Content Link" : "Generate Top-Performing Scripts")}</span>
                  <span className="px-1.5 md:px-2 py-0.5 bg-on-surface/20 rounded-md text-[8px] md:text-[10px] shrink-0">{mode === 'per-link' ? "Deep Scrape" : "30 Days"}</span>
                  <span className="px-1.5 md:px-2 py-0.5 bg-white/20 text-white rounded-md text-[8px] md:text-[10px] font-black uppercase tracking-widest shrink-0">Pro</span>
                </button>
              </div>
            </div>

            {/* Generated Scripts List */}
            <AnimatePresence>
              {auditResult?.scripts?.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "grid gap-4 md:gap-6",
                    mode === 'per-link' ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  )}
                >
                  {auditResult.scripts.map((script: any, idx: number) => (
                    <div key={idx} className="bg-surface-container-low p-4 md:p-6 rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Sparkles size={14} className="md:w-4 md:h-4" />
                        </div>
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                          {mode === 'per-link' ? "Deep Audit Breakdown" : `Script 0${idx+1}`}
                        </span>
                      </div>
                      <h5 className="font-black text-xs md:text-sm text-on-surface mb-2 md:mb-3 group-hover:text-primary transition-colors leading-tight">{script.title}</h5>
                      
                      {mode === 'per-link' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                          <div className="p-3 md:p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-primary mb-1">The Viral Hook</p>
                            <p className="text-[11px] md:text-xs text-on-surface font-bold leading-tight">{script.hook}</p>
                          </div>
                          <div className="p-3 md:p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-secondary mb-1">Content Strategy</p>
                            <p className="text-[10px] md:text-[11px] text-on-surface-variant leading-relaxed">{script.strategy}</p>
                          </div>
                          <div className="p-3 md:p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-tertiary mb-1">Content Structure</p>
                            <p className="text-[10px] md:text-[11px] text-on-surface-variant leading-relaxed">{script.structure}</p>
                          </div>
                          <div className="p-3 md:p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Audience Insights</p>
                            <p className="text-[10px] md:text-[11px] text-on-surface-variant leading-relaxed">{script.insights}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 md:space-y-3">
                          <div className="p-2.5 md:p-3 bg-surface-container-lowest rounded-lg md:rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-primary mb-0.5 md:mb-1">Hook</p>
                            <p className="text-[11px] md:text-xs text-on-surface font-bold leading-tight">{script.hook}</p>
                          </div>
                          <div className="p-2.5 md:p-3 bg-surface-container-lowest rounded-lg md:rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-secondary mb-0.5 md:mb-1">Body</p>
                            <p className="text-[10px] md:text-[11px] text-on-surface-variant leading-relaxed">{script.body}</p>
                          </div>
                          <div className="p-2.5 md:p-3 bg-surface-container-lowest rounded-lg md:rounded-xl border border-outline-variant/5">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-tertiary mb-0.5 md:mb-1">CTA</p>
                            <p className="text-[11px] md:text-xs text-on-surface font-bold">{script.cta}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      case 'plan':
        return (
          <div className="space-y-6 md:space-y-8">
            {thirtyDayPlan && showPlanStart && !isGeneratingPlan && renderPlanStart(() => setShowPlanStart(false))}
            {!thirtyDayPlan && isGeneratingPlan ? (
              <div className="flex flex-col items-center justify-center py-16 md:py-24 space-y-4 md:space-y-6 px-4">
                <div className="relative">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-primary animate-pulse w-6 h-6 md:w-8 md:h-8" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl md:text-2xl font-black text-on-surface tracking-tight">Engineering Your 30-Day Strategy</h3>
                  <p className="text-sm md:text-base text-on-surface-variant/60 font-medium max-w-md mx-auto">{isResearching ? 'Finding your competitors and reading their best-performing posts (1–2 min)...' : 'Building your 30 days on what is proven to work...'}</p>
                </div>
              </div>
            ) : thirtyDayPlan ? (
              <div className="space-y-8">
                {/* Secondary plan actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={handleGeneratePlan} disabled={isGeneratingPlan}
                    className="h-9 px-3.5 rounded-full bg-surface-container-lowest border border-outline-variant/15 text-[13px] font-medium text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 disabled:opacity-60">
                    {isGeneratingPlan ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {isGeneratingPlan ? (generationState === 'crafting' && isResearching ? 'Studying competitors…' : 'Regenerating…') : 'Regenerate'}
                  </button>
                  <button onClick={() => handleDraftCalendarFromBlueprint()} disabled={isDraftingCalendar}
                    className="h-9 px-3.5 rounded-full bg-surface-container-lowest border border-outline-variant/15 text-[13px] font-medium text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 disabled:opacity-60">
                    {isDraftingCalendar ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />} Draft calendar
                  </button>
                  <span className="text-[13px] text-on-surface-variant/60 ml-1">For {thirtyDayPlan.builtFor || auditData?.businessName || clientLabel(clientId)}{thirtyDayPlan.platforms?.length ? ` · ${thirtyDayPlan.platforms.map((p: string) => p === 'Twitter' ? 'X' : p).join(', ')}` : ''}</span>
                </div>

                <AnimatePresence>
                  {showRefineInput && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-surface-container-low p-4 md:p-6 rounded-2xl md:rounded-3xl border border-secondary/20 shadow-lg space-y-3 md:space-y-4">
                        <div className="flex items-center gap-2 md:gap-3 text-secondary">
                          <Sparkles size={16} className="md:w-[18px] md:h-[18px]" />
                          <h4 className="text-xs md:text-sm font-black uppercase tracking-widest">AI Strategy Refinement</h4>
                        </div>
                        <textarea 
                          value={refinementFeedback}
                          onChange={(e) => setRefinementFeedback(e.target.value)}
                          placeholder="e.g. 'Make it more focused on LinkedIn' or 'Include more video content ideas'..."
                          className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl p-3 md:p-4 text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-secondary/20 min-h-[80px] md:min-h-[100px] resize-none"
                        />
                        <div className="flex flex-col sm:flex-row justify-end gap-2 md:gap-3">
                          <button 
                            onClick={() => setShowRefineInput(false)}
                            className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleRefinePlan}
                            disabled={isRefiningPlan || !refinementFeedback}
                            className="w-full sm:w-auto bg-secondary text-on-secondary px-6 md:px-8 py-2.5 md:py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isRefiningPlan ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} fill="currentColor" />}
                            Refine Strategy
                            <span className="px-1.5 py-0.5 bg-white/20 text-white rounded-md text-[8px] font-black uppercase tracking-widest shrink-0">Pro</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <OneIdea plan={thirtyDayPlan} onRefine={() => setShowRefineInput(v => !v)} onNewPlan={() => setShowPlanStart(true)} />
                <PlanOverview plan={thirtyDayPlan} items={filteredCalendarItems} onOpenCalendar={() => setActiveTab('calendar')}
                  onOpenItem={(id) => { const it = calendarItems.find(x => x.id === id); if (it) setViewItem(it); }} />
                <h3 className="text-xl font-semibold tracking-tight text-on-surface pt-2">Plan details</h3>
                <PlanTabs plan={thirtyDayPlan} hideStats days={(
                  <>
                {/* Daily Content Grid Preview */}
                <div className="bg-surface-container-lowest rounded-[18px] p-6 md:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.08)] space-y-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                    <div className="space-y-1">
                      <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-on-surface">Daily content</h3>
                      <p className="text-xs md:text-sm font-medium text-on-surface-variant/60">All 30 days. Tap a day for the hook, body and caption.{thirtyDayPlan.builtOnEvidence ? ' Built on competitor evidence.' : ' Not built on competitor evidence — research competitors above and regenerate.'}</p>
                    </div>
                    <button 
                      onClick={() => handleSyncToCalendar()}
                      className="w-full md:w-auto bg-primary text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg md:shadow-xl shadow-primary/20 md:shadow-primary/30 hover:scale-[1.02] md:hover:scale-105 transition-all active:scale-95"
                    >
                      Sync to Calendar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {thirtyDayPlan.calendar?.map((day: any, idx: number) => (
                      <div key={idx} className={cn("bg-surface-container-low/60 rounded-[14px] border transition-all", openDay === idx ? "border-primary/25 bg-surface-container-lowest shadow-sm" : "border-transparent hover:bg-surface-container-low")}>
                        <button onClick={() => setOpenDay(openDay === idx ? null : idx)} className="w-full flex items-center gap-3 p-3 md:p-4 text-left">
                          <span className="text-[10px] font-black text-on-surface-variant/40 w-12 shrink-0">Day {String(idx + 1).padStart(2, '0')}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary/70 w-20 shrink-0 truncate">{day.platform}</span>
                          <span className="text-sm font-medium text-on-surface flex-1 min-w-0 truncate">{day.hook || day.message}</span>
                          <span className="hidden md:inline text-[9px] font-black uppercase tracking-wider text-on-surface-variant/40 shrink-0">{day.format}</span>
                          <ChevronRight size={14} className={cn("shrink-0 text-on-surface-variant/40 transition-transform", openDay === idx && "rotate-90")} />
                        </button>
                        {openDay === idx && (
                          <div className="px-4 pb-4 md:pl-[4.5rem] space-y-2 text-xs">
                            {[['Hook', day.hook], ['Body', day.body || day.message], ['Caption', day.caption], ['Other platforms', day.crossPost], ['CTA', day.cta], ['Hashtags', day.hashtags]].filter(([, v]) => v).map(([k, v]) => (
                              <div key={k as string}>
                                <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50">{k}</span>
                                <p className="font-medium text-on-surface whitespace-pre-line">{v}</p>
                              </div>
                            ))}
                            <div className="flex flex-wrap gap-2 pt-1">
                              {day.pillar && <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-primary/5 text-primary">{day.pillar}</span>}
                              {day.viralMechanic && <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-secondary/5 text-secondary">{day.viralMechanic}</span>}
                              {day.postTime && <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-surface-container-highest/40 text-on-surface-variant">{day.postTime}</span>}
                            </div>
                            {day.modeledOn && <p className="text-[10px] font-bold text-emerald-600">Modeled on: {day.modeledOn}</p>}
                            {day.full ? (
                              <div className="mt-2 p-3 md:p-4 rounded-xl bg-surface-container-low border border-primary/10 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Full post</span>
                                  <span className="flex items-center gap-3">
                                    <button onClick={() => { navigator.clipboard?.writeText(fullPostToText(day.full)).then(() => toast.success('Copied')).catch(() => {}); }} className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60 hover:text-primary">Copy</button>
                                    <button onClick={() => handleWriteFull(idx)} disabled={writingDay !== null} className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60 hover:text-primary disabled:opacity-40">{writingDay === idx ? 'Rewriting…' : 'Rewrite'}</button>
                                  </span>
                                </div>
                                <p className="text-xs font-medium text-on-surface whitespace-pre-line leading-relaxed">{fullPostToText(day.full)}</p>
                              </div>
                            ) : (
                              <button onClick={() => handleWriteFull(idx)} disabled={writingDay !== null}
                                className="mt-1 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50">
                                {writingDay === idx ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                                {writingDay === idx ? 'Writing every slide…' : 'Write full post'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                  </>
                )} />

              </div>
            ) : (
              renderPlanStart()
            )}
          </div>
        );
      case 'calendar':
        return (
          <div className="relative">
            <div className={cn(
              "grid grid-cols-1 gap-10 transition-all duration-500 ease-in-out",
              isSidePanelOpen ? "lg:grid-cols-12" : "grid-cols-1"
            )}>
              {/* Main Calendar Grid */}
              <div className={cn(
                "space-y-6 md:space-y-8 transition-all duration-500",
                isSidePanelOpen ? "lg:col-span-8" : "w-full"
              )}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full md:w-auto">
                    <h3 className="text-xl md:text-[22px] font-semibold tracking-tight text-on-surface whitespace-nowrap">{calView === 'month' ? `${MONTH_NAMES[selectedDate.month]} ${selectedDate.year}` : calView === 'week' ? weekLabel : 'By stage'}</h3>
                    {calView === 'week' && (
                      <div className="flex gap-2">
                        <button onClick={() => shiftWeek(-1)} aria-label="Previous week" className="w-9 h-9 flex items-center justify-center bg-surface-container-lowest hover:bg-surface-container-low rounded-[10px] border border-outline-variant/15"><ChevronRight className="rotate-180 text-on-surface-variant" size={18} /></button>
                        <button onClick={() => shiftWeek(1)} aria-label="Next week" className="w-9 h-9 flex items-center justify-center bg-surface-container-lowest hover:bg-surface-container-low rounded-[10px] border border-outline-variant/15"><ChevronRight className="text-on-surface-variant" size={18} /></button>
                        <button onClick={() => setWeekStart(weekStartOf(new Date()))} className="h-9 px-3 rounded-[10px] border border-outline-variant/15 bg-surface-container-lowest text-[13px] font-medium text-on-surface-variant hover:text-on-surface">Today</button>
                      </div>
                    )}
                    <div role="group" aria-label="View" className="flex gap-0.5 p-[3px] rounded-[10px] bg-surface-container-high">
                      {(['week', 'month', 'board'] as const).map(v => (
                        <button key={v} onClick={() => setCalView(v)}
                          className={cn("h-[30px] px-3 rounded-lg text-[13px] capitalize transition-all", calView === v ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm" : "text-on-surface-variant/70 font-medium hover:text-on-surface")}>{v}</button>
                      ))}
                    </div>
                    <div className={cn("flex gap-2", calView !== 'month' && "hidden")}>
                      <button 
                        onClick={() => {
                          const newMonth = selectedDate.month === 0 ? 11 : selectedDate.month - 1;
                          const newYear = selectedDate.month === 0 ? selectedDate.year - 1 : selectedDate.year;
                          setSelectedDate({ ...selectedDate, month: newMonth, year: newYear, day: 1 });
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-surface-container-low hover:bg-surface-container rounded-xl transition-all border border-outline-variant/10 shadow-sm"
                      >
                        <ChevronRight className="rotate-180 text-on-surface-variant" size={20} />
                      </button>
                      <button 
                        onClick={() => {
                          const newMonth = selectedDate.month === 11 ? 0 : selectedDate.month + 1;
                          const newYear = selectedDate.month === 11 ? selectedDate.year + 1 : selectedDate.year;
                          setSelectedDate({ ...selectedDate, month: newMonth, year: newYear, day: 1 });
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-surface-container-low hover:bg-surface-container rounded-xl transition-all border border-outline-variant/10 shadow-sm"
                      >
                        <ChevronRight className="text-on-surface-variant" size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 relative w-full md:w-auto">
                    <button
                      onClick={() => setShowImport(true)}
                      className="h-10 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap bg-primary text-white hover:brightness-110 shadow-sm"
                    >
                      <Upload size={15} />
                      Import content
                    </button>
                    <button 
                      onClick={() => setShowFilters(!showFilters)}
                      className={cn(
                        "h-10 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap bg-surface-container-lowest text-on-surface-variant border border-outline-variant/15 hover:bg-surface-container-low",
                        (filters.platform.length > 0 || filters.status.length > 0 || filters.type.length > 0) && "border-primary/50 bg-primary/5"
                      )}
                    >
                      <Filter size={15} className={cn("text-primary", (filters.platform.length > 0 || filters.status.length > 0 || filters.type.length > 0) ? "text-primary" : "text-on-surface-variant/40")} />
                      Filters
                      {(filters.platform.length + filters.status.length + filters.type.length) > 0 && (
                        <span className="bg-primary text-white w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex items-center justify-center text-[7px] md:text-[8px]">
                          {filters.platform.length + filters.status.length + filters.type.length}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {showFilters && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full left-0 md:left-auto md:right-0 mt-4 w-[calc(100vw-3rem)] md:w-80 bg-surface-container-low rounded-3xl border border-outline-variant/10 shadow-2xl z-[100] p-6 space-y-6"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface">Filter Content</h4>
                            <button 
                              onClick={clearFilters}
                              className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline"
                            >
                              Clear All
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Platform</p>
                              <div className="flex flex-wrap gap-2">
                                {['TikTok', 'LinkedIn', 'Instagram', 'YouTube', 'Twitter'].map(p => (
                                  <button
                                    key={p}
                                    onClick={() => toggleFilter('platform', p)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                      filters.platform.includes(p) 
                                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                                        : "bg-surface-container-highest/30 text-on-surface-variant/60 border-outline-variant/10 hover:bg-surface-container-highest"
                                    )}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Status</p>
                              <div className="flex flex-wrap gap-2">
                                {(['draft', 'ready', 'approved', 'scheduled', 'published'] as const).map(s => (
                                  <button
                                    key={s}
                                    onClick={() => toggleFilter('status', s)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                      filters.status.includes(s) 
                                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                                        : "bg-surface-container-highest/30 text-on-surface-variant/60 border-outline-variant/10 hover:bg-surface-container-highest"
                                    )}
                                  >
                                    {STAGES[s].label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Type</p>
                              <div className="flex flex-wrap gap-2">
                                {['video', 'article', 'post'].map(t => (
                                  <button
                                    key={t}
                                    onClick={() => toggleFilter('type', t)}
                                    className={cn(
                                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                      filters.type.includes(t) 
                                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                                        : "bg-surface-container-highest/30 text-on-surface-variant/60 border-outline-variant/10 hover:bg-surface-container-highest"
                                    )}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={handleClearCalendar}
                      disabled={calendarItems.length === 0}
                      className={cn("h-10 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap border disabled:opacity-40",
                        confirmClear ? "bg-red-500 text-white border-red-500" : "bg-surface-container-lowest text-red-500 border-outline-variant/15 hover:bg-red-50")}
                    >
                      <Trash2 size={15} />
                      {confirmClear ? (personalEnabled && activeBrand === 'all' ? 'Tap again: clears both' : 'Tap again to clear') : personalEnabled && activeBrand !== 'all' ? `Clear ${BRAND_LABEL[activeBrand]}` : 'Clear calendar'}
                    </button>
                    <button 
                      onClick={handleExportCSV}
                      className="h-10 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all whitespace-nowrap bg-surface-container-lowest text-on-surface-variant border border-outline-variant/15 hover:bg-surface-container-low"
                    >
                      <Download size={15} />
                      Export CSV
                    </button>
                  </div>
                </div>

                {(() => {
                  const start = new Date(); start.setHours(0, 0, 0, 0);
                  const end = new Date(start); end.setDate(end.getDate() + 7);
                  const week = filteredCalendarItems.filter(it => { const d = new Date(it.year, it.month, it.day); return d >= start && d < end; });
                  if (!week.length) return null;
                  const count = (st: CalendarItem['status']) => week.filter(it => it.status === st).length;
                  return (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] text-on-surface-variant/70 mr-1">Next 7 days</span>
                      {STAGE_ORDER.map(st => (
                        <span key={st} className={cn("flex items-center gap-1.5 h-8 px-3 rounded-full bg-surface-container-lowest border border-outline-variant/15 text-[13px]", !count(st) && "text-on-surface-variant/50")}>
                          <span className={cn("w-2 h-2 rounded-full", STAGE_STYLE[st].dot)} />{count(st)} {STAGE_STYLE[st].label.toLowerCase()}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                {calView === 'week' && (
                  <CalendarWeek posts={filteredCalendarItems} weekStart={weekStart} onOpen={p => setViewItem(p as CalendarItem)} onAdd={addPostOn} showBrand={personalEnabled && activeBrand === 'all'} />
                )}
                {calView === 'board' && (
                  <CalendarBoard posts={filteredCalendarItems} onOpen={p => setViewItem(p as CalendarItem)} showBrand={personalEnabled && activeBrand === 'all'} />
                )}
                {calView === 'month' && (() => {
                  const first = new Date(selectedDate.year, selectedDate.month, 1);
                  const lead = (first.getDay() + 6) % 7; // weeks start on Monday, like the Week view
                  const daysInMonth = new Date(selectedDate.year, selectedDate.month + 1, 0).getDate();
                  const today = new Date();
                  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
                  while (cells.length % 7) cells.push(null);
                  return (
                    <div className="bg-surface-container-lowest rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] overflow-x-auto">
                      <div className="min-w-[760px]">
                        <div className="grid grid-cols-7 border-b border-outline-variant/10">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                            <div key={d} className="py-3 text-center text-[13px] font-medium text-on-surface-variant/70">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7">
                          {cells.map((day, i) => {
                            if (!day) return <div key={`e${i}`} className="min-h-[128px] border-b border-r border-outline-variant/10 bg-surface-container-low/40" />;
                            const date = new Date(selectedDate.year, selectedDate.month, day);
                            const items = filteredCalendarItems.filter(it => it.day === day && it.month === selectedDate.month && it.year === selectedDate.year)
                              .sort((x, y) => x.time.localeCompare(y.time));
                            const isToday = date.toDateString() === today.toDateString();
                            return (
                              <div key={day} className="min-h-[128px] border-b border-r border-outline-variant/10 p-2 flex flex-col gap-1 group">
                                <div className="flex items-center justify-between px-1">
                                  <button onClick={() => { setWeekStart(weekStartOf(date)); setCalView('week'); }} title="Open this week"
                                    className={cn("text-sm w-7 h-7 rounded-full flex items-center justify-center", isToday ? "bg-primary text-white font-semibold" : "text-on-surface font-medium hover:bg-surface-container-low")}>{day}</button>
                                  <button onClick={() => addPostOn(date)} aria-label={`Add a post on ${day}`} className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant/40 opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/5"><Plus size={14} /></button>
                                </div>
                                {items.slice(0, 3).map(it => (
                                  <button key={it.id} onClick={() => setViewItem(it)}
                                    className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md text-left hover:bg-surface-container-low min-w-0">
                                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", (STAGE_STYLE[it.status] || STAGE_STYLE.draft).dot)} />
                                    <span className="text-[11px] font-semibold text-primary shrink-0">{it.platform === 'Twitter' ? 'X' : it.platform === 'Instagram' ? 'IG' : it.platform}</span>
                                    <span className="text-[12px] text-on-surface truncate">{it.title}</span>
                                  </button>
                                ))}
                                {items.length > 3 && (
                                  <button onClick={() => { setWeekStart(weekStartOf(date)); setCalView('week'); }} className="text-[11px] font-medium text-on-surface-variant/70 hover:text-primary px-1.5 text-left">+{items.length - 3} more</button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>

            {/* Side Detail Panel */}
              <AnimatePresence>
                {isSidePanelOpen && (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="lg:col-span-4 space-y-6 md:space-y-8"
                  >
                    <div className="bg-surface-container-low rounded-3xl md:rounded-[40px] p-6 md:p-10 border border-outline-variant/10 shadow-xl shadow-black/5 space-y-6 md:space-y-10 sticky top-24">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                        <div className="space-y-1">
                          <h4 className="text-lg md:text-xl font-black tracking-tight text-on-surface">{MONTH_NAMES[selectedDate.month]} {selectedDate.day}, {selectedDate.year}</h4>
                          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Daily Content Schedule</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                          <button 
                            onClick={() => setShowAddModal(true)}
                            className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all"
                          >
                            <Plus size={20} />
                          </button>
                          <button 
                            onClick={() => setIsSidePanelOpen(false)}
                            className="w-10 h-10 rounded-full bg-surface-container-highest/50 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Week Strip */}
                      <div className="flex justify-between gap-1 md:gap-2 overflow-x-auto no-scrollbar pb-2">
                        {(() => {
                          // Calculate the week containing the selected date
                          const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                          
                          // Find the actual day of week for the selected date.
                          const selectedDateObj = new Date(selectedDate.year, selectedDate.month, selectedDate.day);
                          const dayOfWeek = selectedDateObj.getDay();
                          
                          // Find the Sunday of this week
                          const sundayOfThisWeek = new Date(selectedDate.year, selectedDate.month, selectedDate.day - dayOfWeek);
                          
                          return Array.from({ length: 7 }).map((_, i) => {
                            const d = new Date(sundayOfThisWeek);
                            d.setDate(sundayOfThisWeek.getDate() + i);
                            
                            const isSelected = selectedDate.day === d.getDate() && 
                                             selectedDate.month === d.getMonth() && 
                                             selectedDate.year === d.getFullYear();
                            
                            return (
                              <div 
                                key={i}
                                onClick={() => setSelectedDate({ day: d.getDate(), month: d.getMonth(), year: d.getFullYear() })}
                                className={cn(
                                  "flex flex-col items-center gap-1 md:gap-2 p-2 md:p-3 rounded-xl md:rounded-2xl transition-all cursor-pointer min-w-[48px] md:min-w-[56px] shrink-0",
                                  isSelected 
                                    ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105 md:scale-110" 
                                    : "bg-surface-container-highest/30 text-on-surface-variant/60 hover:bg-surface-container-highest"
                                )}
                              >
                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-60">{weekDays[i]}</span>
                                <span className="text-base md:text-lg font-black">{d.getDate()}</span>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Selected Day Content */}
                      <div className="space-y-6">
                        {selectedDayItems.length > 0 ? (
                          selectedDayItems.map(item => (
                            <div key={item.id} onClick={() => setViewItem(item)} className="bg-surface-container-lowest rounded-2xl md:rounded-[32px] p-6 md:p-8 border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow space-y-4 md:space-y-6 group cursor-pointer">
                              <div className="flex items-center justify-between">
                                <span className="text-4xl md:text-6xl font-black text-on-surface-variant/10 group-hover:text-primary/10 transition-colors">{item.day}</span>
                                <span className={cn("px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] font-semibold border", stageOf(item.status).chip)}>
                                  {stageOf(item.status).label}
                                </span>
                              </div>

                              <div className="space-y-3 md:space-y-4">
                                <div className="space-y-1">
                                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">{personalEnabled ? `${BRAND_LABEL[brandOf(item)]} · ` : ''}{item.platform} / {item.type}</p>
                                  <h5 className="text-xl md:text-2xl font-black text-on-surface leading-tight tracking-tight">{item.title}</h5>
                                </div>
                                {item.description && (
                                  <p className="text-sm font-medium text-on-surface-variant/60 leading-relaxed line-clamp-4 whitespace-pre-line break-words">
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              {item.tags && (
                                <div className="flex flex-wrap gap-2">
                                  {item.tags.filter(tag => tag && !['ai-generated', 'strategy'].includes(tag)).map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-surface-container-low rounded-lg text-[10px] font-bold text-on-surface-variant/60 border border-outline-variant/5">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div onClick={e => e.stopPropagation()} className="pt-6 border-t border-outline-variant/10 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-3 text-on-surface-variant min-w-0">
                                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                    <CheckCircle2 size={18} />
                                  </div>
                                  <span className="text-sm font-black tracking-tight whitespace-nowrap">{item.time}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleSendToProduction(item)}
                                    title="Send to Production"
                                    className="p-3 text-on-surface-variant/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                  >
                                    <Rocket size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleEditClick(item)}
                                    title="Edit"
                                    className="p-3 text-on-surface-variant/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                  >
                                    <Sparkles size={18} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Delete "${item.title}"? This can't be undone.`)) {
                                        handleDeleteContent(item.id);
                                      }
                                    }}
                                    title="Delete"
                                    className="p-3 text-on-surface-variant/40 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="bg-surface-container-lowest rounded-[32px] p-12 border border-outline-variant/10 border-dashed flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant/20">
                              <Calendar size={32} />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-black text-on-surface">No content scheduled</p>
                              <p className="text-xs font-medium text-on-surface-variant/40">Click the plus icon to add content for this day.</p>
                            </div>
                            <button 
                              onClick={() => setShowAddModal(true)}
                              className="bg-primary text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
                            >
                              Add Content
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Add Content Modal */}
            {typeof document !== 'undefined' && createPortal(
              <AnimatePresence>
                {showAddModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAddModal(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-surface-container-low w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl md:rounded-[40px] border border-outline-variant/10 shadow-2xl relative z-10"
                  >
                    <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                      <div className="flex items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xl md:text-2xl font-black tracking-tight text-on-surface">
                            {editingItem ? 'Edit Content' : 'Add Content'}
                          </h4>
                          <p className="text-xs md:text-sm font-medium text-on-surface-variant/60">
                            {editingItem ? 'Modify your scheduled content' : `Schedule new content for ${MONTH_NAMES[selectedDate.month].substring(0, 3)} ${selectedDate.day}, ${selectedDate.year}`}
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            setShowAddModal(false);
                            setEditingItem(null);
                            setNewItem({
                              platform: 'Instagram',
                              type: 'video',
                              status: 'scheduled',
                              time: '09:00 AM'
                            });
                          }}
                          className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-surface-container-highest/50 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-4 md:space-y-6">
                        <div className="space-y-1.5 md:space-y-2">
                          <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Title</label>
                          <input 
                            type="text" 
                            placeholder="Enter content title..."
                            value={newItem.title || ''}
                            onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>

                        <div className="space-y-1.5 md:space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Description</label>
                            {(() => {
                              const m = editingItem?.id.match(/^ai-(\d+)-/);
                              const idx = m ? Number(m[1]) : -1;
                              if (idx < 0 || !thirtyDayPlan?.calendar?.[idx]) return null;
                              return (
                                <button type="button" disabled={writingDay !== null}
                                  onClick={async () => { const text = await handleWriteFull(idx); if (text) setNewItem(prev => ({ ...prev, description: text })); }}
                                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary hover:underline disabled:opacity-50">
                                  {writingDay === idx ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                                  {writingDay === idx ? 'Writing…' : thirtyDayPlan.calendar[idx].full ? 'Rewrite full post' : 'Write full post'}
                                </button>
                              );
                            })()}
                          </div>
                          <textarea 
                            placeholder="Enter content description..."
                            value={newItem.description || ''}
                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                            rows={8}
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                          <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Platform</label>
                            <select 
                              value={newItem.platform}
                              onChange={(e) => setNewItem({ ...newItem, platform: e.target.value as any })}
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                            >
                              <option value="Instagram">Instagram</option>
                              <option value="TikTok">TikTok</option>
                              <option value="LinkedIn">LinkedIn</option>
                              <option value="Twitter">Twitter/X</option>
                              <option value="YouTube">YouTube</option>
                            </select>
                          </div>
                          <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Type</label>
                            <select 
                              value={newItem.type}
                              onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                            >
                              <option value="video">Video</option>
                              <option value="article">Article</option>
                              <option value="post">Post</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                          <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Time</label>
                            <input 
                              type="time" 
                              value={to24h(newItem.time)}
                              onChange={(e) => setNewItem({ ...newItem, time: to12h(e.target.value) })}
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5 md:space-y-2">
                            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Status</label>
                            <select 
                              value={newItem.status}
                              onChange={(e) => setNewItem({ ...newItem, status: e.target.value as any })}
                              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                            >
                              <option value="scheduled">Scheduled</option>
                              <option value="draft">Draft</option>
                              <option value="published">Published</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                        {editingItem && (
                          <button 
                            onClick={() => {
                              handleDeleteContent(editingItem.id);
                              setShowAddModal(false);
                              setEditingItem(null);
                              setNewItem({
                                platform: 'Instagram',
                                type: 'video',
                                status: 'scheduled',
                                time: '09:00 AM'
                              });
                            }}
                            className="flex-1 bg-rose-500/10 text-rose-500 py-4 md:py-6 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                          >
                            Delete
                          </button>
                        )}
                        <button 
                          onClick={handleSaveContent}
                          className={cn(
                            "py-4 md:py-6 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-xl md:shadow-2xl transition-all active:scale-95",
                            editingItem ? "flex-[2] bg-secondary text-on-secondary shadow-secondary/30" : "w-full bg-primary text-white shadow-primary/30 hover:scale-[1.02]"
                          )}
                        >
                          {editingItem ? 'Save Changes' : 'Add to Calendar'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
              </AnimatePresence>,
              document.body
            )}

            {/* Regen for Notion Modal */}
            {typeof document !== 'undefined' && createPortal(
              <AnimatePresence>
                {showRegenModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowRegenModal(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-surface-container-low w-full max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-3xl md:rounded-[40px] border border-outline-variant/10 shadow-2xl relative z-10"
                  >
                    <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                      <div className="flex items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-xl md:text-2xl font-black tracking-tight text-on-surface">
                            Regen for Notion
                          </h4>
                          <p className="text-xs md:text-sm font-medium text-on-surface-variant/60">
                            Generate a content calendar based on a simple prompt.
                          </p>
                        </div>
                        <button 
                          onClick={() => setShowRegenModal(false)}
                          className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-surface-container-highest/50 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-4 md:space-y-6">
                        <div className="space-y-1.5 md:space-y-2">
                          <label className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ml-1">Prompt</label>
                          <textarea 
                            placeholder="e.g. Generate a 2-week launch plan for my new SaaS product targeting developers..."
                            value={regenPrompt}
                            onChange={(e) => setRegenPrompt(e.target.value)}
                            rows={4}
                            className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50 transition-all resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                        <button 
                          onClick={handleRegenForNotion}
                          disabled={isRegenerating || !regenPrompt.trim()}
                          className={cn(
                            "w-full py-4 md:py-6 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] md:tracking-[0.3em] shadow-xl md:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3",
                            isRegenerating || !regenPrompt.trim() ? "bg-surface-container-highest text-on-surface-variant/50 cursor-not-allowed" : "bg-[#FFD600] text-black shadow-[#FFD600]/30 hover:scale-[1.02]"
                          )}
                        >
                          {isRegenerating ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} />
                              Generate Content
                              <span className="px-1.5 py-0.5 bg-black/20 text-black rounded-md text-[8px] font-black uppercase tracking-widest shrink-0">Pro</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
              </AnimatePresence>,
              document.body
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 md:space-y-10 relative">
      {createPortal(
        <AnimatePresence>
          {isGeneratingPlan && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface/95 backdrop-blur-md"
            >
              <div className="relative flex items-center justify-center w-32 h-32 mb-8">
                {/* Spinner */}
                <svg className="absolute inset-0 w-full h-full animate-[spin_3s_linear_infinite]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" className="text-outline-variant/20" />
                  <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="60 200" strokeLinecap="round" className="text-primary" />
                </svg>
                {/* Sparkle Icon */}
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <div className="h-12 relative flex items-center justify-center overflow-hidden mb-4 w-full">
                <AnimatePresence mode="wait">
                  <motion.h2 
                    key={generationState}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 1 }}
                    className="text-3xl md:text-4xl font-black tracking-tight text-on-surface text-center absolute"
                  >
                    {generationState === 'crafting' && 'Crafting Strategy...'}
                    {generationState === 'building' && 'Building Content Plan...'}
                    {generationState === 'completed' && 'Completed Boss 🫡'}
                  </motion.h2>
                </AnimatePresence>
              </div>
              <p className="text-on-surface-variant/60 max-w-md text-center text-sm font-medium">
                TitanLeap AI is scanning social signals, ad libraries, and landing page structures...
              </p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Header: title, client, brand, then the section tabs */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="text-3xl md:text-[34px] font-bold tracking-tight text-on-surface">Strategy</h2>
            <p className="text-sm text-on-surface-variant/70">
              {clientLabel(clientId)}
              {activeTab === 'plan' ? (thirtyDayPlan ? ' · 30-day plan' : ' · New plan') : activeTab === 'calendar' ? ` · ${personalEnabled && activeBrand !== 'all' ? BRAND_LABEL[activeBrand] + ' calendar' : 'Calendar'}` : ' · Competitors'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <ClientSwitcher />
            {personalEnabled ? (
              <div role="group" aria-label="Brand" className="flex gap-0.5 p-[3px] rounded-xl bg-surface-container-high">
                {(activeTab === 'calendar' ? (['all', 'company', 'personal'] as const) : (['company', 'personal'] as const)).map(b => (
                  <button key={b} onClick={() => setActiveBrand(b)}
                    className={cn("h-[34px] px-3.5 rounded-[10px] text-[13px] transition-all whitespace-nowrap",
                      (activeBrand === b || (activeTab !== 'calendar' && activeBrand === 'all' && b === 'company'))
                        ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm" : "text-on-surface-variant/70 font-medium hover:text-on-surface")}>
                    {b === 'all' ? 'All' : BRAND_LABEL[b]}
                  </button>
                ))}
              </div>
            ) : (
              <button onClick={() => setPersonalEnabled(true)} className="h-10 px-3 rounded-xl text-[13px] font-medium text-on-surface-variant/70 hover:text-primary">+ Personal brand</button>
            )}
          </div>
        </div>

        <div role="tablist" aria-label="Strategy sections" className="inline-flex gap-1 p-1 rounded-[14px] bg-surface-container-high">
          {([
            { id: 'plan', label: 'Plan' },
            { id: 'calendar', label: 'Calendar' },
            { id: 'competitor', label: 'Competitors' },
          ] as const).map(tab => (
            <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id as StrategyTab)}
              className={cn("h-[38px] px-5 rounded-[11px] text-sm transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm" : "text-on-surface-variant/70 font-medium hover:text-on-surface")}>
              {tab.label}
            </button>
          ))}
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
          {renderTabContent()}
          {renderViewPopup()}
          {showImport && <ContentImport brands={personalEnabled ? [{ id: 'company', label: 'Company' }, { id: 'personal', label: 'Personal' }] : null} defaultBrand={personalEnabled && activeBrand !== 'all' ? activeBrand : 'company'} onImport={handleImportContent} onClose={() => setShowImport(false)} />}
          {brandPick && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setBrandPick(null)}>
              <div onClick={e => e.stopPropagation()} className="w-full max-w-sm bg-surface-container-lowest rounded-[22px] p-6 space-y-4 shadow-[0_8px_20px_rgba(0,0,0,0.08),0_20px_60px_rgba(0,0,0,0.16)]">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold tracking-tight text-on-surface">Which calendar?</h3>
                  <p className="text-sm text-on-surface-variant/70">Add these 30 days to your company or your personal brand.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(['company', 'personal'] as const).map(b => (
                    <button key={b} onClick={() => { const which = brandPick; setBrandPick(null); which === 'draft' ? handleDraftCalendarFromBlueprint(b) : handleSyncToCalendar(b); }}
                      className="py-4 rounded-2xl border border-outline-variant/15 hover:border-primary hover:bg-primary/5 text-sm font-semibold text-on-surface transition-all">{BRAND_LABEL[b]}</button>
                  ))}
                </div>
              </div>
            </div>, document.body)}
        </motion.div>
      </AnimatePresence>

      {/* Credentials Modal */}
      <AnimatePresence>
        {showCredentialsModal && credentialsPlatform && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-surface border border-outline-variant/20 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      {credentialsPlatform === 'twitter' && <Twitter size={20} />}
                      {credentialsPlatform === 'linkedin' && <Linkedin size={20} />}
                      {credentialsPlatform === 'facebook' && <Facebook size={20} />}
                    </div>
                    <h3 className="text-xl font-black tracking-tight capitalize">Connect {credentialsPlatform}</h3>
                  </div>
                  <button 
                    onClick={() => setShowCredentialsModal(false)}
                    className="p-2 hover:bg-surface-container rounded-full transition-colors"
                  >
                    <X size={20} className="text-on-surface-variant" />
                  </button>
                </div>
                
                <p className="text-sm text-on-surface-variant/80">
                  To publish reliably without getting blocked by security checks, you need to install the <strong>TitanLeap Local Executor</strong> Chrome Extension.
                </p>
                
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 text-xs space-y-2 text-on-surface-variant">
                  <p className="font-bold text-on-surface">How to install:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Click the <strong>Gear Icon</strong> in AI Studio (top right) and select <strong>Export to ZIP</strong>.</li>
                    <li>Extract the downloaded ZIP file.</li>
                    <li>Open Chrome and go to <code className="bg-surface-container px-1 py-0.5 rounded">chrome://extensions/</code></li>
                    <li>Turn on <strong>Developer mode</strong> (top right).</li>
                    <li>Click <strong>Load unpacked</strong> and select the <code className="bg-surface-container px-1 py-0.5 rounded">public/titanleap-extension</code> folder.</li>
                    <li>Refresh this page.</li>
                  </ol>
                </div>

                <button 
                  onClick={() => setShowCredentialsModal(false)}
                  className="w-full bg-surface-container-highest text-on-surface py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daemon Terminal Modal */}
      <AnimatePresence>
        {showDaemonTerminal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[#0a0a0a] border border-[#333] rounded-xl shadow-2xl overflow-hidden font-mono"
            >
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#333] bg-[#111]">
                <div className="flex items-center gap-2 text-[#888]">
                  <Terminal size={14} />
                  <span className="text-xs font-bold tracking-widest">TITANLEAP DAEMON v2.4.1</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
              </div>
              
              <div className="p-6 h-[300px] overflow-y-auto flex flex-col gap-2 text-sm text-[#00ff00]">
                {daemonLogs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex items-start gap-2",
                      log.includes('[ERROR]') ? "text-[#ff5f56]" : 
                      log.includes('[SUCCESS]') ? "text-[#27c93f]" : 
                      log.includes('[SYSTEM]') ? "text-[#888]" : "text-[#00ff00]"
                    )}
                  >
                    <span className="opacity-50 shrink-0">{'>'}</span>
                    <span>{log}</span>
                  </motion.div>
                ))}
                {daemonProgress < 100 && (
                  <motion.div
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-2 h-4 bg-[#00ff00] mt-1"
                  />
                )}
              </div>
              
              <div className="px-6 py-4 bg-[#111] border-t border-[#333]">
                <div className="h-1 w-full bg-[#222] rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-[#00ff00]"
                    initial={{ width: 0 }}
                    animate={{ width: `${daemonProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-[#666] uppercase tracking-widest">
                  <span>Status: {daemonProgress === 100 ? 'Complete' : 'Processing'}</span>
                  <span>{daemonProgress}%</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
