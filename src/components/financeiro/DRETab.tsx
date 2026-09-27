import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Fragment, useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { 
    Printer, 
    Sparkles, 
    Loader2, 
    Award, 
    TrendingUp, 
    TrendingDown, 
    Target, 
    Building2, 
    WalletCards, 
    Download, 
    BarChart3, 
    Table as TableIcon, 
    PieChart as PieChartIcon, 
    DollarSign, 
    Percent 
} from "lucide-react";
import { 
    ResponsiveContainer, 
    ComposedChart, 
    Bar, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip, 
    Legend, 
    PieChart as RechartsPieChart, 
    Pie, 
    Cell 
} from "recharts";
import { analyzeFinancialMetrics, GeminiFinanceAnalysis } from "@/services/geminiService";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DRETabProps {
    selectedDREYear: string;
    setSelectedDREYear: (year: string) => void;
    dreRegime?: 'competence' | 'cash';
    setDreRegime?: (regime: 'competence' | 'cash') => void;
    dreData?: {
        grossRevenue?: number;
        taxes?: number;
        netRevenue?: number;
        cpv?: number;
        grossProfit?: number;
        grossMargin?: number;
        salesExpenses?: number;
        operationalExpenses?: number;
        personnelExpenses?: number;
        machineryExpenses?: number;
        depreciation?: number;
        monthlyDepreciation?: number[];
        totalOperatingExpenses?: number;
        ebitda?: number;
        operatingProfit?: number;
        financialExpenses?: number;
        financialIncome?: number;
        netFinancialResult?: number;
        netResult?: number;
        netMargin?: number;
        breakEvenPoint?: number;
        variableCosts?: number;
        contributionMargin?: number;
        fixedExpenses?: number;
    };
    detailedExpenses?: any[];
    formatCurrency: (value: number) => string;
}

const DRETab = ({
    selectedDREYear,
    setSelectedDREYear,
    dreRegime = 'competence',
    setDreRegime,
    dreData = {},
    detailedExpenses = [],
    formatCurrency,
}: DRETabProps) => {
    const { settings } = useCompanySettings();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<GeminiFinanceAnalysis | null>(null);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'charts'>('table');

    // Dados 100% seguros contra null/undefined
    const safeDreData = useMemo(() => ({
        grossRevenue: Number(dreData?.grossRevenue || 0),
        taxes: Number(dreData?.taxes || 0),
        netRevenue: Number(dreData?.netRevenue || 0),
        cpv: Number(dreData?.cpv || 0),
        grossProfit: Number(dreData?.grossProfit || 0),
        grossMargin: Number(dreData?.grossMargin || 0),
        salesExpenses: Number(dreData?.salesExpenses || 0),
        operationalExpenses: Number(dreData?.operationalExpenses || 0),
        personnelExpenses: Number(dreData?.personnelExpenses || 0),
        machineryExpenses: Number(dreData?.machineryExpenses || 0),
        depreciation: Number(dreData?.depreciation || 0),
        monthlyDepreciation: Array.isArray(dreData?.monthlyDepreciation) ? dreData.monthlyDepreciation : Array(12).fill(0),
        totalOperatingExpenses: Number(dreData?.totalOperatingExpenses || 0),
        ebitda: Number(dreData?.ebitda || 0),
        operatingProfit: Number(dreData?.operatingProfit || 0),
        financialExpenses: Number(dreData?.financialExpenses || 0),
        financialIncome: Number(dreData?.financialIncome || 0),
        netFinancialResult: Number(dreData?.netFinancialResult || 0),
        netResult: Number(dreData?.netResult || 0),
        netMargin: Number(dreData?.netMargin || 0),
        breakEvenPoint: Number(dreData?.breakEvenPoint || 0),
    }), [dreData]);

    const safeDetailedExpenses = useMemo(() => {
        if (!Array.isArray(detailedExpenses)) return [];
        return detailedExpenses
            .map(cat => ({
                ...cat,
                monthly: Array.isArray(cat?.monthly) ? cat.monthly : Array(12).fill(0),
                total: Number(cat?.total || 0),
                verticalAnalysis: Number(cat?.verticalAnalysis || 0),
                subcategories: Array.isArray(cat?.subcategories) ? cat.subcategories.map((sub: any) => ({
                    ...sub,
                    monthly: Array.isArray(sub?.monthly) ? sub.monthly : Array(12).fill(0),
                    total: Number(sub?.total || 0),
                    verticalAnalysis: Number(sub?.verticalAnalysis || 0)
                })).filter((sub: any) => sub.total > 0) : []
            }))
            .filter(cat => cat.total > 0);
    }, [detailedExpenses]);

    // Totais e Fechamentos Mensais Sintéticos (Jan a Dez)
    const monthlySummary = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => i);
        
        const sumGroupMonthly = (groupKey: string) => {
            const cats = safeDetailedExpenses.filter(c => c.groupKey === groupKey);
            return months.map(m => cats.reduce((acc, c) => acc + (c.monthly?.[m] || 0), 0));
        };

        const monthlyGrossRevenue = sumGroupMonthly('receita_bruta');
        const monthlyTaxes = sumGroupMonthly('deducoes_impostos');
        const monthlyNetRevenue = months.map(m => monthlyGrossRevenue[m] - monthlyTaxes[m]);
        const monthlyCPV = sumGroupMonthly('custos_producao');
        const monthlyGrossProfit = months.map(m => monthlyNetRevenue[m] - monthlyCPV[m]);

        const monthlySales = sumGroupMonthly('despesas_vendas');
        const monthlyOperational = sumGroupMonthly('despesas_operacionais');
        const monthlyPersonnel = sumGroupMonthly('despesas_pessoal');
        const monthlyMachinery = sumGroupMonthly('despesas_maquinario');

        const monthlyOperatingExpenses = months.map(m => monthlySales[m] + monthlyOperational[m] + monthlyPersonnel[m] + monthlyMachinery[m]);

        const deprMonthly = Array.isArray(safeDreData.monthlyDepreciation) ? safeDreData.monthlyDepreciation : Array(12).fill(0);
        const monthlyEBITDA = months.map(m => {
            return monthlyGrossProfit[m] - (monthlyOperatingExpenses[m] - (deprMonthly[m] || 0));
        });

        const monthlyOperatingProfit = months.map(m => monthlyGrossProfit[m] - monthlyOperatingExpenses[m]);

        const monthlyFinIncome = sumGroupMonthly('receitas_financeiras');
        const monthlyFinExpenses = sumGroupMonthly('despesas_financeiras');
        const monthlyNetFinancial = months.map(m => monthlyFinIncome[m] - monthlyFinExpenses[m]);

        const monthlyNetResult = months.map(m => monthlyOperatingProfit[m] + monthlyNetFinancial[m]);
        const monthlyTotalCostsAndExpenses = months.map(m => monthlyCPV[m] + monthlyOperatingExpenses[m] + monthlyFinExpenses[m]);

        return {
            grossRevenue: monthlyGrossRevenue,
            taxes: monthlyTaxes,
            netRevenue: monthlyNetRevenue,
            cpv: monthlyCPV,
            grossProfit: monthlyGrossProfit,
            operatingExpenses: monthlyOperatingExpenses,
            ebitda: monthlyEBITDA,
            netResult: monthlyNetResult,
            totalCostsAndExpenses: monthlyTotalCostsAndExpenses
        };
    }, [safeDetailedExpenses, safeDreData.monthlyDepreciation]);

    // Dados para os gráficos gerenciais da DRE
    const chartData = useMemo(() => {
        const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        return monthLabels.map((name, i) => ({
            month: name,
            receitaLiquida: Math.round(monthlySummary.netRevenue[i] || 0),
            gastosTotais: Math.round(monthlySummary.totalCostsAndExpenses[i] || 0),
            lucroLiquido: Math.round(monthlySummary.netResult[i] || 0),
            lucroBruto: Math.round(monthlySummary.grossProfit[i] || 0),
            ebitda: Math.round(monthlySummary.ebitda[i] || 0)
        }));
    }, [monthlySummary]);

    const costDistributionData = useMemo(() => {
        const items = [
            { name: "Custo com Materiais / CPV", value: safeDreData.cpv, color: '#f43f5e' },
            { name: "Despesas com Pessoal", value: safeDreData.personnelExpenses, color: '#8b5cf6' },
            { name: "Despesas Operacionais", value: safeDreData.operationalExpenses, color: '#3b82f6' },
            { name: "Maquinário e Veículos", value: safeDreData.machineryExpenses, color: '#f59e0b' },
            { name: "Impostos sobre Vendas", value: safeDreData.taxes, color: '#06b6d4' },
            { name: "Despesas Financeiras", value: safeDreData.financialExpenses, color: '#64748b' },
            { name: "Despesas com Vendas", value: safeDreData.salesExpenses, color: '#10b981' },
        ];
        if (safeDreData.depreciation > 0) {
            items.push({ name: "Depreciação de Ativos", value: safeDreData.depreciation, color: '#ec4899' });
        }
        return items.filter(i => i.value > 0);
    }, [safeDreData]);

    // Ordenar categorias pelo fluxo canônico da DRE contábil
    const sortedDetailedExpenses = useMemo(() => {
        const groupPriority: Record<string, number> = {
            'receita_bruta': 1,
            'deducoes_impostos': 2,
            'custos_producao': 3,
            'despesas_vendas': 4,
            'despesas_operacionais': 5,
            'despesas_pessoal': 6,
            'despesas_maquinario': 7,
            'despesas_financeiras': 8,
            'receitas_financeiras': 9,
            'transferencias': 10
        };

        return [...safeDetailedExpenses].sort((a, b) => {
            const priorityA = groupPriority[a.groupKey] || 99;
            const priorityB = groupPriority[b.groupKey] || 99;
            if (priorityA !== priorityB) return priorityA - priorityB;
            return b.total - a.total;
        });
    }, [safeDetailedExpenses]);

    const handleAnalyzeFinance = async () => {
        const apiKey = localStorage.getItem("bjl_gemini_api_key") || undefined;

        try {
            setIsAnalyzing(true);
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const isCurrentYear = parseInt(selectedDREYear) === currentYear;
            const maxMonthIndex = isCurrentYear ? currentDate.getMonth() : 11;

            const filteredExpensesForAI = safeDetailedExpenses.map(cat => {
                const totalUpToMonth = cat.monthly.slice(0, maxMonthIndex + 1).reduce((acc: number, val: number) => acc + val, 0);
                return {
                    category: cat.category,
                    type: cat.type,
                    total: totalUpToMonth
                };
            }).filter(cat => cat.total > 0);

            const result = await analyzeFinancialMetrics(
                apiKey,
                selectedDREYear,
                {
                    grossRevenue: safeDreData.grossRevenue,
                    taxes: safeDreData.taxes,
                    netRevenue: safeDreData.netRevenue,
                    variableCosts: safeDreData.cpv,
                    contributionMargin: safeDreData.grossProfit,
                    fixedExpenses: safeDreData.operationalExpenses + safeDreData.personnelExpenses + safeDreData.machineryExpenses,
                    netResult: safeDreData.netResult
                },
                filteredExpensesForAI
            );
            setAnalysisResult(result);
            setIsAnalysisOpen(true);
            toast.success("Diagnóstico financeiro concluído pela Inteligência Artificial!");
        } catch (error: any) {
            console.error("Erro na análise financeira:", error);
            toast.error(error.message || "Erro ao solicitar diagnóstico da IA.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handlePrintDRE = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            alert("Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativo.");
            return;
        }

        const reportDate = new Date().toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
        });

        let rowsHtml = "";
        sortedDetailedExpenses.forEach(cat => {
            const isIncome = cat.type === 'income';
            rowsHtml += `
                <tr class="category-row ${isIncome ? 'income' : 'expense'}">
                    <td><strong>${cat.category}</strong></td>
                    ${cat.monthly.map((amount: number) => `
                        <td class="text-right">${amount > 0 ? amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}</td>
                    `).join('')}
                    <td class="text-right"><strong>${formatCurrency(cat.total)}</strong></td>
                    <td class="text-right" style="color: #64748b;">${cat.verticalAnalysis ? cat.verticalAnalysis.toFixed(1) + '%' : '-'}</td>
                </tr>
            `;

            cat.subcategories.forEach((sub: any) => {
                rowsHtml += `
                    <tr class="subcategory-row">
                        <td class="pl-indent">${sub.name}</td>
                        ${sub.monthly.map((amount: number) => `
                            <td class="text-right">${amount > 0 ? amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}</td>
                        `).join('')}
                        <td class="text-right">${formatCurrency(sub.total)}</td>
                        <td class="text-right" style="color: #94a3b8; font-size: 10px;">${sub.verticalAnalysis ? sub.verticalAnalysis.toFixed(1) + '%' : '-'}</td>
                    </tr>
                `;
            });
        });

        // Fechamento Contábil no Relatório Impresso
        rowsHtml += `
            <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #0f172a;">
                <td><strong>(=) RECEITA OPERACIONAL LÍQUIDA</strong></td>
                ${monthlySummary.netRevenue.map(v => `<td class="text-right"><strong>${v > 0 ? v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}</strong></td>`).join('')}
                <td class="text-right"><strong>${formatCurrency(safeDreData.netRevenue)}</strong></td>
                <td class="text-right">100.0%</td>
            </tr>
            <tr style="background: #f0fdf4; font-weight: 800; color: #166534;">
                <td><strong>(=) LUCRO BRUTO (Margem: ${safeDreData.grossMargin.toFixed(1)}%)</strong></td>
                ${monthlySummary.grossProfit.map(v => `<td class="text-right"><strong>${v !== 0 ? v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}</strong></td>`).join('')}
                <td class="text-right"><strong>${formatCurrency(safeDreData.grossProfit)}</strong></td>
                <td class="text-right">${safeDreData.grossMargin.toFixed(1)}%</td>
            </tr>
            <tr style="background: #eff6ff; font-weight: 800; color: #1e40af;">
                <td><strong>(=) EBITDA (Resultado Operacional)</strong></td>
                ${monthlySummary.ebitda.map(v => `<td class="text-right"><strong>${v !== 0 ? v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}</strong></td>`).join('')}
                <td class="text-right"><strong>${formatCurrency(safeDreData.ebitda)}</strong></td>
                <td class="text-right">${safeDreData.netRevenue > 0 ? ((safeDreData.ebitda / safeDreData.netRevenue) * 100).toFixed(1) : '0.0'}%</td>
            </tr>
            <tr style="background: ${safeDreData.netResult >= 0 ? '#dcfce7' : '#fee2e2'}; font-weight: 900; color: ${safeDreData.netResult >= 0 ? '#15803d' : '#b91c1c'}; border-bottom: 3px double #0f172a;">
                <td><strong>(=) RESULTADO LÍQUIDO DO EXERCÍCIO</strong></td>
                ${monthlySummary.netResult.map(v => `<td class="text-right"><strong>${v !== 0 ? v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}</strong></td>`).join('')}
                <td class="text-right"><strong>${formatCurrency(safeDreData.netResult)}</strong></td>
                <td class="text-right">${safeDreData.netMargin.toFixed(1)}%</td>
            </tr>
        `;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>DRE Completa - ${settings?.name || "BJL Planejados"}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&family=Inter:wght@400;600;800&display=swap');
                    body {
                        font-family: 'Inter', sans-serif;
                        color: #334155;
                        margin: 40px;
                        background: #fff;
                    }
                    .header {
                        border-bottom: 2px solid #b8860b;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                    }
                    .header-info h1 {
                        font-family: 'Cinzel', serif;
                        font-size: 26px;
                        color: #0f172a;
                        margin: 0 0 5px 0;
                        letter-spacing: 1px;
                    }
                    .header-info p {
                        font-size: 12px;
                        color: #64748b;
                        margin: 2px 0;
                    }
                    .header-logo {
                        font-family: 'Cinzel', serif;
                        font-size: 24px;
                        font-weight: 800;
                        color: #b8860b;
                        letter-spacing: 2px;
                    }
                    .dre-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                    }
                    .dre-table th {
                        font-size: 10px;
                        font-weight: 800;
                        text-transform: uppercase;
                        color: #475569;
                        padding: 10px 8px;
                        background: #f1f5f9;
                        border-bottom: 2px solid #cbd5e1;
                        text-align: left;
                    }
                    .dre-table th.text-right {
                        text-align: right;
                    }
                    .dre-table td {
                        font-size: 11px;
                        padding: 8px;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    .dre-table td.text-right {
                        text-align: right;
                    }
                    .category-row {
                        background-color: #f8fafc;
                    }
                    .category-row.income {
                        background-color: #f0fdf4;
                        color: #166534;
                    }
                    .category-row.expense {
                        background-color: #fcf8f8;
                    }
                    .pl-indent {
                        padding-left: 20px !important;
                        color: #475569;
                    }
                    .summary-grid {
                        width: 100%;
                        margin-bottom: 30px;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        border-collapse: collapse;
                    }
                    .summary-grid td {
                        padding: 10px 14px;
                        font-size: 12px;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    .summary-grid tr:last-child td {
                        border-bottom: none;
                    }
                    .result-box {
                        background: #b8860b;
                        color: #fff;
                        padding: 18px;
                        border-radius: 12px;
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .result-box h2 {
                        margin: 0;
                        font-family: 'Cinzel', serif;
                        font-size: 30px;
                        letter-spacing: 1px;
                    }
                    .result-box p {
                        margin: 5px 0 0 0;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                        opacity: 0.9;
                    }
                    .result-box.lucro { background: #16a34a; }
                    .result-box.prejuizo { background: #dc2626; }
                    .regime-badge {
                        display: inline-block;
                        padding: 4px 10px;
                        background: #f1f5f9;
                        border: 1px solid #cbd5e1;
                        border-radius: 6px;
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #334155;
                        margin-top: 5px;
                    }
                    @media print {
                        .no-print { display: none; }
                        body { margin: 0; }
                    }
                    .print-btn-container {
                        text-align: right;
                        margin-bottom: 20px;
                    }
                    .print-btn {
                        background: #b8860b;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        font-size: 12px;
                        font-weight: 800;
                        border-radius: 8px;
                        cursor: pointer;
                        text-transform: uppercase;
                    }
                </style>
            </head>
            <body>
                <div class="print-btn-container no-print">
                    <button class="print-btn" onclick="window.print()">Imprimir DRE</button>
                </div>
                <div class="header">
                    <div class="header-info">
                        <h1>DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE)</h1>
                        <p><strong>Empresa:</strong> ${settings?.name || "BJL Planejados"}</p>
                        ${settings?.cnpj ? `<p><strong>CNPJ:</strong> ${settings.cnpj}</p>` : ""}
                        <p><strong>Exercício:</strong> Ano de ${selectedDREYear} &nbsp;|&nbsp; <span class="regime-badge">Regime de ${dreRegime === 'competence' ? 'Competência (Fato Gerador)' : 'Caixa (Pagamentos)'}</span></p>
                    </div>
                    <div class="header-logo">
                        ${settings?.name?.split(' ')[0] || "BJL"}
                    </div>
                </div>

                <div class="result-box ${safeDreData.netResult >= 0 ? 'lucro' : 'prejuizo'}">
                    <h2>${formatCurrency(safeDreData.netResult)}</h2>
                    <p>${safeDreData.netResult >= 0 ? 'Lucro Líquido do Exercício' : 'Prejuízo Líquido do Exercício'} (${safeDreData.netMargin.toFixed(1)}% da Receita Líquida)</p>
                </div>

                <table class="summary-grid">
                    <tr>
                        <td><strong>(+) RECEITA OPERACIONAL BRUTA</strong></td>
                        <td class="text-right"><strong>${formatCurrency(safeDreData.grossRevenue)}</strong></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Deduções e Impostos sobre Vendas</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(safeDreData.taxes)}</td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td><strong>(=) RECEITA OPERACIONAL LÍQUIDA</strong></td>
                        <td class="text-right"><strong>${formatCurrency(safeDreData.netRevenue)}</strong></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Custo das Obras e Produção (CPV: MDF, Ferragens, Mão de Obra)</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(safeDreData.cpv)}</td>
                    </tr>
                    <tr style="background: #f0fdf4;">
                        <td><strong style="color: #166534;">(=) LUCRO BRUTO (Margem Bruta: ${safeDreData.grossMargin.toFixed(1)}%)</strong></td>
                        <td class="text-right"><strong style="color: #166534;">${formatCurrency(safeDreData.grossProfit)}</strong></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Despesas Comerciais e Vendas (Comissões, RT, Marketing)</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(safeDreData.salesExpenses)}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Despesas Operacionais Fixas (Aluguel, Luz, Contador, Sistemas)</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(safeDreData.operationalExpenses)}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Despesas com Pessoal Fixo e Pró-Labore</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(safeDreData.personnelExpenses)}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Despesas com Maquinário e Veículos</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(safeDreData.machineryExpenses)}</td>
                    </tr>
                    ${safeDreData.depreciation > 0 ? `
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Depreciação de Maquinário e Ativos</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(safeDreData.depreciation)}</td>
                    </tr>
                    ` : ''}
                    <tr style="background: #eff6ff;">
                        <td><strong style="color: #1e40af;">(=) EBITDA / LAJIDA (Resultado Operacional)</strong></td>
                        <td class="text-right"><strong style="color: #1e40af;">${formatCurrency(safeDreData.ebitda)}</strong></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(+/-) Resultado Financeiro Líquido (Taxas Cartão / Tarifas / Rendimentos)</td>
                        <td class="text-right" style="color: ${safeDreData.netFinancialResult >= 0 ? '#16a34a' : '#dc2626'};">${formatCurrency(safeDreData.netFinancialResult)}</td>
                    </tr>
                    <tr style="background: #f1f5f9; font-size: 13px;">
                        <td><strong>(=) RESULTADO LÍQUIDO DO EXERCÍCIO</strong></td>
                        <td class="text-right" style="color: ${safeDreData.netResult >= 0 ? '#16a34a' : '#dc2626'};"><strong>${formatCurrency(safeDreData.netResult)}</strong></td>
                    </tr>
                </table>

                <h3 style="font-family: 'Cinzel', serif; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px; margin-bottom: 15px;">DETALHAMENTO MENSAL COM ANÁLISE VERTICAL (AV %)</h3>
                
                <table class="dre-table">
                    <thead>
                        <tr>
                            <th>Categoria</th>
                            ${["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map(m => `
                                <th class="text-right">${m}</th>
                            `).join('')}
                            <th class="text-right">Total</th>
                            <th class="text-right">AV %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div style="margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
                    DRE Gerencial Completa gerada em ${reportDate} • BJL Planejados
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleExportCSV = () => {
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const regimeLabel = dreRegime === 'competence' ? 'Regime de Competência' : 'Regime de Caixa';
        
        let csvContent = "\uFEFF"; // UTF-8 BOM para abrir sem erros de acentuação no Excel
        csvContent += `DRE - DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO - ${settings?.name || "BJL Planejados"}\n`;
        csvContent += `Exercício: ${selectedDREYear} | ${regimeLabel}\n\n`;

        // Resumo Executivo
        csvContent += `RESUMO EXECUTIVO;VALOR (R$)\n`;
        csvContent += `(+) Receita Operacional Bruta;${safeDreData.grossRevenue.toFixed(2).replace('.', ',')}\n`;
        csvContent += `(-) Impostos sobre Vendas;${safeDreData.taxes.toFixed(2).replace('.', ',')}\n`;
        csvContent += `(=) Receita Operacional Líquida;${safeDreData.netRevenue.toFixed(2).replace('.', ',')}\n`;
        csvContent += `(-) Custos de Produção / CPV;${safeDreData.cpv.toFixed(2).replace('.', ',')}\n`;
        csvContent += `(=) Lucro Bruto;${safeDreData.grossProfit.toFixed(2).replace('.', ',')}\n`;
        csvContent += `Margem Bruta (%);${safeDreData.grossMargin.toFixed(1).replace('.', ',')}%\n`;
        csvContent += `(-) Despesas Comerciais e Vendas;${safeDreData.salesExpenses.toFixed(2).replace('.', ',')}\n`;
        csvContent += `(-) Despesas Operacionais Fixas;${safeDreData.operationalExpenses.toFixed(2).replace('.', ',')}\n`;
        csvContent += `(-) Despesas com Pessoal;${safeDreData.personnelExpenses.toFixed(2).replace('.', ',')}\n`;
        csvContent += `(-) Despesas com Maquinário e Veículos;${safeDreData.machineryExpenses.toFixed(2).replace('.', ',')}\n`;
        if (safeDreData.depreciation > 0) {
            csvContent += `(-) Depreciação de Ativos;${safeDreData.depreciation.toFixed(2).replace('.', ',')}\n`;
        }
        csvContent += `(=) EBITDA / LAJIDA;${safeDreData.ebitda.toFixed(2).replace('.', ',')}\n`;
        csvContent += `(+/-) Resultado Financeiro Líquido;${safeDreData.netFinancialResult.toFixed(2).replace('.', ',')}\n`;
        csvContent += `(=) Resultado Líquido do Exercício;${safeDreData.netResult.toFixed(2).replace('.', ',')}\n`;
        csvContent += `Margem Líquida (%);${safeDreData.netMargin.toFixed(1).replace('.', ',')}%\n`;
        if (safeDreData.breakEvenPoint > 0) {
            csvContent += `Ponto de Equilíbrio Anual;${safeDreData.breakEvenPoint.toFixed(2).replace('.', ',')}\n`;
            csvContent += `Ponto de Equilíbrio Mensal Médio;${(safeDreData.breakEvenPoint / 12).toFixed(2).replace('.', ',')}\n`;
        }
        csvContent += `\n`;

        // Detalhamento Mensal
        csvContent += `DETALHAMENTO MENSAL\n`;
        csvContent += `Categoria;Subcategoria;${monthNames.join(';')};Total Anual;AV (%)\n`;

        sortedDetailedExpenses.forEach(cat => {
            const mValues = cat.monthly.map(v => v.toFixed(2).replace('.', ',')).join(';');
            csvContent += `"${cat.category}";;${mValues};${cat.total.toFixed(2).replace('.', ',')};${cat.verticalAnalysis.toFixed(1).replace('.', ',')}%\n`;
            
            cat.subcategories.forEach((sub: any) => {
                const subMValues = sub.monthly.map((v: number) => v.toFixed(2).replace('.', ',')).join(';');
                csvContent += `;"${sub.name}";${subMValues};${sub.total.toFixed(2).replace('.', ',')};${sub.verticalAnalysis.toFixed(1).replace('.', ',')}%\n`;
            });
        });

        // Fechamento Contábil no CSV
        csvContent += `\nFECHAMENTO CONTÁBIL MENSAL\n`;
        csvContent += `(=) RECEITA OPERACIONAL LÍQUIDA;;${monthlySummary.netRevenue.map(v => v.toFixed(2).replace('.', ',')).join(';')};${safeDreData.netRevenue.toFixed(2).replace('.', ',')};100,0%\n`;
        csvContent += `(=) LUCRO BRUTO;;${monthlySummary.grossProfit.map(v => v.toFixed(2).replace('.', ',')).join(';')};${safeDreData.grossProfit.toFixed(2).replace('.', ',')};${safeDreData.grossMargin.toFixed(1).replace('.', ',')}%\n`;
        csvContent += `(=) EBITDA OPERACIONAL;;${monthlySummary.ebitda.map(v => v.toFixed(2).replace('.', ',')).join(';')};${safeDreData.ebitda.toFixed(2).replace('.', ',')};${safeDreData.netRevenue > 0 ? ((safeDreData.ebitda / safeDreData.netRevenue) * 100).toFixed(1).replace('.', ',') : '0,0'}%\n`;
        csvContent += `(=) RESULTADO LÍQUIDO DO MÊS;;${monthlySummary.netResult.map(v => v.toFixed(2).replace('.', ',')).join(';')};${safeDreData.netResult.toFixed(2).replace('.', ',')};${safeDreData.netMargin.toFixed(1).replace('.', ',')}%\n`;

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `DRE_${settings?.name ? settings.name.replace(/\s+/g, '_') : 'BJL_Planejados'}_${selectedDREYear}_${dreRegime}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("DRE exportada para Excel (CSV) com sucesso!");
    };

    return (
        <div className="space-y-6">
            {/* Header com Título e Ações */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-muted/20 p-5 rounded-2xl border border-border/50 backdrop-blur-md">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-['Cinzel'] font-bold tracking-wider text-primary uppercase">DRE Completa</h3>
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            100% Contábil & Gerencial
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">Demonstração do Resultado do Exercício com separação de CPV, Margem Bruta, EBITDA e Ponto de Equilíbrio</p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAnalyzeFinance}
                        disabled={isAnalyzing}
                        className="h-10 bg-gradient-to-r from-amber-500/10 to-amber-600/10 hover:from-amber-500/20 hover:to-amber-600/20 text-amber-500 border-amber-500/20 rounded-xl font-bold flex items-center gap-2 group transition-all"
                    >
                        {isAnalyzing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="h-4 w-4 text-amber-500 group-hover:scale-125 transition-transform animate-pulse" />
                        )}
                        <span>Diagnóstico IA</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        className="h-10 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/20 rounded-xl font-bold flex items-center gap-2 transition-all"
                    >
                        <Download className="h-4 w-4" />
                        <span>Exportar Excel</span>
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrintDRE}
                        className="h-10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground border-white/10 rounded-xl font-bold flex items-center gap-2"
                    >
                        <Printer className="h-4 w-4" />
                        <span>Imprimir</span>
                    </Button>

                    <Select value={selectedDREYear} onValueChange={setSelectedDREYear}>
                        <SelectTrigger className="w-[110px] h-10 bg-background font-bold border-primary/20 rounded-xl">
                            <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2026">2026</SelectItem>
                            <SelectItem value="2027">2027</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* SELETOR DE REGIME ULTRA DESTACADO */}
            {setDreRegime && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-muted/30 border-2 border-primary/30 shadow-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                        <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5 whitespace-nowrap">
                            Regime de Visualização:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5 bg-background p-1.5 rounded-xl border border-primary/40 shadow-inner w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => {
                                    setDreRegime('competence');
                                    toast.success("DRE alternada para Regime de Competência (Fato Gerador)");
                                }}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                                    dreRegime === 'competence'
                                        ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                )}
                            >
                                <Building2 className="h-4 w-4" />
                                <span>🏢 Competência (DRE Oficial)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setDreRegime('cash');
                                    toast.success("DRE alternada para Regime de Caixa (Pagamentos e Vencimentos)");
                                }}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                                    dreRegime === 'cash'
                                        ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                )}
                            >
                                <WalletCards className="h-4 w-4" />
                                <span>💵 Caixa (Realizado)</span>
                            </button>
                        </div>
                    </div>

                    <div className="text-right text-xs font-medium text-muted-foreground">
                        {dreRegime === 'competence' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold">
                                • Somando vendas e compras na data em que foram fechadas
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[11px] font-bold">
                                • Somando as parcelas pelo mês do pagamento/vencimento
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* KPI Cards de Performance Financeira da DRE */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-card/60 backdrop-blur-md border border-border/40 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
                    <CardContent className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Margem Bruta</span>
                            <Percent className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-black text-emerald-500 tracking-tight">
                            {safeDreData.grossMargin.toFixed(1)}%
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Lucro Bruto: <strong className="text-foreground">{formatCurrency(safeDreData.grossProfit)}</strong>
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/60 backdrop-blur-md border border-border/40 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                    <CardContent className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Margem EBITDA</span>
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-black text-blue-500 tracking-tight">
                            {safeDreData.netRevenue > 0 ? ((safeDreData.ebitda / safeDreData.netRevenue) * 100).toFixed(1) + '%' : '0%'}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            EBITDA: <strong className="text-foreground">{formatCurrency(safeDreData.ebitda)}</strong>
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/60 backdrop-blur-md border border-border/40 shadow-lg relative overflow-hidden">
                    <div className={cn(
                        "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                        safeDreData.netResult >= 0 ? "from-emerald-500 to-teal-600" : "from-rose-500 to-red-600"
                    )} />
                    <CardContent className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Margem Líquida</span>
                            <DollarSign className={cn("h-4 w-4", safeDreData.netResult >= 0 ? "text-emerald-500" : "text-rose-500")} />
                        </div>
                        <div className={cn(
                            "text-2xl font-black tracking-tight",
                            safeDreData.netResult >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                            {safeDreData.netMargin.toFixed(1)}%
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            {safeDreData.netResult >= 0 ? 'Lucro Líquido: ' : 'Prejuízo: '}
                            <strong className="text-foreground">{formatCurrency(safeDreData.netResult)}</strong>
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-card/60 backdrop-blur-md border border-border/40 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600" />
                    <CardContent className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ponto Equilíbrio / Mês</span>
                            <Target className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-black text-amber-500 tracking-tight">
                            {formatCurrency(safeDreData.breakEvenPoint / 12)}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Anual: <strong className="text-foreground">{formatCurrency(safeDreData.breakEvenPoint)}</strong>
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Grid Principal: Resumo Executivo e Detalhamento */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
                {/* Resumo Executivo Estruturado */}
                <Card className="lg:col-span-4 shadow-2xl border-none bg-gradient-to-b from-card to-muted/30">
                    <CardHeader className="border-b border-border/10 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                                Resumo da DRE - {selectedDREYear}
                            </CardTitle>
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground border">
                                {dreRegime === 'competence' ? 'Competência' : 'Caixa'}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-4">
                        {/* 1. Receita Bruta */}
                        <div className="flex justify-between items-center group cursor-default">
                            <span className="font-bold text-xs text-emerald-500 uppercase tracking-tight">(+) Receita Bruta</span>
                            <span className="font-black text-base text-foreground transition-transform group-hover:scale-105">
                                <AnimatedCounter value={safeDreData.grossRevenue} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 2. Impostos s/ Vendas */}
                        <div className="flex justify-between items-center pl-3 text-xs text-muted-foreground italic border-l border-emerald-500/20 py-0.5">
                            <span>(-) Impostos sobre Vendas</span>
                            <span className="font-bold">
                                <AnimatedCounter value={safeDreData.taxes} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 3. Receita Líquida */}
                        <div className="flex justify-between items-center py-2.5 border-t border-b border-border/40 bg-primary/5 px-2.5 rounded-lg">
                            <span className="font-black text-xs uppercase tracking-widest text-primary">(=) Receita Líquida</span>
                            <span className="font-black text-primary text-sm">
                                <AnimatedCounter value={safeDreData.netRevenue} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 4. Custos CPV */}
                        <div className="flex justify-between items-center pl-3 text-xs text-rose-500/70 italic border-l border-rose-500/20 py-0.5">
                            <span className="truncate pr-2">(-) Custos de Produção / CPV</span>
                            <span className="font-bold whitespace-nowrap">
                                <AnimatedCounter value={safeDreData.cpv} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 5. Lucro Bruto */}
                        <div className="flex justify-between items-center py-2.5 border-t border-b border-border/40 bg-emerald-500/10 px-2.5 rounded-lg">
                            <div className="flex items-center gap-1.5">
                                <span className="font-black text-xs uppercase tracking-widest text-emerald-600">(=) Lucro Bruto</span>
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                                    {safeDreData.grossMargin.toFixed(1)}%
                                </span>
                            </div>
                            <span className={cn("font-black text-sm", safeDreData.grossProfit >= 0 ? "text-emerald-600" : "text-rose-500")}>
                                <AnimatedCounter value={safeDreData.grossProfit} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 6. Despesas Operacionais Desmembradas */}
                        <div className="space-y-1.5 pl-3 border-l border-rose-500/20 text-[11px] text-muted-foreground/80">
                            <div className="flex justify-between items-center py-0.5">
                                <span className="truncate pr-1">(-) Despesas com Vendas (Comissão/RT/Mkt)</span>
                                <span className="font-bold text-foreground/80">{formatCurrency(safeDreData.salesExpenses)}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                                <span className="truncate pr-1">(-) Despesas Operacionais / Fixas</span>
                                <span className="font-bold text-foreground/80">{formatCurrency(safeDreData.operationalExpenses)}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                                <span className="truncate pr-1">(-) Despesas com Pessoal</span>
                                <span className="font-bold text-foreground/80">{formatCurrency(safeDreData.personnelExpenses)}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                                <span className="truncate pr-1">(-) Maquinário e Veículos</span>
                                <span className="font-bold text-foreground/80">{formatCurrency(safeDreData.machineryExpenses)}</span>
                            </div>
                            {safeDreData.depreciation > 0 && (
                                <div className="flex justify-between items-center py-0.5 text-amber-500/90 font-medium">
                                    <span className="truncate pr-1">(-) Depreciação de Ativos</span>
                                    <span className="font-bold">{formatCurrency(safeDreData.depreciation)}</span>
                                </div>
                            )}
                        </div>

                        {/* 7. EBITDA */}
                        <div className="flex justify-between items-center py-2.5 border-t border-b border-border/40 bg-blue-500/10 px-2.5 rounded-lg">
                            <div className="flex items-center gap-1.5">
                                <span className="font-black text-xs uppercase tracking-widest text-blue-500">(=) EBITDA</span>
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-500 border border-blue-500/30">
                                    {safeDreData.netRevenue > 0 ? ((safeDreData.ebitda / safeDreData.netRevenue) * 100).toFixed(1) + '%' : '0%'}
                                </span>
                            </div>
                            <span className={cn("font-black text-sm", safeDreData.ebitda >= 0 ? "text-blue-500" : "text-rose-500")}>
                                <AnimatedCounter value={safeDreData.ebitda} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 8. Resultado Financeiro Líquido */}
                        <div className="flex justify-between items-center pl-3 text-xs text-muted-foreground italic border-l border-blue-500/20 py-0.5">
                            <span>(+/-) Resultado Financeiro Líquido</span>
                            <span className={cn("font-bold", safeDreData.netFinancialResult >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                <AnimatedCounter value={safeDreData.netFinancialResult} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 9. Lucro Líquido Final */}
                        <div className={cn(
                            "flex flex-col gap-1.5 items-center justify-center py-6 rounded-2xl shadow-xl mt-3 transition-all hover:scale-105",
                            safeDreData.netResult >= 0 ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'
                        )}>
                            <span className="font-black text-[10px] text-white/80 uppercase tracking-[0.3em]">Resultado Líquido</span>
                            <span className="font-black text-2xl text-white tracking-tighter">
                                <AnimatedCounter value={safeDreData.netResult} formatter={formatCurrency} />
                            </span>
                            <div className="px-3 py-0.5 bg-white/20 rounded-full text-[9px] font-black text-white uppercase tracking-widest border border-white/10 mt-1">
                                {safeDreData.netResult >= 0 ? 'Lucro do Exercício' : 'Prejuízo do Exercício'} ({safeDreData.netMargin.toFixed(1)}% Líquido)
                            </div>
                        </div>

                        {/* 10. Card de Ponto de Equilíbrio */}
                        {safeDreData.breakEvenPoint > 0 && (
                            <div className="p-3 bg-muted/40 rounded-xl border border-border/40 space-y-1">
                                <div className="flex items-center justify-between text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5 text-primary">
                                        <Target className="h-3.5 w-3.5" /> Ponto de Equilíbrio Anual
                                    </span>
                                    <span>Faturamento Mínimo</span>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs text-muted-foreground">Necessário p/ zerar custos:</span>
                                    <span className="font-black text-xs text-foreground">{formatCurrency(safeDreData.breakEvenPoint)}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tabela de Detalhamento por Categorias */}
                <Card className="lg:col-span-8 shadow-2xl border-border/40 bg-card/40 backdrop-blur-md border">
                    <CardHeader className="bg-muted/30 border-b border-border/40 py-3.5">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                            <div className="space-y-0.5">
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                                    <span>{viewMode === 'table' ? 'Detalhamento por Categorias' : 'Evolução e Distribuição Gerencial'}</span>
                                    <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded border border-primary/20">
                                        12 Meses • {dreRegime === 'competence' ? 'Competência' : 'Caixa'}
                                    </span>
                                </CardTitle>
                                <p className="text-[10px] text-muted-foreground font-medium">
                                    {viewMode === 'table' 
                                        ? 'Demonstração mensal com Análise Vertical (AV %) e fechamento de Lucro' 
                                        : 'Gráficos interativos da saúde financeira da marcenaria'}
                                </p>
                            </div>

                            <div className="flex items-center gap-1 bg-background/80 p-1 rounded-xl border border-border/40 shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                                        viewMode === 'table'
                                            ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                    )}
                                >
                                    <TableIcon className="h-3.5 w-3.5" />
                                    <span>Tabela DRE</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('charts')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                                        viewMode === 'charts'
                                            ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                    )}
                                >
                                    <BarChart3 className="h-3.5 w-3.5" />
                                    <span>Gráficos</span>
                                </button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {viewMode === 'charts' ? (
                            <div className="p-6 space-y-6">
                                {/* Gráfico 1: Evolução Mensal da DRE */}
                                <div className="space-y-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-primary" /> Evolução Mensal: Receita Líquida, Gastos e Lucro
                                        </h4>
                                        <div className="flex items-center gap-3 text-[11px]">
                                            <span className="flex items-center gap-1 text-emerald-500 font-bold">
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Receita Líquida
                                            </span>
                                            <span className="flex items-center gap-1 text-rose-500 font-bold">
                                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Gastos Totais
                                            </span>
                                            <span className="flex items-center gap-1 text-blue-500 font-bold">
                                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Lucro Líquido
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-[280px] w-full pt-2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                                <YAxis tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                                                <RechartsTooltip formatter={(val: any) => formatCurrency(Number(val))} />
                                                <Bar dataKey="receitaLiquida" name="Receita Líquida" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                                <Bar dataKey="gastosTotais" name="Gastos Totais" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                                <Line type="monotone" dataKey="lucroLiquido" name="Lucro Líquido" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="border-t border-border/40 pt-5">
                                    {/* Gráfico 2: Estrutura de Custos da Marcenaria */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                        <div className="h-[240px] w-full flex items-center justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsPieChart>
                                                    <Pie
                                                        data={costDistributionData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={55}
                                                        outerRadius={85}
                                                        paddingAngle={3}
                                                    >
                                                        {costDistributionData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip formatter={(val: any) => formatCurrency(Number(val))} />
                                                </RechartsPieChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="space-y-2">
                                            <h5 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                                                <PieChartIcon className="h-3.5 w-3.5 text-primary" /> Composição dos Custos & Despesas
                                            </h5>
                                            <div className="space-y-1.5">
                                                {costDistributionData.map((item) => {
                                                    const totalExpenses = costDistributionData.reduce((acc, i) => acc + i.value, 0);
                                                    const pct = totalExpenses > 0 ? ((item.value / totalExpenses) * 100).toFixed(1) : '0';
                                                    return (
                                                        <div key={item.name} className="flex items-center justify-between text-xs py-1 border-b border-border/20">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                                                <span className="text-foreground/90 font-medium">{item.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-foreground">{formatCurrency(item.value)}</span>
                                                                <span className="text-[10px] text-muted-foreground font-bold w-12 text-right">({pct}%)</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Mobile View */}
                                <div className="md:hidden p-4 space-y-4">
                                    {sortedDetailedExpenses.map((cat) => (
                                        <div key={cat.category} className={cn(
                                            "rounded-xl border p-4 shadow-sm",
                                            cat.type === 'income' ? "bg-emerald-500/[0.03] border-emerald-500/20" : "bg-card border-border/50"
                                        )}>
                                            <div className="flex justify-between items-start mb-3 border-b border-border/30 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-1.5 h-6 rounded-full",
                                                        cat.type === 'income' ? "bg-emerald-500" : "bg-primary"
                                                    )} />
                                                    <div>
                                                        <h4 className={cn(
                                                            "font-black text-xs uppercase tracking-tight",
                                                            cat.type === 'income' ? "text-emerald-600" : "text-primary"
                                                        )}>{cat.category}</h4>
                                                        <span className="text-[9px] text-muted-foreground font-semibold">
                                                            AV: {cat.verticalAnalysis ? cat.verticalAnalysis.toFixed(1) + '%' : '0%'} da Receita
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Total Anual</span>
                                                    <span className={cn(
                                                        "font-black text-sm",
                                                        cat.type === 'income' ? "text-emerald-600" : "text-foreground"
                                                    )}>{formatCurrency(cat.total)}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {cat.subcategories.map((sub: any) => (
                                                    <div key={sub.name} className="flex justify-between items-center text-xs">
                                                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                                            <span className="w-1 h-1 rounded-full bg-border" />
                                                            {sub.name}
                                                        </span>
                                                        <span className="font-bold text-foreground/80">{formatCurrency(sub.total)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Card de Fechamento do Exercício Mobile */}
                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-2.5">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-primary">Fechamento do Exercício</h4>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground font-bold">(=) Receita Líquida:</span>
                                                <span className="font-black text-primary">{formatCurrency(safeDreData.netRevenue)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground font-bold">(=) Lucro Bruto ({safeDreData.grossMargin.toFixed(1)}%):</span>
                                                <span className="font-black text-emerald-600">{formatCurrency(safeDreData.grossProfit)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground font-bold">(=) EBITDA Operacional:</span>
                                                <span className="font-black text-blue-500">{formatCurrency(safeDreData.ebitda)}</span>
                                            </div>
                                            <div className="flex justify-between pt-1 border-t border-border/40">
                                                <span className="font-black">(=) Resultado Líquido:</span>
                                                <span className={cn(
                                                    "font-black",
                                                    safeDreData.netResult >= 0 ? "text-emerald-600" : "text-rose-500"
                                                )}>
                                                    {formatCurrency(safeDreData.netResult)} ({safeDreData.netMargin.toFixed(1)}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Desktop View: Table Completa com AV % e Linhas Sintéticas */}
                                <div className="hidden md:block overflow-x-auto webkit-overflow-scrolling-touch min-h-[500px]">
                                    <Table className="min-w-[950px]">
                                        <TableHeader>
                                            <TableRow className="bg-muted/50 border-b-2 border-primary/10">
                                                <TableHead className="w-[220px] font-black uppercase text-[10px] tracking-widest text-primary px-5 h-12">Categoria</TableHead>
                                                {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map(m => (
                                                    <TableHead key={m} className="text-right font-black uppercase text-[9px] tracking-tight text-muted-foreground min-w-[65px]">{m}</TableHead>
                                                ))}
                                                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-primary min-w-[90px] border-l border-primary/5 pr-4 h-12">Total</TableHead>
                                                <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-primary min-w-[60px] pr-5 h-12">AV %</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sortedDetailedExpenses.map((cat) => {
                                                const isIncome = cat.type === 'income';
                                                return (
                                                    <Fragment key={cat.category}>
                                                        <TableRow className={cn(
                                                            "transition-colors border-l-2",
                                                            isIncome ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-l-emerald-500" : "bg-muted/20 hover:bg-muted/40 border-l-primary/30"
                                                        )}>
                                                            <TableCell className={cn(
                                                                "font-black text-xs px-5 h-11 uppercase tracking-tighter",
                                                                isIncome ? "text-emerald-600" : "text-primary"
                                                            )}>
                                                                {cat.category}
                                                            </TableCell>
                                                            {cat.monthly.map((amount: number, idx: number) => (
                                                                <TableCell key={idx} className="text-right text-[10px] font-bold text-foreground">
                                                                    {amount > 0 ? amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell className={cn(
                                                                "text-right font-black text-xs border-l border-primary/5 pr-4",
                                                                isIncome ? "text-emerald-600 bg-emerald-500/5" : "text-foreground bg-muted/10"
                                                            )}>
                                                                {formatCurrency(cat.total)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-black text-[10px] text-muted-foreground pr-5">
                                                                {cat.verticalAnalysis ? cat.verticalAnalysis.toFixed(1) + '%' : '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                        {cat.subcategories.map((sub: any) => (
                                                            <TableRow key={`${cat.category}-${sub.name}`} className="hover:bg-primary/[0.02] border-b border-border/30 group">
                                                                <TableCell className="pl-10 py-2.5 text-[11px] font-medium text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
                                                                    <span className={cn(
                                                                        "w-1 h-1 rounded-full transition-all group-hover:scale-150",
                                                                        isIncome ? "bg-emerald-500/40 group-hover:bg-emerald-500" : "bg-primary/20 group-hover:bg-primary"
                                                                    )} />
                                                                    {sub.name}
                                                                </TableCell>
                                                                {sub.monthly.map((amount: number, idx: number) => (
                                                                    <TableCell key={idx} className="text-right text-[10px] text-muted-foreground/70 group-hover:text-foreground/90 transition-colors">
                                                                        {amount > 0 ? amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}
                                                                    </TableCell>
                                                                ))}
                                                                <TableCell className="text-right font-bold text-xs text-muted-foreground border-l border-primary/5 pr-4">
                                                                    {formatCurrency(sub.total)}
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium text-[9px] text-muted-foreground/60 pr-5">
                                                                    {sub.verticalAnalysis ? sub.verticalAnalysis.toFixed(1) + '%' : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </Fragment>
                                                );
                                            })}

                                            {/* Linhas Sintéticas de Fechamento Contábil */}
                                            <TableRow className="bg-primary/5 hover:bg-primary/10 border-t-2 border-primary/30 font-black">
                                                <TableCell className="font-black text-xs px-5 h-11 uppercase tracking-tight text-primary">
                                                    (=) RECEITA OPERACIONAL LÍQUIDA
                                                </TableCell>
                                                {monthlySummary.netRevenue.map((amount: number, idx: number) => (
                                                    <TableCell key={idx} className="text-right text-[10px] font-black text-primary">
                                                        {amount > 0 ? amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right font-black text-xs border-l border-primary/20 pr-4 text-primary bg-primary/10">
                                                    {formatCurrency(safeDreData.netRevenue)}
                                                </TableCell>
                                                <TableCell className="text-right font-black text-[10px] text-primary pr-5">
                                                    100.0%
                                                </TableCell>
                                            </TableRow>

                                            <TableRow className="bg-emerald-500/10 hover:bg-emerald-500/15 border-t border-emerald-500/20 font-black">
                                                <TableCell className="font-black text-xs px-5 h-11 uppercase tracking-tight text-emerald-600 flex items-center gap-1.5">
                                                    <span>(=) LUCRO BRUTO</span>
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20">
                                                        {safeDreData.grossMargin.toFixed(1)}%
                                                    </span>
                                                </TableCell>
                                                {monthlySummary.grossProfit.map((amount: number, idx: number) => (
                                                    <TableCell key={idx} className={cn(
                                                        "text-right text-[10px] font-black",
                                                        amount >= 0 ? "text-emerald-600" : "text-rose-500"
                                                    )}>
                                                        {amount !== 0 ? amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right font-black text-xs border-l border-primary/20 pr-4 text-emerald-600 bg-emerald-500/15">
                                                    {formatCurrency(safeDreData.grossProfit)}
                                                </TableCell>
                                                <TableCell className="text-right font-black text-[10px] text-emerald-600 pr-5">
                                                    {safeDreData.grossMargin.toFixed(1)}%
                                                </TableCell>
                                            </TableRow>

                                            <TableRow className="bg-blue-500/10 hover:bg-blue-500/15 border-t border-blue-500/20 font-black">
                                                <TableCell className="font-black text-xs px-5 h-11 uppercase tracking-tight text-blue-500 flex items-center gap-1.5">
                                                    <span>(=) EBITDA OPERACIONAL</span>
                                                </TableCell>
                                                {monthlySummary.ebitda.map((amount: number, idx: number) => (
                                                    <TableCell key={idx} className={cn(
                                                        "text-right text-[10px] font-black",
                                                        amount >= 0 ? "text-blue-500" : "text-rose-500"
                                                    )}>
                                                        {amount !== 0 ? amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right font-black text-xs border-l border-primary/20 pr-4 text-blue-500 bg-blue-500/15">
                                                    {formatCurrency(safeDreData.ebitda)}
                                                </TableCell>
                                                <TableCell className="text-right font-black text-[10px] text-blue-500 pr-5">
                                                    {safeDreData.netRevenue > 0 ? ((safeDreData.ebitda / safeDreData.netRevenue) * 100).toFixed(1) + '%' : '0%'}
                                                </TableCell>
                                            </TableRow>

                                            <TableRow className={cn(
                                                "border-t-2 border-primary/40 font-black",
                                                safeDreData.netResult >= 0 ? "bg-emerald-600/15 hover:bg-emerald-600/20" : "bg-rose-600/15 hover:bg-rose-600/20"
                                            )}>
                                                <TableCell className={cn(
                                                    "font-black text-xs px-5 h-12 uppercase tracking-wider flex items-center gap-1.5",
                                                    safeDreData.netResult >= 0 ? "text-emerald-500" : "text-rose-500"
                                                )}>
                                                    <span>(=) RESULTADO LÍQUIDO</span>
                                                    <span className={cn(
                                                        "text-[9px] font-black px-2 py-0.5 rounded-full border",
                                                        safeDreData.netResult >= 0 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                                                    )}>
                                                        {safeDreData.netMargin.toFixed(1)}% LÍQUIDO
                                                    </span>
                                                </TableCell>
                                                {monthlySummary.netResult.map((amount: number, idx: number) => (
                                                    <TableCell key={idx} className="text-right text-[10px] font-black">
                                                        {amount !== 0 ? (
                                                            <span className={cn(
                                                                "px-1.5 py-0.5 rounded font-black",
                                                                amount > 0 ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
                                                            )}>
                                                                {amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                                            </span>
                                                        ) : '-'}
                                                    </TableCell>
                                                ))}
                                                <TableCell className={cn(
                                                    "text-right font-black text-sm border-l border-primary/20 pr-4",
                                                    safeDreData.netResult >= 0 ? "text-emerald-500 bg-emerald-500/20" : "text-rose-500 bg-rose-500/20"
                                                )}>
                                                    {formatCurrency(safeDreData.netResult)}
                                                </TableCell>
                                                <TableCell className={cn(
                                                    "text-right font-black text-xs pr-5",
                                                    safeDreData.netResult >= 0 ? "text-emerald-500" : "text-rose-500"
                                                )}>
                                                    {safeDreData.netMargin.toFixed(1)}%
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Diagnóstico IA Gemini */}
            <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
                <DialogContent className="max-w-2xl bg-slate-900 border-white/5 text-slate-100 rounded-3xl p-6 overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-['Cinzel'] font-bold text-luxury shimmer-gold uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                            Diagnóstico Financeiro IA - BJL Planejados
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium text-xs uppercase tracking-wider">
                            Análise crítica baseada na DRE de {selectedDREYear} • Regime de {dreRegime === 'competence' ? 'Competência' : 'Caixa'}
                        </DialogDescription>
                    </DialogHeader>

                    {analysisResult && (
                        <div className="space-y-6 mt-4 overflow-y-auto max-h-[70vh] pr-2 scrollbar-none">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Indicadores Oficiais Analisados</span>
                                <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-300">
                                    <span className="opacity-70">Receita Bruta:</span>
                                    <span className="text-right font-bold text-emerald-400">{formatCurrency(safeDreData.grossRevenue)}</span>
                                    <span className="opacity-70">Custos CPV (Materiais/Obras):</span>
                                    <span className="text-right font-bold text-rose-400">{formatCurrency(safeDreData.cpv)}</span>
                                    <span className="opacity-70">Lucro Bruto (Margem {safeDreData.grossMargin.toFixed(1)}%):</span>
                                    <span className="text-right font-bold text-emerald-400">{formatCurrency(safeDreData.grossProfit)}</span>
                                    <span className="opacity-70">EBITDA:</span>
                                    <span className="text-right font-bold text-blue-400">{formatCurrency(safeDreData.ebitda)}</span>
                                    <div className="col-span-2 border-t border-white/10 my-1"></div>
                                    <span className="font-bold">Resultado Líquido Final:</span>
                                    <span className={cn(
                                        "text-right font-black",
                                        safeDreData.netResult >= 0 ? "text-emerald-400" : "text-rose-400"
                                    )}>
                                        {formatCurrency(safeDreData.netResult)} ({safeDreData.netMargin.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Saúde de Caixa</span>
                                <span className={cn(
                                    "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border",
                                    analysisResult.health_status === "Excellent" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                                    analysisResult.health_status === "Good" && "bg-blue-500/10 text-blue-400 border-blue-500/20",
                                    analysisResult.health_status === "Regular" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                                    analysisResult.health_status === "Bad" && "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                )}>
                                    {analysisResult.health_status === "Excellent" && "Excelente"}
                                    {analysisResult.health_status === "Good" && "Boa"}
                                    {analysisResult.health_status === "Regular" && "Regular"}
                                    {analysisResult.health_status === "Bad" && "Crítica"}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Award className="h-4 w-4" /> Análise do CFO IA
                                </h4>
                                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                    {analysisResult.analysis_summary}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
                                        <TrendingDown className="h-3.5 w-3.5" /> Custos Variáveis
                                    </h5>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        {analysisResult.variable_cost_feedback}
                                    </p>
                                </div>
                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
                                        <TrendingUp className="h-3.5 w-3.5" /> Despesas Fixas
                                    </h5>
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        {analysisResult.fixed_expense_feedback}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DRETab;
