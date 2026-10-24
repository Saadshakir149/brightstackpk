// POST /api/contact — Cloudflare Pages Function.
// Validates the enquiry server-side, verifies Cloudflare Turnstile, then
// emails it via Resend. All keys come from environment variables (see README).
import {
  BUDGET_OPTIONS,
  COUNTRY_OPTIONS,
  HONEYPOT_FIELD,
  SERVICE_OPTIONS,
  TURNSTILE_ACTION,
  labelFor,
  validateContact,
  type ContactData,
  type FieldErrors,
} from '../../src/lib/contact';

interface Env {
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  /** Where enquiries are sent. Comma-separated for several inboxes. */
  CONTACT_TO_EMAIL?: string;
  /** Sender on a domain verified in Resend, e.g. "Brightstack Website <website@brightstack.pk>". */
  CONTACT_FROM_EMAIL?: string;
  /** Optional override, only for local testing against a mock. */
  RESEND_API_URL?: string;
}

type ErrorCode = 'validation' | 'captcha' | 'forbidden' | 'too_large' | 'bad_request' | 'config' | 'send';
type Result = { ok: true } | { ok: false; error: ErrorCode; fields?: FieldErrors };

const MAX_BODY_BYTES = 64 * 1024;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND_URL = 'https://api.resend.com/emails';

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  // Browsers using the enhanced form ask for JSON; anything else (no-JS) gets a redirect.
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const reply = (status: number, body: Result): Response => {
    if (wantsJson) {
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
    const target = new URL(`/contact?form=${body.ok ? 'sent' : 'error'}#contact-form`, request.url);
    return Response.redirect(target.toString(), 303);
  };

  // Only accept posts from our own pages.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return reply(403, { ok: false, error: 'forbidden' });
  }

  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > MAX_BODY_BYTES) return reply(413, { ok: false, error: 'too_large' });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, error: 'bad_request' });
  }

  // Honeypot: bots fill every field. Pretend it worked so they move on.
  const trap = form.get(HONEYPOT_FIELD);
  if (typeof trap === 'string' && trap.trim() !== '') return reply(200, { ok: true });

  const { data, errors } = validateContact(form);
  if (!data) return reply(400, { ok: false, error: 'validation', fields: errors });

  const missing = (['TURNSTILE_SECRET_KEY', 'RESEND_API_KEY', 'CONTACT_TO_EMAIL', 'CONTACT_FROM_EMAIL'] as const).filter(
    (k) => !env[k],
  );
  if (missing.length > 0) {
    console.error(`[contact] Missing environment variables: ${missing.join(', ')}`);
    return reply(500, { ok: false, error: 'config' });
  }

  const token = form.get('cf-turnstile-response');
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return reply(400, { ok: false, error: 'captcha' });
  }
  const human = await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY!, request.headers.get('cf-connecting-ip'));
  if (human === 'unavailable') return reply(502, { ok: false, error: 'send' });
  if (!human) return reply(400, { ok: false, error: 'captcha' });

  const country = (request as { cf?: { country?: string } }).cf?.country;
  const sent = await sendEmail(data, env, country);
  if (!sent) return reply(502, { ok: false, error: 'send' });

  return reply(200, { ok: true });
};

/** true = human, false = rejected, 'unavailable' = could not reach Cloudflare. */
async function verifyTurnstile(token: string, secret: string, ip: string | null): Promise<boolean | 'unavailable'> {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  body.append('idempotency_key', crypto.randomUUID());

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(8000) });
    const outcome = (await res.json()) as { success?: boolean; action?: string; 'error-codes'?: string[] };
    if (!outcome.success) {
      console.warn(`[contact] Turnstile rejected token: ${(outcome['error-codes'] ?? []).join(', ')}`);
      return false;
    }
    // Tokens must come from this form's widget (test keys return an empty action).
    if (outcome.action && outcome.action !== TURNSTILE_ACTION) {
      console.warn(`[contact] Turnstile action mismatch: ${outcome.action}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[contact] Turnstile verification failed', err);
    return 'unavailable';
  }
}

async function sendEmail(data: ContactData, env: Env, visitorCountry?: string): Promise<boolean> {
  const countryLabel = labelFor(COUNTRY_OPTIONS, data.country);
  const services = data.services.map((s) => labelFor(SERVICE_OPTIONS, s)).join(', ') || 'Not specified';
  const budget = labelFor(BUDGET_OPTIONS, data.budget) || 'Not specified';
  const received = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  const rows: [string, string][] = [
    ['Name', data.name],
    ['Email', data.email],
    ['WhatsApp', data.whatsapp ?? 'Not provided'],
    ['Country', countryLabel],
    ['Services', services],
    ['Budget', budget],
  ];
  const meta = `Received ${received}${visitorCountry ? ` · sent from ${visitorCountry}` : ''} · brightstack.pk contact form`;

  const text = [
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Message:',
    data.message,
    '',
    '—',
    meta,
  ].join('\n');

  const waDigits = data.whatsapp ? internationalDigits(data.whatsapp, data.country) : '';
  const waLink = waDigits ? `https://wa.me/${waDigits}` : '';
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#0a0e1a">
<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e3e7f2;border-collapse:separate">
<tr><td style="padding:24px 24px 8px"><h1 style="margin:0;font-size:20px">New enquiry from ${esc(data.name)}</h1></td></tr>
<tr><td style="padding:8px 24px"><table role="presentation" width="100%" style="border-collapse:collapse;font-size:15px">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:6px 12px 6px 0;color:#4b5568;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${
        k === 'Email'
          ? `<a href="mailto:${esc(v)}">${esc(v)}</a>`
          : k === 'WhatsApp' && waLink
            ? `<a href="${esc(waLink)}">${esc(v)}</a>`
            : esc(v)
      }</td></tr>`,
  )
  .join('\n')}
</table></td></tr>
<tr><td style="padding:8px 24px 24px"><p style="margin:0 0 6px;color:#4b5568;font-size:14px">Message</p>
<div style="white-space:pre-wrap;font-size:15px;line-height:1.6;background:#f5f7fb;border-radius:8px;padding:14px">${esc(data.message)}</div></td></tr>
<tr><td style="padding:0 24px 24px;color:#4b5568;font-size:13px">${esc(meta)}. Reply to this email to answer ${esc(data.name)} directly.</td></tr>
</table></body></html>`;

  try {
    const res = await fetch(env.RESEND_API_URL || RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        from: env.CONTACT_FROM_EMAIL,
        to: env.CONTACT_TO_EMAIL!.split(',').map((s) => s.trim()).filter(Boolean),
        reply_to: data.email,
        subject: `New enquiry: ${data.name} (${countryLabel})`,
        text,
        html,
        tags: [{ name: 'source', value: 'website-contact' }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(`[contact] Resend error ${res.status}: ${(await res.text()).slice(0, 500)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[contact] Resend request failed', err);
    return false;
  }
}

/**
 * Digits for a wa.me link. Local UK/Pakistan numbers ("0300 1234567") get the
 * country code from the chosen country; anything else needs "+" or "00" to be linkable.
 */
function internationalDigits(phone: string, country: ContactData['country']): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0') && country === 'pk') return '92' + digits.slice(1);
  if (digits.startsWith('0') && country === 'uk') return '44' + digits.slice(1);
  return '';
}

/** Escape user input for HTML email bodies. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
