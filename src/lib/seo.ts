import { SITE_URL } from '../config';

/**
 * Public URL path for the current page. With build.format 'file' Astro reports
 * "/contact.html" and "/index.html" at build time; visitors (and canonicals)
 * use "/contact" and "/".
 */
export function cleanPath(pathname: string): string {
  const p = pathname.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/\/+$/, '');
  return p || '/';
}

export interface Crumb {
  label: string;
  href: string;
}

/** BreadcrumbList JSON-LD matching the visible <Breadcrumbs> trail. */
export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: new URL(c.href, SITE_URL).href,
    })),
  };
}
