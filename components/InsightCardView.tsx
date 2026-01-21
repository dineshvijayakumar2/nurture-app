
import React from 'react';
import { InsightCard } from '../types';

interface InsightCardViewProps {
  insight: InsightCard;
}

export const InsightCardView: React.FC<InsightCardViewProps> = ({ insight }) => {
  return (
    <div className="bg-white rounded-2xl border-2 border-[#A8C5A8] p-6 shadow-sm mb-6">
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-2xl">🌱</span>
        <h3 className="font-bold text-lg text-[#4A5568] uppercase tracking-wide">{insight.title}</h3>
      </div>

      <div className="space-y-4">
        <section>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Observation</h4>
          <p className="text-[#4A5568] text-sm leading-relaxed">{insight.observation}</p>
        </section>

        <section className="bg-[#FFF9E6] -mx-6 px-6 py-4 border-y border-[#A8C5A8]/30">
          <h4 className="text-xs font-bold text-[#A8C5A8] uppercase tracking-widest mb-1">Research Insight</h4>
          <p className="text-[#4A5568] text-sm italic leading-relaxed">"{insight.researchInsight}"</p>
          <div className="mt-2 text-[10px] font-bold text-gray-500 uppercase">
            Source: {insight.citation.author} ({insight.citation.source})
          </div>
        </section>

        <section>
          <h4 className="text-xs font-bold text-[#6B9AC4] uppercase tracking-widest mb-1">Actionable Steps</h4>
          <ul className="list-disc list-inside text-sm text-[#4A5568] space-y-1">
            {insight.actionItems.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="bg-[#E8A598]/10 rounded-xl p-3 border border-[#E8A598]/20">
          <h4 className="text-xs font-bold text-[#E8A598] uppercase tracking-widest mb-1">Conversation Starter</h4>
          <p className="text-sm font-medium text-[#4A5568]">"{insight.conversationStarter}"</p>
        </section>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
        {insight.values.map((v, i) => (
          <span key={i} className="px-2 py-1 bg-gray-100 text-[10px] font-bold text-gray-500 rounded uppercase tracking-tighter">
            {v}
          </span>
        ))}
      </div>
    </div>
  );
};
