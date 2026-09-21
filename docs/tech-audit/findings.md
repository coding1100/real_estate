## 1. Snapshot
Repository: coding1100/real_estate
Stack: TypeScript, Next.js 16, React 19, Prisma, PostgreSQL
Hosting: Vercel is configured; live hosting is UNKNOWN

## 2. Lead flow
S1 -> S3 -> S4 -> S5 and S6; optional S7

## 3. Systems

| ID | System | Category | Purpose | Evidence (file path) | Confidence | Owner or admin account | Access status | Cost basis seen in code | Cost visibility | Where client finds the bill | Overlap with new CRM |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | Next.js website | Website/CMS | Landing pages and admin | package.json; app/ | CONFIRMED | Unknown | Unknown | No pricing | Unknown | Hosting account | Partial |
| S2 | Vercel | Hosting/Infra | Deploys app and custom domains | README.md; lib/vercel-domains.ts | LIKELY | Vercel team ID variable | Unknown | API usage possible | Usage-based | Vercel billing | Partial |
| S3 | PostgreSQL | Data store | Stores pages, leads, users | prisma/schema.prisma; lib/prisma.ts | CONFIRMED | Unknown | Unknown | Provider only | Unknown | Database provider | Partial |
| S4 | Follow Up Boss | CRM | Receives submitted leads | lib/followupboss.ts; README.md | CONFIRMED | Unknown | Unknown | API integration only | Unknown | Follow Up Boss billing | Yes |
| S5 | Resend | Email/SMS | Sends lead and document emails | lib/notifications.ts; package.json | CONFIRMED | Unknown | Unknown | API key only | Usage-based | Resend billing | Partial |
| S6 | Google reCAPTCHA | Other | Checks form submissions | lib/captcha.ts; components/forms/DynamicForm.tsx | CONFIRMED | Unknown | Unknown | No plan shown | Unknown | Google Cloud billing | No |
| S7 | Configured webhooks | Automation | Sends lead payloads externally | lib/webhooks.ts; prisma/schema.prisma | CONFIRMED | Webhook destinations unknown | Unknown | Usage depends destination | Unknown | Destination vendor | Yes |
| S8 | Google Tag Manager | Analytics/SEO | Loads tracking container | app/layout.tsx | CONFIRMED | Unknown | Unknown | No plan shown | Unknown | Google account billing | No |
| S9 | Google Analytics 4 | Analytics/SEO | Tracks page and lead events | components/analytics/GoogleAnalytics.tsx; prisma/schema.prisma | CONFIRMED | Per-domain account unknown | Unknown | No plan shown | Free/open source | Google Analytics account | Partial |
| S10 | Vercel Analytics | Analytics/SEO | Tracks site analytics | app/layout.tsx; package.json | CONFIRMED | Vercel account unknown | Unknown | Package only | Unknown | Vercel billing | Partial |
| S11 | Vercel Speed Insights | Analytics/SEO | Tracks performance | app/layout.tsx; package.json | CONFIRMED | Vercel account unknown | Unknown | Package only | Unknown | Vercel billing | No |
| S12 | Cloudinary | Data store | Stores and delivers media | next.config.ts; lib/notifications.ts | CONFIRMED | Unknown | Unknown | API key not shown | Usage-based | Cloudinary billing | No |
| S13 | Bridge Data Output | Other | Provides property estimates | app/api/home-value/zestimate/route.ts | CONFIRMED | Unknown | Unknown | API key only | Unknown | Bridge billing | No |
| S14 | Zillow branding or links | Advertising | Displays Zillow social link | prisma/schema.prisma; lib/types/page.ts | LIKELY | Unknown | Unknown | No cost shown | Unknown | Unknown | No |
| S15 | GitHub | Source control/CI | Stores source repository | Repository URL; README.md | CONFIRMED | coding1100 | Personal account | No plan shown | Unknown | GitHub billing | No |
| S16 | NextAuth credentials | Other | Protects admin access | lib/auth.ts; prisma/schema.prisma | CONFIRMED | Unknown | Unknown | Open-source package | Free/open source | None shown | Partial |
| S17 | Google Fonts | Other | Loads selectable editor fonts | lib/editorFonts.ts; app/layout.tsx | CONFIRMED | Unknown | Unknown | No plan shown | Free/open source | None shown | No |
| S18 | AWS S3 and CloudFront | Hosting/Infra | Referenced by committed Bridge document | tmp_bridge_docs.html | LIKELY | Bridge organization | Vendor-owned | No app configuration | Unknown | Unknown | No |

## 4. Connections

| From (ID) | To (ID) | What flows across | Method (API, webhook, plugin, form post, DNS, other) | Confidence |
|---|---|---|---|---|
| S1 | S3 | Form fields and UTM data | Form post | CONFIRMED |
| S3 | S4 | Lead and contact data | API | CONFIRMED |
| S3 | S5 | Lead notification data | API | CONFIRMED |
| S3 | S7 | Lead payloads | Webhook | CONFIRMED |
| S1 | S6 | CAPTCHA token | API | CONFIRMED |
| S6 | S1 | Verification result | API | CONFIRMED |
| S1 | S8 | Tracking container script | Other | CONFIRMED |
| S1 | S9 | Measurement events | Other | CONFIRMED |
| S1 | S10 | Site telemetry | Other | CONFIRMED |
| S1 | S11 | Performance telemetry | Other | CONFIRMED |
| S1 | S12 | Image and document URLs | API | CONFIRMED |
| S1 | S13 | Address estimate request | API | CONFIRMED |
| S1 | S2 | Domain status and verification | API | CONFIRMED |
| S2 | S3 | Runtime database access | Other | LIKELY |
| S15 | S2 | Deployment source | Other | UNKNOWN |
| S18 | S1 | Referenced CDN and asset URLs | Other | LIKELY |

## 5. Access and control notes
- GitHub repository belongs to user `coding1100`; deploy ownership is UNKNOWN.
- Seed defaults include `admin@example.com`; production use is UNKNOWN. Evidence: `prisma/seed.ts`.
- Vercel team ownership uses optional `VERCEL_TEAM_ID`; actual team is UNKNOWN.
- Follow Up Boss, Resend, Cloudinary, Bridge, and Google owners are UNKNOWN.
- Webhook destination ownership is UNKNOWN; URLs are stored in database records.
- PostgreSQL location and administrator are UNKNOWN.
- One committed Bridge document names organization `Bridge` and support email. Evidence: `tmp_bridge_docs.html`.

## 6. Security flags
- Committed secret: `tmp_bridge_docs.html`, Bridge test dataset access token.
- CAPTCHA accepts submissions when `RECAPTCHA_SECRET_KEY` is missing. Evidence: `lib/captcha.ts`.
- Seed fallback password `change-me-please` exists in code. Evidence: `prisma/seed.ts`.
- Seed fallback admin email `admin@example.com` exists in code. Evidence: `prisma/seed.ts`.
- Secrets are referenced by environment names, not shown in source. Evidence: `README.md`; `lib/`.
- No `.env` files are tracked by ignore rules. Evidence: `.gitignore`.
- Dependency freshness was not verified from repository files alone. Evidence: `package.json`.
- No CODEOWNERS, workflow, Docker, Terraform, or DNS file was found at root scan.

## 7. Unknowns for the client

### S1, S2, S3
- Who owns the Vercel project and production deployment?
- Which PostgreSQL provider hosts production data?
- What are the production database backup and retention settings?

### S4
- Which Follow Up Boss account receives these leads?
- Who controls its API key and billing?
- Is Ylopo connected outside this repository?

### S5
- Which Resend account and verified sending domain are used?
- Who owns the sender address and billing?
- Are SMS messages sent by another vendor?

### S7
- Which webhook URLs are active in production?
- Do any webhooks send data to Zapier, Make, or n8n?
- Who owns and pays those destination accounts?

### S8, S9, S10, S11, S13
- Which Google account owns GTM container `GTM-W29MGBSS`?
- Which GA4 properties and advertising accounts use the site?
- Who owns the Bridge account and estimate API billing?

### S12, S14, S15, S18
- Which Cloudinary account stores production assets?
- Is Zillow an active integration or only a social link?
- Who controls GitHub repository administration and deployment credentials?
- Why is Bridge test documentation committed to this repository?

Total systems: 18
Total connections: 16
Three biggest unknowns: production hosting owner; database provider and backups; active CRM, email, and webhook owners.
