// no-theme-for-style-set (Phase 17C, [R-535]) — RuleTester suite.

import {describe, it} from 'vitest'
import {RuleTester} from 'eslint'
import tsParser from '@typescript-eslint/parser'

import rule from '../rules/no-theme-for-style-set.js'

;(globalThis as Record<string, unknown>).describe = describe
;(globalThis as Record<string, unknown>).it = it

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {ecmaFeatures: {jsx: true}, sourceType: 'module'},
  },
})

const IMPORT = "import {STYLE_SETS, type StyleSet} from '@/lib/styleSets'\n"

tester.run('platform/no-theme-for-style-set', rule, {
  valid: [
    // A module that does not import the style sets may say theme for the flow freely.
    {code: "import {FLOWS} from '@/lib/flows'\nfor (const theme of FLOWS) console.log(theme)\nconst themed = true"},
    // In a module that does, the style set says styleSet.
    {code: `${IMPORT}for (const styleSet of STYLE_SETS) console.log(styleSet.id)\nconst match = {styleSet: STYLE_SETS[0]}`},
    // A flow name in such a module, allowed by the config.
    {code: `${IMPORT}export const ROW_THEME_HEAD = 'Theme, the flow of the page'`, options: [{allow: ['ROW_THEME_HEAD']}]},
    // Reading a property named theme is not declaring one.
    {code: `${IMPORT}const {theme: shown} = pick()`},
    // Strings and comments are not names: "the theme row" in text is the flow's word.
    {code: `${IMPORT}// the theme row\nconst label = 'Theme, the flow of the page'`},
    // A relative import from beside the module counts the same way (and still passes here).
    {code: "import {STYLE_SETS} from './styleSets'\nconst sets = STYLE_SETS"},
  ],
  invalid: [
    {code: `${IMPORT}for (const theme of STYLE_SETS) console.log(theme.id)`, errors: [{messageId: 'themeName', data: {name: 'theme'}}]},
    {code: `${IMPORT}function pick(theme: StyleSet) { return theme }`, errors: [{messageId: 'themeName'}]},
    {code: `${IMPORT}const themes = STYLE_SETS.map((t) => t.id)`, errors: [{messageId: 'themeName', data: {name: 'themes'}}]},
    {code: `${IMPORT}type ThemeRow = {id: string}`, errors: [{messageId: 'themeName', data: {name: 'ThemeRow'}}]},
    {code: `${IMPORT}const out = {themes: STYLE_SETS}`, errors: [{messageId: 'themeName', data: {name: 'themes'}}]},
    {code: `${IMPORT}interface Match { theme: StyleSet }`, errors: [{messageId: 'themeName', data: {name: 'theme'}}]},
    {code: `${IMPORT}const {a: activeTheme} = pick()`, errors: [{messageId: 'themeName', data: {name: 'activeTheme'}}]},
    {code: "import {STYLE_SETS as ALL_THEMES} from '../lib/styleSets'\nconsole.log(ALL_THEMES)", errors: [{messageId: 'themeName', data: {name: 'ALL_THEMES'}}]},
    {code: `${IMPORT}try { f() } catch (themeError) { g(themeError) }`, errors: [{messageId: 'themeName'}]},
    // An allow list names exactly; a near name still fails.
    {code: `${IMPORT}const ROW_THEME = 1`, options: [{allow: ['ROW_THEME_HEAD']}], errors: [{messageId: 'themeName'}]},
  ],
})
