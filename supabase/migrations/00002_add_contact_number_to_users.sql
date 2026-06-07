-- Add contact number support to user profiles
alter table public.users
  add column if not exists contact_number text not null default '';
