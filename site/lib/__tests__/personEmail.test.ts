import {describe, it, expect} from 'vitest'

import {HIDDEN_EMAIL_WARNING, hiddenEmailWarning} from '../personEmail'

// A HIDDEN EMAIL IS STILL IN THE PUBLIC DATA (monorepo backlog 463).
//
// The production dataset answers an anonymous query for any published field, so an attorney's address saved with
// Display Email Publicly off is one query away while the page shows nothing. The build no longer writes one; the
// Studio warns an editor who types one.

describe('hiddenEmailWarning', () => {
  it('warns on an address saved with the switch off or unset', () => {
    for (const show of [false, undefined, null, 'true']) {
      expect(hiddenEmailWarning('jane@example.com', show)).toBe(HIDDEN_EMAIL_WARNING)
    }
  })

  it('passes an address the firm made public, and no address at all', () => {
    expect(hiddenEmailWarning('jane@example.com', true)).toBe(true)
    for (const email of [undefined, null, '', '   ']) {
      expect(hiddenEmailWarning(email, false)).toBe(true)
    }
  })
})
