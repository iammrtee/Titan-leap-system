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
      model: "gemini-2.0-flash-exp",
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
      model: "gemini-2.0-flash-exp",
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
      model: "gemini-2.0-flash-exp",
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
