import Image from 'next/image'
import Link from 'next/link'
import {PortableText, type PortableTextComponents} from 'next-sanity'
import {resolveToken, type NapTokens} from '@/lib/tokens'
import {OfficeHoursBlock} from '@/components/location/OfficeHoursBlock'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  value: unknown[]
  napTokens?: NapTokens | null
}

// A `normal` paragraph whose entire content resolves to empty — e.g. a template
// line of only `{{…emergencyLabel}}{{…emergency}}` for a firm with no 24/7
// service — should render nothing rather than leave a blank gap. Returns true
// when every child is an empty/whitespace span or a token that resolves empty.
function paragraphResolvesEmpty(value: unknown, napTokens: NapTokens | null | undefined): boolean {
  const children = (value as {children?: Array<Record<string, unknown>>})?.children
  if (!Array.isArray(children) || children.length === 0) return true
  return children.every((c) => {
    if (c._type === 'span') return !String(c.text ?? '').trim()
    if (c._type === 'contentToken') return !resolveToken(c.tokenKey as string, napTokens).trim()
    return false // images / other inline objects count as content
  })
}

// ─── Component Map ────────────────────────────────────────────────────────────

function makeComponents(napTokens: NapTokens | null | undefined): PortableTextComponents {
  return {
    types: {
      contentToken: ({value}) => {
        return <>{resolveToken(value?.tokenKey, napTokens)}</>
      },
      officeHours: ({value}) => <OfficeHoursBlock title={value?.title} />,
      image: ({value}) => {
        const src = value?.src ?? value?.asset?.url
        if (!src) return null
        const width = value?.width ?? value?.asset?.metadata?.dimensions?.width ?? 800
        const height = value?.height ?? value?.asset?.metadata?.dimensions?.height ?? 450
        return (
          <figure className="my-8">
            <Image
              src={src}
              alt={value?.alt ?? ''}
              width={width}
              height={height}
              className="w-full rounded-ui object-cover"
            />
            {value?.caption && (
              <figcaption className="mt-2 text-center text-sm text-foreground-muted">
                {value.caption}
              </figcaption>
            )}
          </figure>
        )
      },
    },

    marks: {
      contentToken: ({value}) => {
        return <>{resolveToken(value?.tokenKey, napTokens)}</>
      },
      link: ({children, value}) => {
        const href = value?.href
        if (!href) return <>{children}</>
        const isExternal =
          href.startsWith('http') ||
          href.startsWith('tel:') ||
          href.startsWith('mailto:')
        if (isExternal) {
          return (
            <a
              href={href}
              className="text-action-text underline underline-offset-4 transition-colors duration-ui-fast hover:text-action-hover"
              {...(href.startsWith('http') ? {target: '_blank', rel: 'noopener noreferrer'} : {})}
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
      strong: ({children}) => <strong className="font-bold">{children}</strong>,
      em: ({children}) => <em className="italic">{children}</em>,
      underline: ({children}) => <span className="underline">{children}</span>,
      'strike-through': ({children}) => <span className="line-through">{children}</span>,
      code: ({children}) => (
        <code className="rounded-ui bg-muted px-1 py-0.5 font-mono text-sm">
          {children}
        </code>
      ),
    },

    block: {
      normal: ({children, value}) =>
        paragraphResolvesEmpty(value, napTokens) ? null : <p className="mb-4 last:mb-0">{children}</p>,
      h2: ({children}) => (
        <h2 className="mb-4 mt-8 font-heading text-3xl font-bold text-foreground first:mt-0">{children}</h2>
      ),
      h3: ({children}) => (
        <h3 className="mb-3 mt-6 font-heading text-2xl font-bold text-foreground first:mt-0">{children}</h3>
      ),
      h4: ({children}) => (
        <h4 className="mb-3 mt-4 font-heading text-xl font-bold text-foreground first:mt-0">{children}</h4>
      ),
      h5: ({children}) => (
        <h5 className="mb-2 mt-4 font-heading text-lg font-bold text-foreground first:mt-0">{children}</h5>
      ),
      h6: ({children}) => (
        <h6 className="mb-2 mt-4 font-heading text-base font-bold text-foreground first:mt-0">{children}</h6>
      ),
      blockquote: ({children}) => (
        <blockquote className="my-6 border-l-4 border-border pl-4 italic text-foreground-muted">
          {children}
        </blockquote>
      ),
    },

    list: {
      bullet: ({children}) => (
        <ul className="mb-4 list-disc pl-6 [&>li]:mb-1">{children}</ul>
      ),
      number: ({children}) => (
        <ol className="mb-4 list-decimal pl-6 [&>li]:mb-1">{children}</ol>
      ),
    },
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PortableTextRenderer({value, napTokens}: Props) {
  if (!value || value.length === 0) return null
  // Cast at the next-sanity boundary. The `value` prop arrives as `unknown[]`
  // (consumers don't commit to a typed Portable Text shape — see WS8 Commit 0a
  // Decision 1); next-sanity's <PortableText> expects TypedObject[] internally,
  // and validates element shapes at render time.
  return (
    <div className="text-base leading-relaxed text-foreground">
      <PortableText
        value={value as Parameters<typeof PortableText>[0]['value']}
        components={makeComponents(napTokens)}
      />
    </div>
  )
}
