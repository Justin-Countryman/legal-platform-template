// ─── Site-wide search visibility ──────────────────────────────────────────────
// Ruled 2026-07-25 (Justin): hiding a site from search engines is an operator
// setting in Sanity (`siteSettings.hideFromSearch`), never a code edit. It turns
// ON automatically at build so every site is hidden by default, and OFF at
// launch when the live domain is attached.
//
// THE DEFAULT IS FAIL-CLOSED, AND THAT IS THE WHOLE DESIGN. Two facts, both
// verified rather than assumed, make a schema default useless here:
//   1. Site Build writes `siteSettings` CREATE-ONLY (`site_setup.py`:
//      `existing is not None and not ctx.force_overwrite` → preserve). It will
//      not add a field to a document that already exists.
//   2. Sanity's `initialValue` fires only when an operator creates a document
//      in Studio. A tool-created document never sees it.
// So neither writer guarantees the field is present. The guarantee lives HERE,
// on the read side: **only an explicit `false` makes a site visible.** Absent,
// null, undefined, or an unreachable dataset all resolve to hidden. That holds
// for a fresh client, for any dataset whose site settings predate this field,
// and for a build that cannot reach Sanity at all.
//
// The asymmetry is deliberate: being wrongly hidden is one click to fix; being
// wrongly listed puts a test site in Google's index.
//
// Doctrine: `BI-URL-Architecture.md` → Search visibility.

/** GROQ for the one field this module reads. */
export const SITE_HIDDEN_QUERY = `*[_type == "siteSettings"][0].hideFromSearch`

/**
 * THE RULE, in one place. Every caller routes its fetched value through this so
 * the two transports below cannot drift apart.
 *
 * @param value whatever `siteSettings.hideFromSearch` resolved to
 * @returns true when the site must be hidden from search engines
 */
export function resolveHidden(value: unknown): boolean {
  return value === false ? false : true
}

/**
 * Build-time read for callers OUTSIDE the Next module graph — specifically
 * `next.config.ts`, which sets the `X-Robots-Tag` header and cannot import the
 * Sanity client. Uses bare `fetch` so it pulls in no dependencies.
 *
 * Any failure (missing env, non-200, malformed body, network error) resolves to
 * hidden, per the fail-closed rule above.
 */
export async function fetchSiteHiddenAtBuild(): Promise<boolean> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  if (!projectId || !dataset) return true

  try {
    const url =
      `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}` +
      `?query=${encodeURIComponent(SITE_HIDDEN_QUERY)}`
    const token = process.env.SANITY_API_READ_TOKEN
    const res = await fetch(url, {
      headers: token ? {Authorization: `Bearer ${token}`} : {},
      cache: 'no-store',
    })
    if (!res.ok) return true
    const body = (await res.json()) as {result?: unknown}
    return resolveHidden(body?.result)
  } catch {
    return true
  }
}
