import { getSupabaseUserClient } from "./supabase.ts";
import { HttpError } from "./http.ts";

export async function requireUser(req: Request) {
  const supabase = getSupabaseUserClient(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { user: null, error: error?.message ?? "Unauthorized" };
  }
  return { user: data.user, error: null };
}

export async function requireUserOrThrow(req: Request) {
  const supabase = getSupabaseUserClient(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new HttpError(401, error?.message ?? "Unauthorized");
  return { supabase, user: data.user };
}
