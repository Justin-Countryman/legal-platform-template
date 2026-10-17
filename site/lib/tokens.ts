// ─── NAP Token Resolution ─────────────────────────────────────────────────────

/**
 * Format a phone number for display as `xxx-xxx-xxxx` (US).
 * Accepts any stored shape — E.164 (`+17632805100`), `(763) 280-5100`,
 * `7632805100` — strips a leading US country code, and returns the canonical
 * dashed form. Falls back to the trimmed original if it isn't a 10-digit US
 * number (so extensions / international numbers pass through untouched).
 * Idempotent: formatPhone(formatPhone(x)) === formatPhone(x).
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  // An international number (a `+` that is not `+1`) is shown as stored: reading its digits as a North American
  // number dropped its country (`+65 6123 4567` as 656-123-4567; ADV-519, monorepo backlog 519).
  if (/^\s*\+(?!1)/.test(raw)) return raw.trim()
  const digits = raw.replace(/\D/g, '')
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (local.length !== 10) return raw.trim()
  return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`
}

/**
 * A phone's `tel:` href in RFC 3966's global form (§5.1: "All phone numbers MUST use the global form unless they
 * cannot be represented as such"), compact, as the platform's call button writes it (monorepo `phone_button`,
 * [R-608]): the first North American number in the text as `tel:+16125550100`, an extension or a second number left
 * off; an international number stored with its `+` (not `+1`) and 8 to 15 digits as `tel:+` and its digits. '' for
 * anything else (a vanity number, a seven-digit number, a malformed `+1`): a link that dials the wrong number is worse
 * than text (ADV-519). Monorepo backlog 519.
 */
export function telHref(raw: string | null | undefined): string {
  const text = (raw ?? '').trim()
  const nanp = /(?:\+?1[\s.-]*)?\(?(\d{3})\)?[\s.-]*(\d{3})[\s.-]*(\d{4})(?!\d)/.exec(text)
  if (nanp && (!text.startsWith('+') || text.startsWith('+1'))) return `tel:+1${nanp[1]}${nanp[2]}${nanp[3]}`
  const intl = /^(\+[02-9][\d\s.()-]{6,18}\d)/.exec(text)
  if (intl) {
    const digits = intl[1].replace(/\D/g, '')
    if (digits.length >= 8 && digits.length <= 15) return `tel:+${digits}`
  }
  return ''
}

/** The tokens that hold a phone a visitor calls (never a fax): a page's text renders them tap-to-call (backlog 519). */
export function isPhoneToken(key: string | null | undefined): boolean {
  return key === 'primaryPhone' || key === 'primaryTollFree' || /^(?:office|location\.[^.]+)\.(?:phone|emergency)$/.test(key ?? '')
}

export type NapTokens = {
  firmName?: string | null
  firmNameShort?: string | null
  primaryPhone?: string | null
  primaryTollFree?: string | null
  profileLayout?: string | null
  profileCtaLabel?: string | null
  profileCtaUrl?: string | null
  [key: string]: string | null | undefined
}

/**
 * Replace {{tokenKey}} shortcodes in a plain text string with their resolved values.
 * Used for seoTitle, metaDescription, and other plain-text fields.
 */
export function resolveTokenString(
  text: string | null | undefined,
  tokens: NapTokens | null | undefined,
): string {
  if (!text) return ''
  if (!tokens) return text
  // Empty/unknown tokens resolve to '' (not the literal {{key}}) so unset fields
  // — e.g. {{primaryTollFree}} for a firm with no toll-free — never leak the raw
  // shortcode to visitors.
  return text.replace(/\{\{([\w.-]+)\}\}/g, (_, key: string) => {
    const value = tokens[key]
    return value ?? ''
  })
}

/**
 * Resolve a page's title fragment for `generateMetadata`. Doctrine:
 * BI-Content.md "Title tags" — `seoTitle` holds the page-specific fragment,
 * the root layout's title template appends the firm name, and no page may
 * render a title beginning with the separator.
 *
 * Returns the resolved `seoTitle` when non-empty, else the resolved page
 * name, else `undefined`. The `undefined` matters: `''` counts as a present
 * title to Next, which takes the template branch and renders a leading
 * separator; `undefined` falls through to the root `default` (the bare firm
 * name), the only correct rendering left when both sources are empty.
 */
export function titleFragment(
  seoTitle: string | null | undefined,
  pageName: string | null | undefined,
  tokens: NapTokens | null | undefined,
): string | undefined {
  const fragment = resolveTokenString(seoTitle, tokens).trim()
  if (fragment) return fragment
  const name = resolveTokenString(pageName, tokens).trim()
  return name || undefined
}

// Computes the per-field display values for one location. Shared by the
// location-keyed tokens (location.{_id}.field) and the current-office aliases
// (office.field), so both stay identical.
function computeOfficeFields(loc: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  const phone = loc.phone as string | undefined
  const fax = loc.fax as string | undefined
  const address1 = loc.address1 as string | undefined
  const address2 = loc.address2 as string | undefined
  const address3 = loc.address3 as string | undefined
  const city = loc.city as string | undefined
  const state = loc.state as string | undefined
  const zip = loc.zip as string | undefined
  if (phone) out.phone = formatPhone(phone)
  if (fax)   out.fax   = formatPhone(fax)
  if (address1) out.address1 = address1
  if (address2) out.address2 = address2
  if (address3) out.address3 = address3
  if (city)  out.city  = city
  if (state) out.state = state
  if (zip)   out.zip   = zip
  const street = [address1, address2, address3].filter(Boolean).join(', ')
  const cityLine = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  const address = [street, cityLine].filter(Boolean).join('\n')
  if (address) out.address = address
  // Appointment policy — only surface the restriction; "Walk-Ins Welcome"
  // (default) renders nothing (mirrors appointmentNoteLabel in footers/shared).
  if (loc.appointmentRequired === 'Appointment Required') out.appointment = 'By appointment only'
  // Emergency — label + number, both gated on the 24/7 toggle so a template
  // line collapses to nothing when off.
  if (loc.emergency24_7) {
    out.emergencyLabel = '24/7 Emergency: '
    const ep = formatPhone(loc.emergencyPhone as string | undefined)
    if (ep) out.emergency = ep
  }
  return out
}

/**
 * Expand raw NAP_TOKENS_QUERY result into a flat NapTokens map.
 * Adds per-location keys (location.{_id}.field) for every active location, plus
 * current-office aliases (office.field) resolved to `currentLocationId` when
 * given, otherwise the firm's primary location. The office.* aliases let one
 * template body work on any location page (and default to the primary office
 * elsewhere) without baking a specific location id.
 */
export function expandNapTokens(raw: unknown, currentLocationId?: string | null): NapTokens {
  const r = raw as Record<string, unknown> | null | undefined
  const tokens: NapTokens = {
    firmName:       (r?.firmName       as string | null) ?? null,
    firmNameShort:  (r?.firmNameShort  as string | null) ?? null,
    primaryPhone:   formatPhone(r?.primaryPhone   as string | null) || null,
    primaryTollFree: formatPhone(r?.primaryTollFree as string | null) || null,
    profileLayout:   (r?.profileLayout   as string | null) ?? null,
    profileCtaLabel: (r?.profileCtaLabel as string | null) ?? null,
    profileCtaUrl:   (r?.profileCtaUrl   as string | null) ?? null,
  }
  const activeId = currentLocationId ?? (r?.primaryLocationId as string | undefined)
  for (const loc of (r?.locations as Array<Record<string, unknown>>) ?? []) {
    const id = loc._id as string
    const fields = computeOfficeFields(loc)
    for (const [k, v] of Object.entries(fields)) {
      tokens[`location.${id}.${k}`] = v
      if (id === activeId) tokens[`office.${k}`] = v
    }
  }
  return tokens
}

/**
 * Resolve a single contentToken key to its display value.
 * Used in PortableText renderer for inline contentToken inline objects.
 */
export function resolveToken(
  tokenKey: string | null | undefined,
  tokens: NapTokens | null | undefined,
): string {
  if (!tokenKey) return ''
  if (!tokens) return ''
  const value = tokens[tokenKey]
  // Empty/unknown tokens resolve to '' so unset fields never leak {{key}}.
  return value ?? ''
}
