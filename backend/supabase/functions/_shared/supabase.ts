import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function env(name: string) {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function getSupabaseUserClient(req: Request) {
  // Prefer SB_* (cloud secrets), fallback to SUPABASE_* (local dev .env)
  const supabaseUrl = Deno.env.get("SB_URL") ?? env("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SB_ANON_KEY") ?? env("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization") ?? "";

  // Use user JWT so PostgREST enforces RLS.
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

export function getSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get("SB_URL") ?? env("SUPABASE_URL");
  const serviceRole = Deno.env.get("SB_SERVICE_ROLE_KEY") ?? env("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRole);
}
