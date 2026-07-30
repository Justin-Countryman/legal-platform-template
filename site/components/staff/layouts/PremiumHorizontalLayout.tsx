// Staff Layout — Premium Horizontal (Horizon)
// Full-bleed editorial split: tall photo fills the left half of the viewport,
// right half shows the staff name at display scale with contact actions.
// Biography uses a vertical label + prose layout below.

import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage} from '@/lib/sanity/image'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
import {INDEX_PAGE_PRESETS} from '@/lib/pageLabel'
import {Button} from '@/components/ui/Button'
import {Chip} from '@/components/ui/Chip'
import {Tagline} from '@/components/ui/Tagline'
import {PortableTextRenderer} from '@/components/ui/PortableText'
import {buildStaffName, formatStaffAddress, type StaffMember} from '@/components/staff/types'
import type {NapTokens} from '@/lib/tokens'

type Props = {
  member: StaffMember
  napTokens?: NapTokens | null
  cta?: {label: string; href: string}
}

export function PremiumHorizontalLayout({member, napTokens, cta = {label: 'Contact Us', href: '/contact/'}}: Props) {
  const name = buildStaffName(member)

  return (
    <>
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[
            {label: 'Home', href: '/'},
            {label: INDEX_PAGE_PRESETS.staffIndex, href: '/staff/'},
            {label: name, href: '#'},
          ]} />
        </div>
      </div>

      {/* ── Editorial hero ─────────────────────────────────────────────────── */}
      <section
        className="grid grid-cols-1 lg:grid-cols-[45%_1fr]"
        aria-labelledby="staff-h1"
      >
        {/* Photo */}
        <div className="order-last flex items-start justify-center bg-muted p-8 lg:order-first">
          {hasImage(member.photo) ? (
            <SanityImage
              image={member.photo}
              mode="natural"
              alt={member.photo.alt || name}
              width={400}
              height={500}
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="w-full max-w-[360px] object-contain"
              priority
            />
          ) : (
            <div className="flex h-64 w-full max-w-[360px] items-center justify-center bg-muted">
              <span className="font-heading text-7xl font-bold text-foreground-muted select-none">
                {member.firstName?.charAt(0) ?? ''}{member.lastName?.charAt(0) ?? ''}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col justify-center bg-background px-8 py-14 lg:px-14 xl:px-20">

          <Tagline as="p" mb="mb-4">
            {member.jobTitle ?? 'Staff Member'}
          </Tagline>

          <h1
            id="staff-h1"
            className="font-heading text-3xl font-bold leading-none text-foreground md:text-5xl lg:text-6xl xl:text-7xl"
          >
            {name}
          </h1>

          {/* Decorative rule */}
          <div className="my-8 h-px w-16 bg-brand-dark" aria-hidden="true" />

          {/* Contact actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button href={cta.href}>{cta.label}</Button>
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                className="rounded-ui transition-colors duration-ui-fast hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              >
                <Chip icon="mail" className="cursor-pointer">Email me</Chip>
              </a>
            )}
            {(member.phone || member.location?.officePhone) && (
              <a
                href={`tel:${(member.phone ?? member.location?.officePhone ?? '').replace(/\D/g, '')}`}
                className="rounded-ui transition-colors duration-ui-fast hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              >
                <Chip icon="phone" className="cursor-pointer">
                  {member.phone ?? member.location?.officePhone}
                </Chip>
              </a>
            )}
          </div>

          {/* Address */}
          {member.location?.city && (
            <address className="mt-5 not-italic text-sm text-foreground-muted">
              {formatStaffAddress(member.location)}
            </address>
          )}

        </div>
      </section>

      {/* ── Biography ─────────────────────────────────────────────────────── */}
      {member.biography && member.biography.length > 0 && (
        <section className="px-[5%] py-16 md:py-20" aria-label="Biography">
          <div className="container grid grid-cols-1 gap-8 lg:grid-cols-[200px_1fr] lg:gap-16 xl:grid-cols-[240px_1fr]">

            {/* Vertical label + decorative line */}
            <div className="flex items-start">
              <div className="flex items-center gap-4 lg:flex-col lg:gap-3">
                <div className="h-px w-10 bg-border lg:h-14 lg:w-px" aria-hidden="true" />
                <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.25em] text-foreground-muted lg:[writing-mode:vertical-rl] lg:rotate-180">
                  Biography
                </h2>
              </div>
            </div>

            {/* Prose */}
            <div>
              <PortableTextRenderer value={member.biography} napTokens={napTokens} />
            </div>

          </div>
        </section>
      )}
    </>
  )
}
