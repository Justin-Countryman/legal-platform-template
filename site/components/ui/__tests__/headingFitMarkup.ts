// The markup a heading fit adds (Phase 17C session 3, `components/ui/HeadingText.tsx`), and the classes
// the tablet stack moved (below): the two widths on the heading element, one span around its words, and the class names that mark a heading column
// that widens (`globals.css`, `heading-grows` and the grids). The markup goldens captured before it compare
// with exactly that removed, so they go on proving that nothing else moved; the span itself is held by
// `HeadingText.test.tsx` and the sections' own tests.
// The stack (Phase 17C session 3, `[R-548]`, `[R-549]`): under `xl` a layout that sets a section heading
// beside other content stacks as on a phone, into the 768 px single column from 853 px, so its
// side-by-side classes moved from `md:` (the areas aside's from `lg:`) to `xl:`, and the band above a
// raised photo grows from `xl`; the marker classes of the stacked measure and photo, and the photo's focus
// point, are removed above. Each
// pair is a whole class string as rendered now and as it was; none of the new strings occurs in a
// golden captured before the move, so mapping them back undoes exactly the move and nothing else.
const TABLET_STACK: ReadonlyArray<readonly [string, string]> = [
  ['grid grid-cols-1 gap-8 max-xl:mx-auto max-xl:max-w-3xl xl:grid-cols-12 xl:gap-16', 'grid grid-cols-1 gap-8 md:grid-cols-12 md:gap-16'],
  ['class="xl:col-span-5"', 'class="md:col-span-5"'],
  ['class="xl:col-span-7"', 'class="md:col-span-7"'],
  ['grid grid-cols-1 items-center gap-10 max-xl:mx-auto max-xl:max-w-3xl xl:grid-cols-2 xl:gap-16', 'grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16'],
  ['class="xl:order-first xl:self-start xl:photo-rise"', 'class="md:order-first md:self-start md:photo-rise"'],
  ['class="xl:order-last xl:self-start xl:photo-rise"', 'class="md:order-last md:self-start md:photo-rise"'],
  ['class="xl:order-first"', 'class="md:order-first"'],
  ['class="xl:order-last"', 'class="md:order-last"'],
  ['grid grid-cols-1 gap-10 xl:grid-cols-12 xl:gap-16', 'grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-16'],
  ['class="max-xl:max-w-2xl xl:col-span-5"', 'class="md:col-span-5"'],
  ['grid grid-cols-1 items-center gap-12 max-xl:mx-auto max-xl:max-w-3xl xl:grid-cols-2 xl:gap-20', 'grid grid-cols-1 items-center gap-12 md:grid-cols-2 lg:gap-20'],
  ['grid grid-cols-1 gap-8 max-xl:mx-auto max-xl:max-w-3xl xl:grid-cols-2 xl:items-center xl:gap-12', 'grid grid-cols-1 gap-8 md:grid-cols-2 md:items-center md:gap-12'],
  ['grid grid-cols-1 items-start gap-12 max-xl:mx-auto max-xl:max-w-3xl xl:grid-cols-2 xl:gap-20', 'grid grid-cols-1 items-start gap-12 md:grid-cols-2 lg:gap-20'],
  ['shrink-0 max-xl:max-w-2xl xl:w-1/3', 'shrink-0 md:w-1/3'],
  ['justify-start gap-8 xl:justify-end', 'justify-start gap-8 md:justify-end'],
  ['flex flex-col gap-8 xl:flex-row xl:items-center xl:gap-12', 'flex flex-col gap-8 md:flex-row md:items-center md:gap-12'],
  ['flex flex-col gap-12 xl:flex-row xl:items-start xl:gap-16', 'flex flex-col gap-12 md:flex-row md:items-start md:gap-16'],
  ['grid grid-cols-1 gap-12 max-xl:mx-auto max-xl:max-w-3xl xl:grid-cols-2 xl:gap-x-20 xl:items-start', 'grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-x-12 lg:gap-x-20 md:items-start'],
  ['flex flex-col gap-4 md:mb-12 xl:flex-row xl:items-end xl:justify-between xl:gap-12', 'flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-12'],
  ['text-foreground-muted xl:text-right', 'text-foreground-muted md:text-right'],
  ['class="xl:grid xl:grid-cols-[18rem_1fr] xl:gap-16"', 'class="lg:grid lg:grid-cols-[18rem_1fr] lg:gap-12 xl:gap-16"'],
  ['class="mb-10 max-xl:max-w-2xl xl:mb-0 xl:sticky xl:top-28 xl:self-start"', 'class="mb-10 lg:mb-0 lg:sticky lg:top-28 lg:self-start"'],
  ['pb-12 md:pb-16 xl:pb-32', 'pb-12 md:pb-32'],
  ['pb-16 md:pb-24 lg:pb-28 xl:pb-44', 'pb-16 md:pb-40 lg:pb-44'],
  ['pb-24 md:pb-32 lg:pb-40 xl:pb-56', 'pb-24 md:pb-48 lg:pb-56'],
  ['pb-10 md:pb-12 xl:pb-28', 'pb-10 md:pb-28'],
]

export function withoutHeadingFit(html: string): string {
  const fit = html
    .replace(/ class="(?:heading-grows|heading-grid-5|heading-grid-half|heading-grid-aside|heading-flex-third|heading-flex-banner|stacked-measure|stacked-photo|stacked-cutout)"/g, '')
    .replace(/(?<=class=")((?:heading-grows|heading-grid-5|heading-grid-half|heading-grid-aside|heading-flex-third|heading-flex-banner|stacked-measure|stacked-photo|stacked-cutout) )+/g, '')
    .replace(/ (?:heading-grows|heading-grid-5|heading-grid-half|heading-grid-aside|heading-flex-third|heading-flex-banner|stacked-measure|stacked-photo|stacked-cutout)(?=[ "])/g, '')
    .replace(/ style="--heading-w3: ?[0-9.]+; ?--heading-w4: ?[0-9.]+;?"/g, '')
    .replace(/<span class="heading-fit">([\s\S]*?)<\/span>/g, '$1')
    .replace(/ style="--photo-focus:[^"]*"/g, '')
  return TABLET_STACK.reduce((out, [now, was]) => out.split(now).join(was), fit)
}
