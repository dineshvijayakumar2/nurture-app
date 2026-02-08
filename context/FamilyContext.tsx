import * as React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
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
    getChatMessages, saveChatMessage,
    saveParentProfile, getParentProfile, getFamilyParents, deleteParentProfile, clearUserFamilyId
} from '../services/storageService';
import { processLogEntry, generateNeuralReading, generateChatResponse, generateValueDialogue, generateActivityIcon, transcribeAudio } from '../services/geminiService';
import { ChildProfile, ParentProfile, LogEntry, NeuralReading, ChatMessage, Value, ValueDialogue, KnowledgeSource, Activity, ScheduledClass, ActivityCategory, Mood } from '../types';
import { PREDEFINED_ICONS } from '../constants';

// DEMO USER for Hackathon (uses real family data)
const MOCK_DEMO_USER = {
    uid: 'nKUVUPwhEQOnYH2lhfTIlw71rhT2',
    displayName: 'Dinesh Vijayakumar',
    email: 'dinwin1989@gmail.com'
} as any;

interface FamilyContextType {
    user: User | null;
    familyId: string | null;
    child: ChildProfile | null;
    parents: ParentProfile[];
    logs: LogEntry[];
    readings: NeuralReading[];
    activities: Activity[];
    scheduledClasses: ScheduledClass[];
    knowledge: KnowledgeSource[];
    chatMessages: ChatMessage[];
    isDemoMode: boolean;
    isLoading: boolean;
    authLoading: boolean;

    // Actions
    loginDemo: () => void;
    logout: () => Promise<void>;
    setChild: (child: ChildProfile) => void;
    saveChildProfile: (profile: ChildProfile) => Promise<void>;
    saveParentProfileData: (profile: ParentProfile) => Promise<void>;
    removeParentFromFamily: (userId: string) => Promise<void>;
    leaveFamily: () => Promise<void>;
    joinFamily: (fid: string) => Promise<void>;
    addLog: (content: string, image?: string | null, isPrivate?: boolean) => Promise<LogEntry | undefined>;
    addActivity: (name: string, category: ActivityCategory, duration: number, cost: number, mood: Mood, date: string, photo?: string | null, status?: 'attended' | 'missed' | 'cancelled') => Promise<void>;
    addSchedule: (name: string, category: ActivityCategory, duration: number, day: number | number[], cost: number, startDate?: string, isRecurring?: boolean, specificDates?: string[], startTime?: string, endDate?: string, weekOccurrences?: number[]) => Promise<void>;
    updateSchedule: (cls: ScheduledClass) => Promise<void>;
    deleteSchedule: (id: string) => Promise<void>;
    moveClass: (id: string, newDay: number) => Promise<void>;
    generateReading: () => Promise<void>;
    sendChatMessage: (text: string, image?: string | null) => Promise<void>;
    addKnowledge: (source: Omit<KnowledgeSource, 'id'>) => Promise<void>;
    updateKnowledge: (source: KnowledgeSource) => Promise<void>;
    deleteKnowledge: (id: string) => Promise<void>;
    getParentName: (authorId: string) => string;
    runMigration: () => Promise<void>;
    wipeData: () => Promise<void>;
    transcribeAudio: (audioBlob: Blob) => Promise<string>;
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
    const [parents, setParents] = useState<ParentProfile[]>([]);
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

            try {
                const fetchedParents = await getFamilyParents(fid);
                setParents(fetchedParents);
            } catch (e) { console.error("Failed to load parents", e); }
        } catch (error) { console.error("Error loading family data", error); }
    }, []);

    const initFamilyData = useCallback(async (uid: string) => {
        setIsLoading(true);
        try {
            console.log('🔍 initFamilyData called with uid:', uid);
            const fid = await getUserFamilyId(uid);
            console.log('📌 Got familyId from getUserFamilyId:', fid);
            setFamilyId(fid);
            console.log('✅ Set familyId in state:', fid);
            await loadFamilyData(fid, uid);
            return fid; // Return the familyId for immediate use
        } catch (error) {
            console.error('❌ Error in initFamilyData:', error);
        } finally {
            setIsLoading(false);
        }
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
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            console.log('🔐 Auth state changed:', currentUser ? `User: ${currentUser.uid}` : 'No user');

            if (currentUser && !isDemoMode) {
                setUser(currentUser);

                // Get familyId synchronously from initFamilyData return value
                const fid = await initFamilyData(currentUser.uid);

                console.log('👤 Checking parent profile with familyId:', fid);

                // Auto-create parent profile if not exists (use fid directly, not state)
                if (fid) {
                    const existingProfile = await getParentProfile(fid, currentUser.uid);
                    console.log('Existing parent profile:', existingProfile);

                    if (!existingProfile) {
                        console.log('Creating new parent profile...');
                        const newProfile: ParentProfile = {
                            id: currentUser.uid,
                            name: currentUser.displayName || 'Parent',
                            email: currentUser.email || '',
                            photoUrl: currentUser.photoURL || undefined,
                            role: 'primary'
                        };
                        await saveParentProfile(fid, newProfile);
                        setParents(prev => [...prev, newProfile]);
                        console.log('✅ Parent profile created');
                    }
                }
            } else {
                console.log('⚠️ No current user or in demo mode');
            }

            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, [isDemoMode, initFamilyData]);

    const loginDemo = () => {
        setIsDemoMode(true);
        setUser(MOCK_DEMO_USER);
        initFamilyData('nKUVUPwhEQOnYH2lhfTIlw71rhT2');
    };

    const logout = async () => {
        try {
            // If in demo mode, skip Firebase signOut (demo user is not a real Firebase user)
            if (!isDemoMode) {
                await signOut(auth);
            }

            // Clear local state
            setUser(null);
            setFamilyId(null);
            setChild(null);
            setParents([]);
            setLogs([]);
            setReadings([]);
            setActivities([]);
            setScheduledClasses([]);
            setKnowledge([]);
            setChatMessages([]);
            setIsDemoMode(false);
        } catch (error) {
            console.error('Logout error:', error);
            alert('Failed to log out. Please try again.');
        }
    };

    const saveChildProfile = async (profile: ChildProfile) => {
        if (!familyId) return;
        await saveChild(familyId, profile);
        setChild(profile);
    };

    const saveParentProfileData = async (profile: ParentProfile) => {
        if (!familyId) return;
        await saveParentProfile(familyId, profile);
        setParents(prev => {
            const exists = prev.find(p => p.id === profile.id);
            if (exists) return prev.map(p => p.id === profile.id ? profile : p);
            return [...prev, profile];
        });
    };

    const getParentName = (authorId: string): string => {
        const parent = parents.find(p => p.id === authorId);
        return parent?.name || user?.displayName || 'Family Member';
    };

    const joinFamily = async (fid: string) => {
        if (!user) return;
        await setUserFamilyId(user.uid, fid);
        setFamilyId(fid);
        await loadFamilyData(fid, user.uid);
    };

    const removeParentFromFamily = async (userId: string) => {
        if (!familyId || !user) return;
        // Prevent removing yourself through this function
        if (userId === user.uid) return;
        // Only primary parent can remove others
        const currentParent = parents.find(p => p.id === user.uid);
        if (currentParent?.role !== 'primary') return;

        await deleteParentProfile(familyId, userId);
        await clearUserFamilyId(userId);
        setParents(prev => prev.filter(p => p.id !== userId));
    };

    const leaveFamily = async () => {
        if (!familyId || !user) return;
        await deleteParentProfile(familyId, user.uid);
        await clearUserFamilyId(user.uid);
        setFamilyId(null);
        setChild(null);
        setParents([]);
        setLogs([]);
        setReadings([]);
        setActivities([]);
        setScheduledClasses([]);
        setKnowledge([]);
        setChatMessages([]);
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

    const addActivity = async (name: string, category: ActivityCategory, duration: number, cost: number, mood: Mood, date: string, photo?: string | null, status: 'attended' | 'missed' | 'cancelled' = 'attended') => {
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
                photoUrl: photo || undefined,
                status
            };
            await saveActivity(familyId, activity);
            setActivities(p => [activity, ...p]);
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    const addSchedule = async (name: string, category: ActivityCategory, duration: number, day: number | number[], cost: number, startDate?: string, isRecurring: boolean = true, specificDates?: string[], startTime: string = "09:00", endDate?: string, weekOccurrences?: number[]) => {
        if (!familyId || !child) return;
        setIsLoading(true);
        try {
            const sanitizedName = cleanKey(name);
            // Support both single day and multi-day selection
            const daysArray = Array.isArray(day) ? day : [day];
            const newClass: ScheduledClass = {
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name, category, startTime,
                durationHours: duration, isRecurring,
                dayOfWeek: undefined, // Deprecated - use daysOfWeek
                daysOfWeek: isRecurring ? daysArray : undefined,
                specificDates: isRecurring ? undefined : specificDates,
                cost,
                startDate: startDate || (specificDates?.[0]) || new Date().toISOString().split('T')[0],
                endDate: endDate || undefined,
                status: 'active',
                weekOccurrences: weekOccurrences && weekOccurrences.length > 0 ? weekOccurrences : undefined
            };
            await saveScheduledClass(familyId, newClass);
            setScheduledClasses(prev => [...prev, newClass]);

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
            console.log('Updating schedule:', { familyId, classId: cls.id });
            await updateScheduledClass(familyId, cls);
            // Update local state
            setScheduledClasses(prev => prev.map(s => s.id === cls.id ? cls : s));
            console.log('✅ Schedule updated successfully:', cls.id);
        } catch (error) {
            console.error('❌ Failed to update schedule:', error);
            alert(`Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteSchedule = async (id: string) => {
        console.log('🗑️ deleteSchedule called with:', { id, familyId });

        if (!familyId) {
            console.error('❌ CRITICAL: familyId is null/undefined! Cannot delete schedule.');
            alert('Error: Family ID not set. Please refresh the page and try again.');
            return;
        }

        if (window.confirm("Remove?")) {
            try {
                console.log('Deleting schedule:', { familyId, scheduleId: id });
                await deleteScheduledClass(familyId, id);
                // Update local state
                setScheduledClasses(prev => prev.filter(i => i.id !== id));
                console.log('✅ Schedule deleted successfully:', id);
            } catch (error) {
                console.error('❌ Failed to delete schedule:', error);
                alert(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
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
            // Generate a more unique ID using timestamp + random
            const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newSource: KnowledgeSource = {
                ...source,
                id: uniqueId
            };
            await saveKnowledgeSource(familyId, newSource);
            setKnowledge(prev => [...prev, newSource]);
        } catch (error) { console.error(error); } finally { setIsLoading(false); }
    };

    const updateKnowledge = async (source: KnowledgeSource) => {
        if (!familyId) return;
        setIsLoading(true);
        try {
            console.log('Updating knowledge:', { familyId, sourceId: source.id });
            await saveKnowledgeSource(familyId, source);
            // Update local state
            setKnowledge(prev => prev.map(s => s.id === source.id ? source : s));
            console.log('✅ Knowledge updated successfully:', source.id);
        } catch (error) {
            console.error('❌ Failed to update knowledge:', error);
            alert(`Failed to update wisdom: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteKnowledge = async (id: string) => {
        console.log('🗑️ deleteKnowledge called with:', { id, familyId });

        if (!familyId) {
            console.error('❌ CRITICAL: familyId is null/undefined! Cannot delete knowledge.');
            alert('Error: Family ID not set. Please refresh the page and try again.');
            return;
        }

        setIsLoading(true);
        try {
            console.log('Deleting knowledge:', { familyId, knowledgeId: id });
            await deleteKnowledgeSource(familyId, id);
            // Update local state
            setKnowledge(prev => prev.filter(s => s.id !== id));
            console.log('✅ Knowledge deleted successfully:', id);
        } catch (error) {
            console.error('❌ Failed to delete knowledge:', error);
            alert(`Failed to delete wisdom: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
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
            user, familyId, child, parents, logs, readings, activities, scheduledClasses, knowledge, chatMessages,
            isDemoMode, isLoading, authLoading,
            loginDemo, logout, setChild, saveChildProfile, saveParentProfileData, removeParentFromFamily, leaveFamily, joinFamily,
            addLog, addActivity, addSchedule, updateSchedule, deleteSchedule, moveClass,
            generateReading, sendChatMessage, addKnowledge, updateKnowledge, deleteKnowledge, getParentName, runMigration, wipeData,
            transcribeAudio
        }}>
            {children}
        </FamilyContext.Provider>
    );
};
