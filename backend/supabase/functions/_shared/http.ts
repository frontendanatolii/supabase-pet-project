import { corsHeaders } from "./cors.ts";

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function badRequest(message: string) {
  return json({ error: message }, { status: 400 });
}

export function unauthorized(message = "Unauthorized") {
  return json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return json({ error: message }, { status: 404 });
}

export function serverError(message: string, details?: unknown) {
  return json({ error: message, details }, { status: 500 });
}

export async function readJson<T>(req: Request): Promise<T> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    // allow empty body
    return {} as T;
  }
  return (await req.json()) as T;
}
