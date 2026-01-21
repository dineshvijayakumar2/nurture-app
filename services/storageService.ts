
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  addDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { LogEntry, InsightCard, ChildProfile } from "../types";

export const saveChild = async (userId: string, child: ChildProfile) => {
  await setDoc(doc(db, "users", userId, "profiles", child.id), child);
};

export const getChild = async (userId: string): Promise<ChildProfile | null> => {
  const q = query(collection(db, "users", userId, "profiles"), limit(1));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return null;
  return querySnapshot.docs[0].data() as ChildProfile;
};

export const saveLog = async (userId: string, log: LogEntry) => {
  // We explicitly do NOT store the raw image/audio media files in Firebase Storage or Firestore
  // We only store the textual metadata and AI-extracted insights to save space and privacy
  const { image, ...logDataToStore } = log; 
  await addDoc(collection(db, "users", userId, "logs"), {
    ...logDataToStore,
    hasImageAttachment: !!image // Just a flag that an image was processed
  });
};

export const getLogs = async (userId: string): Promise<LogEntry[]> => {
  const q = query(collection(db, "users", userId, "logs"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as LogEntry);
};

export const saveInsight = async (userId: string, insight: InsightCard) => {
  await addDoc(collection(db, "users", userId, "insights"), insight);
};

export const getInsights = async (userId: string): Promise<InsightCard[]> => {
  const q = query(collection(db, "users", userId, "insights"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as InsightCard);
};
