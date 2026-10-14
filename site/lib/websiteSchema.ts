import {siteOrigin} from '@/lib/siteHost'

// ─── The homepage's WebSite node (monorepo [R-702] rule 3, ENTITY-7) ──────────
//
// Google takes the site name it shows above every result chiefly from WebSite
// structured data on the home page. Basic optimization lets a long title shorten
// the firm's name, then drop it, everywhere but the homepage, About, Contact and
// attorney pages (rule 2); this node is what keeps the firm named above those
// results. `name` is the firm's natural name (`firmNameShort`, which Site-Build
// fills from Zite's marketing name, else the legal name); `alternateName` the
// legal name when it differs. The firm itself stays the root layout's
// Organization node (`#firm`); this one points at it by identifier and declares
// nothing else about it (ENTITY-6). Homepage only: Google reads it there.

export type WebSiteNames = {
  firmName?: string | null
  firmNameShort?: string | null
} | null

export function buildWebSiteSchema(names: WebSiteNames) {
  const full = (names?.firmName ?? '').trim()
  const short = (names?.firmNameShort ?? '').trim()
  const name = short || full
  if (!name) return null
  const url = `${siteOrigin()}/`
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}#website`,
    name,
    ...(full && full !== name ? {alternateName: full} : {}),
    url,
    publisher: {'@id': `${url}#firm`},
  }
}
