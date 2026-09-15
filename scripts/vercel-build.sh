#!/usr/bin/env bash
# Vercel build — must succeed even when DATABASE_URL cannot connect (Supabase direct/IPv6).
# Migrations: run separately after Session pooler URLs are set: npx prisma migrate deploy
set -euo pipefail

echo "==> prisma generate"
npx prisma generate

echo "==> next build"
npx next build
