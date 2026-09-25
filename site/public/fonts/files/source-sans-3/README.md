# Source Sans 3

**License:** SIL OFL 1.1  
**Designer:** Adobe (Paul D. Hunt)  
**Google Fonts:** https://fonts.google.com/specimen/Source+Sans+3

Used in pairings: **1 — Classical Authority** (body), **11 — Bold Advocate** (body)

## Files

| File | Weight | Style |
|------|--------|-------|
| SourceSans3-Italic.woff2 | 400 | italic |
| SourceSans3-Regular.woff2 | variable, `wght` 200 to 900 | normal |

## How this folder is kept

This family is **variable**: its one upright file carries every weight, and a pairing declares it once across the weights it draws (`fonts/presets.ts` `weights`; 400–600, 400–700 here, the page's own faces), so a weight in between draws as itself. Commit a variable family as ONE file named `<Family>-Regular.woff2`, never as copies under weight names: `fonts/__tests__/presets.test.ts` refuses two identical files and a variable role that names a second upright file. An italic, where committed, is a separate static file declared at 400.
