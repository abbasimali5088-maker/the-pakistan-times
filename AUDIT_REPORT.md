# Existing Project Audit — دی پاکستان ٹائمز اردو

**Date:** 2026-09-14  
**Source:** `uploads/backend_b894.html`, `uploads/website__2__13e4.html`  
**Repo state:** Empty git root + two static HTML prototypes (no Node/PHP/DB server)

---

## Architecture found

| Layer | Status |
|-------|--------|
| Real backend server | **Missing** — browser-only HTML/JS |
| Database | **Missing** — `localStorage` only |
| REST/JSON API | **Missing** |
| Auth (users/roles) | **Broken/weak** — single shared password `pak123` in localStorage |
| Admin panel | **Partial** — basic forms in HTML |
| Public frontend | **Partial** — static SPA-like HTML with hard-coded dummy content |

---

## Feature matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Password login | Partial | Plain password, no hashing, no users table |
| Theme settings | Partial | Color, font, width, dark mode via localStorage |
| Nav label overrides | Partial | Hard-coded category keys only |
| Custom CSS/HTML | Partial | Stored in localStorage |
| News CRUD EN/UR | Partial | Title/excerpt/body/category/image; no slug/SEO/workflow |
| LIVE hours flag | Partial | Client-side expiry only |
| Categories | Incomplete | Fixed select list, no DB entity |
| Tags / Authors / Media | Missing | |
| Roles / Permissions | Missing | |
| Revisions / Workflow | Missing | |
| Breaking News manager | Missing | Ticker uses latest articles, not dedicated entity |
| Live Blog | Missing | |
| SEO / Sitemap / Robots / Redirects / 404 | Missing | |
| Comments / Polls / Quiz / Newsletter / Ads | Missing | |
| Analytics / Search Console | Missing | |
| Audit log / Backup / Jobs | Missing | |
| Homepage manager / Menus / Legal pages | Missing | Hard-coded in frontend |
| Multi-language architecture | Incomplete | EN/UR fields exist; no translation links |
| Multi-site | Missing | |

### Duplicate functionality

- News CRUD exists in **both** `backend.html` and embedded admin in `website.html` (same `pt_news_data` key).

### Preserve (do not discard concepts)

- Brand / green accent `#0B7A3B`
- Bilingual article fields (EN + UR)
- Theme, nav labels, custom code settings keys
- Categories: Pakistan, World, Business, Sports, Entertainment, Technology
- LIVE temporary highlight concept → map to Breaking / Live flags
- Language switcher: Urdu brand + **The Pakistan Times** (English label)

---

## New modules to add

Full API-first CMS: Dashboard, Articles+Revisions+Workflow, Breaking, Live Blog, Categories/Tags/Authors, Users/Roles, Media suite, SEO center, Schema, Sitemap, Robots, Redirects, 404, Search, Analytics, Comments, Polls, Quiz, Newsletter, Ads, Notifications, Homepage/Menu/Static content, Settings, Security, Audit, Backup, Import/Export, Jobs, Multi-lang/site readiness.

---

## Implementation strategy

1. Build Next.js App Router project (API + Admin + Public frontend).
2. Prisma + SQLite (portable) with full relational schema + migrations.
3. Seed categories/settings/admin from prototype concepts.
4. Admin at `/admin`; Public site at `/`; APIs at `/api/*`.
5. Keep prototype HTML in `uploads/` for reference (not deleted).
