// ─── A page's close: the site's call to action with the page's own words over it ──────────────────────────────
//
// Every page that draws the close (the homepage's bookend, the grey box, each interior route) reads the
// `globalCta` singleton and the page's `ctaFormOverride`, and this is the one merge they share. An override
// field the operator filled wins; one left empty leaves the site's value in place, which is what the Studio's
// help text promises ("leave blank to use Global CTA defaults").
//
// Empty is what GROQ answers for an unset field (null), blank text, and a button list with no button that would
// draw (`toCtaItems` drops one lacking a label or a link). A plain `{...global, ...override}` let every null win:
// an override holding only a heading drew the close with no line and no button (Phase 18 session 1's ledger,
// 2026-09-30, proven on a throwaway's render).

type Button = {title?: string | null; url?: string | null} | null | undefined

function leftEmpty(key: string, value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return key === 'buttons' ? !value.some((b: Button) => !!b?.title && !!b?.url) : value.length === 0
  return false
}

/** The site's close with each field the page's override filled laid over it. Changes neither argument. */
export function withCtaOverride<T extends object>(site: T, override: Partial<T> | null | undefined): T {
  if (!override) return site
  const merged = {...site} as Record<string, unknown>
  for (const [key, value] of Object.entries(override)) {
    if (!leftEmpty(key, value)) merged[key] = value
  }
  return merged as T
}
