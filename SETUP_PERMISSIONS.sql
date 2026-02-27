
-- 1. Criar a tabela de perfis (profiles) se não existir
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text default 'colaborador' check (role in ('admin', 'colaborador')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilitar Segurança (RLS)
alter table public.profiles enable row level security;

-- 3. Políticas de acesso para a tabela profiles
drop policy if exists "Perfis são visíveis por usuários logados" on public.profiles;
create policy "Perfis são visíveis por usuários logados"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "Usuários podem atualizar seus próprios perfis" on public.profiles;
create policy "Usuários podem atualizar seus próprios perfis"
  on public.profiles for update
  using (auth.uid() = id);

-- 4. Função para criar perfil automaticamente no cadastro
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'colaborador');
  return new;
end;
$$ language plpgsql security definer;

-- 5. Trigger para chamar a função ao criar usuário
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. Configurar o seu e-mail como Administrador
-- Nota: Isso só funcionará se você já tiver criado sua conta no Supabase Auth.
-- Se ainda não criou, o trigger acima criará você como 'colaborador' e você terá que rodar este update depois.
update public.profiles
set role = 'admin'
where email = 'luizfelipe.canedo2@gmail.com';

-- 7. Restringir acesso às tabelas financeiras apenas para ADMINS
-- Importante: Isso garante que mesmo que eles descubram a URL, o banco bloqueia os dados.

-- Tabela de Transações
drop policy if exists "Permitir leitura anonima transacoes" on public.transactions;
drop policy if exists "Admins tem acesso total transacoes" on public.transactions;
create policy "Admins tem acesso total transacoes"
  on public.transactions for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Tabela de Vendas (Sales)
drop policy if exists "Allow all access to sales for authenticated users" on public.sales;
create policy "Admins tem acesso total sales"
  on public.sales for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Garantir que todos os usuários logados ainda vejam Estoque e OS
drop policy if exists "Acesso total estoque para logados" on public.inventory; -- Ajustar nome se necessário
create policy "Acesso total estoque para logados"
  on public.inventory for all
  using (auth.role() = 'authenticated');

drop policy if exists "Acesso total OS para logados" on public.service_orders;
create policy "Acesso total OS para logados"
  on public.service_orders for all
  using (auth.role() = 'authenticated');
