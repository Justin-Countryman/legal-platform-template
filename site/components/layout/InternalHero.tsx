'use client'

import Image from 'next/image'
import {resolveTokenString, type NapTokens} from '@/lib/tokens'
import {useHeroScheme} from '@/lib/heroSchemeContext'
import {ButtonGroup, toCtaItems} from '@/components/ui/ButtonGroup'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CtaButtonData = {
  title: string
  url?: string | null
  variant?: 'primary' | 'secondary' | 'link' | null
}

export type InternalHeroData = {
  heading: string
  description?: string | null
  buttons?: CtaButtonData[] | null
  backgroundImage?: {
    src: string
    alt: string
    width: number
    height: number
  } | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InternalHero({data, napTokens}: {data: InternalHeroData; napTokens?: NapTokens | null}) {
  const globalScheme = useHeroScheme()
  const resolved = napTokens
    ? {
        ...data,
        heading: resolveTokenString(data.heading, napTokens) || data.heading,
        description: resolveTokenString(data.description, napTokens) || data.description,
        buttons: data.buttons?.map((btn) => ({
          ...btn,
          title: resolveTokenString(btn.title, napTokens) || btn.title,
        })),
      }
    : data
  const {heading, description, buttons, backgroundImage} = resolved
  const hasImage = !!backgroundImage?.src
  // Image always overrides; otherwise use the global Design Setting
  const isDark = hasImage || globalScheme === 'dark'
  const hasButtons = buttons && buttons.length > 0

  return (
    <section
      style={{paddingTop: 'calc(var(--header-height, 8rem) + var(--hero-pt, 4rem))'}}
      data-ring-context={isDark ? 'dark' : undefined}
      data-hero-image={hasImage ? 'true' : undefined}
      className={[
        'relative px-[5%] pb-12 md:pb-16 lg:pb-20',
        '[--hero-pt:2rem] md:[--hero-pt:3rem] lg:[--hero-pt:4rem]',
        !hasImage && (isDark ? 'bg-brand-dark' : 'bg-background'),
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Content — z-10 sits above image layer */}
      <div className="container relative z-10">
        <div className="w-full max-w-2xl">

          <h1 className="mb-5 text-page-h1 font-bold md:mb-6 text-foreground">
            {heading}
          </h1>

          {description && (
            <p className="md:text-md text-foreground">
              {description}
            </p>
          )}

          {hasButtons && (
            <ButtonGroup
              items={toCtaItems(buttons)}
              context={isDark ? 'dark' : 'light'}
              className="mt-6 md:mt-8"
            />
          )}

        </div>
      </div>

      {/* Background image + overlay — z-0 sits below content */}
      {hasImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src={backgroundImage.src}
            alt={backgroundImage.alt ?? ''}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-brand-dark/80" />
        </div>
      )}
    </section>
  )
}
