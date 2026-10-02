'use client'

import {useState, type ReactNode} from 'react'

// A row that moves by itself, held to the text marquee's contract (`MarqueeRibbon.tsx`).
//
// WCAG 2.2.2 (Pause, Stop, Hide, level A): moving content that starts by itself, lasts
// more than five seconds and sits beside other content needs a way to pause it on the
// page, and stopping only while hovered or focused is not one (W3C, Understanding SC
// 2.2.2). So: a visible toggle just above the track (`aria-pressed`, a constant label); the
// track also pauses while the band is hovered or holds focus; under reduced motion
// nothing moves and the caller hides its copies, and the button is hidden with it.
// A 60-second lap, as the text marquee's (`[R-576]`): slow enough to read each item
// (monorepo `[R-617]`, Justin: "classy and not very fast").
//
// The caller renders every item four times, the copies after the first set marked
// `aria-hidden` and `motion-reduce:hidden`, so the loop is seamless (the keyframe
// moves -50%) and assistive tech reads the set once.

export function PausableMarquee({label, children}: {label: string; children: ReactNode}) {
  const [paused, setPaused] = useState(false)

  return (
    // The strip stays edge to edge (the section frame's golden: no container for it); the
    // control sits in the page's container just above it, at the end of the line.
    <div className="group">
      <div className="container mb-4 flex justify-end px-[5%] motion-reduce:hidden">
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          className="shrink-0 rounded-btn border border-current px-3 py-1 text-sm font-semibold text-foreground"
        >
          Pause
        </button>
      </div>
      <div className="w-full overflow-hidden" aria-label={label}>
        <div
          data-testid="marquee-track"
          className={[
            'flex w-max items-center gap-16 animate-[marquee-top_60s_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:justify-center',
            paused ? '[animation-play-state:paused]' : null,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
