'use client'

// Fallback header band rendered when an internal page has no hero data set.
// Guarantees an h1 in the SSR HTML across routes that previously rendered
// <InternalHero> conditionally. Surface honors designSettings.internalHeroBackground
// via useHeroScheme() — `dark` → bg-brand-dark + data-ring-context="dark"
// (cascade flips foreground / accent / border / hover-wash), `light` →
// bg-background (true light surface). Mirrors InternalHero's top padding so
// spacing under the sticky header stays consistent whether or not a hero is
// configured.
//
// h1 styling uses the `marketing-h1` @utility — clamps from a locked mobile
// floor up to the design-settings-driven `--marketing-h1` ceiling, so the band
// scales gracefully across viewports and clients without per-route tuning.

import {useHeroScheme} from '@/lib/heroSchemeContext'

type Props = {title: string}

export function InternalPageHeader({title}: Props) {
  const scheme = useHeroScheme()
  const isDark = scheme === 'dark'

  return (
    <header
      style={{paddingTop: 'calc(var(--header-height, 8rem) + var(--hero-pt, 4rem))'}}
      data-ring-context={isDark ? 'dark' : undefined}
      className={[
        'relative px-[5%] pb-12 md:pb-16 lg:pb-20',
        '[--hero-pt:2rem] md:[--hero-pt:3rem] lg:[--hero-pt:4rem]',
        isDark ? 'bg-brand-dark' : 'bg-background',
      ].join(' ')}
    >
      <div className="container relative z-10">
        <div className="w-full max-w-2xl">
          <h1 className="marketing-h1 font-bold text-foreground">
            {title}
          </h1>
        </div>
      </div>
    </header>
  )
}
