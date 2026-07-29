/**
 * The site's base host. One place names it; nothing else does.
 *
 * Doctrine: `BI/BI-URL-Architecture.md` → HOST-1, ruled by Justin 2026-07-28.
 *
 * The host comes from the deployment environment setting and from nowhere else,
 * and it is the `www` subdomain. **A page supplies a path; the framework joins
 * it to the base.** For metadata that is literal — Next resolves a relative
 * `alternates.canonical` and relative OpenGraph and Twitter image URLs against
 * `metadataBase`, so those routes pass a path and never see a host at all. The
 * three places that genuinely need an absolute string — JSON-LD, `robots.ts`
 * and `sitemap.ts` — build it from `siteOrigin()` here rather than each holding
 * a base of its own.
 *
 * WHAT THIS REPLACES, so nobody reassembles it. Two deciders existed and each
 * was right about half the page: `siteSettings.primaryDomain` in Sanity fed
 * `metadataBase`, while this environment setting fed a module-level `DOMAIN`
 * constant declared separately in FOUR route files. The two were normalised in
 * opposite directions upstream — Site-Build stripped `www.`, Deploy-Setup added
 * it — so one rendered page emitted both hosts at once. The Sanity field is
 * gone, with its three projections and the build code that composed it. Do not
 * reintroduce a per-route constant; that is the defect, not a duplication.
 *
 * A DIFFERENT FIELD KEEPS THE NAME. `firmInfo.primaryDomain` in
 * `CS-FIRM-DATA.json` is the Zite projection the Site Builder's client lookup
 * reads. It is not part of address construction and is unrelated to this.
 */

/**
 * The bare host, e.g. `www.example.com`.
 *
 * `NEXT_PUBLIC_*` is inlined at BUILD time, so this is a build-time constant
 * rather than a per-request read. That is why refusing a production build with
 * no host is safe: it cannot turn a transient read into a failure on a live
 * page, because there is no runtime read to fail.
 */
export function siteHost(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_DOMAIN?.trim()
  if (configured) return configured

  // A local development default is expected. A production build silently
  // emitting a placeholder is the failure HOST-1 forbids: before this, a
  // missing setting shipped `localhost:3000` in the metadata, sitemap and
  // robots paths and `example.com` in the four route files, and nothing said
  // so. Fail the build instead.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_SITE_DOMAIN is not set. It is the only source of the ' +
        "site's host (BI-URL-Architecture.md HOST-1), so a production build " +
        'without it would emit a placeholder host on every absolute URL — the ' +
        'canonical tag, the OG and Twitter images, the JSON-LD URLs, the ' +
        'sitemap and the robots.txt Sitemap line. Set it in the Vercel project ' +
        'environment (Deploy-Setup writes it as the www form) and rebuild.',
    )
  }
  return 'localhost:3000'
}

/** The origin, e.g. `https://www.example.com`. No trailing slash. */
export function siteOrigin(): string {
  return `https://${siteHost()}`
}

/** An absolute URL for a site-relative path. `absoluteUrl('/blog/')`. */
export function absoluteUrl(path: string): string {
  return `${siteOrigin()}${path.startsWith('/') ? path : `/${path}`}`
}
