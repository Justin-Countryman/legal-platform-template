import {describe, expect, it} from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// THE REFRESH TIMER (monorepo `[R-660]`, 2026-10-09): every page route revalidates once a day; the webhook
// (`app/api/revalidate`) is the fast path and the day is the backstop. The two events routes keep the hour, because
// each splits upcoming from past when it renders and a day's cache would show a finished event as upcoming. The OG
// image keeps the hour, keyed by its title. Next reads `revalidate` only as a literal, so the pin is on the source.

const APP = path.resolve(__dirname, '..')
const HOURLY = new Set(['(site)/events/page.tsx', '(site)/events/[slug]/page.tsx', 'api/og/route.tsx'])

function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return e.name === '__tests__' ? [] : routeFiles(full)
    return /^(page|route)\.tsx?$/.test(e.name) ? [full] : []
  })
}

const declared = routeFiles(APP)
  .map((f) => ({file: path.relative(APP, f).split(path.sep).join('/'), m: fs.readFileSync(f, 'utf8').match(/^export const revalidate = (\d+)$/m)}))
  .filter((r) => r.m)
  .map((r) => ({file: r.file, seconds: Number(r.m![1])}))

describe('the refresh timer', () => {
  it('finds the routes that declare one', () => {
    expect(declared.length).toBeGreaterThanOrEqual(17)
    expect(declared.map((r) => r.file)).toContain('(site)/[...slug]/page.tsx')
  })

  it('is a day on every page route but the events routes, and an hour there and on the OG image', () => {
    for (const {file, seconds} of declared) expect([file, seconds]).toEqual([file, HOURLY.has(file) ? 3600 : 86400])
    for (const file of HOURLY) expect(declared.map((r) => r.file)).toContain(file)
  })
})
