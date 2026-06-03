-- RODE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE PARA ATUALIZAR A TABELA DE TAREFAS
-- Link: https://supabase.com/dashboard/project/_/sql

-- 1. Adiciona a coluna service_order_id à tabela tasks para relacionamento direto
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE;

-- 2. Adiciona a coluna estimated_hours à tabela tasks para armazenar a estimativa de horas por tarefa
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10,2) DEFAULT NULL;
