// The play mark a video poster draws over its photograph (monorepo WS-PREMIUM-PACKAGE-DESIGN §11, `[R-652]`): the dark
// ground's triangle on a disc of the page ground at 90%, over a veil of the dark ground (10% at rest, 25% hovered or
// focused). It holds 3:1 over every pixel a poster can show, tinted or not (`photoTreatment.test.tsx` sweeps it on every
// preset and 500 seeded palettes). The focus mark sits on this layer, above the photograph (a ring under it would be
// covered), with a transparent outline that forced colors paint. Put it inside the poster's `group` link or button, which
// drops its own outline. The Split hero's video draws the same mark (monorepo backlog 461: its white triangle on a 30%
// dark disc measured 1.7 to 2.0:1 over a light poster).

function PlayIcon({className}: {className?: string}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

export function PlayMark() {
  return (
    <span className="pointer-events-none absolute inset-0 z-[1] grid place-items-center rounded-ui bg-brand-dark/10 transition-colors duration-ui-base group-hover:bg-brand-dark/25 group-focus-visible:bg-brand-dark/25 group-focus-visible:ring-2 group-focus-visible:ring-inset group-focus-visible:ring-focus group-focus-visible:outline-2 group-focus-visible:-outline-offset-2 group-focus-visible:outline-transparent">
      <span className="grid size-16 place-items-center rounded-full bg-background/90 shadow-elevation-md transition-transform duration-ui-base group-hover:scale-110 group-focus-visible:scale-110">
        <PlayIcon className="size-7 translate-x-0.5 text-brand-dark" />
      </span>
    </span>
  )
}
