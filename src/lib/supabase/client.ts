import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock";

// Use createBrowserClient from @supabase/ssr to automatically synchronize
// browser localStorage session with HTTP-only cookie headers, allowing server-side API endpoints
// (which use createServerClient) to securely verify user authentication.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export function isMockSupabase() {
  return supabaseUrl.includes("mock-project");
}
