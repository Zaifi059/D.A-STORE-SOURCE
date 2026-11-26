# D.A STORE — Clothing & Fashion

React (Vite) + Tailwind + Supabase storefront with a web POS, admin dashboard, real-time inventory,
and FASHN VTON v1.5 virtual try-on (via a Supabase Edge Function).

## Run locally
```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev
```

## Deploy to Netlify
Connect the repo (build command `npm run build`, publish directory `dist`) and add the environment
variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `netlify.toml` and `public/_redirects`
already handle SPA routing.

## Backend (Supabase)
- Database schema, RLS policies, `process_order` / `adjust_stock` RPCs and Storage buckets are applied
  as Supabase migrations (see your project's migration history).
- Edge Function: `supabase/functions/fashn-tryon` — deploy with `supabase functions deploy fashn-tryon`
  and set the secret with `supabase secrets set FAL_KEY=your_fal_key`.

## First admin
Sign up in the app, then in the Supabase SQL Editor:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```
Roles: `customer` (default), `cashier` (/pos), `admin` (/pos + /admin).
