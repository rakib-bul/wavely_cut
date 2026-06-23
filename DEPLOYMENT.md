# Deployment Instructions (Vercel & Supabase)

These instructions outline how to take this **Garments Cutting Management ERP** system from local sandbox to production-grade deployment using **Vercel** (Frontend / Node.js Serverless) and **Supabase** (PostgreSQL / Auth / RLS).

---

## 1. Supabase Database Configuration
1. Create a free account or log in to [Supabase](https://supabase.com).
2. Create a new project (e.g., `Garments Cutting ERP`).
3. Navigate to the **SQL Editor** in your Supabase Dashboard.
4. Open the SQL file provided in the local repository at `src/db/schema.sql`, copy all DDL commands, paste them into the SQL Editor, and click **Run**. This establishes your schemas, relational constraints, indices, and seeds the machines list.
5. Open the Row Level Security (RLS) file at `src/db/rls.sql`, paste its contents into the dashboard SQL editor, and click **Run**. This secures your tables using active JWT custom-claims role states.

---

## 2. Supabase Authentication Setup
1. Inside the Supabase sidebar, go to **Auth** -> **Providers** -> **Email**.
2. Make sure Email Provider is enabled.
3. Turn off **Confirm Email** if you want your users to be able to sign up and login immediately without confirming templates.
4. Users logged in through Supabase Auth automatically link to `public.profiles` using the database triggers we set up in `schema.sql`.

---

## 3. Host on Vercel
To host this full-stack Express + Vite node server seamlessly in Vercel, configure a `vercel.json` rewrite file so Vercel forwards client API requests to your serverless backend:

### Create a `vercel.json` in project root:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.ts",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### Setup Environment Secrets
Add the following secrets to your Vercel Dashboard project settings:
* `DATABASE_URL`: Your Supabase Postgres pooled connection string.
* `SUPABASE_KEY`: Your Supabase anon dashboard key.
* `SUPABASE_URL`: Your Supabase API project endpoint.
