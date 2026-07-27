// Falsifiability tests for the unknown-utility-class check.
//
// A guard that only ever reports zero is indistinguishable from a guard that
// does nothing, so the central tests here hand the checker the two utilities
// that actually shipped broken (`bg-surface-muted`, `shadow-card`, five
// homepage block components, fixed 2026-07-21 in a2b0edc) and require it to
// reject them — including end-to-end, through a real file on disk, so the
// extractor and the reporter are exercised and not just the oracle.
//
// Provenance: monorepo BI/OUTSTANDING.md item 56.

import {__unstable__loadDesignSystem} from '@tailwindcss/node'
import {parse} from '@typescript-eslint/parser'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {beforeAll, describe, expect, it} from 'vitest'

import {extractClassCandidates} from '../lib/class-candidates.mjs'
import {
  collectClassSites,
  findUnknown,
  readPlainCssClasses,
} from '../check-unknown-utility-classes.mjs'

const SITE_ROOT = path.resolve(__dirname, '../..')

// The two names exactly as they shipped, and the two that replaced them.
const SHIPPED_BROKEN = ['bg-surface-muted', 'shadow-card']
const CORRECT_NAMES = ['bg-muted', 'shadow-card-rest']

let designSystem: {candidatesToCss: (names: string[]) => (string | null)[]}
let plainCss: Set<string>

beforeAll(async () => {
  designSystem = await __unstable__loadDesignSystem(
    fs.readFileSync(path.join(SITE_ROOT, 'app/globals.css'), 'utf8'),
    {base: SITE_ROOT},
  )
  plainCss = readPlainCssClasses(SITE_ROOT)
}, 60_000)

const parseJSX = (source: string) =>
  parse(source, {jsx: true, loc: true, sourceType: 'module', ecmaVersion: 'latest'})

describe('the regression it exists to catch', () => {
  it('rejects both utilities that shipped on the five homepage blocks', () => {
    expect(findUnknown(SHIPPED_BROKEN, designSystem, plainCss)).toEqual([
      'bg-surface-muted',
      'shadow-card',
    ])
  })

  it('accepts the names that replaced them', () => {
    expect(findUnknown(CORRECT_NAMES, designSystem, plainCss)).toEqual([])
  })

  it('does not confuse shadow-card with the shadow-card-rest that contains it', () => {
    expect(findUnknown(['shadow-card'], designSystem, plainCss)).toEqual(['shadow-card'])
    expect(findUnknown(['shadow-card-rest'], designSystem, plainCss)).toEqual([])
    expect(findUnknown(['shadow-card-hover'], designSystem, plainCss)).toEqual([])
  })

  it('rejects a broken utility behind a variant, not just bare', () => {
    expect(findUnknown(['md:bg-surface-muted'], designSystem, plainCss)).toEqual([
      'md:bg-surface-muted',
    ])
    expect(findUnknown(['hover:shadow-card'], designSystem, plainCss)).toEqual(['hover:shadow-card'])
  })

  it('rejects the three defects this check found on its first run', () => {
    expect(
      findUnknown(
        ['bg-bg-mid', 'text-brand-light', 'focus:outline-text-on-dark/50'],
        designSystem,
        plainCss,
      ),
    ).toEqual(['bg-bg-mid', 'focus:outline-text-on-dark/50', 'text-brand-light'])
  })

  it('accepts the tokens those three were corrected to', () => {
    expect(
      findUnknown(
        ['bg-muted', 'text-foreground-on-dark', 'focus:outline-foreground-on-dark/50'],
        designSystem,
        plainCss,
      ),
    ).toEqual([])
  })
})

describe('end to end, through a real file on disk', () => {
  it('names the class, the file and the line', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'item56-'))
    fs.mkdirSync(path.join(root, 'components'), {recursive: true})
    // The card surface line from DifferentiatorBlock.tsx as it read before a2b0edc.
    fs.writeFileSync(
      path.join(root, 'components', 'Block.tsx'),
      [
        'export function Block() {',
        '  return (',
        '    <div className="rounded-ui bg-surface-muted p-6 shadow-card md:p-8">',
        '      <p className="text-foreground">hi</p>',
        '    </div>',
        '  )',
        '}',
        '',
      ].join('\n'),
    )

    const {sites, parseFailures} = collectClassSites(root)
    expect(parseFailures).toEqual([])

    const unknown = findUnknown([...sites.keys()], designSystem, plainCss)
    expect(unknown).toEqual(['bg-surface-muted', 'shadow-card'])
    expect(sites.get('bg-surface-muted')).toEqual(['components/Block.tsx:3'])
    expect(sites.get('shadow-card')).toEqual(['components/Block.tsx:3'])

    // The correct utilities on the same two elements are not reported.
    expect(unknown).not.toContain('rounded-ui')
    expect(unknown).not.toContain('text-foreground')

    fs.rmSync(root, {recursive: true, force: true})
  })

  it('reports a file it cannot parse instead of counting it clean', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'item56-'))
    fs.mkdirSync(path.join(root, 'components'), {recursive: true})
    fs.writeFileSync(path.join(root, 'components', 'Broken.tsx'), 'export function ( { <<<')

    const {parseFailures} = collectClassSites(root)
    expect(parseFailures).toHaveLength(1)
    expect(parseFailures[0]).toContain('components/Broken.tsx')

    fs.rmSync(root, {recursive: true, force: true})
  })
})

describe('the canonical template is green', () => {
  it('has no unknown utility class in app/, components/ or lib/', () => {
    const {sites, parseFailures} = collectClassSites(SITE_ROOT)
    expect(parseFailures).toEqual([])
    expect(findUnknown([...sites.keys()], designSystem, plainCss)).toEqual([])
  }, 60_000)

  it('is green because it checked real work, not because it found nothing to check', () => {
    const {sites} = collectClassSites(SITE_ROOT)
    // Guards against a silent collection failure passing as a clean run.
    expect(sites.size).toBeGreaterThan(500)
    expect(sites.get('bg-muted')?.length).toBeGreaterThan(0)
    expect(sites.get('shadow-card-rest')?.length).toBeGreaterThan(0)
  }, 60_000)
})

describe('the three exemptions', () => {
  it('exempts Tailwind marker classes, which emit no CSS by design', () => {
    expect(findUnknown(['group', 'peer'], designSystem, plainCss)).toEqual([])
    expect(findUnknown(['group/card', 'peer/input'], designSystem, plainCss)).toEqual([])
  })

  it('exempts a plain CSS class the project defines itself', () => {
    // .text-page-h1 is real CSS in an @layer utilities block in globals.css,
    // but not a registered utility, so Tailwind alone reports nothing for it.
    expect(designSystem.candidatesToCss(['text-page-h1'])).toEqual([null])
    expect(plainCss.has('text-page-h1')).toBe(true)
    expect(findUnknown(['text-page-h1'], designSystem, plainCss)).toEqual([])
  })

  it('exempts the documented legacy form-embed hook', () => {
    expect(findUnknown(['footer-form-embed'], designSystem, plainCss)).toEqual([])
  })

  it('exempts nothing else — an invented class is still reported', () => {
    expect(findUnknown(['not-a-real-utility'], designSystem, plainCss)).toEqual([
      'not-a-real-utility',
    ])
  })
})

describe('extraction: what counts as a whole class name', () => {
  const whole = (source: string) =>
    extractClassCandidates(parseJSX(source)).candidates.map((c) => c.name)

  it('reads string literals', () => {
    expect(whole('<div className="a b" />')).toEqual(['a', 'b'])
  })

  it('reads both arms of a conditional', () => {
    expect(whole("<div className={cond ? 'a' : 'b'} />")).toEqual(['a', 'b'])
  })

  it('reads logical operands', () => {
    expect(whole("<div className={cond && 'a'} />")).toEqual(['a'])
    expect(whole("<div className={x || 'a'} />")).toEqual(['a'])
  })

  it('reads the literal arguments of cn()/clsx()', () => {
    expect(whole("<div className={cn('a', x, 'b')} />")).toEqual(['a', 'b'])
  })

  it('reads an array join', () => {
    expect(whole("<div className={['a', cond && 'b'].filter(Boolean).join(' ')} />")).toEqual([
      'a',
      'b',
    ])
  })

  it('reads a template literal with no interpolation', () => {
    expect(whole('<div className={`a b`} />')).toEqual(['a', 'b'])
  })

  it('reads whitespace-separated tokens around an interpolation', () => {
    expect(whole('<div className={`a ${x} b`} />')).toEqual(['a', 'b'])
  })

  it('drops a token spliced together with an interpolation, rather than guessing', () => {
    // `bg-${tone}-500` is one class at runtime. Its static parts are "bg-" and
    // "-500"; neither is a class, and both would resolve to no CSS. Emitting
    // them would be two false reports on one correct line.
    expect(whole('<div className={`bg-${tone}-500`} />')).toEqual([])
    expect(whole('<div className={`a bg-${tone}-500 b`} />')).toEqual(['a', 'b'])
  })

  it('drops only the adjacent token, keeping the rest of the attribute', () => {
    expect(whole('<div className={`a b c${suffix}`} />')).toEqual(['a', 'b'])
    expect(whole('<div className={`${prefix}a b c`} />')).toEqual(['b', 'c'])
  })

  it('emits nothing for a className assembled elsewhere', () => {
    expect(whole('<div className={styles.foo} />')).toEqual([])
    expect(whole('<div className={variant} />')).toEqual([])
  })

  it('counts what it skipped instead of hiding it', () => {
    const {skipped} = extractClassCandidates(parseJSX('<div className={styles.foo} />'))
    expect(skipped).toHaveLength(1)
    expect(skipped[0].reason).toBe('MemberExpression')
  })

  it('records the line number of each class', () => {
    const {candidates} = extractClassCandidates(parseJSX('<div\n  className="a"\n/>'))
    expect(candidates).toEqual([{name: 'a', line: 2}])
  })
})
