# دی پاکستان ٹائمز اردو — News CMS

Professional **Backend + Admin Panel + Public Frontend** for **دی پاکستان ٹائمز اردو** / **The Pakistan Times**.

This project preserves the concepts from the original HTML prototypes (`uploads/`) and upgrades them to a production-oriented Next.js CMS with SQLite, JWT sessions, roles/permissions, and an API-first architecture.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite (`data/dev.db`)
- Secure cookie sessions (JWT + hashed session rows)
- Admin at `/admin` · Public site at `/` · API under `/api/*`

## Quick start

```bash
npm install
npx prisma migrate deploy   # or: npx prisma db push
npm run db:seed
npm run dev
```

Open:

- Public site: http://127.0.0.1:4321
- Admin: http://127.0.0.1:4321/admin
- Health: http://127.0.0.1:4321/api/health
- API docs: http://127.0.0.1:4321/api/docs

### Default admin

- Email: `admin@thepakistantimes.local`
- Password: `pak123` (change immediately)

## Environment

Copy from `.env`:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite path |
| `JWT_SECRET` | Session signing |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed admin |
| `NEXT_PUBLIC_SITE_URL` | Absolute URLs / SEO |
| `NEXT_PUBLIC_SITE_NAME_UR` / `_EN` | Brand names |

## What was preserved from the HTML prototype

- Brand identity and green accent `#0B7A3B`
- Bilingual EN/UR article fields
- Theme / nav / custom code settings concepts
- Categories (Pakistan, World, Business, Sports, …)
- LIVE / breaking presentation concepts
- Password-protected admin (now real users + hashed passwords)

## Architecture notes

- **Do not destroy** working modules — extend via migrations
- Public frontend is loosely coupled and consumes `/api/*`
- Multi-site (`Site`) and multi-language (`language` + `translationOfId`) are schema-ready
- Background jobs table supports scheduled publish, sitemap, backups

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server on port **4321** |
| `npm run db:seed` | Seed roles, categories, sample news |
| `npm run jobs:run` | Process due background jobs |
| `npm run build` | Production build |

## License

Private project — All rights reserved.
