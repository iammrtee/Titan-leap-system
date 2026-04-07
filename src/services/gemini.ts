import { GoogleGenAI } from "@google/genai";
import { TITANLEAP_SYSTEM_PROMPT } from "../prompt";
import { AuditFormData } from "../types";

export async function generateAuditReport(data: AuditFormData): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `
═══════════════════════════════════════════════════════════════
FORM SUBMISSION DATA
═══════════════════════════════════════════════════════════════

BUSINESS BASICS:
Business Name: ${data.businessName}
Industry: ${data.industry}
Website URL: ${data.websiteUrl}
Duration: ${data.duration}

SOCIAL MEDIA:
Primary Platform: ${data.primaryPlatform}
Social Handle(s): ${data.socialHandles}
Average Monthly Reach: ${data.monthlyReach}
Posting Consistency: ${data.postingConsistency}

OFFER:
Main Product/Service: ${data.mainProduct}
Price Point: $${data.pricePoint}
Pricing Page URL: ${data.pricingUrl}
Upsell/Downsell: ${data.upsellDownsell}
Competitive Difference: ${data.competitiveDifference}
Current Conversion Rate: ${data.conversionRate}%

REVENUE & GOALS:
Current Monthly Revenue: $${data.currentRevenue}
Target Monthly Revenue: $${data.targetRevenue}
Timeline to Target: ${data.timeline}
Biggest Challenge: ${data.biggestChallenge}

FUNNEL:
Landing Page: ${data.landingPage}
Thank You Page: ${data.thankYouPage}
Email Sequence: ${data.emailSequence}
Tools Used: ${data.toolsUsed}

CONTENT & ADS:
Running Paid Ads: ${data.runningAds}
Existing Content Scripts: ${data.existingScripts}
Content Types: ${data.contentTypes}

═══════════════════════════════════════════════════════════════

Generate the complete audit report now using the TitanLeap monetization framework.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: TITANLEAP_SYSTEM_PROMPT,
        temperature: 0.7,
      }
    });

    return response.text || "Failed to generate report. Please try again.";
  } catch (error) {
    console.error("Error generating report:", error);
    throw new Error("Failed to generate report. Check console for details.");
  }
}
