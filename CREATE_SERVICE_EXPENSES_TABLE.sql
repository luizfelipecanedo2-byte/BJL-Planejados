
-- Tabela para Gastos por Serviços (Adição Manual)
CREATE TABLE IF NOT EXISTS public.service_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    environment TEXT NOT NULL,
    service_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    spent_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (opcional, dependendo da configuração do projeto)
ALTER TABLE public.service_expenses ENABLE ROW LEVEL SECURITY;

-- Política simples para permitir tudo (ajuste conforme necessário)
CREATE POLICY "Permitir tudo para usuários autenticados" ON public.service_expenses
    FOR ALL USING (true) WITH CHECK (true);
