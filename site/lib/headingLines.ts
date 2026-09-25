// ─── Lines under section headings (Phase 16C, `[R-484]`) ──────────────────────
//
// Twenty-three designs plus none, picked independently of the style set with a default
// from each style set (`[R-485]`). Every design but Flanking and Monogram is a one-color
// SVG drawn as a MASK on the heading's `::after` and painted in the decor role
// resolved on the heading, so a dark or saturated band's redeclared accent reaches it
// (16B amendment 9). `buildDesignTokenCSS` emits the chosen design at `:root`
// (`--heading-line-mask`, `--heading-line-w`, `--heading-line-h`): one CSS rule draws
// every design, and the Studio's picker draws the same SVG, so there is one source.
//
// The SVGs sit on whole pixels at their drawn size (a 1px rule on a half pixel renders
// as a 2px half-tone, ADV-P16C-A). `line` keeps its stored value and is the Bar.
//
// Flanking (two short lines beside a centred heading) is drawn by gradients inside the
// heading's own padding from `md`, and below `md` as a hairline under it (lines outside
// a wrapping heading scrolled the page sideways at 390 and 768). Monogram is the
// Diamond with the firm's mark in its centre, inlined by the layout from the mark's
// SVG; with no SVG mark it draws the Diamond.

export const HEADING_LINES = [
  'none', 'line', 'hairline', 'slab', 'double', 'thickThin', 'thinThickThin', 'tapered', 'fade', 'terminals', 'diamond',
  'broken', 'flanking', 'vertical', 'corner', 'dotted', 'dashed', 'hatched', 'wave', 'zigzag', 'dinkus', 'sectionMark',
  'leadDot', 'leadDiamond',
] as const
export type HeadingLine = (typeof HEADING_LINES)[number]

/** How often law-firm sites use a line (ADV-P16C-B): the picker's order. */
export type LineUse = 'common' | 'ornamental' | 'decorative'

export type HeadingLineDesign = {label: string; use: LineUse; w: number; h: number; body: string}

const dots = (n: number, gap: number, r: number, y: number) =>
  Array.from({length: n}, (_, i) => `<circle cx='${r + i * gap}' cy='${y}' r='${r}'/>`).join('')
const diag = (w: number, h: number, step: number) =>
  `<path d='${Array.from({length: Math.ceil((w + h) / step)}, (_, i) => `M${i * step - h} ${h}L${i * step} 0`).join('')}' stroke='#000' stroke-width='1'/>`

export const HEADING_LINE_DESIGNS: Record<Exclude<HeadingLine, 'none' | 'flanking' | 'vertical'>, HeadingLineDesign> = {
  line:          {label: 'Bar', use: 'common', w: 48, h: 2, body: "<rect width='48' height='2'/>"},
  hairline:      {label: 'Hairline', use: 'common', w: 72, h: 1, body: "<rect width='72' height='1'/>"},
  slab:          {label: 'Slab', use: 'common', w: 32, h: 6, body: "<rect width='32' height='6'/>"},
  double:        {label: 'Double', use: 'common', w: 48, h: 5, body: "<rect width='48' height='1'/><rect y='4' width='48' height='1'/>"},
  fade:          {label: 'Fade', use: 'common', w: 112, h: 1, body: "<defs><linearGradient id='g'><stop offset='0' stop-opacity='0'/><stop offset='.5'/><stop offset='1' stop-opacity='0'/></linearGradient></defs><rect width='112' height='1' fill='url(#g)'/>"},
  thickThin:     {label: 'Thick-thin', use: 'ornamental', w: 56, h: 6, body: "<rect width='56' height='3'/><rect y='5' width='56' height='1'/>"},
  thinThickThin: {label: 'Thin-thick-thin', use: 'ornamental', w: 56, h: 9, body: "<rect width='56' height='1'/><rect y='3' width='56' height='3'/><rect y='8' width='56' height='1'/>"},
  tapered:       {label: 'Tapered', use: 'ornamental', w: 80, h: 4, body: "<polygon points='0,2 40,0 80,2 40,4'/>"},
  terminals:     {label: 'Dot-line-dot', use: 'ornamental', w: 72, h: 6, body: "<circle cx='3' cy='3' r='3'/><rect x='6' y='2' width='60' height='2'/><circle cx='69' cy='3' r='3'/>"},
  diamond:       {label: 'Diamond on a line', use: 'ornamental', w: 80, h: 9, body: "<rect y='4' width='32' height='1'/><polygon points='40,0 45,4.5 40,9 35,4.5'/><rect x='48' y='4' width='32' height='1'/>"},
  sectionMark:   {label: 'Section mark', use: 'ornamental', w: 88, h: 16, body: "<rect y='8' width='32' height='1'/><path d='M47.5 3.5a3 2.6 0 1 0-3.2 2.7l-.6.4a3 2.6 0 1 0 3.9 4.6M40.5 12.5a3 2.6 0 1 0 3.2-2.7l.6-.4a3 2.6 0 1 0-3.9-4.6' fill='none' stroke='#000' stroke-width='1.6'/><rect x='56' y='8' width='32' height='1'/>"},
  leadDot:       {label: 'Lead dot', use: 'ornamental', w: 72, h: 6, body: "<circle cx='3' cy='3' r='3'/><rect x='10' y='2' width='62' height='2'/>"},
  leadDiamond:   {label: 'Lead diamond', use: 'ornamental', w: 72, h: 9, body: "<polygon points='4.5,0 9,4.5 4.5,9 0,4.5'/><rect x='13' y='4' width='59' height='1'/>"},
  broken:        {label: 'Broken', use: 'decorative', w: 64, h: 2, body: "<rect width='26' height='2'/><rect x='38' width='26' height='2'/>"},
  corner:        {label: 'Corner mark', use: 'decorative', w: 16, h: 16, body: "<rect width='16' height='2'/><rect width='2' height='16'/>"},
  dotted:        {label: 'Dotted', use: 'decorative', w: 62, h: 4, body: dots(8, 8, 2, 2)},
  dashed:        {label: 'Dashed', use: 'decorative', w: 56, h: 2, body: "<rect width='8' height='2'/><rect x='12' width='8' height='2'/><rect x='24' width='8' height='2'/><rect x='36' width='8' height='2'/><rect x='48' width='8' height='2'/>"},
  hatched:       {label: 'Hatched', use: 'decorative', w: 48, h: 6, body: diag(48, 6, 4)},
  wave:          {label: 'Wave', use: 'decorative', w: 64, h: 8, body: "<path d='M0 4q4-4 8 0t8 0 8 0 8 0 8 0 8 0 8 0 8 0' fill='none' stroke='#000' stroke-width='1.5'/>"},
  zigzag:        {label: 'Zigzag', use: 'decorative', w: 64, h: 8, body: "<polyline points='0,7 4,1 8,7 12,1 16,7 20,1 24,7 28,1 32,7 36,1 40,7 44,1 48,7 52,1 56,7 60,1 64,7' fill='none' stroke='#000' stroke-width='1.5'/>"},
  dinkus:        {label: 'Three dots', use: 'decorative', w: 36, h: 4, body: dots(3, 16, 2, 2)},
}

export const LINE_USE_ORDER: readonly LineUse[] = ['common', 'ornamental', 'decorative']

export function lineSvg(design: HeadingLineDesign): string {
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${design.w}' height='${design.h}' viewBox='0 0 ${design.w} ${design.h}'>${design.body}</svg>`
}

export const cssUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`

/** The custom properties that draw the chosen line. Absent for none and Flanking. */
export function headingLineVars(value: string | null | undefined): string {
  const design = (HEADING_LINE_DESIGNS as Record<string, HeadingLineDesign>)[value ?? '']
  if (!design) return ''
  return `--heading-line-mask:${cssUrl(lineSvg(design))};--heading-line-w:${design.w / 16}rem;--heading-line-h:${design.h / 16}rem;`
}
