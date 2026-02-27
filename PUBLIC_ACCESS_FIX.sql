
-- Garantir que as tabelas permitam acesso público para leitura durante o desenvolvimento
-- Isso resolve problemas de RLS onde os dados não aparecem sem login

-- 1. Transações
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura anonima transacoes" ON public.transactions;
CREATE POLICY "Permitir leitura anonima transacoes" ON public.transactions
    FOR SELECT USING (true);

-- 2. Patrimônio/Ativos
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura anonima assets" ON public.assets;
CREATE POLICY "Permitir leitura anonima assets" ON public.assets
    FOR SELECT USING (true);

-- 3. Gastos por Serviços
ALTER TABLE public.service_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura anonima service_expenses" ON public.service_expenses;
CREATE POLICY "Permitir leitura anonima service_expenses" ON public.service_expenses
    FOR SELECT USING (true);

-- 4. Ordem de Serviço (caso necessário para preencher campos)
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura anonima service_orders" ON public.service_orders;
CREATE POLICY "Permitir leitura anonima service_orders" ON public.service_orders
    FOR SELECT USING (true);
