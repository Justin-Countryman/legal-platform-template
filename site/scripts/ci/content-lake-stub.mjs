#!/usr/bin/env node
// content-lake-stub — a local stand-in for Sanity's Content Lake so `next build`
// can run in CI with no project, no dataset and no network.
//
// WHY THIS EXISTS. `next build` collects page data by calling `client.fetch`
// from `generateStaticParams`, both layouts, `sitemap.ts` and `robots.ts`
// (monorepo OUTSTANDING item 255). The template ships a sentinel project id by
// design, so every one of those calls fails against the real API and the build
// dies before it has proven anything. A project id alone does not fix that: the
// calls are live. What fixes it is answering them locally.
//
// WHAT IT IS. An HTTP server that speaks the query half of the Content Lake API
// (`/v<ver>/data/query/<dataset>`, GET with `?query=&$param=` or POST with a
// JSON body) and evaluates each query with `groq-js`, Sanity's own GROQ
// evaluator, over an in-memory dataset. A canned-answer stub was tried first and
// guessed wrong about an object-literal query's shape; a real evaluator answers
// every query exactly as the Content Lake would, new queries included.
//
// WHAT IT IS NOT. Not a dataset. `MOCK_DATASET_NDJSON` is `fixture.ndjson` in
// CI: six slug-only documents so every `generateStaticParams` template renders
// once on null content, plus (2026-09-14, Phase 10) a homepage whose canvas
// holds one inline section member and the practice area it lists, so the
// build renders the homepage list's new path at least once. Nothing here is ever imported into a client's dataset.
//
// The site reaches it through `SANITY_API_HOST_OVERRIDE` (see
// `lib/sanity/client.ts` and `lib/searchVisibility.ts`), a non-public env var
// that no Vercel build sets.
//
// Exit: SIGTERM prints the query count and exits 0. `STUB_COUNT_FILE`, when set,
// receives the count on every request so the build script can assert the data
// path was exercised without parsing logs.
import http from 'node:http'
import fs from 'node:fs'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'

const require = createRequire(import.meta.url)
const {parse, evaluate} = require('groq-js')

const port = Number(process.env.PORT || 4010)
const datasetPath = process.env.MOCK_DATASET_NDJSON
const dataset = datasetPath
  ? fs
      .readFileSync(datasetPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  : []
const countFile = process.env.STUB_COUNT_FILE
// STUB_LOG_FILE, when set, receives one line per query: the method, the
// first 160 characters of the GROQ, and the params. Measurement only.
const logFile = process.env.STUB_LOG_FILE
let count = 0

export async function answer(query, params) {
  const value = await evaluate(parse(query), {dataset, params})
  return value.get()
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://stub')
  let body = ''
  req.on('data', (chunk) => (body += chunk))
  req.on('end', async () => {
    let query = url.searchParams.get('query') || ''
    const params = {}
    for (const [key, raw] of url.searchParams) {
      if (key.startsWith('$')) params[key.slice(1)] = JSON.parse(raw)
    }
    if (body) {
      try {
        const parsed = JSON.parse(body)
        if (typeof parsed.query === 'string') query = parsed.query
        Object.assign(params, parsed.params || {})
      } catch {
        // A body that is not JSON is not a query; fall through to the 400 below.
      }
    }
    count += 1
    if (countFile) fs.writeFileSync(countFile, String(count))
    if (logFile) fs.appendFileSync(logFile, `${req.method} ${query.replace(/\s+/g, ' ').slice(0, 160)} ${JSON.stringify(params)}\n`)
    res.setHeader('content-type', 'application/json')
    if (!query) {
      res.statusCode = 400
      res.end(JSON.stringify({error: {description: 'no query'}}))
      return
    }
    try {
      const result = await answer(query, params)
      res.end(JSON.stringify({ms: 1, query, result}))
    } catch (error) {
      console.error(`GROQ ERROR: ${error.message}\n  ${query.slice(0, 200)}`)
      res.statusCode = 400
      res.end(JSON.stringify({error: {description: error.message, type: 'queryParseError'}}))
    }
  })
})

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(port, '127.0.0.1', () => {
    console.log(`content-lake-stub listening on 127.0.0.1:${port} with ${dataset.length} document(s)`)
  })
  process.on('SIGTERM', () => {
    console.log(`content-lake-stub served ${count} quer${count === 1 ? 'y' : 'ies'}`)
    process.exit(0)
  })
}
