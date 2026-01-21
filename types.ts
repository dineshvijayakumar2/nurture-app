
export enum Domain {
  PHYSICAL = 'physical',
  COGNITIVE = 'cognitive',
  EMOTIONAL = 'emotional',
  SOCIAL = 'social',
  VALUES = 'values'
}

export enum Value {
  HONESTY = 'Honesty',
  RESPECT = 'Respect',
  RESILIENCE = 'Resilience',
  EMPATHY = 'Empathy',
  RESPONSIBILITY = 'Responsibility',
  GRATITUDE = 'Gratitude',
  COURAGE = 'Courage',
  KINDNESS = 'Kindness'
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  activities: string[];
  temperament: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'text' | 'voice' | 'photo';
  content: string;
  image?: string; // base64 string
  extracted: {
    moodScore: number;
    moodLabels: string[];
    activities: string[];
    behavioralFlags: string[];
    domains: Domain[];
    summary: string;
  };
}

export interface InsightCard {
  id: string;
  title: string;
  observation: string;
  researchInsight: string;
  citation: {
    source: string;
    author: string;
    page?: string;
  };
  actionItems: string[];
  conversationStarter: string;
  values: Value[];
  priority: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface MediaGuide {
  title: string;
  themes: string[];
  questions: string[];
  realLifeConnection: string;
}
