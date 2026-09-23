import {describe, expect, it} from 'vitest'
import {mkdtempSync, writeFileSync, rmSync, readdirSync, existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {scan} from '../../../../scripts/check-template-is-blank.mjs'

// The blank-slate guard reads `.ndjson` (Phase 17B session 3, record §2.11). The stub
// datasets under `scripts/ci/` are copy a served page renders; before this the guard
// skipped the extension, and a study site's domain planted in a canvas heading passed
// it (ADV-17B-C F11, measured). Proven by planting one and by scanning the real files.

const CI = resolve(__dirname, '..')

describe('scripts/check-template-is-blank.mjs and .ndjson', () => {
  it('catches a domain planted in a .ndjson dataset, and names the file and line', () => {
    const dir = mkdtempSync(join(tmpdir(), 'blank-guard-'))
    try {
      // Assembled at run time: this file is scanned too, and a literal would fail the guard.
      const planted = ['somefirm-planted', 'c' + 'om'].join('.')
      writeFileSync(join(dir, 'planted.ndjson'), `{"_id": "fx-home", "_type": "homePage", "canvas": [{"heading": "Welcome to ${planted}"}]}\n`)
      const {findings, filesScanned} = scan(dir)
      expect(filesScanned).toBe(1)
      expect(findings).toHaveLength(1)
      expect(findings[0]).toMatchObject({file: 'planted.ndjson', line: 1, kind: 'domain', value: planted})
    } finally {
      rmSync(dir, {recursive: true, force: true})
    }
  })

  // On a client tree the press prunes `scripts/ci`, so the real files are checked on
  // the template checkout and skipped, by name, on a propagated client ([R-175]).
  const files = existsSync(CI) ? readdirSync(CI).filter((f) => f.endsWith('.ndjson')) : []
  it.skipIf(files.length === 0)('the stub datasets under scripts/ci carry no firm identity (skipped on a client tree: scripts/ci is pruned by the press)', () => {
    expect(files.length).toBeGreaterThanOrEqual(4)
    const {findings} = scan(CI)
    expect(findings.filter((f) => f.file.endsWith('.ndjson'))).toEqual([])
  })
})
