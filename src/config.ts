/* ============================================================
   Brightstack site configuration — single source of truth.
   Change contact details, social links and navigation here.
   ============================================================ */

export const SITE_URL =
  import.meta.env.PUBLIC_SITE_URL || 'https://brightstack.pk';

export const SITE_NAME = 'Brightstack';
export const SITE_TAGLINE = 'Bright ideas. Smart systems. Real growth.';
export const SITE_DESCRIPTION =
  'Websites, apps, AI systems and social media growth for small businesses in the UK and Pakistan. More customers, less manual work.';

/* ---- Contact -------------------------------------------------
   WHATSAPP_NUMBER: international format, digits only (no +, no spaces).
   PK number 0306 4840980 -> 92 306 4840980.
   Switch EMAIL to a branded address (e.g. hello@brightstack.pk) once
   domain email is set up; the gmail below is the live inbox today.
   -------------------------------------------------------------- */
export const WHATSAPP_NUMBER =
  import.meta.env.PUBLIC_WHATSAPP_NUMBER || '923064840980';
export const PHONE_DISPLAY = '+92 306 4840980';
export const EMAIL =
  import.meta.env.PUBLIC_CONTACT_EMAIL || 'brightstack.pk@gmail.com';

// Pre-filled WhatsApp message used by WhatsAppButton and CTAs.
export const WHATSAPP_MESSAGE =
  "Hi Brightstack, I'd like a free consultation.";

export function whatsappUrl(message: string = WHATSAPP_MESSAGE): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Convenience export for simple links.
export const WHATSAPP_URL = whatsappUrl();

/* ---- Social links (update handles as needed) ----------------- */
export const SOCIALS = {
  instagram: 'https://instagram.com/brightstack.pk',
  linkedin: 'https://www.linkedin.com/company/brightstack',
} as const;

/* ---- Navigation ----------------------------------------------
   NAV_MAIN: desktop header. NAV_TABS: mobile bottom tab bar.
   -------------------------------------------------------------- */
export const NAV_MAIN = [
  { label: 'Services', href: '/services' },
  { label: 'Work', href: '/work' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const;

export const NAV_TABS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Work', href: '/work' },
  { label: 'Contact', href: '/contact' },
] as const;

// Footer quick links.
export const FOOTER_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Work', href: '/work' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const;

// Organization JSON-LD, injected site-wide.
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    slogan: SITE_TAGLINE,
    email: EMAIL,
    logo: `${SITE_URL}/brand/icon-512.png`,
    areaServed: ['GB', 'PK'],
    sameAs: [SOCIALS.instagram, SOCIALS.linkedin],
  };
}
