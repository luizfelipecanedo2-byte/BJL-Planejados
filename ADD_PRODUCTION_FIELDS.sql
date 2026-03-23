
-- Adicionar campo de data de previsão de produção
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS production_date DATE;

-- Garantir que os campos anteriores existam
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS production_priority INTEGER DEFAULT 0;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS production_status TEXT DEFAULT 'aguardando' CHECK (production_status IN ('aguardando', 'corte', 'montagem', 'acabamento', 'pronto', 'entregue'));
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'normal' CHECK (priority_level IN ('baixa', 'normal', 'alta', 'urgente'));
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS production_notes TEXT;