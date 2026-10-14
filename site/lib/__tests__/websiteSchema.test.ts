import {describe, it, expect} from 'vitest'
import {buildWebSiteSchema} from '@/lib/websiteSchema'
import {siteOrigin} from '@/lib/siteHost'

// THE HOMEPAGE NAMES THE FIRM IN CODE (monorepo [R-702] rule 3, ENTITY-7).
//
// Google takes the site name it shows above every result chiefly from the
// homepage's WebSite structured data, so a title that drops the firm's name to
// stay about one line (rule 2) still has the firm named above it. The name is the
// firm's natural name (`firmNameShort`, "Marlow & Finch"); the legal name
// ("Marlow & Finch, PLLC") is the alternate. The firm node stays the
// Organization the root layout emits; this node points at it by identifier only
// (ENTITY-6).

const origin = siteOrigin()

describe('buildWebSiteSchema', () => {
  it('names the site with the short name and gives the legal name as the alternate', () => {
    const node = buildWebSiteSchema({firmName: 'Marlow & Finch, PLLC', firmNameShort: 'Marlow & Finch'})
    expect(node).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: 'Marlow & Finch',
      alternateName: 'Marlow & Finch, PLLC',
      url: `${origin}/`,
      publisher: {'@id': `${origin}/#firm`},
    })
  })

  it('leaves the alternate out when the two names are the same', () => {
    const node = buildWebSiteSchema({firmName: 'Yanowitz Law Firm', firmNameShort: 'Yanowitz Law Firm'})
    expect(node?.name).toBe('Yanowitz Law Firm')
    expect(node).not.toHaveProperty('alternateName')
  })

  it('takes the full name when there is no short one', () => {
    const node = buildWebSiteSchema({firmName: 'Dudley & Smith, P.A.', firmNameShort: '  '})
    expect(node?.name).toBe('Dudley & Smith, P.A.')
    expect(node).not.toHaveProperty('alternateName')
  })

  it('points at the firm by identifier and declares nothing else about it (ENTITY-6)', () => {
    const node = buildWebSiteSchema({firmName: 'A', firmNameShort: 'A'})
    expect(Object.keys(node?.publisher ?? {})).toEqual(['@id'])
  })

  it('emits nothing for a dataset with no firm name yet', () => {
    expect(buildWebSiteSchema(null)).toBeNull()
    expect(buildWebSiteSchema({firmName: '', firmNameShort: null})).toBeNull()
  })
})
