This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Follow Up Boss (FUB) Lead Sync

This project sends every newly captured lead to Follow Up Boss by default.

- Buyer pages are sent as `General Inquiry`
- Seller pages are sent as `Seller Inquiry`
- Dispatch happens after the lead is saved locally; failures do not block form submission

### Required environment variables

Add these to your `.env`:

```bash
FUB_ENABLED=true
FUB_API_KEY=your_fub_api_key
FUB_SYSTEM=your_registered_system_name
FUB_SYSTEM_KEY=your_registered_system_key
```

### Optional tuning variables

```bash
FUB_API_BASE_URL=https://api.followupboss.com
FUB_TIMEOUT_MS=8000
FUB_MAX_ATTEMPTS=3
FUB_INITIAL_BACKOFF_MS=750
FUB_INCLUDE_RAW_JSON=false
```
