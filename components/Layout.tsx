
import React from 'react';
import { ICONS, COLORS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home', icon: ICONS.Home, label: 'Home' },
    { id: 'logs', icon: ICONS.Log, label: 'Logs' },
    { id: 'insights', icon: ICONS.Timeline, label: 'Insights' },
    { id: 'values', icon: ICONS.Values, label: 'Values' },
  ];

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-[#FFF9E6] shadow-xl overflow-hidden relative">
      <header className="px-6 py-4 flex justify-between items-center bg-[#A8C5A8] text-white">
        <h1 className="text-2xl font-bold tracking-tight">Nurture</h1>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-xs font-bold">M</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-6">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-50">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center space-y-1 transition-colors ${
              activeTab === item.id ? 'text-[#A8C5A8]' : 'text-gray-400'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
