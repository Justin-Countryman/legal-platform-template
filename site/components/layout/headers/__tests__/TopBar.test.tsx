import {describe, it, expect} from 'vitest'
import {render} from '@testing-library/react'
import {TopBar} from '../shared'

function renderBar(props: {desktop?: boolean; mobile?: boolean}) {
  return render(<TopBar left="Serving the area" visible {...props} />)
}

describe('TopBar — independent desktop/mobile visibility', () => {
  it('desktop-only applies hidden md:block (shows ≥ md, hidden on mobile)', () => {
    const {container} = renderBar({desktop: true, mobile: false})
    const bar = container.firstChild as HTMLElement
    expect(bar.className).toContain('hidden md:block')
  })

  it('mobile-only applies md:hidden (shows < md, hidden on desktop)', () => {
    const {container} = renderBar({desktop: false, mobile: true})
    const bar = container.firstChild as HTMLElement
    expect(bar.className).toContain('md:hidden')
    expect(bar.className).not.toContain('hidden md:block')
  })

  it('both → no breakpoint-hide class (visible everywhere)', () => {
    const {container} = renderBar({desktop: true, mobile: true})
    const cn = (container.firstChild as HTMLElement).className
    expect(cn).not.toContain('md:hidden')
    expect(cn).not.toContain('hidden md:block')
  })

  it('neither → renders nothing', () => {
    const {container} = renderBar({desktop: false, mobile: false})
    expect(container.firstChild).toBeNull()
  })

  it('no content → renders nothing even when enabled', () => {
    const {container} = render(<TopBar visible desktop mobile />)
    expect(container.firstChild).toBeNull()
  })
})
