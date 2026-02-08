import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FamilyProvider, useFamily } from './context/FamilyContext';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { ProfileModal } from './components/ProfileModal';
import { Dashboard } from './pages/Dashboard';
import { Journal } from './pages/Journal';
import { Rhythm } from './pages/Rhythm';
import { Coach } from './pages/Coach';
import { ValueGarden } from './pages/ValueGarden';
import { saveChild } from './services/storageService';

const AppContent = () => {
  const { user, child, parents, familyId, isDemoMode, loginDemo, logout, authLoading, setChild, saveParentProfileData, removeParentFromFamily, leaveFamily, joinFamily, runMigration, wipeData } = useFamily();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Derived active tab from URL, fallback to 'home'
  const activeTab = location.pathname.substring(1) || 'home';

  // Get current logged-in parent profile
  const currentParent = parents.find(p => p.id === user?.uid);

  // We need a way to determine 'activeTab' for Layout based on Route.
  // However, Layout seems to use state. simpler to let Layout use Link/NavLink?
  // For now, I'll pass a dummy setter or refactor Layout.
  // Let's refactor Layout to use useLocation? Or just pass values.

  if (authLoading || (user && !child)) return <div className="min-h-screen bg-[#FFF9E6] flex items-center justify-center animate-pulse text-[#A8C5A8] font-black uppercase tracking-widest">🌱 Nurturing...</div>;
  if (!user) return <Auth onDemoLogin={loginDemo} />;

  return (
    <Layout activeTab={activeTab} setActiveTab={(t) => navigate(`/${t}`)} child={child || {} as any} currentParent={currentParent} onProfileClick={() => setIsProfileModalOpen(true)} isProcessing={false}>
      <div className="max-w-4xl mx-auto pt-4">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Dashboard />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/activities" element={<Rhythm />} />
          <Route path="/coach" element={<Coach />} />
          <Route path="/values" element={<ValueGarden />} />
        </Routes>
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={async (u) => { await saveChild(familyId!, u); setChild(u); }}
        onSaveParent={saveParentProfileData}
        initialData={child || {} as any}
        currentUser={user}
        parents={parents}
        familyId={familyId || ''}
        onJoinFamily={joinFamily}
        onRemoveParent={removeParentFromFamily}
        onLeaveFamily={leaveFamily}
        onNeuralBurn={wipeData}
        onLogout={logout}
      />
    </Layout>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <FamilyProvider>
        <AppContent />
      </FamilyProvider>
    </BrowserRouter>
  );
};

export default App;
