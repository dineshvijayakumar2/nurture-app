import * as React from 'react';
import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useFamily } from '../context/FamilyContext';
import { ICONS, PREDEFINED_ICONS } from '../constants';
import { ActivityCategory, ScheduledClass } from '../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- Helper Components ---

const ClassListItem: React.FC<{ cls: ScheduledClass, onDelete: (id: string) => void, onEdit: (cls: ScheduledClass) => void }> = ({ cls, onDelete, onEdit }) => {
    const isPast = cls.endDate && new Date(cls.endDate) < new Date();
    return (
        <div className={`bg-white p-6 rounded-[32px] border ${isPast ? 'border-slate-50 opacity-60' : 'border-slate-100'} flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group`}>
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {PREDEFINED_ICONS[cls.category] || '🌟'}
                </div>
                <div>
                    <h4 className="font-bold text-slate-900">{cls.name}</h4>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {cls.isRecurring !== false ? (
                            <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <span className="text-[#A8C5A8]">Weekly</span>
                                <span>{DAYS[cls.dayOfWeek || 0]} @ {cls.startTime}</span>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Specific Dates</span>
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                    {(cls.specificDates || []).slice(0, 3).map(d => (
                                        <span key={d} className="px-2 py-0.5 rounded-full bg-slate-100 text-[8px] font-bold text-slate-500">{d}</span>
                                    ))}
                                    {(cls.specificDates?.length || 0) > 3 && (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[8px] font-bold text-slate-400">+{cls.specificDates!.length - 3} more</span>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-slate-300">
                            <span>Started {cls.startDate}</span>
                            {cls.endDate && <span>• Ends {cls.endDate}</span>}
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {cls.status === 'active' ? (
                        <span className="text-[#A8C5A8]">Active</span>
                    ) : (
                        <span className="text-slate-300">{cls.status}</span>
                    )}
                </div>
                <div className="flex gap-3">
                    <button onClick={() => onEdit(cls)} className="text-[#A8C5A8] hover:text-[#8ba78b] text-xs font-bold transition-colors">Edit</button>
                    <button onClick={() => onDelete(cls.id)} className="text-red-300 hover:text-red-500 text-xs font-bold transition-colors">Remove</button>
                </div>
            </div>
        </div>
    );
};

const MonthCell: React.FC<{ date: Date, classes: ScheduledClass[] }> = ({ date, classes }) => {
    const isToday = new Date().toDateString() === date.toDateString();
    return (
        <div className={`min-h-[100px] p-2 rounded-2xl border ${isToday ? 'bg-slate-50 border-slate-200' : 'bg-white border-transparent hover:border-slate-50'} transition-all`}>
            <div className={`text-[10px] font-black mb-2 ${isToday ? 'text-slate-900' : 'text-slate-300'}`}>{date.getDate()}</div>
            <div className="space-y-1">
                {classes.map(c => (
                    <div key={c.id} className="px-2 py-1 rounded-lg bg-[#A8C5A8]/10 text-[#A8C5A8] text-[9px] font-bold truncate">
                        {c.name}
                    </div>
                ))}
            </div>
        </div>
    );
};

export const Rhythm: React.FC = () => {
    const { scheduledClasses, addSchedule, updateSchedule, deleteSchedule, moveClass, isLoading } = useFamily();
    const [viewMode, setViewMode] = useState<'week' | 'month' | 'list'>('week');
    const [plannerModal, setPlannerModal] = useState<'none' | 'schedule' | 'edit'>('none');
    const [currentClass, setCurrentClass] = useState<ScheduledClass | null>(null);

    // Local Form State
    const [entryName, setEntryName] = useState('');
    const [entryCategory, setEntryCategory] = useState<ActivityCategory>('art');
    const [entryDuration, setEntryDuration] = useState(1);
    const [isRecurring, setIsRecurring] = useState(true);
    const [entryDay, setEntryDay] = useState(new Date().getDay());
    const [specificDates, setSpecificDates] = useState<string[]>([]);
    const [entryCost, setEntryCost] = useState(0);
    const [entryStatus, setEntryStatus] = useState<'active' | 'paused' | 'discontinued'>('active');
    const [entryStartDate, setEntryStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [entryStartTime, setEntryStartTime] = useState("09:00");

    const resetForm = () => {
        setCurrentClass(null);
        setEntryName('');
        setEntryCategory('art');
        setEntryDuration(1);
        setIsRecurring(true);
        setEntryDay(new Date().getDay());
        setSpecificDates([]);
        setEntryCost(0);
        setEntryStatus('active');
        setEntryStartDate(new Date().toISOString().split('T')[0]);
        setEntryStartTime("09:00");
    };

    const handleEditRequest = (cls: ScheduledClass) => {
        setCurrentClass(cls);
        setEntryName(cls.name);
        setEntryCategory(cls.category);
        setEntryDuration(cls.durationHours);
        setIsRecurring(cls.isRecurring !== false);
        setEntryDay(cls.dayOfWeek || 0);
        setSpecificDates(cls.specificDates || []);
        setEntryCost(cls.cost || 0);
        setEntryStatus(cls.status);
        setEntryStartDate(cls.startDate || new Date().toISOString().split('T')[0]);
        setEntryStartTime(cls.startTime || "09:00");
        setPlannerModal('edit');
    };

    const handleSaveSchedule = async () => {
        if (plannerModal === 'edit' && currentClass) {
            await updateSchedule({
                ...currentClass,
                name: entryName,
                category: entryCategory,
                durationHours: entryDuration,
                startTime: entryStartTime,
                isRecurring,
                dayOfWeek: isRecurring ? entryDay : undefined,
                specificDates: isRecurring ? undefined : specificDates,
                cost: entryCost,
                status: entryStatus,
                startDate: entryStartDate,
            });
        } else {
            await addSchedule(entryName, entryCategory, entryDuration, entryDay, entryCost, entryStartDate, isRecurring, specificDates);
            // Storage doesn't yet support startTime in addSchedule but we should add it if needed
        }
        setPlannerModal('none');
        resetForm();
    };

    const selectBulkDates = (type: 'weekends' | 'next-4-weeks') => {
        const dates: string[] = [];
        const today = new Date();
        if (type === 'weekends') {
            for (let i = 0; i < 28; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                if (d.getDay() === 0 || d.getDay() === 6) {
                    dates.push(d.toISOString().split('T')[0]);
                }
            }
        } else if (type === 'next-4-weeks') {
            const targetDay = today.getDay();
            for (let i = 0; i < 4; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + (i * 7));
                dates.push(d.toISOString().split('T')[0]);
            }
        }
        setSpecificDates([...new Set([...specificDates, ...dates])].sort());
    };

    const addSpecificDate = () => setSpecificDates([...specificDates, ""]);
    const updateSpecificDate = (idx: number, val: string) => {
        const next = [...specificDates];
        next[idx] = val;
        setSpecificDates(next);
    };
    const removeSpecificDate = (idx: number) => setSpecificDates(specificDates.filter((_, i) => i !== idx));

    const [viewDate, setViewDate] = useState(new Date());

    const handleNavigate = (direction: number) => {
        const next = new Date(viewDate);
        if (viewMode === 'month') {
            next.setMonth(next.getMonth() + direction);
        } else if (viewMode === 'week') {
            next.setDate(next.getDate() + (direction * 7));
        }
        setViewDate(next);
    };

    const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const calendarGrid = useMemo(() => {
        if (viewMode !== 'month') return [];
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const cells = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));
        return cells;
    }, [viewMode, viewDate]);

    const weekDays = useMemo(() => {
        const start = new Date(viewDate);
        start.setDate(start.getDate() - start.getDay());
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [viewDate]);

    const getClassesForDate = (date: Date) => {
        if (!date) return [];
        const dayIndex = date.getDay();
        const dateStr = date.toISOString().split('T')[0];

        return scheduledClasses.filter(s => {
            if (s.status !== 'active') return false;
            if (s.isRecurring !== false) {
                return (
                    s.dayOfWeek === dayIndex &&
                    (!s.startDate || new Date(s.startDate) <= date) &&
                    (!s.endDate || new Date(s.endDate) >= date)
                );
            } else {
                return s.specificDates?.includes(dateStr);
            }
        });
    };

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        const newDayIndex = parseInt(destination.droppableId);
        const cls = scheduledClasses.find(c => c.id === draggableId);
        if (cls && cls.isRecurring === false) return;
        if (newDayIndex !== parseInt(source.droppableId)) {
            moveClass(draggableId, newDayIndex);
        }
    };

    return (
        <div className="space-y-8 pb-32 animate-in fade-in duration-700 h-full flex flex-col">
            <header className="flex justify-between items-center px-4 shrink-0">
                <div className="flex items-center gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Rhythm</h2>
                        <div className="flex items-center gap-3">
                            <p className="text-xs font-black text-[#A8C5A8] uppercase tracking-[0.3em]">{monthName}</p>
                            {viewMode !== 'list' && (
                                <div className="flex gap-1">
                                    <button onClick={() => handleNavigate(-1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 inline-block transition-all">←</button>
                                    <button onClick={() => handleNavigate(1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 inline-block transition-all">→</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="bg-slate-100 p-1 rounded-2xl flex mr-4 hidden md:flex">
                        {['week', 'month', 'list'].map(m => (
                            <button key={m} onClick={() => setViewMode(m as any)} className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === m ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>
                                {m}
                            </button>
                        ))}
                    </div>
                    {!isLoading && (
                        <button onClick={() => setPlannerModal('schedule')} className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl active:scale-90 transition-all"><ICONS.Plus className="w-6 h-6" /></button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-x-auto overflow-y-auto px-4 pb-4 no-scrollbar">
                {viewMode === 'week' && (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex gap-4 h-full min-w-[1000px]">
                            {weekDays.map((dateObj, index) => (
                                <Droppable key={index} droppableId={index.toString()}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`flex-1 rounded-[40px] p-4 flex flex-col gap-4 transition-colors ${snapshot.isDraggingOver ? 'bg-[#A8C5A8]/10' : 'bg-slate-50 border border-slate-100'}`}
                                        >
                                            <div className="text-center py-2">
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{DAYS[index]}</h3>
                                                <span className="text-[10px] font-bold text-slate-300">{dateObj.getDate()}</span>
                                            </div>
                                            <div className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
                                                {getClassesForDate(dateObj)
                                                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                                    .map((s, idx) => (
                                                        <Draggable key={s.id} draggableId={s.id} index={idx} isDragDisabled={s.isRecurring === false}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={`bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 group relative cursor-pointer ${snapshot.isDragging ? 'rotate-3 scale-105 shadow-2xl z-50' : 'hover:scale-[1.02] transition-transform'}`}
                                                                    style={provided.draggableProps.style}
                                                                    onClick={() => handleEditRequest(s)}
                                                                >
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <div className="text-3xl">{PREDEFINED_ICONS[s.category] || '🌟'}</div>
                                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <ICONS.Plus className="w-4 h-4 text-slate-300 rotate-45" />
                                                                        </div>
                                                                    </div>
                                                                    <h4 className="font-bold text-slate-900 leading-tight mb-1">{s.name}</h4>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.startTime}</span>
                                                                        <span className="text-[10px] font-black text-[#A8C5A8] uppercase tracking-widest">{s.durationHours}h</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                {provided.placeholder}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            ))}
                        </div>
                    </DragDropContext>
                )}

                {viewMode === 'month' && (
                    <div className="grid grid-cols-7 gap-4 min-w-[700px]">
                        {DAYS.map(d => <div key={d} className="text-center text-xs font-black text-slate-300 uppercase tracking-widest py-4">{d}</div>)}
                        {calendarGrid.map((date, i) => (
                            date ? <MonthCell key={i} date={date} classes={getClassesForDate(date)} /> : <div key={i}></div>
                        ))}
                    </div>
                )}

                {viewMode === 'list' && (
                    <div className="space-y-8 max-w-3xl mx-auto">
                        {Array.from(new Set(scheduledClasses.map(s => s.name))).map(name => {
                            const group = scheduledClasses.filter(s => s.name === name);
                            return (
                                <div key={name} className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#A8C5A8] ml-4">{name} Series</h3>
                                    <div className="space-y-3">
                                        {group.map(s => (
                                            <ClassListItem key={s.id} cls={s} onDelete={deleteSchedule} onEdit={handleEditRequest} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {scheduledClasses.length === 0 && (
                            <div className="py-20 text-center space-y-4">
                                <div className="text-4xl">🗓️</div>
                                <p className="text-slate-400 font-bold">No classes scheduled yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            {plannerModal !== 'none' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl animate-in fade-in" onClick={() => setPlannerModal('none')}></div>
                    <div className="bg-white rounded-[64px] p-8 max-w-2xl w-full shadow-2xl relative z-10 space-y-8 overflow-y-auto max-h-[90vh] no-scrollbar">
                        <div className="flex justify-between items-center">
                            <h3 className="text-3xl font-black text-slate-900">{plannerModal === 'edit' ? 'Edit' : 'Add'} Class</h3>
                            <button onClick={() => setPlannerModal('none')} className="text-slate-300 font-bold">Close</button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-300 tracking-widest ml-4">Class Details</label>
                                <input value={entryName} onChange={e => setEntryName(e.target.value)} placeholder="Class Name" className="w-full px-8 py-6 rounded-3xl bg-slate-50 font-bold border-2 border-transparent focus:border-[#A8C5A8] outline-none transition-all" />
                            </div>

                            <div className="flex gap-4 p-1 bg-slate-100 rounded-3xl">
                                <button onClick={() => setIsRecurring(true)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isRecurring ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>Weekly</button>
                                <button onClick={() => setIsRecurring(false)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!isRecurring ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>Specific Dates</button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-300 tracking-widest ml-4">Category</label>
                                    <select value={entryCategory} onChange={e => setEntryCategory(e.target.value as any)} className="w-full px-8 py-6 rounded-3xl bg-slate-50 font-bold outline-none border-2 border-transparent focus:border-[#A8C5A8] transition-all">
                                        <option value="art">🎨 Art</option>
                                        <option value="sport">⚽ Sport</option>
                                        <option value="academic">📚 Academic</option>
                                        <option value="media">🎬 Media</option>
                                        <option value="adhoc">✨ Adhoc</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-300 tracking-widest ml-4">Hours</label>
                                    <input type="number" step="0.5" value={entryDuration} onChange={e => setEntryDuration(parseFloat(e.target.value))} className="w-full px-8 py-6 rounded-3xl bg-slate-50 font-bold outline-none border-2 border-transparent focus:border-[#A8C5A8] transition-all" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-300 tracking-widest ml-4">Start Time</label>
                                <input type="time" value={entryStartTime} onChange={e => setEntryStartTime(e.target.value)} className="w-full px-8 py-6 rounded-3xl bg-slate-50 font-bold outline-none border-2 border-transparent focus:border-[#A8C5A8] transition-all" />
                            </div>

                            {isRecurring ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-300 tracking-widest ml-4">Day</label>
                                        <select value={entryDay} onChange={e => setEntryDay(parseInt(e.target.value))} className="w-full px-8 py-6 rounded-3xl bg-slate-50 font-bold outline-none border-2 border-transparent focus:border-[#A8C5A8] transition-all">
                                            {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-300 tracking-widest ml-4">Starts From</label>
                                        <input type="date" value={entryStartDate} onChange={e => setEntryStartDate(e.target.value)} className="w-full px-8 py-6 rounded-3xl bg-slate-50 font-bold outline-none border-2 border-transparent focus:border-[#A8C5A8] transition-all" />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center ml-4">
                                        <label className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Scheduled Dates</label>
                                        <div className="flex gap-2">
                                            <button onClick={() => selectBulkDates('weekends')} className="text-[8px] font-black uppercase tracking-widest text-[#A8C5A8] hover:bg-slate-50 px-2 py-1 rounded-lg transition-all">Weekends</button>
                                            <button onClick={() => selectBulkDates('next-4-weeks')} className="text-[8px] font-black uppercase tracking-widest text-[#A8C5A8] hover:bg-slate-50 px-2 py-1 rounded-lg transition-all">Next 4 {DAYS[new Date().getDay()]}s</button>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {specificDates.map((d, i) => (
                                                <div key={i} className="bg-slate-50 px-4 py-2 rounded-xl flex items-center gap-2 group animate-in zoom-in-50">
                                                    <span className="text-xs font-bold text-slate-600">{d}</span>
                                                    <button onClick={() => removeSpecificDate(i)} className="text-slate-300 hover:text-red-500 transition-colors">×</button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="date" onChange={e => {
                                                if (e.target.value && !specificDates.includes(e.target.value)) {
                                                    setSpecificDates([...specificDates, e.target.value].sort());
                                                }
                                            }} className="flex-1 px-8 py-4 rounded-2xl bg-slate-50 font-bold outline-none border-2 border-transparent focus:border-[#A8C5A8] transition-all" />
                                        </div>
                                        <p className="text-[9px] font-medium text-slate-400 italic text-center">Tip: Use the buttons above for quick bulk selection.</p>
                                    </div>
                                </div>
                            )}

                            <button onClick={handleSaveSchedule} disabled={!entryName.trim() || (!isRecurring && specificDates.length === 0)} className="w-full py-8 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-[0.4em] text-[10px] shadow-2xl active:scale-95 disabled:opacity-20 transition-all mt-4">Save to Rhythm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
