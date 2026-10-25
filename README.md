# brightstack.pk

Marketing website for Brightstack. Built with Astro, hosted on **Vercel**.
Project rules and design system live in [CLAUDE.md](CLAUDE.md).

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Local dev server at http://localhost:4321 (the contact form can't send here; see below) |
| `npm run build` | Type-check the site and the contact API, then build to `dist/` |
| `npm run check:api` | Type-check the Vercel Functions in `api/` only |

## Where things live

- `src/config.ts`: contact details, WhatsApp number, socials, navigation (change them in one place)
- `src/content/services/*.md` and `src/content/work/*.md`: service pages and case studies
- `src/components/ContactForm.astro`: the contact form (browser side)
- `api/contact.ts`: the form's server code (Vercel Function)
- `src/lib/contact.ts`: form fields, options and validation rules, shared by both sides
- `vercel.json`: clean URLs and security headers

## Deploying (Vercel)

The GitHub repo is connected to Vercel, so **every push to `main` deploys automatically**.
`vercel.json` already sets the build command (`npm run build`), the output folder (`dist`),
clean URLs (`/contact`, not `/contact.html`) and the security headers. Nothing else is needed.

To use your own domain: Vercel → your project → **Settings → Domains** → add `brightstack.pk`
and `www.brightstack.pk`, then add the DNS records Vercel shows at the company where you
registered the domain.

---

## Contact form setup

The form at `/contact` sends every enquiry to your inbox. It needs two services:

- **Cloudflare Turnstile** blocks spam bots. It's free, usually invisible to real visitors, and works on any host, including Vercel.
- **Resend** sends the email. The free plan covers 3,000 emails a month.

You'll set **five values** in Vercel. Keys never go in the code.

| Name | Where it comes from |
| --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | Turnstile **site key** (public, used in the page) |
| `TURNSTILE_SECRET_KEY` | Turnstile **secret key** |
| `RESEND_API_KEY` | Resend API key (starts with `re_`) |
| `CONTACT_TO_EMAIL` | Inbox that receives enquiries, e.g. `brightstack.pk@gmail.com` |
| `CONTACT_FROM_EMAIL` | Sender, e.g. `Brightstack Website <website@brightstack.pk>` |

> **Until `PUBLIC_TURNSTILE_SITE_KEY` is set,** the contact page shows WhatsApp and email
> instead of the form (and the build log says so). The site still deploys; it just never
> shows a form that can't send.

### 1. Create the Turnstile widget (≈ 3 minutes)

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) (a free account is enough; your site does **not** need to be hosted on Cloudflare).
2. Go to **Turnstile** → **Add widget**. Name: `brightstack.pk contact form`.
3. Hostnames: add `brightstack.pk` and your Vercel address (e.g. `brightstackpk.vercel.app`).
4. Widget mode: **Managed**. Click **Create**.
5. Copy the **Site key** and **Secret key**. You need both in step 3.

### 2. Set up Resend (≈ 10 minutes, plus DNS time)

1. Sign up at [resend.com](https://resend.com).
2. **Domains → Add domain** → `brightstack.pk`. Add the DNS records Resend shows (SPF, DKIM and an MX for bounces)
   at your domain provider, then click **Verify**. This usually takes minutes, sometimes a few hours.
3. **API Keys → Create API key**: name `brightstack-website`, permission **Sending access**, domain `brightstack.pk`.
   Copy it now; Resend only shows it once.
4. Use a sender on that domain for `CONTACT_FROM_EMAIL`, e.g. `Brightstack Website <website@brightstack.pk>`.
   The address doesn't need a real mailbox. Replies go straight to the customer, because each
   email's *Reply-To* is set to the visitor's address.

> **Before your domain is verified** you can test with `CONTACT_FROM_EMAIL="Brightstack <onboarding@resend.dev>"`,
> but Resend only delivers that to the email address your Resend account uses.

### 3. Add the values to Vercel

1. Vercel → your project → **Settings → Environment Variables**.
2. Add all five values from the table above for **Production** (and **Preview** if you want the form on preview links).
   Mark `TURNSTILE_SECRET_KEY` and `RESEND_API_KEY` as **Sensitive**.
3. Go to **Deployments** → the latest one → **⋯ → Redeploy**. Variables only apply to new deployments.

### 4. Test it live

1. Open `https://brightstack.pk/contact` (or your `vercel.app` address), fill in the form and send.
2. You should see *"Thanks! We'll reply within 24 hours"*, and the email should land in `CONTACT_TO_EMAIL` within a minute.
   Check spam the first time and mark it "Not spam".
3. If you get *"Sorry, your message didn't send"*: Vercel → your project → **Logs**, filter by `/api/contact`, and send again:
   - `Missing environment variables: ...`: a value from step 3 is missing (or you didn't redeploy).
   - `Resend error 403/422`: the sender domain isn't verified, or the API key has no access to it.
   - `Turnstile rejected token`: the site and secret keys come from different widgets, or the hostname isn't listed in the widget.

### Testing the form on your computer

`npm run dev` doesn't run the Vercel Function, so sending there always shows the error state. That's a
handy way to see the WhatsApp fallback. To test real sending locally, install the Vercel CLI
(`npm i -g vercel`), run `vercel link` once, then `vercel env pull` and `vercel dev`.

Cloudflare's Turnstile test keys (safe to share), useful for local and preview testing:

| | Site key | Secret key |
| --- | --- | --- |
| Always passes | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` |
| Always fails | `2x00000000000000000000AB` | `2x0000000000000000000000000000000AA` |

### How the form protects you

- **Spam:** Turnstile verifies every submission on the server, a hidden "honeypot" field catches simple bots, and posts from other websites are refused.
- **Validation:** the browser and the server use the same rules (`src/lib/contact.ts`). The server never trusts the browser.
- **Safe emails:** everything a visitor types is escaped, so they can't inject links or code into your inbox.
- **Never a fake "sent":** if Resend or a setting is broken, visitors see the error state, with a button that opens WhatsApp with their message already filled in.
