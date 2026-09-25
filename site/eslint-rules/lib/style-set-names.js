// The style set's names (Phase 17C, `[R-535]`; monorepo WS-V1-PHASE17C-DESIGN §2.1).
//
// Until Phase 17C the code called the style set a "theme" (`lib/themes.ts`, `THEMES`,
// `matchTheme`), and since Phase 17B a THEME is the flow of the page (`lib/flows.ts`). The
// rename gave the style set its own name and left the word to the flow. Nothing here bans the
// word: code may say theme for the flow (`ROW_THEME_HEAD`, `themed`). What is banned is the
// old meaning, three ways, from one list read by three checkers so they cannot drift:
//
//   1. RETIRED_SELECTORS: the exact old identifiers, the old `studio/presets.json` keys and the
//      Studio field `themePreview` (as a name and as a string, since a Sanity `name:` is a
//      string), and any import of a `.../themes` module. Spread into `no-restricted-syntax`
//      in `eslint.config.mjs`.
//   2. scopedThemeNames: in a module that imports `lib/styleSets`, any name it DECLARES that
//      says theme (a binding, a parameter, a type, a property key), unless the config names it
//      as the flow's. Catches `for (const theme of STYLE_SETS)`. The rule
//      `platform/no-theme-for-style-set`.
//   3. The Studio has no ESLint and CI lints `site/` only, so `lib/__tests__/styleSetNames.test.ts`
//      parses every `studio/**/*.ts(x)` and applies 1 and 2 to it.

'use strict'

const OLD_IDENTIFIERS = [
  'THEME_FIELDS', 'THEME_PICKS', 'THEME_DEFAULTS', 'THEME_FIELD_LABELS', 'THEME_PICK_LABELS', 'THEMES',
  'Theme', 'ThemeField', 'ThemeSettings', 'ThemePicks', 'ThemePickField', 'ThemeValue', 'ThemeDoc', 'ThemeMatch',
  'ThemeButton', 'matchTheme', 'themePatch', 'readThemeField', 'ThemePreview',
]
// Collision-free as names; `themes` is not (a list of flows may be called that), so it is
// banned only as a string, where it can only be the old `presets.json` key.
const OLD_KEYS = ['themeFields', 'themeDefaults', 'themePicks', 'canyonPatch', 'themePreview']
const OLD_KEY_STRINGS = [...OLD_KEYS, 'themes']

const alternation = (names) => `/^(${names.join('|')})$/`
const WHY = 'Phase 17C ([R-535]): the style set is `styleSet` in code, and theme means the flow of the page.'

const RETIRED_SELECTORS = [
  {
    selector: `Identifier[name=${alternation(OLD_IDENTIFIERS)}]`,
    message: `Retired name for the style set. ${WHY} Use lib/styleSets.ts (STYLE_SETS, StyleSet, matchStyleSet, styleSetPatch, ...).`,
  },
  {
    selector: `JSXIdentifier[name=${alternation([...OLD_IDENTIFIERS, ...OLD_KEYS])}]`,
    message: `Retired component or prop name for the style set. ${WHY} The Studio's picker is StyleSetPicker.`,
  },
  {
    selector: `Identifier[name=${alternation(OLD_KEYS)}]`,
    message: `Retired presets.json key or Studio field for the style set. ${WHY} The keys are styleSetFields, styleSetDefaults, styleSetPicks, styleSets and matchCases[].firstStyleSetPatch; the field is styleSetPicker.`,
  },
  {
    selector: `Literal[value=${alternation(OLD_KEY_STRINGS)}]`,
    message: `Retired presets.json key or Studio field name for the style set, as a string. ${WHY}`,
  },
  {
    // `themes` read as a property or destructured: the old presets.json roster key. A list of
    // flows held in a variable called themes is a binding, not a property, and passes.
    selector: ':matches(MemberExpression[computed=false] > Identifier.property, ObjectPattern > Property[computed=false] > Identifier.key)[name="themes"]',
    message: `Retired presets.json key for the style sets, read as a property. ${WHY} The key is styleSets.`,
  },
  {
    selector: `TemplateElement[value.cooked=${alternation(OLD_KEY_STRINGS)}]`,
    message: `Retired presets.json key or Studio field name for the style set, in a template literal. ${WHY}`,
  },
  {
    selector: ':matches(ImportDeclaration, ExportNamedDeclaration, ExportAllDeclaration, ImportExpression)[source.value=/\\/themes(\\.[cm]?[jt]sx?)?$/]',
    message: `lib/themes.ts is lib/styleSets.ts since Phase 17C ([R-535]).`,
  },
  {
    selector: 'CallExpression[callee.name="require"] > Literal.arguments[value=/\\/themes(\\.[cm]?[jt]sx?)?$/]',
    message: `lib/themes.ts is lib/styleSets.ts since Phase 17C ([R-535]).`,
  },
]

const STYLE_SETS_MODULE = /(^|\/)styleSets$/
const THEME = /theme/i

const SKIP = new Set(['parent', 'loc', 'range', 'tokens', 'comments'])

function walk(node, visit, parent = null) {
  if (!node || typeof node.type !== 'string') return
  visit(node, parent)
  for (const key of Object.keys(node)) {
    if (SKIP.has(key)) continue
    const v = node[key]
    if (Array.isArray(v)) for (const c of v) walk(c, visit, node)
    else if (v && typeof v.type === 'string') walk(v, visit, node)
  }
}

function importsStyleSets(program) {
  return program.body.some((s) =>
    (s.type === 'ImportDeclaration' || s.type === 'ExportNamedDeclaration' || s.type === 'ExportAllDeclaration')
    && s.source && typeof s.source.value === 'string' && STYLE_SETS_MODULE.test(s.source.value))
}

/** The identifiers a pattern binds: `x`, `{a, b: c}`, `[d, ...e]`, `f = 1`. */
function bound(pattern, out) {
  if (!pattern) return out
  switch (pattern.type) {
    case 'Identifier': out.push(pattern); break
    case 'ObjectPattern': for (const p of pattern.properties) bound(p.type === 'RestElement' ? p.argument : p.value, out); break
    case 'ArrayPattern': for (const e of pattern.elements) bound(e, out); break
    case 'AssignmentPattern': bound(pattern.left, out); break
    case 'RestElement': bound(pattern.argument, out); break
    case 'TSParameterProperty': bound(pattern.parameter, out); break
  }
  return out
}

const keyName = (key, computed) =>
  computed ? null : key.type === 'Identifier' ? key.name : key.type === 'Literal' && typeof key.value === 'string' ? key.value : null

/** In a module that imports `lib/styleSets`, every name it declares that says theme and is not
 *  in `allow` (the flow's own names there): [{node, name}]. Empty for any other module. */
function scopedThemeNames(program, allow = []) {
  if (!importsStyleSets(program)) return []
  const allowed = new Set(allow)
  const out = []
  const check = (node, name) => { if (name && THEME.test(name) && !allowed.has(name)) out.push({node, name}) }
  walk(program, (n, parent) => {
    switch (n.type) {
      case 'VariableDeclarator': for (const id of bound(n.id, [])) check(id, id.name); break
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': case 'TSDeclareFunction':
        if (n.id) check(n.id, n.id.name)
        for (const p of n.params) for (const id of bound(p, [])) check(id, id.name)
        break
      case 'ClassDeclaration': case 'TSTypeAliasDeclaration': case 'TSInterfaceDeclaration': case 'TSEnumDeclaration':
        if (n.id) check(n.id, n.id.name); break
      case 'ImportSpecifier': case 'ImportDefaultSpecifier': case 'ImportNamespaceSpecifier': check(n.local, n.local.name); break
      case 'CatchClause': for (const id of bound(n.param, [])) check(id, id.name); break
      // A key in a destructuring pattern names what is read, not what is declared; its binding is
      // checked through the declarator.
      case 'Property': if (parent?.type !== 'ObjectPattern') check(n.key, keyName(n.key, n.computed)); break
      case 'TSPropertySignature': case 'MethodDefinition': case 'PropertyDefinition': case 'TSMethodSignature':
        check(n.key, keyName(n.key, n.computed)); break
    }
  })
  return out
}

module.exports = {OLD_IDENTIFIERS, OLD_KEYS, RETIRED_SELECTORS, scopedThemeNames, importsStyleSets}
