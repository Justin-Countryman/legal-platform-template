// The markup a heading fit adds (Phase 17C session 3, `components/ui/HeadingText.tsx`), and the classes
// the tablet stack moved (below): the two widths on the heading element, one span around its words, and the class names that mark a heading column
// that widens (`globals.css`, `heading-grows` and the grids). The markup goldens captured before it compare
// with exactly that removed, so they go on proving that nothing else moved; the span itself is held by
// `HeadingText.test.tsx` and the sections' own tests.
// The tablet stack (Phase 17C session 3, `[R-548]`): under `lg` a layout that sets a section heading
// beside other content stacks as on a phone, so its side-by-side classes moved from `md:` to `lg:`. Each
// pair is a whole class string as rendered now and as it was; none of the new strings occurs in a
// golden captured before the move, so mapping them back undoes exactly the move and nothing else.
const TABLET_STACK: ReadonlyArray<readonly [string, string]> = [
  ['grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-16', 'grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-16'],
  ['class="lg:col-span-5"', 'class="md:col-span-5"'],
  ['class="lg:col-span-7"', 'class="md:col-span-7"'],
  ['grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16', 'grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16'],
  ['class="lg:order-first lg:self-start lg:photo-rise"', 'class="md:order-first md:self-start md:photo-rise"'],
  ['class="lg:order-last lg:self-start lg:photo-rise"', 'class="md:order-last md:self-start md:photo-rise"'],
  ['class="lg:order-first"', 'class="md:order-first"'],
  ['class="lg:order-last"', 'class="md:order-last"'],
  // The band above a raised photo grows from `lg`, where the photo now rises (`sectionSurface.ts`).
  ['pb-12 md:pb-16 lg:pb-32', 'pb-12 md:pb-32'],
  ['pb-16 md:pb-24 lg:pb-44', 'pb-16 md:pb-40 lg:pb-44'],
  ['pb-24 md:pb-32 lg:pb-56', 'pb-24 md:pb-48 lg:pb-56'],
  ['pb-10 md:pb-12 lg:pb-28', 'pb-10 md:pb-28'],
  ['(min-width: 992px) 50vw, 100vw', '(min-width: 768px) 50vw, 100vw'],
  ['grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16', 'grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-16'],
  ['grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20', 'grid grid-cols-1 items-center gap-12 md:grid-cols-2 lg:gap-20'],
  ['grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center lg:gap-12', 'grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center md:gap-12'],
  ['grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-20', 'grid grid-cols-1 items-start gap-12 md:grid-cols-2 lg:gap-20'],
  ['shrink-0 lg:w-1/3', 'shrink-0 md:w-1/3'],
  ['justify-start gap-8 lg:justify-end', 'justify-start gap-8 md:justify-end'],
  ['flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12', 'flex flex-col gap-8 md:flex-row md:items-center md:gap-12'],
  ['flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16', 'flex flex-col gap-12 md:flex-row md:items-start md:gap-16'],
  ['grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-x-20 lg:items-start', 'grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-x-12 lg:gap-x-20 md:items-start'],
  ['flex flex-col gap-4 md:mb-12 lg:flex-row lg:items-end lg:justify-between lg:gap-12', 'flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-12'],
  ['text-foreground-muted lg:text-right', 'text-foreground-muted md:text-right'],
]

export function withoutHeadingFit(html: string): string {
  const fit = html
    .replace(/ class="(?:heading-grows|heading-grid-5|heading-grid-half|heading-grid-aside|heading-flex-third|heading-flex-banner)"/g, '')
    .replace(/(?<=class=")((?:heading-grows|heading-grid-5|heading-grid-half|heading-grid-aside|heading-flex-third|heading-flex-banner) )+/g, '')
    .replace(/ (?:heading-grows|heading-grid-5|heading-grid-half|heading-grid-aside|heading-flex-third|heading-flex-banner)(?=[ "])/g, '')
    .replace(/ style="--heading-w3: ?[0-9.]+; ?--heading-w4: ?[0-9.]+;?"/g, '')
    .replace(/<span class="heading-fit">([\s\S]*?)<\/span>/g, '$1')
  return TABLET_STACK.reduce((out, [now, was]) => out.split(now).join(was), fit)
}
