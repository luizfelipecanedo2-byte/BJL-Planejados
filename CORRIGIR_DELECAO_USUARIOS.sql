-- SCRIPT DEFINITIVO PARA CORRIGIR O ERRO AO DELETAR USUÁRIOS
-- Aplica as regras APENAS no schema public (sem tocar nas tabelas internas do auth)

-- 1. PROFILES: Apaga o perfil quando o usuário for excluído
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. TASKS: Desvincula o funcionário das tarefas sem apagá-las
ALTER TABLE IF EXISTS public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey CASCADE;
ALTER TABLE IF EXISTS public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey CASCADE;

ALTER TABLE IF EXISTS public.tasks 
  ADD CONSTRAINT tasks_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.tasks 
  ADD CONSTRAINT tasks_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. BUDGETS: Mantém os orçamentos e desvincula o autor
ALTER TABLE IF EXISTS public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.budgets 
  ADD CONSTRAINT budgets_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. NOTIFICATIONS: Apaga notificações do usuário excluído
ALTER TABLE IF EXISTS public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey CASCADE;
ALTER TABLE IF EXISTS public.notifications 
  ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
