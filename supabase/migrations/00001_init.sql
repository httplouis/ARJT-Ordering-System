-- Categories
create table if not exists categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  sort_order int not null default 0
);

-- Products
create table if not exists products (
  id text primary key,
  category_id text not null references categories(id),
  name text not null,
  slug text not null unique,
  description text not null default '',
  price int not null default 0,
  image_url text not null default '',
  is_available boolean not null default true,
  is_popular boolean not null default false,
  prep_time_minutes int not null default 10,
  options jsonb not null default '[]',
  sold_today int not null default 0,
  created_at timestamptz not null default now()
);

-- Settings (single row)
create table if not exists settings (
  id bigint primary key default 1,
  store_name text not null default 'ARJT Store',
  store_open boolean not null default true,
  opening_time text not null default '06:30',
  closing_time text not null default '18:30',
  delivery_fee int not null default 10,
  gcash_name text not null default '',
  gcash_number text not null default '',
  gcash_qr_url text not null default '',
  default_prep_minutes int not null default 12,
  banner_url text not null default '',
  constraint single_row check (id = 1)
);

-- Orders
create table if not exists orders (
  id text primary key,
  queue_number int not null,
  customer_name text not null,
  contact_number text not null,
  grade_section text,
  fulfillment_type text not null default 'pickup',
  desired_time timestamptz not null,
  notes text,
  status text not null default 'pending',
  subtotal int not null default 0,
  delivery_fee int not null default 0,
  total int not null default 0,
  estimated_ready_at timestamptz,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id)
);

-- Order items
create table if not exists order_items (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  quantity int not null default 1,
  unit_price int not null default 0,
  options_total int not null default 0,
  selected_options jsonb not null default '[]',
  note text
);

-- Payments
create table if not exists payments (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  status text not null default 'pending_verification',
  gcash_reference text,
  screenshot_url text,
  amount int not null default 0
);

-- Enable RLS
alter table categories enable row level security;
alter table products enable row level security;
alter table settings enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;

-- Public read access for storefront
create policy "Public read categories" on categories for select using (true);
create policy "Public read products" on products for select using (true);
create policy "Public read settings" on settings for select using (true);

-- Authenticated users can manage orders
create policy "Users view own orders" on orders for select using (auth.uid() = user_id);
create policy "Users insert orders" on orders for insert with check (auth.uid() = user_id);
create policy "Users view own items" on order_items for select using (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "Users insert own items" on order_items for insert with check (exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()));
create policy "Users view own payments" on payments for select using (exists (select 1 from orders where orders.id = payments.order_id and orders.user_id = auth.uid()));
create policy "Users insert own payments" on payments for insert with check (exists (select 1 from orders where orders.id = payments.order_id and orders.user_id = auth.uid()));

-- Seed data
insert into categories (id, name, slug, sort_order) values
  ('cat-rice', 'Rice Meals', 'rice-meals', 1),
  ('cat-drinks', 'Shakes & Soda', 'shakes-soda', 2),
  ('cat-snacks', 'Snacks', 'snacks', 3)
on conflict (id) do nothing;

insert into settings (id, store_name, store_open, opening_time, closing_time, delivery_fee, gcash_name, gcash_number, gcash_qr_url, default_prep_minutes, banner_url)
values (1, 'ARJT Store', true, '06:30', '18:30', 10, 'ARJT Store', '0917 123 4567', '/gcash-qr.svg', 12, 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80')
on conflict (id) do nothing;

insert into products (id, category_id, name, slug, description, price, image_url, is_available, is_popular, prep_time_minutes, options, sold_today) values
  ('prod-1', 'cat-rice', 'Tapsilog (Beef)', 'tapsilog-beef', 'Beef tapa, garlic rice, and egg.', 110, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, true, 12, '[]', 22),
  ('prod-2', 'cat-rice', 'Tocilog', 'tocilog', 'Cured pork, garlic rice, and egg.', 100, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, true, 12, '[]', 18),
  ('prod-3', 'cat-rice', 'Porksilog', 'porksilog', 'Fried pork, garlic rice, and egg.', 105, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, true, 12, '[]', 20),
  ('prod-4', 'cat-rice', 'Sisilog', 'sisilog', 'Fish (tuyo), garlic rice, and egg.', 110, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, false, 12, '[]', 14),
  ('prod-5', 'cat-rice', 'Bangsilog', 'bangsilog', 'Milkfish (bangus), garlic rice, and egg.', 100, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, false, 12, '[]', 12),
  ('prod-6', 'cat-rice', 'Chicksilog', 'chicksilog', 'Fried chicken, garlic rice, and egg.', 100, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, true, 13, '[]', 25),
  ('prod-7', 'cat-rice', 'Hotsilog', 'hotsilog', 'Hotdog, garlic rice, and egg.', 70, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, false, 10, '[]', 16),
  ('prod-8', 'cat-rice', 'Hotdog w/ Rice', 'hotdog-with-rice', 'Hotdog and garlic rice.', 55, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, false, 8, '[]', 11),
  ('prod-9', 'cat-rice', 'Siomai w/ Rice', 'siomai-with-rice', 'Siomai dumplings with garlic rice.', 50, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, false, 9, '[]', 10),
  ('prod-10', 'cat-rice', 'Rice w/ Egg', 'rice-with-egg', 'Garlic rice with fried egg.', 45, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, false, 7, '[]', 8),
  ('prod-11', 'cat-rice', 'Chicken Fillet', 'chicken-fillet', 'Breaded chicken fillet with rice.', 90, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, true, 12, '[]', 19),
  ('prod-12', 'cat-rice', 'Chicken Dumpling w/ Rice', 'chicken-dumpling-with-rice', 'Chicken dumplings with garlic rice.', 65, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, false, 10, '[]', 9),
  ('prod-13', 'cat-rice', 'Chicken Nuggets w/ Rice', 'chicken-nuggets-with-rice', 'Chicken nuggets with garlic rice.', 85, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', true, true, 10, '[]', 17)
on conflict (id) do nothing;

insert into products (id, category_id, name, slug, description, price, image_url, is_available, is_popular, prep_time_minutes, options, sold_today) values
  ('prod-14', 'cat-drinks', 'Mango Shake', 'mango-shake', 'Fresh mango shake (16oz).', 50, 'https://images.unsplash.com/photo-1599599810694-c0e19dfc8b4b?auto=format&fit=crop&w=900&q=80', true, true, 5, '[]', 24),
  ('prod-15', 'cat-drinks', 'Strawberry Shake', 'strawberry-shake', 'Fresh strawberry shake (16oz).', 50, 'https://images.unsplash.com/photo-1599599810694-c0e19dfc8b4b?auto=format&fit=crop&w=900&q=80', true, true, 5, '[]', 21),
  ('prod-16', 'cat-drinks', 'Buko Shake', 'buko-shake', 'Coconut shake (16oz).', 50, 'https://images.unsplash.com/photo-1599599810694-c0e19dfc8b4b?auto=format&fit=crop&w=900&q=80', true, false, 5, '[]', 12),
  ('prod-17', 'cat-drinks', 'Melon Shake', 'melon-shake', 'Sweet melon shake (16oz).', 50, 'https://images.unsplash.com/photo-1599599810694-c0e19dfc8b4b?auto=format&fit=crop&w=900&q=80', true, false, 5, '[]', 10),
  ('prod-18', 'cat-drinks', 'Halo-Halo Shake', 'halo-halo-shake', 'Mixed ingredients shake with halo-halo flavor (16oz).', 60, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80', true, true, 6, '[]', 15),
  ('prod-19', 'cat-drinks', 'Mais Con Yelo', 'mais-con-yelo', 'Sweet corn with evaporated milk and crushed ice.', 55, 'https://images.unsplash.com/photo-1599599810694-c0e19dfc8b4b?auto=format&fit=crop&w=900&q=80', true, true, 5, '[]', 18),
  ('prod-20', 'cat-drinks', 'Strawberry Soda', 'strawberry-soda', 'Strawberry fruit soda.', 50, 'https://images.unsplash.com/photo-1599599810694-c0e19dfc8b4b?auto=format&fit=crop&w=900&q=80', true, false, 3, '[]', 9),
  ('prod-21', 'cat-drinks', 'Kiwi Soda', 'kiwi-soda', 'Kiwi fruit soda.', 50, 'https://images.unsplash.com/photo-1599599810694-c0e19dfc8b4b?auto=format&fit=crop&w=900&q=80', true, false, 3, '[]', 7),
  ('prod-22', 'cat-drinks', 'Green Apple Soda', 'green-apple-soda', 'Green apple fruit soda.', 50, 'https://images.unsplash.com/photo-1599599810694-c0e19dfc8b4b?auto=format&fit=crop&w=900&q=80', true, false, 3, '[]', 8),
  ('prod-23', 'cat-drinks', 'Lychee Soda', 'lychee-soda', 'Lychee fruit soda.', 50, 'https://images.unsplash.com/photo-1599599810694-c0e19dfc8b4b?auto=format&fit=crop&w=900&q=80', true, false, 3, '[]', 6)
on conflict (id) do nothing;

insert into products (id, category_id, name, slug, description, price, image_url, is_available, is_popular, prep_time_minutes, options, sold_today) values
  ('prod-24', 'cat-snacks', 'Regular Burger', 'regular-burger', 'Classic burger with bun and patty.', 45, 'https://images.unsplash.com/photo-1606755962773-d324e2dabd85?auto=format&fit=crop&w=900&q=80', true, true, 7, '[]', 20),
  ('prod-25', 'cat-snacks', 'Burger w/ Cheese', 'burger-with-cheese', 'Burger with melted cheese.', 50, 'https://images.unsplash.com/photo-1606755962773-d324e2dabd85?auto=format&fit=crop&w=900&q=80', true, true, 8, '[]', 23),
  ('prod-26', 'cat-snacks', 'Hotdog Burger', 'hotdog-burger', 'Burger with hotdog instead of patty.', 50, 'https://images.unsplash.com/photo-1606755962773-d324e2dabd85?auto=format&fit=crop&w=900&q=80', true, true, 7, '[]', 19),
  ('prod-27', 'cat-snacks', 'Fries', 'fries', 'Crispy golden fries with salt.', 25, 'https://images.unsplash.com/photo-1586190936837-c6cea6bab31d?auto=format&fit=crop&w=900&q=80', true, true, 6, '[]', 35),
  ('prod-28', 'cat-snacks', 'Fish Tofu', 'fish-tofu', 'Crispy fried tofu with fish flavor.', 30, 'https://images.unsplash.com/photo-1546069901-ba9ca3e87f0f?auto=format&fit=crop&w=900&q=80', true, false, 8, '[]', 11),
  ('prod-29', 'cat-snacks', 'Squidballs', 'squidballs', 'Deep-fried squid balls.', 20, 'https://images.unsplash.com/photo-1574521251149-2c89a40e5b5b?auto=format&fit=crop&w=900&q=80', true, false, 6, '[]', 13),
  ('prod-30', 'cat-snacks', 'Hotdog on Stick', 'hotdog-on-stick', 'Breaded hotdog on a stick.', 20, 'https://images.unsplash.com/photo-1614432547174-e0fc56d06f9e?auto=format&fit=crop&w=900&q=80', true, false, 5, '[]', 17),
  ('prod-31', 'cat-snacks', 'Siomai Pork', 'siomai-pork', 'Pork siomai dumplings.', 25, 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80', true, false, 7, '[]', 14),
  ('prod-32', 'cat-snacks', 'Siomai Beef', 'siomai-beef', 'Beef siomai dumplings.', 25, 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80', true, false, 7, '[]', 12),
  ('prod-33', 'cat-snacks', 'Siomai Japanese', 'siomai-japanese', 'Japanese-style siomai dumplings.', 30, 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80', true, true, 8, '[]', 16),
  ('prod-34', 'cat-snacks', 'Kikiam', 'kikiam', 'Fried meat roll.', 20, 'https://images.unsplash.com/photo-1574521251149-2c89a40e5b5b?auto=format&fit=crop&w=900&q=80', true, false, 6, '[]', 15),
  ('prod-35', 'cat-snacks', 'Kwik-Kwik', 'kwik-kwik', 'Fried snack stick.', 20, 'https://images.unsplash.com/photo-1574521251149-2c89a40e5b5b?auto=format&fit=crop&w=900&q=80', true, false, 6, '[]', 13),
  ('prod-36', 'cat-snacks', 'Fishball', 'fishball', 'Deep-fried fishball.', 20, 'https://images.unsplash.com/photo-1574521251149-2c89a40e5b5b?auto=format&fit=crop&w=900&q=80', true, false, 5, '[]', 18),
  ('prod-37', 'cat-snacks', 'Dynamite', 'dynamite', 'Spicy fried snack.', 20, 'https://images.unsplash.com/photo-1574521251149-2c89a40e5b5b?auto=format&fit=crop&w=900&q=80', true, false, 6, '[]', 10)
on conflict (id) do nothing;
