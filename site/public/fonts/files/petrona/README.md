# Petrona

**License:** SIL OFL 1.1  
**Designer:** Andrés Torresi  
**Google Fonts:** https://fonts.google.com/specimen/Petrona

Used in pairings: **16 — Stately Modern** (heading)

## Files

| File | Weight | Style |
|------|--------|-------|
| Petrona-Regular.woff2 | variable, `wght` 400 to 900 | normal |

## How this folder is kept

This family is **variable**: its one upright file carries every weight, and a pairing declares it once across the weights it draws (`fonts/presets.ts` `weights`; 400–700 here, the page's own faces), so a weight in between draws as itself. Commit a variable family as ONE file named `<Family>-Regular.woff2`, never as copies under weight names: `fonts/__tests__/presets.test.ts` refuses two identical files and a variable role that names a second upright file. An italic, where committed, is a separate static file declared at 400.
