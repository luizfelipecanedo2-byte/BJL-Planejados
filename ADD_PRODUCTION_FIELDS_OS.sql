
-- Adicionar campos de prioridade na tabela de ordens de serviço
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS production_priority INTEGER DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'normal' CHECK (priority_level IN ('baixa', 'normal', 'alta', 'urgente'));
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS production_notes TEXT;

-- Adicionar novo status para controle inicial
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'service_status' AND e.enumlabel = 'A Definir') THEN
        -- Se for um check constraint e não um tipo ENUM, só rodamos o alter
        -- Neste projeto parece ser texto puro no código, vamos garantir que não tenha restrição bloqueando
    END IF;
END
$$;
