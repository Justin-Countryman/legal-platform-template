// @vitest-environment node
//
// The stack (Phase 17C session 3, `[R-548]`, `[R-549]`; monorepo WS-V1-PHASE17C3-DESIGN §10, §11). Justin,
// 2026-09-25: on a tablet a section heading gets the whole width, as on a phone, and "the highest quality
// and best experience no matter what the screensize". So under `xl` (1280 px) every section layout that
// sets a section heading beside other content stacks, and its side-by-side classes start at `xl:`. This
// reads the seven components' source: a side-by-side class from `md:` or `lg:` puts a heading back into a
// narrow column, where at the readable floor a long one took up to six lines more than the rule
// (ADV-17C3-PRA). The metrics run measures the result at 768 and 1024.

import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

const STACKED = [
  'ContentSectionBlock.tsx', 'ReviewsSectionBlock.tsx', 'CtaSectionBlock.tsx', 'VideoSectionBlock.tsx',
  'BadgesSectionBlock.tsx', 'GlobalCta.tsx', 'PracticeAreaNavBlock.tsx',
]
// The classes that put two things side by side, or that only read beside the heading.
const SIDE_BY_SIDE = /\b(?:md|lg):(?:grid|grid-cols-(?:2|12|\[[^\]]+\])|col-span-\d+|flex-row|w-1\/3|order-(?:first|last)|photo-rise|self-start|sticky|top-\d+|mb-0|justify-end|justify-between|text-right|items-(?:center|start|end)|gap-x-\d+)(?![\w-])/g

describe('the tablet stack', () => {
  for (const file of STACKED) {
    it(`${file} arranges nothing side by side under xl`, () => {
      const source = readFileSync(resolve(__dirname, '..', file), 'utf8')
      expect(source.match(SIDE_BY_SIDE) ?? []).toEqual([])
    })
  }

  it('every stacked layout keeps its body text at a readable measure', () => {
    for (const file of STACKED) {
      const source = readFileSync(resolve(__dirname, '..', file), 'utf8')
      expect(source, file).toContain('stacked-measure')
    }
  })

  it('the stacked measure and the photo cap apply under xl only', () => {
    const css = readFileSync(resolve(__dirname, '../../../app/globals.css'), 'utf8')
    for (const rule of ['.stacked-measure :is(p, ul, ol, blockquote)', '.stacked-photo img', '.stacked-cutout img']) {
      const at = css.indexOf(rule)
      expect(at, rule).toBeGreaterThan(0)
      const media = css.lastIndexOf('@media', at)
      expect(css.slice(media, css.indexOf('{', media)), rule).toContain('(max-width: 1279.98px)')
    }
    expect(css).toMatch(/\.stacked-photo img \{[^}]*max-height: min\(36rem, 75svh\);[^}]*object-position: var\(--photo-focus/)
  })

  it('the widening starts where the layouts go side by side', () => {
    const css = readFileSync(resolve(__dirname, '../../../app/globals.css'), 'utf8')
    for (const rule of ['.heading-grid-5 {', '.heading-grid-half {', '.heading-flex-third {', '.heading-flex-banner {', '.heading-grid-aside {']) {
      const at = css.indexOf(rule)
      expect(at, rule).toBeGreaterThan(0)
      const media = css.lastIndexOf('@media', at)
      expect(css.slice(media, css.indexOf('{', media)), rule).toContain('(min-width: 1280px)')
    }
  })
})
