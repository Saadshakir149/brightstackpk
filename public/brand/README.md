# Brand assets

Drop the official Brightstack logo files here. The site references:

- `logo.svg` — the brand mark, used beside the wordmark in the header and footer
  (see `src/components/Logo.astro`, rendered when `mark` is set) and as the
  Organization logo in JSON-LD (`src/lib/site.ts`).

Recommended additional files to add when available:

- `logo-wordmark.svg` — full lockup (mark + "brightstack") if you want to swap
  the CSS wordmark for artwork.
- Share (Open Graph) images are generated automatically per page at build
  time by `src/pages/og/[slug].png.ts`. No files needed here.
- `favicon.svg` / `favicon.ico` — to replace the placeholder `public/favicon.svg`.

Brand mark spec (fallback only — do not override supplied files): three stacked
isometric rhombus layers (top layer flat, lower two chevron-shaped), gradient
cyan #00D4FF → blue #3B5BFF → violet #A855F7.
