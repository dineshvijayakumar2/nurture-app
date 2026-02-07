import React, { useMemo } from 'react';
import { useFamily } from '../context/FamilyContext';
import { ICONS } from '../constants';
import { LogCard, InsightCard, NextUpCard, WisdomCard } from '../components/Feed/FeedCards';

export const Dashboard: React.FC = () => {
    const { child, logs, readings, activities, scheduledClasses, knowledge, generateReading, isLoading } = useFamily();

    // 1. Get immediate next schedule
    const nextUp = useMemo(() => {
        const now = new Date();
        const upcoming = scheduledClasses
            .map(s => {
                // Simplified: Assuming 's.startTime' is 'HH:MM' string and recurring weekly on 's.dayOfWeek'
                // This logic is primitive and might need robust date handling for real production
                // For demo, we just return the first one as "next"
                return s;
            })
            // In a real app, filter for today/tomorrow and sort by time
            .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
        return upcoming;
    }, [scheduledClasses]);

    // 2. Mix Feed Items
    const feedItems = useMemo(() => {
        const items: any[] = [];

        // Add latest reading
        if (readings.length > 0) items.push({ type: 'insight', data: readings[0], date: new Date(readings[0].timestamp) });

        // Add recent logs
        logs.slice(0, 5).forEach(l => items.push({ type: 'log', data: l, date: new Date(l.timestamp) }));

        // Add some wisdom
        knowledge.slice(0, 2).forEach(k => items.push({ type: 'wisdom', data: k, date: new Date() })); // Using current date for wisdom to intersperse

        return items.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [logs, readings, knowledge]);

    return (
        <div className="space-y-8 pb-32 animate-in fade-in duration-700">
            {/* Header */}
            <header className="flex justify-between items-center px-4">
                <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-[24px] bg-[#A8C5A8] border-[3px] border-white shadow-xl overflow-hidden">
                        {child?.photoUrl ? <img src={child.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white font-black text-2xl">{child?.name?.[0]}</div>}
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Hello, Family</h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
                <button onClick={generateReading} disabled={isLoading} className="w-14 h-14 bg-slate-900 text-white rounded-[24px] flex items-center justify-center shadow-xl active:scale-90 transition-all disabled:opacity-50">
                    <ICONS.Sparkles className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </header>

            {/* Up Next Hero */}
            {nextUp && (
                <div className="px-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 ml-2">Happening Next</h3>
                    <NextUpCard schedule={nextUp} />
                </div>
            )}

            {/* Feed */}
            <div className="px-4 space-y-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Your Feed</h3>
                <div className="columns-1 md:columns-2 gap-8 space-y-8">
                    {feedItems.map((item, idx) => (
                        <div key={idx} className="break-inside-avoid">
                            {item.type === 'log' && <LogCard log={item.data} />}
                            {item.type === 'insight' && <InsightCard reading={item.data} />}
                            {item.type === 'wisdom' && <WisdomCard resource={item.data} />}
                        </div>
                    ))}
                </div>
            </div>

            {!feedItems.length && !nextUp && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                    <ICONS.Home className="w-12 h-12 opacity-50" />
                    <p className="font-bold text-sm">Quiet day in the garden...</p>
                </div>
            )}
        </div>
    );
};
