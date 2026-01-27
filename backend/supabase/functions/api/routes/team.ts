import { json, HttpError } from "../../_shared/http.ts";
import { Router, type Ctx } from "../router.ts";
import type { Team, Profile } from "../types.ts";
import { z, parseBody } from "../middleware/validate.ts";
import { getProfile, requireTeamId } from "../../_shared/profile.ts";

export function registerTeamRoutes(router: Router) {
  router.post("/team/create", async (ctx: Ctx) => {
    const body = await parseBody(
      ctx.req,
      z.object({
        name: z.string().trim().min(1, "Team name is required").max(120),
      }),
    );

    const { data, error } = await ctx.supabase.rpc("create_team", { team_name: body.name });
    if (error) throw new HttpError(400, error.message);

    return json({ team: data as Team });
  });

  router.post("/team/join", async (ctx: Ctx) => {
    const body = await parseBody(
      ctx.req,
      z.object({
        invite_code: z.string().trim().min(1, "Invite code is required").max(200),
      }),
    );

    const { data, error } = await ctx.supabase.rpc("join_team", { invite: body.invite_code });
    if (error) throw new HttpError(400, error.message);

    return json({ team: data as Team });
  });

  router.get("/team/members", async (ctx: Ctx) => {
    const profile = await getProfile(ctx.supabase, ctx.user.id);
    const teamId = requireTeamId(profile);

    const { data, error } = await ctx.supabase
      .from("profiles")
      .select("id,full_name,email,team_id,created_at")
      .eq("team_id", teamId)
      .order("full_name", { ascending: true, nullsFirst: false });

    if (error) throw new HttpError(400, error.message);
    return json({ members: (data ?? []) as Profile[] });
  });
}
