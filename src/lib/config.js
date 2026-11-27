/**
 * Reads the Supabase settings Vite injected at build time.
 * Kept free of side effects so the app can check it before loading Supabase.
 */
const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

/** Names of required variables that are empty in this build. */
export const missingSupabaseEnv = REQUIRED.filter((name) => !import.meta.env[name]?.trim());

export const isSupabaseConfigured = missingSupabaseEnv.length === 0;
