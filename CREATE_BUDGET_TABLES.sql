
-- Limpar tabelas se existirem para evitar conflitos
DROP TABLE IF EXISTS budget_items CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS budget_materials CASCADE;

-- Tabela de Materiais Base (Catálogo)
CREATE TABLE budget_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    unit_price DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Orçamentos
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    project_name TEXT NOT NULL,
    status TEXT DEFAULT 'em_elaboracao',
    days_estimated INTEGER DEFAULT 0,
    markup_factor DECIMAL(10,2) DEFAULT 1.0,
    card_fee_percent DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0,
    total_value DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens do Orçamento
CREATE TABLE budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID REFERENCES budgets(id) ON DELETE CASCADE,
    material_id UUID REFERENCES budget_materials(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price_at_time DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE budget_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso simplificadas
CREATE POLICY "Enable all for budget_materials" ON budget_materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for budgets" ON budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for budget_items" ON budget_items FOR ALL USING (true) WITH CHECK (true);

-- Inserir Materiais Iniciais
INSERT INTO budget_materials (name, category, unit, unit_price) VALUES
('Cavilha', 'FIXACAO', 'UNIDADE', 0.05),
('Parafuso (Vários)', 'FIXACAO', 'CENTO', 18.00),
('VB (Pino + VB 19mm)', 'FIXACAO', 'CONJUNTO', 1.20),
('Kit Fixação (BUCHA + PARAFUSO + TAMPINHA)', 'FIXACAO', 'KIT', 0.80),
('Cantoneira 3 Furos Níquelada', 'FIXACAO', 'UNIDADE', 0.40),
('Cantoneira 3 Furos Dourada', 'FIXACAO', 'UNIDADE', 0.50),
('Tapa Furo Branco 13mm', 'ACABAMENTO', 'CARTELA', 5.00),
('Tapa Furo Amadeirado 13mm', 'ACABAMENTO', 'CARTELA', 7.00),
('Gota de Silicone Pequena', 'ACABAMENTO', 'UNIDADE', 0.15),
('Gota de Silicone Grande', 'ACABAMENTO', 'UNIDADE', 0.25),
('Passa Fio (Branco, Cinza ou Preto)', 'ACABAMENTO', 'UNIDADE', 3.50),
('Pé de Geladeira (Pequeno)', 'ACESSORIOS', 'UNIDADE', 4.50),
('Pé de Geladeira (Grande)', 'ACESSORIOS', 'UNIDADE', 6.00),
('Pés de Plásticos (150mm)', 'ACESSORIOS', 'UNIDADE', 4.00),
('Pés de Plásticos (200mm)', 'ACESSORIOS', 'UNIDADE', 5.50),
('Rodízio Diam. 50mm c/ Freio', 'ACESSORIOS', 'UNIDADE', 12.00),
('Rodízio Diam. 50mm s/ Freio', 'ACESSORIOS', 'UNIDADE', 9.50),
('Silicone à base água', 'SUPRIMENTOS', 'TUBO', 18.00),
('Silicone Incolor / Branco Acético', 'SUPRIMENTOS', 'TUBO', 22.00),
('Fixa Espelho', 'SUPRIMENTOS', 'TUBO', 28.00),
('PL 500', 'SUPRIMENTOS', 'TUBO', 35.00),
('PL 600', 'SUPRIMENTOS', 'TUBO', 38.00),
('Kleiberit', 'SUPRIMENTOS', 'BALDINHO', 120.00),
('Estopa (1Kg)', 'SUPRIMENTOS', 'KG', 15.00),
('TANDEM BOX', 'FERRAGENS', 'CONJUNTO', 250.00),
('PISTÃO A GÁS NORMAL', 'FERRAGENS', 'UNIDADE', 15.00),
('PISTÃO A GÁS INVERSO', 'FERRAGENS', 'UNIDADE', 18.00),
('Dobradiça Standard', 'FERRAGENS', 'UNIDADE', 5.50),
('Dobradiça com Amortecedor', 'FERRAGENS', 'UNIDADE', 12.00),
('Corrediça Telescópica 450mm', 'FERRAGENS', 'PAR', 25.00),
('Trilho Invisível 450mm', 'FERRAGENS', 'PAR', 85.00),
('MDF Branco TX 06mm', 'MDF', 'CHAPA', 95.00),
('MDF Branco TX 15mm', 'MDF', 'CHAPA', 180.00),
('MDF Branco TX 18mm', 'MDF', 'CHAPA', 210.00),
('MDF Unicolor TX 15mm', 'MDF', 'CHAPA', 240.00),
('MDF Unicolor Tx 18mm', 'MDF', 'CHAPA', 280.00),
('MDF Lacca Fosca', 'MDF', 'CHAPA', 450.00),
('MDF Lacca Brilhante', 'MDF', 'CHAPA', 520.00),
('Fita de Borda Branco Tx 22x0,45mm', 'FITAS', 'METRO', 1.50),
('Fita de Borda Branco Tx 29x0,45mm', 'FITAS', 'METRO', 2.10),
('Fita de Borda Branco Tx 35x0,45mm', 'FITAS', 'METRO', 2.80),
('Fita de Borda Branco Tx 22x1,00mm', 'FITAS', 'METRO', 3.20),
('Vidros e Espelhos', 'OUTROS', 'M²', 150.00),
('Desempenador DP 105', 'OUTROS', 'UNIDADE', 45.00),
('Frete (Viagem)', 'SERVICOS', 'VIAGEM', 150.00);
