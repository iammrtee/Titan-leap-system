import { GoogleGenAI } from "@google/genai";
import { TITANLEAP_SYSTEM_PROMPT } from '../prompt';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateContentWithRetry = async (params: any, maxRetries = 3) => {
  let retryCount = 0;
  while (retryCount <= maxRetries) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const errorString = typeof error === 'object' ? JSON.stringify(error) : String(error);
      const errorMessage = error?.message || error?.error?.message || errorString;
      const errorStatus = error?.status || error?.code || error?.error?.code || error?.error?.status;
      
      const isOverloaded = 
        errorStatus === 503 || 
        errorStatus === 502 ||
        errorStatus === 429 || 
        errorStatus === 'UNAVAILABLE' ||
        errorMessage.includes('503') || 
        errorMessage.includes('502') ||
        errorMessage.includes('429') || 
        errorMessage.includes('Bad Gateway') ||
        errorMessage.includes('high demand') ||
        errorMessage.includes('UNAVAILABLE') ||
        errorString.includes('503') ||
        errorString.includes('502') ||
        errorString.includes('Bad Gateway') ||
        errorString.includes('high demand');
      
      if (isOverloaded && retryCount < maxRetries) {
        retryCount++;
        const delay = 1000 * Math.pow(2, retryCount); // 2s, 4s, 8s
        console.warn(`Gemini API overloaded. Retrying in ${delay}ms... (Attempt ${retryCount} of ${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries reached");
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
    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
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
    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }, { urlContext: {} }],
        toolConfig: { includeServerSideToolInvocations: true }
      }
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
═══════════════════════════════════════════════════════════════
FORM SUBMISSION DATA
═══════════════════════════════════════════════════════════════

BUSINESS BASICS:
Business Name: ${formData.businessName}
Industry: ${formData.industry}
Website URL: ${formData.websiteUrl}
Duration: ${formData.businessDuration}

SOCIAL MEDIA:
Primary Platform: ${formData.primaryPlatform}
Social Handle(s): ${formData.socialHandles?.join(', ')}
Average Monthly Reach: ${formData.monthlyReach}
Posting Consistency: ${formData.postingConsistently}

OFFER:
Main Product/Service: ${formData.mainOffer}
Price Point: ${formData.currency} ${formData.pricePoint}
Pricing Page URL: ${formData.pricingPageUrl}
Upsell/Downsell: ${formData.hasUpsell ? 'Yes - ' + formData.upsellDetails : 'No'}
Competitive Difference: ${formData.differentiator}
Current Conversion Rate: ${formData.conversionRate}%

REVENUE & GOALS:
Current Monthly Revenue: $${formData.currentRevenue}
Target Monthly Revenue: $${formData.targetRevenue}
Timeline to Target: ${formData.timeline}
Biggest Challenge: ${formData.challenges?.join(', ')}

FUNNEL:
Landing Page: ${formData.hasLandingPage ? formData.landingPageUrl : 'No'}
Thank You Page: ${formData.hasThankYouPage ? formData.thankYouPageUrl : 'No'}
Email Sequence: ${formData.emailSequence}
Tools Used: ${formData.tools?.join(', ')}

CONTENT & ADS:
Running Paid Ads: ${formData.runningAds ? 'Yes - ' + formData.adPlatform + ' ($' + formData.adSpend + '/mo)' : 'No'}
Existing Content Scripts: ${formData.hasScripts ? 'Yes' : 'No'}
Content Types: ${formData.contentTypes?.join(', ')}

═══════════════════════════════════════════════════════════════

Generate a comprehensive growth audit based on the TitanLeap monetization framework.
You MUST output valid JSON matching this exact structure:
{
  "revenueGap": number (estimated monthly revenue gap in dollars),
  "executiveOffer": {
    "tldr": string (One-sentence diagnosis -> fix -> outcome),
    "recommendedPackage": string (e.g., "Launch Accelerator", "Scaling System")
  },
  "issues": [
    {
      "id": string (unique identifier),
      "area": string (e.g., "Landing Page", "Offer", "Email Sequence", "Ads"),
      "problem": string (detailed description of the leakage point),
      "impact": number (estimated revenue impact in dollars),
      "action": string (actionable recommendation to fix it),
      "priority": string ("Critical", "Improve", or "Optimise"),
      "status": string ("critical", "improve", or "optimise"),
      "implementationTime": string (e.g., "2 weeks"),
      "effortLevel": string ("Low", "Medium", "High"),
      "whyItMatters": string (Quantify the loss),
      "serviceHint": string (Optional hint at your service)
    }
  ],
  "quickWin": {
    "title": string (e.g., "30-DAY QUICK WIN (Creative + Ads Only)"),
    "description": string,
    "whatWeDo": [string],
    "whatYouDo": [string],
    "expectedOutcome": [string],
    "timeline": string,
    "cost": string,
    "roi": string
  },
  "caseStudy": {
    "company": string,
    "startingPoint": string,
    "theFix": [string],
    "results": [string],
    "keyInsight": string
  },
  "implementationTiers": [
    {
      "name": string,
      "price": string,
      "description": string,
      "features": [string]
    }
  ]
}
  `;

  try {
    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: TITANLEAP_SYSTEM_PROMPT,
        temperature: 0.7,
        responseMimeType: "application/json",
      }
    });

    return parseJSON(response.text, { revenueGap: 0, issues: [] });
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
    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview", // Use flash to avoid rate limits
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return parseJSON(response.text, {});
  } catch (error) {
    console.error("AI Plan Error:", error);
    throw error;
  }
};

export const smartFillForm = async (url: string) => {
  const prompt = `
    Analyze the website: ${url}.
    Extract detailed business information for a growth audit.
    
    Specific Instructions:
    1. Look for social media links (Instagram, LinkedIn, Twitter, TikTok, YouTube) specifically in the FOOTER of the website.
    2. Look for the primary product/service offers, usually found on a "Pricing" or "Services" page.
    3. Extract the price points in USD. If multiple tiers exist, provide the most popular or mid-tier price.
    4. Calculate potential monthly revenue based on the pricing found.
    5. Assume the business goal is to acquire 5 to 10 new clients per month. Calculate 'targetRevenue' as (Price Point * 10).
    
    Provide:
    1. businessName (The official name of the business)
    2. industry (Choose from: B2B SaaS, E-commerce, Coaching/Consulting, Agency, Local Business, Other)
    3. primaryPlatform (The main social media platform they focus on)
    4. socialHandles (An array of social media handles or profile URLs found in the footer)
    5. mainOffer (A concise description of their primary offer/product)
    6. pricePoint (The numerical value of their primary offer in USD as a string)
    7. pricingPageUrl (The URL of the pricing or services page where the offer was found)
    8. differentiator (What makes them unique)
    9. currentRevenue (An estimate of their current monthly revenue based on their scale, or '0' if unknown, as a string)
    10. targetRevenue (Calculated as pricePoint * 10, representing the goal of 10 new clients, as a string)
    11. currency (Always set this to 'USD')
    
    Format the output as a JSON object with these keys.
  `;

  try {
    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        tools: [{ urlContext: {} }, { googleSearch: {} }],
      }
    });

    return parseJSON(response.text, {});
  } catch (error) {
    console.error("Smart Fill Error:", error);
    return null;
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
    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
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
    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
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
    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
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
    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
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
    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }, { urlContext: {} }],
      }
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
    const response = await generateContentWithRetry({
      model: "gemini-3.1-pro-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }, { urlContext: {} }],
      }
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
    3. Landing Page Structure: What does their landing page lead with — headline, video, testimonials? Is it a long-form sales letter, VSL page, webinar registration, or simple opt-in? How many fields are in their forms? Is the CTA clear and above the fold? What is the primary conversion goal of the page?
    4. Offer and Pricing: What is their core offer? Is it a low-ticket tripwire, a high-ticket coaching program, a SaaS subscription, or a physical product? What is the price point? Is there a clear value proposition and risk reversal (guarantee)? How do they bundle their products?
    5. Backend and Retention: What happens after the first purchase? Is there an immediate upsell or order bump? Do they have an automated email nurture sequence? How do they handle customer retention and repeat sales? What is their estimated LTV strategy?

    OUTPUT FORMAT:
    Return your analysis as a JSON object with this exact structure:
    {
      "profile": {
        "name": "string",
        "platforms": ["string"],
        "niche": "string",
        "audienceSize": "string",
        "strength": "Weak | Moderate | Strong | Elite"
      },
      "map": [
        {
          "stage": "string (One of the 5 layers above)",
          "platform": "string",
          "strength": "Weak | Moderate | Strong"
        }
      ],
      "deepBreakdown": [
        {
          "stage": "string (One of the 5 layers above)",
          "whatTheyDo": "string",
          "effectiveness": "string",
          "whyItWorks": "string"
        }
      ],
      "dangerousTraits": [
        {
          "trait": "string",
          "detail": "string"
        }
      ],
      "actionPlan": [
        {
          "whatTheyDo": "string",
          "whyItWorks": "string",
          "howToApply": "string",
          "expectedImpact": "string"
        }
      ],
      "competitiveEdge": [
        {
          "gap": "string (What they are NOT doing)",
          "advantage": "string (How you can exploit this to win)",
          "difficulty": "Low | Medium | High"
        }
      ],
      "sources": [
        {
          "title": "string (e.g., 'Official Website', 'Meta Ad Library')",
          "url": "string"
        }
      ]
    }

    Be specific at all times. Never give generic observations. If a signal is unclear, say what you can infer and why.
  `;

  try {
    const response = await generateContentWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      }
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    return parseJSON(response.text);
  } catch (error) {
    console.error("Competitor Analysis Error:", error);
    return null;
  }
};
