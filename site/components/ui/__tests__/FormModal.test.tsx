import {describe, it, expect, vi} from 'vitest'
import {render, screen} from '@testing-library/react'

// FormModal is a thin composition over DialogPanel + Button + FormEmbed. To
// isolate FormModal's contract (which props it forwards) from DialogPanel's
// internal modal behavior (focus management, overlay click, escape key —
// tested separately when DialogPanel itself gets a test file), mock the three
// children. Same pattern as MotionRoot.test.tsx (Commit 2) which mocks
// framer-motion's MotionConfig.

vi.mock('@/components/ui/DialogPanel', () => ({
  DialogPanel: vi.fn(({title, description, closeAriaLabel, trigger, children}) => (
    <div data-testid="dialog-panel">
      <div data-testid="dialog-trigger-slot">{trigger}</div>
      <div data-testid="dialog-title">{title}</div>
      {description && <div data-testid="dialog-description">{description}</div>}
      <span data-testid="dialog-close-aria-label">{closeAriaLabel}</span>
      <div data-testid="dialog-body">{children}</div>
    </div>
  )),
}))

vi.mock('@/components/ui/Button', () => ({
  Button: vi.fn(({variant, context, className, children}) => (
    <button
      data-testid="trigger-button"
      data-variant={variant}
      data-context={context}
      data-classname={className ?? ''}
    >
      {children}
    </button>
  )),
}))

vi.mock('@/components/layout/footers/FormEmbed', () => ({
  FormEmbed: vi.fn(({html}) => <div data-testid="form-embed" data-html={html} />),
}))

import {FormModal} from '../FormModal'

// ─── Render shape ─────────────────────────────────────────────────────────────

describe('FormModal — render shape', () => {
  it('renders a DialogPanel with Button trigger and FormEmbed body', () => {
    render(
      <FormModal
        triggerLabel="Open form"
        title="Contact us"
        formEmbed="<p>form html</p>"
      />,
    )
    expect(screen.getByTestId('dialog-panel')).not.toBeNull()
    expect(screen.getByTestId('trigger-button')).not.toBeNull()
    expect(screen.getByTestId('form-embed')).not.toBeNull()
  })
})

// ─── Prop forwarding to DialogPanel ───────────────────────────────────────────

describe('FormModal — DialogPanel prop forwarding', () => {
  it('forwards title to DialogPanel', () => {
    render(
      <FormModal triggerLabel="x" title="Contact us" formEmbed="<p>x</p>" />,
    )
    expect(screen.getByTestId('dialog-title').textContent).toBe('Contact us')
  })

  it('forwards description when provided', () => {
    render(
      <FormModal
        triggerLabel="x"
        title="Contact us"
        description="We'll respond within 24 hours."
        formEmbed="<p>x</p>"
      />,
    )
    expect(screen.getByTestId('dialog-description').textContent).toBe(
      "We'll respond within 24 hours.",
    )
  })

  it('omits description when not provided', () => {
    render(
      <FormModal triggerLabel="x" title="Contact us" formEmbed="<p>x</p>" />,
    )
    expect(screen.queryByTestId('dialog-description')).toBeNull()
  })

  it('hardcodes closeAriaLabel to "Close form"', () => {
    render(
      <FormModal triggerLabel="x" title="Contact us" formEmbed="<p>x</p>" />,
    )
    expect(screen.getByTestId('dialog-close-aria-label').textContent).toBe('Close form')
  })
})

// ─── Trigger Button contract ──────────────────────────────────────────────────

describe('FormModal — trigger Button contract', () => {
  it('renders trigger as Button with variant="primary" context="light"', () => {
    render(
      <FormModal triggerLabel="Open" title="t" formEmbed="<p>x</p>" />,
    )
    const button = screen.getByTestId('trigger-button')
    expect(button.getAttribute('data-variant')).toBe('primary')
    expect(button.getAttribute('data-context')).toBe('light')
  })

  it('forwards triggerLabel as Button children', () => {
    render(
      <FormModal triggerLabel="Schedule a call" title="t" formEmbed="<p>x</p>" />,
    )
    expect(screen.getByTestId('trigger-button').textContent).toBe('Schedule a call')
  })

  it('forwards triggerClassName to the Button when provided', () => {
    render(
      <FormModal
        triggerLabel="Open"
        title="t"
        formEmbed="<p>x</p>"
        triggerClassName="my-trigger-class"
      />,
    )
    expect(screen.getByTestId('trigger-button').getAttribute('data-classname')).toBe(
      'my-trigger-class',
    )
  })
})

// ─── FormEmbed body forwarding ────────────────────────────────────────────────

describe('FormModal — FormEmbed body', () => {
  it('forwards formEmbed html to the FormEmbed inside DialogPanel children', () => {
    render(
      <FormModal
        triggerLabel="x"
        title="t"
        formEmbed="<form>fields</form>"
      />,
    )
    const embed = screen.getByTestId('form-embed')
    expect(embed.getAttribute('data-html')).toBe('<form>fields</form>')
  })

  it('renders FormEmbed inside DialogPanel body slot (children)', () => {
    render(
      <FormModal triggerLabel="x" title="t" formEmbed="<p>x</p>" />,
    )
    const body = screen.getByTestId('dialog-body')
    expect(body.querySelector('[data-testid="form-embed"]')).not.toBeNull()
  })
})
