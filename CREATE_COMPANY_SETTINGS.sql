
-- Tabela de Configurações da Empresa
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'BJL Planejados',
    cnpj TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    instagram TEXT,
    facebook TEXT,
    responsible_name TEXT DEFAULT 'Luiz Felipe Canedo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Enable read access for all" ON company_settings FOR SELECT USING (true);
CREATE POLICY "Enable all for admins" ON company_settings FOR ALL USING (true) WITH CHECK (true);

-- Inserir dados iniciais se não existirem
INSERT INTO company_settings (name, responsible_name)
SELECT 'BJL Planejados', 'Luiz Felipe Canedo'
WHERE NOT EXISTS (SELECT 1 FROM company_settings);
