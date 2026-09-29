-- ============================================================
-- TABELA DE CONTROLE DE RETALHOS E SOBRAS DE MDF (BJL PLANEJADOS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mdf_offcuts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    material_name TEXT NOT NULL,
    thickness_mm NUMERIC NOT NULL DEFAULT 15,
    length_mm NUMERIC NOT NULL,
    width_mm NUMERIC NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    grain_direction TEXT NOT NULL DEFAULT 'none', -- 'none', 'longitudinal', 'transversal'
    location TEXT DEFAULT 'Galpão Principal',
    status TEXT NOT NULL DEFAULT 'disponivel', -- 'disponivel', 'reservado', 'utilizado', 'descartado'
    reserved_project TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de Performance para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_mdf_offcuts_status ON public.mdf_offcuts(status);
CREATE INDEX IF NOT EXISTS idx_mdf_offcuts_material ON public.mdf_offcuts(material_name);
CREATE INDEX IF NOT EXISTS idx_mdf_offcuts_thickness ON public.mdf_offcuts(thickness_mm);
CREATE INDEX IF NOT EXISTS idx_mdf_offcuts_dimensions ON public.mdf_offcuts(length_mm, width_mm);

-- Habilitar RLS
ALTER TABLE public.mdf_offcuts ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Permitir leitura para todos autenticados e anonimos" ON public.mdf_offcuts;
CREATE POLICY "Permitir leitura para todos autenticados e anonimos"
    ON public.mdf_offcuts FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir insercao retalhos" ON public.mdf_offcuts;
CREATE POLICY "Permitir insercao retalhos"
    ON public.mdf_offcuts FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao retalhos" ON public.mdf_offcuts;
CREATE POLICY "Permitir atualizacao retalhos"
    ON public.mdf_offcuts FOR UPDATE
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusao retalhos" ON public.mdf_offcuts;
CREATE POLICY "Permitir exclusao retalhos"
    ON public.mdf_offcuts FOR DELETE
    USING (true);
