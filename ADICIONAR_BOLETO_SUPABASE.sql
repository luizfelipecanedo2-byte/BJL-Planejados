-- RODE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE PARA ADICIONAR O CAMPO DE BOLETO
-- Link: https://supabase.com/dashboard/project/_/sql

-- 1. Adiciona a coluna boleto_url na tabela de transações
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS boleto_url TEXT;

-- 2. Cria o bucket 'attachments' se ele não existir (isso é feito via painel, mas o SQL abaixo ajuda com permissões)
-- O bucket deve ser criado manualmente no painel Storage com o nome 'attachments' e marcado como público.

-- 3. Permissões para o Storage (Buckets públicos)
-- Caso você já tenha o bucket 'attachments', estas políticas permitem upload e leitura:

-- Permitir leitura pública (se o bucket for público)
CREATE POLICY "Acesso Público para Leitura"
ON storage.objects FOR SELECT
USING ( bucket_id = 'attachments' );

-- Permitir upload para usuários authenticated (ou anon se preferir)
CREATE POLICY "Permitir Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'attachments' );
