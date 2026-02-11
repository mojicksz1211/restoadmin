
import { GoogleGenAI, Type } from "@google/genai";
import { Branch } from "../types";

// API key is injected by Vite from GEMINI_API_KEY in .env or .env.local
const getApiKey = () => process.env.GEMINI_API_KEY ?? process.env.API_KEY ?? "";

export const getAIInsights = async (branches: Branch[]): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("AI Insights: GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.");
    return {
      summary: "AI report unavailable. Set GEMINI_API_KEY in .env.local.",
      urgentBranch: "None",
      recommendations: ["Manually review sales reports.", "Check inventory levels."]
    };
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Analyze current restaurant branches data and provide strategic insights in English. 
  Data: ${JSON.stringify(branches)}
  Include:
  1. Overview of performance.
  2. Branch needing most attention.
  3. Actionable steps to increase revenue.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            urgentBranch: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "urgentBranch", "recommendations"]
        }
      }
    });

    // Directly access the .text property from GenerateContentResponse
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Insights Error:", error);
    return {
      summary: "Could not retrieve AI report at this time. Please try again later.",
      urgentBranch: "None",
      recommendations: ["Manually review sales reports.", "Check inventory levels."]
    };
  }
};
