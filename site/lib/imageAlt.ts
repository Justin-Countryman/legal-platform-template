// ─── How an image is described (monorepo backlog 457, `[R-465]`, `[R-700]`) ────────────────────────────────────────────
//
// An empty alt tells assistive technology an image carries nothing, and axe passes it as decoration, so a picture that
// needed a description and had none passed every check without a sound: about thirty renderers wrote `alt={x ?? ''}`
// and decided it for themselves. Now every image says which it is:
//
//   content     `alt={contentAlt(stored, fallback)}`: its stored description, else a description the renderer already
//               has (a person's name, the firm's name), else empty. An empty alt with no decorative mark is what Verify
//               lists for a person to describe or confirm decorative before the domain goes live (`[R-465]`; a
//               listing, never a hold, `[R-700]`); confirmed decorative goes in the client's CS/a11y-accepted.csv, per
//               page (the lead's ruling of 2026-10-15).
//   decorative  `alt="" data-decorative=""` at the call site, with the reason beside it: a texture, a ghost, a
//               photograph behind a band's words, or an image inside a link or button whose own name describes it.
//               `SanityImage` and `LogoImage` take it from `alt=""` and `decorative`.
//
// So a renderer that forgets to decide is listed, never silently decorative; and `platform/no-silent-empty-alt` refuses
// the old fallback outright.

/** A content image's alt: the first description that holds a word, else empty, which Verify lists. */
export function contentAlt(stored: string | null | undefined, ...fallbacks: Array<string | null | undefined>): string {
  for (const text of [stored, ...fallbacks]) {
    if (typeof text === 'string' && text.trim() !== '') return text
  }
  return ''
}
