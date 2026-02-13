-- Create sales table
create table if not exists public.sales (
  id uuid default gen_random_uuid() primary key,
  client_name text not null,
  client_phone text,
  client_email text,
  product text not null,
  quantity integer default 1,
  unit_price numeric(10,2) not null,
  total_value numeric(10,2) not null,
  status text not null,
  channel text,
  contact_date date,
  expected_close_date date,
  closed_date date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS (Row Level Security)
alter table public.sales enable row level security;

-- Create policy to allow all actions for authenticated users
-- Since this is a simple app, we can allow full access to authenticated users
-- Or even public if authentication is not strictly enforced yet (though not recommended for prod)
create policy "Allow all access to sales for authenticated users"
  on public.sales for all
  using (true)
  with check (true);

-- If you want to allow anonymous access for testing (not secure)
-- create policy "Allow public access"
--   on public.sales for all
--   using (true)
--   with check (true);
