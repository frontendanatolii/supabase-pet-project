import { getSupabaseUserClient } from "./supabase.ts";

export async function requireUser(req: Request) {
  const supabase = getSupabaseUserClient(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { user: null, error: error?.message ?? "Unauthorized" };
  }
  return { user: data.user, error: null };
}
