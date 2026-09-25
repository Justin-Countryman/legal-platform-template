// The style set's retired names as `no-restricted-syntax` selectors (Phase 17C, [R-535]),
// run through ESLint's own Linter with the list the config spreads.

import {describe, expect, it} from 'vitest'
import {Linter} from 'eslint'
import tsParser from '@typescript-eslint/parser'
import names from '../lib/style-set-names.js'

const linter = new Linter({configType: 'flat'})
const lint = (code: string) =>
  linter.verify(code, [{
    files: ['**/*.tsx'],
    languageOptions: {parser: tsParser, parserOptions: {ecmaFeatures: {jsx: true}, sourceType: 'module'}},
    rules: {'no-restricted-syntax': ['error', ...names.RETIRED_SELECTORS]},
  }], 'x.tsx').map((m) => m.message)

describe('the retired style-set selectors', () => {
  it('fail every old identifier, as a value, a type and a JSX element', () => {
    for (const name of names.OLD_IDENTIFIERS) expect(lint(`const x = ${name}`), name).toHaveLength(1)
    expect(lint('let x: ThemeDoc | null = null')).toHaveLength(1)
    expect(lint('const e = <ThemePreview />')).toHaveLength(1)
    expect(lint("import {matchTheme} from '@/lib/matching'")).toHaveLength(2)
  })

  it('fail the old presets.json keys and the Studio field as names and as strings, and themes only as a string', () => {
    for (const key of names.OLD_KEYS) {
      expect(lint(`data.${key}`), key).toHaveLength(1)
      expect(lint(`const k = '${key}'`), key).toHaveLength(1)
    }
    expect(lint("const k = data['themes']")).toHaveLength(1)
    expect(lint("defineField({name: 'themePreview'})")).toHaveLength(1)
    expect(lint('const k = `themes`')).toHaveLength(1)
    // A list of flows may be called themes.
    expect(lint('const themes = FLOWS; for (const t of themes) use(t)')).toHaveLength(0)
  })

  it('fail the old roster key read as a property or destructured, and an old name as a JSX prop', () => {
    expect(lint('const n = presets.themes.length')).toHaveLength(1)
    expect(lint('const {themes: roster} = presets')).toHaveLength(1)
    expect(lint('const e = <Picker themePreview />')).toHaveLength(1)
    // A list of flows in a variable called themes, and a flow's own fields, pass.
    expect(lint('const themes = FLOWS; const n = themes.length')).toHaveLength(0)
  })

  it('fail an import of a .../themes module however it is written', () => {
    expect(lint("import {STYLE_SETS} from '@/lib/themes'")).toHaveLength(1)
    expect(lint("import {STYLE_SETS} from '@/lib/themes.ts'")).toHaveLength(1)
    expect(lint("const t = require('./themes')")).toHaveLength(1)
    expect(lint("import x from '../themes'")).toHaveLength(1)
    expect(lint("export {x} from './themes'")).toHaveLength(1)
    expect(lint("const m = await import('../../site/lib/themes')")).toHaveLength(1)
    expect(lint("import {STYLE_SETS} from '@/lib/styleSets'")).toHaveLength(0)
  })

  it('pass the flow\'s own names and the new ones', () => {
    expect(lint("import {FLOWS, flowOf} from '@/lib/flows'\nconst ROW_THEME_HEAD = 'Theme'\nconst themed = flowOf({})")).toEqual([])
    expect(lint('const s = STYLE_SETS; const p = styleSetPatch(s[0]); type T = StyleSetDoc')).toEqual([])
  })
})
