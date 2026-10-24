import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// Case-study categories, used for /work filters and to link services to work.
export const WORK_CATEGORIES = ['websites', 'ai', 'branding', 'social'] as const;

// Services: AI Systems, Web & Mobile Apps, Social Media Growth.
const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    // Short, result-focused summary for cards and meta descriptions.
    summary: z.string(),
    icon: z.enum(['ai', 'apps', 'social']),
    // The pain this service removes, in the customer's words.
    problem: z.string(),
    // Plain-language outcomes this service delivers.
    outcomes: z.array(z.string()),
    // What we actually build, in non-technical terms.
    includes: z.array(z.string()),
    // Concrete examples for the kinds of businesses we serve.
    examples: z.array(z.string()),
    timeline: z.string(),
    // "Starting from" prices. Keep the placeholders until real prices are set.
    priceFrom: z.object({ gbp: z.string(), pkr: z.string() }),
    // Which /work category shows related case studies.
    workCategory: z.enum(WORK_CATEGORIES),
    order: z.number().default(0),
    draft: z.boolean().default(false),
  }),
});

// Case studies shown under /work. Images live in src/assets/work/ so
// Astro optimizes them (drop in JPG/PNG/WebP and update the path).
const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // Client type shown on cards, e.g. "Accountancy firm".
      client: z.string(),
      city: z.string().optional(),
      country: z.string().optional(),
      categories: z.array(z.enum(WORK_CATEGORIES)).min(1),
      // One-line, plain-language result for cards.
      result: z.string(),
      // Link to the live project ("Visit the live site").
      liveUrl: z.url().optional(),
      summary: z.string(),
      image: image(),
      imageAlt: z.string(),
      challenge: z.string(),
      solution: z.array(z.string()).min(1),
      // Headline metrics shown as big numbers. Only real, client-approved numbers.
      results: z
        .array(z.object({ value: z.string(), label: z.string() }))
        .default([]),
      gallery: z.array(z.object({ src: image(), alt: z.string() })).default([]),
      testimonial: z
        .object({ quote: z.string(), name: z.string(), role: z.string() })
        .optional(),
      services: z.array(z.string()),
      // Shown small at the bottom of the case study.
      tech: z.array(z.string()).default([]),
      // Placeholder entries show a visible "sample content" notice.
      placeholder: z.boolean().default(false),
      order: z.number().default(0),
      draft: z.boolean().default(false),
    }),
});

export const collections = { services, work };
