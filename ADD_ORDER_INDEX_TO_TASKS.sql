-- Adicionar coluna para ordenação manual das tarefas (drag and drop)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
