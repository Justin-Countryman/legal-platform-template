import {describe, it, expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {join} from 'node:path'

// THE BAND THE HOMEPAGE FALLS BACK TO TALKS TO THE READER, NOT TO WHOEVER BUILT
// THE SITE.
//
// `OUTSTANDING.md` item 239. This branch used to render "Sanity connection" over
// the firm name and, under it, "Add a Homepage Hero in Sanity to replace this
// placeholder." That page is served at `/`, and `/` is the URL the operator
// hands the client for review — so a firm reading its own new homepage was told
// to go and configure a CMS it has never heard of. The band itself is right:
// it is the hard-cut safety net the route's comment describes, and never
// crashing is correct. Its AUDIENCE was what was wrong.
//
// The assertions are made against the route source rather than a render because
// the defect is a string in the markup, not a behaviour: what has to stay true
// is that these three phrases are not in the file at all. A render test would
// pass the day someone moved the copy into a constant.
const ROUTE = readFileSync(join(__dirname, '..', '(site)', 'page.tsx'), 'utf8')

describe('the unauthored-homepage fallback band', () => {
  it('does not instruct the reader to configure a CMS', () => {
    expect(ROUTE).not.toContain('Add a Homepage Hero in Sanity')
  })

  it('does not name the vendor on a client-facing page', () => {
    expect(ROUTE).not.toContain('Sanity connection')
  })

  it('does not render developer copy where a firm name is missing', () => {
    // "Firm name not found" is a debugging string, and it rendered as the H1.
    expect(ROUTE).not.toContain('Firm name not found')
  })

  it('still renders the firm name as the H1, so the page reads unfinished rather than broken', () => {
    expect(ROUTE).toContain('siteSettings?.firmName')
    expect(ROUTE).toMatch(/<h1[^>]*>\s*\{siteSettings\?\.firmName/)
  })

  it('still has a fallback at all — the band is a safety net, not a defect', () => {
    // Removing the branch entirely would crash `/` on an unauthored dataset,
    // which is the one outcome worse than the copy this test is about.
    expect(ROUTE).toContain('{hero ? (')
  })
})
