-- RODE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE
-- Link: https://supabase.com/dashboard/project/_/sql

-- 1. Adiciona a coluna na tabela
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS boleto_url TEXT;

-- 2. Cria o bucket de armazenamento (attachments)
-- Nota: Se der erro nesta parte, crie manualmente no menu 'Storage' com o nome 'attachments' e marque como PUBLIC.
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Libera permissões de leitura e upload para o bucket
-- Remove políticas antigas para evitar erros de duplicidade
DROP POLICY IF EXISTS "Acesso Publico" ON storage.objects;
DROP POLICY IF EXISTS "Permitir Upload" ON storage.objects;

CREATE POLICY "Acesso Publico"
ON storage.objects FOR SELECT
USING ( bucket_id = 'attachments' );

CREATE POLICY "Permitir Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'attachments' );
