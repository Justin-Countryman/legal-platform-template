import fs from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'

// ─── The boundary registry (item 323) ─────────────────────────────────────────
//
// Phase 15, WS-V1-PHASE15-DESIGN §7 amendment 21.
//
// WHAT A BOUNDARY IS. Where a component draws something a visitor must SEE
// without reading it — the edge of a form control, the fill or ring that marks a
// selected tab, the mark on the page they are on — WCAG 1.4.11 asks 3:1 against
// what is beside it, and 1.4.1 asks that it not be color alone. Those marks are
// spread across nine files and are drawn with utilities, so no ratio test can
// find them by reading the palette: `validateWcag` measures token PAIRS, and it
// cannot know which pair a component actually puts side by side.
//
// WHAT THIS FILE DOES. It is the list, and it is asserted rather than described:
// each row names the file, what it draws, the utility or attribute that draws it,
// the contract, and the grounds it may sit on. The meta-test then reads every
// component file and fails when one draws a control, a tab or an `aria-current`
// state without a row here. That is the half that catches the NEXT component:
// PR #28 shipped a kicker that resolved the light accent inside a dark band, and
// a list like this one, asserted, is what would have held it.
//
// WHAT IT CANNOT DO. It does not measure ratios (that is `colorGuarantee`) and
// it does not see a boundary drawn in a file that renders no control and no
// `aria-current` — a decorative divider, say. It holds the classes of record for
// the components that have one.

const COMPONENTS = path.resolve(__dirname, '..')
const APP = path.resolve(__dirname, '../../app')
/** Dev-only surfaces: `[R-214]` keeps them out of a built client. */
const NOT_SHIPPED = new Set(['design-studio', 'design-preview'])

type Row = {
  /** Path under `components/`. */
  file: string
  /** What a visitor has to see. */
  draws: string
  /** The class or attribute of record; each must be present in the file. */
  marks: readonly string[]
  /** The WCAG contract the mark carries. */
  contract: string
  /** The grounds the component may sit on. */
  grounds: readonly ('light' | 'dark' | 'saturated' | 'island')[]
}

const REGISTRY: readonly Row[] = [
  {
    // Phase 17A: the operator's switcher on the preview address, never a visitor's page.
    file: 'preview/Switcher.tsx',
    draws: 'the current choice in each row, and the edge of the share-link field',
    marks: ['sw-active', 'aria-current', 'sw-input', '#8a8a8a'],
    contract: '1.4.1 the current choice is a filled chip with inverted text and aria-current, not color alone; 1.4.11 3:1 for chip and field edges (#8a8a8a on #111 is 5.5:1); the bar is its own fixed ground outside the palette',
    grounds: ['island'],
  },
  {
    file: 'ui/Input.tsx',
    draws: 'the edge of a text field, and its placeholder',
    marks: ['border-border-control', 'placeholder:text-foreground-subtle', 'data-ring-context="light"'],
    contract: '1.4.11 non-text 3:1 for the edge; the control is a light island wherever it sits',
    grounds: ['island'],
  },
  {
    file: 'ui/Select.tsx',
    draws: 'the edge of a select and its chevron',
    marks: ['border-border-control', 'data-ring-context="light"'],
    contract: '1.4.11 non-text 3:1 for the edge; the control is a light island wherever it sits',
    grounds: ['island'],
  },
  {
    file: 'sections/AttorneySlider.tsx',
    draws: 'which slide of the attorney carousel is showing',
    marks: ['bg-cue ring-1 ring-action-state-cue', 'aria-current', 'bg-border-control'],
    contract: '1.4.11 3:1 for the active dot, with the cue ring where the action alone does not reach it; 1.4.1 not color alone (the active dot is wider)',
    grounds: ['light'],
  },
  {
    file: 'sections/silo/SiloCarousel.tsx',
    draws: 'which practice area of the carousel is showing',
    marks: ['bg-cue ring-1 ring-action-state-cue', 'aria-current', 'bg-border-control'],
    contract: 'as AttorneySlider',
    grounds: ['light', 'dark'],
  },
  {
    file: 'sections/ServiceAreaIndexClient.tsx',
    draws: 'the selected letter and the selected city filter',
    marks: ['bg-cue text-action-fg ring-1 ring-action-state-cue'],
    contract: '1.4.11 3:1 for the selected pill against the band',
    grounds: ['light'],
  },
  {
    file: 'sections/VideoLibraryClient.tsx',
    draws: 'the selected video category',
    marks: ['bg-cue text-action-fg ring-1 ring-action-state-cue'],
    contract: '1.4.11 3:1 for the selected pill against the band',
    grounds: ['light'],
  },
  {
    file: 'layout/footers/SwitchboardFooter.tsx',
    draws: 'the selected tab of the switchboard',
    marks: ['role="tab"', 'bg-cue text-action-fg ring-1 ring-action-state-cue'],
    contract: '1.4.11 3:1 for the selected tab; 4.1.2 tab semantics',
    grounds: ['dark'],
  },
  {
    file: 'layout/headers/shared.tsx',
    draws: 'the navigation item for the page being viewed',
    marks: ['aria-current', "border-cue bg-cue/10 font-semibold text-foreground"],
    contract: '1.4.1 not color alone (a left rule and the weight carry it); 4.1.2 aria-current="page"',
    grounds: ['light', 'dark'],
  },
  {
    file: 'layout/Sidebar.tsx',
    draws: 'the sidebar row for the page being viewed',
    marks: ['aria-current'],
    contract: '4.1.2 aria-current="page"; weight and color carry the visual mark',
    grounds: ['light'],
  },
  {
    file: 'ui/Breadcrumbs.tsx',
    draws: 'the last crumb, which is the page being viewed',
    marks: ['aria-current="page"', 'font-medium text-foreground'],
    contract: '4.1.2 aria-current="page"; the crumb is text, so 1.4.3 covers it',
    grounds: ['light', 'dark'],
  },
  {
    file: 'ui/PracticeAreaList.tsx',
    draws: 'the practice area being viewed, inside a list of links',
    marks: ['aria-current', '!font-semibold'],
    contract: '1.4.1 not color alone (the weight carries it); 4.1.2 aria-current="page"',
    grounds: ['light', 'dark'],
  },
]

const source = (file: string) => fs.readFileSync(path.join(COMPONENTS, file), 'utf8')

describe('the boundary registry', () => {
  it.each(REGISTRY.map((row) => [row.file, row] as const))('%s still draws what the registry says', (_file, row) => {
    const text = source(row.file)
    for (const mark of row.marks) expect(text, `${row.file}: ${row.draws}`).toContain(mark)
  })

  it('every row names a contract and at least one ground', () => {
    for (const row of REGISTRY) {
      expect(row.contract.length, row.file).toBeGreaterThan(10)
      expect(row.grounds.length, row.file).toBeGreaterThan(0)
    }
  })

  // The half that catches the next component, not the ones already listed.
  it('every component that draws a control, a tab or a current state has a row', () => {
    const listed = new Set(REGISTRY.map((row) => row.file))
    const drawsABoundary = /<input|<select|<textarea|role="tab"|aria-current/
    const missing: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name !== '__tests__' && entry.name !== '__snapshots__' && !NOT_SHIPPED.has(entry.name)) walk(full)
          continue
        }
        if (!entry.name.endsWith('.tsx')) continue
        const rel = path.relative(dir.startsWith(APP) ? path.dirname(APP) : COMPONENTS, full)
        if (listed.has(rel)) continue
        if (drawsABoundary.test(fs.readFileSync(full, 'utf8'))) missing.push(rel)
      }
    }
    walk(COMPONENTS)
    // `app/` too: a route file can draw a control without a component, and the
    // dev-only design surfaces are excluded because no client ships them.
    walk(APP)
    expect(missing, 'add a row to REGISTRY, with the class or attribute that draws the boundary').toEqual([])
  })
})
