/* eslint-disable jsx-a11y/control-has-associated-label --
 * The whole point of FormField is to associate a <label> with whatever child
 * control it wraps, via auto-generated id + htmlFor (see FormField.tsx).
 * That association is the contract under test in this file. The lint rule
 * analyzes JSX statically and can't see the runtime association, so every
 * bare <input /> fixture trips the rule even though the rendered DOM is
 * always properly labeled. Disable file-wide; tests assert the association
 * directly.
 */
import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'
import {FormField} from '../FormField'

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('FormField — render shape', () => {
  it('renders a vertical wrapper <div> with label, control, and (optional) help/error', () => {
    const {container} = render(
      <FormField label="Email">
        <input type="email" />
      </FormField>,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.tagName).toBe('DIV')
    expect(wrapper.className).toContain('flex')
    expect(wrapper.className).toContain('flex-col')
    expect(wrapper.querySelector('label')).not.toBeNull()
    expect(wrapper.querySelector('input')).not.toBeNull()
  })

  it('renders the visible label text', () => {
    const {container} = render(
      <FormField label="Email address">
        <input type="email" />
      </FormField>,
    )
    expect(container.querySelector('label')?.textContent).toBe('Email address')
  })
})

// ─── Label-control association (htmlFor + id plumbing) ────────────────────────

describe('FormField — label-control association', () => {
  it('label htmlFor matches the auto-generated id injected onto the child', () => {
    const {container} = render(
      <FormField label="Email">
        <input type="email" />
      </FormField>,
    )
    const label = container.querySelector('label') as HTMLLabelElement
    const input = container.querySelector('input') as HTMLInputElement
    expect(label.htmlFor).toBe(input.id)
    expect(input.id).toMatch(/^field-/)
  })

  it('honors a manual id prop and propagates it to the child', () => {
    const {container} = render(
      <FormField label="Email" id="my-email-field">
        <input type="email" />
      </FormField>,
    )
    const label = container.querySelector('label') as HTMLLabelElement
    const input = container.querySelector('input') as HTMLInputElement
    expect(label.htmlFor).toBe('my-email-field')
    expect(input.id).toBe('my-email-field')
  })

  it('preserves a child-supplied id (does not overwrite)', () => {
    const {container} = render(
      <FormField label="Email">
        <input type="email" id="child-supplied-id" />
      </FormField>,
    )
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.id).toBe('child-supplied-id')
  })
})

// ─── hideLabel ────────────────────────────────────────────────────────────────

describe('FormField — hideLabel', () => {
  it('hides label visually with sr-only when hideLabel is true', () => {
    const {container} = render(
      <FormField label="Search" hideLabel>
        <input type="search" />
      </FormField>,
    )
    const label = container.querySelector('label') as HTMLLabelElement
    expect(label.className).toContain('sr-only')
  })

  it('omits sr-only when hideLabel is false / undefined', () => {
    const {container} = render(
      <FormField label="Email">
        <input type="email" />
      </FormField>,
    )
    const label = container.querySelector('label') as HTMLLabelElement
    expect(label.className).not.toContain('sr-only')
  })
})

// ─── helpText / error precedence ──────────────────────────────────────────────

describe('FormField — helpText / error', () => {
  it('renders helpText below the control with proper id linkage', () => {
    const {container} = render(
      <FormField label="Email" helpText="Use your work email">
        <input type="email" />
      </FormField>,
    )
    const help = container.querySelector('p') as HTMLParagraphElement
    const input = container.querySelector('input') as HTMLInputElement
    expect(help.textContent).toBe('Use your work email')
    expect(help.id).toMatch(/-help$/)
    expect(input.getAttribute('aria-describedby')).toBe(help.id)
  })

  it('renders error below the control with role="alert" and aria-invalid on input', () => {
    const {container} = render(
      <FormField label="Email" error="Email is required">
        <input type="email" />
      </FormField>,
    )
    const errorEl = container.querySelector('p') as HTMLParagraphElement
    const input = container.querySelector('input') as HTMLInputElement
    expect(errorEl.textContent).toBe('Email is required')
    expect(errorEl.getAttribute('role')).toBe('alert')
    expect(errorEl.id).toMatch(/-error$/)
    expect(input.getAttribute('aria-describedby')).toBe(errorEl.id)
    expect(input.getAttribute('aria-invalid')).toBe('true')
  })

  it('error takes precedence over helpText when both are set', () => {
    const {container} = render(
      <FormField label="Email" helpText="Use your work email" error="Email is required">
        <input type="email" />
      </FormField>,
    )
    const ps = container.querySelectorAll('p')
    expect(ps.length).toBe(1)
    expect(ps[0].textContent).toBe('Email is required')
    expect(ps[0].getAttribute('role')).toBe('alert')
  })

  it('omits aria-describedby on input when neither helpText nor error is set', () => {
    const {container} = render(
      <FormField label="Email">
        <input type="email" />
      </FormField>,
    )
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.hasAttribute('aria-describedby')).toBe(false)
    expect(input.hasAttribute('aria-invalid')).toBe(false)
  })
})

// ─── className ────────────────────────────────────────────────────────────────

describe('FormField — className', () => {
  it('appends custom className to the wrapper', () => {
    const {container} = render(
      <FormField label="Email" className="my-class">
        <input />
      </FormField>,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('my-class')
    expect(wrapper.className).toContain('flex-col')  // base still present
  })
})

// ─── Cascade-aware contract (direct-token primitive) ──────────────────────────

describe('FormField — cascade-aware contract', () => {
  it('label uses cascade-aware text-foreground; help/error use text-foreground-muted', () => {
    const {container} = render(
      <FormField label="Email" helpText="hint">
        <input />
      </FormField>,
    )
    const label = container.querySelector('label') as HTMLLabelElement
    expect(label.className).toContain('text-foreground')
    const help = container.querySelector('p') as HTMLParagraphElement
    expect(help.className).toContain('text-foreground-muted')
  })

  it('does not emit anchored or hardcoded color tokens', () => {
    const {container} = render(
      <FormField label="Email" error="bad">
        <input />
      </FormField>,
    )
    const wrapper = container.firstChild as HTMLElement
    const inner = wrapper.innerHTML
    expect(inner).not.toMatch(/\btext-foreground-on-light\b/)
    expect(inner).not.toMatch(/\btext-foreground-on-dark\b/)
    expect(inner).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })
})
