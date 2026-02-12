
import { GoogleGenAI, Type } from "@google/genai";
import { Branch } from "../types";

// API key is injected by Vite from GEMINI_API_KEY in .env or .env.local
const getApiKey = () => process.env.GEMINI_API_KEY ?? process.env.API_KEY ?? "";

export type AIAnalysisResult = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  urgentBranch?: string;
};

export const getAIInsights = async (branches: Branch[]): Promise<AIAnalysisResult> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("AI Insights: GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.");
    return {
      summary: "AI report unavailable. Set GEMINI_API_KEY in .env.local.",
      strengths: ["Data currently unavailable"],
      weaknesses: ["Data currently unavailable"],
      recommendations: ["Manually review sales reports.", "Check inventory levels."],
      urgentBranch: "None"
    };
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const isAllBranches = branches.length > 1;
  const promptContext = isAllBranches 
    ? "Analyze the overall performance of ALL restaurant branches combined."
    : `Analyze the performance of the specific branch: ${branches[0]?.name || 'Unknown'}.`;
  
  const prompt = `
    You are a senior restaurant business consultant.
    ${promptContext}
    
    Here is the data in JSON format:
    ${JSON.stringify(branches)}

    Provide a strategic analysis including:
    1. A brief executive summary (max 2 sentences).
    2. 3 Key Strengths.
    3. 3 Key Weaknesses or areas for improvement.
    4. 3 Actionable Recommendations to increase revenue or efficiency.
    ${isAllBranches ? '5. Identify the branch needing most attention (urgentBranch).' : ''}

    Output MUST be valid JSON matching this schema:
    {
      "summary": "string",
      "strengths": ["string", "string", "string"],
      "weaknesses": ["string", "string", "string"],
      "recommendations": ["string", "string", "string"]${isAllBranches ? ',\n      "urgentBranch": "string"' : ''}
    }
  `;

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
            strengths: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            weaknesses: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            recommendations: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            ...(isAllBranches ? { urgentBranch: { type: Type.STRING } } : {})
          },
          required: ["summary", "strengths", "weaknesses", "recommendations"]
        }
      }
    });

    // Directly access the .text property from GenerateContentResponse
    const result = JSON.parse(response.text || '{}') as AIAnalysisResult;
    
    // Ensure arrays have at least 3 items
    return {
      summary: result.summary || "Analysis unavailable.",
      strengths: result.strengths?.slice(0, 3) || ["Data currently unavailable"],
      weaknesses: result.weaknesses?.slice(0, 3) || ["Data currently unavailable"],
      recommendations: result.recommendations?.slice(0, 3) || ["Please try again later"],
      urgentBranch: result.urgentBranch || (isAllBranches ? "None" : undefined)
    };
  } catch (error) {
    console.error("AI Insights Error:", error);
    return {
      summary: "Could not retrieve AI report at this time. Please try again later.",
      strengths: ["Data currently unavailable"],
      weaknesses: ["Data currently unavailable"],
      recommendations: ["Manually review sales reports.", "Check inventory levels."],
      urgentBranch: isAllBranches ? "None" : undefined
    };
  }
};
