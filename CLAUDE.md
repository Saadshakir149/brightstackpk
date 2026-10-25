# CLAUDE.md — Brightstack website build guide

This file is the binding contract for building brightstack.pk. Follow it for the entire build. If any change would break a rule here, stop and flag it instead.

## Project
- Company: Brightstack (brightstack.pk). Marketing website.
- Output: static site, hosted on Vercel (GitHub repo connected; every push to `main` deploys). Config in `vercel.json`.
- Pages: Home, Services (overview + one page per service), Work (case-study list + detail), About, Contact, 404.

## Tech stack
- Astro (latest) + TypeScript, `output: 'static'`.
- Tailwind CSS v4 (via `@tailwindcss/vite`). Theme tokens defined with `@theme` in `src/styles/global.css`.
- Self-hosted fonts via @fontsource: "Outfit" (headings), "Inter" (body). Import ONLY the weights actually used, latin subset only.
- No heavy JS frameworks. Small vanilla `<script>` only where needed (theme toggle, menu, pausing decorative motion).
- Package manager: npm. Node 20+.

## Brand
- Logo text is ALWAYS lowercase "brightstack" — "bright" bold + "stack" regular. In prose/sentences write "Brightstack".
- Tagline: "Bright ideas. Smart systems. Real growth."
- Services: AI Systems • Web & Mobile Apps • Social Media Growth.
- Audience: small and growing businesses in the UK and Pakistan (restaurants, shops, clothing brands, service businesses, startups). Most are NOT technical.
- Tone: confident, clear, friendly, zero jargon. Short sentences. Talk about results (more customers, less manual work), not technologies.
- Logo files live in `public/brand/` (user-provided). If an SVG mark must be recreated as a fallback: three stacked isometric rhombus layers (top layer flat, lower two chevron-shaped), gradient cyan #00D4FF → blue #3B5BFF → violet #A855F7.
- Inspiration: xeleratelab.com (problem-first storytelling, editorial layout, clean type). Do NOT copy its text, layout details or visuals. Brightstack must look original.

## Design system
Dark-first with a light-mode toggle (default to OS preference; remember the user's choice in localStorage). Theme applied via `data-theme` on `<html>`, set by a no-flash inline script before paint.

CSS variables:
- Dark: `--bg #0A0E1A`, `--surface #111827`, `--border rgba(255,255,255,0.08)`, `--text #F5F7FB`, `--muted #A3ABBD`.
- Light: `--bg #FAFBFF`, `--surface #FFFFFF`, `--text #0A0E1A`, `--muted #4B5568`, `--border rgba(0,0,0,0.08)`.
- Brand gradient: `linear-gradient(135deg, #00D4FF, #3B5BFF, #A855F7)`. Use ONLY for small accents (logo, icons, key headline words, thin lines/dots). NEVER for body text and NEVER as a button fill (owner feedback, Oct 2026: gradient buttons look unprofessional).
- Contrast-safe tokens (use these, not raw brand colors, for text/UI):
  - `--accent` for small accent text, focus rings, active states (cyan in dark, #2D46E0 in light; raw cyan fails AA on light).
  - `.gradient-text` (uses `--gradient-text`, darker stops in light) only on large text: ≥24px, or ≥19px bold.
  - Primary buttons: solid `--btn-bg` (#3B5BFF) with white text (5.1:1), `--btn-bg-hover` (#2E47E0) on hover. No gradient fills, no shine effects.
- Classes passed into a child component (e.g. `<Button class="x">`) must be styled with `:global(.x)` from the parent. Same for elements a script creates at runtime: they have no scope attribute.
- Form tokens: `--field-border` for input outlines (≥3:1), `--danger` / `--success` for error/success text.

Type scale:
- h1 `clamp(40px, 7vw, 80px)`; h2 `clamp(30px, 4vw, 48px)`; body 17–18px. Minimum text size anywhere 14px.
- Headings use Outfit; body uses Inter.

Spacing & shape:
- Rounded corners 16–24px. Generous spacing. Subtle borders. Soft gradient glows behind icons (decorative, low opacity).
- Max content width 1200px. 20px side padding on mobile.

## UX rules
- Fixed header must NEVER overlap content: every page gets enough top padding to clear it.
- Header background solid or strongly blurred (≥90% opacity) — text must never show through.
- No animation behind body text. Decorative motion only in empty areas; pause when off-screen; fully disabled under `prefers-reduced-motion`.
- Content never invisible while waiting for scroll animations: nothing above the fold is hidden at load, and below-fold content reveals the moment it enters view. Reveals are smooth: ~700ms, `--ease-out-expo`, ~24px rise, staggered 80ms (approved by owner, Oct 2026; was ≤300ms).

## Motion system (premium & calm)
- Tokens in `global.css`: `--ease-out-expo`, `--ease-out-back`, `--dur-fast` (200ms), `--dur-base` (400ms), `--dur-reveal` (700ms). Use them; don't invent new curves.
- Motion supports content, never competes with it. Signature moments: hero layer stack (intro + mouse parallax), headline line rise, card spotlight borders, magnetic primary buttons, audience marquee, scroll-filled process line, cross-page view transitions, theme-switch reveal.
- Pointer effects (spotlight, magnetic, parallax) only for `(hover: hover) and (pointer: fine)`. Touch devices get the "in-view" state instead.
- Above-the-fold hero text (the `h1` AND the lead paragraph, which is the LCP element on phones) animates with transform only, never opacity: an opacity animation delays LCP until it ends (this once cost 7.4s LCP / Performance 75). Re-run Lighthouse mobile after any hero change.
- CSS is inlined into each page (`build.inlineStylesheets: 'always'`) to avoid render-blocking requests.
- The two above-the-fold fonts (Outfit 700, Inter 400) are preloaded in BaseLayout. Without it, late font swaps re-layout the whole page (homepage style+layout ~1.5s → ~0.36s).
- Performance-safe effects only: no `filter: blur()` or `backdrop-filter` (glows are radial gradients or box-shadows; header/tab bar are near-solid). Decorative layers that are usually invisible (e.g. `.spotlight::after`) are only created while shown (`content: none` by default + `@starting-style`).
- Icons: favicon/touch icons are small generated PNGs (`icon-32.png`, `apple-touch-icon.png`, `icon-512.png`). Never point `<link rel="icon">` at a large source image.
- Images that can appear on the first screen must not be `loading="lazy"` (e.g. `CaseStudyCard eager`).
- The CSS minifier folds `animation-timeline` into the `animation` shorthand, which browsers reject. Always set it in a separate, more specific rule (see `.scroll-progress`).
- All interactive motion lives in `src/scripts/motion.ts` (one small module); every loop is rAF-throttled and stops off-screen.
- No custom cursors and no scroll-jacking/smooth-scroll libraries: they hurt accessibility and performance.
- Every page ends with a clear CTA: WhatsApp + "Free consultation".
- Mobile: bottom tab bar (Home, Services, Work, Contact) that never covers buttons or content (pad page bottom to clear it).
- All tap targets ≥44px tall.

## Engineering rules
- Accessibility: semantic HTML, exactly one h1 per page, skip link, visible focus states, alt text on every image, WCAG AA contrast in BOTH themes.
- Performance: target Lighthouse 95+ on mobile in all four categories.
- SEO: unique title + description per page, canonical URLs, Open Graph + Twitter image on every page, sitemap, robots.txt, JSON-LD.
  - Descriptions 70–160 characters; titles short enough not to truncate (~60 chars incl. " | Brightstack").
  - OG images are PNGs generated at build by `src/pages/og/[slug].png.ts`. A new page needs an entry there and `image="/og/<slug>.png"` on its BaseLayout.
- Content honesty: never invent client results, quotes, prices or biography. Use obvious placeholders (`+XX%`, `£XXX`, `[Client name]`) and set `placeholder: true` on sample case studies.
- Security headers (and clean URLs) via `vercel.json`.
- Components: small and reusable in `src/components/`. Services and case studies in Astro content collections (`src/content/`).
- Secrets ONLY in environment variables (`.env`, documented in `.env.example`). Never commit secrets.
  - Build-time public: `PUBLIC_TURNSTILE_SITE_KEY`. Without it the contact page shows WhatsApp + email instead of the form (never a form that can't send) and the build log warns. `.env.development` holds Cloudflare's public Turnstile *test* key for `astro dev`.
  - Vercel Function runtime: `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` (Vercel → Settings → Environment Variables). Setup steps in README.md.
  - Env fallbacks use `||`, not `??`, so an empty value in `.env` never blanks a setting.

## Contact form
- Browser: `src/components/ContactForm.astro`. Server: `api/contact.ts` (Vercel Function, Web-standard `POST(request)` handler, type-checked by `npm run check:api` as part of `build`).
- Validation rules and form options live ONLY in `src/lib/contact.ts`, imported by both sides. Change rules there, never in one side only.
- The function must never report success unless Resend accepted the email. Error state always offers the pre-filled WhatsApp fallback.
- `astro dev` has no `/api/contact`. Test real sending with `vercel dev` (see README).

## URLs
- `build.format: 'file'` (pages emit `contact.html`) plus `cleanUrls: true` / `trailingSlash: false` in `vercel.json`, so `/contact` is served directly with no redirect. At build time `Astro.url.pathname` is `/contact.html`: always pass it through `cleanPath()` from `src/lib/seo.ts`.

## Conventions
- Pages wrap in `BaseLayout.astro`; SEO handled via a `Seo` component / layout props.
- Shared constants (contact details, WhatsApp link, socials, nav, org JSON-LD) live in one file: `src/config.ts` (import via `@config`). Small helpers go in `src/lib/`.
- Prefer Astro components + CSS over client JS. Any client script is tiny, vanilla, and progressively enhances.
