import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, ArrowRight, Sparkles, AlertCircle, Loader2, X, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { firebaseService } from '../services/firebase';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  onGuest: () => void;
  onClose?: () => void;
}

export default function AuthScreen({ onLogin, onGuest, onClose }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const GoogleLogo = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );

  const mapFirebaseUser = (fbUser: any): User => ({
    id: fbUser.uid,
    name: fbUser.displayName || 'Guest',
    email: fbUser.email || '',
    avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.uid}`
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const fbUser = await firebaseService.loginEmail(formData.email, formData.password);
        onLogin(mapFirebaseUser(fbUser));
      } else {
        if (!formData.name) throw new Error("Name is required");
        const fbUser = await firebaseService.registerEmail(formData.email, formData.password, formData.name);
        onLogin(mapFirebaseUser(fbUser));
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("not configured")) {
        setError("Missing Firebase Config! Please check README.");
      } else if (err.code === 'auth/invalid-credential') {
        setError("Invalid email or password.");
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Email already in use.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const fbUser = await firebaseService.loginGoogle();
      onLogin(mapFirebaseUser(fbUser));
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("not configured")) {
        setError("Missing Firebase Config! Please check README.");
      } else {
        setError("Google Sign-in failed. Popup closed or not authorized.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#030303] border border-[#1a1a1a] rounded-3xl p-8 shadow-2xl relative w-full h-full md:h-auto overflow-y-auto">
      {onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
          <X size={20} />
        </button>
      )}

      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border border-[#222] mb-4">
          <span className="text-black font-bold font-['Space_Grotesk'] text-2xl tracking-tighter">N.</span>
        </div>
        <h1 className="text-2xl font-bold font-['Space_Grotesk'] tracking-tight text-white mb-1">
          {isLogin ? 'Welcome Back' : 'Join Neby'}
        </h1>
        <p className="text-zinc-500 text-sm">Sign in to save your history</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Name</label>
            <div className="relative">
              <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your name"
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-[#444] transition-all"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Email</label>
          <div className="relative">
            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="name@example.com"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-[#444] transition-all"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              placeholder="••••••••"
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl py-3 pl-10 pr-12 text-sm text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-[#444] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:outline-none p-1"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-black hover:bg-zinc-200 font-semibold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group mt-2"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              {isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#222]"></div></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#030303] px-2 text-zinc-600 font-['Space_Grotesk'] tracking-wider">Or</span></div>
      </div>

      <div className="space-y-3">
        <button 
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-[#0a0a0a] border border-[#222] text-zinc-300 font-medium py-3 rounded-xl hover:bg-[#111] transition-colors flex items-center justify-center gap-2"
        >
          <GoogleLogo />
          <span>Continue with Google</span>
        </button>
      </div>

      <div className="mt-8 text-center text-sm text-zinc-500">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button 
          onClick={() => { setIsLogin(!isLogin); setError(null); }}
          className="text-white hover:text-zinc-300 font-medium underline-offset-4 hover:underline transition-all"
        >
          {isLogin ? "Sign up" : "Log in"}
        </button>
      </div>
    </div>
  );
}