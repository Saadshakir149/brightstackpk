// Build-time Open Graph images: one 1200x630 PNG per page at /og/<slug>.png.
// Satori turns text into vector paths using our own fonts, so output is
// identical on any build machine; sharp rasterizes the SVG to PNG.
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { place } from '../../lib/work';

interface OgProps {
  eyebrow: string;
  title: string;
}

export const getStaticPaths = (async () => {
  const services = await getCollection('services', ({ data }) => !data.draft);
  const work = await getCollection('work', ({ data }) => !data.draft);
  const pages: (OgProps & { slug: string })[] = [
    { slug: 'home', eyebrow: 'Software • AI • Growth', title: 'Bright ideas. Smart systems. Real growth.' },
    { slug: 'services', eyebrow: 'Services', title: 'Websites, apps, AI and social media that grow your business' },
    ...services.map((s) => ({
      slug: `services-${s.id}`,
      eyebrow: 'Service',
      title: `${s.data.title}: ${s.data.tagline}`,
    })),
    { slug: 'work', eyebrow: 'Our work', title: 'Real projects for growing businesses' },
    ...work.map((w) => ({
      slug: `work-${w.id}`,
      eyebrow: [w.data.client, place(w.data)].filter(Boolean).join(' · '),
      title: w.data.title,
    })),
    { slug: 'about', eyebrow: 'About', title: 'Meet the founder behind Brightstack' },
    { slug: 'contact', eyebrow: 'Contact', title: "Let's talk about growing your business" },
    { slug: '404', eyebrow: 'Page not found', title: "This page wandered off. Let's get you back." },
    { slug: 'styleguide', eyebrow: 'Internal', title: 'Brightstack style guide' },
  ];
  return pages.map(({ slug, ...props }) => ({ params: { slug }, props }));
}) satisfies GetStaticPaths;

// ---- assets (loaded once per build) ----
const root = process.cwd();
const fontFile = (pkg: string, file: string) =>
  readFile(join(root, 'node_modules', '@fontsource', pkg, 'files', file));

let assets: Promise<{ fonts: Parameters<typeof satori>[1]['fonts']; mark: string }> | undefined;
function loadAssets() {
  assets ??= (async () => {
    const [outfit400, outfit700, inter500, markSvg] = await Promise.all([
      fontFile('outfit', 'outfit-latin-400-normal.woff'),
      fontFile('outfit', 'outfit-latin-700-normal.woff'),
      fontFile('inter', 'inter-latin-500-normal.woff'),
      readFile(join(root, 'public', 'brand', 'logo-mark.svg')),
    ]);
    return {
      fonts: [
        { name: 'Outfit', data: outfit400, weight: 400, style: 'normal' },
        { name: 'Outfit', data: outfit700, weight: 700, style: 'normal' },
        { name: 'Inter', data: inter500, weight: 500, style: 'normal' },
      ],
      mark: `data:image/svg+xml;base64,${markSvg.toString('base64')}`,
    };
  })();
  return assets;
}

// Minimal element helper (satori accepts React-like plain objects).
type El = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, children?: unknown, extra = {}): El => ({
  type,
  props: { style, children, ...extra },
});

function card({ eyebrow, title }: OgProps, mark: string): El {
  const titleSize = title.length > 48 ? 60 : 72;
  return h(
    'div',
    {
      width: 1200,
      height: 630,
      display: 'flex',
      position: 'relative',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '60px 72px',
      backgroundColor: '#0A0E1A',
      backgroundImage: 'radial-gradient(circle at 88% 40%, rgba(59,91,255,0.32), rgba(10,14,26,0) 46%)',
      color: '#F5F7FB',
      fontFamily: 'Inter',
    },
    [
      // Large decorative mark on the right
      h('img', { position: 'absolute', right: 80, top: 165, width: 300, height: 300 }, undefined, { src: mark }),
      // Logo row
      h('div', { display: 'flex', alignItems: 'center', gap: 16 }, [
        h('img', { width: 52, height: 52 }, undefined, { src: mark }),
        h('div', { display: 'flex', fontFamily: 'Outfit', fontSize: 40, letterSpacing: -1 }, [
          h('span', { fontWeight: 700 }, 'bright'),
          h('span', { fontWeight: 400 }, 'stack'),
        ]),
      ]),
      // Eyebrow + title
      h('div', { display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 760 }, [
        h('div', { fontSize: 28, color: '#00D4FF', fontWeight: 500 }, eyebrow),
        h(
          'div',
          { fontFamily: 'Outfit', fontWeight: 700, fontSize: titleSize, lineHeight: 1.08, letterSpacing: -2 },
          title,
        ),
      ]),
      // Footer row
      h('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, [
        h('div', {
          width: 180,
          height: 8,
          borderRadius: 8,
          backgroundImage: 'linear-gradient(90deg, #00D4FF, #3B5BFF, #A855F7)',
        }),
        h('div', { fontSize: 26, color: '#A3ABBD' }, 'brightstack.pk'),
      ]),
    ],
  );
}

export const GET: APIRoute = async ({ props }) => {
  const { fonts, mark } = await loadAssets();
  const svg = await satori(card(props as OgProps, mark) as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts,
  });
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
