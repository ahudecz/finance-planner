import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env.local file."
  );
}

// Server-side Supabase client for API routes and server components
// This can access user sessions via cookies
export const createServerClient = async () => {
  const cookieStore = await cookies();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          return cookieStore.get(key)?.value ?? null;
        },
        setItem: (key: string, value: string) => {
          try {
            cookieStore.set({ name: key, value, httpOnly: true });
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        removeItem: (key: string) => {
          try {
            cookieStore.set({ name: key, value: "", expires: new Date(0) });
          } catch {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  });
};

// Simple server client for basic operations (no auth context)
export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
