# Phase 1 — Existing Backend Audit

**Brand:** دی پاکستان ٹائمز اردو / The Pakistan Times  
**Source artifacts:** `uploads/backend_b894.html`, `uploads/website__2__13e4.html`  
**Repo state before rebuild:** empty git repo + two static HTML prototypes (localStorage CMS)

## Architecture found

| Area | Finding |
|------|---------|
| Stack | Single-file HTML + inline JS/CSS |
| Database | None — `localStorage` only |
| API | None |
| Auth | Plain password in localStorage (`pak123` default) |
| Roles/Permissions | None |
| Admin | Separate `backend.html` + embedded admin view in website HTML |
| Frontend | Hash-router SPA in one HTML file |

## Feature status

### Already complete (prototype-level)
- Basic password gate for admin
- Theme settings (name EN/UR, logo, color, font, size, width, dark mode)
- Header/nav label overrides (EN/UR)
- Custom CSS / HTML injection
- News CRUD: title/excerpt/body EN+UR, category, image URL
- LIVE expiry hours on articles
- Public home, category filter, search, article view
- EN/UR language switch
- Breaking-style ticker (from article list)
- Static About / Contact / Privacy / Terms copy (hardcoded)
- Demo/seed articles in JS

### Partially complete
- Categories (hardcoded select list, not a DB module)
- Bilingual content (fields exist; no translation relation entity)
- Media (image URL string only)
- Live indicator (timer on article, not Live Blog module)
- Settings (theme only)

### Broken / weak
- Auth: plaintext password, no hashing, no sessions/JWT, shared client secret
- No server persistence — data lost per browser
- No CSRF/XSS hardening beyond browser defaults
- Duplicate admin UI in website + backend HTML
- No validation beyond “English title + excerpt required”
- No SEO/meta/schema beyond page `<title>`
- No roles, audit log, revisions, workflow

### Missing (to add as real Backend modules)
Dashboard, editorial workflow, revisions, breaking news manager, live blog, categories/tags/authors CRUD, users/roles/permissions, media library + image processing architecture, video/audio/galleries/documents, SEO center, schema/sitemap/robots/redirects/404 monitor, search architecture, analytics + Search Console hooks, comments, polls, quiz, newsletter, ads, notifications, homepage manager, menu manager, static/legal CMS, security suite, audit log, backup, import/export, full API + OpenAPI, background jobs, multi-language/multi-site readiness, content relationships/priority, admin global search, bulk actions

## Preservation strategy

1. Keep brand identity, green accent `#0B7A3B`, bilingual EN/UR model, category names, theme/nav/custom-code concepts.
2. Migrate localStorage-shaped news fields into relational `articles` (+ translations).
3. Do not discard working UX concepts — upgrade to DB + API + Admin.
4. Ship migrations + seed that recreate demo content from the HTML prototypes.
5. Public frontend consumes APIs only (loose coupling).

## Implementation plan

1. Next.js (App Router) + TypeScript + Prisma (SQLite) + NextAuth credentials
2. Modular API under `/api/v1/*` + Admin under `/admin/*` + Public site under `/`
3. Seed roles, permissions, categories, menus, settings, sample articles
4. Admin modules for all major CMS areas (DB + API + UI + permissions)
5. Professional Urdu-first public frontend
6. Final audit of implemented vs architecture-ready modules
