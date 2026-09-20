-- CRIAÇÃO DO SISTEMA DE SALÁRIO + EXTRAS / BÔNUS DOS COLABORADORES
-- Execute este script no SQL Editor do seu Supabase Dashboard:
-- https://supabase.com/dashboard/project/_/sql

-- 1. Adiciona a coluna salary na tabela collaborators se ainda não existir
ALTER TABLE public.collaborators ADD COLUMN IF NOT EXISTS salary NUMERIC(10,2) DEFAULT 0.00;

-- 2. Tabela de Lançamentos de Extras / Bônus dos Colaboradores
CREATE TABLE IF NOT EXISTS public.collaborator_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar segurança (RLS)
ALTER TABLE public.collaborator_extras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura extras" ON public.collaborator_extras;
CREATE POLICY "Permitir leitura extras" ON public.collaborator_extras FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insert extras" ON public.collaborator_extras;
CREATE POLICY "Permitir insert extras" ON public.collaborator_extras FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update extras" ON public.collaborator_extras;
CREATE POLICY "Permitir update extras" ON public.collaborator_extras FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir delete extras" ON public.collaborator_extras;
CREATE POLICY "Permitir delete extras" ON public.collaborator_extras FOR DELETE USING (true);
