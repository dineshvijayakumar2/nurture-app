import React, { useState, useRef } from 'react';
import { useFamily } from '../context/FamilyContext';
import { ICONS } from '../constants';

export const Journal: React.FC = () => {
    const { logs, child, user, parents, addLog, addSchedule, isLoading } = useFamily();
    const [journalContent, setJournalContent] = useState('');
    const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
    const [journalImage, setJournalImage] = useState<string | null>(null);
    const logImageRef = useRef<HTMLInputElement>(null);

    // Schedule confirm logic
    const [proposedSchedule, setProposedSchedule] = useState<any>(null);

    const handleLogMemory = async () => {
        const log = await addLog(journalContent, journalImage, false);
        setJournalContent('');
        setJournalImage(null);

        if (log?.extracted?.scheduleUpdate && log.extracted.scheduleUpdate.action === 'add') {
            setProposedSchedule(log.extracted.scheduleUpdate);
        }
    };

    const confirmSchedule = async () => {
        if (!proposedSchedule) return;
        // Defaulting cost to 0 and day to current index if not parsed
        const { className, category, durationHours, dayOfWeek, startDate } = proposedSchedule;
        await addSchedule(className, category || 'art', durationHours || 1, dayOfWeek || 0, 0, startDate);
        // Note: We might want to pass startTime/status if we update addSchedule signature, 
        // but for now this closes the loop.
        setProposedSchedule(null);
    };

    // Fixed: Allow legacy logs without visibility/authorId fields to be shown
    const filteredLogs = logs.filter(l =>
        !l.visibility || l.visibility === 'family' || l.authorId === user?.uid
    );

    return (
        <div className="space-y-12 pb-32 animate-in fade-in duration-700 relative">
            {/* Schedule Proposal Modal */}
            {proposedSchedule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl space-y-6">
                        <div className="w-16 h-16 rounded-full bg-[#A8C5A8]/20 flex items-center justify-center text-3xl mx-auto">
                            📅
                        </div>
                        <div className="text-center">
                            <h3 className="text-2xl font-black text-slate-900">New Class Detected!</h3>
                            <p className="text-slate-500 mt-2 font-medium">
                                Nurture noticed you mentioned <strong>{proposedSchedule.className}</strong>.
                                Would you like to add this to the weekly Rhythm?
                            </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-sm font-bold text-slate-700">
                            <div className="flex justify-between"><span>Class</span> <span>{proposedSchedule.className}</span></div>
                            <div className="flex justify-between"><span>Duration</span> <span>{proposedSchedule.durationHours}h</span></div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setProposedSchedule(null)} className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-all">No thanks</button>
                            <button onClick={confirmSchedule} className="flex-1 py-4 rounded-2xl font-bold bg-[#A8C5A8] text-[#1e3a1e] shadow-lg active:scale-95 transition-all">Add to Rhythm</button>
                        </div>
                    </div>
                </div>
            )}

            <header className="px-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Moments</h2>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Parental Observations</p>
            </header>

            <div className="bg-white rounded-[56px] p-10 shadow-2xl border border-white">
                <div className="space-y-8">
                    <div className="px-4 flex justify-between items-center">
                        <input type="date" value={journalDate} onChange={e => setJournalDate(e.target.value)} className="bg-slate-50 px-6 py-4 rounded-2xl font-black text-slate-900 outline-none border border-slate-100" />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Family Visible</span>
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
                {filteredLogs.map(log => {
                    const author = parents.find(p => p.id === log.authorId);
                    const authorName = author?.name || (user?.uid === log.authorId ? user?.displayName : 'Unknown');

                    return (
                        <div key={log.id} className={`bg-white p-10 rounded-[56px] border shadow-sm relative transition-all ${log.visibility === 'private' ? 'border-indigo-100 bg-indigo-50/10' : 'border-white'}`}>
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[9px] font-black text-[#A8C5A8] uppercase tracking-[0.4em]">{new Date(log.timestamp).toLocaleDateString()}</span>
                                <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">{authorName}</span>
                            </div>
                            {log.image && <img src={log.image} className="w-full h-72 rounded-[40px] object-cover mb-8 shadow-md" />}
                            <p className="text-xl text-slate-800 font-bold leading-relaxed whitespace-pre-wrap">"{log.content}"</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
