# ARJT Store

Production-ready mobile-first ordering system for a single convenience store in front of a school.

## Stack

- Next.js 15 App Router, TypeScript, Tailwind CSS
- Shadcn-style reusable UI components
- Supabase Database, Auth, Storage-ready URLs, Realtime
- React Hook Form, Zod, TanStack Query, Framer Motion
- PWA manifest and service worker for installable mobile use

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The app includes sample fallback data, so it runs before Supabase is connected.

## Supabase Setup

1. Create a Supabase project.
2. Run [supabase/schema.sql](/c:/jolo/STORE/ARJT%20APP/supabase/schema.sql) in the Supabase SQL editor.
3. Create an admin user in Supabase Auth.
4. Insert a matching admin profile:

```sql
insert into public.users (id, full_name, role)
values ('AUTH_USER_UUID', 'ARJT Admin', 'admin');
```

5. Enable Realtime for `orders`, `payments`, and `notifications`.
6. Create Storage buckets for product images and payment screenshots if you want uploads managed inside Supabase.

## Environment

Copy `.env.example` to `.env.local`.

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is used only in Server Actions for trusted order/admin mutations.

## Vercel Deployment

1. Push this project to GitHub.
2. Import it in Vercel.
3. Add the same environment variables in Vercel project settings.
4. Set Supabase Auth site URL to your Vercel domain.
5. Add redirect URLs:
   - `https://your-domain.vercel.app/login`
   - `https://your-domain.vercel.app/admin`
6. Deploy.

## Main Routes

- `/` customer menu and checkout
- `/track/[id]` live order tracking
- `/login` admin auth
- `/admin` analytics dashboard
- `/admin/orders` live order queue
- `/admin/products` product management
- `/admin/settings` store settings

## Notes

- Product images can use Supabase Storage public URLs.
- Payment screenshot upload is represented as a URL field in the UI; wire it to a Storage upload widget for production payment verification.
- The service worker caches shell assets and falls back to cached pages offline.
