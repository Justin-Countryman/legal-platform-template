# Custom Body Font

This folder is the destination for a custom body font uploaded via Sanity Design Settings.

When a client uploads a body font through the Sanity Studio:
- The file is stored in Sanity's asset CDN (not this folder)
- The font is loaded at runtime via `@font-face` injection in the page `<style>` block
- This folder is a placeholder — no files need to be committed here

## When to use this folder

If you want to self-host a custom font instead of using Sanity CDN delivery:
1. Place the `.woff2` files here with descriptive names
2. Reference them via the Sanity custom upload fields pointing to `/fonts/files/custom-body/`
3. Or update the `bodyFont.regular` path in the GROQ query to point here

## Naming convention

```
CustomFontName-Regular.woff2
CustomFontName-SemiBold.woff2
CustomFontName-Bold.woff2
CustomFontName-Italic.woff2
CustomFontName-BoldItalic.woff2
```
