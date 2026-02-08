import { useState, useMemo } from 'react';
import { useFamily } from '../context/FamilyContext';
import { ICONS } from '../constants';

export const Rhythm = () => {
    const { child, activities, generateReading, isLoading } = useFamily();
    const [expandedClass, setExpandedClass] = useState<string | null>(null);

    // Calculate attendance statistics
    const attendanceStats = useMemo(() => {
        const totalHours = activities.reduce((sum, act) => sum + act.durationHours, 0);
        const totalClasses = activities.length;

        // Group activities by class name
        const byClassName: Record<string, { count: number; hours: number; dates: string[] }> = {};
        activities.forEach(act => {
            if (!byClassName[act.name]) {
                byClassName[act.name] = { count: 0, hours: 0, dates: [] };
            }
            byClassName[act.name].count++;
            byClassName[act.name].hours += act.durationHours;
            byClassName[act.name].dates.push(act.timestamp);
        });

        // Get recent activities (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentActivities = activities.filter(act =>
            new Date(act.timestamp) >= thirtyDaysAgo
        );

        return {
            totalHours,
            totalClasses,
            byClassName,
            recentActivities,
            averageHoursPerWeek: totalHours / Math.max(1, Math.ceil(totalClasses / 7))
        };
    }, [activities]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header with Stats */}
            <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-1">
                            Activity Stats
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">Track attendance and progress</p>
                    </div>
                </div>
            </div>

            {/* Stats View */}
            <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-[#A8C5A8] to-[#8ba78b] rounded-[32px] p-6 text-white shadow-lg">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Total Hours</div>
                        <div className="text-4xl font-black">{attendanceStats.totalHours.toFixed(1)}</div>
                        <div className="text-xs opacity-80 mt-2">All time attendance</div>
                    </div>
                    <div className="bg-white rounded-[32px] p-6 border-2 border-slate-200 shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Classes</div>
                        <div className="text-4xl font-black text-slate-900">{attendanceStats.totalClasses}</div>
                        <div className="text-xs text-slate-500 mt-2">Sessions logged</div>
                    </div>
                    <div className="bg-white rounded-[32px] p-6 border-2 border-slate-200 shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Avg/Week</div>
                        <div className="text-4xl font-black text-slate-900">{attendanceStats.averageHoursPerWeek.toFixed(1)}h</div>
                        <div className="text-xs text-slate-500 mt-2">Average hours</div>
                    </div>
                </div>

                {/* AI Insights Button */}
                <div className="flex justify-end">
                    <button
                        onClick={generateReading}
                        disabled={isLoading}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        <ICONS.Sparkles className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Analyzing...' : 'Generate AI Insights'}
                    </button>
                </div>

                {/* Attendance by Class */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Attendance by Class</h3>
                    <div className="space-y-3">
                        {Object.entries(attendanceStats.byClassName).map(([className, data]) => {
                            const isExpanded = expandedClass === className;
                            const classActivities = activities.filter(act => act.name === className);

                            return (
                                <div key={className} className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
                                    {/* Class Header */}
                                    <button
                                        onClick={() => setExpandedClass(isExpanded ? null : className)}
                                        className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-[#A8C5A8]/20 flex items-center justify-center">
                                                {child?.activityIcons?.[className.toLowerCase().replace(/\s+/g, '_')] ? (
                                                    <img
                                                        src={child.activityIcons[className.toLowerCase().replace(/\s+/g, '_')]}
                                                        className="w-8 h-8 object-contain"
                                                        alt={className}
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.parentElement!.textContent = '📚';
                                                        }}
                                                    />
                                                ) : (
                                                    '📚'
                                                )}
                                            </div>
                                            <div className="text-left">
                                                <h4 className="font-black text-slate-900 text-sm">{className}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold">
                                                    {data.count} sessions • {data.hours.toFixed(1)} hours total
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-[#A8C5A8]">{data.hours.toFixed(1)}h</div>
                                            </div>
                                            <ICONS.ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                        </div>
                                    </button>

                                    {/* Expanded Date Entries */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 p-4 bg-slate-50">
                                            <div className="space-y-2">
                                                {classActivities
                                                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                                    .map((activity) => (
                                                        <div key={activity.id} className="flex items-center justify-between p-3 bg-white rounded-2xl">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-xl bg-[#A8C5A8]/10 flex items-center justify-center">
                                                                    <span className="text-sm">✓</span>
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-bold text-slate-900">
                                                                        {new Date(activity.timestamp).toLocaleDateString(undefined, {
                                                                            weekday: 'short',
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </div>
                                                                    {activity.mood && (
                                                                        <div className="text-[9px] text-slate-400 font-bold uppercase">
                                                                            {activity.mood === 'happy' && '😊 Happy'}
                                                                            {activity.mood === 'neutral' && '😐 Neutral'}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-sm font-black text-[#A8C5A8]">
                                                                {activity.durationHours}h
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {Object.keys(attendanceStats.byClassName).length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <div className="text-4xl mb-3">📊</div>
                                <p className="text-sm font-medium">No attendance records yet</p>
                                <p className="text-xs mt-2">Log activities to see statistics here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
