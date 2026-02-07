
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { auth } from './services/firebase';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { InsightCardView } from './components/InsightCardView';
import { ProfileModal } from './components/ProfileModal';
import { 
  getChild, saveChild, 
  getLogs, saveLog, 
  getInsights, saveInsight,
  getUserFamilyId, setUserFamilyId,
  clearAllFamilyData,
  getKnowledgeSources, saveKnowledgeSource, deleteKnowledgeSource,
  getActivities, saveActivity,
  getScheduledClasses, saveScheduledClass, deleteScheduledClass,
  updateActivityDate, updateScheduleDay,
  updateChildIcons
} from './services/storageService';
import { processLogEntry, generateNeuralReading, generateChatResponse, generateValueDialogue, generateActivityIcon } from './services/geminiService';
import { ChildProfile, LogEntry, NeuralReading, ChatMessage, Value, ValueDialogue, KnowledgeSource, Activity, ScheduledClass, ActivityCategory, Mood } from './types';
import { ICONS, PREDEFINED_ICONS } from './constants';

const MOOD_EMOJIS: Record<Mood, string> = {
  happy: '😊',
  neutral: '😐',
  tired: '😴',
  frustrated: '😤',
  proud: '🤩',
  excited: '🥳'
};

// Fixed: Defined MOCK_DEMO_USER to resolve "Cannot find name" error.
const MOCK_DEMO_USER = {
  uid: 'demo-user-123',
  displayName: 'Demo Parent',
  email: 'demo@nurture.app'
} as any;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('growth');
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [readings, setReadings] = useState<NeuralReading[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeSource[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [journalContent, setJournalContent] = useState('');
  const [journalImage, setJournalImage] = useState<string | null>(null);
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPrivateNote, setIsPrivateNote] = useState(false);

  const [plannerMonth, setPlannerMonth] = useState(new Date());
  const [plannerModal, setPlannerModal] = useState<'none' | 'schedule' | 'log'>('none');

  const [entryName, setEntryName] = useState('');
  const [entryCategory, setEntryCategory] = useState<ActivityCategory>('art');
  const [entryDuration, setEntryDuration] = useState(1);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryDay, setEntryDay] = useState(new Date().getDay());
  const [entryMood, setEntryMood] = useState<Mood>('happy');
  const [entryCost, setEntryCost] = useState<number>(0);
  const [entryPhoto, setEntryPhoto] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSelectedImage, setChatSelectedImage] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<Value | null>(null);
  const [valueDialogue, setValueDialogue] = useState<ValueDialogue | null>(null);
  const [isValueLoading, setIsValueLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatImageRef = useRef<HTMLInputElement>(null);
  const logImageRef = useRef<HTMLInputElement>(null);

  const cleanKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '_').replace(/\./g, '_');

  const loadFamilyData = useCallback(async (fid: string) => {
    try {
      const storedChild = await getChild(fid);
      const defaultChild: ChildProfile = { id: 'main', familyId: fid, name: 'Child', age: 4, activities: [], temperament: '', activityIcons: {} };
      const fidChild = storedChild || defaultChild;
      if (!storedChild && fid !== 'demo-user-123') await saveChild(fid, fidChild);
      setChild(fidChild);

      const [fetchedLogs, fetchedInsights, fetchedWisdom, fetchedActivities, fetchedSchedule] = await Promise.all([
        getLogs(fid), getInsights(fid), getKnowledgeSources(fid), getActivities(fid), getScheduledClasses(fid)
      ]);
      setLogs(fetchedLogs);
      setKnowledge(fetchedWisdom);
      setActivities(fetchedActivities);
      setScheduledClasses(fetchedSchedule);
      setReadings((fetchedInsights as any[]).filter(r => r && r.architecture));
    } catch (error) { console.error("Error loading data", error); }
  }, []);

  const initFamilyData = useCallback(async (uid: string) => {
    setIsLoading(true);
    try {
      const fid = await getUserFamilyId(uid);
      setFamilyId(fid);
      await loadFamilyData(fid);
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  }, [loadFamilyData]);

  const handleSaveSchedule = async () => {
    if (!familyId || !entryName || !child) return;
    setIsLoading(true);
    try {
      const sanitizedName = cleanKey(entryName);
      const newClass: ScheduledClass = {
        id: Math.random().toString(36).substr(2, 9),
        name: entryName,
        category: entryCategory,
        startTime: "17:00",
        durationHours: entryDuration,
        isRecurring: true,
        dayOfWeek: entryDay,
        cost: entryCost
      };
      await saveScheduledClass(familyId, newClass);
      setScheduledClasses(p => [...p, newClass]);
      setPlannerModal('none');
      setEntryName('');

      let currentIcons = child.activityIcons || {};
      if (!currentIcons[sanitizedName]) {
        const fallbackIcon = PREDEFINED_ICONS[entryCategory] || '🌟';
        const newIcons = { ...currentIcons, [sanitizedName]: fallbackIcon };
        await updateChildIcons(familyId, newIcons);
        setChild(prev => prev ? { ...prev, activityIcons: newIcons } : null);
        try {
          const aiIcon = await generateActivityIcon(entryName);
          if (aiIcon) {
            const finalIcons = { ...newIcons, [sanitizedName]: aiIcon };
            await updateChildIcons(familyId, finalIcons);
            setChild(prev => prev ? { ...prev, activityIcons: finalIcons } : null);
          }
        } catch (e) { console.warn("AI Icon failed"); }
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleLogActivity = async () => {
    if (!familyId || !entryName || !child) return;
    setIsLoading(true);
    try {
      const sanitizedName = cleanKey(entryName);
      const activity: Activity = {
        id: Math.random().toString(36).substr(2, 9),
        name: entryName,
        category: entryCategory,
        timestamp: new Date(entryDate).toISOString(),
        durationHours: entryDuration,
        cost: entryCost,
        mood: entryMood,
        iconUrl: child.activityIcons?.[sanitizedName] || '',
        photoUrl: entryPhoto || undefined
      };
      await saveActivity(familyId, activity);
      setActivities(p => [activity, ...p]);
      setPlannerModal('none');
      setEntryName('');
      setEntryPhoto(null);
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleLogMemory = async () => {
    if (!familyId || !child || !user || (!journalContent.trim() && !journalImage)) return;
    setIsLoading(true);
    try {
      const extracted = await processLogEntry(journalContent, child, journalImage || undefined);
      const newEntry: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        authorId: user.uid,
        visibility: isPrivateNote ? 'private' : 'family',
        timestamp: new Date(journalDate).toISOString(),
        createdAt: new Date().toISOString(),
        type: journalImage ? 'photo' : 'text',
        content: journalContent || "Captured moment",
        image: journalImage || undefined,
        extracted: extracted as any
      };
      await saveLog(familyId, newEntry);
      setLogs(p => [newEntry, ...p]);
      setJournalContent('');
      setJournalImage(null);
      setIsPrivateNote(false);
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const handleSendMessage = async () => {
    if ((!chatInput.trim() && !chatSelectedImage) || !child || !familyId) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput, timestamp: new Date().toISOString(), image: chatSelectedImage || undefined };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatSelectedImage(null);
    setIsLoading(true);
    try {
      const responseText = await generateChatResponse([...chatMessages, userMsg], child, logs, knowledge);
      setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: responseText, timestamp: new Date().toISOString() }]);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const calendarDaysOfMonth = useMemo(() => {
    const year = plannerMonth.getFullYear();
    const month = plannerMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  }, [plannerMonth]);

  const getActivityIcon = (name: string, category: string) => {
    const sName = cleanKey(name);
    return child?.activityIcons?.[sName] || PREDEFINED_ICONS[category] || '🌟';
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && !isDemoMode) { setUser(currentUser); initFamilyData(currentUser.uid); }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [isDemoMode, initFamilyData]);

  useEffect(() => {
    if (activeTab === 'coach') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeTab]);

  if (authLoading || (user && !child)) return <div className="min-h-screen bg-[#FFF9E6] flex items-center justify-center animate-pulse text-[#A8C5A8] font-black uppercase tracking-widest">🌱 Nurturing...</div>;
  if (!user) return <Auth onDemoLogin={() => { setIsDemoMode(true); setUser(MOCK_DEMO_USER); initFamilyData('demo-user-123'); }} />;

  const filteredLogs = logs.filter(l => l.visibility === 'family' || l.authorId === user.uid);

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} child={child || {} as any} onProfileClick={() => setIsProfileModalOpen(true)} isProcessing={isLoading}>
      
      {activeTab === 'growth' && (
        <div className="space-y-12 pb-32 animate-in fade-in duration-700">
          <header className="bg-white/90 backdrop-blur-3xl rounded-[48px] p-10 shadow-sm border border-white flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 rounded-[32px] bg-[#A8C5A8] border-[4px] border-white flex items-center justify-center text-white text-4xl font-black shadow-2xl shrink-0 overflow-hidden">
              {child?.photoUrl ? <img src={child.photoUrl} className="w-full h-full object-cover" /> : <span>{child?.name[0]}</span>}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Dashboard</h2>
              <p className="text-xs text-[#A8C5A8] uppercase font-black tracking-[0.3em] mt-2">Evolution & Rhythms</p>
            </div>
            <button onClick={async () => { setIsLoading(true); const r = await generateNeuralReading(logs, child!, knowledge); await saveInsight(familyId!, r); setReadings(p => [r, ...p]); setIsLoading(false); }} className="px-8 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all">
              <ICONS.Sparkles className="w-5 h-5" /> Sync Intelligence
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-white rounded-[56px] p-10 shadow-xl border border-white">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 mb-8 flex items-center gap-2"><ICONS.Calendar className="w-4 h-4" /> This Month</h3>
              <div className="grid grid-cols-7 gap-3">
                {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center text-[9px] font-black text-slate-300">{d}</div>)}
                {calendarDaysOfMonth.map((date, idx) => {
                  if (!date) return <div key={idx}></div>;
                  const isToday = date.toDateString() === new Date().toDateString();
                  const dayItems = activities.some(a => new Date(a.timestamp).toDateString() === date.toDateString());
                  return (
                    <div key={idx} className={`aspect-square rounded-xl flex items-center justify-center text-xs font-black transition-all ${isToday ? 'bg-slate-900 text-white shadow-lg' : dayItems ? 'bg-[#A8C5A8]/20 text-slate-900' : 'bg-slate-50 text-slate-300'}`}>
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-[56px] p-10 shadow-xl border border-white space-y-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2 flex items-center gap-2"><ICONS.Timeline className="w-4 h-4" /> Current Classes</h3>
              {scheduledClasses.map(s => (
                <div key={s.id} className="flex items-center gap-5 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="text-3xl">{getActivityIcon(s.name, s.category).length < 10 ? getActivityIcon(s.name, s.category) : <img src={getActivityIcon(s.name, s.category)} className="w-10 h-10 object-contain"/>}</div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-900 text-lg leading-none mb-1">{s.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.durationHours}h Session • {s.cost ? `$${s.cost}` : 'Ongoing'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-12">
            {readings.slice(0, 1).map(r => (
              <div key={r.id} className="space-y-10">
                <InsightCardView reading={r} />
                {r.nutritionAdvice && (
                  <div className="bg-white rounded-[56px] p-12 shadow-2xl border border-white relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-[#A8C5A8]/5 rounded-full -mr-16 -mt-16"></div>
                     <h3 className="text-[11px] font-black text-[#A8C5A8] uppercase tracking-[0.5em] mb-8">Fueling for Performance</h3>
                     <div className="text-2xl font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">
                       {r.nutritionAdvice}
                     </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'journal' && (
        <div className="space-y-12 pb-32 animate-in fade-in duration-700">
          <header className="px-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Moments</h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Parental Observations</p>
          </header>

          <div className="bg-white rounded-[56px] p-10 shadow-2xl border border-white">
            <div className="space-y-8">
               <div className="px-4 flex justify-between items-center">
                 <input type="date" value={journalDate} onChange={e => setJournalDate(e.target.value)} className="bg-slate-50 px-6 py-4 rounded-2xl font-black text-slate-900 outline-none border border-slate-100" />
                 <button onClick={() => setIsPrivateNote(!isPrivateNote)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isPrivateNote ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                   {isPrivateNote ? 'Private Note' : 'Family Visible'}
                 </button>
               </div>
               <div className="px-4">
                 <textarea value={journalContent} onChange={e => setJournalContent(e.target.value)} placeholder={`What did ${child?.name} discover today?`} className="w-full h-48 p-10 rounded-[48px] bg-slate-50 border-2 border-slate-100 text-xl font-bold text-slate-900 focus:bg-white transition-all outline-none resize-none" />
               </div>
               <div className="px-4 flex gap-4">
                 <button onClick={() => logImageRef.current?.click()} className="flex-1 py-8 bg-slate-50 border border-dashed border-slate-200 rounded-[32px] flex items-center justify-center text-slate-400 relative overflow-hidden">
                   {journalImage ? <img src={journalImage} className="w-full h-full object-cover" /> : <ICONS.Camera className="w-8 h-8" />}
                 </button>
                 <input type="file" ref={logImageRef} onChange={e => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setJournalImage(reader.result as string); reader.readAsDataURL(file); } }} className="hidden" accept="image/*" />
                 <button onClick={handleLogMemory} disabled={isLoading || (!journalContent.trim() && !journalImage)} className="flex-[2] py-8 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-[0.4em] text-[10px] shadow-2xl active:scale-95 disabled:opacity-20 transition-all">Record Observation</button>
               </div>
            </div>
          </div>

          <div className="space-y-8 px-4">
            {filteredLogs.map(log => (
              <div key={log.id} className={`bg-white p-10 rounded-[56px] border shadow-sm relative transition-all ${log.visibility === 'private' ? 'border-indigo-100 bg-indigo-50/10' : 'border-white'}`}>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[9px] font-black text-[#A8C5A8] uppercase tracking-[0.4em]">{new Date(log.timestamp).toLocaleDateString()}</span>
                  {log.visibility === 'private' && <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-indigo-50 shadow-sm">Your Eyes Only</span>}
                </div>
                {log.image && <img src={log.image} className="w-full h-72 rounded-[40px] object-cover mb-8 shadow-md" />}
                <p className="text-xl text-slate-800 font-bold leading-relaxed whitespace-pre-wrap">"{log.content}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-12 pb-32 animate-in fade-in duration-700">
          <header className="flex justify-between items-center px-4">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Rhythm</h2>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Structured Practice</p>
            </div>
            <button onClick={() => setPlannerModal('schedule')} className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl active:scale-90 transition-all"><ICONS.Plus className="w-6 h-6" /></button>
          </header>

          <div className="px-4">
            <button onClick={() => setPlannerModal('log')} className="w-full py-8 bg-[#A8C5A8] text-white rounded-[32px] font-black uppercase tracking-[0.3em] text-[10px] shadow-xl flex items-center justify-center gap-4 active:scale-95 transition-all">
              <ICONS.Log className="w-6 h-6" /> Log Daily Success
            </button>
          </div>

          <div className="space-y-6 px-4">
            {scheduledClasses.map(s => (
               <div key={s.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-white flex items-center gap-8">
                  <div className="text-5xl">{getActivityIcon(s.name, s.category).length < 10 ? getActivityIcon(s.name, s.category) : '🎨'}</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{s.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.dayOfWeek || 0]} • {s.startTime}</span>
                      {s.cost && <span className="w-1 h-1 bg-slate-200 rounded-full"></span>}
                      {s.cost && <span className="text-[10px] font-black text-[#A8C5A8] uppercase tracking-widest">${s.cost} per session</span>}
                    </div>
                  </div>
                  <button onClick={async () => { if(window.confirm("Remove?")) { await deleteScheduledClass(familyId!, s.id); setScheduledClasses(p => p.filter(i => i.id !== s.id)); } }} className="w-12 h-12 text-slate-200 hover:text-red-400">×</button>
               </div>
            ))}
          </div>

          {plannerModal !== 'none' && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl animate-in fade-in" onClick={() => setPlannerModal('none')}></div>
              <div className="bg-white rounded-[64px] p-12 max-w-xl w-full shadow-2xl relative z-10 space-y-10 max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black text-slate-900 font-['Quicksand']">{plannerModal === 'schedule' ? 'New Class' : 'Log Success'}</h3>
                  <button onClick={() => setPlannerModal('none')} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><ICONS.Close className="w-6 h-6" /></button>
                </div>
                
                <div className="space-y-8">
                  {plannerModal === 'log' ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Class</label>
                      <select value={entryName} onChange={e => { const found = scheduledClasses.find(s => s.name === e.target.value); if(found) { setEntryName(found.name); setEntryCategory(found.category); } else { setEntryName(e.target.value); } }} className="w-full px-8 py-6 rounded-3xl bg-slate-50 border border-slate-100 font-bold text-slate-900 outline-none">
                        <option value="">Choose Existing or Type...</option>
                        {scheduledClasses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                      <input value={entryName} onChange={e => setEntryName(e.target.value)} placeholder="Or name a home practice..." className="w-full mt-4 px-8 py-6 rounded-3xl bg-slate-50 border border-slate-100 font-bold text-slate-900 outline-none" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class Name</label>
                      <input value={entryName} onChange={e => setEntryName(e.target.value)} placeholder="e.g. Badminton Class" className="w-full px-8 py-6 rounded-3xl bg-slate-50 border border-slate-100 font-bold text-slate-900 outline-none" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hours Spent</label>
                      <input type="number" step="0.5" value={entryDuration} onChange={e => setEntryDuration(parseFloat(e.target.value))} className="w-full px-8 py-6 rounded-3xl bg-slate-50 border border-slate-100 font-bold text-slate-900 outline-none" />
                    </div>
                    {plannerModal === 'schedule' ? (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost ($)</label>
                        <input type="number" value={entryCost} onChange={e => setEntryCost(parseFloat(e.target.value))} className="w-full px-8 py-6 rounded-3xl bg-slate-50 border border-slate-100 font-bold text-slate-900 outline-none" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">How was she?</label>
                        <div className="flex gap-2">
                          {Object.entries(MOOD_EMOJIS).map(([m, emoji]) => (
                            <button key={m} onClick={() => setEntryMood(m as Mood)} className={`flex-1 aspect-square rounded-2xl flex items-center justify-center text-xl transition-all ${entryMood === m ? 'bg-slate-900 border-slate-900 scale-110 shadow-lg' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {plannerModal === 'schedule' && (
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                         <select value={entryCategory} onChange={e => setEntryCategory(e.target.value as any)} className="w-full px-8 py-6 rounded-3xl bg-slate-50 border border-slate-100 font-bold text-slate-900 outline-none">
                           <option value="art">Art / Music</option>
                           <option value="sport">Sport</option>
                           <option value="academic">Academic</option>
                           <option value="adhoc">Other</option>
                         </select>
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weekly Day</label>
                         <select value={entryDay} onChange={e => setEntryDay(parseInt(e.target.value))} className="w-full px-8 py-6 rounded-3xl bg-slate-50 border border-slate-100 font-bold text-slate-900 outline-none">
                           {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => <option key={i} value={i}>{d}</option>)}
                         </select>
                       </div>
                    </div>
                  )}

                  <button onClick={plannerModal === 'schedule' ? handleSaveSchedule : handleLogActivity} className="w-full py-8 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
                    {isLoading ? 'Processing...' : 'Sync with Rhythm'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'coach' && (
        <div className="flex flex-col h-[80vh] pb-32">
          <header className="px-4 mb-8">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">AI Coach</h2>
            <p className="text-xs font-black text-[#6B9AC4] uppercase tracking-[0.3em]">Supportive Support</p>
          </header>
          <div className="flex-1 bg-white/50 backdrop-blur-3xl rounded-[56px] border border-white p-10 space-y-12 overflow-y-auto no-scrollbar shadow-inner">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-10 py-8 rounded-[48px] text-xl ${msg.role === 'user' ? 'bg-[#A8C5A8] text-white rounded-tr-none font-bold' : 'bg-slate-900 text-white rounded-tl-none font-medium'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="mt-8 flex gap-4 px-4 items-center">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Ask about her development..." className="flex-1 bg-white px-10 py-8 rounded-[40px] border border-slate-100 text-2xl font-bold shadow-2xl outline-none focus:border-[#A8C5A8] transition-all" />
              <button onClick={handleSendMessage} className="w-20 h-20 bg-slate-900 text-white rounded-[32px] flex items-center justify-center shadow-2xl active:scale-95 transition-all"><ICONS.Plus className="w-10 h-10 rotate-45" /></button>
          </div>
        </div>
      )}

      {activeTab === 'wisdom' && (
        <div className="space-y-12 pb-32">
           <header className="px-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Research</h2>
            <p className="text-xs font-black text-[#A8C5A8] uppercase tracking-[0.3em]">Science Hub</p>
          </header>
          {!selectedValue ? (
            <div className="grid grid-cols-2 gap-8 px-4">
              {Object.values(Value).map(v => (
                <button key={v} onClick={async () => { setSelectedValue(v); setIsValueLoading(true); const d = await generateValueDialogue(v, child!, logs, knowledge); setValueDialogue(d); setIsValueLoading(false); }} className="bg-white p-12 rounded-[56px] border border-white text-center hover:bg-slate-900 hover:text-white transition-all shadow-xl group">
                  <div className="text-6xl mb-8 group-hover:scale-110 transition-transform">🌱</div>
                  <h4 className="font-black text-[11px] uppercase tracking-[0.4em]">{v}</h4>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-10 px-4">
              <button onClick={() => setSelectedValue(null)} className="text-xs font-black text-slate-400 uppercase tracking-widest">← Back</button>
              {isValueLoading ? <div className="py-20 text-center font-black animate-pulse">Synthesizing...</div> : valueDialogue && (
                <div className="bg-slate-900 rounded-[64px] p-16 text-white shadow-2xl space-y-12">
                   <h3 className="text-5xl font-black tracking-tighter">{valueDialogue.value}</h3>
                   <div className="space-y-10">
                      {valueDialogue.conversationStarters.map((s, i) => <div key={i} className="bg-white/5 border border-white/10 p-10 rounded-[48px] text-2xl font-bold italic">"{s}"</div>)}
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} onSave={async (u) => { await saveChild(familyId!, u); setChild(u); }} initialData={child || {} as any} familyId={familyId || ''} onJoinFamily={async (fid) => { await setUserFamilyId(user!.uid, fid); setFamilyId(fid); await loadFamilyData(fid); }} onNeuralBurn={async () => { if(window.confirm("CRITICAL: Wipe data?")) { await clearAllFamilyData(familyId!); window.location.reload(); } }} />
    </Layout>
  );
};

export default App;
