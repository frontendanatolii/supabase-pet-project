import { Profile } from "../api/types.ts";
import { HttpError } from "./http.ts";


type SupabaseClient = any;

export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,team_id,created_at")
    .eq("id", userId)
    .single();

  if (error) throw new HttpError(400, error.message);
  return data as Profile;
}

export function requireTeamId(profile: Profile) {
  if (!profile.team_id) throw new HttpError(400, "User has no team");
  return profile.team_id;
}
