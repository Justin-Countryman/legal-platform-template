import {resolveTokenString, type NapTokens} from '@/lib/tokens'

/** A section's "view all" link as the header draws it (monorepo `[R-641]`): its label with the firm's tokens resolved and
 *  its page, or nothing unless both are set, so a half-filled link draws no link. */
export function headerLinkOf(
  link: {label?: string | null; url?: string | null} | null | undefined,
  napTokens?: NapTokens | null,
): {label: string; href: string} | null {
  const label = resolveTokenString(link?.label ?? null, napTokens)
  const href = link?.url?.trim()
  return label && href ? {label, href} : null
}
