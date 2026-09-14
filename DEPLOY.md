# Production Deploy Guide — دی پاکستان ٹائمز اردو

## Status (verified in this environment)

Project code is **production-ready** for GitHub → Neon PostgreSQL → Vercel:

- PostgreSQL only (no SQLite)
- `prisma migrate deploy` on build (`vercel-build`)
- Auth, Admin, APIs, Settings/social, SEO verified locally (`npm run verify:prod` → all checks pass)
- `vercel.json`, `.env.example`, Prisma `directUrl` + Vercel binary target ready

**What still needs your accounts (cannot be done without Neon/Vercel login):** create Neon DB, create/import GitHub repo on Vercel, paste env vars, deploy, run one-time `npm run db:seed` against production DB.

اس گائیڈ کے بعد آپ کے پاس **Live Website + Admin Panel + PostgreSQL + APIs** ہوں گے۔

---

## A) PostgreSQL setup (سب سے پہلے)

کوئی ایک منتخب کریں:

### Option 1 — Neon (آسان، Vercel کے ساتھ بہترین)

1. [neon.tech](https://neon.tech) پر account بنائیں  
2. New project → database بنائیں  
3. دو connection strings کاپی کریں:
   - **Pooled** → `DATABASE_URL` (Vercel serverless کے لیے)
   - **Direct** → `DIRECT_DATABASE_URL` (Prisma migrations کے لیے)
4. دونوں میں `?sslmode=require` رکھیں

### Option 2 — Supabase / Vercel Postgres

اسی طرح pooled + direct URLs حاصل کریں۔ اگر صرف ایک URL ملے تو دونوں env vars میں وہی URL ڈالیں۔

مثال شکل:

```
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
DIRECT_DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

---

## B) GitHub

1. Cursor میں **Create repo** سے GitHub repository بنائیں (اگر ابھی temp ہے)  
2. Confirm `main` branch push ہے  
3. GitHub پر repo کھول کر files دیکھ لیں: `prisma/`, `vercel.json`, `.env.example`, `DEPLOY.md`

---

## C) Vercel environment variables

[vercel.com](https://vercel.com) → **Add New Project** → اپنے GitHub repo کو **Import** کریں۔

**Settings → Environment Variables** میں یہ سب ڈالیں (Production + Preview):

| Name | Example / notes |
|------|------------------|
| `DATABASE_URL` | Neon **pooled** URL (`sslmode=require`) |
| `DIRECT_DATABASE_URL` | Neon **direct** URL (migrations) |
| `JWT_SECRET` | لمبا random secret (مثلاً `openssl rand -hex 32`) |
| `ADMIN_EMAIL` | آپ کا admin email |
| `ADMIN_PASSWORD` | مضبوط پاس ورڈ (صرف پہلی seed کے لیے) |
| `ADMIN_NAME` | `Super Admin` |
| `NEXT_PUBLIC_SITE_NAME_UR` | `دی پاکستان ٹائمز اردو` |
| `NEXT_PUBLIC_SITE_NAME_EN` | `The Pakistan Times` |
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR-PROJECT.vercel.app` (بعد میں custom domain بھی) |
| `NEXT_PUBLIC_API_BASE` | `/api` |
| `UPLOAD_MAX_MB` | `10` |
| `COOKIE_SECURE` | خالی چھوڑیں یا `true` (HTTPS پر) |

**Framework Preset:** Next.js  
**Build Command:** `npm run vercel-build` (vercel.json میں پہلے سے ہے)  
**Install Command:** `npm install`

Deploy کریں۔ Build کے دوران:

1. `prisma generate`  
2. `prisma migrate deploy` (tables بنیں گی — `DIRECT_DATABASE_URL` استعمال ہوتا ہے)  
3. `next build`

---

## D) پہلی مرتبہ seed (admin + sample data)

Vercel serverless پر seed خود نہیں چلتی۔ ایک بار چلائیں:

```bash
export DATABASE_URL="postgresql://...pooled-or-direct..."
export DIRECT_DATABASE_URL="postgresql://...direct..."
export ADMIN_EMAIL="admin@yourdomain.com"
export ADMIN_PASSWORD="your-strong-password"
export JWT_SECRET="same-as-vercel"
npm run db:seed
```

Seed roles، categories، menus، sample articles اور admin user بناتا ہے۔

---

## E) Live URLs

Deploy کے بعد Vercel آپ کو URL دے گا:

- **Website:** `https://YOUR-PROJECT.vercel.app`
- **Admin:** `https://YOUR-PROJECT.vercel.app/admin/login`
- **Health:** `https://YOUR-PROJECT.vercel.app/api/health`
- **API docs:** `https://YOUR-PROJECT.vercel.app/api/docs`

Login:

- Email = `ADMIN_EMAIL`
- Password = `ADMIN_PASSWORD` (جو seed میں استعمال کیا)

پہلی login کے بعد پاس ورڈ تبدیل کر لیں۔

---

## F) Local verification (deploy سے پہلے)

```bash
npm run db:deploy
npm run db:seed
npm run build
npm run start
# دوسری terminal:
npm run verify:prod
```

---

## G) Custom domain (اختیاری)

Vercel → Project → **Domains** → اپنا domain لگائیں  
پھر `NEXT_PUBLIC_SITE_URL` کو نئے domain پر update کرکے redeploy کریں۔

---

## H) Verify checklist

- [ ] `/` اردو homepage کھلتی ہے  
- [ ] `/admin/login` سے login ہوتا ہے  
- [ ] Articles CRUD admin میں کام کرتا ہے  
- [ ] `/api/health` → `{ status: "ok", database: "up" }`  
- [ ] `/sitemap.xml` اور `/robots.txt` درست ہیں  
- [ ] `?lang=en` / `?lang=ur` کام کرتے ہیں  
- [ ] `/search?q=...` 200 دیتا ہے  

---

## Troubleshooting

| مسئلہ | حل |
|------|-----|
| Build: Prisma migrate fail | `DIRECT_DATABASE_URL` غلط / pooler پر migrate / SSL missing |
| Login cookie کام نہیں | `NEXT_PUBLIC_SITE_URL` https ہونا چاہیے؛ `COOKIE_SECURE` درست |
| Empty site بعد از deploy | `npm run db:seed` production DB پر چلائیں |
| 500 on APIs | Vercel Function logs دیکھیں؛ DB connectivity چیک کریں |
| `JWT_SECRET must be set` | Vercel env میں `JWT_SECRET` ضرور ڈالیں |

---

## Local Postgres (اس cloud environment جیسا)

```bash
sudo service postgresql start
# user/db already documented in .env.example
npm run db:deploy
npm run db:seed
npm run dev
```
