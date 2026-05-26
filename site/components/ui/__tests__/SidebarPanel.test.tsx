import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'
import {SidebarPanel} from '../SidebarPanel'

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('SidebarPanel — render shape', () => {
  it('renders a <div> as the root', () => {
    const {container} = render(<SidebarPanel>x</SidebarPanel>)
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('DIV')
  })

  it('renders children verbatim', () => {
    const {container} = render(<SidebarPanel><p>body content</p></SidebarPanel>)
    expect(container.querySelector('p')?.textContent).toBe('body content')
  })

  it('renders title as a <p> element when provided', () => {
    const {container} = render(<SidebarPanel title="Quick Links">x</SidebarPanel>)
    const titleEl = container.querySelector('p')
    expect(titleEl?.tagName).toBe('P')
    expect(titleEl?.textContent).toBe('Quick Links')
  })

  it('renders title BEFORE children in DOM order', () => {
    const {container} = render(
      <SidebarPanel title="Title">
        <span>body</span>
      </SidebarPanel>,
    )
    const root = container.firstChild as HTMLElement
    expect(root.firstElementChild?.tagName).toBe('P')
    expect(root.firstElementChild?.textContent).toBe('Title')
  })
})

// ─── title prop ──────────────────────────────────────────────────────────────

describe('SidebarPanel — title prop', () => {
  it('omits the title <p> when title is undefined', () => {
    const {container} = render(<SidebarPanel>x</SidebarPanel>)
    expect(container.querySelector('p')).toBeNull()
  })

  it('omits the title <p> when title is empty string', () => {
    const {container} = render(<SidebarPanel title="">x</SidebarPanel>)
    expect(container.querySelector('p')).toBeNull()
  })

  it('applies eyebrow styling to the title (uppercase, tracked, bold)', () => {
    const {container} = render(<SidebarPanel title="x">y</SidebarPanel>)
    const titleEl = container.querySelector('p') as HTMLElement
    expect(titleEl.className).toContain('uppercase')
    expect(titleEl.className).toContain('tracking-wider')
    expect(titleEl.className).toContain('font-bold')
  })
})

// ─── className composition ────────────────────────────────────────────────────

describe('SidebarPanel — className composition', () => {
  it('emits base widget-chrome classes', () => {
    const {container} = render(<SidebarPanel>x</SidebarPanel>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('rounded-ui')
    expect(el.className).toContain('p-5')
    expect(el.className).toContain('shadow-card-rest')
  })

  it('appends custom className', () => {
    const {container} = render(<SidebarPanel className="mt-4">x</SidebarPanel>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('mt-4')
    // Base classes still present alongside the custom addition.
    expect(el.className).toContain('rounded-ui')
  })

  it('omits undefined custom className', () => {
    const {container} = render(<SidebarPanel>x</SidebarPanel>)
    const el = container.firstChild as HTMLElement
    expect(el.className).not.toContain('undefined')
    expect(el.className).not.toMatch(/\s{2,}/)
  })
})

// ─── showHeaderLine prop (WS-Sidebar Phase 2.5) ──────────────────────────────

describe('SidebarPanel — showHeaderLine prop', () => {
  it('default (showHeaderLine omitted) → no border-b under the title', () => {
    const {container} = render(<SidebarPanel title="Practice Areas">x</SidebarPanel>)
    const titleEl = container.querySelector('p') as HTMLElement
    expect(titleEl.className).not.toMatch(/\bborder-b\b/)
    expect(titleEl.getAttribute('data-sidebar-header-line')).toBe('false')
  })

  it('showHeaderLine=false → no border-b (explicit off)', () => {
    const {container} = render(
      <SidebarPanel title="Practice Areas" showHeaderLine={false}>x</SidebarPanel>,
    )
    const titleEl = container.querySelector('p') as HTMLElement
    expect(titleEl.className).not.toMatch(/\bborder-b\b/)
  })

  it('showHeaderLine=true → border-b under the title, cascade-aware color', () => {
    const {container} = render(
      <SidebarPanel title="Practice Areas" showHeaderLine>x</SidebarPanel>,
    )
    const titleEl = container.querySelector('p') as HTMLElement
    expect(titleEl.className).toContain('border-b')
    expect(titleEl.className).toContain('border-foreground/10')
    expect(titleEl.getAttribute('data-sidebar-header-line')).toBe('true')
  })

  it('showHeaderLine=true with no title is a no-op (the line is anchored to the title)', () => {
    const {container} = render(<SidebarPanel showHeaderLine>x</SidebarPanel>)
    // No title → no <p>, so no rule. Sidebar renders only its body.
    expect(container.querySelector('p')).toBeNull()
  })

  it('uses only cascade-aware tokens for the rule (no on-light/on-dark anchors, no hex)', () => {
    const {container} = render(
      <SidebarPanel title="x" showHeaderLine>y</SidebarPanel>,
    )
    const titleEl = container.querySelector('p') as HTMLElement
    expect(titleEl.className).not.toMatch(/\bborder-on-dark\b/)
    expect(titleEl.className).not.toMatch(/\bborder-on-light\b/)
    expect(titleEl.className).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})

// ─── Cascade-aware contract (direct-token primitive) ──────────────────────────

describe('SidebarPanel — cascade-aware contract', () => {
  it('uses cascade-aware border, background, and text tokens', () => {
    const {container} = render(<SidebarPanel title="x">y</SidebarPanel>)
    const root = container.firstChild as HTMLElement
    expect(root.className).toContain('border-border')
    expect(root.className).toContain('bg-muted')
    const titleEl = container.querySelector('p') as HTMLElement
    expect(titleEl.className).toContain('text-foreground')
  })

  it('does not emit anchored or hardcoded color tokens', () => {
    const {container} = render(<SidebarPanel title="x">y</SidebarPanel>)
    const root = container.firstChild as HTMLElement
    expect(root.className).not.toMatch(/\btext-foreground-on-light\b/)
    expect(root.className).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(root.className).not.toMatch(/\bborder-border-light\b/)
    expect(root.className).not.toMatch(/\bborder-on-dark\b/)
    expect(root.className).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
