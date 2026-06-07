create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('pending_verification', 'verified', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'fulfillment_type') then
    create type fulfillment_type as enum ('pickup', 'delivery');
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  contact_number text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
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

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
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

create table if not exists public.order_items (
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

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status payment_status not null default 'pending_verification',
  gcash_reference text,
  screenshot_url text,
  amount numeric(10,2) not null,
  verified_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type text not null,
  order_id uuid references public.orders(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
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

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_available on public.products(is_available);
create index if not exists idx_orders_status_created on public.orders(status, created_at desc);
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_payments_order on public.payments(order_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, contact_number, role)
  values (new.id, coalesce(new.user_metadata->>'full_name', new.email), '', 'customer');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

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

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories for select using (true);
drop policy if exists "Public read products" on public.products;
create policy "Public read products" on public.products for select using (true);
drop policy if exists "Public read settings" on public.settings;
create policy "Public read settings" on public.settings for select using (true);

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins manage orders" on public.orders;
create policy "Admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders" on public.orders for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Users insert own orders" on public.orders;
create policy "Users insert own orders" on public.orders for insert with check (auth.uid() = user_id);
drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items" on public.order_items for select using (
  exists (
    select 1 from public.orders where id = public.order_items.order_id and user_id = auth.uid()
  ) or public.is_admin()
);
drop policy if exists "Admins manage payments" on public.payments;
create policy "Admins manage payments" on public.payments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins manage notifications" on public.notifications;
create policy "Admins manage notifications" on public.notifications for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins manage settings" on public.settings;
create policy "Admins manage settings" on public.settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Users read own profile" on public.users;
create policy "Users read own profile" on public.users for select using (auth.uid() = id or public.is_admin());

drop policy if exists "Users insert own profile" on public.users;
create policy "Users insert own profile" on public.users for insert with check (auth.uid() = id);
drop policy if exists "Users update own profile" on public.users;
create policy "Users update own profile" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

insert into public.settings (id) values (1) on conflict (id) do nothing;

insert into public.categories (name, slug, sort_order) values
  ('Drinks', 'drinks', 1),
  ('Snacks', 'snacks', 2),
  ('Rice Meals', 'rice-meals', 3)
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, price, image_url, is_popular, prep_time_minutes, options)
select c.id, p.name, p.slug, p.description, p.price, p.image_url, p.is_popular, p.prep_time_minutes, p.options::jsonb
from (values
  -- Rice Meals
  ('rice-meals', 'Tapsilog – Beef', 'tapsilog-beef', 'Beef tapa, garlic rice, and egg.', 110, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, 13, '[]'),
  ('rice-meals', 'Tocilog', 'tocilog', 'Tocino, garlic rice, and egg.', 100, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, 12, '[]'),
  ('rice-meals', 'Porksilog', 'porksilog', 'Pork, garlic rice, and egg.', 105, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, 12, '[]'),
  ('rice-meals', 'Sisilog', 'sisilog', 'Fried fish, garlic rice, and egg.', 110, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', false, 12, '[]'),
  ('rice-meals', 'Bangsilog', 'bangsilog', 'Fried shrimp, garlic rice, and egg.', 100, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', false, 12, '[]'),
  ('rice-meals', 'Chicksilog', 'chicksilog', 'Fried chicken, garlic rice, and egg.', 100, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, 12, '[]'),
  ('rice-meals', 'Hotsilog', 'hotsilog', 'Hotdog, garlic rice, and egg.', 70, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', false, 10, '[]'),
  ('rice-meals', 'Hotdog w/ Rice', 'hotdog-rice', 'Hotdog with garlic rice.', 55, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', false, 8, '[]'),
  ('rice-meals', 'Siomai w/ Rice', 'siomai-rice', 'Siomai dumplings with garlic rice.', 50, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', false, 8, '[]'),
  ('rice-meals', 'Rice w/ Egg', 'rice-egg', 'Garlic rice with fried egg.', 45, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', false, 7, '[]'),
  ('rice-meals', 'Chicken Fillet', 'chicken-fillet', 'Breaded chicken fillet with rice.', 90, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, 11, '[]'),
  ('rice-meals', 'Chicken Dumpling w/ Rice', 'chicken-dumpling-rice', 'Chicken dumplings with garlic rice.', 65, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', false, 9, '[]'),
  ('rice-meals', 'Chicken Nugget w/ Rice', 'chicken-nugget-rice', 'Chicken nuggets with garlic rice.', 85, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', false, 10, '[]'),
  
  -- Drinks - Fruit Shakes
  ('drinks', 'Mango Shake', 'mango-shake', 'Fresh mango shake 16oz.', 60, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80', true, 3, '[]'),
  ('drinks', 'Strawberry Shake', 'strawberry-shake', 'Strawberry shake 16oz.', 60, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80', true, 3, '[]'),
  ('drinks', 'Buko Shake', 'buko-shake', 'Fresh coconut shake 16oz.', 60, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80', false, 3, '[]'),
  ('drinks', 'Melon Shake', 'melon-shake', 'Melon shake 16oz.', 60, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80', false, 3, '[]'),
  ('drinks', 'Halo-Halo Shake', 'halo-halo-shake', 'Halo-halo flavored shake 16oz.', 60, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80', false, 3, '[]'),
  ('drinks', 'Mais Con Yelo Shake', 'mais-con-yelo-shake', 'Sweet corn shake 16oz.', 55, 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=80', false, 3, '[]'),
  
  -- Drinks - Fruit Soda
  ('drinks', 'Strawberry Soda', 'strawberry-soda', 'Strawberry flavored soda.', 50, 'https://images.unsplash.com/photo-1622484212850-eb596d769edc?auto=format&fit=crop&w=900&q=80', false, 2, '[]'),
  ('drinks', 'Kiwi Soda', 'kiwi-soda', 'Kiwi flavored soda.', 50, 'https://images.unsplash.com/photo-1622484212850-eb596d769edc?auto=format&fit=crop&w=900&q=80', false, 2, '[]'),
  ('drinks', 'Green Apple Soda', 'green-apple-soda', 'Green apple flavored soda.', 50, 'https://images.unsplash.com/photo-1622484212850-eb596d769edc?auto=format&fit=crop&w=900&q=80', false, 2, '[]'),
  ('drinks', 'Lychee Soda', 'lychee-soda', 'Lychee flavored soda.', 50, 'https://images.unsplash.com/photo-1622484212850-eb596d769edc?auto=format&fit=crop&w=900&q=80', false, 2, '[]'),
  
  -- Snacks
  ('snacks', 'Regular Burger', 'regular-burger', 'Classic burger.', 45, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80', false, 6, '[]'),
  ('snacks', 'Burger w/ Cheese', 'burger-cheese', 'Burger with melted cheese.', 50, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80', false, 6, '[]'),
  ('snacks', 'Hotdog Burger', 'hotdog-burger', 'Hotdog served as a burger.', 50, 'https://images.unsplash.com/photo-1606755962773-d324e2dabd85?auto=format&fit=crop&w=900&q=80', false, 5, '[]'),
  ('snacks', 'Fries', 'fries', 'Golden crispy fries.', 25, 'https://images.unsplash.com/photo-1599599810694-f3f1e9f6d8c1?auto=format&fit=crop&w=900&q=80', false, 5, '[]'),
  ('snacks', 'fish tofu', 'fish-tofu', 'Fried fish cake.', 30, 'https://images.unsplash.com/photo-1585238341710-4b4e6f289635?auto=format&fit=crop&w=900&q=80', false, 7, '[]'),
  ('snacks', 'Squidballs', 'squidballs', 'Fried squid balls.', 20, 'https://images.unsplash.com/photo-1585238341710-4b4e6f289635?auto=format&fit=crop&w=900&q=80', false, 6, '[]'),
  ('snacks', 'hotdog on stick', 'hotdog-on-stick', 'Hotdog on a stick.', 20, 'https://images.unsplash.com/photo-1606755962773-d324e2dabd85?auto=format&fit=crop&w=900&q=80', false, 4, '[]'),
  ('snacks', 'Siomai Pork', 'siomai-pork', 'Pork dumpling.', 25, 'https://images.unsplash.com/photo-1585238341710-4b4e6f289635?auto=format&fit=crop&w=900&q=80', false, 5, '[]'),
  ('snacks', 'Siomai Beef', 'siomai-beef', 'Beef dumpling.', 25, 'https://images.unsplash.com/photo-1585238341710-4b4e6f289635?auto=format&fit=crop&w=900&q=80', false, 5, '[]'),
  ('snacks', 'Siomai Japanese', 'siomai-japanese', 'Japanese style dumpling.', 30, 'https://images.unsplash.com/photo-1585238341710-4b4e6f289635?auto=format&fit=crop&w=900&q=80', false, 5, '[]'),
  ('snacks', 'Kikiam', 'kikiam', 'Filipino style egg roll.', 20, 'https://images.unsplash.com/photo-1585238341710-4b4e6f289635?auto=format&fit=crop&w=900&q=80', false, 5, '[]'),
  ('snacks', 'kwek-kwek', 'kwek-kwek', 'Fried wonton.', 20, 'https://images.unsplash.com/photo-1585238341710-4b4e6f289635?auto=format&fit=crop&w=900&q=80', false, 5, '[]'),
  ('snacks', 'Fishball', 'fishball', 'Fish ball skewer.', 20, 'https://images.unsplash.com/photo-1585238341710-4b4e6f289635?auto=format&fit=crop&w=900&q=80', false, 4, '[]'),
  ('snacks', 'Dynamite', 'dynamite', 'Spicy fried snack.', 20, 'https://images.unsplash.com/photo-1585238341710-4b4e6f289635?auto=format&fit=crop&w=900&q=80', false, 5, '[]')
) as p(category_slug, name, slug, description, price, image_url, is_popular, prep_time_minutes, options)
join public.categories c on c.slug = p.category_slug
on conflict (slug) do nothing;

-- MVP additions: user_addresses, cart, cart_items, inventory_logs, reviews

create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  label text,
  address text not null,
  latitude numeric,
  longitude numeric,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.cart (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.cart(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  selected_options jsonb not null default '[]'::jsonb,
  added_at timestamptz not null default now()
);

create table if not exists public.inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  change int not null,
  reason text,
  user_id uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_addresses_user on public.user_addresses(user_id);
create index if not exists idx_cart_user on public.cart(user_id);
create index if not exists idx_cart_items_cart on public.cart_items(cart_id);
create index if not exists idx_inventory_logs_product on public.inventory_logs(product_id);
create index if not exists idx_reviews_product on public.reviews(product_id);

alter table public.user_addresses enable row level security;
alter table public.cart enable row level security;
alter table public.cart_items enable row level security;
alter table public.inventory_logs enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "Users read own addresses" on public.user_addresses;
create policy "Users read own addresses" on public.user_addresses for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Users insert own addresses" on public.user_addresses;
create policy "Users insert own addresses" on public.user_addresses for insert with check (auth.uid() = user_id or public.is_admin());
drop policy if exists "Users update own addresses" on public.user_addresses;
create policy "Users update own addresses" on public.user_addresses for update using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
drop policy if exists "Users delete own addresses" on public.user_addresses;
create policy "Users delete own addresses" on public.user_addresses for delete using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users read own cart" on public.cart;
create policy "Users read own cart" on public.cart for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "Users insert own cart" on public.cart;
create policy "Users insert own cart" on public.cart for insert with check (auth.uid() = user_id or public.is_admin());
drop policy if exists "Users update own cart" on public.cart;
create policy "Users update own cart" on public.cart for update using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
drop policy if exists "Users delete own cart" on public.cart;
create policy "Users delete own cart" on public.cart for delete using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users read cart items" on public.cart_items;
create policy "Users read cart items" on public.cart_items for select using (exists(select 1 from public.cart c where c.id = cart_items.cart_id and (c.user_id = auth.uid() or public.is_admin())));
drop policy if exists "Users insert cart items" on public.cart_items;
create policy "Users insert cart items" on public.cart_items for insert with check (exists(select 1 from public.cart c where c.id = cart_items.cart_id and (c.user_id = auth.uid() or public.is_admin())));
drop policy if exists "Users update cart items" on public.cart_items;
create policy "Users update cart items" on public.cart_items for update using (exists(select 1 from public.cart c where c.id = cart_items.cart_id and (c.user_id = auth.uid() or public.is_admin()))) with check (exists(select 1 from public.cart c where c.id = cart_items.cart_id and (c.user_id = auth.uid() or public.is_admin())));
drop policy if exists "Users delete cart items" on public.cart_items;
create policy "Users delete cart items" on public.cart_items for delete using (exists(select 1 from public.cart c where c.id = cart_items.cart_id and (c.user_id = auth.uid() or public.is_admin())));

drop policy if exists "Admins read inventory logs" on public.inventory_logs;
create policy "Admins read inventory logs" on public.inventory_logs for select using (public.is_admin());
drop policy if exists "Admins insert inventory logs" on public.inventory_logs;
create policy "Admins insert inventory logs" on public.inventory_logs for insert with check (public.is_admin());
drop policy if exists "Admins update inventory logs" on public.inventory_logs;
create policy "Admins update inventory logs" on public.inventory_logs for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete inventory logs" on public.inventory_logs;
create policy "Admins delete inventory logs" on public.inventory_logs for delete using (public.is_admin());

drop policy if exists "Public read reviews" on public.reviews;
create policy "Public read reviews" on public.reviews for select using (true);
drop policy if exists "Users insert reviews" on public.reviews;
create policy "Users insert reviews" on public.reviews for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own reviews" on public.reviews;
create policy "Users update own reviews" on public.reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users delete own reviews" on public.reviews;
create policy "Users delete own reviews" on public.reviews for delete using (auth.uid() = user_id);

-- Messages table for customer-owner messaging widget
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_user on public.messages(user_id);

alter table public.messages enable row level security;

drop policy if exists "Admins manage messages" on public.messages;
create policy "Admins manage messages" on public.messages for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users read own messages" on public.messages;
create policy "Users read own messages" on public.messages for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Users insert messages" on public.messages;
create policy "Users insert messages" on public.messages for insert with check (auth.uid() = user_id or auth.uid() is null);

