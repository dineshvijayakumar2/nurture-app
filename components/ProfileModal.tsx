
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { ChildProfile } from '../types';
import { ICONS } from '../constants';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: ChildProfile) => void;
  initialData: ChildProfile;
  familyId: string;
  onJoinFamily: (fid: string) => void;
  onNeuralBurn: () => void;
}

const DIET_TYPES = ['none', 'vegan', 'vegetarian', 'omnivore'] as const;

export const ProfileModal: React.FC<ProfileModalProps> = ({ 
  isOpen, onClose, onSave, initialData, familyId, onJoinFamily, onNeuralBurn 
}) => {
  const [formData, setFormData] = useState({
    name: initialData.name,
    age: initialData.age.toString(),
    activities: initialData.activities.join(', '),
    temperament: initialData.temperament,
    photoUrl: initialData.photoUrl || '',
    dietType: initialData.dietaryPreferences?.type || 'none',
    allergies: initialData.dietaryPreferences?.allergies.join(', ') || ''
  });
  
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData.name,
        age: initialData.age.toString(),
        activities: initialData.activities.join(', '),
        temperament: initialData.temperament,
        photoUrl: initialData.photoUrl || '',
        dietType: initialData.dietaryPreferences?.type || 'none',
        allergies: initialData.dietaryPreferences?.allergies.join(', ') || ''
      });
    }
  }, [isOpen, initialData]);

  const onCropComplete = useCallback((_: any, pixels: any) => setCroppedAreaPixels(pixels), []);

  const handleSave = () => {
    onSave({
      ...initialData,
      name: formData.name,
      age: parseInt(formData.age) || initialData.age,
      activities: formData.activities.split(',').map(s => s.trim()).filter(s => s),
      temperament: formData.temperament,
      photoUrl: formData.photoUrl,
      dietaryPreferences: {
        type: formData.dietType as any,
        allergies: formData.allergies.split(',').map(s => s.trim()).filter(s => s)
      }
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xl" onClick={onClose}></div>
      <div className="bg-white/95 backdrop-blur-3xl w-full max-w-lg rounded-[56px] p-10 shadow-2xl relative animate-in zoom-in duration-500 overflow-y-auto max-h-[90vh] no-scrollbar">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Settings</h2>
          <button onClick={onClose} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center"><ICONS.Close className="w-6 h-6" /></button>
        </div>

        <div className="space-y-10">
          <div className="flex flex-col items-center">
            <div onClick={() => fileInputRef.current?.click()} className="w-32 h-32 rounded-[40px] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer">
              {formData.photoUrl ? <img src={formData.photoUrl} className="w-full h-full object-cover" /> : <ICONS.Camera className="w-10 h-10 text-slate-200" />}
            </div>
            <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setTempPhotoUrl(reader.result as string); reader.readAsDataURL(file); } }} className="hidden" />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
              <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Age</label>
              <input type="number" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold" />
            </div>
          </div>

          <div className="space-y-6 pt-6 border-t border-slate-50">
             <h3 className="text-[11px] font-black text-[#A8C5A8] uppercase tracking-[0.4em]">Nutrition & Preferences</h3>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dietary Preference</label>
                  <select value={formData.dietType} onChange={e => setFormData({ ...formData, dietType: e.target.value })} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold">
                    {DIET_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allergies</label>
                  <input value={formData.allergies} onChange={e => setFormData({ ...formData, allergies: e.target.value })} placeholder="Nuts, Milk, etc." className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold" />
                </div>
             </div>
          </div>

          <button onClick={handleSave} className="w-full py-8 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-[0.4em] text-xs shadow-xl active:scale-95 transition-all">Save Profile</button>

          <div className="bg-slate-950 p-8 rounded-[40px] text-white">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Family Secure ID</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-white/10 p-4 rounded-2xl text-[11px] font-mono truncate">{familyId}</div>
              <button onClick={() => { navigator.clipboard.writeText(familyId); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="px-6 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase">{copied ? 'Copied' : 'Copy'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
