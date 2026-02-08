import { useState, useMemo } from 'react';
import { useFamily } from '../context/FamilyContext';
import { ICONS } from '../constants';
import { ScheduledClass } from '../types';

type StatsPeriod = '7days' | '30days' | '3months' | '6months' | '1year' | 'all';

export const Rhythm = () => {
    const { child, activities, scheduledClasses, updateSchedule, deleteSchedule } = useFamily();
    const [expandedClass, setExpandedClass] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>('30days');

    // Calculate attendance statistics
    const attendanceStats = useMemo(() => {
        // Get date range based on selected period
        const now = new Date();
        let startDate: Date | null = null;

        switch (selectedPeriod) {
            case '7days':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case '30days':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 30);
                break;
            case '3months':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 3);
                break;
            case '6months':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 6);
                break;
            case '1year':
                startDate = new Date(now);
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            case 'all':
            default:
                startDate = null; // No filter
                break;
        }

        // Filter activities by period and exclude missed/cancelled
        let filteredActivities = activities.filter(act => act.status !== 'missed' && act.status !== 'cancelled');

        if (startDate) {
            filteredActivities = filteredActivities.filter(act => new Date(act.timestamp) >= startDate!);
        }

        const attendedActivities = filteredActivities;

        const totalHours = attendedActivities.reduce((sum, act) => sum + act.durationHours, 0);
        const totalClasses = attendedActivities.length;

        // Group activities by class name (excluding missed/cancelled)
        const byClassName: Record<string, { count: number; hours: number; dates: string[] }> = {};
        attendedActivities.forEach(act => {
            if (!byClassName[act.name]) {
                byClassName[act.name] = { count: 0, hours: 0, dates: [] };
            }
            byClassName[act.name].count++;
            byClassName[act.name].hours += act.durationHours;
            byClassName[act.name].dates.push(act.timestamp);
        });

        // Get recent activities (last 30 days, excluding missed/cancelled)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentActivities = attendedActivities.filter(act =>
            new Date(act.timestamp) >= thirtyDaysAgo
        );

        return {
            totalHours,
            totalClasses,
            byClassName,
            recentActivities,
            averageHoursPerWeek: totalHours / Math.max(1, Math.ceil(totalClasses / 7)),
            periodLabel: selectedPeriod === '7days' ? 'Last 7 Days' :
                        selectedPeriod === '30days' ? 'Last 30 Days' :
                        selectedPeriod === '3months' ? 'Last 3 Months' :
                        selectedPeriod === '6months' ? 'Last 6 Months' :
                        selectedPeriod === '1year' ? 'Last Year' : 'All Time'
        };
    }, [activities, selectedPeriod]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header with Stats */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-1">
                            Activity Stats
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">Track attendance and progress</p>
                    </div>

                    {/* Period Selector */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-400">Period:</label>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value as StatsPeriod)}
                            className="px-4 py-2 rounded-xl bg-white border-2 border-slate-200 text-sm font-bold text-slate-700 focus:border-[#A8C5A8] outline-none"
                        >
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="3months">Last 3 Months</option>
                            <option value="6months">Last 6 Months</option>
                            <option value="1year">Last Year</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Scheduled Activities Table */}
            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Planned Activities</h3>
                <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">Activity</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">Days</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">Time</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">Duration</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">Period</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {scheduledClasses.filter(cls => cls.status === 'active').map(cls => {
                                    const iconKey = cls.name.toLowerCase().replace(/\s+/g, '_');
                                    const hasCustomIcon = child?.activityIcons?.[iconKey];
                                    const dayNames = cls.daysOfWeek
                                        ? cls.daysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')
                                        : cls.dayOfWeek !== undefined
                                        ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][cls.dayOfWeek]
                                        : 'Not set';

                                    return (
                                        <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-[#A8C5A8]/10 flex items-center justify-center flex-shrink-0">
                                                        {hasCustomIcon ? (
                                                            <img
                                                                src={child.activityIcons[iconKey]}
                                                                className="w-6 h-6 object-contain"
                                                                alt={cls.name}
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                    e.currentTarget.parentElement!.textContent = '📚';
                                                                }}
                                                            />
                                                        ) : (
                                                            '📚'
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900">{cls.name}</div>
                                                        <div className="text-xs text-slate-500 capitalize">{cls.category}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-700">{dayNames}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-700">{cls.startTime || '09:00'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-[#A8C5A8]">{cls.durationHours}h</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-slate-600">
                                                    {new Date(cls.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    {cls.endDate && (
                                                        <> → {new Date(cls.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                                                    )}
                                                    {!cls.endDate && cls.isRecurring && <> → Ongoing</>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                                    cls.isRecurring
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'bg-purple-50 text-purple-700'
                                                }`}>
                                                    {cls.isRecurring ? '🔄 Recurring' : '📅 One-time'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const confirmed = window.confirm(`Pause or discontinue "${cls.name}"?\n\nClick OK to set to 'paused', Cancel to skip.`);
                                                            if (confirmed) {
                                                                updateSchedule({ ...cls, status: 'paused' });
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors"
                                                        title="Pause activity"
                                                    >
                                                        ⏸ Pause
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(`Remove "${cls.name}" from schedule?`)) {
                                                                deleteSchedule(cls.id);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                                                        title="Delete activity"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {scheduledClasses.filter(cls => cls.status === 'active').length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <div className="text-4xl mb-3">📋</div>
                                <p className="text-sm font-medium">No planned activities yet</p>
                                <p className="text-xs mt-2">Add activities from the Home page</p>
                            </div>
                        )}
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
                        <div className="text-xs opacity-80 mt-2">{attendanceStats.periodLabel}</div>
                    </div>
                    <div className="bg-white rounded-[32px] p-6 border-2 border-slate-200 shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Sessions</div>
                        <div className="text-4xl font-black text-slate-900">{attendanceStats.totalClasses}</div>
                        <div className="text-xs text-slate-500 mt-2">Activities logged</div>
                    </div>
                    <div className="bg-white rounded-[32px] p-6 border-2 border-slate-200 shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Avg/Week</div>
                        <div className="text-4xl font-black text-slate-900">{attendanceStats.averageHoursPerWeek.toFixed(1)}h</div>
                        <div className="text-xs text-slate-500 mt-2">Average hours</div>
                    </div>
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
                                                    .filter(act => act.status !== 'missed' && act.status !== 'cancelled')
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
