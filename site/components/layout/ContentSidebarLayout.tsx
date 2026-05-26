import type {ReactNode} from 'react'

// ─── ContentSidebarLayout ─────────────────────────────────────────────────────
// Layout B primitive — main content with optional right-rail sidebar.
//
// Used by:
// - app/(site)/[...slug]/page.tsx (practiceArea, locationPage, etc.) — sidebar optional
// - app/(site)/blog/[slug]/page.tsx — sidebar always present
//
// Behavior:
// - Outer wrapper applies the canonical body band: px-[5%] py-12 md:py-16 lg:py-20.
// - Grid is conditional on `sidebar`: when absent, body renders single-column
//   without the grid wrapper; when present, body + sidebar share a 1fr+320px grid.
// - Body element is `<main>` by default; pass as="article" for blog post detail.

type Props = {
  children: ReactNode
  sidebar?: ReactNode
  as?: 'main' | 'article'
  className?: string
}

export function ContentSidebarLayout({
  children,
  sidebar,
  as = 'main',
  className,
}: Props) {
  const BodyEl = as
  const wrapperClass = `px-[5%] py-12 md:py-16 lg:py-20${className ? ` ${className}` : ''}`

  return (
    <div className={wrapperClass}>
      <div className="container">
        {sidebar ? (
          <div className="grid grid-cols-1 gap-12 lg:gap-20 lg:grid-cols-[1fr_320px]">
            <BodyEl>{children}</BodyEl>
            <aside aria-label="Sidebar">{sidebar}</aside>
          </div>
        ) : (
          <BodyEl>{children}</BodyEl>
        )}
      </div>
    </div>
  )
}
