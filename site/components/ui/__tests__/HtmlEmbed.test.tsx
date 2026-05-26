import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'
import {HtmlEmbed} from '../HtmlEmbed'

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('HtmlEmbed — render shape', () => {
  it('renders a <div> as the root', () => {
    const {container} = render(<HtmlEmbed html="<p>x</p>" />)
    const el = container.firstChild as HTMLElement
    expect(el.tagName).toBe('DIV')
  })

  it('mounts the provided HTML content into the div via useEffect', () => {
    const {container} = render(<HtmlEmbed html="<p>embedded paragraph</p>" />)
    expect(container.querySelector('p')?.textContent).toBe('embedded paragraph')
  })

  it('re-mounts content when html prop changes', () => {
    const {container, rerender} = render(<HtmlEmbed html="<p>first</p>" />)
    expect(container.querySelector('p')?.textContent).toBe('first')
    rerender(<HtmlEmbed html="<p>second</p>" />)
    expect(container.querySelector('p')?.textContent).toBe('second')
  })
})

// ─── Optional props ───────────────────────────────────────────────────────────

describe('HtmlEmbed — optional props', () => {
  it('applies custom className when provided', () => {
    const {container} = render(<HtmlEmbed html="<p>x</p>" className="my-form-class" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toBe('my-form-class')
  })

  it('applies aria-label when provided', () => {
    const {container} = render(<HtmlEmbed html="<p>x</p>" aria-label="Contact form" />)
    const el = container.firstChild as HTMLElement
    expect(el.getAttribute('aria-label')).toBe('Contact form')
  })

  it('does not set aria-label attribute when undefined', () => {
    const {container} = render(<HtmlEmbed html="<p>x</p>" />)
    const el = container.firstChild as HTMLElement
    expect(el.hasAttribute('aria-label')).toBe(false)
  })
})
