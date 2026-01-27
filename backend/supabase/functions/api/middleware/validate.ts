import { z, type ZodTypeAny } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { HttpError, readJson } from "../../_shared/http.ts";

export { z };

export async function parseBody<T extends ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  const raw = await readJson<unknown>(req);
  const res = schema.safeParse(raw);
  if (!res.success) {
    throw new HttpError(400, "Invalid request body", res.error.flatten());
  }
  return res.data;
}

export function parseQuery<T extends ZodTypeAny>(url: URL, schema: T): z.infer<T> {
  const raw = Object.fromEntries(url.searchParams.entries());
  const res = schema.safeParse(raw);
  if (!res.success) {
    throw new HttpError(400, "Invalid query parameters", res.error.flatten());
  }
  return res.data;
}

export function parseParams<T extends ZodTypeAny>(params: Record<string, string>, schema: T): z.infer<T> {
  const res = schema.safeParse(params);
  if (!res.success) {
    throw new HttpError(400, "Invalid route parameters", res.error.flatten());
  }
  return res.data;
}
