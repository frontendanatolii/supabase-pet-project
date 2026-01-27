/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { HttpError, json, serverError } from "../_shared/http.ts";
import { requireUserOrThrow } from "../_shared/auth.ts";

import { Router } from "./router.ts";

import { registerMeRoutes } from "./routes/me.ts";
import { registerTeamRoutes } from "./routes/team.ts";
import { registerProductsRoutes } from "./routes/products.ts";
import { registerStorageRoutes } from "./routes/storage.ts";
import { getRoute } from "../_shared/route.ts";

const router = new Router();
registerMeRoutes(router);
registerTeamRoutes(router);
registerProductsRoutes(router);
registerStorageRoutes(router);

function handleError(e: unknown) {
  if (e instanceof HttpError) {
    return json({ error: e.message, details: e.details }, { status: e.status });
  }
  if (e instanceof Error) {
    return serverError("Unhandled error", { message: e.message, name: e.name, stack: e.stack });
  }
  return serverError("Unhandled error", String(e));
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const { url, route } = getRoute(req, "api");

    // One auth implementation (shared), no duplication
    const { supabase, user } = await requireUserOrThrow(req);

    return await router.handle({
      req,
      url,
      route,
      supabase,
      user,
    });
  } catch (e) {
    return handleError(e);
  }
});
