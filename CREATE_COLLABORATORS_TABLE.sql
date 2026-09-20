-- CRIAÇÃO DA TABELA DE COLABORADORES / EQUIPE (DINÂMICO)
-- Execute este script no SQL Editor do seu Supabase Dashboard:
-- https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS public.collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT DEFAULT 'Marceneiro',
    phone TEXT,
    email TEXT,
    hourly_rate NUMERIC(10,2) DEFAULT 0.00,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Leitura e Escrita completas para usuários autenticados)
DROP POLICY IF EXISTS "Permitir leitura colaboradores" ON public.collaborators;
CREATE POLICY "Permitir leitura colaboradores"
    ON public.collaborators FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir insert colaboradores" ON public.collaborators;
CREATE POLICY "Permitir insert colaboradores"
    ON public.collaborators FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update colaboradores" ON public.collaborators;
CREATE POLICY "Permitir update colaboradores"
    ON public.collaborators FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Permitir delete colaboradores" ON public.collaborators;
CREATE POLICY "Permitir delete colaboradores"
    ON public.collaborators FOR DELETE
    USING (true);

-- Inserir equipe inicial caso a tabela esteja vazia
INSERT INTO public.collaborators (name, role, active)
SELECT name, role, true
FROM (VALUES
    ('Samuel', 'Marceneiro'),
    ('Felipe', 'Marceneiro / Montador'),
    ('Lucas', 'Marceneiro'),
    ('Zé Luiz', 'Marceneiro'),
    ('Adrian', 'Marceneiro / Colaborador')
) AS v(name, role)
WHERE NOT EXISTS (SELECT 1 FROM public.collaborators WHERE public.collaborators.name = v.name);
