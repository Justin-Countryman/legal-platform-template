import type {ColorInputs} from '../designTokens'

// Palette generators shared by the color guarantee and the texture pixel cases (Phase 17C session 3).

/** Near-black grounds with saturated accents, where a lighter texture ink appears (ADV-17C3-PRB found
 *  the light-tier hole and WebKit's rounding there, not in the uniform sweeps). */
export function nearBlack(n: number, seed: number): ColorInputs[] {
  let s = seed >>> 0
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const ch = (lo: number, hi: number) => Math.floor(lo + rnd() * (hi - lo)).toString(16).padStart(2, '0')
  return Array.from({length: n}, () => ({
    darkGround: '#' + ch(0, 40) + ch(0, 40) + ch(0, 40),
    lightGround: '#' + ch(200, 256) + ch(200, 256) + ch(200, 256),
    accent: '#' + [ch(0, 256), ch(0, 256), ch(0, 256)].sort(() => rnd() - 0.5).join(''),
    action: rnd() < 0.5 ? '#' + ch(0, 256) + ch(0, 256) + ch(0, 256) : null,
  }))
}

