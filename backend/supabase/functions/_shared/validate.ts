export function assertString(v: unknown, name: string, opts?: { min?: number; max?: number }) {
  if (typeof v !== "string") throw new Error(`${name} must be a string`);
  const s = v.trim();
  if (opts?.min != null && s.length < opts.min) throw new Error(`${name} must be at least ${opts.min} chars`);
  if (opts?.max != null && s.length > opts.max) throw new Error(`${name} must be at most ${opts.max} chars`);
  return s;
}

export function assertUUID(v: unknown, name: string) {
  const s = assertString(v, name, { min: 10 });
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!re.test(s)) throw new Error(`${name} must be a UUID`);
  return s;
}
