// The stub Content Lake is a gate's dependency, so it is tested as an artifact:
// a real server on a free port, driven the way `@sanity/client` drives the real
// API (GET with `?query=` and `$param=`; POST with a JSON body), over a
// two-document dataset. Monorepo OUTSTANDING item 255.
import {spawn, type ChildProcess} from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import {afterAll, beforeAll, describe, expect, it} from 'vitest'

const STUB = path.resolve(__dirname, '../content-lake-stub.mjs')

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (typeof address === 'object' && address) {
        const {port} = address
        server.close(() => resolve(port))
      } else {
        reject(new Error('no port'))
      }
    })
  })
}

let child: ChildProcess
let base: string
let tmp: string

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'content-lake-stub-'))
  const dataset = path.join(tmp, 'dataset.ndjson')
  fs.writeFileSync(
    dataset,
    [
      JSON.stringify({_id: 'a', _type: 'attorneyPage', slug: {current: 'attorneys/a'}, firstName: 'Ada'}),
      JSON.stringify({_id: 'settings', _type: 'siteSettings', firmName: 'Example Law'}),
    ].join('\n') + '\n',
  )
  const port = await freePort()
  base = `http://127.0.0.1:${port}/v2024-01-01/data/query/production`
  child = spawn(process.execPath, [STUB], {
    env: {...process.env, PORT: String(port), MOCK_DATASET_NDJSON: dataset},
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await new Promise<void>((resolve, reject) => {
    child.stdout?.on('data', (chunk) => {
      if (String(chunk).includes('listening')) resolve()
    })
    child.on('exit', (code) => reject(new Error(`stub exited early with ${code}`)))
  })
})

afterAll(() => {
  child?.kill('SIGTERM')
  fs.rmSync(tmp, {recursive: true, force: true})
})

async function get(query: string, params: Record<string, unknown> = {}) {
  const url = new URL(base)
  url.searchParams.set('query', query)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(`$${key}`, JSON.stringify(value))
  const res = await fetch(url)
  return {status: res.status, body: (await res.json()) as {result?: unknown; error?: unknown}}
}

describe('content-lake-stub answers GROQ the way the Content Lake does', () => {
  it('a single-document query returns the document', async () => {
    const {status, body} = await get('*[_type == "siteSettings"][0]{firmName}')
    expect(status).toBe(200)
    expect(body.result).toEqual({firmName: 'Example Law'})
  })

  it('a missing single document is null, not undefined and not an empty array', async () => {
    const {body} = await get('*[_type == "designSettings"][0]')
    expect(body.result).toBeNull()
  })

  it('a collection query returns an array, empty when nothing matches', async () => {
    expect((await get('*[_type == "attorneyPage"].slug.current')).body.result).toEqual(['attorneys/a'])
    expect((await get('*[_type == "staffPage"]')).body.result).toEqual([])
  })

  it('an object-literal query returns an object with null members, never null', async () => {
    const {body} = await get('{"firmName": *[_type == "siteSettings"][0].firmName, "logo": *[_type == "designSettings"][0].logo}')
    expect(body.result).toEqual({firmName: 'Example Law', logo: null})
  })

  it('binds $params from the query string', async () => {
    const {body} = await get('*[_type == "attorneyPage" && slug.current == $slug][0].firstName', {slug: 'attorneys/a'})
    expect(body.result).toBe('Ada')
  })

  it('accepts a POST body the way the client sends long queries', async () => {
    const res = await fetch(base, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({query: 'count(*[_type == $t])', params: {t: 'attorneyPage'}}),
    })
    expect(res.status).toBe(200)
    expect(((await res.json()) as {result: number}).result).toBe(1)
  })

  it('a query it cannot evaluate is a 400 with the reason, not a silent null', async () => {
    const {status, body} = await get('*[_type == ')
    expect(status).toBe(400)
    expect(body.error).toBeTruthy()
  })
})
