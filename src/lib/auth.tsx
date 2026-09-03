import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Profile } from './supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function ensureProfile(user: User): Promise<Profile | null> {
  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (readError) {
    console.error('Failed to fetch profile:', readError.message);
    return null;
  }
  if (existing) return existing as Profile;

  // Do not silently choose a role for a new Google user. The first profile
  // screen asks the person whether they are a worker or an employer.
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: user.id, full_name: null, role: 'worker', is_admin: false })
    .select('*')
    .single();

  if (insertError) {
    const { data: retry } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (retry) return retry as Profile;
    console.error('Failed to create profile:', insertError.message);
    return null;
  }
  return created as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) {
      console.error('Failed to fetch profile:', error.message);
      return;
    }
    setProfile(data as Profile | null);
  }, []);

  const hydrateUser = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null);
      return;
    }
    const nextProfile = await ensureProfile(nextUser);
    setProfile(nextProfile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      await hydrateUser(session?.user ?? null);
      if (mounted) setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      void hydrateUser(newSession?.user ?? null);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [hydrateUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
