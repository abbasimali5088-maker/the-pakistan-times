#!/usr/bin/env bash
# Vercel build: generate client + Next build.
# Migrations are attempted but do NOT fail the deploy (Supabase direct host often P1001 on Vercel).
# After first Ready deploy, set Session pooler URLs and run: npx prisma migrate deploy
set -euo pipefail

echo "==> prisma generate"
npx prisma generate

echo "==> prisma migrate deploy (best-effort)"
if npx prisma migrate deploy; then
  echo "Migrations applied."
else
  echo "WARNING: prisma migrate deploy failed."
  echo "Fix Vercel env: use Supabase Session pooler for DATABASE_URL and DIRECT_DATABASE_URL, then Redeploy or run migrate deploy."
fi

echo "==> next build"
npx next build
