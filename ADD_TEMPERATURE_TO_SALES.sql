-- Add temperature column (quente, morno, frio) to the sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS temperature TEXT CHECK (temperature IN ('quente', 'morno', 'frio')) DEFAULT 'morno';
