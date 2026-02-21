-- Adiciona o campo ID de estoque na tabela inventory
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS id_estoque TEXT;

-- Se quiser que ele seja numérico e autoincremento, seria mais complexo se a tabela já existir.
-- Vamos deixar como TEXT para permitir códigos personalizados (ex: PAR-001) ou números simples.
