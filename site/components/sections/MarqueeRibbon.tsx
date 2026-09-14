'use client'

import {useState, type ReactNode} from 'react'

// ─── Marquee ribbon ───────────────────────────────────────────────────────────
//
// The content section's ribbon with `marquee` on: one line scrolling across the
// band (Phase 11, 2026-09-14; monorepo WS-V1-PHASE11-DESIGN §7 amendment 8).
//
// WCAG 2.2.2 (Pause, Stop, Hide, level A): moving content that starts by itself,
// lasts more than five seconds and sits beside other content needs a way to
// pause it on the page. `prefers-reduced-motion` alone does not meet it, since
// only some visitors set it. So:
//   - a visible toggle button before the track (`aria-pressed`, constant label);
//   - the track also pauses while the band is hovered or holds keyboard focus;
//   - under reduced motion there is no animation, the copies are hidden and the
//     one line wraps, and the button is hidden because nothing moves.
//
// The line is duplicated so the loop is seamless (the keyframe moves -50%);
// every copy after the first is `aria-hidden`, so assistive tech reads it once.

export function MarqueeRibbon({children}: {children: ReactNode}) {
  const [paused, setPaused] = useState(false)

  return (
    <div className="group flex items-center gap-4">
      <button
        type="button"
        aria-pressed={paused}
        onClick={() => setPaused((p) => !p)}
        className="shrink-0 rounded-btn border border-current px-3 py-1 text-sm font-semibold text-foreground motion-reduce:hidden"
      >
        Pause
      </button>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          data-testid="marquee-track"
          className={[
            'flex w-max gap-16 animate-[marquee-top_40s_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:animate-none',
            paused ? '[animation-play-state:paused]' : null,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {[0, 1, 2, 3].map((i) => (
            <p
              key={i}
              aria-hidden={i > 0 ? true : undefined}
              className={
                i === 0
                  ? 'whitespace-nowrap text-lg font-semibold text-foreground motion-reduce:whitespace-normal'
                  : 'whitespace-nowrap text-lg font-semibold text-foreground motion-reduce:hidden'
              }
            >
              {children}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
