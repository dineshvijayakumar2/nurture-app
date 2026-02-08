import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useFamily } from '../context/FamilyContext';
import { ICONS } from '../constants';

export const Coach: React.FC = () => {
    const { chatMessages, sendChatMessage, isLoading } = useFamily();
    const [chatInput, setChatInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;
        sendChatMessage(chatInput);
        setChatInput('');
    };

    return (
        <div className="flex flex-col h-[80vh] pb-32">
            <header className="px-4 mb-8">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">AI Coach</h2>
                <p className="text-xs font-black text-[#6B9AC4] uppercase tracking-[0.3em]">Supportive Support</p>
            </header>
            <div className="flex-1 bg-white/50 backdrop-blur-3xl rounded-[56px] border border-white p-10 space-y-12 overflow-y-auto no-scrollbar shadow-inner">
                {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#A8C5A8]/20 to-[#6B9AC4]/20 flex items-center justify-center">
                            <ICONS.Sparkles className="w-12 h-12 text-[#A8C5A8]" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Start a Conversation</h3>
                            <p className="text-slate-500 font-medium max-w-md">
                                Ask me anything about child development, parenting strategies, or get personalized advice based on your observations.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {chatMessages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-10 py-8 rounded-[48px] text-xl ${msg.role === 'user' ? 'bg-[#A8C5A8] text-white rounded-tr-none font-bold' : 'bg-slate-900 text-white rounded-tl-none font-medium'}`}>
                                    {msg.role === 'model' ? (
                                        <ReactMarkdown
                                            components={{
                                                p: ({ node, ...props }) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
                                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                h1: ({ node, ...props }) => <h1 className="text-3xl font-black mb-4 mt-6" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-2xl font-bold mb-3 mt-5" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-xl font-bold mb-2 mt-4" {...props} />,
                                                strong: ({ node, ...props }) => <strong className="font-black text-[#A8C5A8]" {...props} />,
                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-[#A8C5A8] pl-4 italic my-4" {...props} />,
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    ) : (
                                        msg.text
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </>
                )}
            </div>
            <div className="mt-8 flex gap-4 px-4 items-center">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Ask about her development..." className="flex-1 bg-white px-10 py-8 rounded-[40px] border border-slate-100 text-2xl font-bold text-slate-900 placeholder:text-slate-400 shadow-2xl outline-none focus:border-[#A8C5A8] transition-all" />
                <button onClick={handleSendMessage} className="w-20 h-20 bg-slate-900 text-white rounded-[32px] flex items-center justify-center shadow-2xl active:scale-95 transition-all"><ICONS.Plus className="w-10 h-10 rotate-45" /></button>
            </div>
        </div>
    );
};
