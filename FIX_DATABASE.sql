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

-- 4. Corrige acesso às tarefas (RLS)
alter table public.tasks enable row level security;

drop policy if exists "Allow all access to tasks for authenticated users" on public.tasks;

create policy "Allow all access to tasks for authenticated users"
  on public.tasks for all
  using (true)
  with check (true);

-- 5. Sistema de Notificações
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  title text not null,
  message text not null,
  type text default 'info',
  read boolean default false,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

drop policy if exists "Anyone can create notifications" on public.notifications;
create policy "Anyone can create notifications"
  on public.notifications for insert
  with check (true);
