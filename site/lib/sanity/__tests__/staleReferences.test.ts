import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import * as queries from '../queries'

// ─── A query that still names something the schema deleted ───────────────────
//
// Phase 15 (monorepo WS-V1-PHASE15-DESIGN §7 amendment 5). When a field or a
// type leaves the schema, a GROQ projection that still names it keeps compiling,
// keeps building and keeps passing every test: typegen types the stale key
// `null`, and a `_type == "x"` branch for a deleted type simply never matches.
// Phase 15's challenge planted both shapes on the deletion tree and no existing
// gate (tsc, eslint, the class check, vitest, typegen, the stub build) saw
// either. These two checks read the artifacts, not the source text: the query
// strings the site sends, and the result types typegen generated from them.
//
// KNOWN FINDINGS, each a monorepo backlog item and NOT this check's to fix:
// they predate it, and removing them changes what a page reads.

/** Top-level keys of a query result that typegen can only type `null`. */
const KNOWN_NULL_KEYS = new Set([
  // monorepo backlog item 326: the attorneys index projects three fields its
  // document type does not declare; the page reads them and always gets null.
  'ATTORNEY_INDEX_QUERY_RESULT.tagline',
  'ATTORNEY_INDEX_QUERY_RESULT.heading',
  'ATTORNEY_INDEX_QUERY_RESULT.description',
])

/** `_type` literals a query compares against that no schema type declares. */
const KNOWN_UNDECLARED_TYPES = new Set([
  // monorepo backlog item 327: the sidebar navigation's `faqPosts` mode ("FAQ
  // Blog Posts") queries a type no schema has declared, so it lists nothing.
  'blogPostFaq',
])

// Types Sanity itself defines, which the extracted schema does not list.
const BUILT_IN_TYPES = new Set(['image', 'file', 'reference', 'block', 'span', 'slug'])

const TYPES_PATH = path.resolve(__dirname, '..', '..', '..', 'types', 'sanity.types.ts')
const SCHEMA_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'studio', 'schema.json')

function topLevelNullKeys(): string[] {
  const source = ts.createSourceFile(TYPES_PATH, readFileSync(TYPES_PATH, 'utf8'), ts.ScriptTarget.Latest, true)
  const found: string[] = []
  const objectOf = (node: ts.TypeNode): ts.TypeLiteralNode | null => {
    if (ts.isTypeLiteralNode(node)) return node
    if (ts.isUnionTypeNode(node)) {
      const literals = node.types.filter(ts.isTypeLiteralNode)
      return literals.length === 1 ? literals[0] : null
    }
    return null
  }
  for (const statement of source.statements) {
    if (!ts.isTypeAliasDeclaration(statement) || !statement.name.text.endsWith('_QUERY_RESULT')) continue
    const object = objectOf(statement.type)
    if (!object) continue
    for (const member of object.members) {
      if (!ts.isPropertySignature(member) || !member.type) continue
      const isNull = member.type.kind === ts.SyntaxKind.LiteralType
        && (member.type as ts.LiteralTypeNode).literal.kind === ts.SyntaxKind.NullKeyword
      if (isNull) found.push(`${statement.name.text}.${member.name.getText(source)}`)
    }
  }
  return found.sort()
}

function declaredTypeNames(): Set<string> {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as Array<{name: string}>
  const names = new Set(schema.map((t) => t.name))
  // Object types declared inline (a nav item inside an array) carry their name
  // only as a `_type` string literal inside another type's attributes.
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(walk)
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    const typeAttr = (record.attributes as Record<string, {value?: {type?: string; value?: unknown}}> | undefined)?._type
    if (typeAttr?.value?.type === 'string' && typeof typeAttr.value.value === 'string') names.add(typeAttr.value.value)
    Object.values(record).forEach(walk)
  }
  walk(schema)
  return names
}

function typeLiteralsInQueries(): string[] {
  const literals = new Set<string>()
  for (const value of Object.values(queries)) {
    if (typeof value !== 'string') continue
    const groq = value.replace(/\/\/[^\n]*/g, '')
    for (const m of groq.matchAll(/_type\s*==\s*"([\w.-]+)"/g)) literals.add(m[1])
    for (const group of groq.matchAll(/_type\s+in\s+\[([^\]]*)\]/g)) {
      for (const m of group[1].matchAll(/"([\w.-]+)"/g)) literals.add(m[1])
    }
  }
  return [...literals].sort()
}

describe('no query names a field or a type the schema no longer declares', () => {
  it('no top-level key of a query result is typed only null, beyond the named findings', () => {
    const unexpected = topLevelNullKeys().filter((k) => !KNOWN_NULL_KEYS.has(k))
    expect(unexpected, 'a query projects a field its document type does not declare (a deleted or misspelt field)').toEqual([])
  })

  it('every _type literal a query compares against is a declared type, beyond the named findings', () => {
    const declared = declaredTypeNames()
    const unexpected = typeLiteralsInQueries().filter((t) => !declared.has(t) && !BUILT_IN_TYPES.has(t) && !KNOWN_UNDECLARED_TYPES.has(t))
    expect(unexpected, 'a query branches on a type the schema does not declare (a deleted or misspelt type)').toEqual([])
  })

  it('each named finding is still real, so the lists cannot go stale', () => {
    const nullKeys = new Set(topLevelNullKeys())
    for (const key of KNOWN_NULL_KEYS) expect(nullKeys.has(key), key).toBe(true)
    const declared = declaredTypeNames()
    const literals = new Set(typeLiteralsInQueries())
    for (const type of KNOWN_UNDECLARED_TYPES) {
      expect(literals.has(type), `${type} is no longer queried`).toBe(true)
      expect(declared.has(type), `${type} is now declared`).toBe(false)
    }
  })

  it('the scans read something', () => {
    expect(typeLiteralsInQueries().length).toBeGreaterThan(20)
    expect(declaredTypeNames().size).toBeGreaterThan(100)
  })
})
