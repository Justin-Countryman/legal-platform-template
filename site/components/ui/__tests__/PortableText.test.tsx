import {describe, it, expect, vi} from 'vitest'
import {render} from '@testing-library/react'

// Trust-upstream strategy (same posture as DialogPanel for Radix):
// - next-sanity's <PortableText> handles block-to-serializer dispatch and
//   inline-mark composition. We don't re-test that — we render against the
//   real serializer with representative inputs that exercise each of OUR
//   custom serializers.
// - lib/tokens is OUR code, not a dependency boundary. Mocking it would just
//   re-test prop forwarding instead of NAP-token resolution itself, so we
//   integration-test through the real resolveToken with controlled napTokens.
//
// Mocks below are only for the Next.js integrations (image/link), to keep
// jsdom clean and to capture forwarded props as data-* attributes.

vi.mock('next/image', () => ({
  default: vi.fn(({src, alt, width, height, className}) => (
    // The mock returns a plain <img>; we're isolating away next/image's
    // optimization layer which isn't this file's contract.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="pt-image"
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  )),
}))

vi.mock('next/link', () => ({
  default: ({href, children, className}: {href: string; children: React.ReactNode; className?: string}) => (
    <a data-testid="pt-internal-link" href={href} className={className}>
      {children}
    </a>
  ),
}))

import {PortableTextRenderer} from '../PortableText'
import type {NapTokens} from '@/lib/tokens'

// ─── Portable-text input helpers ──────────────────────────────────────────────

const makeBlock = (style: string, text: string, marks: string[] = [], markDefs: unknown[] = []) => ({
  _key: `b-${style}`,
  _type: 'block',
  style,
  markDefs,
  children: [{_key: 's1', _type: 'span', text, marks}],
})

const makeListItem = (listItem: 'bullet' | 'number', text: string) => ({
  _key: `li-${listItem}`,
  _type: 'block',
  style: 'normal',
  listItem,
  level: 1,
  markDefs: [],
  children: [{_key: 's1', _type: 'span', text, marks: []}],
})

const NAP_TOKENS: NapTokens = {
  firmName: 'Sample Firm',
  primaryPhone: '0800 555 0123',
}

// ─── Render shape (null guard + wrapper) ──────────────────────────────────────

describe('PortableTextRenderer — render shape', () => {
  it('renders nothing when value is an empty array', () => {
    const {container} = render(<PortableTextRenderer value={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when value is null/undefined (defensive)', () => {
    const {container} = render(<PortableTextRenderer value={null as unknown as unknown[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('wraps rendered output in a div with cascade-aware text-foreground', () => {
    const {container} = render(
      <PortableTextRenderer value={[makeBlock('normal', 'hello')]} />,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper.className).toContain('text-foreground')
    expect(wrapper.className).toContain('leading-relaxed')
  })
})

// ─── Block serializers (our custom block.* components) ────────────────────────

describe('PortableTextRenderer — block serializers', () => {
  it('normal style renders <p> with mb-4 last:mb-0', () => {
    const {container} = render(
      <PortableTextRenderer value={[makeBlock('normal', 'hello')]} />,
    )
    const p = container.querySelector('p') as HTMLElement
    expect(p.textContent).toBe('hello')
    expect(p.className).toContain('mb-4')
    expect(p.className).toContain('last:mb-0')
  })

  it('h2 renders an <h2> with font-heading + text-3xl + text-foreground', () => {
    const {container} = render(
      <PortableTextRenderer value={[makeBlock('h2', 'Heading 2')]} />,
    )
    const h = container.querySelector('h2') as HTMLElement
    expect(h.textContent).toBe('Heading 2')
    expect(h.className).toContain('font-heading')
    expect(h.className).toContain('text-3xl')
    expect(h.className).toContain('text-foreground')
  })

  it('h3 renders an <h3> with text-2xl', () => {
    const {container} = render(
      <PortableTextRenderer value={[makeBlock('h3', 'Heading 3')]} />,
    )
    const h = container.querySelector('h3') as HTMLElement
    expect(h.textContent).toBe('Heading 3')
    expect(h.className).toContain('text-2xl')
  })

  it('h4 renders an <h4> with text-xl', () => {
    const {container} = render(
      <PortableTextRenderer value={[makeBlock('h4', 'Heading 4')]} />,
    )
    const h = container.querySelector('h4') as HTMLElement
    expect(h.className).toContain('text-xl')
  })

  it('h5 renders an <h5> with text-lg', () => {
    const {container} = render(
      <PortableTextRenderer value={[makeBlock('h5', 'Heading 5')]} />,
    )
    const h = container.querySelector('h5') as HTMLElement
    expect(h.className).toContain('text-lg')
  })

  it('h6 renders an <h6> with text-base', () => {
    const {container} = render(
      <PortableTextRenderer value={[makeBlock('h6', 'Heading 6')]} />,
    )
    const h = container.querySelector('h6') as HTMLElement
    expect(h.className).toContain('text-base')
  })

  it('blockquote renders <blockquote> with border-l-4, border-border, italic, text-foreground-muted', () => {
    const {container} = render(
      <PortableTextRenderer value={[makeBlock('blockquote', 'Quoted')]} />,
    )
    const bq = container.querySelector('blockquote') as HTMLElement
    expect(bq.textContent).toBe('Quoted')
    expect(bq.className).toContain('border-l-4')
    expect(bq.className).toContain('border-border')
    expect(bq.className).toContain('italic')
    expect(bq.className).toContain('text-foreground-muted')
  })
})

// ─── List serializers ─────────────────────────────────────────────────────────

describe('PortableTextRenderer — list serializers', () => {
  it('bullet items render inside a <ul> with list-disc', () => {
    const {container} = render(
      <PortableTextRenderer
        value={[makeListItem('bullet', 'one'), makeListItem('bullet', 'two')]}
      />,
    )
    const ul = container.querySelector('ul') as HTMLElement
    expect(ul).not.toBeNull()
    expect(ul.className).toContain('list-disc')
    expect(ul.querySelectorAll('li').length).toBe(2)
  })

  it('number items render inside an <ol> with list-decimal', () => {
    const {container} = render(
      <PortableTextRenderer
        value={[makeListItem('number', 'first'), makeListItem('number', 'second')]}
      />,
    )
    const ol = container.querySelector('ol') as HTMLElement
    expect(ol).not.toBeNull()
    expect(ol.className).toContain('list-decimal')
    expect(ol.querySelectorAll('li').length).toBe(2)
  })
})

// ─── Inline mark serializers (formatting) ─────────────────────────────────────

describe('PortableTextRenderer — formatting marks', () => {
  it('strong renders <strong class="font-bold">', () => {
    const {container} = render(
      <PortableTextRenderer value={[makeBlock('normal', 'bold', ['strong'])]} />,
    )
    const strong = container.querySelector('strong') as HTMLElement
    expect(strong.textContent).toBe('bold')
    expect(strong.className).toContain('font-bold')
  })

  it('em renders <em class="italic">', () => {
    const {container} = render(
      <PortableTextRenderer value={[makeBlock('normal', 'emph', ['em'])]} />,
    )
    const em = container.querySelector('em') as HTMLElement
    expect(em.textContent).toBe('emph')
    expect(em.className).toContain('italic')
  })

  it('underline renders <span class="underline">', () => {
    const {container} = render(
      <PortableTextRenderer value={[makeBlock('normal', 'under', ['underline'])]} />,
    )
    const span = container.querySelector('span.underline') as HTMLElement
    expect(span.textContent).toBe('under')
  })

  it('strike-through renders <span class="line-through">', () => {
    const {container} = render(
      <PortableTextRenderer value={[makeBlock('normal', 'strike', ['strike-through'])]} />,
    )
    const span = container.querySelector('span.line-through') as HTMLElement
    expect(span.textContent).toBe('strike')
  })

  it('code renders <code> with bg-muted + font-mono', () => {
    const {container} = render(
      <PortableTextRenderer value={[makeBlock('normal', 'inline', ['code'])]} />,
    )
    const code = container.querySelector('code') as HTMLElement
    expect(code.textContent).toBe('inline')
    expect(code.className).toContain('bg-muted')
    expect(code.className).toContain('font-mono')
  })
})

// ─── Link mark serializer ─────────────────────────────────────────────────────

describe('PortableTextRenderer — link mark', () => {
  const linkBlock = (href: string | null) => ({
    _key: 'b1',
    _type: 'block',
    style: 'normal',
    markDefs: [{_key: 'l1', _type: 'link', href}],
    children: [{_key: 's1', _type: 'span', text: 'click', marks: ['l1']}],
  })

  it('http href renders external <a> with target="_blank" + rel="noopener noreferrer"', () => {
    const {container} = render(
      <PortableTextRenderer value={[linkBlock('https://example.com')]} />,
    )
    // Internal-link mock has data-testid="pt-internal-link"; external <a> won't.
    const a = container.querySelector('a:not([data-testid="pt-internal-link"])') as HTMLAnchorElement
    expect(a.getAttribute('href')).toBe('https://example.com')
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('tel: href renders an external <a> WITHOUT target/rel (treated as external but not auto-tabbed)', () => {
    const {container} = render(
      <PortableTextRenderer value={[linkBlock('tel:5551234')]} />,
    )
    const a = container.querySelector('a:not([data-testid="pt-internal-link"])') as HTMLAnchorElement
    expect(a.getAttribute('href')).toBe('tel:5551234')
    expect(a.hasAttribute('target')).toBe(false)
    expect(a.hasAttribute('rel')).toBe(false)
  })

  it('mailto: href renders an external <a> WITHOUT target/rel', () => {
    const {container} = render(
      <PortableTextRenderer value={[linkBlock('mailto:hi@example.com')]} />,
    )
    const a = container.querySelector('a:not([data-testid="pt-internal-link"])') as HTMLAnchorElement
    expect(a.getAttribute('href')).toBe('mailto:hi@example.com')
    expect(a.hasAttribute('target')).toBe(false)
  })

  it('internal href routes through next/link (mocked) with the underline className', () => {
    const {container} = render(
      <PortableTextRenderer value={[linkBlock('/about')]} />,
    )
    const internal = container.querySelector('[data-testid="pt-internal-link"]') as HTMLAnchorElement
    expect(internal.getAttribute('href')).toBe('/about')
    expect(internal.className).toContain('underline')
    expect(internal.className).toContain('text-action-text')
  })

  it('missing href renders the link children as a fragment (no <a>, no <Link>)', () => {
    const {container} = render(
      <PortableTextRenderer value={[linkBlock(null)]} />,
    )
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('[data-testid="pt-internal-link"]')).toBeNull()
    // The "click" text still renders.
    expect(container.textContent).toContain('click')
  })
})

// ─── Image type serializer ────────────────────────────────────────────────────

describe('PortableTextRenderer — image type', () => {
  it('renders <figure> + next/image when value.src is provided', () => {
    const {container} = render(
      <PortableTextRenderer
        value={[
          {
            _key: 'i1',
            _type: 'image',
            src: '/photo.jpg',
            alt: 'Office photo',
            width: 1200,
            height: 800,
          } as unknown,
        ] as unknown[]}
      />,
    )
    const figure = container.querySelector('figure')
    expect(figure).not.toBeNull()
    const img = container.querySelector('[data-testid="pt-image"]') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/photo.jpg')
    expect(img.getAttribute('alt')).toBe('Office photo')
    expect(img.getAttribute('width')).toBe('1200')
    expect(img.getAttribute('height')).toBe('800')
  })

  it('falls back to value.asset.url + asset.metadata.dimensions when src/width/height absent', () => {
    const {container} = render(
      <PortableTextRenderer
        value={[
          {
            _key: 'i1',
            _type: 'image',
            asset: {
              url: '/asset-fallback.jpg',
              metadata: {dimensions: {width: 640, height: 480}},
            },
          } as unknown,
        ] as unknown[]}
      />,
    )
    const img = container.querySelector('[data-testid="pt-image"]') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/asset-fallback.jpg')
    expect(img.getAttribute('width')).toBe('640')
    expect(img.getAttribute('height')).toBe('480')
  })

  it('renders <figcaption> with cascade-aware text-foreground-muted when caption is provided', () => {
    const {container} = render(
      <PortableTextRenderer
        value={[
          {
            _key: 'i1',
            _type: 'image',
            src: '/p.jpg',
            caption: 'Our office front',
          } as unknown,
        ] as unknown[]}
      />,
    )
    const fig = container.querySelector('figcaption') as HTMLElement
    expect(fig.textContent).toBe('Our office front')
    expect(fig.className).toContain('text-foreground-muted')
  })

  it('omits <figure> entirely when neither src nor asset.url is present', () => {
    const {container} = render(
      <PortableTextRenderer
        value={[{_key: 'i1', _type: 'image'} as unknown] as unknown[]}
      />,
    )
    expect(container.querySelector('figure')).toBeNull()
    expect(container.querySelector('[data-testid="pt-image"]')).toBeNull()
  })
})

// ─── NAP-token resolution dimension (THE NEW ANCHOR) ──────────────────────────
//
// Locked pattern for token-resolution primitives:
// - Pass the napTokens prop into the component (no mocking of lib/tokens).
// - Assert that contentToken type/mark blocks render the resolved string when
//   the key is present in napTokens.
// - Assert empty output for missing keys / null napTokens (empty-token guard:
//   unresolved tokens render nothing rather than leaking {{key}} to visitors).
// - Assert empty string for null/empty tokenKey.
//
// The integration test exercises both makeComponents.types.contentToken and
// makeComponents.marks.contentToken, plus the resolveToken helper itself,
// without coupling the test to internal lib/tokens implementation.

describe('PortableTextRenderer — NAP-token resolution', () => {
  it('contentToken type with a known key renders the resolved value', () => {
    const {container} = render(
      <PortableTextRenderer
        napTokens={NAP_TOKENS}
        value={[{_key: 't1', _type: 'contentToken', tokenKey: 'firmName'} as unknown] as unknown[]}
      />,
    )
    expect(container.textContent).toContain('Sample Firm')
  })

  it('contentToken type with an unknown key renders nothing (no {{key}} leak)', () => {
    const {container} = render(
      <PortableTextRenderer
        napTokens={NAP_TOKENS}
        value={[{_key: 't1', _type: 'contentToken', tokenKey: 'missingKey'} as unknown] as unknown[]}
      />,
    )
    expect(container.textContent).not.toContain('{{')
    expect(container.textContent).not.toContain('missingKey')
  })

  it('contentToken type with null napTokens prop renders nothing (no {{key}} leak)', () => {
    const {container} = render(
      <PortableTextRenderer
        napTokens={null}
        value={[{_key: 't1', _type: 'contentToken', tokenKey: 'firmName'} as unknown] as unknown[]}
      />,
    )
    expect(container.textContent).not.toContain('{{')
  })

  it('contentToken type with an empty/null tokenKey renders an empty string', () => {
    const {container} = render(
      <PortableTextRenderer
        napTokens={NAP_TOKENS}
        value={[{_key: 't1', _type: 'contentToken', tokenKey: null} as unknown] as unknown[]}
      />,
    )
    // Wrapper still renders; no token text emitted.
    expect(container.textContent).toBe('')
  })

  it('contentToken inline mark resolves within a paragraph', () => {
    const block = {
      _key: 'b1',
      _type: 'block',
      style: 'normal',
      markDefs: [{_key: 'm1', _type: 'contentToken', tokenKey: 'primaryPhone'}],
      children: [
        {_key: 's1', _type: 'span', text: 'Call us at ', marks: []},
        {_key: 's2', _type: 'span', text: '', marks: ['m1']},
        {_key: 's3', _type: 'span', text: ' today.', marks: []},
      ],
    }
    const {container} = render(
      <PortableTextRenderer napTokens={NAP_TOKENS} value={[block] as unknown[]} />,
    )
    const p = container.querySelector('p') as HTMLElement
    expect(p.textContent).toContain('0800 555 0123')
    expect(p.textContent).toContain('Call us at')
    expect(p.textContent).toContain('today.')
  })

  it('contentToken inline mark with missing key renders nothing (no {{key}} leak)', () => {
    const block = {
      _key: 'b1',
      _type: 'block',
      style: 'normal',
      markDefs: [{_key: 'm1', _type: 'contentToken', tokenKey: 'unknown'}],
      children: [
        {_key: 's1', _type: 'span', text: '', marks: ['m1']},
      ],
    }
    const {container} = render(
      <PortableTextRenderer napTokens={NAP_TOKENS} value={[block] as unknown[]} />,
    )
    expect(container.textContent).not.toContain('{{')
  })
})

// ─── Cascade-aware contract sweep ─────────────────────────────────────────────

describe('PortableTextRenderer — cascade-aware contract', () => {
  it('does not emit anchored aliases or hex literals across a representative tree', () => {
    const {container} = render(
      <PortableTextRenderer
        napTokens={NAP_TOKENS}
        value={[
          makeBlock('h2', 'Title'),
          makeBlock('normal', 'Body with ', ['strong']),
          makeBlock('blockquote', 'A quote'),
          makeListItem('bullet', 'one'),
          {_key: 't1', _type: 'contentToken', tokenKey: 'firmName'} as unknown,
        ] as unknown[]}
      />,
    )
    const html = (container.firstChild as HTMLElement).innerHTML
    expect(html).not.toMatch(/\btext-foreground-on-light\b/)
    expect(html).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
