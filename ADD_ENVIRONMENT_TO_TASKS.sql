-- ADD ENVIRONMENT_NAME TO TASKS TABLE
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS environment_name TEXT;

-- Update existing tasks to have a default environment if needed (optional)
-- UPDATE public.tasks SET environment_name = 'Geral' WHERE environment_name IS NULL;
