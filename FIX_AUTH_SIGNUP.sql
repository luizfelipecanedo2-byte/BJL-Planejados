-- CORREÇÃO DEFINITIVA DO ERRO AO CRIAR USUÁRIO NO SUPABASE
-- Execute este script no SQL Editor do seu Supabase Dashboard:
-- https://supabase.com/dashboard/project/_/sql

-- 1. Corrige a restrição de cargos (role) para aceitar 'colaborador', 'employee' e 'admin'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'colaborador', 'employee'));

-- 2. Habilita RLS e garante permissões
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura profiles" ON public.profiles;
CREATE POLICY "Permitir leitura profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir insert profiles" ON public.profiles;
CREATE POLICY "Permitir insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update profiles" ON public.profiles;
CREATE POLICY "Permitir update profiles"
  ON public.profiles FOR UPDATE
  USING (true);

-- 3. Função do trigger automática com SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'colaborador')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$;

-- 4. Recria o trigger em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
