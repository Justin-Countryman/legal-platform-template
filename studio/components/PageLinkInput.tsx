import {useEffect, useState} from 'react'
import {set, type StringInputProps, useClient} from 'sanity'

// ─── Types ────────────────────────────────────────────────────────────────────

type PageOption = {
  _type: string
  slug: string
  label: string
  parentSlug?: string | null
}

type HierarchicalOption = PageOption & {depth: number}

// ─── Config ───────────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<string, string> = {
  practiceArea: 'Practice Areas',
  geoPracticeArea: 'Geo Practice Areas',
  locationPage: 'Locations',
  serviceAreaIndex: 'Service Areas Index',
  serviceAreaPage: 'Service Areas',
  aboutPage: 'About',
  contactPage: 'Contact',
  faqPage: 'FAQ',
  generalPage: 'General Pages',
  landingPage: 'Landing Pages',
  blogIndex: 'Blog',
  eventIndex: 'Events Index',
  eventPage: 'Events',
  attorneyPage: 'Attorneys',
  attorneyIndex: 'Attorneys Index',
  staffIndex: 'Staff Index',
  reviewPage: 'Review Pages',
}

// ─── Hierarchy Builder ────────────────────────────────────────────────────────

function buildHierarchy(pages: PageOption[]): HierarchicalOption[] {
  const byParent: Record<string, PageOption[]> = {}
  for (const page of pages) {
    const key = page.parentSlug ?? '__root__'
    ;(byParent[key] ??= []).push(page)
  }
  // Sort each level alphabetically
  for (const key of Object.keys(byParent)) {
    byParent[key].sort((a, b) => a.label.localeCompare(b.label))
  }

  const result: HierarchicalOption[] = []

  function walk(parentSlug: string, depth: number) {
    for (const page of byParent[parentSlug] ?? []) {
      result.push({...page, depth})
      walk(page.slug, depth + 1)
    }
  }

  walk('__root__', 0)
  return result
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PageLinkInput(props: StringInputProps) {
  const client = useClient({apiVersion: '2024-01-01'})
  const [options, setOptions] = useState<PageOption[]>([])

  useEffect(() => {
    client
      .fetch<PageOption[]>(
        `*[
          defined(slug.current) &&
          !(_id in path("drafts.**")) &&
          _type in [
            "practiceArea", "geoPracticeArea", "locationPage",
            "serviceAreaIndex", "serviceAreaPage",
            "aboutPage", "contactPage", "faqPage",
            "generalPage", "landingPage", "blogIndex",
            "eventIndex", "eventPage",
            "attorneyPage", "attorneyIndex", "staffIndex",
            "reviewPage"
          ]
        ]{
          _type,
          "slug": slug.current,
          "parentSlug": parentPage->slug.current,
          "label": select(
            _type == "attorneyPage" => coalesce(firstName, "") + " " + coalesce(lastName, ""),
            _type == "eventPage" => coalesce(title, "Untitled Event"),
            coalesce(
              title,
              select(
                _type == "blogIndex" => "Blog",
                _type == "eventIndex" => "Events",
                _type == "attorneyIndex" => "Our Attorneys",
                _type == "staffIndex" => "Our Staff",
                _type == "aboutPage" => "About Us",
                _type == "contactPage" => "Contact"
              ),
              hero.heading,
              "Untitled"
            )
          )
        } | order(_type asc, lastName asc, firstName asc)`,
      )
      .then(setOptions)
      .catch(() => {})
  }, [client])

  // Group by type — practice areas get hierarchical ordering, others stay alphabetical
  const groups: Record<string, HierarchicalOption[]> = {}
  const byType: Record<string, PageOption[]> = {}

  for (const opt of options) {
    const key = opt._type
    ;(byType[key] ??= []).push(opt)
  }

  for (const [type, pages] of Object.entries(byType)) {
    const groupLabel = GROUP_LABELS[type] ?? type
    const ordered =
      type === 'practiceArea' || type === 'geoPracticeArea'
        ? buildHierarchy(pages)
        : pages
            .slice()
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((p) => ({...p, depth: 0}))
    groups[groupLabel] = ordered
  }

  const hasGroups = Object.keys(groups).length > 0

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
      {props.renderDefault(props)}

      {hasGroups && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) props.onChange(set(e.target.value))
          }}
          style={{
            padding: '7px 10px',
            border: '1px solid var(--card-border-color)',
            borderRadius: '3px',
            background: 'var(--card-bg-color)',
            color: 'var(--card-fg-color)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <option value="">— Pick a page to fill URL —</option>
          <option value="/">Home (/)</option>
          {Object.entries(groups).map(([groupLabel, items]) => (
            <optgroup key={groupLabel} label={groupLabel}>
              {items.map((item) => {
                const href = `/${item.slug.replace(/\/$/, '')}/`
                const indent = '— '.repeat(item.depth)
                return (
                  <option key={item.slug} value={href}>
                    {indent}{item.label} ({href})
                  </option>
                )
              })}
            </optgroup>
          ))}
        </select>
      )}
    </div>
  )
}
