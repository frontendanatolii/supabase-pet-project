import { json, HttpError } from "../../_shared/http.ts";
import { Router, type Ctx } from "../router.ts";
import type { Product } from "../types.ts";
import { z, parseBody, parseParams, parseQuery } from "../middleware/validate.ts";
import { getProfile, requireTeamId } from "../../_shared/profile.ts";

const ProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(["all", "draft", "active", "deleted"]).default("all"),
  q: z.string().optional().default("").transform((v) => v.trim()),
  createdBy: z.union([z.string().uuid(), z.literal("")]).optional().default("").transform((v) => v.trim()),
  updatedFrom: z.union([z.string().datetime(), z.literal("")]).optional().default("").transform((v) => v.trim()),
  updatedTo: z.union([z.string().datetime(), z.literal("")]).optional().default("").transform((v) => v.trim()),
});

const ProductIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export function registerProductsRoutes(router: Router) {
  router.get("/products", async (ctx: Ctx) => {
    const q = parseQuery(ctx.url, ProductsQuerySchema);

    const profile = await getProfile(ctx.supabase, ctx.user.id);
    const teamId = requireTeamId(profile);

    const from = (q.page - 1) * q.pageSize;
    const to = from + q.pageSize - 1;

    let query = ctx.supabase
      .from("products")
      .select(
        "id,team_id,title,description,image_path,status,created_by,created_at,updated_at,deleted_at,creator:profiles(full_name,email)",
        { count: "exact" },
      )
      .eq("team_id", teamId)
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (q.status !== "all") query = query.eq("status", q.status);
    if (q.createdBy) query = query.eq("created_by", q.createdBy);
    if (q.updatedFrom) query = query.gte("updated_at", q.updatedFrom);
    if (q.updatedTo) query = query.lte("updated_at", q.updatedTo);
    if (q.q) query = query.textSearch("fts", q.q, { type: "websearch", config: "english" });

    const { data, error, count } = await query;
    if (error) throw new HttpError(400, error.message);

    return json({
      items: data ?? [],
      page: q.page,
      pageSize: q.pageSize,
      total: count ?? 0,
    });
  });

  router.post("/products", async (ctx: Ctx) => {
    const body = await parseBody(
      ctx.req,
      z.object({
        title: z.string().trim().min(1, "Title is required").max(200),
        description: z.string().optional(),
        image_path: z.string().optional(),
      }),
    );

    const profile = await getProfile(ctx.supabase, ctx.user.id);
    const teamId = requireTeamId(profile);

    const { data, error } = await ctx.supabase
      .from("products")
      .insert({
        title: body.title,
        description: body.description ?? null,
        image_path: body.image_path ?? null,
        team_id: teamId,
        created_by: ctx.user.id,
        status: "draft",
      })
      .select("id,team_id,title,description,image_path,status,created_by,created_at,updated_at,deleted_at")
      .single();

    if (error) throw new HttpError(400, error.message);
    return json({ product: data as Product });
  });

  router.get(/^\/products\/(?<id>[^/]+)$/, async (ctx: Ctx) => {
    const { id } = parseParams(ctx.params, ProductIdParamsSchema);

    const profile = await getProfile(ctx.supabase, ctx.user.id);
    const teamId = requireTeamId(profile);

    const { data, error } = await ctx.supabase
      .from("products")
      .select("id,team_id,title,description,image_path,status,created_by,created_at,updated_at,deleted_at")
      .eq("id", id)
      .eq("team_id", teamId)
      .single();

    if (error) throw new HttpError(400, error.message);
    return json({ product: data as Product });
  });

  router.patch(/^\/products\/(?<id>[^/]+)$/, async (ctx: Ctx) => {
    const { id } = parseParams(ctx.params, ProductIdParamsSchema);

    const body = await parseBody(
      ctx.req,
      z.object({
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().optional(),
        image_path: z.string().optional(),
      }),
    );

    const patch: Record<string, unknown> = {};
    if (typeof body.title === "string") patch.title = body.title;
    if (typeof body.description === "string") patch.description = body.description;
    if (typeof body.image_path === "string") patch.image_path = body.image_path;

    if (Object.keys(patch).length === 0) throw new HttpError(400, "Nothing to update");

    const profile = await getProfile(ctx.supabase, ctx.user.id);
    const teamId = requireTeamId(profile);

    const { data, error } = await ctx.supabase
      .from("products")
      .update(patch)
      .eq("id", id)
      .eq("team_id", teamId)
      .select("id,team_id,title,description,image_path,status,created_by,created_at,updated_at,deleted_at")
      .single();

    if (error) throw new HttpError(400, error.message);
    return json({ product: data as Product });
  });

  router.post(/^\/products\/(?<id>[^/]+)\/activate$/, async (ctx: Ctx) => {
    const { id } = parseParams(ctx.params, ProductIdParamsSchema);

    const profile = await getProfile(ctx.supabase, ctx.user.id);
    const teamId = requireTeamId(profile);

    const { data, error } = await ctx.supabase
      .from("products")
      .update({ status: "active" })
      .eq("id", id)
      .eq("team_id", teamId)
      .eq("status", "draft")
      .select("id,team_id,title,description,image_path,status,created_by,created_at,updated_at,deleted_at")
      .maybeSingle();

    if (error) throw new HttpError(400, error.message);
    if (!data) throw new HttpError(400, "Product not found or not draft");

    return json({ product: data as Product });
  });

  router.post(/^\/products\/(?<id>[^/]+)\/delete$/, async (ctx: Ctx) => {
    const { id } = parseParams(ctx.params, ProductIdParamsSchema);

    const profile = await getProfile(ctx.supabase, ctx.user.id);
    const teamId = requireTeamId(profile);

    const { data, error } = await ctx.supabase
      .from("products")
      .update({ status: "deleted", deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("team_id", teamId)
      .select("id,team_id,title,description,image_path,status,created_by,created_at,updated_at,deleted_at")
      .single();

    if (error) throw new HttpError(400, error.message);
    return json({ product: data as Product });
  });
}
