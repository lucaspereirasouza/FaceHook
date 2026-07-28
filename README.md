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

## Production configuration

Copy `.env.example` into your deployment environment and configure every value there. Never commit `.env` files, the Supabase service-role key, a Facebook access token, or `FACEHOOK_ENCRYPTION_KEY`.

The application stores Facebook access tokens encrypted with AES-256-GCM and stores only SHA-256 digests of the browser session and OAuth state values. Keep `FACEHOOK_ENCRYPTION_KEY` in a managed secret store and use a stable value until stored connections have been re-encrypted during a planned key rotation.

Before deployment:

- Apply the migrations in `supabase/migrations` to the target Supabase project.
- Configure `NEXT_PUBLIC_APP_URL` to the exact HTTPS application origin and register its `/api/auth/facebook/callback` path with Meta.
- Set `SUPABASE_SERVICE_ROLE_KEY` only in server-side deployment secrets; it must never have a `NEXT_PUBLIC_` prefix.
- Enable a secret-scanning check in the repository host and run `pnpm lint` plus `pnpm build` in CI.

## Live Supabase Verification

With the application running locally and `.env.local` configured, provide `FACEHOOK_TEST_ACCESS_TOKEN` for a dedicated Meta test account only for the command invocation:

```bash
FACEHOOK_TEST_ACCESS_TOKEN=your-test-token pnpm verify:live-supabase
```

The verifier authenticates through the application, confirms protected API access, and checks that Supabase contains encrypted Facebook token data and a hashed opaque session value. It never prints tokens, cookies, service-role keys, or database credential values. Use a non-production Supabase project because the test creates a real app session for the supplied Facebook account.
