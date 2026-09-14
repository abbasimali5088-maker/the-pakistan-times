# Final Audit — دی پاکستان ٹائمز اردو CMS

**Date:** 2026-09-14  
**Branch:** `main`  
**Stack:** Next.js 15 + Prisma/PostgreSQL + JWT session auth

## Smoke tests (live)

| URL | Result |
|-----|--------|
| `/` | 200 — Urdu RTL brand, menu, breaking ticker, articles from API |
| `/latest` | 200 — seeded Urdu articles |
| `/admin/login` | 200 |
| `/api/health` | 200 — `{ status: ok, database: up }` |
| `/api/articles?public=1` | 200 — JSON articles |
| `/api/breaking?public=1` | 200 — active breaking |
| `/api/docs` | 200 — OpenAPI-style catalog |
| `npm run build` | Pass |

Admin login: `admin@thepakistantimes.local` / `pak123`

## Preservation vs HTML prototypes

| Concept preserved | How |
|-------------------|-----|
| Brand + green `#0B7A3B` | CSS variables + seed settings |
| EN/UR article fields | `title`/`titleUr`, `body`/`bodyUr`, language switcher |
| Categories | DB categories + menu from API |
| Theme/nav/custom code | Settings module + seed |
| Password admin | Real users + bcrypt + sessions (replaces plaintext localStorage) |
| LIVE/breaking | BreakingNews entity + ticker |

## Implemented (DB + API + Admin UI + wired where public)

- Auth (hashing, sessions, brute-force soft limit, roles/permissions)
- Dashboard, Articles (+ revisions endpoint), Categories, Tags, Authors
- Users, Roles, Media, Videos, Audio, Galleries
- Breaking News, Live Blog (+ updates)
- Comments, Newsletter, Ads, Notifications
- Homepage blocks, Menus, Static pages
- SEO audit, Sitemap, Robots, Redirects, 404 monitor
- Search, Analytics events, Settings
- Polls, Quizzes, Backup records, Jobs processor
- Import/Export JSON, Health, API docs
- Public frontend: home, latest, breaking, category/tag/author/article, live, videos, galleries, search, legal pages, 404/error, PWA manifest

## Architecture-ready / lighter UI depth

These have schema + API (and often admin list pages) but may need deeper production polish later:

- Image processing variants (fields/architecture present; worker pipeline light)
- Search Console / GA credential integrations (settings + env hooks)
- Multi-site (`Site` model seeded EN/UR sites)
- Content translation links (`translationOfId`)
- Drag/drop menu ordering UX (API ordering exists)
- Configurable dashboard widgets (stats API exists)
- Full 2FA enrollment UI (flags on User model)
- Queue-backed email delivery provider adapters

## Do not rewrite

Existing Prisma schema, seed, auth cookie model, and public API `?public=1` contract should be extended via migrations — not replaced.
