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
  const digits = raw.replace(/\D/g, '')
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (local.length !== 10) return raw.trim()
  return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`
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
 * Expand raw NAP_TOKENS_QUERY result into a flat NapTokens map.
 * Adds per-location keys: location.{_id}.phone, location.{_id}.address
 */
export function expandNapTokens(raw: unknown): NapTokens {
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
  for (const loc of (r?.locations as Array<Record<string, unknown>>) ?? []) {
    const id = loc._id as string
    const phone = loc.phone as string | undefined
    const fax = loc.fax as string | undefined
    const address1 = loc.address1 as string | undefined
    const address2 = loc.address2 as string | undefined
    const address3 = loc.address3 as string | undefined
    const city = loc.city as string | undefined
    const state = loc.state as string | undefined
    const zip = loc.zip as string | undefined
    if (phone) tokens[`location.${id}.phone`] = formatPhone(phone)
    if (fax)   tokens[`location.${id}.fax`]   = formatPhone(fax)
    if (address1) tokens[`location.${id}.address1`] = address1
    if (address2) tokens[`location.${id}.address2`] = address2
    if (address3) tokens[`location.${id}.address3`] = address3
    if (city)     tokens[`location.${id}.city`]     = city
    if (state)    tokens[`location.${id}.state`]    = state
    if (zip)      tokens[`location.${id}.zip`]      = zip
    const street = [address1, address2, address3].filter(Boolean).join(', ')
    const cityLine = [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    const address = [street, cityLine].filter(Boolean).join('\n')
    if (address) tokens[`location.${id}.address`] = address
    // Appointment policy — only surface the restriction. "Walk-Ins Welcome" is
    // the default state, so it renders nothing (mirrors appointmentNoteLabel in
    // footers/shared.tsx).
    if (loc.appointmentRequired === 'Appointment Required') {
      tokens[`location.${id}.appointment`] = 'By appointment only'
    }
    // Emergency — two tokens, both gated on the 24/7 toggle so a standard
    // template line `{{…emergencyLabel}}{{…emergency}}` shows when enabled and
    // collapses to nothing when not:
    //   .emergencyLabel → "24/7 Emergency: " (label + separator)
    //   .emergency      → the formatted emergency phone number
    if (loc.emergency24_7) {
      tokens[`location.${id}.emergencyLabel`] = '24/7 Emergency: '
      const ep = formatPhone(loc.emergencyPhone as string | undefined)
      if (ep) tokens[`location.${id}.emergency`] = ep
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
