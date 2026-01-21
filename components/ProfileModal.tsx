
import React, { useState } from 'react';
import { ChildProfile } from '../types';
import { ICONS } from '../constants';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: ChildProfile) => void;
  initialData: ChildProfile;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    name: initialData.name,
    age: initialData.age.toString(),
    activities: initialData.activities.join(', '),
    temperament: initialData.temperament
  });

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      ...initialData,
      name: formData.name,
      age: parseInt(formData.age) || initialData.age,
      activities: formData.activities.split(',').map(s => s.trim()).filter(s => s),
      temperament: formData.temperament
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-[#4A5568]">Edit Profile</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <ICONS.Close className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Child's Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#A8C5A8] text-sm text-gray-800"
              placeholder="Name"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Age</label>
            <input
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#A8C5A8] text-sm text-gray-800"
              placeholder="Age"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Activities (comma separated)</label>
            <input
              type="text"
              value={formData.activities}
              onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#A8C5A8] text-sm text-gray-800"
              placeholder="e.g. Reading, Swimming, Dance"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Temperament & Personality</label>
            <textarea
              value={formData.temperament}
              onChange={(e) => setFormData({ ...formData, temperament: e.target.value })}
              className="w-full h-24 p-4 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#A8C5A8] resize-none text-sm text-gray-800"
              placeholder="Describe your child's personality..."
            />
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-gray-500 font-bold uppercase tracking-widest text-xs border border-gray-200 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-[#A8C5A8] text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-md active:scale-95 transition-transform"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
