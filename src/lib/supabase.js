import { createClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl, isSupabaseConfigured } from './config';

// main.jsx only imports the app when this is true, so the client is never built without config.
if (!isSupabaseConfigured) {
  throw new Error('Supabase is not configured. See src/components/SetupRequired.jsx.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
