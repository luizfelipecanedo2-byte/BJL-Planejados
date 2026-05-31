-- Add budget_id column to sales table to link sales/leads with budgets
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL;
