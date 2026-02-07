
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

export type ActivityCategory = 'sport' | 'art' | 'media' | 'academic' | 'adhoc' | 'travel';
export type Mood = 'happy' | 'neutral' | 'tired' | 'frustrated' | 'proud' | 'excited';

export interface Activity {
  id: string;
  name: string;
  category: ActivityCategory;
  timestamp: string; // ISO string
  durationHours: number;
  notes?: string;
  cost?: number;
  mood?: Mood;
  iconUrl?: string;
  photoUrl?: string;
}

export interface ScheduledClass {
  id: string;
  name: string;
  category: ActivityCategory;
  startTime: string;
  durationHours: number;
  isRecurring: boolean;
  dayOfWeek?: number; // 0-6
  specificDates?: string[]; // ISO date strings
  cost?: number; // Cost per session

  // New Fields for Advanced Rhythm
  startDate: string; // ISO Date String (YYYY-MM-DD)
  endDate?: string; // ISO Date String (YYYY-MM-DD) or null for ongoing
  status: 'active' | 'paused' | 'discontinued';
}

export interface ChildProfile {
  id: string;
  familyId: string;
  name: string;
  age: number;
  activities: string[];
  temperament: string;
  photoUrl?: string;
  activityIcons?: Record<string, string>;
  dietaryPreferences?: {
    type: 'vegan' | 'vegetarian' | 'omnivore' | 'none';
    allergies: string[];
  };
}

export interface KnowledgeSource {
  id: string;
  title: string;
  content: string;
  author?: string;
  cover?: string;
  type: 'newsletter' | 'book' | 'article' | 'note' | 'video';
  timestamp: string;
  tags?: string[];
}

export interface LogEntry {
  id: string;
  authorId: string;
  visibility: 'family' | 'private';
  timestamp: string;
  createdAt: string;
  type: 'text' | 'photo' | 'activity';
  content: string;
  image?: string;
  extracted: {
    moodScore: number;
    moodLabels: string[];
    activities: string[];
    behavioralFlags: string[];
    domains: Domain[];
    summary: string;
    activityData?: Partial<Activity>;
    scheduleUpdate?: {
      action: 'add' | 'update' | 'stop';
      className: string;
      category?: ActivityCategory;
      dayOfWeek?: number;
      startTime?: string;
      durationHours?: number;
      startDate?: string;
      endDate?: string;
      reason?: string;
    };
  };
}

export interface NeuralReading {
  id: string;
  timestamp: string;
  architecture: string;
  currentReading: string;
  scienceBackground: string;
  forecast: string;
  milestoneWindow: string;
  citations: string[];
  activityTrends?: string;
  nutritionAdvice?: string; // New: AI recommendations based on activity
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  image?: string;
  userId?: string; // New: persisted per user
}

export interface ValueDialogue {
  value: Value;
  philosophicalRoot: string;
  contextualScenario: string;
  conversationStarters: string[];
  teachingMoments: string[];
}
