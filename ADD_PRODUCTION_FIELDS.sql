
-- Adicionar campos de produção na tabela de orçamentos
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS production_priority INTEGER DEFAULT 0;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS production_status TEXT DEFAULT 'aguardando' CHECK (production_status IN ('aguardando', 'corte', 'montagem', 'acabamento', 'pronto', 'entregue'));
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'normal' CHECK (priority_level IN ('baixa', 'normal', 'alta', 'urgente'));
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS production_notes TEXT;

-- Criar índice para busca rápida por status de produção
CREATE INDEX IF NOT EXISTS idx_budgets_production_status ON budgets(production_status);
CREATE INDEX IF NOT EXISTS idx_budgets_production_priority ON budgets(production_priority);
