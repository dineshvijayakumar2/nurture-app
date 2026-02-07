import { useState, useMemo } from 'react';
import { useFamily } from '../context/FamilyContext';
import { ICONS, PREDEFINED_ICONS } from '../constants';
import { ActivityCategory, ScheduledClass } from '../types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_SHORT_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Monday-first week for multi-day selector
const DAYS_MON_FIRST = [
    { index: 1, short: 'Mon', full: 'Monday' },
    { index: 2, short: 'Tue', full: 'Tuesday' },
    { index: 3, short: 'Wed', full: 'Wednesday' },
    { index: 4, short: 'Thu', full: 'Thursday' },
    { index: 5, short: 'Fri', full: 'Friday' },
    { index: 6, short: 'Sat', full: 'Saturday' },
    { index: 0, short: 'Sun', full: 'Sunday' },
];
const CATEGORIES: { value: ActivityCategory; label: string; icon: string; color: string }[] = [
    { value: 'sport', label: 'Sports', icon: '⚽', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { value: 'art', label: 'Arts & Crafts', icon: '🎨', color: 'bg-purple-50 text-purple-600 border-purple-200' },
    { value: 'academic', label: 'Learning', icon: '📚', color: 'bg-green-50 text-green-600 border-green-200' }, // Books, Math, etc.
    { value: 'media', label: 'Screen Time', icon: '📺', color: 'bg-pink-50 text-pink-600 border-pink-200' }, // Shows, Movies, Educational videos
    { value: 'adhoc', label: 'Other', icon: '✨', color: 'bg-amber-50 text-amber-600 border-amber-200' },
];

export const Rhythm = () => {
    const { child, scheduledClasses, addSchedule, updateSchedule, deleteSchedule, addActivity, isLoading } = useFamily();
    const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingClass, setEditingClass] = useState<ScheduledClass | null>(null);
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [quickAddDay, setQuickAddDay] = useState<number | null>(null);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [selectedMonthDate, setSelectedMonthDate] = useState<Date | null>(null);
    const [quickEditDay, setQuickEditDay] = useState<number | null>(null);
    const [showQuickEditTime, setShowQuickEditTime] = useState(false);
    const [quickEditTime, setQuickEditTime] = useState('09:00');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        category: 'sport' as ActivityCategory,
        day: new Date().getDay(),
        selectedDays: [new Date().getDay()] as number[], // Multi-day selection
        startTime: '09:00',
        duration: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        isRecurring: true,
    });

    const resetForm = () => {
        const defaultDay = quickAddDay ?? new Date().getDay();
        setFormData({
            name: '',
            category: 'sport',
            day: defaultDay,
            selectedDays: [defaultDay],
            startTime: '09:00',
            duration: 1,
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            isRecurring: true,
        });
        setEditingClass(null);
    };

    const handleQuickAdd = (dayIndex: number) => {
        setQuickAddDay(dayIndex);
        resetForm();
        setFormData(prev => ({
            ...prev,
            day: dayIndex,
            selectedDays: [dayIndex]
        }));
        setShowQuickAdd(true);
    };

    const toggleDaySelection = (dayIndex: number) => {
        setFormData(prev => {
            const isSelected = prev.selectedDays.includes(dayIndex);
            const newSelectedDays = isSelected
                ? prev.selectedDays.filter(d => d !== dayIndex)
                : [...prev.selectedDays, dayIndex].sort();

            return {
                ...prev,
                selectedDays: newSelectedDays,
                day: newSelectedDays[0] || dayIndex,
            };
        });
    };

    const handleQuickSave = async () => {
        if (!formData.name.trim() || formData.selectedDays.length === 0) return;

        await addSchedule(
            formData.name,
            formData.category,
            formData.duration,
            formData.selectedDays, // Use multi-day selection
            0, // cost removed
            formData.startDate,
            formData.isRecurring,
            undefined, // specificDates
            formData.startTime // Pass the selected time
        );

        setShowQuickAdd(false);
        setQuickAddDay(null);
        resetForm();
    };

    const handleOpenEdit = (cls: ScheduledClass, dayIndex?: number) => {
        // If dayIndex is provided, open quick edit for that specific day's time
        if (dayIndex !== undefined) {
            setEditingClass(cls);
            setQuickEditDay(dayIndex);
            setQuickEditTime(getTimeForDay(cls, dayIndex));
            setShowQuickEditTime(true);
            return;
        }

        // Otherwise, open full edit modal
        setEditingClass(cls);
        // Support both old single-day format and new multi-day format
        const days = cls.daysOfWeek || (cls.dayOfWeek !== undefined ? [cls.dayOfWeek] : [0]);

        setFormData({
            name: cls.name,
            category: cls.category,
            day: days[0] || 0,
            selectedDays: days,
            startTime: cls.startTime || '09:00',
            duration: cls.durationHours,
            startDate: cls.startDate,
            endDate: cls.endDate || '',
            isRecurring: cls.isRecurring !== false,
        });
        setShowAddModal(true);
    };

    const handleQuickEditTimeSave = async () => {
        if (!editingClass || quickEditDay === null) return;

        // Update dayTimeMap with the new time for this specific day
        const updatedDayTimeMap = {
            ...(editingClass.dayTimeMap || {}),
            [quickEditDay.toString()]: quickEditTime
        };

        await updateSchedule({
            ...editingClass,
            dayTimeMap: updatedDayTimeMap
        });

        setShowQuickEditTime(false);
        setEditingClass(null);
        setQuickEditDay(null);
    };

    const handleSave = async () => {
        if (!formData.name.trim() || formData.selectedDays.length === 0) return;

        try {
            if (editingClass) {
                // Update existing class
                await updateSchedule({
                    ...editingClass,
                    name: formData.name,
                    category: formData.category,
                    dayOfWeek: undefined,
                    daysOfWeek: formData.selectedDays,
                    startTime: formData.startTime,
                    durationHours: formData.duration,
                    cost: 0,
                    startDate: formData.startDate,
                    endDate: formData.endDate || undefined,
                    isRecurring: formData.isRecurring,
                    status: 'active',
                });
            } else {
                // Add new class - use addSchedule for icon generation
                await addSchedule(
                    formData.name,
                    formData.category,
                    formData.duration,
                    formData.selectedDays,
                    0,
                    formData.startDate,
                    formData.isRecurring,
                    undefined, // specificDates
                    formData.startTime // Pass the selected time
                );
            }

            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error('Failed to save schedule:', error);
            alert('Failed to save activity. Please try again.');
        }
    };

    const handleDelete = async (id: string) => {
        // deleteSchedule already has confirmation dialog in context
        try {
            await deleteSchedule(id);
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            console.error('Failed to delete schedule:', error);
            alert('Failed to delete activity. Please try again.');
        }
    };

    const handleLogActivity = async (cls: ScheduledClass, date: Date) => {
        try {
            // Create activity log from scheduled class
            // Use date-only format to avoid timezone issues
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;

            await addActivity(
                cls.name,
                cls.category,
                cls.durationHours,
                0, // cost
                'neutral' as const, // default mood
                dateString, // actual date in YYYY-MM-DD format
                null // no photo
            );
            alert(`✅ Logged "${cls.name}" for ${date.toLocaleDateString()}`);
        } catch (error) {
            console.error('Failed to log activity:', error);
            alert('Failed to log activity. Please try again.');
        }
    };

    // Get week days (Monday-first)
    const weekDays = useMemo(() => {
        const start = new Date(currentWeek);
        // Set to Monday (getDay() = 1)
        const day = start.getDay();
        const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days; otherwise go to Monday
        start.setDate(start.getDate() + diff);

        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [currentWeek]);

    // Helper to get the time for a specific day (checks dayTimeMap first, then falls back to startTime)
    const getTimeForDay = (cls: ScheduledClass, dayIndex: number): string => {
        if (cls.dayTimeMap && cls.dayTimeMap[dayIndex.toString()]) {
            return cls.dayTimeMap[dayIndex.toString()];
        }
        return cls.startTime || '09:00';
    };

    // Get classes for a specific date
    const getClassesForDate = (date: Date) => {
        const dayIndex = date.getDay();
        return scheduledClasses.filter(cls => {
            if (cls.status !== 'active') return false;

            // Check if class occurs on this day (support both single day and multi-day)
            const occursOnDay = cls.daysOfWeek
                ? cls.daysOfWeek.includes(dayIndex)
                : cls.dayOfWeek === dayIndex;

            if (occursOnDay) {
                const start = new Date(cls.startDate);
                const end = cls.endDate ? new Date(cls.endDate) : null;
                return date >= start && (!end || date <= end);
            }
            return false;
        }).sort((a, b) => {
            const timeA = getTimeForDay(a, dayIndex);
            const timeB = getTimeForDay(b, dayIndex);
            return timeA.localeCompare(timeB);
        });
    };

    // Get month calendar grid (Monday-first)
    const monthGrid = useMemo(() => {
        const year = currentWeek.getFullYear();
        const month = currentWeek.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells = [];
        // Adjust for Monday-first week (0=Sun becomes 6, 1=Mon becomes 0, etc.)
        const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
        for (let i = 0; i < adjustedFirstDay; i++) cells.push(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));

        return cells;
    }, [currentWeek]);

    // Statistics
    const stats = useMemo(() => {
        const weekClasses = weekDays.flatMap(d => getClassesForDate(d));
        const totalHours = weekClasses.reduce((sum, cls) => sum + cls.durationHours, 0);
        const byCategory = CATEGORIES.map(cat => ({
            ...cat,
            count: weekClasses.filter(cls => cls.category === cat.value).length,
            hours: weekClasses.filter(cls => cls.category === cat.value).reduce((sum, cls) => sum + cls.durationHours, 0),
        }));

        return { totalHours, byCategory, classCount: weekClasses.length };
    }, [weekDays, scheduledClasses]);

    const navigateWeek = (direction: number) => {
        const next = new Date(currentWeek);
        if (viewMode === 'week') {
            next.setDate(next.getDate() + (direction * 7));
        } else {
            next.setMonth(next.getMonth() + direction);
        }
        setCurrentWeek(next);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header with Stats */}
            <div className="space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-1">
                            Rhythm
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">Plan your week, nurture growth</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-[#A8C5A8] to-[#8ba78b] text-white flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95 transition-all"
                    >
                        <ICONS.Plus className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                {/* Quick Stats - Show for both week and month views */}
                {stats.classCount > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-white rounded-2xl p-4 border border-slate-100">
                            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                {viewMode === 'week' ? 'This Week' : 'This Month'}
                            </div>
                            <div className="text-2xl font-black text-slate-900">{stats.classCount}</div>
                            <div className="text-xs text-slate-500">activities</div>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-slate-100">
                            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                Total Hours
                            </div>
                            <div className="text-2xl font-black text-slate-900">{stats.totalHours}h</div>
                            <div className="text-xs text-slate-500">scheduled</div>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border border-slate-100">
                            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                Balance
                            </div>
                            <div className="flex gap-1 mt-1">
                                {stats.byCategory.filter(c => c.count > 0).map(cat => (
                                    <div key={cat.value} className="text-lg" title={`${cat.label}: ${cat.hours}h`}>
                                        {cat.icon}
                                    </div>
                                ))}
                            </div>
                            <p className="text-[9px] text-slate-400 mt-1">Category mix</p>
                        </div>
                    </div>
                )}
            </div>

            {/* View Toggle & Navigation */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-1 flex">
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                viewMode === 'week'
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                viewMode === 'month'
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            Month
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigateWeek(-1)}
                            className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                        >
                            ‹
                        </button>
                        <button
                            onClick={() => setCurrentWeek(new Date())}
                            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => navigateWeek(1)}
                            className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
                        >
                            ›
                        </button>
                    </div>
                </div>

                <div className="text-base md:text-lg font-black text-slate-700">
                    {viewMode === 'week'
                        ? `Week of ${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : currentWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
            </div>

            {/* Week View */}
            {viewMode === 'week' && (
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="grid grid-cols-7 gap-2 md:gap-3 min-w-[700px]">
                        {weekDays.map((date, idx) => {
                            const classes = getClassesForDate(date);
                            const isToday = date.toDateString() === new Date().toDateString();
                            const dayHours = classes.reduce((sum, cls) => sum + cls.durationHours, 0);

                            return (
                                <div
                                    key={idx}
                                    className={`bg-white rounded-2xl border-2 p-3 md:p-4 min-h-[300px] flex flex-col transition-all ${
                                        isToday
                                            ? 'border-[#A8C5A8] shadow-md shadow-[#A8C5A8]/20'
                                            : 'border-slate-100'
                                    }`}
                                >
                                    {/* Day Header */}
                                    <div className="mb-3 pb-3 border-b border-slate-100">
                                        <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
                                            {DAYS_SHORT_MON_FIRST[idx]}
                                        </div>
                                        <div className={`text-xl font-black ${isToday ? 'text-[#A8C5A8]' : 'text-slate-900'}`}>
                                            {date.getDate()}
                                        </div>
                                        {dayHours > 0 && (
                                            <div className="text-[9px] font-bold text-slate-400 mt-1">
                                                {dayHours}h
                                            </div>
                                        )}
                                    </div>

                                    {/* Classes */}
                                    <div className="flex-1 space-y-2 overflow-y-auto">
                                        {classes.map(cls => {
                                                            const iconKey = cls.name.toLowerCase().replace(/\s+/g, '_');
                                            const hasCustomIcon = child?.activityIcons?.[iconKey];
                                            const dayTime = getTimeForDay(cls, idx);

                                            return (
                                                <div
                                                    key={cls.id}
                                                    className="bg-slate-50 rounded-xl p-3 group relative"
                                                >
                                                    <div className="flex items-start gap-2 mb-2">
                                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-base border border-slate-100 flex-shrink-0">
                                                            {hasCustomIcon ? (
                                                                <img
                                                                    src={child.activityIcons[iconKey]}
                                                                    alt={cls.name}
                                                                    className="w-5 h-5 object-contain"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                        e.currentTarget.parentElement!.textContent = PREDEFINED_ICONS[cls.category] || '🌟';
                                                                    }}
                                                                />
                                                            ) : (
                                                                PREDEFINED_ICONS[cls.category] || '🌟'
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-xs text-slate-900 leading-tight truncate">
                                                                {cls.name}
                                                            </h4>
                                                            <div className="flex items-center gap-1 text-[9px] font-bold mt-1">
                                                                <span className="text-slate-500">{dayTime}</span>
                                                                <span className="text-slate-300">•</span>
                                                                <span className="text-[#A8C5A8]">{cls.durationHours}h</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Quick Actions */}
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                                        <button
                                                            onClick={() => handleLogActivity(cls, date)}
                                                            className="w-full py-1.5 bg-gradient-to-r from-[#A8C5A8] to-[#8ba78b] text-white rounded-lg text-[8px] font-black uppercase tracking-wider hover:shadow-md transition-all"
                                                        >
                                                            ✓ Log It
                                                        </button>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => handleOpenEdit(cls, date.getDay())}
                                                                className="flex-1 py-1.5 bg-white rounded-lg text-[8px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-colors"
                                                            >
                                                                Edit Time
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenEdit(cls)}
                                                                className="flex-1 py-1.5 bg-blue-50 rounded-lg text-[8px] font-black uppercase tracking-wider text-blue-600 hover:bg-blue-100 transition-colors"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(cls.id)}
                                                                className="flex-1 py-1.5 bg-red-50 rounded-lg text-[8px] font-black uppercase tracking-wider text-red-600 hover:bg-red-100 transition-colors"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Quick Add Button */}
                                        <button
                                            onClick={() => handleQuickAdd(date.getDay())}
                                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-[#A8C5A8] hover:text-[#A8C5A8] hover:bg-[#A8C5A8]/5 transition-all group"
                                        >
                                            <ICONS.Plus className="w-4 h-4 mx-auto opacity-50 group-hover:opacity-100" />
                                            <span className="text-[9px] font-bold mt-1 block">Add</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Month View - Interactive with Side Pane */}
            {viewMode === 'month' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar */}
                    <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 p-6 md:p-8">
                        {/* Day headers */}
                        <div className="grid grid-cols-7 gap-2 md:gap-4 mb-4">
                            {DAYS_SHORT_MON_FIRST.map(day => (
                                <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="space-y-2">
                            {(() => {
                                const weeks: (Date | null)[][] = [];
                                let currentWeekArray: (Date | null)[] = [];

                                monthGrid.forEach((date, i) => {
                                    if (i % 7 === 0 && i > 0) {
                                        weeks.push(currentWeekArray);
                                        currentWeekArray = [];
                                    }
                                    currentWeekArray.push(date);
                                });
                                if (currentWeekArray.length > 0) {
                                    weeks.push(currentWeekArray);
                                }

                                return weeks.map((week, weekIdx) => (
                                    <div key={weekIdx} className="grid grid-cols-7 gap-2 md:gap-4">
                                        {week.map((day, dayIdx) => {
                                            const classes = day ? getClassesForDate(day) : [];
                                            const isToday =
                                                day && day.toDateString() === new Date().toDateString();
                                            const isSelected =
                                                day && selectedMonthDate && day.toDateString() === selectedMonthDate.toDateString();

                                            return (
                                                <div
                                                    key={dayIdx}
                                                    onClick={() => day && setSelectedMonthDate(day)}
                                                    className={`
                                                        aspect-square rounded-2xl flex flex-col items-center justify-center p-2
                                                        ${day ? 'bg-slate-50 hover:bg-slate-100 cursor-pointer' : 'bg-transparent'}
                                                        ${isToday ? 'bg-[#A8C5A8] text-white font-black' : 'text-slate-700'}
                                                        ${isSelected && !isToday ? 'ring-2 ring-[#A8C5A8] bg-[#A8C5A8]/10' : ''}
                                                        transition-all relative group
                                                    `}
                                                >
                                                    {day && (
                                                        <>
                                                            <span className="text-sm font-bold">{day.getDate()}</span>
                                                            {classes.length > 0 && (
                                                                <div className="flex gap-0.5 mt-1">
                                                                    {classes.slice(0, 3).map((_, idx) => (
                                                                        <div key={idx} className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-[#A8C5A8]'}`} />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* Side Pane - Activities for Selected Date */}
                    <div className="bg-white rounded-[32px] border border-slate-100 p-6 md:p-8 space-y-4">
                        {selectedMonthDate ? (
                            <>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-black text-slate-900">
                                        {selectedMonthDate.toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </h3>
                                    <div className="text-xs text-slate-500 font-medium">
                                        {getClassesForDate(selectedMonthDate).length} activities scheduled
                                    </div>
                                </div>

                                {/* Activities List */}
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {getClassesForDate(selectedMonthDate).map(cls => {
                                        const iconKey = cls.name.toLowerCase().replace(/\s+/g, '_');
                                        const hasCustomIcon = child?.activityIcons?.[iconKey];
                                        const dayTime = getTimeForDay(cls, selectedMonthDate.getDay());

                                        return (
                                            <div
                                                key={cls.id}
                                                className="bg-slate-50 rounded-xl p-4 group relative hover:bg-slate-100 transition-colors"
                                            >
                                                <div className="flex items-start gap-3 mb-2">
                                                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-lg border border-slate-100 flex-shrink-0">
                                                        {hasCustomIcon ? (
                                                            <img
                                                                src={child.activityIcons[iconKey]}
                                                                alt={cls.name}
                                                                className="w-6 h-6 object-contain"
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = 'none';
                                                                    e.currentTarget.parentElement!.textContent = PREDEFINED_ICONS[cls.category] || '🌟';
                                                                }}
                                                            />
                                                        ) : (
                                                            PREDEFINED_ICONS[cls.category] || '🌟'
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-sm text-slate-900 leading-tight">
                                                            {cls.name}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold mt-1">
                                                            <span className="text-slate-500">{dayTime}</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-[#A8C5A8]">{cls.durationHours}h</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Quick Actions */}
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                                    <button
                                                        onClick={() => selectedMonthDate && handleLogActivity(cls, selectedMonthDate)}
                                                        className="w-full py-2 bg-gradient-to-r from-[#A8C5A8] to-[#8ba78b] text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:shadow-md transition-all"
                                                    >
                                                        ✓ Log It
                                                    </button>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleOpenEdit(cls, selectedMonthDate?.getDay())}
                                                            className="flex-1 py-2 bg-white rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200 transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(cls.id)}
                                                            className="flex-1 py-2 bg-red-50 rounded-lg text-[9px] font-black uppercase tracking-wider text-red-600 hover:bg-red-100 transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {getClassesForDate(selectedMonthDate).length === 0 && (
                                        <div className="text-center py-8 text-slate-400">
                                            <div className="text-3xl mb-2">📅</div>
                                            <p className="text-xs font-medium">No activities scheduled</p>
                                        </div>
                                    )}
                                </div>

                                {/* Add Activity Button */}
                                <button
                                    onClick={() => {
                                        setQuickAddDay(selectedMonthDate.getDay());
                                        setFormData(prev => ({
                                            ...prev,
                                            day: selectedMonthDate.getDay(),
                                            startDate: selectedMonthDate.toISOString().split('T')[0]
                                        }));
                                        setShowQuickAdd(true);
                                    }}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#A8C5A8] to-[#8ba78b] text-white font-black text-xs uppercase tracking-wider hover:shadow-lg active:scale-[0.98] transition-all"
                                >
                                    + Add Activity
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                <div className="text-4xl mb-3">📆</div>
                                <p className="text-sm font-medium">Select a date to view activities</p>
                                <p className="text-xs mt-2">Click on any date in the calendar</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Edit Time Dialog */}
            {showQuickEditTime && editingClass && quickEditDay !== null && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
                        onClick={() => {
                            setShowQuickEditTime(false);
                            setEditingClass(null);
                            setQuickEditDay(null);
                        }}
                    />

                    <div className="relative bg-white rounded-t-[32px] md:rounded-[32px] w-full max-w-md shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-bottom-0">
                        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                            <h3 className="text-xl font-black text-slate-900">
                                Edit Time - {DAYS[quickEditDay]}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">{editingClass.name}</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1 mb-2 block">
                                    Time for {DAYS[quickEditDay]}
                                </label>
                                <input
                                    type="time"
                                    value={quickEditTime}
                                    onChange={(e) => setQuickEditTime(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-[#A8C5A8] outline-none font-semibold text-slate-900"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setShowQuickEditTime(false);
                                        setEditingClass(null);
                                        setQuickEditDay(null);
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleQuickEditTimeSave}
                                    disabled={isLoading}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#A8C5A8] to-[#8ba78b] text-white font-black uppercase tracking-wider disabled:opacity-50 hover:shadow-lg active:scale-[0.98] transition-all"
                                >
                                    Save Time
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Add Dialog */}
            {showQuickAdd && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
                        onClick={() => { setShowQuickAdd(false); setQuickAddDay(null); }}
                    />

                    <div className="relative bg-white rounded-t-[32px] md:rounded-[32px] w-full max-w-md shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-bottom-0">
                        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                            <h3 className="text-xl font-black text-slate-900">
                                Quick Add - {DAYS[quickAddDay ?? 0]}
                            </h3>
                        </div>

                        <div className="p-6 space-y-4">
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Activity name (e.g., Read Harry Potter, Math practice, Watch Bluey)"
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-[#A8C5A8] outline-none font-semibold text-slate-900 text-sm placeholder:text-xs"
                                autoFocus
                            />

                            <div className="grid grid-cols-5 gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.value}
                                        onClick={() => setFormData({ ...formData, category: cat.value })}
                                        className={`p-3 rounded-xl border-2 transition-all ${
                                            formData.category === cat.value
                                                ? 'border-[#A8C5A8] bg-[#A8C5A8]/10'
                                                : 'border-slate-100 hover:border-slate-200'
                                        }`}
                                        title={cat.label}
                                    >
                                        <div className="text-xl">{cat.icon}</div>
                                    </button>
                                ))}
                            </div>

                            {/* Multi-day selector */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1 block">
                                    Days of Week
                                </label>
                                <div className="grid grid-cols-7 gap-1">
                                    {DAYS_MON_FIRST.map(day => {
                                        const isSelected = formData.selectedDays.includes(day.index);
                                        return (
                                            <button
                                                key={day.index}
                                                type="button"
                                                onClick={() => toggleDaySelection(day.index)}
                                                className={`py-2 rounded-lg border-2 transition-all ${
                                                    isSelected
                                                        ? 'border-[#A8C5A8] bg-[#A8C5A8] text-white'
                                                        : 'border-slate-200 bg-white text-slate-600'
                                                }`}
                                            >
                                                <div className="text-[9px] font-black">{day.short}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1 mb-2 block">
                                        Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-[#A8C5A8] outline-none font-semibold text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1 mb-2 block">
                                        Hours
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0.5"
                                        value={formData.duration}
                                        onChange={(e) => setFormData({ ...formData, duration: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-[#A8C5A8] outline-none font-semibold text-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => { setShowQuickAdd(false); setQuickAddDay(null); }}
                                    className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleQuickSave}
                                    disabled={!formData.name.trim() || isLoading}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#A8C5A8] to-[#8ba78b] text-white font-black uppercase tracking-wider disabled:opacity-50 hover:shadow-lg active:scale-[0.98] transition-all"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl"
                        onClick={() => { setShowAddModal(false); resetForm(); }}
                    />

                    <div className="relative bg-white rounded-[32px] md:rounded-[48px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white rounded-t-[32px] md:rounded-t-[48px] px-6 md:px-8 pt-6 md:pt-8 pb-4 md:pb-6 border-b border-slate-100 z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                                    {editingClass ? 'Edit Activity' : 'New Activity'}
                                </h2>
                                <button
                                    onClick={() => { setShowAddModal(false); resetForm(); }}
                                    className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                >
                                    <span className="text-slate-600">×</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 md:p-8 space-y-6">
                            {/* Activity Name */}
                            <div className="space-y-3">
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 ml-2">
                                    Activity Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Soccer Practice, Piano Lessons"
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#A8C5A8] outline-none font-semibold text-slate-900 placeholder:text-slate-300 transition-colors"
                                    autoFocus
                                />
                            </div>

                            {/* Category Selection */}
                            <div className="space-y-3">
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 ml-2">
                                    Category
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.value}
                                            onClick={() => setFormData({ ...formData, category: cat.value })}
                                            className={`p-4 rounded-2xl border-2 transition-all text-left ${
                                                formData.category === cat.value
                                                    ? cat.color.replace('bg-', 'bg-') + ' border-current shadow-sm'
                                                    : 'bg-white border-slate-100 hover:border-slate-200'
                                            }`}
                                        >
                                            <div className="text-2xl mb-2">{cat.icon}</div>
                                            <div className="text-xs font-bold">{cat.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Schedule */}
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 ml-2">
                                        Days of Week
                                    </label>
                                    <div className="grid grid-cols-7 gap-2">
                                        {DAYS_MON_FIRST.map(day => {
                                            const isSelected = formData.selectedDays.includes(day.index);
                                            return (
                                                <button
                                                    key={day.index}
                                                    type="button"
                                                    onClick={() => toggleDaySelection(day.index)}
                                                    className={`w-full py-3 px-2 rounded-xl border-2 transition-all text-center ${
                                                        isSelected
                                                            ? 'border-[#A8C5A8] bg-[#A8C5A8] text-white shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="text-[10px] font-black uppercase">{day.short}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[10px] text-slate-400 ml-2 font-medium">
                                        Select one or multiple days (same time for all selected days)
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-3">
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 ml-2">
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#A8C5A8] outline-none font-semibold text-slate-900"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 ml-2">
                                        Duration (hours)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0.5"
                                        value={formData.duration}
                                        onChange={(e) => setFormData({ ...formData, duration: parseFloat(e.target.value) })}
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#A8C5A8] outline-none font-semibold text-slate-900"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-400 ml-2">
                                        Starts From
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#A8C5A8] outline-none font-semibold text-slate-900"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 ml-2">
                                    Ends On (optional)
                                </label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-[#A8C5A8] outline-none font-semibold text-slate-900"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4">
                                {editingClass && (
                                    <button
                                        onClick={() => handleDelete(editingClass.id)}
                                        className="px-6 py-4 rounded-2xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                                    >
                                        Delete
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    disabled={!formData.name.trim() || isLoading}
                                    className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-[#A8C5A8] to-[#8ba78b] text-white font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98] transition-all"
                                >
                                    {editingClass ? 'Update Activity' : 'Add to Rhythm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {scheduledClasses.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#A8C5A8]/20 to-[#6B9AC4]/20 flex items-center justify-center">
                        <span className="text-6xl">🗓️</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-slate-900">Create Your Rhythm</h3>
                        <p className="text-slate-500 font-medium max-w-md">
                            Start by adding your child's activities and classes. Build a balanced weekly routine that nurtures growth.
                        </p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#A8C5A8] to-[#8ba78b] text-white font-black uppercase tracking-wider hover:shadow-lg active:scale-95 transition-all"
                    >
                        Add First Activity
                    </button>
                </div>
            )}
        </div>
    );
};
