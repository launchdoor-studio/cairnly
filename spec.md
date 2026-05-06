# Project Spec — Cairnly

> Version 0.2 · Draft · Owner: Aftaab · Domain: cairnly.app
> This document is the single source of truth for product, engineering, and design decisions. Anything not in this document is not yet decided. Coding agents (Claude Code, Cursor, etc.) MUST read this file before generating code.

---

## 1. Vision

A self-hosted CRM that a solo founder, freelancer, or 2–3 person team can install in **under 60 seconds** with one command, that looks and feels better than any tool they're paying for, and that keeps every byte of their customer data on a server they control.

We are not building "SuiteCRM but free." SuiteCRM is what we are reacting against. We are building the CRM that a designer-developer would build for themselves: small, fast, opinionated, beautiful, and AI-native — but with all AI processing optionally local so privacy is real, not marketing.

### One-line pitch

> The CRM that respects your data, your taste, and your time. Self-host it in 60 seconds.

### Why now

- Twenty CRM proved there's appetite for a modern OSS CRM but it's still complex to self-host and aimed at teams.
- SuiteCRM/EspoCRM are technically free but visually 2010 and operationally painful.
- HubSpot and Salesforce keep raising prices and tightening data export.
- Local LLMs (Llama 3.x, Qwen, Phi) are now good enough for CRM-shaped tasks: scoring, drafting, summarization, classification.

### Name & brand story

A **cairn** is a stack of stones that hikers and mountaineers build to mark a trail when there's no obvious path. It's hand-stacked, deliberate, calm, and human-scale — every stone placed by someone who came before. The "-ly" suffix follows the Calendly / Plausibly / Bitly pattern and reads in plain English as "in the manner of a cairn."

**The brand story:**

> Every call, email, note, and meeting is a stone. Together they form the cairn — the legible path of a relationship. Cairnly is the CRM that marks the path.

**Tagline candidates** (final pick TBD):

- "Mark the path."
- "The CRM that marks the path."
- "A small CRM that respects your data, your taste, and your time."
- "Every relationship leaves a path. Cairnly helps you see it."

The metaphor anchors every downstream decision: calm visual language, warm earthy color palette, AI as helper-not-replacement (the AI helps you stack stones; it never walks the path for you), and self-hosted-first ethos (your cairn lives on your land).

---

## 2. Target user (v1)

**Primary: solo founders, freelancers, indie consultants, and 1–3 person teams** who:

- Care about privacy and data ownership (will self-host).
- Are technically comfortable enough to run `docker compose up`.
- Are tired of tools that look like they were designed in 2014.
- Manage 50–5,000 contacts and 5–500 active deals.

**Explicit non-targets (v1):**

- Enterprise sales teams with 50+ users.
- Companies needing complex territory management, quota planning, or commission tracking.
- Regulated industries needing HIPAA/SOC2 attestations out of the box (we will be HIPAA/SOC2-*friendly* in posture, not certified).

If a feature only matters at >25 users, it does not ship in v1. Ever.

---

## 3. Non-goals

We say "no" loudly so we can say "yes" beautifully. **None of these are in v1:**

- Multi-tenant SaaS infrastructure (single-tenant by design; managed hosting comes later as a separate offering).
- Customizable role matrix (RBAC has 3 fixed roles: Owner, Member, Viewer).
- A drag-and-drop dashboard builder. We ship one good dashboard, not a builder.
- Workflow / automation builder UI in v1 (automations are defined as code in `automations.ts`; UI builder is v2).
- Mobile native apps (PWA only in v1).
- White-labeling.
- Plugins / marketplace.
- A built-in calling system (Twilio integration only).
- Document e-sign.
- Custom report builder. We ship ~8 reports that matter.

---

## 4. Unique selling points (USPs)

Three pillars. Every product decision must reinforce at least one.

### USP 1: One-command self-hosting

`curl -fsSL https://<domain>/install.sh | sh` produces a running, TLS-enabled, backed-up CRM on a fresh VPS in under 60 seconds. The `install.sh` script:

- Detects the host (Docker / Podman / bare).
- Generates secrets, writes a `.env`, brings up the stack with `docker compose`.
- Provisions Caddy as the reverse proxy with auto-TLS.
- Creates a daily Postgres dump cron and a one-line restore command.
- Prints the URL and the admin invite link.

Marketing line: **"The CRM that just runs."**

### USP 2: Unified inbox + CRM (one timeline per person)

Every interaction with a contact — email, SMS, WhatsApp, calendar event, note, call log, form submission — lands in **one chronological timeline** on the contact record. No switching tabs. No "communications" subsection. The contact view *is* the inbox view.

Channels for v1:

- IMAP/SMTP for email (any provider).
- Gmail OAuth (one-click).
- A public webhook endpoint per workspace (for forms, Zapier, n8n, anything).
- Calendar (CalDAV + Google).

v2: Twilio (SMS), WhatsApp Business API, LinkedIn (manual paste flow only — no scraping).

### USP 3: AI-native, privacy-respecting

Every AI feature works in three modes the user picks per workspace:

1. **Local** — Ollama / llama.cpp endpoint. Default suggestion: `llama-3.1-8b-instruct` for drafting, `nomic-embed-text` for embeddings.
2. **BYO key** — User provides OpenAI / Anthropic / Mistral / Groq key.
3. **Off** — All AI features hidden, no model calls ever made.

AI features (v1):

- Smart compose for email replies (suggest 3 reply variants, tone selectable).
- Lead scoring (model classifies contacts into Hot/Warm/Cold based on activity + custom rubric).
- Smart search (natural language → filtered list, e.g. "founders in NYC who haven't replied in 2 weeks").
- Auto-enrichment from email signature (parse name, title, company, phone from incoming email signatures).
- Meeting summary from pasted transcript.

AI features (v2): voice notes → tasks, weekly digest, follow-up nudges, duplicate detection.

**Hard rules:** every AI call is logged in an `ai_audit_log` table the user can browse and purge. AI features are opt-in per workspace, not opt-out. No telemetry on prompts. Ever.

---

## 5. Tech stack

| Layer | Choice | Why |
|---|---|---|
| **Language** | TypeScript everywhere | One language across web, server, workers, CLI. |
| **Frontend framework** | Next.js 15 (App Router, RSC) | Best DX, server components reduce JS shipped, easy self-host. |
| **API layer** | tRPC v11 | End-to-end type safety without code-gen; shrinks the contract surface. |
| **DB** | PostgreSQL 16 | Battle-tested, JSONB for custom fields, FTS for search, `pg-boss` for queues. |
| **ORM** | Drizzle | Lightweight, SQL-first, edge-friendly, no migrations magic. |
| **Queue** | `pg-boss` | Postgres-backed jobs → no Redis dependency for self-hosters. |
| **Search** | Postgres FTS + `pg_trgm` | Avoids Meilisearch dependency. Switch to Meilisearch only if FTS isn't enough at >10k contacts. |
| **Auth** | Lucia v3 (or Better-Auth) | Self-hosted, supports email/password, magic link, OAuth, passkeys. No third-party auth lock-in. |
| **Email send** | Nodemailer over SMTP | User brings their own SMTP. Postmark/Resend supported via env. |
| **Email receive** | IMAP IDLE worker + Gmail OAuth pull | Worker process per workspace mailbox. |
| **File storage** | Local FS by default; S3-compatible (MinIO, R2, S3) optional | Default to FS so self-hosters need zero extra services. |
| **Reverse proxy** | Caddy | Automatic HTTPS, simplest config. |
| **CSS / styling** | Tailwind v4 + shadcn/ui (copy-in components) | Maximum control, zero runtime, easy to customize. |
| **Component primitives** | Radix UI (under shadcn) | Accessibility for free. |
| **Icons** | Lucide | Consistent, tree-shakeable. |
| **Forms** | React Hook Form + Zod | Shared schema between client/server. |
| **Validation** | Zod | Single source of truth, used in tRPC routers and forms. |
| **Tables** | TanStack Table v8 | Headless, performant, supports virtualization. |
| **Charts** | Recharts (or visx) | Recharts default for speed; switch to visx if we need custom. |
| **Drag-and-drop** | dnd-kit | Lightweight, accessible. |
| **Animation** | Framer Motion (motion/react) | For tasteful micro-interactions only. |
| **Testing** | Vitest + Playwright | Fast unit + reliable E2E. |
| **Lint/format** | Biome | Faster than ESLint+Prettier; one config. |
| **Container** | Docker + docker-compose | Single source of truth for local + prod. |
| **CI** | GitHub Actions | Free for OSS. |
| **Marketing site** | Astro + Tailwind | Static, fast, MDX for content. Separate from app for clarity. |
| **Docs** | Astro Starlight or Fumadocs | Lives in monorepo. |
| **Analytics (opt-in)** | PostHog self-hosted (optional) or none | We never collect telemetry from self-hosted instances. |

### Stack-level rules

- **No Redis in v1.** Adding it doubles the install footprint. Revisit only if pg-boss becomes a bottleneck.
- **No Kafka / no microservices.** This is a monolith with workers. Forever, if we can help it.
- **No tRPC + REST mix.** All app traffic = tRPC. A small public REST API is added separately (`/api/v1/...`) for webhooks, integrations, mobile clients.
- **Postgres is the only stateful service.** Everything else must be stateless or local-disk.
- **The app must boot with no external services configured** (no SMTP, no AI, no S3). Every integration is optional and degrades gracefully.

---

## 6. Monorepo structure

Use `pnpm` workspaces + `turbo` for build orchestration.

```
/
├── apps/
│   ├── web/                  # Next.js app (the CRM itself)
│   ├── marketing/            # Astro site (landing, pricing, blog)
│   ├── docs/                 # Astro Starlight (self-hosting + API docs)
│   └── cli/                  # tsx-based admin CLI (`crm migrate`, `crm reset-password`)
├── packages/
│   ├── db/                   # Drizzle schema, migrations, seed
│   ├── api/                  # tRPC routers (imported by apps/web)
│   ├── ui/                   # shadcn components, design tokens, Tailwind preset
│   ├── core/                 # Domain logic (deals, contacts, scoring) — pure TS, no Next
│   ├── ai/                   # LLM provider abstractions + prompt templates
│   ├── email/                # IMAP/SMTP/Gmail connectors + parser
│   ├── jobs/                 # pg-boss job definitions
│   ├── automations/          # Code-defined workflow engine
│   └── config/               # Shared tsconfig, biome, tailwind base
├── docker/
│   ├── Dockerfile            # Multi-stage: base → deps → builder → runner
│   ├── docker-compose.yml    # App + Postgres + Caddy
│   └── install.sh            # One-line installer
├── .github/workflows/
└── spec.md                   # This file
```

### Rules

- `packages/core` may not import from any `apps/*`.
- `packages/api` may import `core`, `db`, `ai`, `email`, `jobs`. Nothing else.
- `apps/web` may import everything in `packages/`.
- `apps/marketing` and `apps/docs` are independent — they may *not* import `packages/api` or `packages/db`. They can import `packages/ui` for design parity.
- All cross-package imports use TypeScript path aliases (`@crm/db`, `@crm/ui`, etc.).

---

## 7. Architecture

```
            ┌───────────────────────────────────────┐
            │         Caddy (reverse proxy)         │
            │     auto-TLS · /app · /api · /docs    │
            └──────────────────┬────────────────────┘
                               │
          ┌────────────────────┼─────────────────────┐
          │                    │                     │
   ┌──────▼──────┐      ┌──────▼─────┐       ┌──────▼─────┐
   │  Next.js    │      │  Public    │       │  Workers   │
   │  (RSC + UI) │◀────▶│  REST /api │       │  (pg-boss) │
   │  + tRPC     │      │  /v1       │       │            │
   └──────┬──────┘      └──────┬─────┘       └──────┬─────┘
          │                    │                    │
          └────────────┬───────┴────────┬───────────┘
                       │                │
                ┌──────▼──────┐  ┌──────▼──────┐
                │ PostgreSQL  │  │  Local FS / │
                │ (db, queue, │  │  S3 (files) │
                │  audit log) │  │             │
                └─────────────┘  └─────────────┘
                       │
                ┌──────▼───────────────┐
                │  Optional services   │
                │  · Ollama (local AI) │
                │  · IMAP / SMTP       │
                │  · OpenAI / Anthropic│
                └──────────────────────┘
```

### Key architectural choices

- **Single Node process** runs Next.js + tRPC + REST + workers (configurable: split workers via env flag for scale).
- **Workspace-scoped data**: every table has a `workspace_id`. Single binary supports multi-workspace if the operator wants it; default install is one workspace.
- **Soft-delete by default** for contacts, deals, notes (audit-friendly). Hard delete is an explicit admin action.
- **Audit log is append-only**. Every mutation goes through a `recordEvent()` helper that writes to `events` table. This is also how the contact timeline is built — single events table backs both audit and timeline.

---

## 8. Data model (v1, abbreviated)

```ts
workspace        (id, name, settings, ai_config, created_at)
user             (id, email, name, password_hash, role, workspace_id)
session          (id, user_id, expires_at)

contact          (id, workspace_id, type{person|company}, name, primary_email,
                  primary_phone, company_id?, owner_id, score, created_at, ...)
contact_field    (id, contact_id, key, value, value_type)         -- custom fields
tag              (id, workspace_id, name, color)
contact_tag      (contact_id, tag_id)

deal             (id, workspace_id, title, contact_id, pipeline_id, stage_id,
                  amount_cents, currency, expected_close_date, owner_id, status)
pipeline         (id, workspace_id, name, archived)
stage            (id, pipeline_id, name, position, probability)

task             (id, workspace_id, title, due_at, done_at, contact_id?, deal_id?, owner_id)
note             (id, workspace_id, body_md, contact_id?, deal_id?, author_id)

event            (id, workspace_id, type, actor_id, contact_id?, deal_id?, payload jsonb, created_at)
                 -- types: email_received, email_sent, call_logged, stage_changed, note_added,
                 --        form_submission, ai_action, etc.

email_account    (id, workspace_id, provider, address, oauth_token, imap_config, sync_state)
email_message    (id, workspace_id, account_id, message_id, in_reply_to, subject,
                  from_addr, to_addrs, body_text, body_html, received_at, sent_at)

form             (id, workspace_id, name, slug, fields_json, redirect_url)
form_submission  (id, form_id, payload jsonb, contact_id?, created_at)

automation       (id, workspace_id, key, enabled, source_hash)   -- defined in code
ai_audit_log     (id, workspace_id, feature, model, tokens_in, tokens_out, prompt, created_at)
api_token        (id, workspace_id, hash, name, scopes, last_used_at)
```

Custom fields live in `contact_field` (EAV) for flexibility, plus a JSONB column for fast serialization. We'll revisit if perf becomes an issue.

---

## 9. Feature set

Features are scored: **MUST** (v1, ship-blocker), **SHOULD** (v1 if time), **LATER** (v2+), **NEVER** (out of scope).

### 9.1 Contact management

- MUST: Create, edit, soft-delete contacts (person + company).
- MUST: Standard fields (name, emails[], phones[], company, title, owner, tags, notes).
- MUST: Custom fields per workspace (text, number, date, single-select, multi-select, boolean, URL).
- MUST: CSV import with column mapping + dedupe preview.
- MUST: CSV export.
- MUST: Tagging.
- MUST: Full-text search across name, email, company, notes.
- SHOULD: Merge duplicate contacts.
- SHOULD: vCard export per contact.
- LATER: Bulk edit.
- LATER: Contact enrichment from public sources.

### 9.2 Pipelines & deals

- MUST: One default pipeline; create additional pipelines.
- MUST: Drag-and-drop Kanban view of deals by stage.
- MUST: Table view of deals (sortable, filterable).
- MUST: Deal record with linked contact, amount, expected close date, owner, stage history.
- MUST: Stage transition writes to event log.
- SHOULD: Forecast amount per stage (amount × probability).
- LATER: Multiple currencies with FX.
- LATER: Products / line items.
- NEVER (v1/v2): Quote builder, e-sign.

### 9.3 Tasks & calendar

- MUST: Task list per user (My Day, Upcoming, Overdue).
- MUST: Tasks linked to contact or deal.
- MUST: Calendar view (week + month).
- MUST: **Scheduling links** (Calendly-style). Public booking page per user (`/m/<handle>`), event types with duration/buffer/availability rules, calendar conflict checking, automatic contact creation on booking, automatic event added to deal/contact timeline. **This is a top-level USP and must ship in v1.**
- SHOULD: CalDAV two-way sync.
- SHOULD: Google Calendar OAuth sync.
- LATER: Group scheduling (round-robin), team availability.
- NEVER: Resource booking, room scheduling.

### 9.4 Email

- MUST: SMTP send (BYO).
- MUST: IMAP fetch (BYO).
- MUST: Gmail OAuth (one-click).
- MUST: Threaded conversation view inside contact timeline.
- MUST: Email templates with variable substitution (`{{contact.first_name}}`).
- MUST: Per-contact tracking pixel + link rewriting (opt-in per workspace).
- SHOULD: Sequence sender (drip 3–5 emails, paused on reply).
- LATER: Inbox triage view (unified inbox across accounts).
- NEVER: Mass mailing > 200/day. We are not Mailchimp.

### 9.5 Forms / lead capture

- MUST: Hosted public form per workspace (`/f/<slug>`).
- MUST: Embed snippet (script tag).
- MUST: Webhook receiver (`POST /api/v1/forms/<slug>`) → contact + event.
- SHOULD: Anti-spam (honeypot + rate limit; optional Turnstile env config).
- LATER: Multi-step forms.
- LATER: Conditional logic.

### 9.6 Dashboard

- MUST: One opinionated dashboard. Five panels:
  1. Pipeline value + forecast (this month / next 30 days).
  2. New contacts this week (sparkline + count).
  3. Tasks due today.
  4. Recent activity (last 20 events).
  5. AI weekly digest (if AI enabled).
- LATER: Widget customization.
- NEVER: Drag-and-drop dashboard builder.

### 9.7 Reports

Eight reports, hand-picked. No builder.

- MUST: Pipeline by stage.
- MUST: Conversion funnel (lead → qualified → won).
- MUST: Win/loss by reason.
- MUST: Revenue by month.
- MUST: Contacts by source.
- SHOULD: Activity by user (calls/emails/meetings).
- SHOULD: Average deal cycle time.
- SHOULD: Aging deals (deals stuck > N days in a stage).
- MUST: Each report exports to CSV. PDF export uses headless Chrome (`@sparticuz/chromium`) running in worker.

### 9.8 Automations (code-defined)

- MUST: A single `automations.ts` file in the user's data directory loaded at boot.
- MUST: 6–8 built-in triggers: `onContactCreated`, `onEmailReceived`, `onStageChanged`, `onTaskCompleted`, `onFormSubmitted`, `onDealWon`, `onDealLost`, `onSchedule(cron)`.
- MUST: SDK-shaped helpers: `assignOwner`, `addTag`, `sendEmail`, `createTask`, `setField`, `score`, `webhook`.
- MUST: Hot-reload on file change (in dev) or admin "reload automations" button.
- LATER: Visual builder.

### 9.9 Security & access

- MUST: Three roles: Owner, Member, Viewer.
- MUST: Email + password with strong hashing (argon2id).
- MUST: Magic link login.
- MUST: Passkey support (WebAuthn).
- MUST: Sessions in DB; revoke on password change.
- MUST: Field-level encryption helper for sensitive custom fields (AES-GCM with key from env).
- MUST: Audit log of every mutation.
- MUST: API tokens with scopes.
- SHOULD: TOTP 2FA.
- SHOULD: SSO via OIDC (single OIDC provider env-config for v1; multi-IdP later).
- LATER: SAML.
- LATER: IP allowlist.

### 9.10 Self-hosting

- MUST: One-line installer.
- MUST: docker-compose.yml with 3 services (app, postgres, caddy).
- MUST: `crm` CLI: `migrate`, `seed`, `backup`, `restore`, `reset-password`, `health`.
- MUST: Daily Postgres dump + 7-day local rotation.
- MUST: Health endpoint `/healthz`.
- MUST: Graceful shutdown with job draining.
- MUST: Telemetry **off by default**. If on, only counts (workspaces, version), no PII, no prompts.
- SHOULD: One-click upgrade (`./install.sh upgrade`).

---

## 10. AI layer (detail)

### Provider abstraction

```ts
// packages/ai/src/provider.ts
interface AiProvider {
  complete(opts: CompleteOpts): Promise<{ text: string; tokens: Usage }>;
  embed(text: string): Promise<number[]>;
  capabilities: { streaming: boolean; tools: boolean; vision: boolean };
}
```

Implementations: `OllamaProvider`, `OpenAiProvider`, `AnthropicProvider`, `GroqProvider`, `MistralProvider`. The user picks one in workspace settings; we feature-detect and gray out features the chosen provider can't support.

### Prompt discipline

- All prompts live in `packages/ai/prompts/*.ts` as named, versioned exports (`smartReply.v3`).
- Every call records `(feature, prompt_version, model, tokens, latency_ms)` in `ai_audit_log`.
- We never include other contacts' data in a prompt that's about a single contact (no cross-contact leakage).
- Prompt budget per feature is hard-capped (e.g. smart reply: 4k input tokens max).

### Local-first defaults

- If the user picks "Local," we test the endpoint at save-time and refuse to save if unreachable.
- We ship recommended Ollama model commands in the docs (`ollama pull llama3.1:8b-instruct`).
- A "low-resource mode" flag silently downgrades to smaller models (`phi3.5:mini`).

---

## 11. UI/UX guidelines — the app

### Design philosophy

Linear, Notion, Raycast, Vercel dashboard, Twenty (the good parts), Cron / Notion Calendar. Dense without feeling cramped. Keyboard-first. Delightful in 100ms moments, calm everywhere else.

### Visual language

- **Type**: Inter Variable for UI; JetBrains Mono for code/IDs.
- **Density**: 14px base body, 13px in tables, 12px in metadata. Line height 1.4–1.5.
- **Spacing scale**: 4 / 8 / 12 / 16 / 24 / 32 / 48 (Tailwind defaults).
- **Radius**: 6px for inputs, 8px for cards, 12px for modals. Never fully pill except for tags.
- **Borders**: 1px, `border` token only — no shadows for separation in light mode.
- **Shadows**: One soft shadow for elevated panels, none for cards. Avoid drop shadows that create depth chaos.
- **Color**: Two themes (light + dark), built on OKLCH tokens. Neutral palette is warm-gray (zinc), not cool slate. Brand accent: a single hue picked at naming time. No more than 3 status colors (success / warning / danger).
- **Motion**: 120–200ms ease-out for state changes. No bouncy springs. Reduce-motion respected.

### Design tokens (themes & colors)

**Brand color: Cairnly Amber.** A warm terracotta-leaning amber that reads as dawn light on stone. Chosen to contrast with the cold-blue SaaS norm (Salesforce, HubSpot, Linear) and to reinforce the hand-crafted, earthy, alpine ethos. Defined in OKLCH for perceptual uniformity across themes.

```ts
// Brand — Cairnly Amber
amber-50:  oklch(0.97 0.02 60)
amber-100: oklch(0.94 0.04 60)
amber-200: oklch(0.88 0.08 58)
amber-300: oklch(0.80 0.12 55)
amber-400: oklch(0.72 0.15 52)
amber-500: oklch(0.64 0.16 50)   // primary
amber-600: oklch(0.56 0.16 48)
amber-700: oklch(0.47 0.14 46)
amber-800: oklch(0.38 0.11 44)
amber-900: oklch(0.28 0.08 42)
amber-950: oklch(0.18 0.05 40)
```

**Neutrals: Tailwind `stone` palette.** Warm gray, literally named after stone — on-brand by name and visually. Used for backgrounds, borders, surfaces, body text. Cool slate / zinc are explicitly forbidden as neutrals — they fight the warmth of the brand.

**Status colors.** Success: emerald. Danger: red. Info: cyan-blue (rare; use sparingly). **No "warning" amber** to avoid collision with brand. If a warning is structurally needed, use a desaturated true yellow distinct from brand amber.

#### Light theme

| Token | Value | Usage |
|---|---|---|
| `--bg` | `oklch(0.99 0.003 60)` | App background |
| `--surface` | `oklch(0.97 0.005 60)` | Cards, side sheets |
| `--surface-hover` | `oklch(0.95 0.007 60)` | Hover state |
| `--border` | `stone-200` | Default borders |
| `--border-strong` | `stone-300` | Active/focused borders |
| `--text` | `stone-900` | Body text |
| `--text-muted` | `stone-500` | Secondary text |
| `--text-subtle` | `stone-400` | Tertiary, placeholders |
| `--accent` | `amber-500` | Primary buttons, links, CTAs |
| `--accent-hover` | `amber-600` | Primary hover |
| `--accent-fg` | `stone-50` | Text on accent |
| `--success` | `emerald-600` | Confirmations |
| `--danger` | `red-600` | Destructive actions |
| `--ring` | `amber-500/40` | Focus ring |

#### Dark theme

| Token | Value | Usage |
|---|---|---|
| `--bg` | `oklch(0.16 0.008 60)` | App background — deep, warm-tinted near-black |
| `--surface` | `oklch(0.20 0.008 60)` | Cards |
| `--surface-hover` | `oklch(0.24 0.010 60)` | Hover |
| `--border` | `stone-800` | Borders |
| `--border-strong` | `stone-700` | Active borders |
| `--text` | `stone-100` | Body text |
| `--text-muted` | `stone-400` | Secondary text |
| `--text-subtle` | `stone-500` | Tertiary |
| `--accent` | `amber-400` | Lighter for dark contrast |
| `--accent-hover` | `amber-300` | Hover |
| `--accent-fg` | `stone-950` | Text on accent (dark text on light amber) |
| `--success` | `emerald-400` | Confirmations |
| `--danger` | `red-400` | Destructive |
| `--ring` | `amber-400/40` | Focus ring |

#### Implementation rules

- Define tokens as CSS custom properties on `:root` and `:root.dark`. Tailwind v4's `@theme` directive consumes them, generating utilities like `bg-surface`, `text-muted`, `border-border`.
- **No hardcoded hex codes anywhere in component code.** Components reference tokens only.
- Auto-detect system theme on first visit; persist user override in localStorage. Marketing site mirrors the same palette so app and landing feel like one product.
- Theme toggle is keyboard-shortcut-able (`⌘\\`).
- All charts and status indicators must use color combinations meeting WCAG AA contrast at minimum, AAA for body text where reasonable.
- The Cairnly Amber primary should appear sparingly in the interface — it's a punctuation mark, not a wash. Most surfaces are neutral; amber is reserved for primary CTAs, active states, and brand moments.

### Interaction principles

- **`⌘K` is sacred.** Command palette opens from anywhere; navigates, creates, searches, runs AI actions. If a feature isn't reachable from `⌘K`, that's a bug.
- **`G` then letter** for Linear-style nav (`G C` = contacts, `G D` = deals, `G T` = tasks).
- **`C` to create** the contextual primary entity from anywhere.
- **`/` focuses search** when no input is active.
- **Optimistic UI** for every mutation. Rollback with toast on server failure.
- **No modals for common flows.** Side sheets (Linear-style) for editing entities.
- **Inline editing everywhere.** Click a field, edit, blur to save.
- **No "save" buttons in detail views.** Auto-save with debounce. Loud toast only on error.
- **Empty states are designed**, not stock illustrations. A short sentence + one button.
- **Loading states are skeletons**, not spinners, except for sub-200ms operations which show nothing.

### Layout

- **Three-pane shell**: nav rail (collapsible) · list pane · detail pane. Standard at ≥1280px; stacks at smaller breakpoints.
- **Detail pane is a side sheet on smaller breakpoints.**
- **Top bar is minimal**: workspace switcher, search trigger, create button, user menu. No primary navigation lives there.
- **Tables**: virtualized (TanStack Virtual), sticky header, column resize, column reorder, saved views.

### Accessibility

- WCAG 2.1 AA minimum. AAA for body text contrast where reasonable.
- Every interactive element keyboard-reachable.
- Focus rings visible (use `ring-offset` patterns).
- ARIA via Radix primitives — don't roll our own.
- Tested with VoiceOver and NVDA before any release.

### Performance budget

- First contentful paint < 1.2s on a fresh load over 4G.
- LCP < 2.0s on contacts list with 1k contacts.
- INP < 200ms on every interactive surface.
- Bundle: < 200kb gzip JS for the contacts page (excluding dynamic imports).
- We measure these in CI with Lighthouse and fail PRs that regress > 10%.

---

## 12. UI/UX guidelines — the marketing site

A different beast from the app. Marketing site ≠ app aesthetic. It should feel like the *promise* the app delivers.

### Tone

- Confident, never bro-y. "We respect your data" not "Big tech is watching you."
- Clear before clever. The hero says what the product is in <10 words.
- Show, don't tell — every claim has a screenshot or a 4-second video loop.

### Pages

1. **Home** — Hero (headline + 30s loom), 3 USP blocks, "self-host in one command" copy-paste box, social proof, comparison table, FAQ, CTA.
2. **Why self-host** — Privacy story, data ownership, cost comparison vs. HubSpot/Salesforce.
3. **Features** — One scrollytelling page, sectioned by USP, with embedded short videos.
4. **AI** — Dedicated page on local-first AI with the three modes diagram.
5. **Pricing** — Free forever (self-hosted). Optional managed hosting later. Be radically clear.
6. **Docs** — Lives at `/docs`, separate Astro app but linked.
7. **Blog** — MDX, low frequency, high quality. Topics: privacy, self-hosting, CRM design.
8. **Compare** — vs. HubSpot, vs. Salesforce, vs. SuiteCRM, vs. Twenty CRM. Honest, not snide.
9. **Changelog** — Markdown-driven, single file rendered.
10. **About** — Solo / small team story. The "why" behind the project.

### Visual language (marketing)

- Fonts: a more characterful display font for the hero (e.g. Geist / Söhne / Tobias), Inter for body.
- More white space than the app.
- Big, real product screenshots — not abstract gradients.
- Dark and light theme; auto-detect, persist choice.
- One signature animation for the hero (subtle, no parallax abuse).
- Performance: 100/100 Lighthouse. No third-party scripts except a privacy-friendly analytics (Plausible / Umami).

---

## 13. Coding instructions (for human + agent contributors)

This section is read by Claude Code, Cursor, and any other AI coding agent. **Treat these as inviolable defaults. Deviating requires a comment explaining why.**

### General

1. **TypeScript strict.** No `any`. No `// @ts-ignore` without a comment explaining the failure mode.
2. **Zod schemas at every boundary.** Database boundary, API boundary, form boundary. Infer types from Zod, not the other way around.
3. **Pure functions in `packages/core`.** No DB, no fetch, no Date.now() in pure logic. Inject side effects.
4. **Server components by default** in `apps/web`. Add `"use client"` only when needed (forms, interactive widgets).
5. **No raw SQL except in Drizzle migrations** unless performance demands it. If raw SQL is used, comment with the reason.
6. **Don't hand-roll components that exist in shadcn/ui.** Copy them in. Customize the copy.
7. **Errors are values.** Use a `Result<T, E>` style at module boundaries; throw only for genuinely unexpected conditions.
8. **Logs are structured.** Use pino. No `console.log` in committed code (linter blocks it).
9. **Every public function in `packages/api` must have a Zod input + output schema.** No exceptions.
10. **Every email-sending code path must check `workspace.email_settings.enabled` and respect a global "test mode" flag.**

### File & code conventions

- File names: `kebab-case.ts` for modules, `PascalCase.tsx` for React components.
- One default export per file; named exports preferred.
- Components live with their tests: `Button.tsx` + `Button.test.tsx`.
- Tailwind classes ordered with the official Prettier plugin (we run via Biome's tailwind sort).
- No magic numbers in code. Constants in a `constants.ts` file per package.

### Database & migrations

- Every migration is reviewed. Never autogenerate-and-push.
- Never drop a column in the same release as removing the code that uses it. Two-phase: stop writing → ship → stop reading → ship → drop.
- All timestamps are `timestamptz`, stored as UTC, named with `_at` suffix.
- All money is `bigint` of cents, never float.
- All IDs are `text` (cuid2), not auto-increment integers (predictable IDs leak business volume).

### API design

- tRPC routers grouped by resource (`contactRouter`, `dealRouter`).
- Every mutation returns the updated entity, not just `ok: true`.
- Public REST API (`/api/v1/...`) is *separate* from tRPC — versioned, documented, with OpenAPI generated from Zod.
- Rate limit every public endpoint (token bucket per API key).

### Testing

- Vitest unit tests for `packages/core` aim for >80% coverage. Other packages: pragmatic.
- Playwright E2E covers: signup, create contact, create deal, move deal across stages, send email, install AI provider, run automation. Each one is a separate spec file.
- Snapshot tests are forbidden except for serialized JSON outputs.
- Every bug fix lands with a regression test.

### Security defaults

- All cookies: `Secure`, `HttpOnly`, `SameSite=Lax` (or `Strict` for auth).
- CSP enforced (no inline scripts; nonces for needed inline).
- All file uploads: type sniffed server-side, never trust client mime, size-capped, virus-scan hook.
- All user-supplied HTML rendered with DOMPurify on the server.
- All redirects validated against an allowlist.
- All emails sent with SPF/DKIM guidance baked into the docs.

### Agent-specific instructions

When using a coding agent to implement a feature:

- **Always start by reading this `spec.md`.** The agent's first action on a new task is to read this file.
- **Read `apps/web/src/app/(crm)/contacts/page.tsx` (or the closest analog) before writing similar code** to match patterns.
- **Never invent new packages.** If something feels like it needs a new package, post in the issue first.
- **Never add a new dependency without justification in the PR description.** If a 50-line utility solves it, write 50 lines.
- **Never widen a Zod schema to make a test pass.** Fix the caller.
- **Comments answer "why," not "what."** Code answers "what."
- **Keep PRs <400 lines of diff.** If unavoidable, structure with commit boundaries.
- **Run `pnpm check` (typecheck + biome + tests) locally before declaring done.**
- **When unsure, ask in the PR description, don't guess.**

---

## 14. Development workflow

- `main` is always deployable.
- Feature branches: `type/short-description` (e.g. `feat/contact-merge`, `fix/imap-reconnect`).
- Conventional commits.
- PRs require: green CI, passing types, passing tests, screenshot for any UI change, changelog entry for user-visible change.
- Releases tag `v0.x.y` and produce a Docker image `ghcr.io/<org>/<name>:vX.Y.Z`.
- Changelog is markdown, written by the human, reviewed in the PR — not auto-generated.

---

## 15. Roadmap (agent-assisted; aggressive)

Calendar weeks, assuming primary work is done with coding agents and one human reviewer.

**v0.1 — Private alpha (weeks 1–6)**
Repo + monorepo plumbing, auth (email/password + magic link), contacts, companies, tags, custom fields, deals, pipelines, Kanban + table views, tasks, calendar view, one dashboard, CSV import/export, Docker install with Caddy auto-TLS, `crm` CLI with backup/restore. No email, no AI yet.

**v0.2 — Public beta (weeks 7–12)**
SMTP/IMAP, Gmail OAuth, threaded conversation in contact timeline, email templates, hosted forms + webhook receiver, code-defined automations, **scheduling links (booking pages)**, AI layer (BYO key only — OpenAI / Anthropic / Mistral / Groq), reports, audit log UI, passkeys.

**v0.3 — 1.0 readiness (weeks 13–18)**
Local Ollama provider, sequence sender, OIDC SSO, polished marketing site + docs, comparison content, comprehensive E2E tests, accessibility audit, perf budget enforcement, demo seed data, launch.

**v1.0 — Public launch (week 18–20)**
Stable schema, migration guarantees, semver, Show HN / Product Hunt / Hacker News.

**v1.5 — Mobile (~3 months post-1.0)**
Expo native shell over PWA. iOS + Android via TestFlight + Play Console. Push notifications, offline read-only.

**v2.0 — Bigger ambitions**
WhatsApp / SMS via Twilio, automation visual builder, multi-IdP SSO, advanced enrichment, partner-managed hosting tier.

---

## 16. Decisions log

Decisions are made; constraints below are committed. Reversal requires a PR that updates this file.

- **Scheduling links → v1 MUST.** Promoted from SHOULD. Single biggest hook for solo founders ("replace Calendly + your CRM in one tool"). Agent-assisted dev keeps the cost reasonable.
- **Distribution model: strictly OSS until 6 months post-1.0.** No managed hosting from us in v1 era. Funding via GitHub Sponsors button only (no Stripe, no payment infra needed). Once we have demonstrated demand, we partner with existing one-click PaaS hosts (Coolify, PikaPods, Elestio, Railway templates) and revisit a thin managed tier.
- **Search: Postgres FTS + `pg_trgm` through 1.0.** A thin `SearchProvider` interface in `packages/core/search/` lets us swap implementations. Meilisearch is a future opt-in env flag, not a v1 dependency.
- **No SQLite.** Postgres-only. We leverage JSONB, FTS, partial indexes, and `pg-boss` — all Postgres-native. The 60-second installer makes Postgres effectively zero-friction.
- **License: AGPLv3.** Confirmed. Contributors sign a CLA so we retain the option to relicense future paid features (open-core path).
- **Mobile: PWA in v1; native Expo shell committed for v1.5 (target 2026-Q4).** Agent acceleration makes a thin Expo shell over the PWA realistic. v2.0 will have a fuller native experience with offline support and push notifications.
- **Project name + domain: Cairnly · cairnly.app.** Acquired. Optional `cairnly.dev` may later redirect to docs. Brand etymology and storytelling are documented in §1; full color tokens in §11.
- **Brand color: Cairnly Amber.** Warm terracotta-leaning amber. Full OKLCH scale and theme tokens committed in §11. Neutrals are Tailwind `stone` (warm gray, on-brand by name and feel). Cool slate / zinc are forbidden as neutrals.

---

## 17. How to use this doc

- This file lives at the repo root.
- Anyone (human or agent) starting a task on this project reads this file first.
- Changes to scope, stack, or architecture come with a PR that updates this file *first*, code second.
- The "Non-goals" and "Coding instructions" sections are treated as constraints, not suggestions.

End of spec v0.1.
