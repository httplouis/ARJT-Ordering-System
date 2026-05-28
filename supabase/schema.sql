create extension if not exists "pgcrypto";

create type order_status as enum ('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled');
create type payment_status as enum ('pending_verification', 'verified', 'rejected');
create type fulfillment_type as enum ('pickup', 'delivery');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  slug text unique not null,
  description text not null,
  price numeric(10,2) not null check (price >= 0),
  image_url text not null default '',
  is_available boolean not null default true,
  is_popular boolean not null default false,
  prep_time_minutes int not null default 8,
  options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  queue_number int not null,
  customer_name text not null,
  contact_number text not null,
  grade_section text,
  fulfillment_type fulfillment_type not null default 'pickup',
  desired_time timestamptz not null,
  notes text,
  status order_status not null default 'pending',
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  estimated_ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  options_total numeric(10,2) not null default 0,
  selected_options jsonb not null default '[]'::jsonb,
  note text
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status payment_status not null default 'pending_verification',
  gcash_reference text,
  screenshot_url text,
  amount numeric(10,2) not null,
  verified_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type text not null,
  order_id uuid references public.orders(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'ARJT Store',
  store_open boolean not null default true,
  opening_time text not null default '06:30',
  closing_time text not null default '18:30',
  delivery_fee numeric(10,2) not null default 10,
  gcash_name text not null default 'ARJT Store',
  gcash_number text not null default '0917 123 4567',
  gcash_qr_url text not null default '/gcash-qr.svg',
  default_prep_minutes int not null default 12,
  banner_url text not null default 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80',
  updated_at timestamptz not null default now()
);

create index idx_products_category on public.products(category_id);
create index idx_products_available on public.products(is_available);
create index idx_orders_status_created on public.orders(status, created_at desc);
create index idx_order_items_order on public.order_items(order_id);
create index idx_payments_order on public.payments(order_id);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;

create policy "Public read categories" on public.categories for select using (true);
create policy "Public read products" on public.products for select using (true);
create policy "Public read settings" on public.settings for select using (true);

create policy "Admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage order items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage payments" on public.payments for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage notifications" on public.notifications for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage settings" on public.settings for all using (public.is_admin()) with check (public.is_admin());
create policy "Users read own profile" on public.users for select using (auth.uid() = id or public.is_admin());

insert into public.settings (id) values (1) on conflict (id) do nothing;

insert into public.categories (name, slug, sort_order) values
  ('Drinks', 'drinks', 1),
  ('Snacks', 'snacks', 2),
  ('Meals', 'meals', 3),
  ('Halo-Halo', 'halo-halo', 4),
  ('Rice Meals', 'rice-meals', 5),
  ('School Essentials', 'school-essentials', 6)
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, price, image_url, is_popular, prep_time_minutes, options)
select c.id, p.name, p.slug, p.description, p.price, p.image_url, p.is_popular, p.prep_time_minutes, p.options::jsonb
from (values
  ('drinks', 'Iced Milo', 'iced-milo', 'Cold chocolate malt drink with crushed ice.', 35, 'https://images.unsplash.com/photo-1622484212850-eb596d769edc?auto=format&fit=crop&w=900&q=80', true, 4, '[{"name":"Large cup","price":10}]'),
  ('snacks', 'Cheesy Hotdog Sandwich', 'cheesy-hotdog-sandwich', 'Warm bun, hotdog, cheese sauce, and ketchup.', 45, 'https://images.unsplash.com/photo-1606755962773-d324e2dabd85?auto=format&fit=crop&w=900&q=80', true, 7, '[{"name":"Extra cheese","price":8}]'),
  ('rice-meals', 'Tapsilog', 'tapsilog', 'Beef tapa, garlic rice, egg, and vinegar dip.', 89, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, 13, '[{"name":"Extra rice","price":15},{"name":"Extra egg","price":15}]'),
  ('halo-halo', 'Classic Halo-Halo', 'classic-halo-halo', 'Shaved ice, milk, sweet beans, jellies, leche flan, and ube.', 65, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80', false, 9, '[{"name":"Extra leche flan","price":15}]')
) as p(category_slug, name, slug, description, price, image_url, is_popular, prep_time_minutes, options)
join public.categories c on c.slug = p.category_slug
on conflict (slug) do nothing;
