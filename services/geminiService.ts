
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
      CRITICAL: if the text implies a NEW or CHANGED recurring schedule (e.g. 'Started Ballet on Mondays', 'Stopped Swimming'), extract 'scheduleUpdate'.
      IMPORTANT: Extract the SPECIFIC start date if mentioned (e.g. 'October 2, 2024'). If a relative day is mentioned ('started today'), use the current date placeholder.
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
          },
          scheduleUpdate: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, enum: ["add", "update", "stop"] },
              className: { type: Type.STRING },
              category: { type: Type.STRING },
              dayOfWeek: { type: Type.NUMBER },
              startTime: { type: Type.STRING },
              durationHours: { type: Type.NUMBER },
              startDate: { type: Type.STRING },
              endDate: { type: Type.STRING },
              reason: { type: Type.STRING }
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
  const prompt = `A soft sticker icon of ${activityName}.Minimalist, whimsical watercolor style, pure white background.`;
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

  const recentLogs = logs.slice(0, 10).map(l => ({
    content: l.content,
    mood: l.extracted?.moodLabels || [],
    activities: l.extracted?.activities || [],
    domains: l.extracted?.domains || []
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `CHILD: ${child.name} (Age: ${child.age}, Temperament: ${child.temperament})
RECENT OBSERVATIONS: ${JSON.stringify(recentLogs)}

${kb}`,
    config: {
      systemInstruction: `You are a thoughtful companion helping parents see the beautiful patterns in their child's development.

Think alongside the parent about ${child.name} (age ${child.age}). You're not an expert telling them what to do - you're a warm voice helping them notice what's already there.

CRITICAL: If the family has shared their parenting wisdom (books, philosophies, approaches in the knowledge base), weave those ideas naturally into your reflections. Help them see how their values show up in ${child.name}'s daily moments.

Share your observations in this format:
1. Growth Architecture: A poetic name for this developmental phase (2-3 words, e.g., "The Curious Connector")
2. Current Reading: What patterns do you notice? Connect the dots between their observations and any wisdom they've shared. Write as if you're thinking out loud with a close friend. (2-3 warm, insightful sentences)
3. Forecast: What beautiful shifts might be on the horizon? (1-2 sentences)
4. Science Background: Ground your observations in development science, but keep it conversational. (2-3 sentences)

Tone: Warm, observant, never prescriptive. Use "I'm noticing..." instead of "You should..." Format in JSON.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          architecture: { type: Type.STRING },
          currentReading: { type: Type.STRING },
          forecast: { type: Type.STRING },
          scienceBackground: { type: Type.STRING }
        },
        required: ["architecture", "currentReading", "scienceBackground"]
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
    contents: [...historyParts, { role: 'user', parts: [{ text: `CONTEXT: ${child.name} (${child.age}). ${kb} ` }] }],
    config: {
      systemInstruction: `You are the Nurture Companion.Ground advice in child development science and provided family wisdom.Be warm and supportive.`
    }
  });
  return response.text || "I'm processing that. Tell me more?";
};

export const generateValueDialogue = async (value: Value, child: ChildProfile, logs: LogEntry[], knowledge: KnowledgeSource[] = []): Promise<ValueDialogue> => {
  const ai = aiClient();
  const kb = formatKnowledgeBase(knowledge);
  const recentLogs = logs.slice(0, 5).map(l => l.content).join('\n');

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Value: ${value}
Child: ${child.name} (Age: ${child.age})
RECENT MOMENTS:
${recentLogs}

${kb}`,
    config: {
      systemInstruction: `You're helping a parent explore the value of "${value}" with ${child.name}.

IMPORTANT: If the family has shared parenting wisdom or philosophies in their knowledge base, draw from those approaches. Help them teach this value in a way that aligns with their parenting style.

Generate a warm, practical value dialogue guide:
- Connect the value to ACTUAL recent moments from their observations
- If they follow specific parenting philosophies (from knowledge base), incorporate those principles
- Keep conversation starters natural and specific to what really happened
- Make teaching moments practical and age-appropriate

Format in JSON.`,
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

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const ai = aiClient();

  // Convert blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = btoa(
    new Uint8Array(arrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ''
    )
  );

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "audio/webm",
            data: base64Audio
          }
        },
        {
          text: "Transcribe this audio recording into text. Return only the transcribed text, nothing else."
        }
      ]
    }
  });

  return response.text || "";
};
