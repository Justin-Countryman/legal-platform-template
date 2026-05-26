// no-use-hero-scheme-in-server (C4)
//
// Flag `useHeroScheme` references in files that look like async React
// Server Components (no `'use client'` directive + async default export).
// Async server components have no React render scope to attach hooks to;
// calling a hook there fails at runtime.
//
// Posture lock:
//   `skill-sanity-schema → "Reading design settings in async server
//    components"`:
//   "When a route component needs `designSettings` values (e.g.,
//    `internalHeroBackground` to flip a hero band) and the component
//    is an async server component, do NOT consume `<HeroSchemeProvider>`
//    via the `useHeroScheme()` hook — async server components have
//    no React render scope to attach hooks to. Use server-side
//    `client.fetch(DESIGN_TOKENS_QUERY)` instead."
//
//   Lock provenance: WS7.7 Commit 2 (BlogPostPage server-side fetch —
//   first instance) + Commit 3 (AttorneyProfilePage + StaffProfilePage
//   extension).
//
// Heuristic detection (per WS8 Justin direction — platform-wide scope):
//
//   1. File has NO `'use client'` directive at the top.
//   2. File has at least one `export default <async function>` —
//      either `async function Foo()`, `async (props) => ...`, or
//      `async function ()`.
//
//   Both conditions must hold for the file to qualify as "async server
//   component." If qualified, ANY Identifier named `useHeroScheme`
//   (import, call site, reference) is flagged.
//
// Conservative carve-out: any file with `'use client'` is exempt.
// React client components — including async-looking ones (rare but
// possible) — pass through. The 'use client' directive is the canonical
// way to mark a file as a client component; trusting it is safer than
// trying to second-guess.
//
// Auto-fix: NOT provided. The fix is structural — replace the hook
// call with server-side `client.fetch(DESIGN_TOKENS_QUERY)` and prop-
// drill the resolved scheme to consuming subtrees. Out of lint scope.

'use strict'

/**
 * Walk the file's top-level directive prologue looking for 'use client'.
 *
 * Per ESLint AST: directive prologues are at the top of the file as
 * ExpressionStatement nodes with a `directive` string property.
 * Scanning stops at the first non-directive statement.
 */
function hasUseClientDirective(programNode) {
  for (const stmt of programNode.body) {
    if (stmt.type !== 'ExpressionStatement') break
    if (typeof stmt.directive !== 'string') break
    if (stmt.directive === 'use client') return true
  }
  return false
}

/**
 * Does the file have an `export default <async ...>` at the top level?
 *
 * Three async function shapes count:
 *   - `export default async function Foo() {}`     → FunctionDeclaration
 *   - `export default async function () {}`        → FunctionDeclaration (anonymous)
 *   - `export default async () => {}`              → ArrowFunctionExpression
 *   - `export default async function() {}` (paren) → FunctionExpression
 */
function exportsAsyncDefault(programNode) {
  for (const stmt of programNode.body) {
    if (stmt.type !== 'ExportDefaultDeclaration') continue
    const decl = stmt.declaration
    if (!decl) continue
    if (
      (decl.type === 'FunctionDeclaration' ||
        decl.type === 'ArrowFunctionExpression' ||
        decl.type === 'FunctionExpression') &&
      decl.async === true
    ) {
      return true
    }
  }
  return false
}

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow useHeroScheme() in async React Server Components — hooks require client-component render scope',
      recommended: false,
      url: 'BI/skills/skill-sanity-schema/SKILL.md#reading-design-settings-in-async-server-components',
    },
    schema: [],
    messages: {
      inServer:
        "useHeroScheme() called in a file that looks like an async React Server Component (async default export, no 'use client' directive). Hooks require client-component render scope; async server components must use server-side `client.fetch(DESIGN_TOKENS_QUERY)` instead and prop-drill the resolved scheme. See skill-sanity-schema → 'Reading design settings in async server components' (WS7.7 Commit 2 lock).",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode
    const program = sourceCode.ast

    // Conservative carve-out: 'use client' files are client components.
    // Trust the directive; don't try to second-guess.
    if (hasUseClientDirective(program)) return {}

    // Only fire on files that look like async server components.
    if (!exportsAsyncDefault(program)) return {}

    return {
      Identifier(node) {
        if (node.name !== 'useHeroScheme') return
        // ImportSpecifier nodes contain TWO Identifier children — `imported`
        // (the source-side name) and `local` (the binding's local name).
        // For un-renamed imports, both Identifiers have the same name and
        // would fire twice. Skip the `imported` side; the `local` side
        // (and downstream call sites) catch the same import.
        if (
          node.parent?.type === 'ImportSpecifier' &&
          node.parent.imported === node
        ) {
          return
        }
        context.report({node, messageId: 'inServer'})
      },
    }
  },
}
