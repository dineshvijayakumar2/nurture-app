import * as React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
    getChild, saveChild,
    getLogs, saveLog,
    getInsights, saveInsight,
    getUserFamilyId, setUserFamilyId,
    clearAllFamilyData,
    getKnowledgeSources, saveKnowledgeSource, deleteKnowledgeSource,
    getActivities, saveActivity,
    getScheduledClasses, saveScheduledClass, deleteScheduledClass, updateScheduledClass,
    updateActivityDate, updateScheduleDay,
    updateChildIcons, migrateLegacyLogs,
    getChatMessages, saveChatMessage
} from '../services/storageService';
import { processLogEntry, generateNeuralReading, generateChatResponse, generateValueDialogue, generateActivityIcon } from '../services/geminiService';
import { ChildProfile, LogEntry, NeuralReading, ChatMessage, Value, ValueDialogue, KnowledgeSource, Activity, ScheduledClass, ActivityCategory, Mood } from '../types';
import { PREDEFINED_ICONS } from '../constants';

// MOCK USER for Demo Mode
const MOCK_DEMO_USER = {
    uid: 'demo-user-123',
    displayName: 'Demo Parent',
    email: 'demo@nurture.app'
} as any;

interface FamilyContextType {
    user: User | null;
    familyId: string | null;
    child: ChildProfile | null;
    logs: LogEntry[];
    readings: NeuralReading[];
    activities: Activity[];
    scheduledClasses: ScheduledClass[];
    knowledge: KnowledgeSource[];
    chatMessages: ChatMessage[]; // New
    isDemoMode: boolean;
    isLoading: boolean;
    authLoading: boolean;

    // Actions
    loginDemo: () => void;
    setChild: (child: ChildProfile) => void;
    saveChildProfile: (profile: ChildProfile) => Promise<void>;
    joinFamily: (fid: string) => Promise<void>;
    addLog: (content: string, image?: string | null, isPrivate?: boolean) => Promise<LogEntry | undefined>;
    addActivity: (name: string, category: ActivityCategory, duration: number, cost: number, mood: Mood, date: string, photo?: string | null) => Promise<void>;
    addSchedule: (name: string, category: ActivityCategory, duration: number, day: number, cost: number, startDate?: string, isRecurring?: boolean, specificDates?: string[]) => Promise<void>;
    updateSchedule: (cls: ScheduledClass) => Promise<void>;
    deleteSchedule: (id: string) => Promise<void>;
    moveClass: (id: string, newDay: number) => Promise<void>; // New
    generateReading: () => Promise<void>;
    sendChatMessage: (text: string, image?: string | null) => Promise<void>; // New
    addKnowledge: (source: Omit<KnowledgeSource, 'id'>) => Promise<void>;
    deleteKnowledge: (id: string) => Promise<void>;
    runMigration: () => Promise<void>;
    wipeData: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const useFamily = () => {
    const context = useContext(FamilyContext);
    if (!context) throw new Error('useFamily must be used within a FamilyProvider');
    return context;
};

export const FamilyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    const [child, setChild] = useState<ChildProfile | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [readings, setReadings] = useState<NeuralReading[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
    const [knowledge, setKnowledge] = useState<KnowledgeSource[]>([]);

    const [isLoading, setIsLoading] = useState(false);

    const cleanKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '_').replace(/\./g, '_');

    const loadFamilyData = useCallback(async (fid: string, uid?: string) => {
        try {
            const storedChild = await getChild(fid);
            const defaultChild: ChildProfile = { id: 'main', familyId: fid, name: 'Child', age: 4, activities: [], temperament: '', activityIcons: {} };
            const fidChild = storedChild || defaultChild;
            if (!storedChild && fid !== 'demo-user-123') await saveChild(fid, fidChild);
            setChild(fidChild);

            console.log("Loading data for Family ID:", fid);
            console.log("Loading data for Family ID:", fid);

            // Load critical data independently to prevent cascade failures
            try {
                const fetchedLogs = await getLogs(fid);
                setLogs(fetchedLogs);
            } catch (e) { console.error("Failed to load logs", e); }

            try {
                const fetchedInsights = await getInsights(fid);
                setReadings((fetchedInsights as any[]).filter(r => r && r.architecture));
            } catch (e) { console.error("Failed to load insights", e); }

            try {
                const fetchedWisdom = await getKnowledgeSources(fid);
                setKnowledge(fetchedWisdom);
            } catch (e) { console.error("Failed to load wisdom", e); }

            try {
                const fetchedActivities = await getActivities(fid);
                setActivities(fetchedActivities);
            } catch (e) { console.error("Failed to load activities", e); }

            try {
                const fetchedSchedule = await getScheduledClasses(fid);
                setScheduledClasses(fetchedSchedule);
            } catch (e) { console.error("Failed to load schedule", e); }

            try {
                // Chats might fail if index is missing, don't block app
                const fetchedChats = await getChatMessages(fid, uid);
                setChatMessages(fetchedChats);
            } catch (e) { console.error("Failed to load chats (likely missing index)", e); }
        } catch (error) { console.error("Error loading family data", error); }
    }, []);

    const initFamilyData = useCallback(async (uid: string) => {
        setIsLoading(true);
        try {
            const fid = await getUserFamilyId(uid);
            setFamilyId(fid);
            await loadFamilyData(fid, uid);
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    }, [loadFamilyData]);

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

    const sendChatMessage = async (text: string, image?: string | null) => {
        if (!child || !familyId || !user) return;
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text,
            timestamp: new Date().toISOString(),
            image: image || undefined,
            userId: user.uid
        };
        setChatMessages(prev => [...prev, userMsg]);
        saveChatMessage(familyId, userMsg);

        try {
            const responseText = await generateChatResponse([...chatMessages, userMsg], child, logs, knowledge);
            const modelMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: responseText,
                timestamp: new Date().toISOString(),
                userId: user.uid
            };
            setChatMessages(prev => [...prev, modelMsg]);
            saveChatMessage(familyId, modelMsg);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser && !isDemoMode) { setUser(currentUser); initFamilyData(currentUser.uid); }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, [isDemoMode, initFamilyData]);

    const loginDemo = () => {
        setIsDemoMode(true);
        setUser(MOCK_DEMO_USER);
        initFamilyData('demo-user-123');
    };

    const saveChildProfile = async (profile: ChildProfile) => {
        if (!familyId) return;
        await saveChild(familyId, profile);
        setChild(profile);
    };

    const joinFamily = async (fid: string) => {
        if (!user) return;
        await setUserFamilyId(user.uid, fid);
        setFamilyId(fid);
        await loadFamilyData(fid, user.uid);
    };

    const addLog = async (content: string, image?: string | null, isPrivate = false) => {
        if (!familyId || !user || !child) return;
        setIsLoading(true);
        try {
            const extracted = await processLogEntry(content, child, image || undefined);
            const newEntry: LogEntry = {
                id: Math.random().toString(36).substr(2, 9),
                authorId: user.uid,
                visibility: isPrivate ? 'private' : 'family',
                timestamp: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                type: image ? 'photo' : 'text',
                content: content || "Captured moment",
                image: image || undefined,
                extracted: extracted as any
            };
            await saveLog(familyId, newEntry);
            setLogs(p => [newEntry, ...p]);
            return newEntry;
        } catch (error) { console.error(error); return undefined; } finally { setIsLoading(false); }
    };

    const addActivity = async (name: string, category: ActivityCategory, duration: number, cost: number, mood: Mood, date: string, photo?: string | null) => {
        if (!familyId || !child) return;
        setIsLoading(true);
        try {
            const sanitizedName = cleanKey(name);
            const activity: Activity = {
                id: Math.random().toString(36).substr(2, 9),
                name, category,
                timestamp: new Date(date).toISOString(),
                durationHours: duration,
                cost, mood,
                iconUrl: child.activityIcons?.[sanitizedName] || '',
                photoUrl: photo || undefined
            };
            await saveActivity(familyId, activity);
            setActivities(p => [activity, ...p]);
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    const addSchedule = async (name: string, category: ActivityCategory, duration: number, day: number, cost: number, startDate?: string, isRecurring: boolean = true, specificDates?: string[]) => {
        if (!familyId || !child) return;
        setIsLoading(true);
        try {
            const sanitizedName = cleanKey(name);
            const newClass: ScheduledClass = {
                id: Math.random().toString(36).substr(2, 9),
                name, category, startTime: "17:00",
                durationHours: duration, isRecurring,
                dayOfWeek: isRecurring ? day : undefined,
                specificDates: isRecurring ? undefined : specificDates,
                cost,
                startDate: startDate || (specificDates?.[0]) || new Date().toISOString().split('T')[0],
                status: 'active'
            };
            await saveScheduledClass(familyId, newClass);
            setScheduledClasses(p => [...p, newClass]);

            let currentIcons = child.activityIcons || {};
            if (!currentIcons[sanitizedName]) {
                const fallbackIcon = PREDEFINED_ICONS[category] || '🌟';
                const newIcons = { ...currentIcons, [sanitizedName]: fallbackIcon };
                await updateChildIcons(familyId, newIcons);
                setChild(prev => prev ? { ...prev, activityIcons: newIcons } : null);
                try {
                    const aiIcon = await generateActivityIcon(name);
                    if (aiIcon) {
                        const finalIcons = { ...newIcons, [sanitizedName]: aiIcon };
                        await updateChildIcons(familyId, finalIcons);
                        setChild(prev => prev ? { ...prev, activityIcons: finalIcons } : null);
                    }
                } catch (e) { console.warn("AI Icon failed"); }
            }
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    const updateSchedule = async (cls: ScheduledClass) => {
        if (!familyId) return;
        setIsLoading(true);
        try {
            await updateScheduledClass(familyId, cls);
            setScheduledClasses(p => p.map(s => s.id === cls.id ? cls : s));
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    const deleteSchedule = async (id: string) => {
        if (!familyId) return;
        if (window.confirm("Remove?")) {
            await deleteScheduledClass(familyId, id);
            setScheduledClasses(p => p.filter(i => i.id !== id));
        }
    };

    const moveClass = async (id: string, newDay: number) => {
        if (!familyId) return;
        // Optimistic update
        setScheduledClasses(prev => prev.map(c => c.id === id ? { ...c, dayOfWeek: newDay } : c));
        await updateScheduleDay(familyId, id, newDay);
    };

    const generateReading = async () => {
        if (!familyId || !child) return;
        setIsLoading(true);
        const r = await generateNeuralReading(logs, child, knowledge);
        await saveInsight(familyId, r);
        setReadings(p => [r, ...p]);
        setIsLoading(false);
    };

    const addKnowledge = async (source: Omit<KnowledgeSource, 'id'>) => {
        if (!familyId) return;
        setIsLoading(true);
        try {
            const newSource: KnowledgeSource = {
                ...source,
                id: Math.random().toString(36).substr(2, 9)
            };
            await saveKnowledgeSource(familyId, newSource);
            setKnowledge(p => [...p, newSource]);
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    const deleteKnowledge = async (id: string) => {
        if (!familyId) return;
        setIsLoading(true);
        try {
            await deleteKnowledgeSource(familyId, id);
            setKnowledge(p => p.filter(s => s.id !== id));
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    const runMigration = async () => {
        if (!familyId || !user) return;
        if (window.confirm("Migrate legacy logs to your account?")) {
            await migrateLegacyLogs(familyId, user.uid);
            window.location.reload();
        }
    };

    const wipeData = async () => {
        if (!familyId) return;
        if (window.confirm("CRITICAL: Wipe data?")) {
            await clearAllFamilyData(familyId);
            window.location.reload();
        }
    };

    return (
        <FamilyContext.Provider value={{
            user, familyId, child, logs, readings, activities, scheduledClasses, knowledge, chatMessages,
            isDemoMode, isLoading, authLoading,
            loginDemo, setChild, saveChildProfile, joinFamily,
            addLog, addActivity, addSchedule, updateSchedule, deleteSchedule, moveClass,
            generateReading, sendChatMessage, addKnowledge, deleteKnowledge, runMigration, wipeData
        }}>
            {children}
        </FamilyContext.Provider>
    );
};
