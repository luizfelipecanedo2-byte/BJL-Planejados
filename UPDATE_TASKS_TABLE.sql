-- UPDATE TASKS TABLE WITH PROJECT AND DATE
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT CURRENT_DATE;

-- Add index for better performance on filtering
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_project_name ON public.tasks(project_name);
