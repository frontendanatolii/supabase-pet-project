import { corsHeaders } from "./cors.ts";

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(status: number, message: string, details?: unknown) {
  return json({ error: message, details }, { status });
}
