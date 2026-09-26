import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Fragment, useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Printer, Sparkles, Loader2, Award, TrendingUp, TrendingDown, ShieldCheck, Target, Building2, WalletCards, HelpCircle } from "lucide-react";
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
    dreData: {
        grossRevenue: number;
        taxes: number;
        netRevenue: number;
        cpv: number;
        grossProfit: number;
        grossMargin: number;
        salesExpenses: number;
        operationalExpenses: number;
        personnelExpenses: number;
        machineryExpenses: number;
        depreciation: number;
        monthlyDepreciation?: number[];
        totalOperatingExpenses: number;
        ebitda: number;
        operatingProfit: number;
        financialExpenses: number;
        financialIncome: number;
        netFinancialResult: number;
        netResult: number;
        netMargin: number;
        breakEvenPoint: number;
        // Compatibilidade legada
        variableCosts?: number;
        contributionMargin?: number;
        fixedExpenses?: number;
    };
    detailedExpenses: any[];
    formatCurrency: (value: number) => string;
}

const DRETab = ({
    selectedDREYear,
    setSelectedDREYear,
    dreRegime = 'competence',
    setDreRegime,
    dreData,
    detailedExpenses,
    formatCurrency,
}: DRETabProps) => {
    const { settings } = useCompanySettings();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<GeminiFinanceAnalysis | null>(null);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

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

        return [...detailedExpenses].sort((a, b) => {
            const priorityA = groupPriority[a.groupKey] || 99;
            const priorityB = groupPriority[b.groupKey] || 99;
            if (priorityA !== priorityB) return priorityA - priorityB;
            return b.total - a.total;
        });
    }, [detailedExpenses]);

    // Métricas dinâmicas para análise com IA até o mês atual
    const getDREMetricsUpToCurrentMonth = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const isCurrentYear = parseInt(selectedDREYear) === currentYear;
        const maxMonthIndex = isCurrentYear ? currentDate.getMonth() : 11;

        const sumCategoryUpToMonth = (cat: any) => {
            return cat.monthly.slice(0, maxMonthIndex + 1).reduce((acc: number, val: number) => acc + val, 0);
        };

        let grossRevenue = 0;
        let taxes = 0;
        let cpv = 0;
        let fixedExpenses = 0;

        detailedExpenses.forEach(cat => {
            const amount = sumCategoryUpToMonth(cat);
            if (cat.type === 'income') {
                grossRevenue += amount;
            } else if (cat.groupKey === 'deducoes_impostos') {
                taxes += amount;
            } else if (cat.groupKey === 'custos_producao') {
                cpv += amount;
            } else {
                fixedExpenses += amount;
            }
        });

        const netRevenue = grossRevenue - taxes;
        const contributionMargin = netRevenue - cpv;
        const netResult = netRevenue - cpv - fixedExpenses;

        return {
            grossRevenue,
            taxes,
            netRevenue,
            variableCosts: cpv,
            contributionMargin,
            fixedExpenses,
            netResult,
            maxMonthIndex,
            isCurrentYear
        };
    };

    const handleAnalyzeFinance = async () => {
        const apiKey = localStorage.getItem("bjl_gemini_api_key") || undefined;

        try {
            setIsAnalyzing(true);
            const metrics = getDREMetricsUpToCurrentMonth();

            const filteredExpensesForAI = detailedExpenses.map(cat => {
                const totalUpToMonth = cat.monthly.slice(0, metrics.maxMonthIndex + 1).reduce((acc: number, val: number) => acc + val, 0);
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
                    grossRevenue: metrics.grossRevenue,
                    taxes: metrics.taxes,
                    netRevenue: metrics.netRevenue,
                    variableCosts: metrics.variableCosts,
                    contributionMargin: metrics.contributionMargin,
                    fixedExpenses: metrics.fixedExpenses,
                    netResult: metrics.netResult
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

                <div class="result-box ${dreData.netResult >= 0 ? 'lucro' : 'prejuizo'}">
                    <h2>${formatCurrency(dreData.netResult)}</h2>
                    <p>${dreData.netResult >= 0 ? 'Lucro Líquido do Exercício' : 'Prejuízo Líquido do Exercício'} (${dreData.netMargin.toFixed(1)}% da Receita Líquida)</p>
                </div>

                <table class="summary-grid">
                    <tr>
                        <td><strong>(+) RECEITA OPERACIONAL BRUTA</strong></td>
                        <td class="text-right"><strong>${formatCurrency(dreData.grossRevenue)}</strong></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Deduções e Impostos sobre Vendas</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(dreData.taxes)}</td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td><strong>(=) RECEITA OPERACIONAL LÍQUIDA</strong></td>
                        <td class="text-right"><strong>${formatCurrency(dreData.netRevenue)}</strong></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Custo das Obras e Produção (CPV: MDF, Ferragens, Mão de Obra)</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(dreData.cpv)}</td>
                    </tr>
                    <tr style="background: #f0fdf4;">
                        <td><strong style="color: #166534;">(=) LUCRO BRUTO (Margem Bruta: ${dreData.grossMargin.toFixed(1)}%)</strong></td>
                        <td class="text-right"><strong style="color: #166534;">${formatCurrency(dreData.grossProfit)}</strong></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Despesas Comerciais e Vendas (Comissões, RT, Marketing)</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(dreData.salesExpenses)}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Despesas Operacionais Fixas (Aluguel, Luz, Contador, Sistemas)</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(dreData.operationalExpenses)}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Despesas com Pessoal Fixo e Pró-Labore</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(dreData.personnelExpenses)}</td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Despesas com Maquinário e Veículos</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(dreData.machineryExpenses)}</td>
                    </tr>
                    ${dreData.depreciation > 0 ? `
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(-) Depreciação de Maquinário e Ativos</td>
                        <td class="text-right" style="color: #64748b;">${formatCurrency(dreData.depreciation)}</td>
                    </tr>
                    ` : ''}
                    <tr style="background: #eff6ff;">
                        <td><strong style="color: #1e40af;">(=) EBITDA / LAJIDA (Resultado Operacional)</strong></td>
                        <td class="text-right"><strong style="color: #1e40af;">${formatCurrency(dreData.ebitda)}</strong></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 25px;">(+/-) Resultado Financeiro Líquido (Taxas Cartão / Tarifas / Rendimentos)</td>
                        <td class="text-right" style="color: ${dreData.netFinancialResult >= 0 ? '#16a34a' : '#dc2626'};">${formatCurrency(dreData.netFinancialResult)}</td>
                    </tr>
                    <tr style="background: #f1f5f9; font-size: 13px;">
                        <td><strong>(=) RESULTADO LÍQUIDO DO EXERCÍCIO</strong></td>
                        <td class="text-right" style="color: ${dreData.netResult >= 0 ? '#16a34a' : '#dc2626'};"><strong>${formatCurrency(dreData.netResult)}</strong></td>
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

    return (
        <div className="space-y-6">
            {/* Header com Controles de Regime e Ano */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-muted/20 p-5 rounded-2xl border border-border/50 backdrop-blur-md">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-['Cinzel'] font-bold tracking-wider text-primary uppercase">DRE Completa</h3>
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            100% Contábil & Gerencial
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">Demonstração do Resultado do Exercício com separação de CPV, Margem Bruta, EBITDA e Ponto de Equilíbrio</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
                    {/* Seletor de Regime: Competência vs Caixa */}
                    {setDreRegime && (
                        <div className="flex items-center bg-background/80 p-1 rounded-xl border border-border/60 shadow-sm">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={() => setDreRegime('competence')}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                dreRegime === 'competence'
                                                    ? "bg-primary text-primary-foreground shadow-md"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Building2 className="h-3.5 w-3.5" />
                                            <span>Competência</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs">
                                        <strong>Regime de Competência (DRE Oficial):</strong> Registra receitas e custos no mês em que o contrato/compra foi realizado, independente de quando é pago.
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={() => setDreRegime('cash')}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                dreRegime === 'cash'
                                                    ? "bg-primary text-primary-foreground shadow-md"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <WalletCards className="h-3.5 w-3.5" />
                                            <span>Caixa</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs">
                                        <strong>Regime de Caixa:</strong> Registra as entradas e saídas no mês em que cada parcela foi efetivamente paga ou venceu.
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}

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
                                <AnimatedCounter value={dreData.grossRevenue} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 2. Impostos s/ Vendas */}
                        <div className="flex justify-between items-center pl-3 text-xs text-muted-foreground italic border-l border-emerald-500/20 py-0.5">
                            <span>(-) Impostos sobre Vendas</span>
                            <span className="font-bold">
                                <AnimatedCounter value={dreData.taxes} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 3. Receita Líquida */}
                        <div className="flex justify-between items-center py-2.5 border-t border-b border-border/40 bg-primary/5 px-2.5 rounded-lg">
                            <span className="font-black text-xs uppercase tracking-widest text-primary">(=) Receita Líquida</span>
                            <span className="font-black text-primary text-sm">
                                <AnimatedCounter value={dreData.netRevenue} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 4. Custos CPV */}
                        <div className="flex justify-between items-center pl-3 text-xs text-rose-500/70 italic border-l border-rose-500/20 py-0.5">
                            <span className="truncate pr-2">(-) Custos de Produção / CPV</span>
                            <span className="font-bold whitespace-nowrap">
                                <AnimatedCounter value={dreData.cpv} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 5. Lucro Bruto */}
                        <div className="flex justify-between items-center py-2.5 border-t border-b border-border/40 bg-emerald-500/10 px-2.5 rounded-lg">
                            <div className="flex items-center gap-1.5">
                                <span className="font-black text-xs uppercase tracking-widest text-emerald-600">(=) Lucro Bruto</span>
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                                    {dreData.grossMargin.toFixed(1)}%
                                </span>
                            </div>
                            <span className={cn("font-black text-sm", dreData.grossProfit >= 0 ? "text-emerald-600" : "text-rose-500")}>
                                <AnimatedCounter value={dreData.grossProfit} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 6. Despesas Operacionais Desmembradas */}
                        <div className="space-y-1.5 pl-3 border-l border-rose-500/20 text-[11px] text-muted-foreground/80">
                            <div className="flex justify-between items-center py-0.5">
                                <span className="truncate pr-1">(-) Despesas com Vendas (Comissão/RT/Mkt)</span>
                                <span className="font-bold text-foreground/80">{formatCurrency(dreData.salesExpenses)}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                                <span className="truncate pr-1">(-) Despesas Operacionais / Fixas</span>
                                <span className="font-bold text-foreground/80">{formatCurrency(dreData.operationalExpenses)}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                                <span className="truncate pr-1">(-) Despesas com Pessoal</span>
                                <span className="font-bold text-foreground/80">{formatCurrency(dreData.personnelExpenses)}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5">
                                <span className="truncate pr-1">(-) Maquinário e Veículos</span>
                                <span className="font-bold text-foreground/80">{formatCurrency(dreData.machineryExpenses)}</span>
                            </div>
                            {dreData.depreciation > 0 && (
                                <div className="flex justify-between items-center py-0.5 text-amber-500/90 font-medium">
                                    <span className="truncate pr-1">(-) Depreciação de Ativos</span>
                                    <span className="font-bold">{formatCurrency(dreData.depreciation)}</span>
                                </div>
                            )}
                        </div>

                        {/* 7. EBITDA */}
                        <div className="flex justify-between items-center py-2.5 border-t border-b border-border/40 bg-blue-500/10 px-2.5 rounded-lg">
                            <div className="flex items-center gap-1.5">
                                <span className="font-black text-xs uppercase tracking-widest text-blue-500">(=) EBITDA</span>
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-500 border border-blue-500/30">
                                    {dreData.netRevenue > 0 ? ((dreData.ebitda / dreData.netRevenue) * 100).toFixed(1) + '%' : '0%'}
                                </span>
                            </div>
                            <span className={cn("font-black text-sm", dreData.ebitda >= 0 ? "text-blue-500" : "text-rose-500")}>
                                <AnimatedCounter value={dreData.ebitda} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 8. Resultado Financeiro Líquido */}
                        <div className="flex justify-between items-center pl-3 text-xs text-muted-foreground italic border-l border-blue-500/20 py-0.5">
                            <span>(+/-) Resultado Financeiro Líquido</span>
                            <span className={cn("font-bold", dreData.netFinancialResult >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                <AnimatedCounter value={dreData.netFinancialResult} formatter={formatCurrency} />
                            </span>
                        </div>

                        {/* 9. Lucro Líquido Final */}
                        <div className={cn(
                            "flex flex-col gap-1.5 items-center justify-center py-6 rounded-2xl shadow-xl mt-3 transition-all hover:scale-105",
                            dreData.netResult >= 0 ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'
                        )}>
                            <span className="font-black text-[10px] text-white/80 uppercase tracking-[0.3em]">Resultado Líquido</span>
                            <span className="font-black text-2xl text-white tracking-tighter">
                                <AnimatedCounter value={dreData.netResult} formatter={formatCurrency} />
                            </span>
                            <div className="px-3 py-0.5 bg-white/20 rounded-full text-[9px] font-black text-white uppercase tracking-widest border border-white/10 mt-1">
                                {dreData.netResult >= 0 ? 'Lucro do Exercício' : 'Prejuízo do Exercício'} ({dreData.netMargin.toFixed(1)}% Líquido)
                            </div>
                        </div>

                        {/* 10. Card de Ponto de Equilíbrio */}
                        {dreData.breakEvenPoint > 0 && (
                            <div className="p-3 bg-muted/40 rounded-xl border border-border/40 space-y-1">
                                <div className="flex items-center justify-between text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                                    <span className="flex items-center gap-1.5 text-primary">
                                        <Target className="h-3.5 w-3.5" /> Ponto de Equilíbrio Anual
                                    </span>
                                    <span>Faturamento Mínimo</span>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-xs text-muted-foreground">Necessário p/ zerar custos:</span>
                                    <span className="font-black text-xs text-foreground">{formatCurrency(dreData.breakEvenPoint)}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Tabela de Detalhamento por Categorias */}
                <Card className="lg:col-span-8 shadow-2xl border-border/40 bg-card/40 backdrop-blur-md border">
                    <CardHeader className="bg-muted/30 border-b border-border/40 py-4">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between w-full">
                            <span>Detalhamento por Categorias com Análise Vertical (AV %)</span>
                            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded border border-primary/20">
                                12 Meses • {dreRegime === 'competence' ? 'Competência' : 'Caixa'}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
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
                        </div>

                        {/* Desktop View: Table Completa com AV % */}
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
                                </TableBody>
                            </Table>
                        </div>
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
                                    <span className="text-right font-bold text-emerald-400">{formatCurrency(dreData.grossRevenue)}</span>
                                    <span className="opacity-70">Custos CPV (Materiais/Obras):</span>
                                    <span className="text-right font-bold text-rose-400">{formatCurrency(dreData.cpv)}</span>
                                    <span className="opacity-70">Lucro Bruto (Margem {dreData.grossMargin.toFixed(1)}%):</span>
                                    <span className="text-right font-bold text-emerald-400">{formatCurrency(dreData.grossProfit)}</span>
                                    <span className="opacity-70">EBITDA:</span>
                                    <span className="text-right font-bold text-blue-400">{formatCurrency(dreData.ebitda)}</span>
                                    <div className="col-span-2 border-t border-white/10 my-1"></div>
                                    <span className="font-bold">Resultado Líquido Final:</span>
                                    <span className={cn(
                                        "text-right font-black",
                                        dreData.netResult >= 0 ? "text-emerald-400" : "text-rose-400"
                                    )}>
                                        {formatCurrency(dreData.netResult)} ({dreData.netMargin.toFixed(1)}%)
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
