import type { WORK_CATEGORIES } from '../content.config';

export type WorkCategory = (typeof WORK_CATEGORIES)[number];

// Labels for the /work filters, in display order.
export const CATEGORY_LABELS: Record<WorkCategory, string> = {
  websites: 'Websites',
  ai: 'AI',
  branding: 'Branding',
  social: 'Social',
};

/** "Multan, Pakistan", "United Kingdom", or undefined when unknown. */
export function place(data: { city?: string; country?: string }): string | undefined {
  return [data.city, data.country].filter(Boolean).join(', ') || undefined;
}
