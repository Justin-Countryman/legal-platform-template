// Staff Layout — Classic Sidebar (Pillar)
// Dark banner at top with name, title, and contact CTAs.
// Below: sticky sidebar (photo) beside a main bio column.

import {SanityImage} from '@/components/ui/SanityImage'
import {hasImage} from '@/lib/sanity/image'
import {MdEmail} from 'react-icons/md'
import {Breadcrumbs} from '@/components/ui/Breadcrumbs'
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
  isDark?: boolean
}

export function ClassicSidebarLayout({member, napTokens, cta = {label: 'Contact Us', href: '/contact/'}, isDark = true}: Props) {
  const name = buildStaffName(member)
  const buttonContext = isDark ? 'dark' : 'light'

  return (
    <>
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="bg-muted border-b border-border px-[5%] py-3">
        <div className="container">
          <Breadcrumbs items={[
            {label: 'Home', href: '/'},
            {label: 'Our Team', href: '/staff/'},
            {label: name, href: '#'},
          ]} />
        </div>
      </div>

      {/* ── Top banner ────────────────────────────────────────────────────── */}
      <div
        data-ring-context={isDark ? 'dark' : undefined}
        className={`${isDark ? 'bg-brand-dark' : 'bg-hero-tint'} px-[5%] py-12 md:py-16`}
        aria-labelledby="staff-h1"
      >
        <div className="container">
          {member.jobTitle && (
            <Tagline as="p">
              {member.jobTitle}
            </Tagline>
          )}
          <h1
            id="staff-h1"
            className="font-heading text-3xl font-extrabold uppercase tracking-wide text-foreground md:text-4xl lg:text-5xl"
          >
            {name || 'Staff Member'}
          </h1>

          <hr className="mt-5 mb-6 w-16 border-border" />

          {/* Contact CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <Button context={buttonContext} href={cta.href}>{cta.label}</Button>
            {member.email && (
              <Button variant="secondary" context={buttonContext} href={`mailto:${member.email}`}>
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
        </div>
      </div>

      {/* ── Main layout ───────────────────────────────────────────────────── */}
      <div className="px-[5%] py-12 md:py-16">
        <div className="container grid grid-cols-1 gap-10 lg:grid-cols-[300px_1fr] lg:gap-16 xl:grid-cols-[340px_1fr]">

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <aside className="lg:sticky lg:top-8 lg:self-start" aria-label="Staff photo">
            {hasImage(member.photo) ? (
              <div className="flex items-start justify-center bg-muted">
                <SanityImage
                  image={member.photo}
                  mode="natural"
                  alt={member.photo.alt || name}
                  width={340}
                  height={420}
                  className="w-full max-w-[340px] object-contain"
                  sizes="(max-width: 1024px) 100vw, 340px"
                  priority
                />
              </div>
            ) : null}

            {/* Office address */}
            {member.location?.city && (
              <address className="mt-5 not-italic text-sm leading-relaxed text-foreground-muted">
                {formatStaffAddress(member.location)}
              </address>
            )}
          </aside>

          {/* ── Main column ───────────────────────────────────────────────── */}
          {/* Uses <section> (not <main>) because (site)/layout.tsx already provides the single <main id="main-content"> landmark — nested <main> is a WCAG violation. */}
          <section aria-label="Biography">
            {member.biography && member.biography.length > 0 && (
              <div>
                <h2 className="mb-4 font-heading text-xl font-bold text-foreground md:text-2xl">Biography</h2>
                <PortableTextRenderer value={member.biography} napTokens={napTokens} />
              </div>
            )}
          </section>

        </div>
      </div>
    </>
  )
}
