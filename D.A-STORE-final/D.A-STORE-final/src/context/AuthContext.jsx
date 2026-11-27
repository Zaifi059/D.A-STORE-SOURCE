import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileFor, setProfileFor] = useState(null); // user id the current profile fetch resolved for

  // Session tracking (callback stays synchronous to avoid supabase-js deadlocks)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  const fetchProfile = useCallback(async (id) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    return error ? null : data;
  }, []);

  // Load profile (and role) whenever the signed-in user changes
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileFor(null);
      return;
    }
    let cancelled = false;
    fetchProfile(userId).then((data) => {
      if (cancelled) return;
      setProfile(data);
      setProfileFor(userId);
    });
    return () => { cancelled = true; };
  }, [userId, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (!userId) return null;
    const data = await fetchProfile(userId);
    setProfile(data);
    return data;
  }, [userId, fetchProfile]);

  // Auth actions: resolve with Supabase data, throw on error (use try/catch in forms)
  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async ({ email, password, fullName, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName ?? null, phone: phone ?? null } },
    });
    if (error) throw error;
    return data; // data.session is null if email confirmation is enabled
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(() => {
    const role = profile?.role ?? null;
    return {
      session,
      user: session?.user ?? null,
      profile,
      role,
      isAdmin: role === 'admin',
      isStaff: role === 'cashier' || role === 'admin',
      loading: !authReady || (!!userId && profileFor !== userId),
      signIn,
      signUp,
      signOut,
      refreshProfile,
    };
  }, [session, profile, authReady, userId, profileFor, signIn, signUp, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
