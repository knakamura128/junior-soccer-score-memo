# Deployment Guide

## 1. Vercel Project

1. Import this GitHub repository into Vercel.
2. In Vercel, add a Postgres integration from the Marketplace.
3. Confirm that `DATABASE_URL` is injected into the project.
4. Add these environment variables in Vercel Project Settings:
   - `DATABASE_URL`
   - `LINE_CHANNEL_ID`
   - `NEXT_PUBLIC_LIFF_ID`

## 2. LINE LIFF Settings

1. Open the LINE Developers Console.
2. Select your LINE Login channel.
3. Add a LIFF app.
4. Set `Endpoint URL` to your Vercel production URL, for example `https://your-app.vercel.app`.
5. Enable at least these scopes:
   - `openid`
   - `profile`

## 3. Prisma Migration

This repository already includes the initial migration in `prisma/migrations/202603181200_init/migration.sql`.

For local verification:

```bash
npx prisma generate
npx prisma migrate deploy
```

For Vercel build/deploy:

- The app build already runs `prisma generate`.
- Run `npx prisma migrate deploy` against the production database before first release, or from a trusted CI step.

## 4. Recommended Release Flow

1. Set all Vercel environment variables.
2. Run `npx prisma migrate deploy` against the target Postgres database.
3. Deploy the app on Vercel.
4. Update the LIFF `Endpoint URL` if your production URL changed.
5. Open the LIFF URL and confirm:
   - LINE login succeeds
   - match save works
   - created/updated by fields are recorded

## 5. Local Environment

Create `.env.local` from `.env.example`.

```bash
cp .env.example .env.local
```

Then set:

- `DATABASE_URL`
- `LINE_CHANNEL_ID`
- `NEXT_PUBLIC_LIFF_ID`
