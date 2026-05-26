// WS-Sidebar Phase 2.3 — pure pathname-derivation helpers for context-aware
// sidebar nav hierarchy rendering. Doctrine: BI/BI-Sidebar.md §1.
//
// All three helpers are client-side pure functions — they read pathname and
// GROQ-projected slug data, return derived shapes for the renderer. No Sanity
// client, no async, no side effects.
//
// Sidebar.tsx is the sole consumer today (Phase 2.3+); extracting these to
// their own file keeps Sidebar.tsx focused on render dispatch and gives Phase
// 2.4's accordion helpers a natural home alongside.

// ─── Pathname segment extraction (private) ────────────────────────────────────
//
// Tolerates leading/trailing slashes, query strings, and hash fragments. The
// sidebar's GROQ projects slugs without leading/trailing slashes; pathnames
// from Next's usePathname() are typically `/foo/bar` (no trailing slash) but
// may carry one — we strip both so comparisons normalize cleanly.

function getPathSegments(pathname: string | null | undefined): string[] {
  if (!pathname) return []
  // Strip query + hash if present (defensive — usePathname doesn't include
  // them today, but external pathname inputs in tests / future call sites
  // might).
  const stripped = pathname.split('?')[0].split('#')[0]
  return stripped.split('/').filter((seg) => seg.length > 0)
}

// ─── derivePrimaryAolSlug ─────────────────────────────────────────────────────
//
// Match the first URL segment against the projected AOL slug allowlist. If the
// segment matches one of the AOL slugs, that's the primary AOL. Otherwise the
// visitor is on a non-practice page (Scenario 4 in BI-Sidebar.md §1).
//
// Why this works: practiceArea schema enforces nested slugs of the form
// `parentSlug/childSlug` (see studio/schemas/documents/practiceArea.ts —
// `options.source` builds the slug from the parent's slug). So any practiceArea
// page URL begins with its top-level AOL slug as the first segment, regardless
// of depth.

export function derivePrimaryAolSlug(
  pathname: string | null | undefined,
  aolSlugs: readonly string[],
): string | null {
  const segments = getPathSegments(pathname)
  if (segments.length === 0) return null
  const first = segments[0]
  return aolSlugs.includes(first) ? first : null
}

// ─── deriveCurrentChildSlug ───────────────────────────────────────────────────
//
// Within an established primary AOL, find which direct child page the visitor
// is on by matching the second URL segment against the AOL's child slugs.
//
// IMPORTANT: GROQ projects child slugs as nested paths (the slug auto-builder
// emits `parentSlug/childSlug`). Pathname segments split on `/` give us the
// child's *terminal* segment. So we compare against the child slug's *last
// segment*, not the full nested string.
//
// Returns null when:
//   - The visitor is on the AOL parent page itself (no 2nd segment).
//   - The 2nd segment doesn't match any direct child (could be a stray URL or
//     a deeper page whose 2nd segment isn't a direct child).

export function deriveCurrentChildSlug(
  pathname: string | null | undefined,
  primaryAolSlug: string,
  childSlugs: readonly string[],
): string | null {
  const segments = getPathSegments(pathname)
  if (segments.length < 2) return null
  if (segments[0] !== primaryAolSlug) return null
  const secondSegment = segments[1]
  // childSlugs are projected as nested forms like 'family-law/divorce';
  // compare the terminal segment.
  for (const childSlug of childSlugs) {
    const childTerminal = childSlug.split('/').filter(Boolean).pop()
    if (childTerminal === secondSegment) return childSlug
  }
  return null
}

// ─── sortAolsByNavOrder ───────────────────────────────────────────────────────
//
// Sort AOL list by mainNavigation.practiceAreaOrder positions. AOLs whose _id
// is not in the order list fall through to the end in alphabetical order by
// title. Mirrors the orderedAttorneyIds pattern in sidebarAttorneyList
// (Sidebar.tsx) for editor consistency.

export function sortAolsByNavOrder<T extends {_id: string; title: string}>(
  aols: readonly T[],
  orderedAolIds: readonly string[],
): T[] {
  if (aols.length === 0) return []
  const position = new Map<string, number>()
  orderedAolIds.forEach((id, i) => position.set(id, i))

  // Partition into ordered (in order list) vs unordered (not in list).
  const ordered: T[] = []
  const unordered: T[] = []
  for (const aol of aols) {
    if (position.has(aol._id)) ordered.push(aol)
    else unordered.push(aol)
  }

  ordered.sort((a, b) => (position.get(a._id) ?? 0) - (position.get(b._id) ?? 0))
  unordered.sort((a, b) => a.title.localeCompare(b.title))

  return [...ordered, ...unordered]
}
