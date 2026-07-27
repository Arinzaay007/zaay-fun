import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Browser Supabase client (anon key). Read-only against RLS-protected tables.
 * Returns null if env is not configured so the UI can degrade gracefully.
 */
export function getBrowserSupabase() {
  if (!url || !anonKey) return null;
  return createBrowserClient(url, anonKey);
}

export const supabaseConfigured = Boolean(url && anonKey);
