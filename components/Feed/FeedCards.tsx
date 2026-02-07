import React from 'react';
import { LogEntry, NeuralReading, ScheduledClass, KnowledgeSource } from '../../types';
import { ICONS, PREDEFINED_ICONS } from '../../constants';
import { useFamily } from '../../context/FamilyContext';

export const LogCard: React.FC<{ log: LogEntry }> = ({ log }) => {
    const { getParentName } = useFamily();
    const authorName = getParentName(log.authorId);

    return (
        <div className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl">👤</div>
                <div>
                    <h4 className="font-bold text-slate-900 text-sm">{authorName}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(log.timestamp).toLocaleDateString()}</p>
                </div>
            </div>
            <p className="text-slate-700 leading-relaxed font-medium">{log.content}</p>
            {log.image && <img src={log.image} className="w-full h-64 object-cover rounded-[32px]" />}
            {log.extracted?.moodLabels && (
                <div className="flex gap-2 flex-wrap">
                    {log.extracted.moodLabels.map(m => (
                        <span key={m} className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">{m}</span>
                    ))}
                </div>
            )}
        </div>
    );
};

export const InsightCard: React.FC<{ reading: NeuralReading }> = ({ reading }) => {
    return (
        <div className="bg-slate-900 rounded-[40px] p-8 shadow-xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A8C5A8] rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="flex items-center gap-3 mb-6 relative z-10">
                <ICONS.Sparkles className="w-5 h-5 text-[#A8C5A8]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8C5A8]">Neural Insight</span>
            </div>
            <h3 className="text-xl font-bold leading-relaxed mb-4 relative z-10">"{reading.currentReading}"</h3>
            <p className="text-slate-400 text-sm relative z-10">{reading.forecast}</p>
        </div>
    );
};

export const NextUpCard: React.FC<{ schedule: ScheduledClass }> = ({ schedule }) => {
    return (
        <div className="bg-[#A8C5A8] rounded-[48px] p-8 shadow-xl text-white flex items-center gap-6 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full"></div>
            <div className="text-5xl bg-white/20 w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                {PREDEFINED_ICONS[schedule.category] || '⚡'}
            </div>
            <div className="flex-1 relative z-10">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-1">Happening Now</div>
                <h3 className="text-2xl font-black tracking-tight leading-none mb-1">{schedule.name}</h3>
                <p className="opacity-80 font-medium text-sm">Starts at {schedule.startTime} • {schedule.durationHours}h</p>
            </div>
        </div>
    );
};

export const WisdomCard: React.FC<{ resource: KnowledgeSource }> = ({ resource }) => {
    return (
        <div className="bg-[#fdfbf7] rounded-[40px] p-8 shadow-sm border border-stone-100 group cursor-pointer hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500"><ICONS.Bookmark className="w-4 h-4" /></span>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Wisdom</span>
            </div>
            <h3 className="font-serif font-bold text-xl text-stone-800 leading-tight mb-2 group-hover:underline decoration-2 decoration-[#A8C5A8]">{resource.title}</h3>
            <p className="text-stone-500 text-xs line-clamp-2 leading-relaxed">{resource.content}</p>
        </div>
    );
};
