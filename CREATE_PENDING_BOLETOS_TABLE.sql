-- Tabela para armazenar boletos encontrados via DDA (Asaas)
-- Estes boletos ficam aguardando análise antes de serem lançados no financeiro

CREATE TABLE IF NOT EXISTS public.pending_boletos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    asaas_id TEXT UNIQUE, -- ID do boleto no Asaas DDA
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL,
    due_date DATE NOT NULL,
    issue_date DATE,
    company_name TEXT, -- Nome da empresa que emitiu o boleto
    company_cnpj TEXT, -- CNPJ da empresa que emitiu o boleto
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'discarded')),
    boleto_url TEXT,
    bar_code TEXT,
    nosso_numero TEXT,
    bank_name TEXT, -- Nome do banco emissor
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL -- ID da transação criada após aprovação
);

-- Habilita RLS
ALTER TABLE public.pending_boletos ENABLE ROW LEVEL SECURITY;

-- Política de acesso para usuários autenticados
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pending_boletos' AND policyname = 'Allow all for authenticated on pending_boletos') THEN
        CREATE POLICY "Allow all for authenticated on pending_boletos" ON public.pending_boletos FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
