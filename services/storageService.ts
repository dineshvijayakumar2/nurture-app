
import * as firestore from 'firebase/firestore';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  addDoc,
  deleteDoc,
  writeBatch,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { LogEntry, NeuralReading, ChildProfile, ParentProfile, KnowledgeSource, Activity, ScheduledClass, ChatMessage } from "../types";

// Demo mode removed - all operations now go through Firebase
const IS_DEMO = (id: string) => false;

/**
 * Robust deep cloning and sanitization for Firestore.
 * 1. Removes undefined/functions/non-serializables.
 * 2. Replaces dots in keys (strictly forbidden by Firestore in maps).
 * 3. Handles nested structures recursively.
 */
export const deepSanitize = (data: any): any => {
  if (data === null || typeof data !== 'object') {
    return data === undefined ? null : data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => deepSanitize(item)).filter(i => i !== undefined);
  }

  // Handle standard objects
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || typeof value === 'function') continue;

    // Firestore map keys cannot contain dots or special path chars
    const cleanKey = key.trim().replace(/\./g, '_').replace(/[\/\[\]\*\?]/g, '-');
    const sanitizedValue = deepSanitize(value);

    if (sanitizedValue !== undefined) {
      sanitized[cleanKey] = sanitizedValue;
    }
  }

  // Final safety: ensure it's a plain JS object via stringify/parse to strip any Proxy artifacts
  try {
    return JSON.parse(JSON.stringify(sanitized));
  } catch (e) {
    return sanitized;
  }
};

export const getUserFamilyId = async (userId: string): Promise<string> => {

  if (IS_DEMO(userId)) {
    return userId;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", userId));

    if (userDoc.exists()) {
      const data = userDoc.data();

      if (data.familyId) {
        return data.familyId;
      }
    }

    // No familyId found, create new one
    const defaultFamilyId = userId;
    await setDoc(doc(db, "users", userId), { familyId: defaultFamilyId }, { merge: true });
    return defaultFamilyId;
  } catch (error) {
    return userId;
  }
};

export const setUserFamilyId = async (userId: string, familyId: string) => {
  if (IS_DEMO(userId)) return;
  await setDoc(doc(db, "users", userId), { familyId }, { merge: true });
};

export const saveChild = async (familyId: string, child: ChildProfile) => {
  if (IS_DEMO(familyId)) return;
  const cleaned = deepSanitize(child);
  await setDoc(doc(db, "families", familyId, "profiles", "main"), cleaned);
};

export const updateChildIcons = async (familyId: string, icons: Record<string, string>) => {
  if (IS_DEMO(familyId)) return;
  const docRef = doc(db, "families", familyId, "profiles", "main");
  const cleanedIcons = deepSanitize(icons);
  await updateDoc(docRef, { activityIcons: cleanedIcons });
};

export const getChild = async (familyId: string): Promise<ChildProfile | null> => {
  if (IS_DEMO(familyId)) return null;
  const docRef = doc(db, "families", familyId, "profiles", "main");
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return docSnap.data() as ChildProfile;
};

export const updateActivityDate = async (familyId: string, activityId: string, newDate: string) => {
  if (IS_DEMO(familyId)) return;
  const docRef = doc(db, "families", familyId, "activities", activityId);
  await updateDoc(docRef, { timestamp: new Date(newDate).toISOString() });
};

export const updateScheduleDay = async (familyId: string, scheduleId: string, newDay: number) => {
  if (IS_DEMO(familyId)) return;
  const docRef = doc(db, "families", familyId, "schedule", scheduleId);
  await updateDoc(docRef, { dayOfWeek: newDay });
};

export const saveKnowledgeSource = async (familyId: string, source: KnowledgeSource) => {
  if (IS_DEMO(familyId)) return;

  // Exclude 'id' from the data payload - Firestore document ID is separate
  const { id, ...dataWithoutId } = source;

  // If source has an id, update it; otherwise add new
  if (id) {
    const docRef = doc(db, "families", familyId, "knowledge", id);
    await setDoc(docRef, deepSanitize(dataWithoutId), { merge: true });
  } else {
    await addDoc(collection(db, "families", familyId, "knowledge"), deepSanitize(dataWithoutId));
  }
};

export const getKnowledgeSources = async (familyId: string): Promise<KnowledgeSource[]> => {
  if (IS_DEMO(familyId)) return [];
  const q = query(collection(db, "families", familyId, "knowledge"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    // Use Firestore's document ID, not the id field in the data (if it exists)
    const { id: _, ...rest } = data; // Exclude id from data
    return { id: doc.id, ...rest } as KnowledgeSource;
  });
};

export const deleteKnowledgeSource = async (familyId: string, sourceId: string) => {

  if (IS_DEMO(familyId)) {
    return;
  }

  try {
    const docPath = `families/${familyId}/knowledge/${sourceId}`;

    const docRef = doc(db, "families", familyId, "knowledge", sourceId);

    // Check if document exists before deleting
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Document ${sourceId} not found in Firestore`);
    }

    await deleteDoc(docRef);

    // Verify deletion
    const verifySnap = await getDoc(docRef);

    if (verifySnap.exists()) {
      throw new Error('Document deletion failed - document still exists');
    }

  } catch (error) {
    throw error; // Re-throw to propagate to caller
  }
};

export const saveActivity = async (familyId: string, activity: Activity) => {
  if (IS_DEMO(familyId)) return;
  await addDoc(collection(db, "families", familyId, "activities"), deepSanitize(activity));
};

export const getActivities = async (familyId: string): Promise<Activity[]> => {
  if (IS_DEMO(familyId)) return [];
  const q = query(collection(db, "families", familyId, "activities"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activity));
};

export const saveScheduledClass = async (familyId: string, cls: ScheduledClass) => {
  if (IS_DEMO(familyId)) return;

  // Exclude 'id' from the data payload - Firestore document ID is separate
  const { id, ...dataWithoutId } = cls;

  const docRef = doc(db, "families", familyId, "schedule", id);
  await setDoc(docRef, deepSanitize(dataWithoutId));
};

export const getScheduledClasses = async (familyId: string): Promise<ScheduledClass[]> => {
  if (IS_DEMO(familyId)) return [];
  const querySnapshot = await getDocs(collection(db, "families", familyId, "schedule"));
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    // Use Firestore's document ID, not the id field in the data (if it exists)
    const { id: _, ...rest } = data; // Exclude id from data
    return { id: doc.id, ...rest } as ScheduledClass;
  });
};

export const updateScheduledClass = async (familyId: string, cls: ScheduledClass) => {
  if (IS_DEMO(familyId)) return;

  // Exclude 'id' from the data payload - Firestore document ID is separate
  const { id, ...dataWithoutId } = cls;

  const docRef = doc(db, "families", familyId, "schedule", id);
  await setDoc(docRef, deepSanitize(dataWithoutId), { merge: true });
};

export const deleteScheduledClass = async (familyId: string, classId: string) => {

  if (IS_DEMO(familyId)) {
    return;
  }

  try {
    const docPath = `families/${familyId}/schedule/${classId}`;

    const docRef = doc(db, "families", familyId, "schedule", classId);

    // Check if document exists before deleting
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`Document ${classId} not found in Firestore`);
    }

    await deleteDoc(docRef);

    // Verify deletion
    const verifySnap = await getDoc(docRef);

    if (verifySnap.exists()) {
      throw new Error('Document deletion failed - document still exists');
    }

  } catch (error) {
    throw error; // Re-throw to propagate to caller
  }
};

export const saveLog = async (familyId: string, log: LogEntry) => {
  if (IS_DEMO(familyId)) return;
  await addDoc(collection(db, "families", familyId, "logs"), deepSanitize({
    ...log,
    timestamp: log.timestamp || new Date().toISOString()
  }));
};

export const getLogs = async (familyId: string): Promise<LogEntry[]> => {
  if (IS_DEMO(familyId)) return [];
  const q = query(collection(db, "families", familyId, "logs"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LogEntry));
};

export const saveInsight = async (familyId: string, insight: NeuralReading) => {
  if (IS_DEMO(familyId)) return;
  await addDoc(collection(db, "families", familyId, "insights"), deepSanitize(insight));
};

export const getInsights = async (familyId: string): Promise<NeuralReading[]> => {
  if (IS_DEMO(familyId)) return [];
  const q = query(collection(db, "families", familyId, "insights"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NeuralReading));
};

export const clearAllFamilyData = async (familyId: string) => {
  if (IS_DEMO(familyId)) return;
  const batch = writeBatch(db);
  const collections = ["logs", "insights", "knowledge", "activities", "schedule"];
  for (const col of collections) {
    const snap = await getDocs(collection(db, "families", familyId, col));
    snap.forEach(d => batch.delete(d.ref));
  }
  batch.delete(doc(db, "families", familyId, "profiles", "main"));
  await batch.commit();
};
export const migrateLegacyLogs = async (familyId: string, userId: string) => {
  if (IS_DEMO(familyId)) return;
  const q = query(collection(db, "families", familyId, "logs"));
  const querySnapshot = await getDocs(q);
  const batch = writeBatch(db);
  let count = 0;

  querySnapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.authorId || !data.visibility) {
      batch.update(docSnap.ref, {
        authorId: userId,
        visibility: 'family'
      });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
  } else {
  }
  return count;
};

export const saveChatMessage = async (familyId: string, message: ChatMessage) => {
  if (IS_DEMO(familyId)) return;
  await addDoc(collection(db, "families", familyId, "chats"), deepSanitize(message));
};

export const getChatMessages = async (familyId: string, userId?: string): Promise<ChatMessage[]> => {
  if (IS_DEMO(familyId)) return [];

  let q;
  if (userId) {
    q = query(
      collection(db, "families", familyId, "chats"),
      where("userId", "==", userId),
      orderBy("timestamp", "asc")
    );
  } else {
    q = query(collection(db, "families", familyId, "chats"), orderBy("timestamp", "asc"));
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
};

// Parent Profile Management
export const saveParentProfile = async (familyId: string, profile: ParentProfile) => {
  if (IS_DEMO(familyId)) return;
  const cleaned = deepSanitize(profile);
  await setDoc(doc(db, "families", familyId, "parents", profile.id), cleaned);
};

export const getParentProfile = async (familyId: string, userId: string): Promise<ParentProfile | null> => {
  if (IS_DEMO(familyId)) return null;
  const docRef = doc(db, "families", familyId, "parents", userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return docSnap.data() as ParentProfile;
};

export const getFamilyParents = async (familyId: string): Promise<ParentProfile[]> => {
  if (IS_DEMO(familyId)) return [];
  const querySnapshot = await getDocs(collection(db, "families", familyId, "parents"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ParentProfile));
};

export const deleteParentProfile = async (familyId: string, userId: string) => {
  if (IS_DEMO(familyId)) return;
  await deleteDoc(doc(db, "families", familyId, "parents", userId));
};

export const clearUserFamilyId = async (userId: string) => {
  await setDoc(doc(db, "users", userId), { familyId: null }, { merge: true });
};
