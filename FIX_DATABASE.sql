-- RODE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE PARA CORRIGIR O ERRO
-- Link: https://supabase.com/dashboard/project/_/sql

-- 1. Cria a tabela de vendas se não existir
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

-- 2. Habilita segurança (RLS)
alter table public.sales enable row level security;

-- 3. Cria permissão para salvar e ler dados
-- Remove a política antiga se existir para evitar duplicação
drop policy if exists "Allow all access to sales for authenticated users" on public.sales;

create policy "Allow all access to sales for authenticated users"
  on public.sales for all
  using (true)
  with check (true);
