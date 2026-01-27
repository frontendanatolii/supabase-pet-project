import { json } from "../../_shared/http.ts";
import { getProfile } from "../../_shared/profile.ts";
import { Router, type Ctx } from "../router.ts";
import type { Team } from "../types.ts";

export function registerMeRoutes(router: Router) {
  router.get("/me", async (ctx: Ctx) => {
    const profile = await getProfile(ctx.supabase, ctx.user.id);

    let team: Team | null = null;
    if (profile.team_id) {
      const { data, error } = await ctx.supabase
        .from("teams")
        .select("id,name,invite_code,created_at")
        .eq("id", profile.team_id)
        .single();

      if (error) throw error;
      team = data as Team;
    }

    return json({ profile, team });
  });
}
