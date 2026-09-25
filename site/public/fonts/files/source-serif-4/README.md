# Source Serif 4

**License:** SIL OFL 1.1  
**Designer:** Frank Grießhammer (Adobe)  
**Google Fonts:** https://fonts.google.com/specimen/Source+Serif+4

Used in pairings: **18 — Sovereign Mono** (heading and body)

## Files

| File | Weight | Style |
|------|--------|-------|
| SourceSerif4-Regular.woff2 | variable, `wght` 200 to 900 | normal |

## How this folder is kept

This family is **variable**: its one upright file carries every weight, and a pairing declares it once across the weights it draws (`fonts/presets.ts` `weights`; 400–600 here, the page's own faces), so a weight in between draws as itself. Commit a variable family as ONE file named `<Family>-Regular.woff2`, never as copies under weight names: `fonts/__tests__/presets.test.ts` refuses two identical files and a variable role that names a second upright file. An italic, where committed, is a separate static file declared at 400.
