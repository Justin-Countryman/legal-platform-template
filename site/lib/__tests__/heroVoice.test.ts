import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {STYLE_SETS} from '../styleSets'

// The hero-voice pair test (Phase 17C session 2b, `[R-534]`; monorepo WS-V1-PHASE17C2B-DESIGN
// §2.8). The field floor (`styleSets.test.ts`) passed Flint and Quartz, whose heroes were 0.5%
// apart in width and 0.02 in ink: one voice by any eye. So the metrics run
// (`scripts/ci/flow-metrics.mjs`) records each offered style set's hero as it renders (the face
// and weight the h1 computes, its size, and "Counsel you can call" drawn at 100 px: width per
// em and mean darkness) into `scripts/ci/__snapshots__/hero-voice.json`, and this test refuses
// any pair within 5% of width and 0.03 of ink with the same section case and hero size.
//
// Read only where the CI scripts are present: a client tree prunes `scripts/ci/`
// (`traps.md`), so this skips by name there.

const FILE = resolve(__dirname, '../../scripts/ci/__snapshots__/hero-voice.json')
const present = existsSync(FILE)

type Voice = {face: string; weight: number; heroPx: number; widthPerEm: number; ink: number; sectionCase: string}

describe('the hero voices', () => {
  it.skipIf(!present)('are recorded for every offered style set (skipped on a client tree: scripts/ci is pruned by the press)', () => {
    const voices = JSON.parse(readFileSync(FILE, 'utf8')).styleSets as Record<string, Voice>
    expect(Object.keys(voices).sort()).toEqual(STYLE_SETS.map((s) => s.id).sort())
    for (const [id, v] of Object.entries(voices)) {
      expect(v.widthPerEm, id).toBeGreaterThan(4)
      expect(v.ink, id).toBeGreaterThan(0.05)
    }
  })

  it.skipIf(!present)('no two offered style sets share one hero voice: within 5% of width and 0.03 of ink, the same case and size', () => {
    const voices = JSON.parse(readFileSync(FILE, 'utf8')).styleSets as Record<string, Voice>
    const ids = Object.keys(voices)
    const close: string[] = []
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = voices[ids[i]]
        const b = voices[ids[j]]
        const width = Math.abs(a.widthPerEm - b.widthPerEm) / Math.max(a.widthPerEm, b.widthPerEm)
        const ink = Math.abs(a.ink - b.ink)
        if (width <= 0.05 && ink <= 0.03 && a.sectionCase === b.sectionCase && a.heroPx === b.heroPx) {
          close.push(`${ids[i]} and ${ids[j]} (width ${(width * 100).toFixed(1)}%, ink ${ink.toFixed(3)})`)
        }
      }
    }
    expect(close, close.join('; ')).toEqual([])
  })
})
