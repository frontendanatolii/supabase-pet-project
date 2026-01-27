import { corsHeaders } from "./cors.ts";

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(status: number, message: string, details?: unknown) {
  return json({ error: message, details }, { status });
}

export function badRequest(message: string, details?: unknown) {
  return errorResponse(400, message, details);
}

export function unauthorized(message = "Unauthorized", details?: unknown) {
  return errorResponse(401, message, details);
}

export function forbidden(message = "Forbidden", details?: unknown) {
  return errorResponse(403, message, details);
}

export function notFound(message = "Not found", details?: unknown) {
  return errorResponse(404, message, details);
}

export function serverError(message: string, details?: unknown) {
  return errorResponse(500, message, details);
}

export async function readJson<T>(req: Request): Promise<T> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return {} as T;

  try {
    return (await req.json()) as T;
  } catch (e) {
    throw new HttpError(400, "Invalid JSON body", String(e));
  }
}
