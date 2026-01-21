import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { LogEntry, ChildProfile, InsightCard, Domain, Value, MediaGuide } from "../types";

/**
 * Processes a parent observation, optionally with an image, to extract developmental insights.
 * Uses gemini-3-flash-preview for efficient text and image extraction.
 */
export const processLogEntry = async (
  input: string,
  child: ChildProfile,
  imageData?: string
): Promise<Partial<LogEntry['extracted']>> => {
  // Always create a new GoogleGenAI instance right before making an API call to ensure current credentials.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [{ text: `PARENT OBSERVATION: "${input}"` }];

  if (imageData) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageData.split(',')[1] || imageData
      }
    });
  }

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      systemInstruction: `You are an expert child development specialist. Analyze a parent's observation of ${child.name} (age ${child.age}, activities: ${child.activities.join(', ')}). Extract structured metadata about the child's mood, activities, and developmental domains.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          moodScore: { type: Type.NUMBER, description: "1-10 scale" },
          moodLabels: { type: Type.ARRAY, items: { type: Type.STRING } },
          activities: { type: Type.ARRAY, items: { type: Type.STRING } },
          behavioralFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
          domains: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING }
        },
        required: ["moodScore", "moodLabels", "summary", "domains"]
      }
    }
  });

  // Directly access the .text property from the GenerateContentResponse object.
  const text = response.text || "{}";
  return JSON.parse(text.trim());
};

/**
 * Generates a deep research-backed insight card based on recent logs using complex reasoning.
 * Uses gemini-3-pro-preview for advanced developmental psychology analysis.
 */
export const generateInsightCard = async (
  logs: LogEntry[],
  child: ChildProfile
): Promise<InsightCard> => {
  // Always create a new GoogleGenAI instance right before making an API call.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `CHILD OBSERVATION LOGS: ${JSON.stringify(logs.slice(-5))}`,
    config: {
      systemInstruction: `You are a world-class developmental psychologist. Identify a developmental pattern in the logs for ${child.name} (age ${child.age}), connect it to research (e.g., Carol Dweck's Growth Mindset, Dan Siegel's Whole-Brain Child), and provide actionable parenting steps.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          observation: { type: Type.STRING },
          researchInsight: { type: Type.STRING },
          citation: {
            type: Type.OBJECT,
            properties: {
              source: { type: Type.STRING },
              author: { type: Type.STRING },
              page: { type: Type.STRING }
            }
          },
          actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
          conversationStarter: { type: Type.STRING },
          values: { type: Type.ARRAY, items: { type: Type.STRING } },
          priority: { type: Type.STRING }
        },
        required: ["title", "observation", "researchInsight", "citation", "actionItems", "conversationStarter", "values", "priority"]
      }
    }
  });

  // Directly access the .text property from the GenerateContentResponse object.
  const text = response.text || "{}";
  const raw = JSON.parse(text.trim());
  return {
    ...raw,
    id: Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString()
  };
};

/**
 * Generates a discussion guide for media consumption (books, movies).
 * Uses gemini-3-flash-preview for quick content summarization and question generation.
 */
export const generateMediaGuide = async (
  mediaTitle: string,
  child: ChildProfile
): Promise<MediaGuide> => {
  // Always create a new GoogleGenAI instance right before making an API call.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `MEDIA TITLE: "${mediaTitle}"`,
    config: {
      systemInstruction: `You are a parenting coach. Generate a discussion guide for the specified book or movie for ${child.name} (age ${child.age}). Relate the content to these values: ${Object.values(Value).join(', ')}.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          themes: { type: Type.ARRAY, items: { type: Type.STRING } },
          questions: { type: Type.ARRAY, items: { type: Type.STRING } },
          realLifeConnection: { type: Type.STRING }
        },
        required: ["title", "themes", "questions", "realLifeConnection"]
      }
    }
  });
  
  // Directly access the .text property from the GenerateContentResponse object.
  const text = response.text || "{}";
  return JSON.parse(text.trim());
};