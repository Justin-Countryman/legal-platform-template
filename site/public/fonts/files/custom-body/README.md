# Custom Body Font

A placeholder: nothing is committed here and nothing reads this folder.

A custom body font is uploaded in the Studio (Design Settings, Custom Fonts, Body Font). Its files are
Sanity assets on Sanity's CDN, and the page declares them in its `@font-face` rules (`fonts/loader.ts`); an
upload field holds a file, never a path, so a file placed here cannot be chosen there.

- **A variable font** (one file that carries every weight, as a Google Fonts download now is): upload it as
  Regular and tick **Variable font**. The page declares it once across every weight; a Bold or Semibold
  upload beside it is not used. The Studio reads the file and warns when the box does not match it.
- **Separate weight files**: upload each in its own field and leave the box off; each is declared at its
  field's weight.

Name uploads plainly, for example `CustomFontName-Regular.woff2`, and `-SemiBold`, `-Bold`, `-Italic` and `-BoldItalic`. A committed pairing's files live in their own folders beside this
one (`fonts/presets.ts`).
