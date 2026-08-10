/**
 * The security headers every response carries, in one place.
 *
 * Ruled separately from `BI/rules/technical-seo.md` and queued as that file's
 * line 6: the standard set for a clean Lighthouse Best Practices score, on top
 * of the four that already shipped. TECH-6's scope note carries the pointer and
 * nothing else — these are platform security rather than technical SEO.
 *
 * THEY LIVE HERE RATHER THAN INLINE IN `next.config.ts` so a test can reach
 * them. That is the lesson `OUTSTANDING.md` item 159 paid for on the redirect
 * loader in the same file: logic inside a config module is logic no suite runs.
 *
 * ─── WHAT LIGHTHOUSE ACTUALLY AUDITS, checked rather than remembered ─────────
 *
 * Five of the Best Practices category's Trust & Safety audits are decided by a
 * response header. Read off Lighthouse's own `core/config/default-config.js`
 * and its audit sources on 2026-08-10, not from memory:
 *
 *   has-hsts                `Strict-Transport-Security`. Wants a long max-age
 *                           with `includeSubDomains` and `preload`. Already
 *                           satisfied by the header below and unchanged.
 *   clickjacking-mitigation `X-Frame-Options: SAMEORIGIN` or `DENY`, or a CSP
 *                           `frame-ancestors`. ADDED HERE.
 *   origin-isolation        A `Cross-Origin-Opener-Policy` naming any of
 *                           `unsafe-none`, `same-origin-allow-popups`,
 *                           `same-origin` or `noopener-allow-popups`. ADDED
 *                           HERE.
 *   csp-xss                 `Content-Security-Policy`. NOT ADDED — CSP is
 *                           deliberately deferred, so this audit stays red and
 *                           that is a decision rather than an omission.
 *   trusted-types-xss       CSP `require-trusted-types-for`. Deferred with CSP,
 *                           for the same reason.
 *
 * So "a clean Best Practices score" is not what this achieves and the CSP
 * carve-out is why. What it achieves is every header-driven audit that does not
 * require CSP.
 *
 * ─── THE CSP DEFERRAL, AND WHERE IT IS RULED ────────────────────────────────
 *
 * `BI/rules/technical-seo.md` build queue line 6 is its live home and carries
 * the reasoning: this site renders inline script and inline style from four
 * surfaces — the inline JSON-LD blocks, `framer-motion`'s runtime style
 * injection, the Sanity-driven `<style dangerouslySetInnerHTML>` font injection
 * in `app/(site)/layout.tsx`, and the Vercel Analytics and Speed Insights
 * scripts — and a policy written without auditing all four either breaks the
 * site or sets `unsafe-inline` everywhere and buys nothing.
 *
 * This used to read "locked decision D5", pointing at a dated entry in the
 * platform's completed-work backlog archive. That address moved with the
 * archive, and the phrase implied a decision registry this platform does not
 * have, so both are gone: a live claim does not cite a dated backlog entry as
 * its authority.
 *
 * ─── WHY `same-origin-allow-popups` AND NOT `same-origin` ────────────────────
 *
 * All four COOP values above pass the audit equally, so the choice is made on
 * behaviour rather than on score. `same-origin` severs `window.opener` for
 * every popup a page opens, which is exactly how a third-party scheduling,
 * chat or payment widget that opens a popup and reports back stops working —
 * on a template that ships arbitrary operator-pasted embeds, that is a silent
 * break on somebody's site rather than a hypothetical.
 * `same-origin-allow-popups` isolates the browsing context group from anything
 * that opens THIS page while leaving popups this page opens intact.
 *
 * The first four are unchanged and predate this file: platform-portable
 * baseline, shipped in Phase 1.
 */
export const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {key: 'X-Frame-Options', value: 'SAMEORIGIN'},
  {key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups'},
]
