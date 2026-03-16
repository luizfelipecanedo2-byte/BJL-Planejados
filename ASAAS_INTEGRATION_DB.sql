-- MASTER SCRIPT: INTEGRAÇÃO ASAAS + NOTA FISCAL
-- RODE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE
-- Link: https://supabase.com/dashboard/project/_/sql

-- 1. Cria a tabela de Notas Fiscais (invoices) se não existir
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    issue_date DATE DEFAULT CURRENT_DATE,
    client_name TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'Pendente',
    invoice_number TEXT,
    pdf_url TEXT,
    type TEXT DEFAULT 'NFS-e' CHECK (type IN ('NFS-e', 'NF-e')),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    asaas_id TEXT,
    asaas_status TEXT
);

-- 2. Garante que as colunas da integração existam (caso a tabela já existisse sem elas)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS asaas_id TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS asaas_status TEXT;

-- 3. Habilita RLS na invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 4. Cria política para invoices se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'Allow all for authenticated on invoices') THEN
        CREATE POLICY "Allow all for authenticated on invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 5. Atualiza Clientes e Ordens de Serviço
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS asaas_id TEXT;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0;

-- 6. Cria a tabela de configurações para chaves de API
CREATE TABLE IF NOT EXISTS public.api_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_name TEXT UNIQUE NOT NULL,
    key_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilita RLS para api_settings
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

-- Política para api_settings
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_settings' AND policyname = 'Acesso total settings para autenticados') THEN
        CREATE POLICY "Acesso total settings para autenticados" ON public.api_settings FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 7. Insere o placeholder da chave Asaas
INSERT INTO public.api_settings (key_name, key_value, description)
VALUES ('asaas_api_key', 'SUA_CHAVE_AQUI', 'Chave de API do Asaas (Produção ou Sandbox)')
ON CONFLICT (key_name) DO NOTHING;
