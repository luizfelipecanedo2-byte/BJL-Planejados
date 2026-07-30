-- Add client_profession column to the sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS client_profession TEXT;
