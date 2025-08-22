import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env.local file."
  );
}

// Client-side Supabase client for browser usage
// This uses the public anon key and is safe for client-side code
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 🚨 DEVELOPMENT BYPASS: Service role client for bypassing RLS issues
// ⚠️ NEVER use this in production - only for development when RLS is problematic
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const devBypassSupabase = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) : null;

// Helper to determine if we should use bypass (development only)
export const shouldUseDevBypass = () => {
  return process.env.NODE_ENV === 'development' && 
         typeof window !== 'undefined' && 
         window.location.hostname === 'localhost';
};
