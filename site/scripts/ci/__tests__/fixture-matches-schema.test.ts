// The CI fixture is six slug-only documents, one per `generateStaticParams`
// template, so the build renders each of those templates once on null content
// (monorepo OUTSTANDING item 255). It cannot be allowed to rot: a `_type` the
// schema no longer has, or a field a type does not declare, would make the
// build render a document the Studio could never produce. Checked against
// `studio/schema.json`, the extracted schema the typegen job keeps fresh.
import fs from 'node:fs'
import path from 'node:path'
import {describe, expect, it} from 'vitest'

const FIXTURE = path.resolve(__dirname, '../fixture.ndjson')
const SCHEMA = path.resolve(__dirname, '../../../../studio/schema.json')

type SchemaType = {name: string; type: string; attributes?: Record<string, unknown>}

const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8')) as SchemaType[]
const byName = new Map(schema.map((t) => [t.name, t]))
const docs = fs
  .readFileSync(FIXTURE, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line) as Record<string, unknown> & {_id: string; _type: string})

// The templates the fixture exists to render. `[...slug]` has no
// generateStaticParams and is deliberately not here.
const TEMPLATES = ['attorneyPage', 'staffPage', 'blogPost', 'blogCategory', 'eventPage', 'reviewPage']

describe('scripts/ci/fixture.ndjson agrees with studio/schema.json', () => {
  it('carries exactly one document per generateStaticParams template', () => {
    expect(docs.map((d) => d._type).sort()).toEqual([...TEMPLATES].sort())
  })

  it('every _type is a document type the schema declares', () => {
    for (const doc of docs) {
      const type = byName.get(doc._type)
      expect(type, `${doc._id}: _type ${doc._type} is not in schema.json`).toBeDefined()
      expect(type?.type).toBe('document')
    }
  })

  it('every field on a document is one its type declares, and the slug has a current', () => {
    for (const doc of docs) {
      const attributes = byName.get(doc._type)?.attributes ?? {}
      for (const field of Object.keys(doc)) {
        expect(field in attributes, `${doc._id}: field ${field} is not declared on ${doc._type}`).toBe(true)
      }
      expect(typeof (doc.slug as {current?: unknown} | undefined)?.current).toBe('string')
    }
  })

  it('every _id is unique and carries no client identity', () => {
    const ids = docs.map((d) => d._id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id.startsWith('fx-')).toBe(true)
  })
})
