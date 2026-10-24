# brightstack.pk

Marketing website for Brightstack. Built with Astro, deployed to Cloudflare Pages.
Project rules and design system live in [CLAUDE.md](CLAUDE.md).

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Local dev server at http://localhost:4321 (the contact form can't send here; see below) |
| `npm run build` | Type-check the site and the Pages Function, then build to `dist/` |
| `npm run preview:cf` | Serve `dist/` **with** the contact form API, exactly like Cloudflare does |
| `npm run check:functions` | Type-check `functions/` only |

## Where things live

- `src/config.ts`: contact details, WhatsApp number, socials, navigation (change them in one place)
- `src/content/services/*.md` and `src/content/work/*.md`: service pages and case studies
- `src/components/ContactForm.astro`: the contact form (browser side)
- `functions/api/contact.ts`: the form's server code (Cloudflare Pages Function)
- `src/lib/contact.ts`: form fields, options and validation rules, shared by both sides

---

## Contact form setup

The form at `/contact` sends every enquiry to your inbox. It needs two services:

- **Cloudflare Turnstile** blocks spam bots. It's free and usually invisible to real visitors.
- **Resend** sends the email. The free plan covers 3,000 emails a month.

You'll set **five values** in Cloudflare. Keys never go in the code.

| Name | Type | Where it comes from |
| --- | --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | Plain text | Turnstile **site key** (public, used in the page) |
| `TURNSTILE_SECRET_KEY` | **Secret** | Turnstile **secret key** |
| `RESEND_API_KEY` | **Secret** | Resend API key (starts with `re_`) |
| `CONTACT_TO_EMAIL` | Plain text | Inbox that receives enquiries, e.g. `brightstack.pk@gmail.com` |
| `CONTACT_FROM_EMAIL` | Plain text | Sender, e.g. `Brightstack Website <website@brightstack.pk>` |

> **The site will not build until `PUBLIC_TURNSTILE_SITE_KEY` is set.** This is on purpose: without it,
> every message would be rejected, so the build stops with a clear error instead of shipping a
> broken form.

### 1. Create the Turnstile widget (≈ 3 minutes)

1. Cloudflare dashboard → **Turnstile** → **Add widget**.
2. Name: `brightstack.pk contact form`.
3. Hostnames: add `brightstack.pk`. Also add your `<project>.pages.dev` address if you want the form to work on preview deployments.
4. Widget mode: **Managed**. Click **Create**.
5. Copy the **Site key** and **Secret key**. You need both in step 3.

### 2. Set up Resend (≈ 10 minutes, plus DNS time)

1. Sign up at [resend.com](https://resend.com).
2. **Domains → Add domain** → `brightstack.pk`. Resend shows a few DNS records (SPF, DKIM and an MX for bounces).
   If your DNS is on Cloudflare: **DNS → Records**, add each one exactly as shown, then click **Verify** in Resend.
   Verification usually takes a few minutes, sometimes up to a few hours.
3. **API Keys → Create API key**: name `brightstack-website`, permission **Sending access**, domain `brightstack.pk`.
   Copy it now; Resend only shows it once.
4. Use a sender on that domain for `CONTACT_FROM_EMAIL`, e.g. `Brightstack Website <website@brightstack.pk>`.
   The address doesn't need a real mailbox. Replies go to the customer automatically, because each
   email's *Reply-To* is set to the visitor's address.

> **Before your domain is verified** you can test with `CONTACT_FROM_EMAIL="Brightstack <onboarding@resend.dev>"`,
> but Resend only delivers that to the email address your Resend account uses.

### 3. Add the values to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → your project → **Settings** → **Variables and Secrets**.
2. For the **Production** environment, add all five values from the table above.
   - Choose **Secret** for `TURNSTILE_SECRET_KEY` and `RESEND_API_KEY`.
   - Choose **Text** for the other three. `PUBLIC_TURNSTILE_SITE_KEY` must be Text, because the build reads it.
3. Repeat for **Preview** if you want the form to work on preview links.
4. Go to **Deployments** → **Retry deployment** (or push a new commit). Variables only apply to new deployments.

### 4. Test it live

1. Open `https://brightstack.pk/contact`, fill in the form and send.
2. You should see *"Thanks! We'll reply within 24 hours"*, and the email should land in `CONTACT_TO_EMAIL` within a minute.
   Check spam the first time and mark it "Not spam".
3. If you get *"Sorry, your message didn't send"*: Cloudflare → your Pages project → **Functions** → **Real-time logs**,
   then send again. The logs explain exactly what's wrong:
   - `Missing environment variables: ...`: a value from step 3 is missing (or you didn't redeploy).
   - `Resend error 403/422`: the sender domain isn't verified, or the API key has no access to it.
   - `Turnstile rejected token`: the site and secret keys come from different widgets, or the hostname isn't listed in the widget.

### Testing the form on your computer

`npm run dev` doesn't run the Pages Function, so sending there always shows the error state. That's
a handy way to see the WhatsApp fallback. To test real sending locally:

1. Copy `.dev.vars.example` to `.dev.vars`. It's gitignored, so it never leaves your computer.
   It already contains Cloudflare's always-pass Turnstile test secret. Add your real `RESEND_API_KEY`.
2. Build with the matching test site key, then serve:
   ```bash
   # macOS / Linux / Git Bash
   PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build
   npm run preview:cf
   ```
   ```powershell
   # PowerShell
   $env:PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"; npm run build
   npm run preview:cf
   ```
3. Open http://localhost:8788/contact and send a message.

Cloudflare's Turnstile test keys (safe to share):

| | Site key | Secret key |
| --- | --- | --- |
| Always passes | `1x00000000000000000000AA` | `1x0000000000000000000000000000000AA` |
| Always fails | `2x00000000000000000000AB` | `2x0000000000000000000000000000000AA` |

### How the form protects you

- **Spam:** Turnstile verifies every submission on the server, a hidden "honeypot" field catches simple bots, and posts from other websites are refused.
- **Validation:** the browser and the server use the same rules (`src/lib/contact.ts`). The server never trusts the browser.
- **Safe emails:** everything a visitor types is escaped, so they can't inject links or code into your inbox.
- **Never a fake "sent":** if Resend or a setting is broken, visitors see the error state, with a button that opens WhatsApp with their message already filled in.
