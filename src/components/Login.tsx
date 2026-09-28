import React, { useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Logo } from './Logo';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
    <div className="min-h-screen w-full flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <div className="bg-surface-container rounded-2xl border border-outline-variant/20 p-8">
          <h1 className="text-lg font-semibold text-on-surface mb-1">
            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </h1>
          <p className="text-sm text-on-surface-variant mb-6">
            {mode === 'sign-in'
              ? 'Sign in to access the TitanLeap dashboard.'
              : 'Create an account to access the TitanLeap dashboard.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-surface-container-high border border-outline-variant/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="you@titanleap.co"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-on-surface-variant mb-1.5">
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
                className="w-full rounded-lg bg-surface-container-high border border-outline-variant/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="••••••••"
              />
            </div>

            {message && (
              <p className="text-xs text-on-surface-variant">{message}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-on-primary py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              setMessage(null);
            }}
            className="w-full text-center text-xs text-on-surface-variant hover:text-on-surface mt-5"
          >
            {mode === 'sign-in' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
          </button>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          Access to dashboard data is restricted to approved team emails.
        </p>
      </div>
    </div>
  );
};
