# دی پاکستان ٹائمز اردو — News CMS

Professional **Frontend + Backend + Admin Panel + PostgreSQL + APIs** for **دی پاکستان ٹائمز اردو** / **The Pakistan Times**.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Prisma + **PostgreSQL**
- Secure cookie sessions (JWT + hashed session rows)
- Admin at `/admin` · Public site at `/` · API under `/api/*`

## Local development

### 1. PostgreSQL

Create a database, then set `DATABASE_URL` **and** `DIRECT_DATABASE_URL` in `.env` (see `.env.example`). Locally both can be the same Postgres URL.

```bash
# example local DB
createdb pakistan_times
```

### 2. Install & migrate

```bash
cp .env.example .env
# edit DATABASE_URL, DIRECT_DATABASE_URL, JWT_SECRET, ADMIN_* 

npm install
npm run db:deploy
npm run db:seed
npm run dev
```

Open:

- Public: http://127.0.0.1:4355
- Admin: http://127.0.0.1:4355/admin/login
- Health: http://127.0.0.1:4355/api/health
- API docs: http://127.0.0.1:4355/api/docs

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server (port 4355) |
| `npm run build` | Generate client + migrate + production build |
| `npm run start` | Production server (port 4355) |
| `npm run db:deploy` | Apply Prisma migrations (`migrate deploy`) |
| `npm run db:seed` | Seed roles, categories, sample news |
| `npm run verify:prod` | Smoke-test DB + auth + APIs against running server |
| `npm run jobs:run` | Process due background jobs |

## Production / Vercel

See **[DEPLOY.md](./DEPLOY.md)** for GitHub → PostgreSQL → Vercel → live URLs.

## Default admin (after seed)

Set via `ADMIN_EMAIL` / `ADMIN_PASSWORD` in env before seeding.  
Change the password immediately after first login.

## License

Private project — All rights reserved.
