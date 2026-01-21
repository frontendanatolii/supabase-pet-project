/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { json, badRequest, notFound, readJson, serverError } from "../_shared/http.ts";
import { getSupabaseUserClient } from "../_shared/supabase.ts";

/**
 * In local dev, Edge Runtime often returns signed URLs with `http://kong:8000/...`
 * (an internal Docker hostname). Browsers cannot resolve that.
 *
 * Set PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 in backend/supabase/.env
 */
const PUBLIC_SUPABASE_URL = (
  Deno.env.get("PUBLIC_SUPABASE_URL") ?? "http://127.0.0.1:54321"
).replace(/\/$/, "");

function toPublicSupabaseUrl(url: string) {
  return url.replace("http://kong:8000", PUBLIC_SUPABASE_URL);
}

type Team = {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  team_id: string | null;
  created_at: string;
};

type ProductStatus = "draft" | "active" | "deleted";

type Product = {
  id: string;
  team_id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  status: ProductStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

function getRoute(req: Request) {
  const url = new URL(req.url);
  const functionName = "api";
  let p = url.pathname;

  // Local: /functions/v1/api/...
  const localPrefix = `/functions/v1/${functionName}`;
  // Deployed: /api/...
  const deployedPrefix = `/${functionName}`;

  if (p.startsWith(localPrefix)) p = p.slice(localPrefix.length);
  else if (p.startsWith(deployedPrefix)) p = p.slice(deployedPrefix.length);

  if (!p.startsWith("/")) p = "/" + p;
  if (p === "/") return { url, route: "/" };

  // Normalize: avoid trailing slashes
  const route = p.endsWith("/") ? p.slice(0, -1) : p;
  return { url, route };
}

async function requireUser(supabase: ReturnType<typeof getSupabaseUserClient>) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { user: null, error: error?.message ?? "Unauthorized" };
  return { user: data.user, error: null };
}

async function getProfile(supabase: ReturnType<typeof getSupabaseUserClient>, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,team_id,created_at")
    .eq("id", userId)
    .single();

  if (error) return { profile: null as Profile | null, error: error.message };
  return { profile: data as Profile, error: null };
}

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const supabase = getSupabaseUserClient(req);
    const { user, error: userErr } = await requireUser(supabase);
    if (!user) return json({ error: userErr }, { status: 401 });

    const { url, route } = getRoute(req);

    // -------- ME --------
    if (req.method === "GET" && route === "/me") {
      const { profile, error } = await getProfile(supabase, user.id);
      if (!profile) return json({ error }, { status: 400 });

      let team: Team | null = null;
      if (profile.team_id) {
        const { data: teamData, error: teamError } = await supabase
          .from("teams")
          .select("id,name,invite_code,created_at")
          .eq("id", profile.team_id)
          .single();
        if (teamError) return json({ error: teamError.message }, { status: 400 });
        team = teamData as Team;
      }

      return json({ profile, team });
    }

    // -------- TEAM --------
    if (req.method === "POST" && route === "/team/create") {
      const body = await readJson<{ name?: string }>(req);
      const name = (body.name ?? "").trim();
      if (!name) return badRequest("Team name is required");

      const { data, error } = await supabase.rpc("create_team", { team_name: name });
      if (error) return json({ error: error.message }, { status: 400 });

      return json({ team: data as Team });
    }

    if (req.method === "POST" && route === "/team/join") {
      const body = await readJson<{ invite_code?: string }>(req);
      const invite = (body.invite_code ?? "").trim();
      if (!invite) return badRequest("Invite code is required");

      const { data, error } = await supabase.rpc("join_team", { invite });
      if (error) return json({ error: error.message }, { status: 400 });

      return json({ team: data as Team });
    }

    if (req.method === "GET" && route === "/team/members") {
      const { profile, error: profileError } = await getProfile(supabase, user.id);
      if (!profile) return json({ error: profileError }, { status: 400 });
      if (!profile.team_id) return json({ error: "User has no team" }, { status: 400 });

      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email,team_id,created_at")
        .eq("team_id", profile.team_id)
        .order("full_name", { ascending: true, nullsFirst: false });

      if (error) return json({ error: error.message }, { status: 400 });
      return json({ members: (data ?? []) as Profile[] });
    }

    // -------- PRODUCTS --------
    if (req.method === "GET" && route === "/products") {
      const page = clampInt(url.searchParams.get("page"), 1, 1, 10_000);
      const pageSize = clampInt(url.searchParams.get("pageSize"), 10, 1, 50);
      const status = (url.searchParams.get("status") ?? "all").toLowerCase();
      const q = (url.searchParams.get("q") ?? "").trim();
      const createdBy = (url.searchParams.get("createdBy") ?? "").trim();
      const updatedFrom = (url.searchParams.get("updatedFrom") ?? "").trim();
      const updatedTo = (url.searchParams.get("updatedTo") ?? "").trim();

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("products")
        .select(
          "id,team_id,title,description,image_path,status,created_by,created_at,updated_at,deleted_at,creator:profiles(full_name,email)",
          { count: "exact" },
        )
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (status !== "all") {
        if (!["draft", "active", "deleted"].includes(status)) {
          return badRequest("Invalid status");
        }
        query = query.eq("status", status);
      }

      if (createdBy) query = query.eq("created_by", createdBy);
      if (updatedFrom) query = query.gte("updated_at", updatedFrom);
      if (updatedTo) query = query.lte("updated_at", updatedTo);

      if (q) query = query.textSearch("fts", q, { type: "websearch", config: "english" });

      const { data, error, count } = await query;
      if (error) return json({ error: error.message }, { status: 400 });

      return json({
        items: data ?? [],
        page,
        pageSize,
        total: count ?? 0,
      });
    }

    if (req.method === "POST" && route === "/products") {
      const body = await readJson<{ title?: string; description?: string; image_path?: string }>(req);
      const title = (body.title ?? "").trim();
      if (!title) return badRequest("Title is required");

      const { profile, error: profileError } = await getProfile(supabase, user.id);
      if (!profile) return json({ error: profileError }, { status: 400 });
      if (!profile.team_id) return json({ error: "User has no team" }, { status: 400 });

      const { data, error } = await supabase
        .from("products")
        .insert({
          title,
          description: body.description ?? null,
          image_path: body.image_path ?? null,
          team_id: profile.team_id,
          created_by: user.id,
          status: "draft",
        })
        .select("id,team_id,title,description,image_path,status,created_by,created_at,updated_at,deleted_at")
        .single();

      if (error) return json({ error: error.message }, { status: 400 });
      return json({ product: data as Product });
    }

    // /products/:id
    const productMatch = route.match(/^\/products\/([^/]+)$/);
    if (productMatch) {
      const productId = productMatch[1];

      if (req.method === "GET") {
        const { data, error } = await supabase
          .from("products")
          .select("id,team_id,title,description,image_path,status,created_by,created_at,updated_at,deleted_at")
          .eq("id", productId)
          .single();

        if (error) return json({ error: error.message }, { status: 400 });
        return json({ product: data as Product });
      }

      if (req.method === "PATCH") {
        const body = await readJson<{ title?: string; description?: string; image_path?: string }>(req);
        const patch: Record<string, unknown> = {};
        if (typeof body.title === "string") patch.title = body.title.trim();
        if (typeof body.description === "string") patch.description = body.description;
        if (typeof body.image_path === "string") patch.image_path = body.image_path;

        if (Object.keys(patch).length === 0) return badRequest("Nothing to update");

        const { data, error } = await supabase
          .from("products")
          .update(patch)
          .eq("id", productId)
          .select("id,team_id,title,description,image_path,status,created_by,created_at,updated_at,deleted_at")
          .single();

        if (error) return json({ error: error.message }, { status: 400 });
        return json({ product: data as Product });
      }
    }

    // /products/:id/activate
    const activateMatch = route.match(/^\/products\/([^/]+)\/activate$/);
    if (activateMatch && req.method === "POST") {
      const productId = activateMatch[1];

      const { data, error } = await supabase
        .from("products")
        .update({ status: "active" })
        .eq("id", productId)
        .eq("status", "draft")
        .select("id,team_id,title,description,image_path,status,created_by,created_at,updated_at,deleted_at")
        .maybeSingle();

      if (error) return json({ error: error.message }, { status: 400 });
      if (!data) return json({ error: "Product not found or not draft" }, { status: 400 });

      return json({ product: data as Product });
    }

    // /products/:id/delete (soft)
    const deleteMatch = route.match(/^\/products\/([^/]+)\/delete$/);
    if (deleteMatch && req.method === "POST") {
      const productId = deleteMatch[1];

      const { data, error } = await supabase
        .from("products")
        .update({ status: "deleted", deleted_at: new Date().toISOString() })
        .eq("id", productId)
        .select("id,team_id,title,description,image_path,status,created_by,created_at,updated_at,deleted_at")
        .single();

      if (error) return json({ error: error.message }, { status: 400 });
      return json({ product: data as Product });
    }

    // -------- STORAGE --------
    if (req.method === "POST" && route === "/storage/signed-upload") {
      const body = await readJson<{ filename?: string; contentType?: string }>(req);
      const filename = (body.filename ?? "file").trim();
      const contentType = (body.contentType ?? "application/octet-stream").trim();

      const { profile, error: profileError } = await getProfile(supabase, user.id);
      if (!profile) return json({ error: profileError }, { status: 400 });
      if (!profile.team_id) return json({ error: "User has no team" }, { status: 400 });

      const ext = (() => {
        const parts = filename.split(".");
        if (parts.length < 2) return "bin";
        const e = parts[parts.length - 1].toLowerCase();
        return e.replace(/[^a-z0-9]/g, "") || "bin";
      })();

      const path = `${profile.team_id}/${crypto.randomUUID()}.${ext}`;

      const { data, error } = await supabase.storage
        .from("product-images")
        .createSignedUploadUrl(path);

      if (error || !data) {
        return json({ error: error?.message ?? "Failed to create signed upload URL" }, { status: 400 });
      }

      return json({
        path,
        token: data.token,
        signedUrl: toPublicSupabaseUrl(data.signedUrl),
        contentType,
      });
    }

    if (req.method === "POST" && route === "/storage/signed-download") {
      const body = await readJson<{ path?: string; expiresIn?: number }>(req);
      const path = (body.path ?? "").trim();
      if (!path) return badRequest("path is required");

      const expiresInRaw = Number(body.expiresIn ?? 600);
      const expiresIn = Math.min(
        60 * 60,
        Math.max(60, Number.isFinite(expiresInRaw) ? expiresInRaw : 600),
      );

      const { data, error } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, expiresIn);

      if (error || !data) return json({ error: error?.message ?? "Failed to create signed url" }, { status: 400 });

      return json({ url: toPublicSupabaseUrl(data.signedUrl), expiresIn });
    }

    return notFound();
  } catch (e) {
    return serverError("Unhandled error", String(e));
  }
});
