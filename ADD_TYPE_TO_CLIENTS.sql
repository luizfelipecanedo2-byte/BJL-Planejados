-- EXECUTE ESTE COMANDO NO SQL EDITOR DO SUPABASE
-- Link: https://supabase.com/dashboard/project/_/sql

-- Adiciona a coluna 'type' na tabela 'clients'
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS type text DEFAULT 'cliente';

-- Atualiza registros existentes para garantir que tenham um tipo
UPDATE public.clients SET type = 'cliente' WHERE type IS NULL;
