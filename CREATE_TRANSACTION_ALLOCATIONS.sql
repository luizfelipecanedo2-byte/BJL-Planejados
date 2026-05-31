-- Cria a tabela para guardar os rateios de custo de uma transação por cliente
create table if not exists public.transaction_allocations (
  id uuid default gen_random_uuid() primary key,
  transaction_id uuid not null, -- referência à tabela transactions, não forcei FK caso id seja string ou não exista na DB local
  client_name text not null,
  amount numeric(10,2) not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilita segurança (RLS)
alter table public.transaction_allocations enable row level security;

-- Cria permissão para salvar e ler dados
drop policy if exists "Allow all access to transaction_allocations for authenticated users" on public.transaction_allocations;

create policy "Allow all access to transaction_allocations for authenticated users"
  on public.transaction_allocations for all
  using (true)
  with check (true);
