// The Studio, checked for the style set's old names (Phase 17C, [R-535]).
//
// The Studio has no ESLint, and CI lints `site/` only, so the checks the site's ESLint runs
// (`eslint-rules/lib/style-set-names.js`: the retired selectors, and the scoped rule on names
// that say theme in a module importing lib/styleSets) are applied here to every
// `studio/**/*.ts(x)`, parsed with the parser ESLint uses. An AST check, not a text grep: a
// comment or a string that says theme for the flow passes.

import {readFileSync, readdirSync, statSync} from 'node:fs'
import {createRequire} from 'node:module'
import {join, relative, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {parse} from '@typescript-eslint/typescript-estree'
import names from '../../eslint-rules/lib/style-set-names.js'
import eslintConfig from '../../eslint.config.mjs'

// ESLint's own selector engine (a dependency of eslint; it ships no types).
// With TypeScript's visitor keys, as ESLint walks it, so a type position (`let x: StyleSetDoc`) is
// reached; esquery's own keys stop at the type annotation.
const load = createRequire(import.meta.url)
const esquery = load('esquery') as {match: (ast: never, selector: unknown, options?: {visitorKeys: unknown}) => unknown[]; parse: (s: string) => unknown}
const {visitorKeys} = load('@typescript-eslint/visitor-keys') as {visitorKeys: unknown}

const STUDIO = resolve(__dirname, '../../../studio')
const SKIP = new Set(['node_modules', 'dist', '.sanity'])

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return []
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return sources(p)
    return /\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts') ? [p] : []
  })
}

// The scoped rule's allow list, as the site's config sets it, so the two cannot differ.
type Block = {rules?: Record<string, unknown>}
const ruleEntry = (eslintConfig as Block[]).map((b) => b.rules?.['platform/no-theme-for-style-set']).find(Boolean) as [string, {allow: string[]}]
const allow = ruleEntry[1].allow

function violations(file: string): string[] {
  const code = readFileSync(file, 'utf8')
  const ast = parse(code, {jsx: file.endsWith('.tsx'), loc: true, range: true})
  const out: string[] = []
  for (const {selector, message} of names.RETIRED_SELECTORS) {
    for (const node of esquery.match(ast as never, esquery.parse(selector), {visitorKeys}) as {loc: {start: {line: number}}}[]) {
      out.push(`${relative(STUDIO, file)}:${node.loc.start.line} ${message.split('.')[0]}`)
    }
  }
  for (const {node, name} of names.scopedThemeNames(ast, allow)) {
    out.push(`${relative(STUDIO, file)}:${node.loc.start.line} '${name}' says theme in a module that imports lib/styleSets`)
  }
  return out
}

describe('the Studio says style set for the style set', () => {
  const files = sources(STUDIO)

  it('reads the Studio (the schemas, the components, the config)', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files.some((f) => f.endsWith('schemas/documents/designSettings.ts'))).toBe(true)
  })

  it('no Studio file uses a retired name, key or import, or says theme where it imports the style sets', () => {
    expect(files.flatMap(violations)).toEqual([])
  })

  it('the check fires on a planted old name (so an empty list above is not a blind parser)', () => {
    const ast = parse("import {THEMES} from '../../site/lib/themes'\nfor (const theme of STYLE_SETS) f(theme)\nimport {STYLE_SETS} from '../../site/lib/styleSets'", {loc: true, range: true})
    const fired = names.RETIRED_SELECTORS.filter(({selector}) => esquery.match(ast as never, esquery.parse(selector), {visitorKeys}).length > 0)
    // the old identifier, and the old module's path
    expect(fired.map((f: {selector: string}) => f.selector.split('[')[0])).toEqual(['Identifier', ':matches(ImportDeclaration, ExportNamedDeclaration, ExportAllDeclaration, ImportExpression)'])
    expect(names.scopedThemeNames(ast, allow).map((v: {name: string}) => v.name)).toEqual(['THEMES', 'theme'])
  })

  it('reaches a type position, as the site\'s ESLint does', () => {
    for (const code of ['let x: ThemeDoc', 'const m = new Map<string, ThemeMatch>()', 'function f(): Theme { return g() }']) {
      const ast = parse(code, {loc: true, range: true})
      const hits = names.RETIRED_SELECTORS.flatMap(({selector}) => esquery.match(ast as never, esquery.parse(selector), {visitorKeys}))
      expect(hits.length, code).toBe(1)
    }
  })
})
