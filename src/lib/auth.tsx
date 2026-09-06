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

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, fallback: T, label: string): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      console.error(`${label} timed out after ${timeoutMs}ms`);
      resolve(fallback);
    }, timeoutMs);
    Promise.resolve(promise).then((value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    }).catch((error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      console.error(`${label} failed:`, error);
      resolve(fallback);
    });
  });
}

async function ensureProfile(user: User): Promise<Profile | null> {
  const result = await withTimeout(
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    PROFILE_TIMEOUT_MS,
    { data: null, error: new Error('Profile request timed out') },
    'Profile lookup',
  );
  const { data: existing, error: readError } = result;
  if (readError) { console.error('Failed to fetch profile:', readError.message); return null; }
  if (existing) return existing as Profile;

  const insertResult = await withTimeout(
    supabase.from('profiles').insert({ id: user.id, full_name: null, role: 'worker', is_admin: false }).select('*').single(),
    PROFILE_TIMEOUT_MS,
    { data: null, error: new Error('Profile creation timed out') },
    'Profile creation',
  );
  const { data: created, error: insertError } = insertResult;
  if (!insertError && created) return created as Profile;

  const retryResult = await withTimeout(
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    PROFILE_TIMEOUT_MS,
    { data: null, error: new Error('Profile retry timed out') },
    'Profile retry',
  );
  if (retryResult.data) return retryResult.data as Profile;
  console.error('Failed to create profile:', insertError?.message ?? 'unknown error');
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
    const result = await withTimeout(
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      PROFILE_TIMEOUT_MS,
      { data: null, error: new Error('Profile refresh timed out') },
      'Profile refresh',
    );
    if (result.error) { console.error('Failed to fetch profile:', result.error.message); return; }
    setProfile(result.data as Profile | null);
  }, []);

  const hydrateUser = useCallback(async (nextUser: User | null) => {
    if (!nextUser) { setProfile(null); return; }
    const nextProfile = await ensureProfile(nextUser);
    setProfile(nextProfile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (userRef.current) await fetchProfile(userRef.current.id);
  }, [fetchProfile]);

  const hasActiveJob = useCallback(async (uid: string) => {
    const { data, error } = await supabase.from('jobs').select('id').eq('status', 'assigned').or(`worker_id.eq.${uid},employer_id.eq.${uid}`).limit(1);
    if (error) { console.error('Active job safety check failed:', error.message); return true; }
    return (data?.length ?? 0) > 0;
  }, []);

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      const result = await withTimeout(
        supabase.auth.getSession(),
        AUTH_BOOTSTRAP_TIMEOUT_MS,
        { data: { session: null }, error: null },
        'Auth session lookup',
      );
      if (!mounted) return;
      const initialSession = result.data.session;
      setSession(initialSession); setUser(initialSession?.user ?? null); userRef.current = initialSession?.user ?? null;
      await hydrateUser(initialSession?.user ?? null);
      if (mounted) setLoading(false);
    };
    void bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      lastActivityRef.current = Date.now();
      setSession(newSession); setUser(newSession?.user ?? null); userRef.current = newSession?.user ?? null;
      setLoading(false);
      window.setTimeout(() => {
        if (mounted) void hydrateUser(newSession?.user ?? null);
      }, 0);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [hydrateUser]);

  useEffect(() => {
    const markActivity = () => {
      lastActivityRef.current = Date.now();
      if (Date.now() - lastActivityWriteRef.current >= ACTIVITY_THROTTLE_MS) lastActivityWriteRef.current = Date.now();
    };
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    activityEvents.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));
    return () => activityEvents.forEach((event) => window.removeEventListener(event, markActivity));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const currentUser = userRef.current;
      if (signingOutRef.current || !currentUser) return;
      if (Date.now() - lastActivityRef.current < IDLE_TIMEOUT_MS) return;
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
    setSession(null); setUser(null); setProfile(null); userRef.current = null;
    window.location.replace('https://www.kerjaharian.my.id');
  }, []);

  return <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signInWithGoogle, signOut, refreshProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
