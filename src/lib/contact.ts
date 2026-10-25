// Contact form: options, limits and validation shared by the browser
// (inline validation) and the Vercel Function (api/contact.ts),
// so client and server always apply exactly the same rules.

export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  whatsapp: 30,
  messageMin: 10,
  message: 5000,
} as const;

export const COUNTRY_OPTIONS = [
  { value: 'uk', label: 'United Kingdom' },
  { value: 'pk', label: 'Pakistan' },
  { value: 'other', label: 'Other' },
] as const;

export const SERVICE_OPTIONS = [
  { value: 'ai', label: 'AI Systems' },
  { value: 'apps', label: 'Web & Mobile Apps' },
  { value: 'social', label: 'Social Media Growth' },
  { value: 'unsure', label: 'Not sure yet' },
] as const;

// Budget brackets the client chooses from (their budget, not our prices).
export const BUDGET_OPTIONS = [
  { value: 'unsure', label: 'Not sure yet' },
  { value: 'under-1k', label: 'Under £1,000 · under PKR 350k' },
  { value: '1k-3k', label: '£1,000–£3,000 · PKR 350k–1M' },
  { value: '3k-10k', label: '£3,000–£10,000 · PKR 1M–3.5M' },
  { value: '10k-plus', label: '£10,000+ · PKR 3.5M+' },
] as const;

/** Turnstile action name; the server rejects tokens issued for any other action. */
export const TURNSTILE_ACTION = 'contact';

/** Hidden field real people never fill in. */
export const HONEYPOT_FIELD = 'company_website';

export type FieldName = 'name' | 'email' | 'whatsapp' | 'country' | 'services' | 'budget' | 'message';
export const FIELD_ORDER: FieldName[] = ['name', 'email', 'whatsapp', 'country', 'services', 'budget', 'message'];

export interface ContactData {
  name: string;
  email: string;
  whatsapp?: string;
  country: (typeof COUNTRY_OPTIONS)[number]['value'];
  services: (typeof SERVICE_OPTIONS)[number]['value'][];
  budget?: (typeof BUDGET_OPTIONS)[number]['value'];
  message: string;
}

export type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;
const PHONE_CHARS_RE = /^\+?[\d\s().-]+$/;

// Derived from FormData itself so this works with both DOM and Workers types.
type Entry = ReturnType<FormData['get']>;

const text = (v: Entry): string => (typeof v === 'string' ? v : '');
/** Single-line value: control characters removed, whitespace collapsed. */
const line = (v: Entry): string =>
  text(v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
/** Multi-line value: keep newlines, drop other control characters. */
const block = (v: Entry): string =>
  text(v)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();

const isOneOf = <T extends string>(value: string, options: readonly { value: T }[]): value is T =>
  options.some((o) => o.value === value);

export function labelFor(options: readonly { value: string; label: string }[], value?: string): string {
  return options.find((o) => o.value === value)?.label ?? '';
}

/** Validate submitted form data. Returns cleaned data only when there are no errors. */
export function validateContact(form: FormData): { data: ContactData | null; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const name = line(form.get('name'));
  if (!name) errors.name = 'Please enter your name.';
  else if (name.length > CONTACT_LIMITS.name) errors.name = `Please keep your name under ${CONTACT_LIMITS.name} characters.`;

  const email = line(form.get('email')).toLowerCase();
  if (!email) errors.email = 'Please enter your email address.';
  else if (email.length > CONTACT_LIMITS.email || !EMAIL_RE.test(email))
    errors.email = 'Please enter a valid email address, like name@example.com.';

  const whatsapp = line(form.get('whatsapp'));
  if (whatsapp) {
    const digits = whatsapp.replace(/\D/g, '').length;
    if (whatsapp.length > CONTACT_LIMITS.whatsapp || !PHONE_CHARS_RE.test(whatsapp) || digits < 7 || digits > 15)
      errors.whatsapp = 'Please enter a valid number with country code, like +92 300 1234567.';
  }

  const country = line(form.get('country'));
  if (!isOneOf(country, COUNTRY_OPTIONS)) errors.country = 'Please choose where your business is based.';

  const services = [...new Set(form.getAll('services').map((v) => line(v)))].filter(Boolean);
  if (!services.every((s) => isOneOf(s, SERVICE_OPTIONS))) errors.services = 'Please choose from the listed services.';

  const budget = line(form.get('budget'));
  if (budget && !isOneOf(budget, BUDGET_OPTIONS)) errors.budget = 'Please choose a budget from the list.';

  const message = block(form.get('message'));
  if (!message) errors.message = 'Please tell us a little about what you need.';
  else if (message.length < CONTACT_LIMITS.messageMin)
    errors.message = `Please add a bit more detail (at least ${CONTACT_LIMITS.messageMin} characters).`;
  else if (message.length > CONTACT_LIMITS.message)
    errors.message = `Please keep your message under ${CONTACT_LIMITS.message.toLocaleString('en-GB')} characters.`;

  if (Object.keys(errors).length > 0) return { data: null, errors };

  return {
    data: {
      name,
      email,
      whatsapp: whatsapp || undefined,
      country: country as ContactData['country'],
      services: services as ContactData['services'],
      budget: (budget || undefined) as ContactData['budget'],
      message,
    },
    errors,
  };
}
