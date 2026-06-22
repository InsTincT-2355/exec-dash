# Muriya Weekly Hub

Responsive executive dashboard built in plain HTML, CSS, and JavaScript with Supabase for auth and data, plus Vercel serverless APIs for hosted memo generation and admin user creation.

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
- Hosted Gemini-ready memo endpoint on Vercel
- Admin-only hosted user creation endpoint on Vercel
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
- the executive memo button calls `api/generate-memo.js`
- the admin create-user form calls `api/admin-users.js`
- Vercel environment variables provide the secure service keys and Gemini key

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

## Vercel Environment Variables

Create these in Vercel Project Settings > Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_PROVIDER=gemini`
- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-2.5-flash`

You can start from `.env.example`.

## GitHub To Vercel

1. Push this project to a GitHub repository.
2. Log in to Vercel and click `Add New > Project`.
3. Import the GitHub repository.
4. Add the environment variables from `.env.example`.
5. Deploy.
6. After deployment, open the site and test:
   - login
   - weekly submission
   - executive memo generation
   - admin user creation

`vercel.json` already rewrites `/` to `login.html`, so the deployment opens on the login page.

## Local Preview

To preview locally before pushing to GitHub, run a static server from the project folder. On Windows, a simple option is:

```powershell
npx.cmd http-server . -p 4173
```

Then open [http://localhost:4173/login.html](http://localhost:4173/login.html).

Note: local preview will load the HTML app, but the Vercel serverless routes are only available after deployment unless you run them through Vercel dev tooling.

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
