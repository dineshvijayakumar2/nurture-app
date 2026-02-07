import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { Value, ValueDialogue, KnowledgeSource } from '../types';
import { generateValueDialogue } from '../services/geminiService';
import { ICONS } from '../constants';

export const ValueGarden: React.FC = () => {
    const { child, logs, knowledge, addKnowledge, deleteKnowledge } = useFamily();
    const [selectedValue, setSelectedValue] = useState<Value | null>(null);
    const [valueDialogue, setValueDialogue] = useState<ValueDialogue | null>(null);
    const [isValueLoading, setIsValueLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'values' | 'wisdom'>('wisdom');
    const [selectedResource, setSelectedResource] = useState<KnowledgeSource | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form State for New Resource
    const [newTitle, setNewTitle] = useState('');
    const [newAuthor, setNewAuthor] = useState('');
    const [newType, setNewType] = useState<'book' | 'article' | 'video'>('book');
    const [newContent, setNewContent] = useState('');

    const handleValueSelect = async (v: Value) => {
        setSelectedValue(v);
        setIsValueLoading(true);
        if (child) {
            const d = await generateValueDialogue(v, child, logs, knowledge);
            setValueDialogue(d);
        }
        setIsValueLoading(false);
    };

    const handleAddResource = async () => {
        if (!newTitle.trim()) return;
        await addKnowledge({
            title: newTitle,
            author: newAuthor,
            type: newType,
            content: newContent,
            timestamp: new Date().toISOString(),
            tags: []
        });
        setNewTitle('');
        setNewAuthor('');
        setNewContent('');
        setShowAddModal(false);
    };

    return (
        <div className="space-y-8 pb-32 animate-in fade-in duration-700 h-full flex flex-col">
            <header className="px-4 shrink-0 flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Value Garden</h2>
                    <p className="text-xs font-black text-[#A8C5A8] uppercase tracking-[0.3em]">Cultivating Wisdom</p>
                </div>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
                    <button onClick={() => setActiveTab('values')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'values' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Values</button>
                    <button onClick={() => setActiveTab('wisdom')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'wisdom' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Wisdom</button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
                {activeTab === 'values' ? (
                    !selectedValue ? (
                        <div className="grid grid-cols-2 gap-6">
                            {Object.values(Value).map(v => (
                                <button key={v} onClick={() => handleValueSelect(v)} className="bg-white p-8 rounded-[40px] border border-slate-100 text-center text-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm group aspect-square flex flex-col items-center justify-center">
                                    <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">🌱</div>
                                    <h4 className="font-black text-[10px] uppercase tracking-[0.3em] leading-relaxed">{v}</h4>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-right duration-500">
                            <button onClick={() => setSelectedValue(null)} className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 hover:text-slate-900 transition-colors">
                                <ICONS.ArrowLeft className="w-4 h-4" /> Back to Garden
                            </button>
                            {isValueLoading ? <div className="py-20 text-center font-black animate-pulse text-slate-300 tracking-widest uppercase text-xs">Synthesizing Dialogue...</div> : valueDialogue && (
                                <div className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl space-y-10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#A8C5A8] rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
                                    <div>
                                        <h3 className="text-4xl font-black tracking-tighter mb-2">{valueDialogue.value}</h3>
                                        <p className="text-slate-400 italic text-lg font-serif">{valueDialogue.philosophicalRoot}</p>
                                    </div>
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8C5A8]">Conversation Starters</h4>
                                        {valueDialogue.conversationStarters.map((s, i) => (
                                            <div key={i} className="bg-white/10 border border-white/10 p-6 rounded-[32px] text-lg font-medium leading-relaxed hover:bg-white/20 transition-colors">"{s}"</div>
                                        ))}
                                    </div>
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#A8C5A8]">Teaching Moment</h4>
                                        {valueDialogue.teachingMoments.map((s, i) => (
                                            <div key={i} className="text-slate-300 leading-relaxed text-sm">{s}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    /* Wisdom Library */
                    <div className="grid grid-cols-2 gap-6 pb-20">
                        <button onClick={() => setShowAddModal(true)} className="aspect-[3/4] rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-slate-300 hover:border-slate-400 hover:text-slate-500 transition-all group">
                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors"><ICONS.Plus className="w-6 h-6" /></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Add Resource</span>
                        </button>

                        {knowledge.map((r) => (
                            <button key={r.id} onClick={() => setSelectedResource(r)} className="relative aspect-[3/4] rounded-[32px] bg-slate-900 overflow-hidden shadow-xl group text-left">
                                {r.cover ? (
                                    <img src={r.cover} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950"></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-6">
                                    <div className="text-[9px] font-black text-[#A8C5A8] uppercase tracking-widest mb-2">{r.type}</div>
                                    <h3 className="text-lg font-bold text-white leading-tight mb-1 line-clamp-2">{r.title}</h3>
                                    <p className="text-xs text-slate-300">{r.author}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Reader View Modal */}
            {selectedResource && (
                <div className="fixed inset-0 z-[200] bg-[#fdfbf7] animate-in fade-in duration-300 flex flex-col">
                    <div className="px-6 py-6 border-b border-stone-200 flex justify-between items-center bg-[#fdfbf7] shrink-0 sticky top-0 z-10">
                        <button onClick={() => setSelectedResource(null)} className="w-10 h-10 rounded-full hover:bg-stone-100 flex items-center justify-center transition-colors">
                            <ICONS.Close className="w-6 h-6 text-stone-600" />
                        </button>
                        <div className="flex gap-4 text-stone-400">
                            <button onClick={async () => {
                                if (window.confirm("Delete this resource?")) {
                                    await deleteKnowledge(selectedResource.id);
                                    setSelectedResource(null);
                                }
                            }} className="w-10 h-10 rounded-full hover:bg-red-50 flex items-center justify-center text-red-300 hover:text-red-500 transition-all">
                                <ICONS.Plus className="w-4 h-4 rotate-45" />
                            </button>
                            <button className="hover:text-stone-900 font-serif font-bold text-xl">Aa</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="max-w-2xl mx-auto px-8 py-12 pb-32">
                            <div className="text-center mb-16 space-y-6">
                                <div className="text-xs font-black tracking-[0.3em] uppercase text-stone-400">{selectedResource.type}</div>
                                <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 leading-tight">{selectedResource.title}</h1>
                                {selectedResource.author && <p className="text-stone-500 font-serif italic text-xl">by {selectedResource.author}</p>}
                            </div>

                            <article className="prose prose-xl prose-stone mx-auto font-serif leading-loose text-stone-800">
                                {selectedResource.content ? (
                                    selectedResource.content.split('\n').map((p, i) => <p key={i} className="mb-6 indent-8 text-xl md:text-2xl opacity-90">{p}</p>)
                                ) : (
                                    <p className="italic text-stone-400 text-center">No content available for reading.</p>
                                )}
                            </article>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Resource Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl" onClick={() => setShowAddModal(false)}></div>
                    <div className="bg-white rounded-[48px] p-10 max-w-xl w-full shadow-2xl relative z-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">Add Wisdom</h3>
                        <div className="space-y-4">
                            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title (e.g. The Whole-Brain Child)" className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold outline-none border-2 border-transparent focus:border-[#A8C5A8] transition-all" />
                            <input value={newAuthor} onChange={e => setNewAuthor(e.target.value)} placeholder="Author" className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold outline-none border-2 border-transparent focus:border-[#A8C5A8] transition-all" />
                            <select value={newType} onChange={e => setNewType(e.target.value as any)} className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold outline-none border-2 border-transparent focus:border-[#A8C5A8] transition-all">
                                <option value="book">Book</option>
                                <option value="article">Article</option>
                                <option value="video">Video</option>
                            </select>
                            <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Paste key concepts or notes here..." rows={6} className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold outline-none border-2 border-transparent focus:border-[#A8C5A8] transition-all resize-none" />
                            <button onClick={handleAddResource} className="w-full py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl active:scale-95 transition-all">Save to Wisdom Library</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
