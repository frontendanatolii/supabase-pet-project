const PUBLIC_SUPABASE_URL = (
  Deno.env.get("PUBLIC_SUPABASE_URL") ?? "http://127.0.0.1:54321"
).replace(/\/$/, "");

export function toPublicSupabaseUrl(url: string) {
  return url.replace("http://kong:8000", PUBLIC_SUPABASE_URL);
}
