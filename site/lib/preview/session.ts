import {createHmac, timingSafeEqual} from 'node:crypto'
import {cache} from 'react'
import {cookies} from 'next/headers'

// ─── The preview's signed link and its session ───────────────────────────────
//
// Phase 17A (monorepo WS-V1-PHASE17A-DESIGN §2.1). The preview address,
// `/site-preview/<style set>/<palette>/<view>`, renders only for a browser holding
// a cookie this module signed. The cookie is set by the entry route from a signed
// link: the operator's, minted by the Site Builder App, and the client's share link,
// minted by the switcher. Both are signed with `SITE_PREVIEW_SECRET`, a server-only
// env var; unset, every preview request is a 404 and nothing else changes.
//
// The format is the same for a link and a cookie, and the same in Python (the Site
// Builder App mints and `apply_design.py` verifies with it):
//
//   base64url(JSON payload) "." base64url(HMAC-SHA256(secret, the first part))
//
// The MAC is taken over the encoded first part exactly as it travels, so neither
// side has to reproduce the other's JSON spacing. `PREVIEW_TOKEN_VECTOR` below is
// written into `studio/presets.json` and replayed by the monorepo's suite, which is
// what holds the two signers equal.
//
// WHY THE SESSION IS CHECKED IN THE PAGE AS WELL AS THE LAYOUT. Next renders a page
// concurrently with its layout and can render it without the layout at all (a
// router request that claims the layout is already on screen). Measured in the
// challenge: a check in the layout alone let the page's whole output out to a
// request with no cookie (§7.5). So every render entry point calls
// `getPreviewSession()` first, before it fetches anything.

export const PREVIEW_COOKIE = 'lp-preview'
/** The cookie never travels to a live route: the browser sends it under this path only. */
export const PREVIEW_PATH = '/site-preview'
/** A client's share link lasts as long as a Shopify theme preview does. */
export const CLIENT_LINK_SECONDS = 14 * 24 * 60 * 60
/** An Apply link lives an hour: long enough to confirm, short enough to go stale safely. */
export const APPLY_LINK_SECONDS = 60 * 60

export type PreviewRole = 'operator' | 'client'
export type PreviewView = 'design' | 'grey'

/** Where Apply is confirmed: the operator's own Site Builder App, and which client. */
export type ApplyTarget = {origin: string; slug: string}

/** What a link carries. A client's choices are bound into it; an operator's are the path's. */
export type PreviewGrant = {
  v: 1
  role: PreviewRole
  /** Unix seconds. */
  exp: number
  styleSet?: string
  palette?: string
  /** The theme's id (Phase 17B session 3). Absent on a link minted before the fourth
   *  address segment existed, and read as `site` then, so a 14-day client link outlives
   *  the route (record §2.10, amendment 16). */
  flow?: string
  view?: PreviewView
  apply?: ApplyTarget
  /** The meeting's preselection (Phase 17C session 3, `[R-537]`): the style sets and palettes the
   *  Site Builder App suggests for this firm, with its reason, shown first in the switcher's rows.
   *  Operator grants only; `v` stays 1, so an older pin, whose `asGrant` builds its grant from the
   *  keys it knows, drops it and shows the whole roster. */
  suggest?: PreviewSuggest
}

export type SuggestRow = {ids: string[]; why: string}
export type PreviewSuggest = {styleSet?: SuggestRow; palette?: SuggestRow}

/** The bounds the Python signer holds too (`BE/_shared/preview_tokens.py`). */
const SUGGEST_ID = /^[a-z0-9-]{1,32}$/
const SUGGEST_IDS_MAX = 3
const SUGGEST_WHY_MAX = 300

function suggestRow(v: unknown): SuggestRow | null {
  const r = v as {ids?: unknown; why?: unknown} | null
  if (!r || typeof r !== 'object' || !Array.isArray(r.ids)) return null
  if (r.ids.length < 1 || r.ids.length > SUGGEST_IDS_MAX || !r.ids.every((i) => typeof i === 'string' && SUGGEST_ID.test(i))) return null
  if (typeof r.why !== 'string' || !r.why || r.why.length > SUGGEST_WHY_MAX) return null
  return {ids: r.ids as string[], why: r.why}
}

/** A grant's `suggest`, read leniently: a malformed one is dropped and the grant kept. */
export function asSuggest(v: unknown): PreviewSuggest | undefined {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  if (Object.keys(o).some((k) => k !== 'styleSet' && k !== 'palette')) return undefined
  const out: PreviewSuggest = {}
  if (o.styleSet !== undefined) {
    const row = suggestRow(o.styleSet)
    if (!row) return undefined
    out.styleSet = row
  }
  if (o.palette !== undefined) {
    const row = suggestRow(o.palette)
    if (!row) return undefined
    out.palette = row
  }
  return out.styleSet || out.palette ? out : undefined
}

const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64url')

function mac(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url')
}

/** A signed token for `payload`, or null when there is no secret to sign with. */
export function signToken(payload: object, secret = process.env.SITE_PREVIEW_SECRET): string | null {
  if (!secret) return null
  const body = b64(JSON.stringify(payload))
  return `${body}.${mac(secret, body)}`
}

/** The payload of a token this site signed, or null: no secret, a malformed token, a
 *  bad MAC. Expiry is the caller's question (`isLive`). */
export function verifyToken(token: string | null | undefined, secret = process.env.SITE_PREVIEW_SECRET): unknown {
  if (!secret || !token) return null
  const dot = token.indexOf('.')
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return null
  const body = token.slice(0, dot)
  const given = Buffer.from(token.slice(dot + 1))
  const wanted = Buffer.from(mac(secret, body))
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

const isRole = (v: unknown): v is PreviewRole => v === 'operator' || v === 'client'
const isView = (v: unknown): v is PreviewView => v === 'design' || v === 'grey'
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200

/** A verified payload read as a grant, or null when its shape is not one. */
export function asGrant(payload: unknown): PreviewGrant | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Record<string, unknown>
  if (p.v !== 1 || !isRole(p.role) || typeof p.exp !== 'number' || !Number.isFinite(p.exp)) return null
  const grant: PreviewGrant = {v: 1, role: p.role, exp: p.exp}
  if (p.styleSet !== undefined) {
    if (!isText(p.styleSet)) return null
    grant.styleSet = p.styleSet
  }
  if (p.palette !== undefined) {
    if (!isText(p.palette)) return null
    grant.palette = p.palette
  }
  if (p.flow !== undefined) {
    if (!isText(p.flow)) return null
    grant.flow = p.flow
  }
  if (p.view !== undefined) {
    if (!isView(p.view)) return null
    grant.view = p.view
  }
  if (p.apply !== undefined) {
    const a = p.apply as Record<string, unknown> | null
    // Only an operator's link may carry where Apply is confirmed.
    if (p.role !== 'operator' || !a || !isText(a.origin) || !isText(a.slug)) return null
    grant.apply = {origin: a.origin, slug: a.slug}
  }
  // The meeting's preselection rides an operator's grant only, and never refuses one.
  if (p.role === 'operator') {
    const suggest = asSuggest(p.suggest)
    if (suggest) grant.suggest = suggest
  }
  // A client's view is bound to the choices it was sent, so it must carry them. The
  // theme is optional: a link minted before the fourth segment carries none.
  if (p.role === 'client' && (!grant.styleSet || !grant.palette || !grant.view)) return null
  return grant
}

export const nowSeconds = () => Math.floor(Date.now() / 1000)

export function isLive(grant: PreviewGrant, now = nowSeconds()): boolean {
  return grant.exp > now
}

/** The state a preview render is in. `none` renders a 404; `ended` renders only the
 *  notice that the link has expired; `live` renders the preview. */
export type PreviewSession =
  | {state: 'none'}
  | {state: 'ended'}
  | {state: 'live'; grant: PreviewGrant}

export function readSession(cookieValue: string | undefined, secret = process.env.SITE_PREVIEW_SECRET, now = nowSeconds()): PreviewSession {
  const grant = asGrant(verifyToken(cookieValue, secret))
  if (!grant) return {state: 'none'}
  return isLive(grant, now) ? {state: 'live', grant} : {state: 'ended'}
}

/** The request's preview session, read once per request and shared by the layout,
 *  the page and the switcher. Only preview routes call it; no live route reads a
 *  cookie. */
export const getPreviewSession = cache(async (): Promise<PreviewSession> => {
  if (!process.env.SITE_PREVIEW_SECRET) return {state: 'none'}
  const jar = await cookies()
  return readSession(jar.get(PREVIEW_COOKIE)?.value)
})

// ─── The shared vector ────────────────────────────────────────────────────────
//
// A fixed secret, payload and the token they sign to. `lib/__tests__/presets.test.ts`
// writes it into `studio/presets.json`; the monorepo's suite signs the same payload in
// Python and must produce the same token.
export const PREVIEW_TOKEN_VECTOR = {
  secret: 'vector-secret-not-a-real-one',
  payload: {v: 1, role: 'operator', exp: 1893456000, apply: {origin: 'http://127.0.0.1:8787', slug: 'example-firm'}},
} as const
