import { json, HttpError } from "../../_shared/http.ts";
import { Router, type Ctx } from "../router.ts";
import { z, parseBody } from "../middleware/validate.ts";
import { getProfile, requireTeamId } from "../../_shared/profile.ts";
import { toPublicSupabaseUrl } from "../../_shared/publicSupabaseUrl.ts";

export function registerStorageRoutes(router: Router) {
  router.post("/storage/signed-upload", async (ctx: Ctx) => {
    const body = await parseBody(
      ctx.req,
      z.object({
        filename: z.string().optional().default("file"),
        contentType: z.string().optional().default("application/octet-stream"),
      }),
    );

    const profile = await getProfile(ctx.supabase, ctx.user.id);
    const teamId = requireTeamId(profile);

    const filename = body.filename.trim() || "file";
    const contentType = body.contentType.trim() || "application/octet-stream";

    const ext = (() => {
      const parts = filename.split(".");
      if (parts.length < 2) return "bin";
      const e = parts[parts.length - 1].toLowerCase();
      return e.replace(/[^a-z0-9]/g, "") || "bin";
    })();

    const path = `${teamId}/${crypto.randomUUID()}.${ext}`;

    const { data, error } = await ctx.supabase.storage
      .from("product-images")
      .createSignedUploadUrl(path);

    if (error || !data) {
      throw new HttpError(400, error?.message ?? "Failed to create signed upload URL");
    }

    return json({
      path,
      token: data.token,
      signedUrl: toPublicSupabaseUrl(data.signedUrl),
      contentType,
    });
  });

  router.post("/storage/signed-download", async (ctx: Ctx) => {
    const body = await parseBody(
      ctx.req,
      z.object({
        path: z.string().trim().min(1, "path is required"),
        expiresIn: z.coerce.number().int().optional().default(600),
      }),
    );

    const expiresIn = Math.min(60 * 60, Math.max(60, body.expiresIn));

    const { data, error } = await ctx.supabase.storage
      .from("product-images")
      .createSignedUrl(body.path, expiresIn);

    if (error || !data) throw new HttpError(400, error?.message ?? "Failed to create signed url");

    return json({ url: toPublicSupabaseUrl(data.signedUrl), expiresIn });
  });
}
