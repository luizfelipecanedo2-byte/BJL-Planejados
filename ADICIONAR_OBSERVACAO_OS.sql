-- SQL para adicionar a coluna de observações na tabela de ordens de serviço
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS notes TEXT;
