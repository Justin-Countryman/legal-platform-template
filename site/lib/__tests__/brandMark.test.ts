import {describe, expect, it} from 'vitest'
import {firmInitials, ghostSource, QUOTE_GLYPH} from '../brandMark'
import {proseTakesDropCap, firstProseCharacter} from '../dropCap'

// Firm names are SHAPES, never a real firm: `[R-198]` keeps a client's name out of
// the template, and the blank-slate guard only scans domains and project ids, so it
// would not have caught one here.
describe('firmInitials', () => {
  it('drops the words every firm name shares', () => {
    expect(firmInitials('Surname Law Firm')).toBe('S')
    expect(firmInitials('Surname & Othername')).toBe('SO')
    expect(firmInitials('The Law Office of Firstname Surname')).toBe('FS')
    expect(firmInitials('Surname Injury Lawyers')).toBe('S')
    expect(firmInitials('Surname Othername Thirdname PLLC')).toBe('SO')
    expect(firmInitials('Surname, Othername & Thirdname, LLP')).toBe('SO')
  })

  it('never returns more than two letters, and never punctuation', () => {
    for (const name of ['A B C D E', 'Surname-Othername Law', '  Surname   Law  ', '123 Legal', 'Élan Law']) {
      const out = firmInitials(name)
      expect(out.length).toBeLessThanOrEqual(2)
      expect(out).toMatch(/^\p{Lu}*$/u)
    }
  })

  it('is empty when there is nothing to draw, so the ghost renders nothing', () => {
    for (const name of ['', '   ', null, undefined, 'Law Firm', '123']) expect(firmInitials(name)).toBe('')
  })
})

describe('ghostSource', () => {
  it('is null when the site has not turned the ghost on', () => {
    expect(ghostSource('Surname Law Firm', false)).toBeNull()
  })
  it('is the initials when it has', () => {
    expect(ghostSource('Surname & Othername', true)).toEqual({text: 'SO'})
  })
  it('is null when the firm name yields no letters, rather than drawing an empty box', () => {
    expect(ghostSource('Law Firm', true)).toBeNull()
  })
})

describe('the quote glyph', () => {
  it('is an inline data URI, so nothing is fetched and CORS cannot refuse it', () => {
    expect(QUOTE_GLYPH.startsWith('url("data:image/svg+xml,')).toBe(true)
    expect(QUOTE_GLYPH).not.toMatch(/https?:/)
  })
  it('is one color, so a mask reads it as a silhouette', () => {
    expect(decodeURIComponent(QUOTE_GLYPH)).not.toMatch(/fill=|stroke=/)
  })
})

describe('the drop cap is skipped where ::first-letter would take two characters', () => {
  const block = (text: string) => [{_type: 'block', children: [{text}]}]

  it('takes a paragraph that opens with a letter', () => {
    expect(proseTakesDropCap(block('Most families do not lose an estate to taxes.'))).toBe(true)
    expect(proseTakesDropCap(block('Élan is the word.'))).toBe(true)
  })

  it('refuses the four openings that rendered a two-character cap', () => {
    expect(proseTakesDropCap(block('“They lose months to confusion.'))).toBe(false) // a curly quote
    expect(proseTakesDropCap(block('(Two) of three.'))).toBe(false)                      // a bracket
    expect(proseTakesDropCap(block('(555) 555-5555 is the number.'))).toBe(false)        // a resolved token
    expect(proseTakesDropCap(block('2026 was the year.'))).toBe(false)                   // a digit
  })

  it('refuses an empty or absent body rather than throwing', () => {
    for (const body of [undefined, null, [], [{_type: 'image'}], block(''), block('   ')]) {
      expect(proseTakesDropCap(body)).toBe(false)
    }
  })

  it('reads past leading whitespace and past a non-block member', () => {
    expect(firstProseCharacter([{_type: 'image'}, ...block('  Wills and trusts.')])).toBe('W')
  })
})
