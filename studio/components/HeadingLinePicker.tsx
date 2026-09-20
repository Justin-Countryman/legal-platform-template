'use client'

import React from 'react'
import {set, unset, type StringInputProps} from 'sanity'
import {HEADING_LINE_DESIGNS, LINE_USE_ORDER, lineSvg, cssUrl, type LineUse} from '../../site/lib/headingLines'

// The Line Under Section Headings field (Phase 16C, `[R-484]`, `[R-489]`). A list of
// twenty-four names tells an editor nothing, so each design is drawn at its real size
// under a sample heading, grouped by how often law-firm sites use it: the designs an
// editor is most likely to want come first (ADV-P16C-B; grouping and a named default are
// what keep a long list usable).
//
// ONE SOURCE. Every swatch is the same SVG the site paints as a mask
// (`site/lib/headingLines.ts`), so the picker cannot drift from the render. Two designs
// are not masks and are drawn here as themselves: Flanking (two short lines beside the
// heading) and the vertical rule (a bar at its start).

const ACCENT = '#9a6a1f'
const GROUP_LABEL: Record<LineUse, string> = {
  common: 'Common on law-firm sites',
  ornamental: 'Ornamental',
  decorative: 'Decorative',
}

function Swatch({value}: {value: string}) {
  if (value === 'none') return <span style={{fontSize: 11, color: '#9ca3af'}}>no line</span>
  if (value === 'flanking') {
    return (
      <span style={{display: 'flex', alignItems: 'center', gap: 6}}>
        <span style={{display: 'block', width: 24, height: 1, background: ACCENT}} />
        <span style={{fontSize: 11, color: '#6b7280'}}>heading</span>
        <span style={{display: 'block', width: 24, height: 1, background: ACCENT}} />
      </span>
    )
  }
  if (value === 'vertical') {
    return (
      <span style={{display: 'flex', alignItems: 'center', gap: 8}}>
        <span style={{display: 'block', width: 3, height: 18, background: ACCENT}} />
        <span style={{fontSize: 11, color: '#6b7280'}}>heading</span>
      </span>
    )
  }
  const design = HEADING_LINE_DESIGNS[value as keyof typeof HEADING_LINE_DESIGNS]
  if (!design) return null
  return (
    <span
      style={{
        display: 'block',
        width: design.w,
        height: design.h,
        backgroundColor: ACCENT,
        WebkitMaskImage: cssUrl(lineSvg(design)).slice(4, -1),
        maskImage: cssUrl(lineSvg(design)).slice(4, -1),
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        maskRepeat: 'no-repeat',
      }}
    />
  )
}

export function HeadingLinePicker(props: StringInputProps) {
  const {value, onChange} = props
  const groups: Array<[LineUse | 'none', Array<{value: string; label: string}>]> = [
    ['none', [{value: 'none', label: 'None'}]],
    ...LINE_USE_ORDER.map(
      (use) =>
        [
          use,
          Object.entries(HEADING_LINE_DESIGNS)
            .filter(([, d]) => d.use === use)
            .map(([id, d]) => ({value: id, label: d.label})),
        ] as [LineUse, Array<{value: string; label: string}>],
    ),
  ]
  // Flanking and the vertical rule are drawn beside the heading rather than under it.
  groups[groups.length - 1][1].push({value: 'flanking', label: 'Flanking'}, {value: 'vertical', label: 'Vertical rule'})

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0'}}>
      {groups.map(([group, items]) => (
        <div key={group} style={{display: 'flex', flexDirection: 'column', gap: 6}}>
          {group !== 'none' && (
            <p style={{fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#666', margin: 0}}>
              {GROUP_LABEL[group as LineUse]}
            </p>
          )}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8}}>
            {items.map((item) => {
              const active = (value ?? 'none') === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange(item.value === 'none' ? unset() : set(item.value))}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between',
                    minHeight: 76, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    background: active ? '#eef4ff' : '#fff', border: active ? '2px solid #2f6fd6' : '1px solid #ddd',
                  }}
                >
                  <span style={{display: 'flex', alignItems: 'center', minHeight: 20}}>
                    <Swatch value={item.value} />
                  </span>
                  <span style={{fontSize: 12, color: '#222'}}>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
