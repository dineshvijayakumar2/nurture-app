import { useMemo, useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import { NextUpCard } from '../components/Feed/FeedCards';
import { ScheduledClass } from '../types';

export const Dashboard = () => {
    const { child, scheduledClasses, generateReading, isLoading } = useFamily();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const navigate = useNavigate();

    // Get calendar data for the month
    const calendarData = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Build calendar grid
        const weeks: (number | null)[][] = [[]];
        let currentWeek = 0;

        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            weeks[currentWeek].push(null);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            if (weeks[currentWeek].length === 7) {
                currentWeek++;
                weeks[currentWeek] = [];
            }
            weeks[currentWeek].push(day);
        }

        // Fill last week with nulls
        while (weeks[currentWeek].length < 7) {
            weeks[currentWeek].push(null);
        }

        return { weeks, year, month };
    }, [currentMonth]);

    // Get classes for a specific day
    const getClassesForDay = (day: number | null) => {
        if (!day) return [];
        const date = new Date(calendarData.year, calendarData.month, day);
        const dayOfWeek = date.getDay();

        return scheduledClasses.filter(cls => {
            // Check if class occurs on this day (support both single day and multi-day)
            const occursOnDay = cls.daysOfWeek
                ? cls.daysOfWeek.includes(dayOfWeek)
                : cls.dayOfWeek === dayOfWeek;

            if (cls.isRecurring && occursOnDay) {
                // Check if class has started
                const startDate = new Date(cls.startDate);
                if (date < startDate) return false;
                // Check if class has ended
                if (cls.endDate) {
                    const endDate = new Date(cls.endDate);
                    if (date > endDate) return false;
                }
                return cls.status === 'active';
            }
            return false;
        });
    };

    // Get upcoming classes (next 7 days)
    const upcomingClasses = useMemo(() => {
        const now = new Date();
        const upcoming: Array<{ class: ScheduledClass; date: Date }> = [];

        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(now);
            checkDate.setDate(now.getDate() + i);
            const dayOfWeek = checkDate.getDay();

            scheduledClasses.forEach(cls => {
                if (cls.isRecurring && cls.dayOfWeek === dayOfWeek && cls.status === 'active') {
                    const startDate = new Date(cls.startDate);
                    if (checkDate >= startDate) {
                        if (!cls.endDate || checkDate <= new Date(cls.endDate)) {
                            upcoming.push({ class: cls, date: new Date(checkDate) });
                        }
                    }
                }
            });
        }

        return upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [scheduledClasses]);

    // Get next immediate class
    const nextUp = upcomingClasses[0];

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="space-y-8 pb-32 animate-in fade-in duration-700">
            {/* Header */}
            <header className="flex justify-between items-center px-4">
                <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-[24px] bg-[#A8C5A8] border-[3px] border-white shadow-xl overflow-hidden">
                        {child?.photoUrl ? (
                            <img src={child.photoUrl} className="w-full h-full object-cover" alt={child.name} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-black text-2xl">
                                {child?.name?.[0]}
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Hello, Family</h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>
                <button
                    onClick={generateReading}
                    disabled={isLoading}
                    className="w-14 h-14 bg-slate-900 text-white rounded-[24px] flex items-center justify-center shadow-xl active:scale-90 transition-all disabled:opacity-50 relative group"
                    title="Generate AI Insights powered by Gemini"
                >
                    <ICONS.Sparkles className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading && (
                        <div className="absolute -bottom-12 right-0 bg-slate-900 text-white px-4 py-2 rounded-2xl text-[10px] font-bold whitespace-nowrap">
                            🧠 Gemini analyzing...
                        </div>
                    )}
                </button>
            </header>

            {/* Up Next Hero */}
            {nextUp && (
                <div className="px-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 ml-2">Happening Next</h3>
                    <NextUpCard schedule={nextUp.class} />
                </div>
            )}

            {/* Two-Column Layout: Calendar + Upcoming Classes */}
            <div className="px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar View */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">
                            {monthNames[calendarData.month]} {calendarData.year}
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
                            >
                                ‹
                            </button>
                            <button
                                onClick={() => setCurrentMonth(new Date())}
                                className="px-3 h-8 bg-slate-100 rounded-full text-[10px] font-bold hover:bg-slate-200 transition-colors"
                            >
                                Today
                            </button>
                            <button
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors"
                            >
                                ›
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-100">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-2 mb-4">
                            {dayNames.map(day => (
                                <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="space-y-2">
                            {calendarData.weeks.map((week, weekIdx) => (
                                <div key={weekIdx} className="grid grid-cols-7 gap-2">
                                    {week.map((day, dayIdx) => {
                                        const classes = getClassesForDay(day);
                                        const isToday =
                                            day === new Date().getDate() &&
                                            calendarData.month === new Date().getMonth() &&
                                            calendarData.year === new Date().getFullYear();

                                        return (
                                            <div
                                                key={dayIdx}
                                                className={`
                                                    aspect-square rounded-2xl flex flex-col items-center justify-center p-2
                                                    ${day ? 'bg-slate-50 hover:bg-slate-100 cursor-pointer' : 'bg-transparent'}
                                                    ${isToday ? 'bg-[#A8C5A8] text-white font-black' : 'text-slate-700'}
                                                    transition-colors relative group
                                                `}
                                            >
                                                {day && (
                                                    <>
                                                        <span className="text-sm font-bold">{day}</span>
                                                        {classes.length > 0 && (
                                                            <div className="flex gap-0.5 mt-1">
                                                                {classes.slice(0, 3).map((_, idx) => (
                                                                    <div key={idx} className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-[#A8C5A8]'}`} />
                                                                ))}
                                                            </div>
                                                        )}
                                                        {classes.length > 0 && (
                                                            <div className="hidden group-hover:block absolute top-full left-0 mt-2 bg-slate-900 text-white p-3 rounded-2xl text-[10px] font-bold z-10 whitespace-nowrap shadow-xl">
                                                                {classes.map(cls => (
                                                                    <div key={cls.id}>{cls.name}</div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Upcoming Classes List */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Upcoming Classes</h3>
                    <div className="space-y-3">
                        {upcomingClasses.slice(0, 10).map((item, idx) => (
                            <div
                                key={idx}
                                className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 flex items-center gap-3 hover:shadow-md transition-shadow"
                            >
                                <div className="w-12 h-12 rounded-[16px] bg-[#A8C5A8]/20 flex items-center justify-center text-2xl flex-shrink-0">
                                    {child?.activityIcons?.[item.class.name.toLowerCase().replace(/\s+/g, '_')] ? (
                                        <img
                                            src={child.activityIcons[item.class.name.toLowerCase().replace(/\s+/g, '_')]}
                                            className="w-8 h-8 object-contain"
                                            alt={item.class.name}
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement!.textContent = '📅';
                                            }}
                                        />
                                    ) : (
                                        '📅'
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm text-slate-900 truncate">{item.class.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold">
                                        {item.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        {' • '}
                                        {item.class.startTime}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {upcomingClasses.length === 0 && (
                            <div className="bg-slate-50 rounded-[24px] p-6 text-center text-slate-400">
                                <p className="font-bold text-sm">No classes scheduled</p>
                                <p className="text-[10px] mt-1">Add activities in Rhythm</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Shortcuts */}
            <div className="px-4 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => navigate('/journal')}
                        className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-95 group"
                    >
                        <div className="w-14 h-14 rounded-[20px] bg-[#A8C5A8]/20 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                            <ICONS.Log className="w-7 h-7 text-[#A8C5A8]" />
                        </div>
                        <h4 className="font-black text-slate-900 text-sm mb-1">Log Moment</h4>
                        <p className="text-[10px] text-slate-400 font-bold">Record daily observations</p>
                    </button>

                    <button
                        onClick={() => navigate('/activities')}
                        className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-95 group"
                    >
                        <div className="w-14 h-14 rounded-[20px] bg-[#A8C5A8]/20 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                            <ICONS.Timeline className="w-7 h-7 text-[#A8C5A8]" />
                        </div>
                        <h4 className="font-black text-slate-900 text-sm mb-1">Add Activity</h4>
                        <p className="text-[10px] text-slate-400 font-bold">Schedule new classes</p>
                    </button>

                    <button
                        onClick={() => navigate('/wisdom')}
                        className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-95 group"
                    >
                        <div className="w-14 h-14 rounded-[20px] bg-[#A8C5A8]/20 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                            <ICONS.Values className="w-7 h-7 text-[#A8C5A8]" />
                        </div>
                        <h4 className="font-black text-slate-900 text-sm mb-1">Research</h4>
                        <p className="text-[10px] text-slate-400 font-bold">Browse knowledge base</p>
                    </button>

                    <button
                        onClick={() => navigate('/coach')}
                        className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all active:scale-95 group"
                    >
                        <div className="w-14 h-14 rounded-[20px] bg-[#A8C5A8]/20 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">
                            <ICONS.Sparkles className="w-7 h-7 text-[#A8C5A8]" />
                        </div>
                        <h4 className="font-black text-slate-900 text-sm mb-1">AI Coach</h4>
                        <p className="text-[10px] text-slate-400 font-bold">Chat with Gemini</p>
                    </button>
                </div>
            </div>
        </div>
    );
};
