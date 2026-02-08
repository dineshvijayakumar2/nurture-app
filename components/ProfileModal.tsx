import { useState, useRef, useEffect } from 'react';
import { ChildProfile, ParentProfile } from '../types';
import { ICONS } from '../constants';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedProfile: ChildProfile) => void;
    onSaveParent: (profile: ParentProfile) => void;
    initialData: ChildProfile;
    currentUser: { uid: string; displayName: string | null; email: string | null; photoURL: string | null } | null;
    parents: ParentProfile[];
    familyId: string;
    onJoinFamily: (fid: string) => void;
    onRemoveParent: (userId: string) => void;
    onLeaveFamily: () => void;
    onNeuralBurn: () => void;
    onLogout: () => void;
}

const DIET_TYPES = ['none', 'vegan', 'vegetarian', 'omnivore'] as const;

export const ProfileModal = ({
    isOpen,
    onClose,
    onSave,
    onSaveParent,
    initialData,
    currentUser,
    parents,
    familyId,
    onRemoveParent,
    onLeaveFamily,
    onLogout
}: ProfileModalProps) => {
    const [activeTab, setActiveTab] = useState<'child' | 'parent'>('child');
    const [copied, setCopied] = useState(false);

    // Child profile state
    const [childData, setChildData] = useState({
        name: initialData.name,
        age: initialData.age.toString(),
        activities: initialData.activities.join(', '),
        temperament: initialData.temperament,
        photoUrl: initialData.photoUrl || '',
        dietType: initialData.dietaryPreferences?.type || 'none',
        allergies: initialData.dietaryPreferences?.allergies.join(', ') || ''
    });

    // Parent profile state
    const currentParent = parents.find(p => p.id === currentUser?.uid);
    const [parentData, setParentData] = useState({
        name: currentParent?.name || currentUser?.displayName || '',
        email: currentParent?.email || currentUser?.email || '',
        photoUrl: currentParent?.photoUrl || currentUser?.photoURL || '',
        role: currentParent?.role || 'primary' as 'primary' | 'partner' | 'family'
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setChildData({
                name: initialData.name,
                age: initialData.age.toString(),
                activities: initialData.activities.join(', '),
                temperament: initialData.temperament,
                photoUrl: initialData.photoUrl || '',
                dietType: initialData.dietaryPreferences?.type || 'none',
                allergies: initialData.dietaryPreferences?.allergies.join(', ') || ''
            });

            const updatedParent = parents.find(p => p.id === currentUser?.uid);
            setParentData({
                name: updatedParent?.name || currentUser?.displayName || '',
                email: updatedParent?.email || currentUser?.email || '',
                photoUrl: updatedParent?.photoUrl || currentUser?.photoURL || '',
                role: updatedParent?.role || 'primary'
            });
        }
    }, [isOpen, initialData, currentUser, parents]);

    const handleSaveChild = () => {
        onSave({
            ...initialData,
            name: childData.name,
            age: parseInt(childData.age) || initialData.age,
            activities: childData.activities.split(',').map((s: string) => s.trim()).filter((s: string) => s),
            temperament: childData.temperament,
            photoUrl: childData.photoUrl,
            dietaryPreferences: {
                type: childData.dietType as any,
                allergies: childData.allergies.split(',').map((s: string) => s.trim()).filter((s: string) => s)
            }
        });
        onClose();
    };

    const handleSaveParent = () => {
        if (!currentUser) return;
        onSaveParent({
            id: currentUser.uid,
            name: parentData.name,
            email: parentData.email,
            photoUrl: parentData.photoUrl || undefined,
            role: parentData.role
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-24 md:py-28 overflow-hidden">
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xl" onClick={onClose}></div>
            <div className="bg-white/95 backdrop-blur-3xl w-full max-w-2xl rounded-[56px] p-10 shadow-2xl relative animate-in zoom-in duration-500 overflow-y-auto max-h-full no-scrollbar">
                <div className="flex justify-between items-center mb-10">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Family Settings</h2>
                    <button onClick={onClose} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
                        <ICONS.Close className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 p-1 bg-slate-50 rounded-[24px]">
                    <button
                        onClick={() => setActiveTab('child')}
                        className={`flex-1 py-3 px-6 rounded-[20px] font-black text-sm transition-all ${
                            activeTab === 'child'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        👶 Child Profile
                    </button>
                    <button
                        onClick={() => setActiveTab('parent')}
                        className={`flex-1 py-3 px-6 rounded-[20px] font-black text-sm transition-all ${
                            activeTab === 'parent'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        👤 Your Profile
                    </button>
                </div>

                {/* Child Profile Tab */}
                {activeTab === 'child' && (
                    <div className="space-y-8">
                        <div className="flex flex-col items-center">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-32 h-32 rounded-[40px] bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer hover:border-slate-300 transition-colors"
                            >
                                {childData.photoUrl ? (
                                    <img
                                        src={childData.photoUrl}
                                        className="w-full h-full object-cover"
                                        alt="Child"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const cameraIcon = document.createElement('div');
                                            cameraIcon.innerHTML = '📷';
                                            cameraIcon.className = 'text-5xl';
                                            e.currentTarget.parentElement!.appendChild(cameraIcon);
                                        }}
                                    />
                                ) : (
                                    <ICONS.Camera className="w-10 h-10 text-slate-200" />
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            const result = reader.result as string;
                                            setChildData({ ...childData, photoUrl: result });
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                className="hidden"
                                accept="image/*"
                            />
                            <p className="mt-3 text-xs text-slate-400 font-bold">Click to change photo</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    Child's Name
                                </label>
                                <input
                                    value={childData.name}
                                    onChange={e => setChildData({ ...childData, name: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#A8C5A8]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Age</label>
                                <input
                                    type="number"
                                    value={childData.age}
                                    onChange={e => setChildData({ ...childData, age: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#A8C5A8]"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Temperament / Personality
                            </label>
                            <input
                                value={childData.temperament}
                                onChange={e => setChildData({ ...childData, temperament: e.target.value })}
                                placeholder="e.g., Curious, energetic, thoughtful"
                                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#A8C5A8]"
                            />
                        </div>

                        <div className="space-y-6 pt-6 border-t border-slate-50">
                            <h3 className="text-[11px] font-black text-[#A8C5A8] uppercase tracking-[0.4em]">
                                🍎 Nutrition & Preferences
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Dietary Preference
                                    </label>
                                    <select
                                        value={childData.dietType}
                                        onChange={e => setChildData({ ...childData, dietType: e.target.value as typeof DIET_TYPES[number] })}
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#A8C5A8]"
                                    >
                                        {DIET_TYPES.map(t => (
                                            <option key={t} value={t}>
                                                {t.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Allergies
                                    </label>
                                    <input
                                        value={childData.allergies}
                                        onChange={e => setChildData({ ...childData, allergies: e.target.value })}
                                        placeholder="Nuts, Milk, etc."
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#A8C5A8]"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSaveChild}
                            className="w-full py-8 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-[0.4em] text-xs shadow-xl hover:bg-slate-800 active:scale-95 transition-all"
                        >
                            Save Child Profile
                        </button>
                    </div>
                )}

                {/* Parent Profile Tab */}
                {activeTab === 'parent' && (
                    <div className="space-y-8">
                        <div className="bg-gradient-to-br from-[#A8C5A8]/10 to-slate-50 rounded-[32px] p-8 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-[24px] bg-slate-200 flex items-center justify-center text-3xl overflow-hidden">
                                    {parentData.photoUrl ? (
                                        <img
                                            src={parentData.photoUrl}
                                            className="w-full h-full object-cover"
                                            alt="Parent"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement!.textContent = '👤';
                                            }}
                                        />
                                    ) : (
                                        '👤'
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-black text-slate-900">{currentUser?.displayName || 'Parent'}</h3>
                                    <p className="text-sm text-slate-500 font-medium">{currentUser?.email}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Display Name
                                    </label>
                                    <input
                                        value={parentData.name}
                                        onChange={e => setParentData({ ...parentData, name: e.target.value })}
                                        className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#A8C5A8]"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Role in Family
                                    </label>
                                    <select
                                        value={parentData.role}
                                        onChange={e => setParentData({ ...parentData, role: e.target.value as any })}
                                        className="w-full px-6 py-4 rounded-2xl bg-white border border-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-[#A8C5A8]"
                                    >
                                        <option value="primary">Primary Parent</option>
                                        <option value="partner">Partner</option>
                                        <option value="family">Family Member</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveParent}
                                className="w-full py-6 bg-slate-900 text-white rounded-[24px] font-black uppercase tracking-[0.4em] text-xs shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
                            >
                                Save Your Profile
                            </button>
                        </div>

                        {/* Family Members */}
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">
                                👨‍👩‍👧‍👦 Family Members ({parents.length})
                            </h3>
                            <div className="space-y-2">
                                {parents.map(parent => {
                                    const isCurrentUser = parent.id === currentUser?.uid;
                                    const currentUserParent = parents.find(p => p.id === currentUser?.uid);
                                    const canRemove = currentUserParent?.role === 'primary' && !isCurrentUser;

                                    return (
                                        <div
                                            key={parent.id}
                                            className="bg-slate-50 rounded-[24px] p-4 flex items-center gap-3"
                                        >
                                            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
                                                {parent.photoUrl ? (
                                                    <img
                                                        src={parent.photoUrl}
                                                        className="w-full h-full object-cover"
                                                        alt={parent.name}
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.parentElement!.textContent = '👤';
                                                        }}
                                                    />
                                                ) : (
                                                    '👤'
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm text-slate-900">{parent.name}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">
                                                    {parent.role === 'primary' ? '⭐ Primary' : parent.role}
                                                </p>
                                            </div>
                                            {isCurrentUser ? (
                                                <span className="text-[10px] font-black text-[#A8C5A8] bg-[#A8C5A8]/10 px-3 py-1 rounded-full">
                                                    YOU
                                                </span>
                                            ) : canRemove ? (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`Remove ${parent.name} from the family?`)) {
                                                            onRemoveParent(parent.id);
                                                        }
                                                    }}
                                                    className="text-[10px] font-black text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Leave Family Button */}
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to leave this family? You will lose access to all family data.')) {
                                    onLeaveFamily();
                                    onClose();
                                }
                            }}
                            className="w-full py-4 bg-red-50 text-red-600 rounded-[24px] font-bold text-sm hover:bg-red-100 active:scale-95 transition-all border border-red-200"
                        >
                            🚪 Leave Family
                        </button>

                        {/* Logout Button */}
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to log out?')) {
                                    onLogout();
                                    onClose();
                                }
                            }}
                            className="w-full py-4 bg-slate-100 text-slate-700 rounded-[24px] font-bold text-sm hover:bg-slate-200 active:scale-95 transition-all border border-slate-300"
                        >
                            🔓 Logout
                        </button>

                        {/* Family ID Section */}
                        <div className="bg-slate-950 p-8 rounded-[40px] text-white space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">
                                🔐 Family Secure ID
                            </p>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-white/10 p-4 rounded-2xl text-[11px] font-mono truncate">
                                    {familyId}
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(familyId);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="px-6 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-100 transition-colors"
                                >
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                            <p className="text-[10px] text-white/60 font-medium">
                                Share this ID with family members to give them access to your family's nurture space.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
