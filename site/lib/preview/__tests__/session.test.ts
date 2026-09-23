import {describe, it, expect} from 'vitest'
import {
  PREVIEW_TOKEN_VECTOR, asGrant, readSession, signToken, verifyToken,
} from '../session'

// The preview's signed link and session (Phase 17A, monorepo
// WS-V1-PHASE17A-DESIGN §2.1). Everything that lets a browser see a preview goes
// through these four functions, so each refusal is pinned here.

const SECRET = 'test-secret'
const NOW = 1_800_000_000
const operator = {v: 1, role: 'operator', exp: NOW + 3600, apply: {origin: 'http://127.0.0.1:8787', slug: 'example-firm'}}
const client = {v: 1, role: 'client', exp: NOW + 3600, styleSet: 'graphite', palette: 'navy-brass', view: 'design'}

describe('signToken and verifyToken', () => {
  it('round-trips a payload', () => {
    expect(verifyToken(signToken(operator, SECRET), SECRET)).toEqual(operator)
  })

  it('signs nothing without a secret, and verifies nothing without one', () => {
    expect(signToken(operator, '')).toBeNull()
    expect(signToken(operator, undefined)).toBeNull()
    expect(verifyToken(signToken(operator, SECRET), '')).toBeNull()
  })

  it('refuses a token signed with another secret', () => {
    expect(verifyToken(signToken(operator, 'another'), SECRET)).toBeNull()
  })

  it('refuses a payload changed after signing: a role raised, a choice swapped', () => {
    const token = signToken(client, SECRET)!
    const [, macPart] = token.split('.')
    for (const changed of [{...client, role: 'operator'}, {...client, styleSet: 'marble'}, {...client, exp: NOW + 10 ** 6}]) {
      const forged = `${Buffer.from(JSON.stringify(changed)).toString('base64url')}.${macPart}`
      expect(verifyToken(forged, SECRET)).toBeNull()
    }
  })

  it('refuses malformed tokens', () => {
    for (const bad of ['', 'abc', 'a.b.c', '.x', 'x.', `${Buffer.from('not json').toString('base64url')}.x`]) {
      expect(verifyToken(bad, SECRET)).toBeNull()
    }
  })

  it('matches the shared vector the monorepo replays in Python', () => {
    expect(signToken(PREVIEW_TOKEN_VECTOR.payload, PREVIEW_TOKEN_VECTOR.secret)).toBe(
      'eyJ2IjoxLCJyb2xlIjoib3BlcmF0b3IiLCJleHAiOjE4OTM0NTYwMDAsImFwcGx5Ijp7Im9yaWdpbiI6Imh0dHA6Ly8xMjcuMC4wLjE6ODc4NyIsInNsdWciOiJleGFtcGxlLWZpcm0ifX0'
        + '.PPn4cQrlE0bRlbGOqxVq9YEjf6vuh5r_1UV9r0ckoZE',
    )
  })
})

describe('asGrant', () => {
  it('reads an operator grant and a client grant', () => {
    expect(asGrant(operator)).toEqual(operator)
    expect(asGrant(client)).toEqual(client)
  })

  it('refuses an Apply target on a client link', () => {
    expect(asGrant({...client, apply: operator.apply})).toBeNull()
  })

  it('refuses a client link that does not carry its choices', () => {
    expect(asGrant({v: 1, role: 'client', exp: NOW + 1})).toBeNull()
    expect(asGrant({...client, view: 'print'})).toBeNull()
  })

  it('carries the theme when a link names one, and a client link minted before the theme row (no flow) is still a grant', () => {
    // Phase 17B session 3: `flow` is optional, read as "as the site is" when absent, so a
    // 14-day client link minted at the old pin outlives the fourth segment.
    expect(asGrant({...client, flow: 'alternating.balanced'})).toEqual({...client, flow: 'alternating.balanced'})
    expect(asGrant(client)).toEqual(client)
    expect(asGrant(client)?.flow).toBeUndefined()
    expect(asGrant({...client, flow: 7})).toBeNull()
    expect(asGrant({...client, flow: ''})).toBeNull()
  })

  it('refuses an unknown role, version or a missing expiry', () => {
    expect(asGrant({...operator, role: 'admin'})).toBeNull()
    expect(asGrant({...operator, v: 2})).toBeNull()
    expect(asGrant({v: 1, role: 'operator'})).toBeNull()
    expect(asGrant(null)).toBeNull()
  })
})

describe('readSession', () => {
  it('is live for a valid cookie before its expiry', () => {
    expect(readSession(signToken(client, SECRET)!, SECRET, NOW)).toEqual({state: 'live', grant: client})
  })

  it('has ended after its expiry: the page says so and shows nothing of the site', () => {
    expect(readSession(signToken(client, SECRET)!, SECRET, NOW + 3600)).toEqual({state: 'ended'})
  })

  it('is none without a cookie, with a forged one, or without a secret', () => {
    expect(readSession(undefined, SECRET, NOW)).toEqual({state: 'none'})
    expect(readSession(signToken(client, 'another')!, SECRET, NOW)).toEqual({state: 'none'})
    expect(readSession(signToken(client, SECRET)!, '', NOW)).toEqual({state: 'none'})
  })
})
