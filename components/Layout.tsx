import { ReactNode } from 'react';
import { ICONS } from '../constants';
import { ChildProfile, ParentProfile } from '../types';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  child: ChildProfile;
  currentParent?: ParentProfile;
  onProfileClick: () => void;
  isProcessing?: boolean;
}

export const Layout = ({
  children,
  activeTab,
  setActiveTab,
  child,
  currentParent,
  onProfileClick,
  isProcessing = false
}: LayoutProps) => {
  const navItems = [
    { id: 'home', icon: ICONS.Home, label: 'Home' },
    { id: 'journal', icon: ICONS.Log, label: 'Journal' },
    { id: 'activities', icon: ICONS.Timeline, label: 'Activities' },
    { id: 'coach', icon: ICONS.Sparkles, label: 'Coach' },
    { id: 'wisdom', icon: ICONS.Values, label: 'Research' },
  ];

  const getActiveIndex = () => {
    const idx = navItems.findIndex(item => item.id === activeTab);
    return idx === -1 ? 0 : idx;
  };

  return (
    <div className="flex flex-col min-h-screen max-w-5xl mx-auto bg-[#FFF9E6] shadow-[0_0_100px_rgba(168,197,168,0.1)] overflow-hidden relative font-['Outfit'] border-x border-white/20">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className={`absolute top-[-10%] left-[-10%] w-[80%] h-[50%] bg-[#A8C5A8] blur-[140px] rounded-full transition-all duration-1000 ${isProcessing ? 'animate-pulse scale-110' : ''}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[80%] h-[50%] bg-[#6B9AC4] blur-[140px] rounded-full transition-all duration-1000 delay-500 ${isProcessing ? 'animate-pulse scale-110' : ''}`}></div>
      </div>

      <header className="px-8 md:px-14 py-8 flex justify-between items-center bg-white/40 backdrop-blur-md border-b border-white/20 sticky top-0 z-[60]">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-[20px] bg-[#A8C5A8] flex items-center justify-center shadow-xl rotate-3">
            <span className="text-3xl">🌱</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 font-['Quicksand']">Nurture</h1>
        </div>
        
        <button
          onClick={onProfileClick}
          className="relative transition-transform active:scale-90 group"
        >
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-slate-100 overflow-hidden group-hover:border-[#A8C5A8] transition-colors">
            {currentParent?.photoUrl ? (
              <img
                src={currentParent.photoUrl}
                alt={currentParent.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent && !parent.querySelector('.fallback-icon')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'fallback-icon w-full h-full bg-gradient-to-br from-[#A8C5A8] to-[#6B9AC4] flex items-center justify-center text-white font-black text-xl';
                    fallback.textContent = currentParent?.name?.[0] || '👤';
                    parent.appendChild(fallback);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#A8C5A8] to-[#6B9AC4] flex items-center justify-center text-white font-black text-xl">
                {currentParent?.name ? currentParent.name[0] : '👤'}
              </div>
            )}
          </div>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-40 md:pb-48 px-8 md:px-14 pt-6 relative z-10">
        {children}
      </main>

      <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 w-[94%] max-w-2xl z-[70]">
        <nav className="bg-slate-950/95 backdrop-blur-3xl rounded-[44px] p-4 flex justify-between items-center shadow-2xl border border-white/10 relative">
          <div 
            className="absolute h-14 w-[18%] bg-white/10 border border-white/5 rounded-[28px] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{ left: `calc(${getActiveIndex() * 20}% + 16px)` }}
          />
          
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2 relative z-10 transition-all duration-300 ${
                activeTab === item.id ? 'text-white scale-110' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <item.icon className={`w-6 h-6 mb-1.5 ${activeTab === item.id ? 'drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]' : ''}`} />
              <span className="hidden sm:block text-[9px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};
