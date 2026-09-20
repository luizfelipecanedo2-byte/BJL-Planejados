-- CONFIGURAÇÃO DE ACESSO TOTAL (ADMINISTRADOR) PARA LUIZ FELIPE
-- Execute este script no SQL Editor do seu Supabase Dashboard:
-- https://supabase.com/dashboard/project/_/sql

-- 1. Se o usuário já tiver sido criado, atualiza seu perfil para 'admin'
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'luizfelipe@bjl.com';

-- 2. Atualiza o trigger automático para sempre que luizfelipe@bjl.com for criado, ele nascer como 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id, 
    new.email, 
    CASE 
      WHEN new.email IN ('luizfelipe@bjl.com', 'luizfelipe.canedo2@gmail.com') THEN 'admin'
      ELSE 'colaborador'
    END
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    role = CASE 
      WHEN EXCLUDED.email IN ('luizfelipe@bjl.com', 'luizfelipe.canedo2@gmail.com') THEN 'admin'
      ELSE public.profiles.role
    END;
  RETURN new;
END;
$$;
