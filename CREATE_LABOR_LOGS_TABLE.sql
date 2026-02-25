-- RODE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE PARA CRIAR O BANCO DE HORAS
-- Link: https://supabase.com/dashboard/project/_/sql

-- 1. Cria a tabela de logs de horas se não existir
CREATE TABLE IF NOT EXISTS public.service_order_labor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hours DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilita segurança (RLS)
ALTER TABLE public.service_order_labor_logs ENABLE ROW LEVEL SECURITY;

-- 3. Cria permissão para salvar e ler dados
-- Remove a política antiga se existir
DROP POLICY IF EXISTS "Allow all access to labor logs for authenticated users" ON public.service_order_labor_logs;

CREATE POLICY "Allow all access to labor logs for authenticated users"
  ON public.service_order_labor_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Adiciona política para acesso anônimo se necessário (opcional, dependendo do seu projeto)
DROP POLICY IF EXISTS "Allow all access to labor logs for anyone" ON public.service_order_labor_logs;
CREATE POLICY "Allow all access to labor logs for anyone"
  ON public.service_order_labor_logs FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
