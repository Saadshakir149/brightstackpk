// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Site URL drives canonical URLs, sitemap and absolute OG image paths.
const SITE = process.env.PUBLIC_SITE_URL || 'https://brightstack.pk';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'never',
  // Emit contact.html (not contact/index.html) so Cloudflare Pages serves
  // /contact directly instead of 308-redirecting to /contact/. Keeps URLs,
  // canonicals and the sitemap identical, with no redirect hop.
  build: {
    format: 'file',
    // The whole stylesheet is small; inlining it removes render-blocking
    // CSS requests, which matters most on slow mobile connections.
    inlineStylesheets: 'always',
  },
  integrations: [
    sitemap(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
