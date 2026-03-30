/** Convert a human-readable name to a URL-safe directory slug. */
export function slugify(name: string): string {
  let slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s\-_]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug === "") slug = "adventure";
  return slug;
}
