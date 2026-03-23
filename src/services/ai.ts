import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateContentScripts = async (handle: string, mode: string) => {
  const prompt = `
    Act as a world-class SaaS growth engineer. 
    Analyze the following social media handle/context: "${handle}" in "${mode}" mode.
    Generate 3 high-performing content scripts (TikTok/Reels style) that would go viral in the SaaS niche.
    Each script should include:
    1. A viral hook.
    2. A brief body outline.
    3. A call to action.
    Format the output as a JSON array of objects with 'title', 'hook', 'body', and 'cta' fields.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("AI Generation Error:", error);
    return [];
  }
};

export const auditLandingPage = async (businessData: any) => {
  const prompt = `
    Act as a world-class growth auditor. 
    Analyze the following business data: ${JSON.stringify(businessData)}.
    Provide a comprehensive growth audit including:
    1. Estimated monthly revenue gap (a dollar amount).
    2. 3-4 specific leakage points (issues).
    For each issue, provide:
    - Area (e.g., Landing Page, Offer, Email Sequence, Ads)
    - Problem description
    - Revenue impact (a dollar amount)
    - Actionable recommendation
    - Priority (Critical, Improve, or Optimise)
    - Status (critical, improve, or optimise)
    Format the output as JSON with 'revenueGap' (number), and 'issues' (array of objects with 'id', 'area', 'problem', 'impact' (number), 'action', 'priority', 'status').
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Audit Error:", error);
    return null;
  }
};

export const generate30DayPlan = async (auditData: any) => {
  const prompt = `
    Based on the following growth audit: ${JSON.stringify(auditData)}.
    Generate a high-impact 30-day content and strategy plan to bridge the revenue gap.
    The plan should be broken down into 4 weeks, with specific daily actions or content themes.
    Format the output as a JSON object with 'weeks' (array of 4 objects, each with 'weekNumber' and 'days' (array of 7 strings)).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Plan Error:", error);
    return null;
  }
};

export const smartFillForm = async (url: string) => {
  const prompt = `
    Analyze the website: ${url}.
    Extract business information for a growth audit.
    Provide:
    1. businessName
    2. industry (Choose from: B2B SaaS, E-commerce, Coaching/Consulting, Agency, Local Business, Other)
    3. primaryPlatform (Choose from: Instagram, TikTok, YouTube, LinkedIn, Twitter-X, Other)
    4. mainOffer (Brief description)
    5. differentiator (What makes them unique)
    Format the output as a JSON object with these keys.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}");
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "[]");
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
    Format the output as a JSON object with 'weeks' (array of 4 objects, each with 'weekNumber' and 'days' (array of 7 strings)).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    return null;
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
    const response = await ai.models.generateContent({
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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Content Ideas Error:", error);
    return [];
  }
};
