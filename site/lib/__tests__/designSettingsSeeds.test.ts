import {describe, expect, it} from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {DETAILS} from '../details'

// NO NEW DESIGN SETTINGS FIELD SEEDS A VALUE (monorepo WS-PREMIUM-PACKAGE-DESIGN §7.2 amendment 6, ADV-PP-B). A seeded
// value is written into every document the build creates (item 308) and is indistinguishable from an operator's choice,
// and the premium details render today's look only while they are absent. `styleSets.test.ts` holds the seeds of the
// style-set fields alone; this holds the whole document to the seventeen it seeded when the details arrived, so a field
// that copies a neighbour's `initialValue` (a detail copying `uiRadius`'s `rounded`) fails here, in the template, before
// the monorepo's partition test could see it.

const FIELD_MAP = path.resolve(__dirname, '../../../studio/field-map.json')
const SEEDED = [
  'marketingScale', 'taglineStyle', 'uiRadius', 'buttonShape', 'buttonAnimation', 'showBackToTop', 'internalHeroBackground',
  'heroScrimOpacity', 'tertiaryStyle', 'elevationStyle', 'sidebarNavIconStyle', 'sidebarWidgetHeaderLine',
  'sidebarItemSeparators', 'motionTempo', 'profileLayout', 'profileCtaLabel', 'profileCtaUrl',
]

describe.skipIf(!fs.existsSync(FIELD_MAP))('Design Settings seeds no value outside the seventeen it seeded', () => {
  const rows: Array<{path: string; initialValue?: unknown}> = JSON.parse(fs.readFileSync(FIELD_MAP, 'utf8')).types.designSettings.fields
  const seeded = rows.filter((r) => !r.path.includes('.') && r.initialValue !== undefined && r.initialValue !== null).map((r) => r.path)

  it('the seeded fields are exactly the seventeen', () => {
    expect(seeded.sort()).toEqual([...SEEDED].sort())
  })

  it('no detail seeds a value', () => {
    for (const d of DETAILS) expect(seeded, d.field).not.toContain(d.field)
  })
})
