import {describe, it, expect} from 'vitest'
import {readdirSync, readFileSync, statSync} from 'node:fs'
import {join, relative} from 'node:path'

// Monorepo backlog 528: a tel: link is made by `telHref` (lib/tokens.ts) and nowhere else, so none writes local digits
// run together again. Every component, route and lib file is read but tokens.ts itself; a test file is left out.
const ROOT = join(__dirname, '..', '..')

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (name === '__tests__' || name === 'node_modules') return []
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(tsx?|jsx?|mjs)$/.test(name) ? [path] : []
  })
}

// A tel: URL built by a template literal or by joining strings; a check such as startsWith('tel:') is not one.
const BUILT = /tel:\$\{|`tel:|['"]tel:['"]\s*\+/

describe('tel: links', () => {
  it('are made by telHref alone', () => {
    const made = ['components', 'app', 'lib'].flatMap((d) => sources(join(ROOT, d)))
      .filter((f) => relative(ROOT, f) !== join('lib', 'tokens.ts'))   // telHref itself
      .filter((f) => BUILT.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f))
    expect(made).toEqual([])
  })
})
