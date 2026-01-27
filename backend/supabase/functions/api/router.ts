import { notFound } from "../_shared/http.ts";

export type Ctx = {
  req: Request;
  url: URL;
  route: string;
  supabase: any;
  user: any;
  params: Record<string, string>;
};

type Handler = (ctx: Ctx) => Promise<Response> | Response;

type RouteDef = {
  method: string;
  pattern: string | RegExp;
  handler: Handler;
};

export class Router {
  private routes: RouteDef[] = [];

  get(path: string | RegExp, handler: Handler) {
    this.routes.push({ method: "GET", pattern: path, handler });
  }

  post(path: string | RegExp, handler: Handler) {
    this.routes.push({ method: "POST", pattern: path, handler });
  }

  patch(path: string | RegExp, handler: Handler) {
    this.routes.push({ method: "PATCH", pattern: path, handler });
  }

  async handle(ctx: Omit<Ctx, "params">) {
    for (const r of this.routes) {
      if (r.method !== ctx.req.method) continue;

      if (typeof r.pattern === "string") {
        if (ctx.route !== r.pattern) continue;
        return await r.handler({ ...ctx, params: {} });
      }

      const m = ctx.route.match(r.pattern);
      if (!m) continue;

      const params = (m.groups ?? {}) as Record<string, string>;
      return await r.handler({ ...ctx, params });
    }

    return notFound();
  }
}
