import {describe, it, expect} from 'vitest'
import {createRef} from 'react'
import {render} from '@testing-library/react'
import {MobileHeaderRow, type HeaderData} from '../shared'

const DATA = (mobileLayout: string): HeaderData => ({
  mobileLayout,
  firmName: 'Test Firm',
  headerCtaUrl: '/contact/',
  headerCtaLabel: 'Email',
  headerPhone: '763-555-0100',
  logoOnLight: {src: '/logo.png', alt: 'Test Firm', width: 120, height: 40},
})

function renderRow(mobileLayout: string, compact: boolean) {
  return render(
    <MobileHeaderRow
      data={DATA(mobileLayout)}
      isOpen={false}
      onToggle={() => {}}
      scheme="light"
      hoverTextClass=""
      triggerRef={createRef<HTMLButtonElement>()}
      compact={compact}
    />,
  )
}

describe('Action-bar layouts — logo collapses on scroll, action bar stays', () => {
  for (const layout of ['bar-top', 'bar-bottom']) {
    it(`${layout}: logo row is expanded (max-h-20) when not compact`, () => {
      const {container} = renderRow(layout, false)
      expect(container.innerHTML).toContain('max-h-20')
      expect(container.innerHTML).not.toContain('max-h-0')
      // Action bar (Menu) is always present.
      expect(container.textContent).toContain('Menu')
    })

    it(`${layout}: logo row collapses (max-h-0, aria-hidden) when compact, action bar persists`, () => {
      const {container} = renderRow(layout, true)
      expect(container.innerHTML).toContain('max-h-0')
      expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
      // Menu/Call/Email strip is NOT collapsed.
      expect(container.textContent).toContain('Menu')
      expect(container.textContent).toContain('Call')
    })
  }

  it('standard layout has no collapsible logo row (no action bar to leave behind)', () => {
    const {container} = renderRow('standard', true)
    expect(container.innerHTML).not.toContain('max-h-0')
  })
})
