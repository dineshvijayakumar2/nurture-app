import { useMemo, useState, useCallback } from 'react';
import { useFamily } from '../context/FamilyContext';
import { ICONS, PREDEFINED_ICONS } from '../constants';
import { NextUpCard } from '../components/Feed/FeedCards';
import { ScheduledClass, ActivityCategory } from '../types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
    { value: 'academic', label: 'Learning', icon: '📚', color: 'bg-green-50 text-green-600 border-green-200' },
    { value: 'media', label: 'Screen Time', icon: '📺', color: 'bg-pink-50 text-pink-600 border-pink-200' },
    { value: 'adhoc', label: 'Other', icon: '✨', color: 'bg-amber-50 text-amber-600 border-amber-200' },
];

export const Dashboard = () => {
    const {
        child,
        scheduledClasses,
        readings,
        generateReading,
        isLoading,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        addActivity,
        activities
    } = useFamily();

    const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
    const [currentWeek, setCurrentWeek] = useState(new Date());
    const [selectedMonthDate, setSelectedMonthDate] = useState<Date | null>(new Date()); // Auto-select today
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickAddDay, setQuickAddDay] = useState<number | null>(null);
    const [editingClass, setEditingClass] = useState<ScheduledClass | null>(null);
    const [showQuickEditTime, setShowQuickEditTime] = useState(false);
    const [quickEditDay, setQuickEditDay] = useState<number | null>(null);
    const [quickEditTime, setQuickEditTime] = useState('09:00');
    const [showEditScopeModal, setShowEditScopeModal] = useState(false);
    const [pendingEditAction, setPendingEditAction] = useState<{ class: ScheduledClass; action: 'edit' | 'delete'; dayIndex?: number } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        category: 'sport' as ActivityCategory,
        day: new Date().getDay(),
        selectedDays: [new Date().getDay()] as number[],
        startTime: '09:00',
        duration: 1,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        isRecurring: true,
        weekOccurrences: [] as number[], // 1-5 for 1st, 2nd, 3rd, 4th, 5th week
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
            weekOccurrences: [],
        });
        setEditingClass(null);
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

    const toggleWeekOccurrence = (weekNum: number) => {
        setFormData(prev => {
            const isSelected = prev.weekOccurrences.includes(weekNum);
            const newWeekOccurrences = isSelected
                ? prev.weekOccurrences.filter(w => w !== weekNum)
                : [...prev.weekOccurrences, weekNum].sort();

            return {
                ...prev,
                weekOccurrences: newWeekOccurrences,
            };
        });
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

    const handleQuickSave = async () => {
        if (!formData.name.trim()) return;
        if (formData.isRecurring && formData.selectedDays.length === 0) return;

        if (editingClass) {
            // Update existing class
            const updatedClass: ScheduledClass = {
                ...editingClass,
                name: formData.name,
                category: formData.category,
                durationHours: formData.duration,
                daysOfWeek: formData.isRecurring ? formData.selectedDays : undefined,
                startTime: formData.startTime,
                startDate: formData.startDate,
                endDate: formData.endDate || undefined,
                isRecurring: formData.isRecurring,
                weekOccurrences: formData.weekOccurrences.length > 0 ? formData.weekOccurrences : undefined,
            };
            await updateSchedule(updatedClass);
        } else {
            // Create new schedule
            await addSchedule(
                formData.name,
                formData.category,
                formData.duration,
                formData.selectedDays,
                0,
                formData.startDate,
                formData.isRecurring,
                undefined,
                formData.startTime,
                formData.endDate || undefined,
                formData.weekOccurrences.length > 0 ? formData.weekOccurrences : undefined
            );
        }

        setShowQuickAdd(false);
        setQuickAddDay(null);
        resetForm();
    };

    const handleLogActivity = async (cls: ScheduledClass, date: Date, status: 'attended' | 'missed' = 'attended') => {
        try {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;

            await addActivity(
                cls.name,
                cls.category,
                cls.durationHours,
                0,
                'neutral' as const,
                dateString,
                null,
                status
            );
            const statusEmoji = status === 'missed' ? '⚠️' : '✅';
            const statusText = status === 'missed' ? 'Logged as missed' : 'Logged';
            alert(`${statusEmoji} ${statusText} "${cls.name}" for ${date.toLocaleDateString()}`);
        } catch (error) {
            console.error('Failed to log activity:', error);
            alert('Failed to log activity. Please try again.');
        }
    };

    const handleOpenEdit = (cls: ScheduledClass, dayIndex?: number) => {
        // For time-only edits (specific day time changes)
        if (dayIndex !== undefined) {
            setEditingClass(cls);
            setQuickEditDay(dayIndex);
            setQuickEditTime(getTimeForDay(cls, dayIndex));
            setShowQuickEditTime(true);
            return;
        }

        // For recurring events, show scope selector
        if (cls.isRecurring && (cls.daysOfWeek || cls.dayOfWeek !== undefined)) {
            setPendingEditAction({ class: cls, action: 'edit' });
            setShowEditScopeModal(true);
            return;
        }

        // For one-time events, edit directly
        setEditingClass(cls);
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
            weekOccurrences: cls.weekOccurrences || [],
        });
        setShowQuickAdd(true);
    };

    const handleQuickEditTimeSave = async () => {
        if (!editingClass || quickEditDay === null) return;

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

    const handleDelete = async (cls: ScheduledClass | string) => {
        const classObj = typeof cls === 'string'
            ? scheduledClasses.find(c => c.id === cls)
            : cls;

        if (!classObj) return;

        // For recurring events, show scope selector
        if (classObj.isRecurring && (classObj.daysOfWeek || classObj.dayOfWeek !== undefined)) {
            setPendingEditAction({ class: classObj, action: 'delete' });
            setShowEditScopeModal(true);
            return;
        }

        // For one-time events, delete directly with confirmation
        if (window.confirm(`Remove "${classObj.name}"?`)) {
            try {
                await deleteSchedule(classObj.id);
                setShowQuickAdd(false);
                resetForm();
            } catch (error) {
                console.error('Failed to delete schedule:', error);
                alert('Failed to delete activity. Please try again.');
            }
        }
    };

    const handleEditScopeSelection = async (scope: 'this' | 'future' | 'all') => {
        if (!pendingEditAction) return;

        const { class: cls, action, dayIndex } = pendingEditAction;
        setShowEditScopeModal(false);

        if (action === 'delete') {
            if (!window.confirm(`Remove "${cls.name}"?`)) {
                setPendingEditAction(null);
                return;
            }

            try {
                if (scope === 'all') {
                    // Delete entire series
                    await deleteSchedule(cls.id);
                } else {
                    // For "this" or "future", set end date
                    const today = new Date().toISOString().split('T')[0];
                    const updatedClass = {
                        ...cls,
                        endDate: scope === 'this' ? today : today
                    };
                    await updateSchedule(updatedClass);
                }
                setShowQuickAdd(false);
                resetForm();
            } catch (error) {
                console.error('Failed to delete schedule:', error);
                alert('Failed to delete activity. Please try again.');
            }
        } else if (action === 'edit') {
            // For edit, open the form
            setEditingClass(cls);
            const days = cls.daysOfWeek || (cls.dayOfWeek !== undefined ? [cls.dayOfWeek] : [0]);

            setFormData({
                name: cls.name,
                category: cls.category,
                day: days[0] || 0,
                selectedDays: days,
                startTime: cls.startTime || '09:00',
                duration: cls.durationHours,
                startDate: scope === 'future' ? new Date().toISOString().split('T')[0] : cls.startDate,
                endDate: cls.endDate || '',
                isRecurring: cls.isRecurring !== false,
                weekOccurrences: cls.weekOccurrences || [],
            });
            setShowQuickAdd(true);
        }

        setPendingEditAction(null);
    };

    const getTimeForDay = (cls: ScheduledClass, dayIndex: number): string => {
        if (cls.dayTimeMap && cls.dayTimeMap[dayIndex.toString()]) {
            return cls.dayTimeMap[dayIndex.toString()];
        }
        return cls.startTime || '09:00';
    };

    const getActivityStatus = (className: string, date: Date): 'attended' | 'missed' | 'cancelled' | null => {
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const loggedActivity = activities.find(act =>
            act.name === className &&
            act.timestamp.startsWith(dateString)
        );
        return loggedActivity?.status || null;
    };

    // Helper to calculate which week of the month a date falls on (1-5)
    const getWeekOfMonth = (date: Date): number => {
        const dayOfMonth = date.getDate();
        return Math.ceil(dayOfMonth / 7);
    };

    const getClassesForDate = (date: Date) => {
        const dayIndex = date.getDay();
        // Normalize date to midnight for comparison (avoid timezone issues)
        const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        return scheduledClasses.filter(cls => {
            if (cls.status !== 'active') return false;

            const occursOnDay = cls.daysOfWeek
                ? cls.daysOfWeek.includes(dayIndex)
                : cls.dayOfWeek === dayIndex;

            if (occursOnDay) {
                // Parse dates as local dates (not UTC) to avoid timezone offset issues
                const [startYear, startMonth, startDay] = cls.startDate.split('-').map(Number);
                const start = new Date(startYear, startMonth - 1, startDay);

                let end = null;
                if (cls.endDate) {
                    const [endYear, endMonth, endDay] = cls.endDate.split('-').map(Number);
                    end = new Date(endYear, endMonth - 1, endDay);
                }

                const inDateRange = normalizedDate >= start && (!end || normalizedDate <= end);

                // If weekOccurrences is specified, also check if this date falls on the right week
                if (inDateRange && cls.weekOccurrences && cls.weekOccurrences.length > 0) {
                    const weekOfMonth = getWeekOfMonth(date);
                    return cls.weekOccurrences.includes(weekOfMonth);
                }

                return inDateRange;
            }
            return false;
        }).sort((a, b) => {
            const timeA = getTimeForDay(a, dayIndex);
            const timeB = getTimeForDay(b, dayIndex);
            return timeA.localeCompare(timeB);
        });
    };

    const weekDays = useMemo(() => {
        const start = new Date(currentWeek);
        const day = start.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        start.setDate(start.getDate() + diff);

        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [currentWeek]);

    const monthGrid = useMemo(() => {
        const year = currentWeek.getFullYear();
        const month = currentWeek.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells = [];
        const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
        for (let i = 0; i < adjustedFirstDay; i++) cells.push(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));

        return cells;
    }, [currentWeek]);

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

    const nextUp = upcomingClasses[0];

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

            {/* Calendar Planner Section */}
            <div className="px-4 space-y-6">
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
                    <div className="space-y-3">
                        {weekDays.map((date, idx) => {
                            const classes = getClassesForDate(date);
                            const isToday = date.toDateString() === new Date().toDateString();
                            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                            const dayHours = classes.reduce((sum, cls) => sum + cls.durationHours, 0);

                            return (
                                <div
                                    key={idx}
                                    className={`bg-white rounded-2xl border-2 p-4 md:p-5 transition-all ${
                                        isToday
                                            ? 'border-[#A8C5A8] shadow-md shadow-[#A8C5A8]/20'
                                            : 'border-slate-100'
                                    }`}
                                >
                                    {/* Day Header - Horizontal */}
                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                                        <div className="flex items-center gap-4">
                                            <div className={`text-3xl font-black ${isToday ? 'text-[#A8C5A8]' : 'text-slate-900'}`}>
                                                {date.getDate()}
                                            </div>
                                            <div>
                                                <div className={`text-sm font-black uppercase tracking-wider ${isToday ? 'text-[#A8C5A8]' : 'text-slate-400'}`}>
                                                    {DAYS[date.getDay()]}
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium">
                                                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {dayHours > 0 && (
                                                <div className="text-right">
                                                    <div className="text-xs text-slate-400 font-bold uppercase">Total</div>
                                                    <div className="text-xl font-black text-[#A8C5A8]">{dayHours}h</div>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleQuickAdd(date.getDay())}
                                                className="w-10 h-10 rounded-xl bg-[#A8C5A8] text-white flex items-center justify-center hover:bg-[#8ba78b] transition-all shadow-sm"
                                            >
                                                <ICONS.Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Activities List */}
                                    {classes.length > 0 ? (
                                        <div className="space-y-3">
                                            {classes.map(cls => {
                                                const iconKey = cls.name.toLowerCase().replace(/\s+/g, '_');
                                                const hasCustomIcon = child?.activityIcons?.[iconKey];
                                                const dayTime = getTimeForDay(cls, date.getDay());
                                                const activityStatus = getActivityStatus(cls.name, date);

                                                return (
                                                    <div
                                                        key={cls.id}
                                                        className={`rounded-xl p-4 group hover:bg-slate-100 transition-colors relative ${
                                                            activityStatus === 'missed'
                                                                ? 'bg-amber-50 border-2 border-amber-200'
                                                                : activityStatus === 'attended'
                                                                ? 'bg-green-50 border-2 border-green-200'
                                                                : 'bg-slate-50'
                                                        }`}
                                                    >
                                                        {activityStatus && (
                                                            <div className="absolute top-2 right-2">
                                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[8px] font-black uppercase ${
                                                                    activityStatus === 'missed'
                                                                        ? 'bg-amber-500 text-white'
                                                                        : 'bg-green-500 text-white'
                                                                }`}>
                                                                    {activityStatus === 'missed' ? '⚠ Missed' : '✓ Done'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-start gap-3 mb-3">
                                                            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-xl border border-slate-100 flex-shrink-0">
                                                                {hasCustomIcon ? (
                                                                    <img
                                                                        src={child.activityIcons[iconKey]}
                                                                        alt={cls.name}
                                                                        className="w-7 h-7 object-contain"
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
                                                                <h4 className="font-bold text-base text-slate-900 leading-tight">
                                                                    {cls.name}
                                                                </h4>
                                                                <div className="flex items-center gap-2 text-xs font-bold mt-1.5">
                                                                    <span className="text-slate-500">{dayTime}</span>
                                                                    <span className="text-slate-300">•</span>
                                                                    <span className="text-[#A8C5A8]">{cls.durationHours}h</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Action Buttons - Always Visible in vertical layout */}
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {/* Only show logging buttons for past dates and today */}
                                                            {(isPast || isToday) && (
                                                                <>
                                                                    {isPast ? (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleLogActivity(cls, date, 'missed')}
                                                                                className="col-span-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:shadow-md transition-all"
                                                                            >
                                                                                ⚠ Log Missed
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleLogActivity(cls, date, 'attended')}
                                                                                className="py-2.5 bg-gradient-to-r from-[#A8C5A8] to-[#8ba78b] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:shadow-md transition-all"
                                                                            >
                                                                                ✓ Attended
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handleLogActivity(cls, date, 'attended')}
                                                                            className="col-span-2 py-2.5 bg-gradient-to-r from-[#A8C5A8] to-[#8ba78b] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:shadow-md transition-all"
                                                                        >
                                                                            ✓ Log It
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                            <button
                                                                onClick={() => handleOpenEdit(cls, date.getDay())}
                                                                className="py-2.5 bg-white rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200"
                                                            >
                                                                Edit Time
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenEdit(cls)}
                                                                className="py-2.5 bg-blue-50 rounded-xl text-xs font-black uppercase tracking-wider text-blue-600 hover:bg-blue-100 transition-colors"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(cls)}
                                                                className="py-2.5 bg-red-50 rounded-xl text-xs font-black uppercase tracking-wider text-red-600 hover:bg-red-100 transition-colors"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-slate-400">
                                            <div className="text-3xl mb-2">📅</div>
                                            <p className="text-xs font-medium">No activities scheduled</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Month View */}
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
                                                            ${!day ? 'bg-transparent' : isToday ? 'bg-[#A8C5A8] hover:bg-[#8ba78b] cursor-pointer' : 'bg-slate-50 hover:bg-slate-100 cursor-pointer'}
                                                            ${isToday ? 'text-white font-black' : 'text-slate-700'}
                                                            ${isSelected && !isToday ? 'ring-2 ring-[#A8C5A8] bg-[#A8C5A8]/10' : ''}
                                                            transition-all relative group
                                                        `}
                                                    >
                                                        {day && (
                                                            <>
                                                                <span className={`text-sm font-bold ${isToday ? 'text-white' : ''}`}>{day.getDate()}</span>
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
                                            const activityStatus = getActivityStatus(cls.name, selectedMonthDate);

                                            return (
                                                <div
                                                    key={cls.id}
                                                    className={`rounded-xl p-4 group relative hover:bg-slate-100 transition-colors ${
                                                        activityStatus === 'missed'
                                                            ? 'bg-amber-50 border-2 border-amber-200'
                                                            : activityStatus === 'attended'
                                                            ? 'bg-green-50 border-2 border-green-200'
                                                            : 'bg-slate-50'
                                                    }`}
                                                >
                                                    {activityStatus && (
                                                        <div className="absolute top-2 right-2">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[8px] font-black uppercase ${
                                                                activityStatus === 'missed'
                                                                    ? 'bg-amber-500 text-white'
                                                                    : 'bg-green-500 text-white'
                                                            }`}>
                                                                {activityStatus === 'missed' ? '⚠ Missed' : '✓ Done'}
                                                            </span>
                                                        </div>
                                                    )}
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
                                                        {/* Only show logging buttons for past dates and today */}
                                                        {selectedMonthDate && (selectedMonthDate < new Date(new Date().setHours(0, 0, 0, 0)) || selectedMonthDate.toDateString() === new Date().toDateString()) && (
                                                            <>
                                                                {selectedMonthDate < new Date(new Date().setHours(0, 0, 0, 0)) ? (
                                                                    <>
                                                                        <button
                                                                            onClick={() => selectedMonthDate && handleLogActivity(cls, selectedMonthDate, 'missed')}
                                                                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:shadow-md transition-all"
                                                                        >
                                                                            ⚠ Log Missed
                                                                        </button>
                                                                        <button
                                                                            onClick={() => selectedMonthDate && handleLogActivity(cls, selectedMonthDate, 'attended')}
                                                                            className="w-full py-2 bg-gradient-to-r from-[#A8C5A8] to-[#8ba78b] text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:shadow-md transition-all"
                                                                        >
                                                                            ✓ Attended
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => selectedMonthDate && handleLogActivity(cls, selectedMonthDate, 'attended')}
                                                                        className="w-full py-2 bg-gradient-to-r from-[#A8C5A8] to-[#8ba78b] text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:shadow-md transition-all"
                                                                    >
                                                                        ✓ Log It
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleOpenEdit(cls)}
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
            </div>

            {/* AI Insights */}
            {readings.length > 0 && (
                <div className="px-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 ml-2">AI Insights</h3>
                        <button
                            onClick={generateReading}
                            disabled={isLoading}
                            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            <ICONS.Sparkles className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                            {isLoading ? 'Analyzing...' : 'Generate New'}
                        </button>
                    </div>

                    {readings.slice(0, 3).map((reading) => (
                        <div key={reading.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="text-[9px] font-black uppercase tracking-wider text-[#A8C5A8] mb-2">
                                        {new Date(reading.timestamp).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </div>
                                    <h4 className="font-black text-slate-900 text-lg mb-2">{reading.architecture}</h4>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Current Reading</p>
                                    <p className="text-base text-slate-700 leading-relaxed">{reading.currentReading}</p>
                                </div>

                                {reading.forecast && (
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Forecast</p>
                                        <p className="text-base text-slate-700 leading-relaxed">{reading.forecast}</p>
                                    </div>
                                )}

                                {reading.scienceBackground && (
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Science Background</p>
                                        <p className="text-sm text-slate-600 leading-relaxed">{reading.scienceBackground}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Generate Insights Button (if no readings) */}
            {readings.length === 0 && (
                <div className="px-4">
                    <button
                        onClick={generateReading}
                        disabled={isLoading}
                        className="w-full py-6 bg-gradient-to-r from-[#A8C5A8] to-[#8ba78b] text-white rounded-[32px] font-black uppercase tracking-wider hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        <ICONS.Sparkles className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Generating AI Insights...' : 'Generate AI Insights'}
                    </button>
                </div>
            )}

            {/* Edit Scope Modal - Google Calendar style */}
            {showEditScopeModal && pendingEditAction && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
                        onClick={() => {
                            setShowEditScopeModal(false);
                            setPendingEditAction(null);
                        }}
                    />

                    <div className="relative bg-white rounded-t-[32px] md:rounded-[32px] w-full max-w-md shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-bottom-0">
                        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                            <h3 className="text-xl font-black text-slate-900">
                                {pendingEditAction.action === 'delete' ? 'Remove Recurring Activity' : 'Edit Recurring Activity'}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">{pendingEditAction.class.name}</p>
                        </div>

                        <div className="p-6 space-y-3">
                            <button
                                onClick={() => handleEditScopeSelection('this')}
                                className="w-full p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-[#A8C5A8] transition-all text-left group"
                            >
                                <div className="text-base font-black text-slate-900 group-hover:text-[#A8C5A8] transition-colors">
                                    This event only
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {pendingEditAction.action === 'delete'
                                        ? 'Remove only this occurrence'
                                        : 'Modify only this occurrence'}
                                </div>
                            </button>

                            <button
                                onClick={() => handleEditScopeSelection('future')}
                                className="w-full p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-[#A8C5A8] transition-all text-left group"
                            >
                                <div className="text-base font-black text-slate-900 group-hover:text-[#A8C5A8] transition-colors">
                                    This and future events
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {pendingEditAction.action === 'delete'
                                        ? 'Remove this and all future occurrences'
                                        : 'Modify this and all future occurrences'}
                                </div>
                            </button>

                            <button
                                onClick={() => handleEditScopeSelection('all')}
                                className="w-full p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-[#A8C5A8] transition-all text-left group"
                            >
                                <div className="text-base font-black text-slate-900 group-hover:text-[#A8C5A8] transition-colors">
                                    All events
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {pendingEditAction.action === 'delete'
                                        ? 'Remove all occurrences in the series'
                                        : 'Modify all occurrences in the series'}
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setShowEditScopeModal(false);
                                    setPendingEditAction(null);
                                }}
                                className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors mt-4"
                            >
                                Cancel
                            </button>
                        </div>
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
                                {editingClass ? 'Edit Activity' : `Quick Add - ${DAYS[quickAddDay ?? 0]}`}
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

                            {/* Recurring Toggle */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-400 ml-1 block">
                                    Activity Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isRecurring: true })}
                                        className={`py-3 px-4 rounded-xl border-2 transition-all ${
                                            formData.isRecurring
                                                ? 'border-[#A8C5A8] bg-[#A8C5A8] text-white'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="text-sm font-black">🔄 Recurring</div>
                                        <div className="text-[8px] font-medium opacity-70 mt-0.5">Repeats weekly</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isRecurring: false })}
                                        className={`py-3 px-4 rounded-xl border-2 transition-all ${
                                            !formData.isRecurring
                                                ? 'border-[#A8C5A8] bg-[#A8C5A8] text-white'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="text-sm font-black">📅 One-time</div>
                                        <div className="text-[8px] font-medium opacity-70 mt-0.5">Single event</div>
                                    </button>
                                </div>
                            </div>

                            {/* Multi-day selector (only for recurring) */}
                            {formData.isRecurring && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-wider text-slate-400 ml-1 block">
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

                                    {/* Week Occurrence Selector */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-wider text-slate-400 ml-1 block">
                                            Weeks of Month (Optional)
                                        </label>
                                        <p className="text-[10px] text-slate-500 ml-1 mb-2">
                                            Leave empty for every week, or select specific weeks (e.g., 1st & 3rd for twice monthly)
                                        </p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {[
                                                { num: 1, label: '1st' },
                                                { num: 2, label: '2nd' },
                                                { num: 3, label: '3rd' },
                                                { num: 4, label: '4th' },
                                                { num: 5, label: '5th' }
                                            ].map(week => {
                                                const isSelected = formData.weekOccurrences.includes(week.num);
                                                return (
                                                    <button
                                                        key={week.num}
                                                        type="button"
                                                        onClick={() => toggleWeekOccurrence(week.num)}
                                                        className={`py-2 px-1 rounded-lg border-2 transition-all ${
                                                            isSelected
                                                                ? 'border-[#A8C5A8] bg-[#A8C5A8] text-white'
                                                                : 'border-slate-200 bg-white text-slate-600'
                                                        }`}
                                                    >
                                                        <div className="text-[10px] font-black">{week.label}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Date Fields */}
                            <div className={`grid ${formData.isRecurring ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                                <div>
                                    <label className="text-xs font-black uppercase tracking-wider text-slate-400 ml-1 mb-2 block">
                                        {formData.isRecurring ? 'Start Date' : 'Event Date'}
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-[#A8C5A8] outline-none font-semibold text-slate-900 text-sm"
                                    />
                                </div>
                                {formData.isRecurring && (
                                    <div>
                                        <label className="text-xs font-black uppercase tracking-wider text-slate-400 ml-1 mb-2 block">
                                            End Date (Optional)
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            placeholder="Ongoing"
                                            min={formData.startDate}
                                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-[#A8C5A8] outline-none font-semibold text-slate-900 text-sm placeholder:text-slate-400"
                                        />
                                    </div>
                                )}
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
                                {editingClass && (
                                    <button
                                        onClick={() => handleDelete(editingClass)}
                                        className="px-6 py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                                    >
                                        Delete
                                    </button>
                                )}
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
                                    {editingClass ? 'Update' : 'Add'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
