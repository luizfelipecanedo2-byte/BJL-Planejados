-- SQL Script to create performance indexes for Supabase tables
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Transactions table indexes (highly queried and filtered in Financeiro.tsx)
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON public.transactions (due_date ASC);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_date ON public.transactions (payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_financial_inst ON public.transactions (financial_institution);

-- Sales table indexes
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_budget_id ON public.sales (budget_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales (status);

-- Budgets table indexes
CREATE INDEX IF NOT EXISTS idx_budgets_created_at ON public.budgets (created_at DESC);

-- Budget Items table indexes (speeds up join queries)
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON public.budget_items (budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_material_id ON public.budget_items (material_id);

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks (due_date ASC);

-- Weekly Orders table indexes
CREATE INDEX IF NOT EXISTS idx_weekly_orders_status ON public.weekly_orders (status);
CREATE INDEX IF NOT EXISTS idx_weekly_orders_order_date ON public.weekly_orders (order_date DESC);

-- Clients table indexes
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (name ASC);
