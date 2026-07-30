// Staff Layout — Feature Grid (Mosaic)
// Feature row: photo left + name / biography right.
// Clean light background, no credentials grid.

import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage} from '@/lib/sanity/image'
import {MdEmail} from 'react-icons/md'
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

export function FeatureGridLayout({member, napTokens, cta = {label: 'Contact Us', href: '/contact/'}}: Props) {
  const name = buildStaffName(member)

  return (
    <>
      {/* ── Feature row ───────────────────────────────────────────────────── */}
      <section className="px-[5%] py-12 md:py-16" aria-label="Staff profile">
        <div className="container grid grid-cols-1 items-start gap-10 lg:grid-cols-[5fr_7fr] lg:gap-16">

          {/* Photo */}
          <div>
            {hasImage(member.photo) && (
              <div className="flex items-start justify-center bg-muted p-6">
                <SanityImage
                  image={member.photo}
                  mode="natural"
                  alt={member.photo.alt || name}
                  width={400}
                  height={500}
                  className="w-full max-w-[320px] object-contain"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  priority
                />
              </div>
            )}

            {/* Office address */}
            {member.location?.city && (
              <address className="mt-5 not-italic text-sm leading-relaxed text-foreground-muted">
                {formatStaffAddress(member.location)}
              </address>
            )}
          </div>

          {/* Name, bio */}
          <div>
            {member.jobTitle && (
              <Tagline as="p" mb="mb-2">
                {member.jobTitle}
              </Tagline>
            )}

            <h1
              id="staff-h1"
              className="font-heading text-3xl font-bold text-foreground md:text-4xl lg:text-5xl"
            >
              {name}
            </h1>

            {/* Contact CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button href={cta.href}>{cta.label}</Button>
              {member.email && (
                <Button variant="secondary" context="light" href={`mailto:${member.email}`}>
                  <MdEmail className="size-4 shrink-0" aria-hidden="true" />
                  Email me
                </Button>
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

            {/* Divider */}
            <hr className="my-7 border-border" />

            {/* Biography */}
            {member.biography && member.biography.length > 0 && (
              <>
                <h2 className="mb-4 font-heading text-xl font-bold text-foreground md:text-2xl">
                  Biography
                </h2>
                <PortableTextRenderer value={member.biography} napTokens={napTokens} />
              </>
            )}
          </div>

        </div>
      </section>
    </>
  )
}
