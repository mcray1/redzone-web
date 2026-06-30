# RedZone Web — Owner Dashboard + Customer Portal

A React + Vite + TypeScript PWA (installable on phones, runs in any browser)
that wires to the RedZone OSS/BSS backend. Two experiences behind one login:

- **Owner / Admin dashboard** — overview stats, subscriber list with search and
  filters, add subscriber, subscriber detail, record payments (cash / GCash /
  Maya / bank), and a billing view of outstanding balances.
- **Customer portal** — mobile-first account view: connection status, plan,
  current balance with how-to-pay guidance, and recent payment history.

MikroTik integration is intentionally left out of this build — the backend's
router calls are isolated, so none of these screens depend on a live router.

## Stack

React 18 · Vite · TypeScript (strict) · Tailwind · React Router · TanStack
Query · React Hook Form · Axios · Recharts · vite-plugin-pwa.

## Run it

The backend (`redzone-oss`) should be running on `http://localhost:4000`.

```bash
npm install
cp .env.example .env     # VITE_API_URL defaults to /api (proxied to :4000 in dev)
npm run dev              # http://localhost:5173
```

Dev server proxies `/api` to the backend, so cookies/CORS just work. Log in
with the seeded owner: `owner@redzone.com.ph` / `ChangeMe123!`.

## Build & deploy

```bash
npm run build            # type-checks then builds to dist/
npm run preview          # serve the production build locally
```

`dist/` is a static bundle — deploy to Netlify, Cloudflare Pages, Vercel, or
any static host. Set `VITE_API_URL` to your deployed API origin (e.g.
`https://api.redzone.com.ph/api`) at build time. The PWA manifest + service
worker are generated automatically, so the app is installable ("Add to Home
Screen") on Android and iOS and works in the browser.

> Add real `public/icon-192.png` and `public/icon-512.png` before shipping —
> placeholders are referenced in the manifest.

## How auth works

`POST /auth/login` returns an access token + refresh token. The Axios client
attaches the access token to every request and silently refreshes it on a 401
(rotating the refresh token). Role decides the landing screen: OWNER/ADMIN →
`/owner`, others → `/portal`.

## Notes for the next iteration

- **Customer → subscriber link:** the portal currently resolves a customer's
  subscriber record via the `branchId` field on their user. Add a backend
  `GET /subscribers/me` endpoint and switch `Portal.tsx` to it — cleaner and
  avoids overloading `branchId`.
- **Owner stats** are derived client-side from the subscriber list (fine to a
  few hundred subscribers). Add a `GET /stats/overview` endpoint when you grow
  past that, and point `useOwnerStats` at it.
- **Revenue chart** shows a real status breakdown rather than a fabricated
  trend. Once invoices accumulate, add a monthly-collections series.
- Collector mobile flows, tickets, and installations slot in as new routes
  using the same layout + query patterns.
```
