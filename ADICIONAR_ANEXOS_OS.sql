-- SQL para adicionar a coluna de anexos na tabela de ordens de serviço
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';
