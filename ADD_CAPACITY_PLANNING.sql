-- RODE ESTE CÓDIGO NO SQL EDITOR DO SUPABASE PARA ATUALIZAR O BANCO DE DADOS
-- Link: https://supabase.com/dashboard/project/_/sql

-- 1. Adiciona os campos de capacidade operacional na tabela de configurações da empresa
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS capacity_production_staff INTEGER DEFAULT 3;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS capacity_efficiency INTEGER DEFAULT 80;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS capacity_daily_hours INTEGER DEFAULT 8;

-- 2. Adiciona o campo de dias estimados na tabela de ordens de serviço
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS days_estimated INTEGER DEFAULT 1;

-- 3. Atualiza as permissões de leitura/escrita caso necessário (RLS já está ativo na tabela de company_settings e service_orders)
