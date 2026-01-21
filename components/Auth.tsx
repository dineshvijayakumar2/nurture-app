
import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentDomain, setCurrentDomain] = useState('');

  useEffect(() => {
    setCurrentDomain(window.location.hostname);
  }, []);

  const formatError = (err: any) => {
    const code = err.code;
    if (code === 'auth/unauthorized-domain') {
      return `Domain Not Authorized: Please go to Firebase Console > Auth > Settings > Authorized Domains and add "${currentDomain}".`;
    }
    if (code === 'auth/user-not-found') {
      return 'Account not found. Please sign up.';
    }
    if (code === 'auth/wrong-password') {
      return 'Incorrect password. Try again.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Sign-in window was closed before completion.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'This sign-in method is disabled in Firebase Console.';
    }
    return err.message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(formatError(err));
      console.error("Auth Error Detail:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9E6] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <div className="w-20 h-20 bg-[#A8C5A8] rounded-3xl mx-auto flex items-center justify-center shadow-lg transform -rotate-6 transition-transform hover:rotate-0 cursor-default">
            <span className="text-4xl">🌱</span>
          </div>
          <h1 className="text-4xl font-bold text-[#4A5568] tracking-tight">Nurture</h1>
          <p className="text-gray-500 font-medium">Your child's developmental companion</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl space-y-6 border border-gray-100">
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-left">
              <p className="text-[11px] text-red-600 font-bold uppercase tracking-wider mb-1">Configuration Error</p>
              <p className="text-xs text-red-500 leading-relaxed font-medium">
                {error}
              </p>
              {error.includes('Authorized Domains') && (
                <div className="mt-2 p-2 bg-white rounded border border-red-100 select-all font-mono text-[10px] text-gray-600">
                  {currentDomain}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#A8C5A8] text-sm text-gray-800 placeholder-gray-400 outline-none transition-all"
                placeholder="parent@example.com"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#A8C5A8] text-sm text-gray-800 placeholder-gray-400 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#A8C5A8] text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Working...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-300 bg-white px-2">OR CONTINUE WITH</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={handleGuest}
              disabled={loading}
              className="py-3 bg-gray-50 text-gray-500 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Guest
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] text-[#6B9AC4] font-bold uppercase tracking-widest mt-4 hover:underline block mx-auto transition-all"
          >
            {isLogin ? "Need an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>

        <p className="text-[10px] text-gray-400 max-w-[240px] mx-auto uppercase tracking-tighter leading-relaxed">
          Nurture encrypts child data and follows developmental privacy standards.
        </p>
      </div>
    </div>
  );
};
