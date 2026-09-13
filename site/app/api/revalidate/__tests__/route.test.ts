// @vitest-environment node
/**
 * The Sanity revalidation webhook (Phase 8, §2.3 / §7.7-9).
 *
 * Every authenticated event invalidates the ROOT LAYOUT. There is no per-path
 * branch, so the 2026-08-13 false success (`revalidatePath('/home/')` for the
 * homepage, a route that does not exist, answered 200) has no code left to
 * recur in; these tests pin that the response carries no `path` and that the
 * one cache call is `revalidatePath('/', 'layout')` whatever the payload says.
 *
 * Authentication is two checks against the same `SANITY_REVALIDATE_SECRET`: the
 * shared-secret header, then the body's HMAC (`sanity-webhook-signature`) via
 * `parseBody` from `next-sanity/webhook`. Valid signatures below are produced
 * by `@sanity/webhook`'s own `encodeSignatureHeader` and cross-checked against
 * its `isValidSignature`, so the fixture cannot drift from the library.
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {encodeSignatureHeader, isValidSignature, SIGNATURE_HEADER_NAME} from '@sanity/webhook'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

import {revalidatePath, revalidateTag} from 'next/cache'
import {POST} from '../route'

const SECRET = 'test-secret'
const URL = 'http://x/api/revalidate'
// Any unix-ms timestamp after 2021-01-01 is accepted by the library; it does
// not enforce a tolerance window, so a fixed value keeps the fixture stable.
const TIMESTAMP = 1_757_721_600_000 // 2025-09-13T00:00:00Z

async function signed(body: string, secret = SECRET): Promise<string> {
  const header = await encodeSignatureHeader(body, TIMESTAMP, secret)
  // The cross-check: whatever `encodeSignatureHeader` produced must be what
  // `isValidSignature` accepts for the same body and secret.
  expect(await isValidSignature(body, header, secret)).toBe(true)
  return header
}

function post(body: string, headers: Record<string, string>): Promise<Response> {
  return POST(new Request(URL, {method: 'POST', headers, body}))
}

async function postSigned(body: string): Promise<Response> {
  return post(body, {
    'x-sanity-revalidate-secret': SECRET,
    [SIGNATURE_HEADER_NAME]: await signed(body),
  })
}

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    vi.stubEnv('SANITY_REVALIDATE_SECRET', SECRET)
    vi.mocked(revalidatePath).mockClear()
    vi.mocked(revalidateTag).mockClear()
    // `parseBody` logs "Missing signature header" on the no-header path; keep
    // the run quiet without hiding anything the assertions do not cover.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('a slugged payload invalidates the layout, once, and names no path', async () => {
    const res = await postSigned(JSON.stringify({_type: 'homePage', slug: 'home'}))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({revalidated: true, scope: 'layout', _type: 'homePage'})
    expect(json).not.toHaveProperty('path')
    expect(revalidatePath).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('a slugless payload (settings singletons) does exactly the same', async () => {
    const res = await postSigned(JSON.stringify({_type: 'siteSettings'}))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({revalidated: true, scope: 'layout', _type: 'siteSettings'})
    expect(json).not.toHaveProperty('path')
    expect(revalidatePath).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('a payload with no _type still invalidates the layout and reports _type: null', async () => {
    const res = await postSigned('{}')

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({revalidated: true, scope: 'layout', _type: null})
    expect(revalidatePath).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('an empty body cannot carry a valid signature, so it is 401 and nothing is revalidated', async () => {
    // Documented library behaviour: `@sanity/webhook` refuses to sign an empty
    // payload ("Can not create signature for empty payload"), and its verifier
    // maps that refusal to `false`. Sanity itself never delivers an empty body.
    // So the handler cannot accept one; pin the 401 rather than a 200.
    await expect(encodeSignatureHeader('', TIMESTAMP, SECRET)).rejects.toThrow(/empty payload/)

    const res = await post('', {
      'x-sanity-revalidate-secret': SECRET,
      [SIGNATURE_HEADER_NAME]: await signed('{}'),
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({revalidated: false, reason: 'Bad signature'})
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('a wrong shared-secret header is 401 before the body is read', async () => {
    const body = JSON.stringify({_type: 'homePage'})
    const res = await post(body, {
      'x-sanity-revalidate-secret': 'not-the-secret',
      [SIGNATURE_HEADER_NAME]: await signed(body),
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({revalidated: false, reason: 'Unauthorized'})
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('a right header with a wrong signature is 401 Bad signature', async () => {
    const body = JSON.stringify({_type: 'homePage'})
    const res = await post(body, {
      'x-sanity-revalidate-secret': SECRET,
      [SIGNATURE_HEADER_NAME]: await signed(body, 'a-different-secret'),
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({revalidated: false, reason: 'Bad signature'})
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('a right header with a signature over a different body is 401 Bad signature', async () => {
    const res = await post(JSON.stringify({_type: 'attorney'}), {
      'x-sanity-revalidate-secret': SECRET,
      [SIGNATURE_HEADER_NAME]: await signed(JSON.stringify({_type: 'homePage'})),
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({revalidated: false, reason: 'Bad signature'})
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('a right header with no signature header at all is 401 Bad signature', async () => {
    const res = await post(JSON.stringify({_type: 'homePage'}), {
      'x-sanity-revalidate-secret': SECRET,
    })

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({revalidated: false, reason: 'Bad signature'})
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('an unset SANITY_REVALIDATE_SECRET is 500 and nothing is revalidated', async () => {
    vi.stubEnv('SANITY_REVALIDATE_SECRET', '')
    const body = JSON.stringify({_type: 'homePage'})
    const res = await post(body, {
      'x-sanity-revalidate-secret': SECRET,
      [SIGNATURE_HEADER_NAME]: await signed(body),
    })

    expect(res.status).toBe(500)
    expect(await res.json()).toMatchObject({revalidated: false})
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('never calls revalidateTag (no fetch carries a tag; the old call was a no-op)', async () => {
    await postSigned(JSON.stringify({_type: 'homePage', slug: 'home'}))
    await postSigned(JSON.stringify({_type: 'siteSettings'}))
    await post('', {'x-sanity-revalidate-secret': SECRET})

    expect(revalidateTag).not.toHaveBeenCalled()
  })
})
