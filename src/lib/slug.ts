import slugify from "slugify";

export function makeSlug(input: string, fallback = "item") {
  const base = slugify(input || fallback, { lower: true, strict: true, trim: true });
  if (base) return base;
  // Urdu / non-latin: generate stable ascii-ish slug
  const hash = Buffer.from(input || fallback)
    .toString("base64url")
    .slice(0, 10)
    .toLowerCase();
  return `${fallback}-${hash}`;
}

export function uniqueSlug(base: string, existing: string[]) {
  const set = new Set(existing);
  if (!set.has(base)) return base;
  let i = 2;
  while (set.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}
