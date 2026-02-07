
import React from 'react';
import { NeuralReading } from '../types';

interface InsightCardViewProps {
  reading: NeuralReading;
}

export const InsightCardView: React.FC<InsightCardViewProps> = ({ reading }) => {
  return (
    <div className="bg-[#111827] rounded-[56px] p-10 shadow-2xl border border-white/5 relative overflow-hidden group animate-in zoom-in duration-700">
      {/* Gentle glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] -mr-40 -mt-40"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#A8C5A8]/5 rounded-full blur-[100px] -ml-40 -mb-40"></div>

      <header className="relative z-10 mb-12 text-center">
        <div className="inline-block px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-[#A8C5A8] uppercase tracking-[0.5em] mb-6">
          Growth Update
        </div>
        <h3 className="text-4xl font-black text-white font-['Quicksand'] tracking-tighter mb-4 group-hover:scale-105 transition-transform duration-500">
          {reading.architecture}
        </h3>
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">{new Date(reading.timestamp).toLocaleDateString()}</p>
      </header>

      <div className="space-y-12 relative z-10">
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10"></div>
            <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">The Story So Far</h4>
            <div className="h-px flex-1 bg-white/10"></div>
          </div>
          <div className="text-white text-2xl leading-[1.7] font-medium italic text-center px-4 whitespace-pre-wrap">
            "{reading.currentReading}"
          </div>
        </section>

        <section className="bg-white/5 backdrop-blur-md rounded-[48px] p-10 border border-white/10">
          <h4 className="text-xs font-black text-[#A8C5A8] uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#A8C5A8] animate-pulse"></span> Look for next
          </h4>
          <div className="text-white/90 text-[19px] font-bold leading-[1.65] mb-8 whitespace-pre-wrap">
            {reading.forecast}
          </div>
          <div className="p-6 bg-indigo-500/10 rounded-3xl border border-indigo-500/20">
            <p className="text-[11px] text-indigo-300 font-black uppercase tracking-widest mb-2">A goal for now</p>
            <p className="text-lg text-white/70 font-bold leading-relaxed whitespace-pre-wrap">{reading.milestoneWindow}</p>
          </div>
        </section>

        {reading.activityTrends && (
          <section className="bg-indigo-950/20 rounded-[48px] p-10 border border-indigo-500/10">
            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.4em] mb-6">Activity Trends</h4>
            <div className="text-white/80 text-lg leading-relaxed whitespace-pre-wrap">
              {reading.activityTrends}
            </div>
          </section>
        )}

        <section className="space-y-6">
          <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] text-center">Helpful Science</h4>
          <div className="text-white/60 text-lg leading-relaxed text-center px-4 font-medium whitespace-pre-wrap">
            {reading.scienceBackground}
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-6">
            {reading.citations?.map((c, i) => (
              <span key={i} className="px-4 py-2 bg-white/5 text-[10px] font-black text-white/30 rounded-xl uppercase tracking-widest border border-white/5">
                {c}
              </span>
            ))}
          </div>
        </section>

        <button className="w-full py-7 bg-white text-slate-900 rounded-[32px] font-black uppercase tracking-[0.4em] text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-2xl">
          More Details →
        </button>
      </div>
    </div>
  );
};
