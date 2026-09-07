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
const AUTH_BOOTSTRAP_TIMEOUT_MS = 8 * 1000;
const PROFILE_TIMEOUT_MS = 8 * 1000;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => { if (!settled) { settled = true; console.error(`${label} timed out after ${timeoutMs}ms`); resolve(null); } }, timeoutMs);
    Promise.resolve(promise).then((value) => { if (!settled) { settled = true; window.clearTimeout(timer); resolve(value); } }).catch((error) => { if (!settled) { settled = true; window.clearTimeout(timer); console.error(`${label} failed:`, error); resolve(null); } });
  });
}

async function ensureProfile(user: User): Promise<Profile | null> {
  const result = await withTimeout(supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(), PROFILE_TIMEOUT_MS, 'Profile lookup');
  if (!result) return null;
  const { data: existing, error: readError } = result;
  if (readError) { console.error('Failed to fetch profile:', readError.message); return null; }
  if (existing) return existing as Profile;
  const insertResult = await withTimeout(supabase.from('profiles').insert({ id: user.id, full_name: null, role: 'worker', is_admin: false }).select('*').single(), PROFILE_TIMEOUT_MS, 'Profile creation');
  if (insertResult?.data && !insertResult.error) return insertResult.data as Profile;
  const retryResult = await withTimeout(supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(), PROFILE_TIMEOUT_MS, 'Profile retry');
  if (retryResult?.data) return retryResult.data as Profile;
  console.error('Failed to create profile:', insertResult?.error?.message ?? 'unknown error');
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const lastActivityRef = useRef(Date.now());
  const lastActivityWriteRef = useRef(0);
  const signingOutRef = useRef(false);

  const fetchProfile = useCallback(async (uid: string) => {
    const result = await withTimeout(supabase.from('profiles').select('*').eq('id', uid).maybeSingle(), PROFILE_TIMEOUT_MS, 'Profile refresh');
    if (!result) return;
    if (result.error) { console.error('Failed to fetch profile:', result.error.message); return; }
    setProfile(result.data as Profile | null);
  }, []);

  const hydrateUser = useCallback(async (nextUser: User | null) => {
    if (!nextUser) { setProfile(null); return; }
    const nextProfile = await ensureProfile(nextUser);
    setProfile(nextProfile);
  }, []);

  const refreshProfile = useCallback(async () => { if (userRef.current) await fetchProfile(userRef.current.id); }, [fetchProfile]);

  const hasActiveJob = useCallback(async (uid: string) => {
    const { data, error } = await supabase.from('jobs').select('id').eq('status', 'assigned').or(`worker_id.eq.${uid},employer_id.eq.${uid}`).limit(1);
    if (error) { console.error('Active job safety check failed:', error.message); return true; }
    return (data?.length ?? 0) > 0;
  }, []);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      const result = await withTimeout(supabase.auth.getSession(), AUTH_BOOTSTRAP_TIMEOUT_MS, 'Auth session lookup');
      if (!mounted) return;
      const initialSession = result?.data.session ?? null;
      setSession(initialSession); setUser(initialSession?.user ?? null); userRef.current = initialSession?.user ?? null;
      if (initialSession?.user) await hydrateUser(initialSession.user); else setProfile(null);
      if (mounted) setLoading(false);
    };
    void bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      lastActivityRef.current = Date.now();
      setSession(newSession); setUser(newSession?.user ?? null); userRef.current = newSession?.user ?? null;
      if (!newSession?.user) { setProfile(null); setLoading(false); return; }
      // Keep the auth gate loading until the profile/role is hydrated. This prevents
      // AdminRoute from rendering a false denial or a transient verification state.
      setLoading(true);
      window.setTimeout(async () => {
        if (!mounted) return;
        await hydrateUser(newSession.user);
        if (mounted) setLoading(false);
      }, 0);
    });

    return () => { mounted = false; authListener.subscription.unsubscribe(); };
  }, [hydrateUser]);

  useEffect(() => {
    const markActivity = () => { lastActivityRef.current = Date.now(); if (Date.now() - lastActivityWriteRef.current >= ACTIVITY_THROTTLE_MS) lastActivityWriteRef.current = Date.now(); };
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    activityEvents.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));
    return () => activityEvents.forEach((event) => window.removeEventListener(event, markActivity));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentUser = userRef.current;
      if (signingOutRef.current || !currentUser || Date.now() - lastActivityRef.current < IDLE_TIMEOUT_MS) return;
      void (async () => {
        if (await hasActiveJob(currentUser.id)) { lastActivityRef.current = Date.now(); return; }
        signingOutRef.current = true;
        await supabase.auth.signOut();
        setSession(null); setUser(null); setProfile(null); userRef.current = null;
        window.location.replace('https://www.kerjaharian.my.id');
      })();
    }, 30 * 1000);
    return () => window.clearInterval(interval);
  }, [hasActiveJob]);

  const signIn = useCallback(async (email: string, password: string) => { lastActivityRef.current = Date.now(); const { error } = await supabase.auth.signInWithPassword({ email, password }); return { error: error?.message ?? null }; }, []);
  const signUp = useCallback(async (email: string, password: string, fullName: string) => { lastActivityRef.current = Date.now(); const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } }); return { error: error?.message ?? null }; }, []);
  const signInWithGoogle = useCallback(async () => { lastActivityRef.current = Date.now(); const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } }); return { error: error?.message ?? null }; }, []);
  const signOut = useCallback(async () => { signingOutRef.current = true; await supabase.auth.signOut(); setSession(null); setUser(null); setProfile(null); userRef.current = null; window.location.replace('https://www.kerjaharian.my.id'); }, []);

  return <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signInWithGoogle, signOut, refreshProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used within AuthProvider'); return ctx; }
