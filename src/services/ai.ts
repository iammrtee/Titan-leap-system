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

export const auditLandingPage = async (url: string) => {
  const prompt = `
    Analyze this landing page URL: "${url}".
    Provide a growth audit including:
    1. A health score (0-100).
    2. 3 specific improvements.
    3. Estimated revenue gain if fixed.
    Format the output as JSON with 'score', 'improvements' (array), and 'revenueGain' (string).
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
