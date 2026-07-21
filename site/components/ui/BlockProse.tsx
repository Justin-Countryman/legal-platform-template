import {PortableText as PortableTextRenderer, type PortableTextComponents} from 'next-sanity'
import Link from 'next/link'
import {resolveToken, type NapTokens} from '@/lib/tokens'

// ─── BlockProse ───────────────────────────────────────────────────────────────
//
// Renders `blockProse`, the Portable Text type scoped to homepage canvas blocks.
//
// PLATFORM-OWNED, and it is NOT the primitive BI-Library Layer 3 rule 2 bans.
// That rule bans anything that decides TYPE SCALE on a block's behalf, and names
// `components/ui/PortableText`, which maps h2 to text-3xl and h3 to text-2xl.
// This component cannot make that mistake: `blockProse` has no heading styles at
// all, so there is no scale decision here to get wrong. What is left is body
// prose, and body prose is the same size on the homepage and on interior pages
// — the marketing scale covers headings only (marketing-h1 through h4). A block
// that wants a heading writes its own, at marketing scale, outside this
// component.
//
// It lives in ui/ rather than in the client-owned homepage/ directory for the
// same reason the canvas dispatcher does: it is identical on every client, and
// `components/homepage/` holds block components only.
//
// TOKENS ONLY. Color from role tokens, spacing from the scale. No hex, no font
// family; `platform/no-raw-color-value` and `platform/no-hardcoded-font-family`
// enforce it.

const components = (napTokens?: NapTokens | null): PortableTextComponents => ({
  block: {
    // `normal` is the only style blockProse permits, so this map is complete
    // rather than partial. If a heading ever appears here, the schema changed.
    normal: ({children}) => <p className="mt-4 text-foreground-muted first:mt-0">{children}</p>,
  },
  list: {
    bullet: ({children}) => (
      <ul role="list" className="mt-4 list-disc space-y-2 pl-6 text-foreground-muted">{children}</ul>
    ),
    number: ({children}) => (
      <ol role="list" className="mt-4 list-decimal space-y-2 pl-6 text-foreground-muted">{children}</ol>
    ),
  },
  marks: {
    strong: ({children}) => <strong className="font-semibold text-foreground">{children}</strong>,
    em: ({children}) => <em className="italic">{children}</em>,
    contentToken: ({value}) => <>{resolveToken(value?.tokenKey, napTokens)}</>,
    link: ({children, value}) => {
      const href = value?.href
      if (!href) return <>{children}</>
      const isExternal =
        href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:')
      if (isExternal) {
        return (
          <a
            href={href}
            className="text-action-text underline underline-offset-4 transition-colors duration-ui-fast hover:text-action-hover"
            {...(value?.blank ? {target: '_blank', rel: 'noopener noreferrer'} : {})}
          >
            {children}
          </a>
        )
      }
      return (
        <Link href={href} className="text-action-text underline underline-offset-4 transition-colors duration-ui-fast hover:text-action-hover">
          {children}
        </Link>
      )
    },
  },
})

export function BlockProse({
  value,
  napTokens,
}: {
  value?: unknown[] | null
  napTokens?: NapTokens | null
}) {
  if (!value || value.length === 0) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <PortableTextRenderer value={value as any} components={components(napTokens)} />
}
