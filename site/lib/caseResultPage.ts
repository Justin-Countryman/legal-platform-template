// ─── Is this case result a page? (monorepo backlog 454) ───────────────────────
//
// ONE GROQ string, read by the site's queries (the route, its static params,
// `sitemap.xml`, the card's link) and by the Studio's link picker, so a result
// is offered as a link exactly when the site serves it. Its own-page switch is on
// and its address is `case-results/` and one name: the one segment
// `app/(site)/case-results/[slug]` takes, so `case-results/a/b` is never listed
// and never linked (WS-CASE-RESULTS-DESIGN-2026-10-13.md §11.6, ADV-CR-C).
//
// A module of its own with no imports, because the Studio reads it too
// (`studio/components/PageLinkInput.tsx`), as it reads `lib/flows.ts`.

export const CASE_RESULT_HAS_PAGE = `(hasPage == true && string::startsWith(slug.current, "case-results/") && count(string::split(slug.current, "/")) == 2)`
