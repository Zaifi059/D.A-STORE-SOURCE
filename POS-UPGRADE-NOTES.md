# D.A Store POS dashboard upgrade

## What changed

- Reworked `/pos` into a professional dark retail command center inspired by the supplied Retail360 reference.
- Added responsive left navigation, top utility bar, business KPI cards, a seven-day sales chart, sales-by-channel breakdown, live inventory table, recent transactions, and low-stock alerts.
- Integrated the quick-sale terminal into the dashboard instead of removing the existing checkout workflow.
- Preserved barcode/SKU lookup, product search and category filters, variant selection, customer search/create, cart quantity controls, discounts, cash/bank transfer, credit checks, admin credit override, Supabase sale RPC, stock deduction, and printable receipts.
- Dashboard metrics and inventory are read from the existing Supabase tables; order changes refresh the dashboard through Supabase Realtime.

## Existing modules available in this source

- POS: `/pos`
- Product and order administration: `/admin`
- Customer payment ledger: `/payments`
- Online storefront: `/`

The sidebar visually lists additional retail-ERP areas to match the reference. Areas not implemented in the supplied source are disabled and marked **Soon** rather than linked to unrelated screens. Supplier purchasing, promotions, staff administration, store management, mobile app, marketplaces, and integrations still require their own database schema and workflows.

## Setup

1. Install Node.js 18+ (Node 20+ recommended).
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Ensure the Supabase migrations in `supabase/migrations` have been applied to the target project.
5. Run `npm run dev` for local development.
6. Run `npm run build` before deployment.

## Verification note

All 72 existing JavaScript/JSX source files were syntax-transpiled successfully after the change. A full Vite build and automated test run could not be executed in this environment because npm dependencies were not present and the package registry/cache was unavailable. The live Supabase connection and role policies must be verified against the store's own project credentials.
