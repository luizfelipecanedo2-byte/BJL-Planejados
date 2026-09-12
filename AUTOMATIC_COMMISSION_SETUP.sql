-- ==============================================================================
-- AUTOMATIC_COMMISSION_SETUP.sql
-- BJL Planejados - Regra Comercial de Comissionamento Exclusivo (Felipe - 3%)
-- ==============================================================================
--
-- REGRAS COMERCIAIS:
-- 1. Vendedor único: Felipe (3% de comissão sobre cada venda fechada).
-- 2. Base de cálculo: Total das vendas com status 'fechado' ou 'pos_venda'
--    fechadas dentro do mês de referência (01 a 31).
-- 3. Card em tempo real no CRM:
--    - Calcula em tempo real 3% de todas as vendas fechadas no mês vigente.
--    - Ao virar o mês, zera automaticamente e passa a apurar o novo mês.
-- 4. Lançamento automático no Financeiro:
--    - Todo dia 1º, o sistema apura o total do mês recém-encerrado.
--    - Lança uma despesa no contas a pagar (tabela `transactions`) com vencimento no dia 10.
--    - Categoria: 'Despesas com vendas'
--    - Subcategoria: 'Comissão'
--    - Contato: 'Felipe'
--
-- ==============================================================================

-- 1. Garantir índices de performance para consulta ágil de vendas fechadas e lançamentos
CREATE INDEX IF NOT EXISTS idx_sales_closed_status 
ON public.sales (status, closed_date)
WHERE status IN ('fechado', 'pos_venda');

CREATE INDEX IF NOT EXISTS idx_transactions_commission_lookup
ON public.transactions (category, subcategory, competence_date);

-- 2. Função SQL opcional para apuração direta no banco de dados Postgres (Supabase)
CREATE OR REPLACE FUNCTION public.fn_calculate_and_launch_felipe_commission(
    p_ref_year INT DEFAULT NULL,
    p_ref_month INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_ref_year INT;
    v_ref_month INT;
    v_pay_year INT;
    v_pay_month INT;
    v_start_date DATE;
    v_end_date DATE;
    v_due_date DATE;
    v_competence_date DATE;
    v_total_revenue NUMERIC := 0;
    v_commission_amount NUMERIC := 0;
    v_closed_count INT := 0;
    v_invoice_num TEXT;
    v_desc TEXT;
    v_existing_id UUID;
    v_new_id UUID;
    v_month_name TEXT;
    v_month_names TEXT[] := ARRAY[
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
BEGIN
    -- Se não especificado, toma o mês anterior como referência
    IF p_ref_year IS NULL OR p_ref_month IS NULL THEN
        v_competence_date := (DATE_TRUNC('month', v_now) - INTERVAL '1 day')::DATE;
        v_ref_year := EXTRACT(YEAR FROM v_competence_date)::INT;
        v_ref_month := EXTRACT(MONTH FROM v_competence_date)::INT;
    ELSE
        v_ref_year := p_ref_year;
        v_ref_month := p_ref_month;
        v_competence_date := (DATE_TRUNC('month', MAKE_DATE(v_ref_year, v_ref_month, 1)) + INTERVAL '1 month - 1 day')::DATE;
    END IF;

    -- Mês e ano de pagamento (mês subsequente ao mês de referência)
    IF v_ref_month = 12 THEN
        v_pay_year := v_ref_year + 1;
        v_pay_month := 1;
    ELSE
        v_pay_year := v_ref_year;
        v_pay_month := v_ref_month + 1;
    END IF;

    v_month_name := v_month_names[v_ref_month];
    v_start_date := MAKE_DATE(v_ref_year, v_ref_month, 1);
    v_end_date := v_competence_date;
    v_due_date := MAKE_DATE(v_pay_year, v_pay_month, 10);
    v_invoice_num := 'COM-' || v_ref_year || LPAD(v_ref_month::TEXT, 2, '0');
    v_desc := 'Comissão Felipe (3%) - Ref: ' || v_month_name || '/' || v_ref_year;

    -- Verificar se já existe transação criada para esta competência
    SELECT id INTO v_existing_id
    FROM public.transactions
    WHERE invoice_number = v_invoice_num
       OR (description ILIKE '%' || v_desc || '%')
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'already_exists',
            'transaction_id', v_existing_id,
            'message', 'Comissão já lançada anteriormente para esta competência.'
        );
    END IF;

    -- Calcular o total vendido e fechado no mês
    SELECT 
        COALESCE(SUM(total_value), 0),
        COUNT(*)
    INTO 
        v_total_revenue,
        v_closed_count
    FROM public.sales
    WHERE status IN ('fechado', 'pos_venda')
      AND (
          (closed_date IS NOT NULL AND closed_date >= v_start_date AND closed_date <= v_end_date)
          OR (closed_date IS NULL AND contact_date >= v_start_date AND contact_date <= v_end_date)
      );

    v_commission_amount := ROUND(v_total_revenue * 0.03, 2);

    IF v_commission_amount <= 0 THEN
        RETURN jsonb_build_object(
            'status', 'no_sales',
            'total_revenue', v_total_revenue,
            'commission_amount', 0,
            'message', 'Nenhuma venda fechada no período de referência.'
        );
    END IF;

    -- Inserir o lançamento financeiro em transactions
    INSERT INTO public.transactions (
        description,
        amount,
        type,
        category,
        subcategory,
        service,
        contact,
        financial_institution,
        payment_method,
        competence_date,
        due_date,
        status,
        invoice_number,
        order_service
    ) VALUES (
        v_desc,
        v_commission_amount,
        'expense',
        'Despesas com vendas',
        'Comissão',
        'Comissão 3% sobre vendas fechadas (' || v_month_name || '/' || v_ref_year || ')',
        'Felipe',
        'Nubank',
        'Pix',
        v_competence_date,
        v_due_date,
        'pending',
        v_invoice_num,
        'Base Faturada: R$ ' || TO_CHAR(v_total_revenue, 'FM999G999G990D00')
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'transaction_id', v_new_id,
        'ref_month', v_ref_month,
        'ref_year', v_ref_year,
        'total_revenue', v_total_revenue,
        'commission_amount', v_commission_amount,
        'due_date', v_due_date,
        'closed_count', v_closed_count
    );
END;
$$;

-- Exemplo de uso manual para simulação no Supabase SQL Editor:
-- SELECT public.fn_calculate_and_launch_felipe_commission(2026, 8);
