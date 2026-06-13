import { GoogleGenAI } from "@google/genai";
import { TITANLEAP_SYSTEM_PROMPT } from '../prompt';
import { generateClaudeContent } from './claude';

export type AIEngine = 'gemini' | 'claude';

let currentEngine: AIEngine = (typeof window !== 'undefined' && localStorage.getItem('preferred_ai_engine') as AIEngine) || 'claude';

export const setAIEngine = (engine: AIEngine) => {
  currentEngine = engine;
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferred_ai_engine', engine);
  }
};

export const getAIEngine = () => currentEngine;

// Helper for Gemini Proxy
const generateGeminiContent = async (params: {
  prompt: string;
  systemPrompt?: string;
  responseMimeType?: string;
  temperature?: number;
}) => {
  const response = await fetch('/api/ai/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Gemini request failed");
  }
  
  return await response.json();
};

const unifiedGenerateContent = async (options: {
  prompt: string;
  systemPrompt?: string;
  responseMimeType?: string;
  temperature?: number;
}) => {
  if (currentEngine === 'claude') {
    const result = await generateClaudeContent(options);
    return { text: result.text };
  } else {
    const result = await generateGeminiContent(options);
    return { text: result.text };
  }
};

const parseJSON = (text: string | undefined, fallback: any = {}) => {
  if (!text) return fallback;
  try {
    const cleaned = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    return fallback;
  }
};

export const generateNotionContent = async (userPrompt: string) => {
  const prompt = `
    You are an expert content strategist. The user wants to generate a content calendar based on this prompt: "${userPrompt}".
    
    Generate at least 10 content ideas starting from the current day.
    Return a JSON array of objects with the following structure:
    [
      {
        "title": "Short catchy title",
        "description": "Detailed description of the post/video",
        "platform": "Instagram" | "TikTok" | "LinkedIn" | "Twitter" | "YouTube",
        "type": "video" | "article" | "post",
        "time": "09:00 AM",
        "dayOffset": number (0 to 30, representing days from today to schedule this),
        "tags": ["tag1", "tag2"]
      }
    ]
  `;

  try {
    const response = await unifiedGenerateContent({
      prompt,
      responseMimeType: "application/json",
    });

    return parseJSON(response.text, []);
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};

export const generateContentScripts = async (handle: string, mode: string) => {
  const isPerLink = mode === 'per-link';
  
  const prompt = isPerLink 
    ? `
    You are a world-class social media strategist and content engineer.
    Your task is to perform a DEEP AUDIT of the specific link provided: "${handle}".
    
    CRITICAL DIRECTIVE:
    1. Use 'urlContext' first. If it fails (login wall/bot protection), you MUST use 'googleSearch' to find transcripts, captions, or detailed descriptions of this specific post/video.
    2. Do NOT give generic advice. Reconstruct the actual elements used in this specific content.
    3. VISUAL HOOK: If the content is a video, describe the visual hook (e.g., "A person holding a phone with a green screen background").
    
    Analyze and extract:
    1. The Viral Hook: Exactly what was said and shown in the first 3 seconds.
    2. Content Strategy: What is the underlying psychological trigger? (e.g., social proof, fear of missing out, educational authority).
    3. Content Structure: Breakdown the pacing and sections of the video/post.
    4. Audience Insights: Who is this specifically targeting based on the language and framing?
    
    Format the output as a JSON object (NOT an array) with these fields: 'hook', 'strategy', 'structure', 'insights', 'title' (a descriptive title like "Viral SaaS Growth Hack Breakdown"), and 'scripts' (an array containing this one analyzed script object).
    `
    : `
    You are a world-class social media growth engineer and content strategist.
    Your task is to perform a COMPREHENSIVE AUDIT of the social media handle or brand: "${handle}".
    
    CRITICAL DIRECTIVE:
    1. Use 'googleSearch' and 'urlContext' to find their most recent and highest-performing content across all platforms.
    2. Analyze their "Content DNA": Identify their unique hook style, pacing, visual language (e.g., "Aesthetic vlogs", "Talking head with captions"), and recurring themes.
    3. STRICT SPECIFICITY RULE: Reference actual topics they talk about, specific hooks they've used, and performance data you find. NO GENERIC ADVICE.
    
    Based on this deep scrape, generate:
    1. A detailed "Overall Strategy" (specific to their niche and style, including their "Content DNA").
    2. Specific "Audience Insights" (who are they actually reaching and why?).
    3. A list of 3 "Trending Topics" they are currently winning with.
    4. 3 new scripts that follow their high-performance patterns but with fresh angles.
    
    Format the output as a JSON object with:
    - 'scripts': Array of 3 objects with 'title', 'hook', 'body', and 'cta'.
    - 'overallStrategy': A detailed, non-generic strategy based on their actual performance data.
    - 'audienceInsights': Specific target demographics and behaviors identified.
    - 'trendingTopics': 3 specific topics they should double down on.
    `;

  try {
    const response = await unifiedGenerateContent({
      prompt,
      responseMimeType: "application/json",
    });

    const data = parseJSON(response.text, {});
    // Ensure we return a consistent structure for the UI
    if (isPerLink) {
      const scriptData = data.scripts?.[0] || data;
      return {
        scripts: [scriptData],
        overallStrategy: scriptData.strategy || data.strategy || "Strategy analysis based on available search data.",
        audienceInsights: scriptData.insights || data.insights || "Audience targeting identified from content framing.",
        contentStructure: scriptData.structure || data.structure || "Structure reconstructed from content patterns."
      };
    }
    return data;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw error;
  }
};

export const auditLandingPage = async (formData: any) => {
  const prompt = `
You are an elite growth consultant — not an AI audit tool. Your job is to deeply understand this business and diagnose the specific constraints holding back their growth. Think like a trusted advisor who has studied the business carefully, not a report generator.

BUSINESS INFORMATION:
Business Name: ${formData.businessName}
Industry: ${formData.industry}
Website: ${formData.websiteUrl}
In Business: ${formData.businessDuration}
Primary Platform: ${formData.primaryPlatform}
Social Handles: ${formData.socialHandles?.join(', ') || 'Not provided'}
Monthly Reach: ${formData.monthlyReach || 'Unknown'}
Posting Consistently: ${formData.postingConsistently}
Main Offer: ${formData.mainOffer}
Price Point: ${formData.currency || 'USD'} ${formData.pricePoint}
Competitive Difference: ${formData.differentiator || 'Not specified'}
Current Revenue: $${formData.currentRevenue}/mo
Target Revenue: $${formData.targetRevenue}/mo
Timeline: ${formData.timeline}
Biggest Challenge: ${formData.challenges?.join(', ') || 'Not specified'}
Landing Page: ${formData.hasLandingPage ? formData.landingPageUrl : 'No'}
Email Sequence: ${formData.emailSequence}
Running Ads: ${formData.runningAds ? 'Yes — ' + formData.adPlatform : 'No'}
Content Types: ${formData.contentTypes?.join(', ') || 'Not specified'}
Tools Used: ${formData.tools?.join(', ') || 'Not specified'}

CONSTRAINT CATEGORIES TO DIAGNOSE:
1. Positioning — Does the market clearly understand who this is for and why it's different?
2. Authority — Does this business have the trust signals needed to convert cold traffic?
3. Acquisition — Are they generating enough of the right kind of attention consistently?
4. Conversion — Is their system turning attention into leads and leads into clients?
5. Sales — Is there a reliable process to close and retain business?

DIAGNOSIS INSTRUCTIONS:
- Identify the TOP 3 constraints most limiting this business's growth right now.
- Base your diagnosis on observable signals from the information provided.
- Write like a consultant who has studied this business — specific, thoughtful, human.
- Do NOT invent revenue figures, percentages, or KPIs.
- Do NOT use generic audit language or filler phrases.
- Write the Executive Summary as if you are presenting directly to the business owner.
- Every section should feel earned and specific to this business.

Output ONLY valid JSON matching this exact structure:
{
  "executiveSummary": {
    "businessUnderstanding": "2-3 sentences showing you understand what this business does, who it serves, and where it is in its growth journey",
    "currentSituation": "2-3 sentences on the current growth situation based on what was shared",
    "mainObservations": "2-3 sentences on the most important patterns or gaps observed",
    "biggestOpportunities": "2-3 sentences on where the biggest leverage is"
  },
  "businessSnapshot": {
    "businessType": "One line description of the business model",
    "offer": "What they sell and at what price",
    "targetAudience": "Who they serve",
    "growthGoal": "What they are trying to achieve",
    "currentStage": "Early-stage / Growth-stage / Scaling / Established",
    "summaryOfFindings": "One paragraph summary of the overall diagnosis"
  },
  "primaryConstraint": {
    "category": "One of: Positioning / Authority / Acquisition / Conversion / Sales",
    "whatWeFound": "2-3 sentences describing the specific constraint observed",
    "evidence": "Specific signals from the intake that support this diagnosis",
    "whyItMatters": "Why this constraint is limiting growth right now",
    "businessImpact": "The practical effect this constraint has on the business day-to-day",
    "recommendedActions": ["Specific action 1", "Specific action 2", "Specific action 3"]
  },
  "secondaryConstraint": {
    "category": "One of: Positioning / Authority / Acquisition / Conversion / Sales",
    "whatWeFound": "2-3 sentences describing the specific constraint observed",
    "evidence": "Specific signals from the intake that support this diagnosis",
    "whyItMatters": "Why this constraint is limiting growth right now",
    "businessImpact": "The practical effect this constraint has on the business day-to-day",
    "recommendedActions": ["Specific action 1", "Specific action 2", "Specific action 3"]
  },
  "thirdConstraint": {
    "category": "One of: Positioning / Authority / Acquisition / Conversion / Sales",
    "whatWeFound": "2-3 sentences describing the specific constraint observed",
    "evidence": "Specific signals from the intake that support this diagnosis",
    "whyItMatters": "Why this constraint is limiting growth right now",
    "businessImpact": "The practical effect this constraint has on the business day-to-day",
    "recommendedActions": ["Specific action 1", "Specific action 2", "Specific action 3"]
  },
  "roadmap": {
    "month1": {
      "focus": "Month 1 theme in one sentence",
      "actions": ["Action 1", "Action 2", "Action 3", "Action 4"]
    },
    "month2": {
      "focus": "Month 2 theme in one sentence",
      "actions": ["Action 1", "Action 2", "Action 3", "Action 4"]
    },
    "month3": {
      "focus": "Month 3 theme in one sentence",
      "actions": ["Action 1", "Action 2", "Action 3", "Action 4"]
    }
  },
  "quickWins": [
    "Specific quick win 1",
    "Specific quick win 2",
    "Specific quick win 3",
    "Specific quick win 4",
    "Specific quick win 5"
  ],
  "titanLeapHelp": [
    {
      "constraint": "Primary constraint category name",
      "howWeHelp": ["Specific way 1", "Specific way 2", "Specific way 3"],
      "expectedOutcome": "What improves as a result"
    },
    {
      "constraint": "Secondary constraint category name",
      "howWeHelp": ["Specific way 1", "Specific way 2", "Specific way 3"],
      "expectedOutcome": "What improves as a result"
    },
    {
      "constraint": "Third constraint category name",
      "howWeHelp": ["Specific way 1", "Specific way 2", "Specific way 3"],
      "expectedOutcome": "What improves as a result"
    }
  ],
  "nextStep": "2-3 sentences written as a trusted advisor recommending the most important next step. Do not hard sell. Be direct and genuine."
}
  `;

  try {
    const response = await unifiedGenerateContent({
      prompt,
      systemPrompt: TITANLEAP_SYSTEM_PROMPT,
      temperature: 0.7,
      responseMimeType: "application/json",
    });

    return parseJSON(response.text, { primaryConstraint: null, secondaryConstraint: null, thirdConstraint: null });
  } catch (error) {
    console.error("AI Audit Error:", error);
    throw error;
  }
};

export const generate30DayPlan = async (auditData: any) => {
  const prompt = `
    You are a world-class viral social media strategist and content architect with deep expertise in platform algorithms, audience psychology, and growth hacking.

    I have completed a full social media audit for ${auditData?.businessName || 'the brand'}. Your job is to use every insight from this audit to build a fully SYNCED, viral-engineered 30 days content calendar that is ready to execute immediately.

    This is not a generic content plan. Every post must be informed by real audit data, engineered for virality, and synced intelligently across all platforms.

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    BRAND PROFILE
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Brand: ${auditData?.businessName || 'The Brand'}
    Industry: ${auditData?.industry || 'B2B SaaS'}
    Primary Platform: ${auditData?.primaryPlatform || 'Instagram, TikTok, LinkedIn'}
    Main Offer: ${auditData?.mainOffer || 'Premium Service'}
    Price Point: ${auditData?.pricePoint || 'Unknown'}
    Differentiator: ${auditData?.differentiator || 'Unique Approach'}
    Current Revenue: ${auditData?.currentRevenue || 'Unknown'}
    Target Revenue: ${auditData?.targetRevenue || 'Unknown'}
    Posting Consistency: ${auditData?.postingConsistently || 'Unknown'}

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    AUDIT DATA — YOUR STRATEGIC FOUNDATION
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Estimated Revenue Gap: $${auditData?.revenueGap || 'Unknown'}

    🚨 CRITICAL LEAKAGE POINTS (ISSUES TO FIX WITH CONTENT):
    ${auditData?.issues?.map((issue: any) => `- ${issue.area}: ${issue.problem} (Impact: $${issue.impact}) -> Action: ${issue.action}`).join('\n    ') || 'No specific issues identified.'}

    ⚠️ CURRENT CHALLENGES:
    ${auditData?.challenges?.map((c: string) => `- ${c}`).join('\n    ') || 'No specific challenges listed.'}

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    CONTENT PILLARS & DISTRIBUTION
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    1. Offer Awareness & Education (Address the leakage points)
    2. Social Proof & Authority (Overcome challenges)
    3. Viral Hooks & Engagement (Drive reach)

    Rotate evenly. No pillar should cluster more than 2 days in a row.

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    VIRAL MECHANICS — ENGINEER INTO EVERY WEEK
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    The following viral mechanics must be deliberately baked into the calendar.
    Each week must include at least 3–4 of these tactics:

      1. Pattern-interrupt hooks (stop-the-scroll first lines)
      2. Controversy / hot-take posts (safe but bold opinions)
      3. Comment-bait CTAs (designed to trigger replies)
      4. Save-worthy value posts (checklists, frameworks)
      5. Share-bait (relatable frustrations, identity content)
      6. Cliffhanger / series content (come back tomorrow)

    Label each post in the calendar with the viral mechanic it uses.

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    PLATFORM SYNC RULES
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Sync strategy: repurpose with native adaptation
    IMPORTANT: Never copy-paste the same caption to every platform. Each version must feel native.

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    RECURRING SERIES (MANDATORY)
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    Create at least TWO recurring weekly content series to build audience habit.
    Examples: "Monday Myth Busting," "Wednesday Wins," "Friday Behind-the-Scenes."
    Make them brand-specific and relevant.

    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    OUTPUT FORMAT
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    The output MUST be a JSON object with the following structure exactly:
    {
      "calendar": [
        {
          "date": "Day 1",
          "platform": "Instagram | TikTok | LinkedIn | Twitter | YouTube",
          "pillar": "string",
          "format": "string",
          "viralMechanic": "string",
          "hook": "string",
          "message": "string",
          "cta": "string",
          "hashtags": "string",
          "postTime": "string",
          "notes": "string"
        }
      ],
      "strategicSyncSummary": [
        "Paragraph 1: The narrative arc and thematic flow across the 30 days",
        "Paragraph 2: How the platform sync strategy drives cross-platform amplification",
        "Paragraph 3: The #1 viral bet of the calendar and why it will work"
      ],
      "weeklyKPIs": [
        { "kpi": "string", "target": "string" }
      ],
      "abTestPlan": [
        { "hypothesis": "string", "variable": "string", "successMetric": "string" }
      ],
      "hookLibrary": [
        "string (hook 1)", "string (hook 2)"
      ]
    }
    
    Ensure exactly 30 items in the "calendar" array.
  `;

  try {
    const response = await unifiedGenerateContent({
      prompt,
      responseMimeType: "application/json",
    });

    return parseJSON(response.text, {});
  } catch (error) {
    console.error("AI Plan Error:", error);
    throw error;
  }
};

export const smartFillForm = async (url: string) => {
  // Try server-side endpoint first (it can actually fetch the page)
  try {
    const serverRes = await fetch('/api/ai/smart-fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data && typeof data === 'object' && !data.error) return data;
    }
  } catch (_) {
    // fall through to direct Claude call
  }

  // Fallback: call Claude proxy directly (always available)
  const smartFillPrompt = `You are a business intelligence analyst. Analyse this website URL and extract structured business information to pre-fill an audit form. Use your best inference — do not leave fields empty if you can make a reasonable guess.

WEBSITE URL: ${url}

Extract and return ONLY a valid JSON object with these exact keys:
{
  "businessName": "Official name of the business",
  "industry": "One of: B2B SaaS, E-commerce, Coaching/Consulting, Agency, Local Business, Other",
  "primaryPlatform": "Their main social media platform — one of: Instagram, LinkedIn, TikTok, YouTube, Twitter-X",
  "socialHandles": ["array of social handles or profile URLs found, e.g. '@handle'"],
  "monthlyReach": "Estimated monthly social media reach as number string, e.g. '5000'. Use '1000' if unknown.",
  "mainOffer": "Their primary product or service in one sentence",
  "pricePoint": "Numeric price of main offer in USD as string, e.g. '2997'. Use '0' if not found.",
  "differentiator": "What makes them unique or their main value proposition in one sentence",
  "currentRevenue": "0",
  "targetRevenue": "If pricePoint known, set to pricePoint * 10, else '0'",
  "currency": "USD",
  "timeline": "One of: 30 days, 60 days, 90 days, 6 months, 1 year",
  "challenges": ["1-3 items from: Getting leads, Converting leads, Retaining clients, Content creation, Ads not working, No clear strategy, Other"],
  "tools": ["Tools they likely use from: Mailchimp, ConvertKit, ClickFunnels, Webflow, Shopify, Kajabi, None, Other"],
  "contentTypes": ["Content types from: Short-form video, Long-form video, Carousels, Blogs, Emails, Podcasts"],
  "hasLandingPage": true,
  "hasUpsell": false,
  "runningAds": false,
  "emailSequence": "One of: Yes, No, In progress"
}
Return ONLY the JSON. No markdown. No explanation.`;

  const proxyRes = await fetch('/api/ai/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: smartFillPrompt }),
  });

  if (!proxyRes.ok) {
    const err = await proxyRes.json().catch(() => ({ error: 'Smart fill failed' }));
    throw new Error(err.error || 'Smart fill failed');
  }

  const result = await proxyRes.json();
  const cleaned = (result.text || '').replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse Smart Fill response. Try again.');
  }
};

export const analyzeSocialTrends = async (platform: string) => {
  const prompt = `
    Analyze current social media trends for the platform: ${platform}.
    Focus on the SaaS and digital marketing niche.
    Provide:
    1. 3 trending topics/keywords.
    2. A brief strategy for each.
    Format the output as a JSON array of objects with 'topic' and 'strategy' fields.
  `;

  try {
    const response = await unifiedGenerateContent({
      prompt,
      responseMimeType: "application/json",
    });

    return parseJSON(response.text, []);
  } catch (error) {
    console.error("Trend Analysis Error:", error);
    return [];
  }
};

export const refinePlan = async (currentPlan: any, feedback: string) => {
  const prompt = `
    Refine the following 30-day growth plan: ${JSON.stringify(currentPlan)}.
    User feedback: "${feedback}".
    Adjust the plan to better align with the feedback while maintaining high-impact growth strategies.
    
    The output MUST follow the same JSON structure as the original plan:
    {
      "calendar": [
        {
          "date": "Day 1",
          "platform": "Instagram | TikTok | LinkedIn | Twitter | YouTube",
          "pillar": "string",
          "format": "string",
          "viralMechanic": "string",
          "hook": "string",
          "message": "string",
          "cta": "string",
          "hashtags": "string",
          "postTime": "string",
          "notes": "string"
        }
      ],
      "strategicSyncSummary": [
        "string", "string", "string"
      ],
      "weeklyKPIs": [
        { "kpi": "string", "target": "string" }
      ],
      "abTestPlan": [
        { "hypothesis": "string", "variable": "string", "successMetric": "string" }
      ],
      "hookLibrary": [
        "string", "string"
      ]
    }
  `;

  try {
    const response = await unifiedGenerateContent({
      prompt,
      responseMimeType: "application/json",
    });

    return parseJSON(response.text, {});
  } catch (error) {
    console.error("AI Refine Plan Error:", error);
    throw error;
  }
};

export const getPerformanceInsight = async (metrics: any) => {
  const prompt = `
    Analyze the following business performance metrics: ${JSON.stringify(metrics)}.
    Provide a concise, high-impact growth insight (max 2 sentences).
    Focus on identifying the biggest opportunity or a critical bottleneck.
    Return the response as a plain string.
  `;

  try {
    const response = await unifiedGenerateContent({
      prompt,
    });

    return response.text || "No insights available at this time.";
  } catch (error) {
    console.error("Insight Error:", error);
    return "Error generating insights.";
  }
};

export const generateContentIdeas = async (industry: string, audience: string, trends: any[]) => {
  const prompt = `
    Act as a world-class content strategist.
    Based on the following data:
    - Industry: ${industry}
    - Target Audience: ${audience}
    - Current Trends: ${JSON.stringify(trends)}
    
    Generate 4 high-impact content ideas that would resonate with this audience and leverage current trends.
    For each idea, provide:
    1. A catchy title.
    2. The best platform for it (Instagram, TikTok, Twitter, LinkedIn, or YouTube).
    3. A brief description of the content.
    4. Why it works (the "hook" or "angle").
    
    Format the output as a JSON array of objects with 'title', 'platform', 'description', and 'angle' fields.
  `;

  try {
    const response = await unifiedGenerateContent({
      prompt,
      responseMimeType: "application/json",
    });

    return parseJSON(response.text, []);
  } catch (error) {
    console.error("Content Ideas Error:", error);
    return [];
  }
};

export const auditEmailSequence = async (funnelData: any) => {
  const prompt = `
    You are an elite funnel analyst and conversion rate optimization specialist. Your job is to audit a client's marketing funnel and identify exactly where they are losing money, with specific actionable fixes.
    When given funnel information, you will analyse every stage with the precision of a world-class CRO expert. You understand buyer psychology, copywriting principles, traffic quality, offer positioning, and post-purchase optimization.

    CRITICAL DIRECTIVE: DEEP SCRAPE & SPECIFICITY
    1. If the provided funnel information contains a URL or social media handle, you MUST use the 'googleSearch' and 'urlContext' tools to find the actual website, landing pages, and social profiles. Do NOT rely only on the provided text if a URL is available.
    2. STRICT SPECIFICITY RULE: Do NOT give generic advice (e.g., "Improve your headline"). Instead, provide specific examples based on what you find (e.g., "Your current headline 'Get Started Now' is too vague; try 'Unlock 24% More Revenue in 30 Days' to match your case study data").
    3. REAL DATA: Search for real pricing, headlines, and conversion signals. If you find a pricing page, mention the exact tiers.

    AUDIT FRAMEWORK — analyse every stage in this order:
    1. Traffic Sources
    Check: Where are they getting their traffic from? Paid ads (Meta, TikTok, Google), organic (SEO, Social), affiliates, or direct outreach? What platforms are most active? What is their estimated traffic volume and consistency?
    2. Hook and Content Strategy
    Check: What hook style do they use (pain-agitate-solve, curiosity gap, etc.)? How long is their hook? What emotion does it target? How frequently do they post? What content format dominates (short video, carousel, ads)?
    3. Landing Page Structure
    Check: What does their landing page lead with (headline, video, testimonials)? Is it a long-form sales letter, VSL page, or simple opt-in? How many fields are in their forms? Is the CTA clear and above the fold?
    4. Offer and Pricing
    Check: What is their core offer? Is it a low-ticket tripwire, a high-ticket coaching program, or a subscription? What is the price point? Is there a clear value proposition and risk reversal (guarantee)?
    5. Backend and Retention
    Check: What happens after the first purchase? Is there an immediate upsell or order bump? Do they have an automated email nurture sequence? How do they handle customer retention and repeat sales?

    Funnel Information to Analyze: ${JSON.stringify(funnelData)}

    OUTPUT STRUCTURE:
    1. Overall Verdict: A brutal, honest summary of the funnel's health (1-2 sentences).
    2. Overall Score: A score from 0-100 representing the total funnel health.
    3. Annual Revenue Gap: An estimated dollar amount (e.g., "+$1.2M") representing the lost revenue opportunity.
    4. Stage-by-Stage Breakdown: For each of the 5 layers above, provide:
       - Score (1-10)
       - Analysis (What's working, what's failing)
       - The "Money Leak" (Exactly how much potential revenue is being lost here)
       - Bottlenecks (2-3 specific conversion bottlenecks identified in this stage)
       - Content Ideas (2-3 AI-generated content or copy ideas to improve this specific stage)
    5. Top 3 Fixes: The three highest-leverage changes to make in the next 48 hours to see an immediate ROI.
    6. Competitor Analysis: How this funnel stacks up against industry leaders in the same niche.

    Format the output as a JSON object with the following structure:
    {
      "verdict": "string",
      "overallScore": number,
      "revenueGap": "string",
      "stages": [
        {
          "name": "string",
          "score": number,
          "analysis": "string",
          "moneyLeak": "string",
          "bottlenecks": ["string"],
          "contentIdeas": ["string"]
        }
      ],
      "topFixes": [
        {
          "title": "string",
          "action": "string",
          "expectedRoi": "string"
        }
      ],
      "competitorComparison": "string"
    }
  `;

  try {
    const response = await unifiedGenerateContent({
      prompt,
      responseMimeType: "application/json",
    });

    return parseJSON(response.text, {});
  } catch (error) {
    console.error("Email Sequence Audit Error:", error);
    return null;
  }
};

export const auditMarketingFunnel = async (funnelData: any) => {
  const prompt = `
You are an expert conversion funnel analyst. Analyze funnels and identify specific conversion blockers. Your analysis is direct, data-driven, and ranked by impact.

ANALYZE THIS FUNNEL:

Landing Page: ${funnelData.landingPageUrl || funnelData.landingPage || 'Not provided'}
Middle Steps: ${funnelData.middleStepUrls || 'Not provided'}
Thank You Page: ${funnelData.thankYouPageUrl || 'Not provided'}
Traffic Source: ${funnelData.trafficSource || funnelData.trafficSources || 'Not provided'}
Conversion Goal: ${funnelData.conversionGoal || 'Lead Generation / Sales'}

EVALUATE:

1. LANDING PAGE (rate 1-10 for each):
   - Headline clarity
   - Value prop distinctness
   - CTA visibility/design
   - Form friction (how many fields?)
   - Social proof present?
   - Mobile responsive?

2. FUNNEL FLOW:
   - What are all the steps between landing → conversion?
   - What friction points exist?

3. TOP 3 CONVERSION KILLERS:
   - What kills conversions?
   - Why does it kill conversion?
   - Exact fix
   - Estimated impact %

4. QUICK WINS (3-5 changes this week):
   - Win description
   - Effort (low/medium)
   - Impact potential
   - How to implement

5. TRAFFIC SOURCE FIT:
   - Is this funnel optimized for the traffic source?
   - What messaging gaps exist?

OUTPUT AS JSON ONLY:

{
  "landing_page_scores": {
    "headline_clarity": {"score": 0, "issue": "...", "fix": "..."},
    "value_prop": {"score": 0, "issue": "...", "fix": "..."},
    "cta_button": {"score": 0, "issue": "...", "fix": "..."},
    "form_friction": {"score": 0, "issue": "...", "fix": "..."},
    "social_proof": {"score": 0, "issue": "...", "fix": "..."},
    "mobile_friendly": {"score": 0, "issue": "...", "fix": "..."}
  },
  "funnel_steps": ["step1", "step2", "..."],
  "friction_points": ["friction1", "friction2"],
  "top_killers": [
    {"rank": 1, "problem": "...", "why": "...", "fix": "...", "impact": "X-Y%"},
    {"rank": 2, "problem": "...", "why": "...", "fix": "...", "impact": "X-Y%"},
    {"rank": 3, "problem": "...", "why": "...", "fix": "...", "impact": "X-Y%"}
  ],
  "quick_wins": [
    {"win": "...", "effort": "low/medium", "impact": "X%", "steps": ["..."]},
    {"win": "...", "effort": "low/medium", "impact": "X%", "steps": ["..."]}
  ],
  "traffic_fit": "optimized/partial/generic",
  "priority": "The #1 thing to fix first"
}
  `;

  try {
    const response = await unifiedGenerateContent({
      prompt,
      responseMimeType: "application/json",
    });

    return parseJSON(response.text, {});
  } catch (error) {
    console.error("Funnel Audit Error:", error);
    return null;
  }
};

export const analyzeCompetitorFunnel = async (competitorUrl: string) => {
  const prompt = `
    You are an elite funnel intelligence analyst. Your speciality is reverse-engineering competitor marketing funnels from publicly available signals — social profiles, websites, ad libraries, content patterns, and landing pages. You think like a conversion strategist, media buyer, and copywriter combined.
    When given a competitor's social handle, website URL, or ad library link, you will map their entire funnel, decode their strategy, and extract exactly what is working so the user can apply it to their own business.

    Competitor URL/Handle: ${competitorUrl}

    CRITICAL DIRECTIVES:
    1. EXACT DATA ONLY: Do NOT provide generic placeholders (like "Peak Performance Labs", "Example Corp", or "The Competitor"). Use the REAL name and REAL data found for ${competitorUrl}.
    2. USE TOOLS: Use the 'googleSearch' and 'urlContext' tools to find the competitor's actual website, social media profiles (Instagram, LinkedIn, Twitter), and any public ad library data.
    3. SEARCH FOR:
       - Exact pricing of their offers (e.g., "$997", "$49/mo").
       - Specific hooks and headlines they are currently using in their ads or landing pages.
       - Audience size (follower counts, estimated monthly traffic).
       - Tech stack (e.g., "ClickFunnels", "Shopify", "Kajabi").
    4. NO HALLUCINATIONS: If you cannot find a specific piece of data after searching, state "Data not found" or provide a highly educated inference based on visible signals, but label it as an inference.
    5. THE EDGE: Specifically identify what they are NOT doing (e.g., "No retargeting ads found", "Missing a low-ticket entry point", "Weak email nurture sequence").

    YOUR ANALYSIS FRAMEWORK:
    1. Traffic Sources: Where are they getting their traffic from? Look for signals: are they running paid ads (Meta, TikTok, Google)? Is their content organic-first? Do they rely on SEO, affiliates, partnerships, or direct outreach? What platforms are most active? What is their estimated traffic volume and consistency?
    2. Hook and Content Strategy: What hook style do they use? Examples: pain-agitate-solve, curiosity gap, bold claim, transformation story, social proof lead, controversy, before-and-after. How long is their hook? What emotion does it target — fear, aspiration, frustration, greed, belonging? How frequently do they post? What content format dominates — short video, carousel, long-form, email, ads?
    3. Landing Page Structure: What does their landing page lead with — headline, video, testimonials? Is it a long-form sales letter, VSL page, webinar registration, or, VSL page, webinar registration, or direct offer page? What is the primary CTA? Are there upsells, order bumps, or downsells visible?
    4. Offer and Pricing: What is their core offer and price point? Do they have a free lead magnet or low-ticket tripwire? What is their high-ticket backend offer? What transformation are they selling?
    5. Trust and Social Proof: What proof do they use — testimonials, case studies, logos, before/after, revenue screenshots, media mentions? How prominent is it?
    6. Their Biggest Gap: Based on everything you observe, what is the single biggest strategic gap in their funnel that a competitor could exploit?

    Return ONLY a valid JSON object with this shape:
    {
  "competitorName": "Real name of the competitor",
  "website": "their website URL",
  "primaryPlatform": "main platform they use",
  "followerCount": "estimated followers/audience size",
  "trafficSources": ["organic", "paid ads", "SEO", "etc"],
  "hookStyle": "pain-agitate-solve / curiosity gap / etc",
  "contentFormats": ["short-form video", "carousels", "etc"],
  "postingFrequency": "e.g. 3x/week",
  "coreOffer": "what they sell",
  "pricePoint": "$997 / $49/mo / etc",
  "freeLeadMagnet": "their lead magnet if any",
  "highTicketOffer": "their backend offer if any",
  "landingPageType": "VSL / sales letter / webinar / etc",
  "primaryCTA": "their main call to action",
  "hasUpsell": true,
  "emailMarketing": "Yes / No / Unknown",
  "techStack": ["ClickFunnels", "Shopify", "etc"],
  "trustSignals": ["testimonials", "case studies", "etc"],
  "runningAds": true,
  "adPlatforms": ["Meta", "TikTok", "Google"],
  "biggestGap": "The single biggest strategic gap in their funnel",
  "whatIsWorking": "What is clearly working for them",
  "yourEdge": "How you can beat them based on this analysis"
}`;

  try {
    const response = await unifiedGenerateContent({
      prompt,
      responseMimeType: "application/json",
    });

    return parseJSON(response.text, {});
  } catch (error) {
    console.error("Competitor Funnel Analysis Error:", error);
    return null;
  }
};
