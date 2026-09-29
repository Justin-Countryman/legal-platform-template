import {describe, expect, it} from 'vitest'
import {render} from '@testing-library/react'
import {AttorneyMonogram} from '../AttorneyCardParts'

// The initials tile is light wherever it sits (Phase 17E, found by ADV-17E-C; `[R-541]`): inside a dark band the cascade
// gave its initials the on-dark subtle tone on the light tile, 1.55 to 1.92:1 on every palette. The tile carries the
// light context, so its text reads the light tokens.
describe('the attorney monogram', () => {
  it('carries the light context, whatever band it sits in', () => {
    const {container} = render(<AttorneyMonogram name="Alex Rivera" />)
    const tile = container.firstElementChild!
    expect(tile.getAttribute('data-ring-context')).toBe('light')
    expect(tile.className.split(' ')).toContain('bg-hero-tint')
    expect(tile.getAttribute('aria-hidden')).toBe('true')
  })
})
