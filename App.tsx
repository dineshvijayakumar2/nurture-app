
import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './services/firebase';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { InsightCardView } from './components/InsightCardView';
import { ProfileModal } from './components/ProfileModal';
import { 
  getChild, saveChild, 
  getLogs, saveLog, 
  getInsights, saveInsight 
} from './services/storageService';
import { processLogEntry, generateInsightCard, generateMediaGuide } from './services/geminiService';
import { ChildProfile, LogEntry, InsightCard, Domain, Value, MediaGuide } from './types';
import { ICONS } from './constants';

const DEFAULT_CHILD: ChildProfile = {
  id: '1',
  name: 'Maya',
  age: 8,
  activities: ['Reading', 'Art', 'School'],
  temperament: 'Sensitive, creative'
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [child, setChild] = useState<ChildProfile>(DEFAULT_CHILD);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Speech Recognition State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [mediaTitle, setMediaTitle] = useState('');
  const [activeMediaGuide, setActiveMediaGuide] = useState<MediaGuide | null>(null);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        loadUserData(currentUser.uid);
      }
    });

    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputValue(prev => (prev + ' ' + finalTranscript).trim());
        }
      };

      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = () => setIsRecording(false);
    }

    return () => unsubscribe();
  }, []);

  const loadUserData = async (uid: string) => {
    setIsLoading(true);
    try {
      const storedChild = await getChild(uid);
      if (!storedChild) {
        await saveChild(uid, DEFAULT_CHILD);
        setChild(DEFAULT_CHILD);
      } else {
        setChild(storedChild);
      }
      
      const [fetchedLogs, fetchedInsights] = await Promise.all([
        getLogs(uid),
        getInsights(uid)
      ]);
      setLogs(fetchedLogs);
      setInsights(fetchedInsights);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleLogSubmit = async () => {
    if (!user || (!inputValue.trim() && !selectedImage)) return;
    setIsLoading(true);
    try {
      // 1. Send data directly to Gemini for extraction
      const extracted = await processLogEntry(inputValue, child, selectedImage || undefined);
      
      const newEntry: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        type: isRecording ? 'voice' : (selectedImage ? 'photo' : 'text'),
        content: inputValue || (selectedImage ? "Observation from photo" : "No notes provided"),
        image: selectedImage || undefined, // Local copy for state, but storageService won't save it to DB
        extracted: extracted as LogEntry['extracted']
      };

      // 2. Save only the text content/extracted info to Firestore (No Cloud Storage used)
      await saveLog(user.uid, newEntry);
      
      const updatedLogs = [newEntry, ...logs];
      setLogs(updatedLogs);
      setInputValue('');
      setSelectedImage(null);

      if (updatedLogs.length > 0 && updatedLogs.length % 3 === 0) {
        const newInsight = await generateInsightCard(updatedLogs, child);
        await saveInsight(user.uid, newInsight);
        setInsights([newInsight, ...insights]);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to process entry. Check if API Key is valid.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (updatedProfile: ChildProfile) => {
    if (!user) return;
    setChild(updatedProfile);
    await saveChild(user.uid, updatedProfile);
  };

  const handleLogout = () => signOut(auth);

  if (authLoading) return <div className="min-h-screen bg-[#FFF9E6] flex items-center justify-center font-bold text-[#A8C5A8] animate-pulse">NURTURING...</div>;
  if (!user) return <Auth />;

  const renderHome = () => (
    <div className="space-y-6">
      <header className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative">
        <button onClick={() => setIsProfileModalOpen(true)} className="absolute top-4 right-4 p-2 text-gray-300 hover:text-[#A8C5A8]">
          <ICONS.Edit className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-[#A8C5A8] border-4 border-[#FFF9E6] flex items-center justify-center text-white text-2xl font-bold shadow-inner">{child.name[0]}</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">{child.name}</h2>
            <p className="text-sm text-gray-500 uppercase font-medium tracking-wide">{child.age} Years Old • {child.activities[0] || 'Learning'}</p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-4 flex items-center gap-2">
          <ICONS.Sparkles className="w-3 h-3 text-[#A8C5A8]" /> Latest Insight
        </h3>
        {insights.length > 0 ? <InsightCardView insight={insights[0]} /> : (
          <div className="text-center py-8 text-gray-400"><p className="text-sm italic">Unlock patterns by logging 3 moments.</p></div>
        )}
      </div>

      <button onClick={handleLogout} className="w-full py-3 text-gray-400 text-[10px] font-bold uppercase tracking-widest border border-dashed border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Logout Account</button>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Capture Moment</h3>
          {selectedImage && <button onClick={() => setSelectedImage(null)} className="text-[10px] font-bold text-red-400 uppercase">Remove Photo</button>}
        </div>
        
        {selectedImage && <div className="mb-4 rounded-xl overflow-hidden h-40 bg-gray-100 border border-gray-200"><img src={selectedImage} alt="Selected" className="w-full h-full object-cover" /></div>}
        
        <div className="relative">
          <textarea 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            placeholder={isRecording ? "Listening..." : (selectedImage ? "Describe this photo..." : "How was their day?")} 
            className={`w-full h-24 p-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#A8C5A8] resize-none text-sm text-gray-800 placeholder-gray-400 transition-all ${isRecording ? 'bg-red-50 ring-1 ring-red-100' : ''}`} 
          />
          {isRecording && (
            <div className="absolute top-2 right-2 flex space-x-1">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce delay-150"></span>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="flex gap-3">
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className={`p-3 rounded-full transition-all ${selectedImage ? 'bg-[#A8C5A8] text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
              title="Add Photo"
            >
              <ICONS.Camera className="w-5 h-5" />
            </button>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => setSelectedImage(reader.result as string);
                reader.readAsDataURL(file);
              }
            }} />
            
            <button 
              onClick={toggleRecording} 
              className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
              title="Voice Note"
            >
              <ICONS.Mic className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={handleLogSubmit} 
            disabled={isLoading || (!inputValue && !selectedImage)} 
            className="px-8 py-3 bg-[#A8C5A8] text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-md disabled:opacity-50 active:scale-95 transition-transform"
          >
            {isLoading ? 'Processing...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="space-y-4 pb-10">
        {logs.map((log) => (
          <div key={log.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tight">{new Date(log.timestamp).toLocaleDateString()}</span>
                {log.type === 'voice' && <ICONS.Mic className="w-3 h-3 text-blue-300" />}
                {log.type === 'photo' && <ICONS.Camera className="w-3 h-3 text-green-300" />}
              </div>
              <div className="flex gap-1">
                {log.extracted?.moodLabels?.slice(0, 2).map((l, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-gray-50 text-[8px] font-bold text-gray-500 rounded uppercase border border-gray-100">{l}</span>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              {log.image && (
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 shadow-inner">
                  <img src={log.image} className="w-full h-full object-cover" alt="Moment" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-[#4A5568] line-clamp-2 leading-relaxed italic">"{log.content}"</p>
                {log.extracted?.summary && (
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter line-clamp-1">{log.extracted.summary}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {logs.length === 0 && !isLoading && (
          <div className="text-center py-10 opacity-40">
            <ICONS.Log className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">No moments captured yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderInsights = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Intelligence Engine</h2>
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#A8C5A8] uppercase tracking-widest">
          <div className="w-2 h-2 rounded-full bg-[#A8C5A8] animate-pulse"></div> Powered by Gemini
        </div>
      </div>
      {insights.length > 0 ? insights.map((insight) => <InsightCardView key={insight.id} insight={insight} />) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <ICONS.Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400 italic text-sm">Log 3 moments to generate deep insights.</p>
        </div>
      )}
    </div>
  );

  const renderValues = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-[#A8C5A8] to-[#6B9AC4] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-10"><ICONS.Values className="w-24 h-24" /></div>
        <h2 className="text-lg font-bold mb-1">Media Discussion Guide</h2>
        <p className="text-xs opacity-90 mb-4">Gemini-crafted conversation starters for books & shows.</p>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={mediaTitle} 
            onChange={(e) => setMediaTitle(e.target.value)} 
            placeholder="Search movie/book..." 
            className="flex-1 bg-white/20 border-white/30 rounded-lg px-4 py-2 text-sm text-white placeholder:text-white/60 focus:ring-0 outline-none backdrop-blur-md" 
          />
          <button 
            disabled={isGeneratingGuide || !mediaTitle}
            onClick={async () => {
             setIsGeneratingGuide(true);
             const guide = await generateMediaGuide(mediaTitle, child);
             setActiveMediaGuide(guide);
             setIsGeneratingGuide(false);
          }} className="bg-white text-[#A8C5A8] p-2 rounded-lg shadow-md active:scale-95 disabled:opacity-50">
            {isGeneratingGuide ? <span className="animate-spin block">↻</span> : <ICONS.Sparkles className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {activeMediaGuide && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#A8C5A8] relative animate-in slide-in-from-bottom duration-300">
          <button onClick={() => setActiveMediaGuide(null)} className="absolute top-4 right-4 text-gray-300 hover:text-red-400"><ICONS.Close className="w-4 h-4" /></button>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🎬</span>
            <h3 className="font-bold text-gray-800 uppercase tracking-tight">{activeMediaGuide.title}</h3>
          </div>
          <div className="space-y-4">
             <div>
               <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Themes</h4>
               <div className="flex flex-wrap gap-1">
                 {activeMediaGuide.themes.map(t => <span key={t} className="px-2 py-0.5 bg-gray-50 text-[8px] font-bold text-gray-500 rounded uppercase">{t}</span>)}
               </div>
             </div>
             <p className="text-sm text-gray-600 leading-relaxed font-medium">"{activeMediaGuide.questions[0]}"</p>
             <p className="text-xs text-gray-400 italic">Connection: {activeMediaGuide.realLifeConnection}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {Object.values(Value).slice(0, 4).map((v) => (
          <div key={v} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{v}</h4>
            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#A8C5A8]" style={{ width: '45%' }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'home' && renderHome()}
      {activeTab === 'logs' && renderLogs()}
      {activeTab === 'insights' && renderInsights()}
      {activeTab === 'values' && renderValues()}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} onSave={handleProfileUpdate} initialData={child} />
    </Layout>
  );
};

export default App;
