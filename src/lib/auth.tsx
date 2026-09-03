import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
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
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 60 * 1000;

async function ensureProfile(user: User): Promise<Profile | null> {
  const { data: existing, error: readError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (readError) { console.error('Failed to fetch profile:', readError.message); return null; }
  if (existing) return existing as Profile;
  const { data: created, error: insertError } = await supabase.from('profiles').insert({ id: user.id, full_name: null, role: 'worker', is_admin: false }).select('*').single();
  if (insertError) {
    const { data: retry } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (retry) return retry as Profile;
    console.error('Failed to create profile:', insertError.message); return null;
  }
  return created as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());
  const lastActivityWriteRef = useRef(0);
  const signingOutRef = useRef(false);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) { console.error('Failed to fetch profile:', error.message); return; }
    setProfile(data as Profile | null);
  }, []);

  const hydrateUser = useCallback(async (nextUser: User | null) => {
    if (!nextUser) { setProfile(null); return; }
    const nextProfile = await ensureProfile(nextUser);
    setProfile(nextProfile);
  }, []);

  const refreshProfile = useCallback(async () => { if (user) await fetchProfile(user.id); }, [user, fetchProfile]);

  const hasActiveJob = useCallback(async (uid: string) => {
    const { data, error } = await supabase.from('jobs').select('id').eq('status', 'assigned').or(`worker_id.eq.${uid},employer_id.eq.${uid}`).limit(1);
    if (error) { console.error('Active job safety check failed:', error.message); return true; }
    return (data?.length ?? 0) > 0;
  }, []);

  const safeIdleCheck = useCallback(async () => {
    if (signingOutRef.current || !user) return;
    if (Date.now() - lastActivityRef.current < IDLE_TIMEOUT_MS) return;
    // Never terminate a session while an assigned/active job exists. The job timer is server-clock based.
    if (await hasActiveJob(user.id)) { lastActivityRef.current = Date.now(); return; }
    signingOutRef.current = true;
    await supabase.auth.signOut();
    setSession(null); setUser(null); setProfile(null);
    window.location.replace('https://www.kerjaharian.my.id');
  }, [hasActiveJob, user]);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(initialSession); setUser(initialSession?.user ?? null);
      await hydrateUser(initialSession?.user ?? null);
      if (mounted) setLoading(false);
    };
    void bootstrap();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      lastActivityRef.current = Date.now();
      setSession(newSession); setUser(newSession?.user ?? null);
      void hydrateUser(newSession?.user ?? null);
    });
    const markActivity = () => {
      lastActivityRef.current = Date.now();
      if (Date.now() - lastActivityWriteRef.current >= ACTIVITY_THROTTLE_MS) lastActivityWriteRef.current = Date.now();
    };
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    activityEvents.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));
    const interval = window.setInterval(() => { void safeIdleCheck(); }, 30 * 1000);
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      activityEvents.forEach((event) => window.removeEventListener(event, markActivity));
      window.clearInterval(interval);
    };
  }, [hydrateUser, safeIdleCheck]);

  const signIn = useCallback(async (email: string, password: string) => {
    lastActivityRef.current = Date.now();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);
  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    lastActivityRef.current = Date.now();
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    return { error: error?.message ?? null };
  }, []);
  const signInWithGoogle = useCallback(async () => {
    lastActivityRef.current = Date.now();
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    return { error: error?.message ?? null };
  }, []);
  const signOut = useCallback(async () => {
    signingOutRef.current = true;
    await supabase.auth.signOut();
    setSession(null); setUser(null); setProfile(null);
    window.location.replace('https://www.kerjaharian.my.id');
  }, []);

  return <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signInWithGoogle, signOut, refreshProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
