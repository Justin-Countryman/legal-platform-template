// ─── NAP Token Resolution ─────────────────────────────────────────────────────

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
  return text.replace(/\{\{([\w.-]+)\}\}/g, (_, key: string) => {
    const value = tokens[key]
    return value ?? `{{${key}}}`
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
    primaryPhone:   (r?.primaryPhone   as string | null) ?? null,
    primaryTollFree: (r?.primaryTollFree as string | null) ?? null,
    profileLayout:   (r?.profileLayout   as string | null) ?? null,
    profileCtaLabel: (r?.profileCtaLabel as string | null) ?? null,
    profileCtaUrl:   (r?.profileCtaUrl   as string | null) ?? null,
  }
  for (const loc of (r?.locations as Array<Record<string, string | undefined>>) ?? []) {
    const id = loc._id
    if (loc.phone) tokens[`location.${id}.phone`] = loc.phone
    if (loc.fax)   tokens[`location.${id}.fax`]   = loc.fax
    if (loc.address1) tokens[`location.${id}.address1`] = loc.address1
    if (loc.address2) tokens[`location.${id}.address2`] = loc.address2
    if (loc.address3) tokens[`location.${id}.address3`] = loc.address3
    if (loc.city)     tokens[`location.${id}.city`]     = loc.city
    if (loc.state)    tokens[`location.${id}.state`]    = loc.state
    if (loc.zip)      tokens[`location.${id}.zip`]      = loc.zip
    const street = [loc.address1, loc.address2, loc.address3].filter(Boolean).join(', ')
    const cityLine = [loc.city, [loc.state, loc.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    const address = [street, cityLine].filter(Boolean).join('\n')
    if (address) tokens[`location.${id}.address`] = address
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
  if (!tokens) return `{{${tokenKey}}}`
  const value = tokens[tokenKey]
  return value ?? `{{${tokenKey}}}`
}
