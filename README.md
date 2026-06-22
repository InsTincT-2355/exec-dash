# Muriya Weekly Hub

Responsive executive dashboard built in plain HTML, CSS, and JavaScript with Supabase for auth and data, plus Cloudflare Pages + Pages Functions for hosted memo generation and admin user creation.

## Pages

- `login.html`: branded login page
- `index.html`: role-aware home dashboard
- `submit.html`: weekly update submission form
- `executive.html`: executive review and memo generation workspace
- `admin.html`: admin-only roster and user management page

## Features

- Blue and white responsive interface
- Different dashboard views for `Executive`, `Admin`, and `Department Head`
- Unlimited weekly items for activities, priorities, and risks
- Executive task review grouped strictly by category order: activities, priorities, risks
- Week, department, and category filtering for executive review
- Multi-select memo generation from chosen tasks only
- Hosted Gemini-ready memo endpoint on Cloudflare Pages Functions
- Admin-only hosted user creation endpoint on Cloudflare Pages Functions
- Supabase-backed auth, profiles, departments, weekly updates, and update items
- Built-in deterministic fallback memo if no AI key is configured

## Runtime Config

The app is now set up for hosted deployment by default in `config.js`:

```js
window.APP_CONFIG = {
  appName: "Muriya Weekly Hub",
  aiMode: "server",
  memoEndpoint: "/api/generate-memo",
  adminUserEndpoint: "/api/admin-users",
  useSupabase: true,
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY"
};
```

That means:

- the browser talks to Supabase directly for app data
- the executive memo button calls `functions/api/generate-memo.js`
- the admin create-user form calls `functions/api/admin-users.js`
- Cloudflare environment variables provide the secure service keys and Gemini key

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the SQL editor.
3. Create users in `Authentication > Users`.
4. Insert matching rows into `profiles` with:
   - `auth_user_id`
   - `full_name`
   - `email`
   - `role`
   - `department_id`
5. Confirm `config.js` contains your real `supabaseUrl` and `supabaseAnonKey`.

## Exact Role Values

Use these exact values in `profiles.role`:

- `Admin`
- `Executive`
- `Department Head`

These values are case-sensitive and must match exactly.

## Access Rules

- `Admin` can access `admin.html` and manage users
- `Executive` can review all departments and generate memos
- `Department Head` can submit updates and view their own dashboard data
- Admin page access is restricted to `Admin`

## Cloudflare Environment Variables

Create these in Cloudflare Pages Project > Settings > Environment Variables (and Secrets where appropriate):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_PROVIDER=gemini`
- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-2.5-flash`

You can start from `.env.example`.

## GitHub To Cloudflare Pages

1. Push this project to a GitHub repository.
2. In Cloudflare Dashboard > Workers & Pages > Pages, create a new Pages project.
3. Connect GitHub and select the repository.
4. Framework preset: none (static)
5. Build command: none
6. Output directory: `/`
7. Add the environment variables from `.env.example`.
8. Deploy.
9. After deployment, open the site and test:
   - login
   - weekly submission
   - executive memo generation
   - admin user creation

`_redirects` already redirects `/` to `login.html`, so the deployment opens on the login page.

## Local Preview

There are two local modes:

1) Static preview (UI only, no Functions)

To preview locally before pushing to GitHub, run a static server from the project folder. On Windows:

```powershell
npx.cmd http-server . -p 4173
```

Then open [http://localhost:4173/login.html](http://localhost:4173/login.html).

2) Full local preview (UI + Cloudflare Pages Functions + Gemini)

This runs the Pages Functions locally so you can test Gemini memo generation before deploying.

1. Install Node.js (LTS).
2. Install dev tooling:

```powershell
npm.cmd install
```

3. Create a local secrets file:

- copy `.dev.vars.example` to `.dev.vars`
- fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY`

4. Start the local Pages dev server:

```powershell
npm.cmd run dev:cf
```

Then open [http://localhost:4173/login.html](http://localhost:4173/login.html).

Gemini runs only server-side (inside the Pages Function). Do not put `GEMINI_API_KEY` in `config.js`.

## Hosted Memo Behavior

The hosted memo endpoint is designed to:

- return plain text instead of markdown
- avoid inventing task owners, dates, or unsupported actions
- keep empty sections explicit
- fall back to a deterministic memo template if no AI key is configured

## Important SQL Update

If you applied an older version of the schema earlier, rerun the latest `supabase-schema.sql` so that:

- grants for `authenticated` are present
- admins can read all profiles for management
- executives can read all dashboard data
- department heads are restricted to their own data
