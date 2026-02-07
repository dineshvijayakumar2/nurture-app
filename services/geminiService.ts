
import { GoogleGenAI, Type } from "@google/genai";
import { LogEntry, ChildProfile, NeuralReading, ChatMessage, Activity, ActivityCategory, KnowledgeSource, Value, ValueDialogue } from "../types";

const aiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const formatKnowledgeBase = (sources: KnowledgeSource[]) => {
  if (!sources.length) return "";
  return `FAMILY WISDOM BASE (Prioritize these concepts):
  ${sources.map(s => `[Source: ${s.title}] ${s.content}`).join('\n\n')}`;
};

export const processLogEntry = async (
  input: string,
  child: ChildProfile,
  imageData?: string
): Promise<Partial<LogEntry['extracted']>> => {
  const ai = aiClient();
  const parts: any[] = [{ text: `PARENT OBSERVATION: "${input}"` }];
  if (imageData) {
    parts.push({
      inlineData: { mimeType: "image/jpeg", data: imageData.split(',')[1] || imageData }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      systemInstruction: `Analyze ${child.name}'s moment (age ${child.age}). 
      Identify mood, activity, and growth domain.
      CRITICAL: If the parent mentions a class, sport, movie, or specific practice, extract structured 'activityData'.
      Output in JSON.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          moodScore: { type: Type.NUMBER },
          moodLabels: { type: Type.ARRAY, items: { type: Type.STRING } },
          activities: { type: Type.ARRAY, items: { type: Type.STRING } },
          behavioralFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
          domains: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING },
          activityData: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              durationHours: { type: Type.NUMBER }
            }
          }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const generateActivityIcon = async (activityName: string): Promise<string> => {
  const ai = aiClient();
  const prompt = `A soft sticker icon of ${activityName}. Minimalist, whimsical watercolor style, pure white background.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  return "";
};

export const generateNeuralReading = async (
  logs: LogEntry[],
  child: ChildProfile,
  knowledge: KnowledgeSource[] = []
): Promise<NeuralReading> => {
  const ai = aiClient();
  const kb = formatKnowledgeBase(knowledge);
  
  const dietInfo = child.dietaryPreferences 
    ? `DIET: ${child.dietaryPreferences.type}, ALLERGIES: ${child.dietaryPreferences.allergies.join(', ')}`
    : "DIET: Standard";

  const activitySummary = logs
    .filter(l => l.extracted.activityData)
    .map(l => `${l.extracted.activityData?.name}: ${l.extracted.activityData?.durationHours}hrs`)
    .join('; ');

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `HISTORY: ${JSON.stringify(logs)}\nACTIVITY: ${activitySummary}\n${dietInfo}\n${kb}`,
    config: {
      systemInstruction: `You are Nurture, a child development and nutrition expert. 
      Analyze ${child.name}'s week.
      1. Growth Architecture: Define the phase.
      2. Neural Reading: The story.
      3. Nutrition Advice: Provide 3 specific food recommendations tailored to their activity level (e.g., higher carb/protein for sports weeks) and dietary constraints. Avoid allergens.
      4. Science: The 'why' behind the growth.
      Format in JSON.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          architecture: { type: Type.STRING },
          currentReading: { type: Type.STRING },
          scienceBackground: { type: Type.STRING },
          forecast: { type: Type.STRING },
          milestoneWindow: { type: Type.STRING },
          citations: { type: Type.ARRAY, items: { type: Type.STRING } },
          activityTrends: { type: Type.STRING },
          nutritionAdvice: { type: Type.STRING }
        }
      }
    }
  });

  const raw = JSON.parse(response.text || "{}");
  return {
    ...raw,
    id: Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString()
  };
};

export const generateChatResponse = async (
  history: ChatMessage[],
  child: ChildProfile,
  logs: LogEntry[],
  knowledge: KnowledgeSource[] = [],
  newImageData?: string
): Promise<string> => {
  const ai = aiClient();
  const kb = formatKnowledgeBase(knowledge);
  const historyParts = history.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
  
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: [...historyParts, { role: 'user', parts: [{ text: `CONTEXT: ${child.name} (${child.age}). ${kb}` }]}],
    config: {
      systemInstruction: `You are the Nurture Companion. Ground advice in child development science and provided family wisdom. Be warm and supportive.`
    }
  });
  return response.text || "I'm processing that. Tell me more?";
};

export const generateValueDialogue = async (value: Value, child: ChildProfile, logs: LogEntry[], knowledge: KnowledgeSource[] = []): Promise<ValueDialogue> => {
  const ai = aiClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Value: ${value}.\nChild: ${child.name}`,
    config: {
      systemInstruction: `Generate a value dialogue guide in JSON.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          value: { type: Type.STRING },
          philosophicalRoot: { type: Type.STRING },
          contextualScenario: { type: Type.STRING },
          conversationStarters: { type: Type.ARRAY, items: { type: Type.STRING } },
          teachingMoments: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      }
    }
  });
  return JSON.parse(response.text || "{}") as ValueDialogue;
};
