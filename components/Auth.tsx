
import React, { useState } from 'react';
// Using namespaced import for auth functions to resolve resolution issues
import * as firebaseAuth from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

interface AuthProps {
  onDemoLogin?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onDemoLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await firebaseAuth.signInWithEmailAndPassword(auth, email, password);
      } else {
        await firebaseAuth.createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) { 
      setError("We couldn't sign you in. Please check your details and try again."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try { 
      await firebaseAuth.signInWithPopup(auth, googleProvider); 
    } catch (err: any) { 
      setError("Google sign-in didn't work. Try again?"); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9E6] flex flex-col items-center justify-center p-8 font-['Outfit']">
      <div className="w-full max-w-sm space-y-12 text-center">
        <div className="space-y-4">
          <div className="w-24 h-24 bg-[#A8C5A8] rounded-3xl mx-auto flex items-center justify-center shadow-xl transform -rotate-6 transition-transform hover:rotate-0">
            <span className="text-5xl">🌱</span>
          </div>
          <h1 className="text-5xl font-black text-slate-800 tracking-tight font-['Quicksand']">Nurture</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[11px]">Your Parenting Companion</p>
        </div>

        <div className="bg-white p-10 rounded-[48px] shadow-2xl space-y-8 border border-white">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{isLogin ? 'Welcome Back' : 'Join Our Home'}</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-100 p-6 rounded-2xl text-left">
              <p className="text-sm text-red-700 leading-relaxed font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Email Address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-6 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#A8C5A8] outline-none text-lg text-slate-900 font-bold placeholder-slate-300 transition-all" placeholder="your@email.com" />
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-6 py-5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#A8C5A8] outline-none text-lg text-slate-900 font-bold placeholder-slate-300 transition-all" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-6 bg-[#A8C5A8] text-white rounded-[28px] font-black uppercase tracking-[0.4em] text-xs shadow-xl active:scale-95 transition-all">
              {loading ? 'Entering...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300 bg-white px-4 tracking-[0.3em]">OR</div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button onClick={handleGoogleSignIn} disabled={loading} className="flex items-center justify-center gap-4 py-6 bg-white border-2 border-slate-50 text-slate-700 rounded-[28px] font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-50 transition-all shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google Login
            </button>
            <button onClick={onDemoLogin} className="py-6 bg-indigo-50 text-indigo-600 rounded-[28px] font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-100 transition-all">
              Try Demo Mode
            </button>
          </div>

          <button onClick={() => setIsLogin(!isLogin)} className="text-[11px] text-[#6B9AC4] font-black uppercase tracking-[0.3em] mt-6 hover:underline">
            {isLogin ? "Need a new account?" : "Already joined us?"}
          </button>
        </div>
        
        <p className="text-[10px] text-slate-400 max-w-[280px] mx-auto uppercase tracking-widest leading-relaxed font-bold">
          Your family's privacy is our highest priority. Everything you share is kept safe and local.
        </p>
      </div>
    </div>
  );
};
