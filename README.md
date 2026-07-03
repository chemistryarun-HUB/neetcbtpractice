# NEETCBT

NEET Chemistry CBT practice platform — students practice unit-wise, level-based tests; faculty upload questions and track progress; admin manages students and question banks.

**Stack:** React 19 + Vite 8 + Supabase (Postgres, Auth, Storage)

## Live Deployment

**GitHub Pages:** https://chemistryarun-hub.github.io/neetcbtpractice/

Deployed automatically via [GitHub Actions](.github/workflows/deploy.yml) on every push to `main` — builds the Vite app and publishes `dist/` to Pages. No manual deploy step needed.

Requires two repository secrets (Settings → Secrets and variables → Actions):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

> The previous Netlify deployment (`neetcbtpractice.netlify.app`) is deprecated and no longer maintained — Netlify's free build minutes ran out, so the project moved to GitHub Pages.

## Local Development

See [SETUP.md](SETUP.md) for full setup (Supabase project, schema, env vars, login credentials, Excel import formats).

```bash
npm install
npm run dev
```
