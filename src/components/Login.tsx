import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Logo } from './Logo';
import { Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

export const Login: React.FC = () => {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange in App.tsx picks up the new session automatically.
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Account created. Check your email to confirm, then sign in.');
        toast.success('Check your email to confirm your account.');
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Something went wrong. Please try again.';
      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface px-4 relative overflow-hidden">
      {/* Atmospheric background, matching the rest of the app */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 mb-4 shadow-[0_20px_60px_rgba(71,0,175,0.3)] rounded-full">
            <Logo />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/10">
            <Zap size={12} className="text-primary" fill="currentColor" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">TitanLeap</span>
          </div>
        </div>

        <div className="glass-panel rounded-[28px] p-8 shadow-2xl">
          <h1 className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/40 mb-2">
            {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="text-sm font-medium text-on-surface-variant/70 mb-6">
            {mode === 'sign-in'
              ? 'Sign in to access the Growth System.'
              : 'Create an account to access the Growth System.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="login-email" className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="audit-input"
                placeholder="you@titanleap.co"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="block text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-1">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="audit-input"
                placeholder="••••••••"
              />
            </div>

            {message && (
              <p className="text-xs font-medium text-on-surface-variant/70 leading-relaxed">{message}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-4 bg-primary text-on-primary font-black text-xs uppercase tracking-[0.3em] rounded-2xl",
                "shadow-[0_20px_60px_rgba(71,0,175,0.3)] hover:shadow-[0_30px_80px_rgba(71,0,175,0.5)] hover:scale-[1.02] active:scale-95",
                "transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              )}
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              setMessage(null);
            }}
            className="w-full text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 hover:text-primary transition-colors mt-6"
          >
            {mode === 'sign-in' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
          </button>
        </div>

        <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 max-w-xs mx-auto leading-relaxed mt-6">
          Access to dashboard data is restricted to approved team emails.
        </p>
      </div>
    </div>
  );
};
