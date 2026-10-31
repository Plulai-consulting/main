# PlulAI Consulting: Next.js + Supabase (Step 1)

Included: marketing site (your existing design, served at `/`, `/marketing`, `/ai-consulting`, `/social-tool`), waitlist saved to a database, client signup/login, client portal (`/portal`), admin dashboard (`/admin`).
Step 2 adds: admin project creation and phase updates (`/admin/projects`), client project pages with a progress timeline, and live chat between client and team.
Step 3 adds: analytics (`/admin/analytics`), "awaiting reply" tracking, CSV export and email notifications for new messages.
Step 4 adds: the AI social media tool (`/portal/tool`) with a hidden quality-check loop, and admin controls (`/admin/tool`).
Step 5 adds: a guided discovery interview and a full strategy engine in front of the post generator.

**Database:** run `supabase/schema.sql` once. It contains steps 1 to 3 and is safe to run again. (Already set up earlier? Running the full file again is fine, or run only `step2.sql` / `step3.sql`.)

## 1. Supabase (free tier is enough to start)
1. Create a project at supabase.com.
2. SQL Editor: paste and run `supabase/schema.sql`.
3. Authentication > URL Configuration: set **Site URL** to your live address (use http://localhost:3000 while testing) and add `<your address>/auth/callback` under Redirect URLs.
4. Project Settings > API: copy the URL, anon key and service_role key.

## 2. Run locally
```
cp .env.example .env.local     # paste your three values
npm install
npm run dev                    # http://localhost:3000
```

## 3. Make yourself admin (admins are never created from the public site)
Sign up at `/signup`, confirm the email, then in the SQL Editor run:
```
update public.profiles set role='admin' where email='ceo@plulai.com';
```
Log in again: you are sent to `/admin`. To add a teammate, have them sign up, then run the same line for their email.

## 4. Deploy (Vercel)
Import the project, add the same three environment variables, deploy, then update the Supabase Site URL and Redirect URLs to your domain.

## Security notes
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. If it was ever shared or committed, rotate it in Supabase.
- Database rules (RLS) stop clients from reading other clients' data or changing their own role.
- Add rate limiting on `/api/waitlist` before heavy promotion (Vercel Firewall or Upstash).
- Turn on email confirmation in Supabase Auth (default) and consider a custom SMTP sender for reliable email delivery.

## Email notifications (step 3)
1. Create a Resend account, verify your domain, and set `RESEND_API_KEY` and `RESEND_FROM`.
2. Add `APP_URL`, `WEBHOOK_SECRET` (any long random string) and `ADMIN_NOTIFY_EMAIL` to your environment variables, then redeploy.
3. Supabase > Database > Webhooks > Create: table `messages`, event `Insert`, type HTTP Request, method POST, URL `https://your-domain.com/api/notify`, header `x-webhook-secret` set to the same secret.

A client message emails you. A team message or phase change emails the client. At most one email per project per direction every 10 minutes.

## AI tool (step 4)
Add the OpenAI and Higgsfield variables from `.env.example` to your hosting settings, run `supabase/schema.sql` again (safe), and redeploy.
- **Access:** the tool is off for everyone. Enable it per client in Admin > AI tool, and set their plans per month.
- **Your prompts:** edit `lib/ai/prompts.ts`. It holds the writing, quality-audit, fix and image-check prompts as plain text.
- **How quality works:** a plan is drafted, then checked by fixed rules (length, language, invented prices or contact details, avoided words, placeholders, duplicates) and by a second AI review. Problems are fixed and rechecked, up to three rounds. Only a plan that passes is ever saved where the client can read it. If it cannot pass, the client sees "our team is polishing your plan" and it lands in Admin > AI tool for your review. Images are checked by a vision model (no stray text, distorted hands or faces) and regenerated up to three times.
- **Images:** `IMAGE_PROVIDER=higgsfield` uses Higgsfield Marketing Studio Image. Set it to `openai` to use OpenAI images instead. Image generation can take a minute or more per image, so use a hosting plan that allows long-running functions (the image route asks for 300 seconds).
- **Cost control:** plans per client per month, one plan at a time per client, and images are made only after the text passes.
- **Limits:** no automatic check can guarantee zero mistakes. The review queue is the safety net, and clients should still read posts before publishing.

## Discovery interview + strategy (step 5)
Run `supabase/schema.sql` again (safe) or just `supabase/step5.sql`, then redeploy. No new environment variables.
- **Flow:** the client describes the business, then answers up to 3 adaptive rounds (5, then up to 6, then up to 4 questions). The interviewer tracks 8 areas (offer, customer, difference, goal, history, brand, limits, timing), skips what it already knows, challenges vague answers and stops when every area is understood. The answers become a structured client profile, the client confirms or corrects it, then the strategy and posts are built.
- **Strategy:** positioning, personas, 3 to 5 pillars (each with a "because you told us" line), platform roles, a 4-week calendar, KPIs, assumptions, risks and a "will not do" list. It is checked by fixed rules (shares total 100, 4 weeks, every claim traceable, no filler phrases, no invented contact details) and by an AI reviewer, fixed and rechecked up to three rounds. Posts are then written to follow that strategy and checked again (pillar names must match). Failures go to Admin > AI tool as before; the client never sees an unchecked plan.
- **Your prompts:** all of them live in `lib/ai/prompts.ts` (interview, profile, strategy, audit, fix). The code around them is in `lib/ai/strategy.ts`.
- **Old form:** posting a plain brief to `/api/tool/generate` still works, but `/portal/tool` now uses the interview.

## Project structure
```
app/(en)/            English public pages: /, /marketing, /ai-consulting, /social-tool, /[country]
app/(ar)/ar/         Arabic public pages (right-to-left), same routes under /ar
app/(app)/           The product: /login, /signup, /portal, /admin, /auth (never indexed)
app/api/             API routes (interview, generate, image, waitlist, notify, admin health)
app/sitemap.ts, robots.ts, llms.txt/, og/    SEO files and the share image
components/site/     Header, footer, waitlist, contact, and one component per page (components/site/pages)
components/          Tool and portal components (Interview, Results, Chat, ...)
content/             All website text: en.ts and ar.ts (same shape, so a missing translation is a type error)
lib/site/            Routes, SEO metadata and structured data helpers
lib/ai/              The AI system: prompts.ts, strategy.ts, pipeline.ts, openai.ts, ...
styles/site.css      Public website styles (light/dark, RTL)
public/assets/       Fonts and logos
```
- **Edit website text:** change `content/en.ts` and `content/ar.ts`. No build script is needed any more.
- **Add a country page:** add it to `COUNTRIES` and `SLUG` in `lib/site/routes.ts`, then add its text under `countries` in both content files.
- **Your domain:** set `NEXT_PUBLIC_SITE_URL` (for example `https://plulai.com`). It is used for canonical links, the sitemap and share images.
- **Header:** under 921px it becomes a menu button. The language switcher and the light/dark toggle stay visible.
- **SEO:** see `docs/SEO-PLAN.md`.

## Setup check (admin)
Admin > AI tool > Setup check tells you which keys are missing and whether the database step was run. It never shows key values. Add your keys in your hosting settings (names are in `.env.example`), redeploy, then run the check.

## Using another AI provider (no OpenAI credit needed)
The text AI (interview, strategy, posts) works with any OpenAI-compatible service. Put these in `.env.local` and restart:
```
AI_BASE_URL=https://openrouter.ai/api/v1      # OpenRouter. For Google Gemini: https://generativelanguage.googleapis.com/v1beta/openai
AI_API_KEY=your-key-from-that-provider
OPENAI_MODEL=the-model-id-you-picked          # OpenRouter: pick one marked Free on openrouter.ai/models, or openrouter/free
```
For providers other than OpenAI the tool asks for JSON in the prompt and checks every reply itself (retrying up to 3 times). Weaker or free models fail the checks more often, so plans can take longer or land in the admin review queue. Free tiers have daily request limits (one full plan uses roughly 8 to 15 requests) and may keep your prompts, so use them with test data, not real client information. Images are separate: they need Higgsfield (or OpenAI) keys and stay off until you add them.

## Stronger plans (step 9)
The interview now also asks about numbers (spend, volume, repeat rate) and real proof, and shows a short "what we noticed" note between rounds. The plan now includes: what is holding growth back (with the owner's own evidence), a concrete offer (built only from facts they gave; prices, guarantees and discounts are never invented and any decision only the owner can make is listed), 3 to 5 quick wins for the next 7 days, and a ready-to-send first reply for new enquiries. Each post also shows its format, objective and why it should work. Fixed rules reject any invented price, discount or contact detail. All wording is in `lib/ai/prompts.ts`.

## Offer, signature campaign and brand colors (step 10)
- **Offer:** now built on the Value Equation and Grand Slam Offer method (dream outcome, certainty, speed, low effort, a stacked bundle, a MAGIC-style name). Bonuses, guarantees, scarcity and price framing appear as proposals for the owner to approve and use placeholders instead of numbers. Posts only use the proven parts.
- **Campaign:** one signature campaign per plan (what everyone in the field does, the opposite move built from the owner's real strengths, why it is hard to copy, a participation mechanic, 4 weekly phases, a 48-hour test). The posts carry the campaign.
- **Brand colors:** the client picks up to 4 colors when starting. They are described in plain words for the image model, saved with the plan, and shown on the plan page.

## TypeScript (step 11)
The whole app is now TypeScript: pages and components are `.tsx`, API routes and logic are `.ts`. Run `npm run typecheck` to check types and `npm run build` to build. Settings are in `tsconfig.json` (strict mode on). AI replies and database rows are loosely typed on purpose (`any`) because their shape comes from the AI and from your tables. `next.config.js` stays JavaScript because Next 14 does not support a TypeScript config file. The old unused `BriefForm` component was removed (the interview replaced it).
