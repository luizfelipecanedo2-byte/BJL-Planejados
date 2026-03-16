-- RODE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE
-- Link: https://supabase.com/dashboard/project/_/sql

-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    issue_date DATE DEFAULT CURRENT_DATE,
    client_name TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'Pendente' CHECK (status IN ('Autorizada', 'Processando', 'Cancelada', 'Pendente')),
    invoice_number TEXT,
    pdf_url TEXT,
    type TEXT DEFAULT 'NFS-e' CHECK (type IN ('NFS-e', 'NF-e')),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all for authenticated" ON public.invoices
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create a bucket for invoices if not exists
-- (Assuming 'attachments' bucket already exists from ADICIONAR_BOLETO_SUPABASE.sql)
