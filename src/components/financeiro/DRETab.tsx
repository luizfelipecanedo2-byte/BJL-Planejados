import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Fragment, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Printer, Sparkles, Loader2, Award, TrendingUp, TrendingDown, ShieldCheck } from "lucide-react";
import { analyzeFinancialMetrics, GeminiFinanceAnalysis } from "@/services/geminiService";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DRETabProps {
    selectedDREYear: string;
    setSelectedDREYear: (year: string) => void;
    dreData: {
        grossRevenue: number;
        taxes: number;
        netRevenue: number;
        variableCosts: number;
        contributionMargin: number;
        fixedExpenses: number;
        netResult: number;
    };
    detailedExpenses: any[];
    formatCurrency: (value: number) => string;
}

const DRETab = ({
    selectedDREYear,
    setSelectedDREYear,
    dreData,
    detailedExpenses,
    formatCurrency,
}: DRETabProps) => {
    const { settings } = useCompanySettings();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<GeminiFinanceAnalysis | null>(null);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

    // Métricas dinâmicas considerando apenas meses transcorridos se for o ano atual
    const getDREMetricsUpToCurrentMonth = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const isCurrentYear = parseInt(selectedDREYear) === currentYear;
        
        // Se for o ano atual, limitamos a análise até o mês atual (0 a 11)
        const maxMonthIndex = isCurrentYear ? currentDate.getMonth() : 11;

        const sumCategoryUpToMonth = (cat: any) => {
            return cat.monthly.slice(0, maxMonthIndex + 1).reduce((acc: number, val: number) => acc + val, 0);
        };

        let grossRevenue = 0;
        let taxes = 0;
        let variableCosts = 0;
        let fixedExpenses = 0;

        detailedExpenses.forEach(cat => {
            const categoryAmount = sumCategoryUpToMonth(cat);
            const catName = cat.category.toLowerCase();
            
            if (cat.type === 'income') {
                grossRevenue += categoryAmount;
            } else {
                const isTax = catName.includes('imposto') || 
                              catName.includes('dedução') || 
                              catName.includes('simples nacional') || 
                              catName.includes('iss') || 
                              catName.includes('pis') || 
                              catName.includes('cofins');

                const isVariable = !isTax && [
                    "despesa com serviço",
                    "custo dos serviços",
                    "serviços de terceiros",
                    "despesas com vendas",
                    "material",
                    "compra de material",
                    "insumos",
                    "mão de obra"
                ].some(keyword => catName.includes(keyword));

                if (isTax) {
                    taxes += categoryAmount;
                } else if (isVariable) {
                    variableCosts += categoryAmount;
                } else {
                    fixedExpenses += categoryAmount;
                }
            }
        });

        const netRevenue = grossRevenue - taxes;
        const contributionMargin = netRevenue - variableCosts;
        const netResult = netRevenue - variableCosts - fixedExpenses;

        return {
            grossRevenue,
            taxes,
            netRevenue,
            variableCosts,
            contributionMargin,
            fixedExpenses,
            netResult,
            maxMonthIndex,
            isCurrentYear
        };
    };

    const handleAnalyzeFinance = async () => {
        const apiKey = localStorage.getItem("bjl_gemini_api_key");
        if (!apiKey) {
            toast.error("Por favor, configure sua chave de API do Gemini na página de Configurações para usar o diagnóstico de IA.");
            return;
        }

        try {
            setIsAnalyzing(true);
            
            const metrics = getDREMetricsUpToCurrentMonth();
            
            // Filtrar detailedExpenses para mandar apenas o acumulado do período analisado para a IA
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
            toast.success("Análise financeira concluída pela Inteligência Artificial!");
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
        detailedExpenses.forEach(cat => {
            const isIncome = cat.type === 'income';
            rowsHtml += `
                <tr class="category-row ${isIncome ? 'income' : 'expense'}">
                    <td><strong>${cat.category}</strong></td>
                    ${cat.monthly.map((amount: number) => `
                        <td class="text-right">${amount > 0 ? amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}</td>
                    `).join('')}
                    <td class="text-right"><strong>${formatCurrency(cat.total)}</strong></td>
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
                    </tr>
                `;
            });
        });

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>DRE Gerencial - ${settings?.name || "BJL Planejados"}</title>
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
                        font-size: 28px;
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
                        padding: 12px 10px;
                        background: #f1f5f9;
                        border-bottom: 2px solid #cbd5e1;
                        text-align: left;
                    }
                    .dre-table th.text-right {
                        text-align: right;
                    }
                    .dre-table td {
                        font-size: 11px;
                        padding: 10px;
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
                        padding-left: 25px !important;
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
                        padding: 12px 15px;
                        font-size: 12px;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    .summary-grid tr:last-child td {
                        border-bottom: none;
                    }
                    .result-box {
                        background: #b8860b;
                        color: #fff;
                        padding: 20px;
                        border-radius: 12px;
                        text-align: center;
                        margin-bottom: 35px;
                    }
                    .result-box h2 {
                        margin: 0;
                        font-family: 'Cinzel', serif;
                        font-size: 32px;
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

                    @media print {
                        .no-print { display: none; }
                        body { margin: 0; }
                    }
                    .print-btn-container {
                        text-align: right;
                        margin-bottom: 25px;
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
                        letter-spacing: 1px;
                        transition: background 0.3s;
                    }
                    .print-btn:hover {
                        background: #996515;
                    }
                </style>
            </head>
            <body>
                <div class="print-btn-container no-print">
                    <button class="print-btn" onclick="window.print()">Imprimir DRE</button>
                </div>
                <div class="header">
                    <div class="header-info">
                        <h1>DEMONSTRATIVO DE RESULTADO (DRE)</h1>
                        <p><strong>Empresa:</strong> ${settings?.name || "BJL Planejados"}</p>
                        ${settings?.cnpj ? `<p><strong>CNPJ:</strong> ${settings.cnpj}</p>` : ""}
                        ${settings?.address ? `<p><strong>Endereço:</strong> ${settings.address}</p>` : ""}
                        <p><strong>Exercício:</strong> Ano de ${selectedDREYear}</p>
                    </div>
                    <div class="header-logo">
                        ${settings?.name?.split(' ')[0] || "BJL"}
                    </div>
                </div>

                <div class="result-box \${dreData.netResult >= 0 ? 'lucro' : 'prejuizo'}">
                    <h2>\${formatCurrency(dreData.netResult)}</h2>
                    <p>\${dreData.netResult >= 0 ? 'Lucro Líquido do Exercício' : 'Prejuízo Líquido do Exercício'}</p>
                </div>

                <table class="summary-grid">
                    <tr>
                        <td><strong>(+) Receita Bruta</strong></td>
                        <td class="text-right"><strong>\${formatCurrency(dreData.grossRevenue)}</strong></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 30px;">(-) Impostos sobre Vendas</td>
                        <td class="text-right" style="color: #64748b;">\${formatCurrency(dreData.taxes)}</td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td><strong>(=) Receita Líquida</strong></td>
                        <td class="text-right"><strong>\${formatCurrency(dreData.netRevenue)}</strong></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 30px;">(-) Custos Variáveis (Materiais/Insumos)</td>
                        <td class="text-right" style="color: #64748b;">\${formatCurrency(dreData.variableCosts)}</td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td><strong>(=) Margem de Contribuição</strong></td>
                        <td class="text-right"><strong>\${formatCurrency(dreData.contributionMargin)}</strong></td>
                    </tr>
                    <tr>
                        <td style="color: #64748b; font-style: italic; padding-left: 30px;">(-) Despesas Fixas (Operacionais/Pessoal)</td>
                        <td class="text-right" style="color: #64748b;">\${formatCurrency(dreData.fixedExpenses)}</td>
                    </tr>
                    <tr style="background: #f1f5f9;">
                        <td><strong>(=) Resultado Líquido</strong></td>
                        <td class="text-right" style="color: \${dreData.netResult >= 0 ? '#16a34a' : '#dc2626'};"><strong>\${formatCurrency(dreData.netResult)}</strong></td>
                    </tr>
                </table>

                <h3 style="font-family: 'Cinzel', serif; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-top: 40px; margin-bottom: 15px;">DETALHAMENTO MENSAL</h3>
                
                <table class="dre-table">
                    <thead>
                        <tr>
                            <th>Categoria</th>
                            \${["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map(m => \`
                                <th class="text-right">\${m}</th>
                            \`).join('')}
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        \${rowsHtml}
                    </tbody>
                </table>

                <div style="margin-top: 60px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
                    Relatório gerado em \${reportDate} • Sistema de Gestão BJL Planejados Premium
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                <div className="space-y-1">
                    <h3 className="text-2xl font-['Cinzel'] font-bold tracking-wider text-primary uppercase">DRE Gerencial</h3>
                    <p className="text-xs text-muted-foreground font-medium uppercase opacity-70">Demonstrativo do Resultado do Exercício</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
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
                        <SelectTrigger className="w-[120px] h-10 bg-background font-bold border-primary/20 rounded-xl">
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


            <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
                <Card className="lg:col-span-4 shadow-2xl border-none bg-gradient-to-b from-card to-muted/30">
                    <CardHeader className="border-b border-border/10">
                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Resumo Executivo - {selectedDREYear}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            {/* Gross Revenue */}
                            <div className="flex justify-between items-center group cursor-default">
                                <span className="font-bold text-sm text-emerald-500 uppercase tracking-tight">(+) Receita Bruta</span>
                                <span className="font-black text-lg transition-transform group-hover:scale-110">
                                    <AnimatedCounter value={dreData.grossRevenue} formatter={formatCurrency} />
                                </span>
                            </div>

                            {/* Taxes */}
                            <div className="flex justify-between items-center pl-4 text-xs text-muted-foreground italic border-l border-emerald-500/20 py-1">
                                <span>(-) Impostos s/ Vendas</span>
                                <span className="font-bold">
                                    <AnimatedCounter value={dreData.taxes} formatter={formatCurrency} />
                                </span>
                            </div>

                            {/* Net Revenue */}
                            <div className="flex justify-between items-center py-3 border-t border-b border-border/50 bg-primary/5 px-2 rounded-lg">
                                <span className="font-black text-xs uppercase tracking-widest text-primary">(=) Receita Líquida</span>
                                <span className="font-black text-primary">
                                    <AnimatedCounter value={dreData.netRevenue} formatter={formatCurrency} />
                                </span>
                            </div>

                            {/* Variable Costs */}
                            <div className="flex justify-between items-center pl-4 text-xs text-rose-500/60 italic border-l border-rose-500/20 py-1">
                                <span>(-) Custos Variáveis</span>
                                <span className="font-bold">
                                    <AnimatedCounter value={dreData.variableCosts} formatter={formatCurrency} />
                                </span>
                            </div>

                            {/* Contribution Margin */}
                            <div className="flex justify-between items-center py-3 border-t border-b border-border/50 bg-blue-500/5 px-2 rounded-lg">
                                <span className="font-black text-xs uppercase tracking-widest text-blue-500">(=) Margem de Contribuição</span>
                                <span className={`font-black ${dreData.contributionMargin >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                                    <AnimatedCounter value={dreData.contributionMargin} formatter={formatCurrency} />
                                </span>
                            </div>

                            {/* Fixed Expenses */}
                            <div className="flex justify-between items-center pl-4 text-xs text-rose-500/60 italic border-l border-rose-500/20 py-1">
                                <span>(-) Despesas Fixas</span>
                                <span className="font-bold">
                                    <AnimatedCounter value={dreData.fixedExpenses} formatter={formatCurrency} />
                                </span>
                            </div>

                            {/* Net Result */}
                            <div className={cn(
                                "flex flex-col gap-2 items-center justify-center py-8 rounded-2xl shadow-xl mt-4 transition-all hover:scale-105",
                                dreData.netResult >= 0 ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'
                            )}>
                                <span className="font-black text-[10px] text-white/80 uppercase tracking-[0.3em]">Resultado Líquido</span>
                                <span className="font-black text-3xl text-white tracking-tighter">
                                    <AnimatedCounter value={dreData.netResult} formatter={formatCurrency} />
                                </span>
                                <div className="px-3 py-1 bg-white/20 rounded-full text-[8px] font-black text-white uppercase tracking-widest mt-2 border border-white/10">
                                    {dreData.netResult >= 0 ? 'Lucro do Exercício' : 'Prejuízo do Exercício'}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-8 shadow-2xl border-border/40 bg-card/40 backdrop-blur-md border">
                    <CardHeader className="bg-muted/30 border-b border-border/40">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between w-full">
                            <span>Detalhamento por Categorias</span>
                            <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded border border-primary/20">Visão Mensal</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* Mobile View: Category Cards */}
                        <div className="md:hidden p-4 space-y-4">
                            {detailedExpenses.map((cat) => (
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
                                            <h4 className={cn(
                                                "font-black text-xs uppercase tracking-tight",
                                                cat.type === 'income' ? "text-emerald-600" : "text-primary"
                                            )}>{cat.category}</h4>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Total Anual</span>
                                            <span className={cn(
                                                "font-black text-sm",
                                                cat.type === 'income' ? "text-emerald-600" : "text-primary"
                                            )}>{formatCurrency(cat.total)}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {cat.subcategories.map((sub: any) => (
                                            <div key={sub.name} className="flex justify-between items-center group">
                                                <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-2">
                                                    <span className="w-1 h-1 rounded-full bg-border" />
                                                    {sub.name}
                                                </span>
                                                <span className="text-xs font-black text-foreground/80">{formatCurrency(sub.total)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-border/30 flex overflow-x-auto gap-3 no-scrollbar pb-1">
                                        {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map((m, idx) => (
                                            <div key={m} className="flex flex-col items-center min-w-[35px]">
                                                <span className="text-[8px] font-black text-muted-foreground uppercase">{m}</span>
                                                <span className="text-[10px] font-bold text-foreground">
                                                    {cat.monthly[idx] > 0 ? (cat.monthly[idx] / 1000).toFixed(1) + 'k' : '—'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop View: Table */}
                        <div className="hidden md:block overflow-x-auto min-h-[500px]">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 border-b-2 border-primary/10">
                                        <TableHead className="w-[200px] font-black uppercase text-[10px] tracking-widest text-primary px-6 h-14">Categoria</TableHead>
                                        {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].map(m => (
                                            <TableHead key={m} className="text-right font-black uppercase text-[9px] tracking-tight text-muted-foreground min-w-[80px]">{m}</TableHead>
                                        ))}
                                        <TableHead className="text-right font-black uppercase text-[10px] tracking-widest text-primary min-w-[100px] border-l border-primary/5 pr-6 h-14">Total Anual</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {detailedExpenses.map((cat) => {
                                        const isIncome = cat.type === 'income';
                                        return (
                                            <Fragment key={cat.category}>
                                                <TableRow className={cn(
                                                    "transition-colors border-l-2",
                                                    isIncome ? "bg-emerald-500/5 hover:bg-emerald-500/10 border-l-emerald-500" : "bg-muted/20 hover:bg-muted/40 border-l-primary/30"
                                                )}>
                                                    <TableCell className={cn(
                                                        "font-black text-xs px-6 h-12 uppercase tracking-tighter",
                                                        isIncome ? "text-emerald-600" : "text-primary"
                                                    )}>{cat.category}</TableCell>
                                                    {cat.monthly.map((amount: number, idx: number) => (
                                                        <TableCell key={idx} className="text-right text-[10px] font-bold text-foreground">
                                                            {amount > 0 ? amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '-'}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className={cn(
                                                        "text-right font-black text-xs border-l border-primary/5 pr-6",
                                                        isIncome ? "text-emerald-600 bg-emerald-500/5" : "text-primary bg-primary/5"
                                                    )}>{formatCurrency(cat.total)}</TableCell>
                                                </TableRow>
                                                {cat.subcategories.map((sub: any) => (
                                                    <TableRow key={`${cat.category}-${sub.name}`} className="hover:bg-primary/[0.02] border-b border-border/30 group">
                                                        <TableCell className="pl-12 py-3 text-[11px] font-medium text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
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
                                                        <TableCell className={cn(
                                                            "text-right font-bold text-xs transition-colors border-l border-primary/5 pr-6",
                                                            isIncome ? "text-emerald-500/70 group-hover:text-emerald-600" : "text-muted-foreground group-hover:text-primary"
                                                        )}>
                                                            {formatCurrency(sub.total)}
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

            <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
                <DialogContent className="max-w-2xl bg-slate-900 border-white/5 text-slate-100 rounded-3xl p-6 overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-['Cinzel'] font-bold text-luxury shimmer-gold uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                            Diagnóstico Financeiro IA - BJL Planejados
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-medium text-xs uppercase tracking-wider">
                            Análise crítica baseada no DRE de: {
                                (() => {
                                    const metrics = getDREMetricsUpToCurrentMonth();
                                    const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
                                    return metrics.isCurrentYear 
                                        ? `Janeiro a ${MONTH_NAMES[metrics.maxMonthIndex]} de ${selectedDREYear} (Ano em Andamento)`
                                        : `Janeiro a Dezembro de ${selectedDREYear} (Ano Completo)`;
                                })()
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {analysisResult && (
                        <div className="space-y-6 mt-4 overflow-y-auto max-h-[70vh] pr-2 scrollbar-none">
                            {/* Resumo dos Valores Analisados */}
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Fluxo de Caixa Analisado (Acumulado no Período)</span>
                                <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-300">
                                    <span className="opacity-70">Receita Bruta:</span>
                                    <span className="text-right font-bold text-emerald-400">{formatCurrency(getDREMetricsUpToCurrentMonth().grossRevenue)}</span>
                                    <span className="opacity-70">Custos Variáveis:</span>
                                    <span className="text-right font-bold text-rose-400">{formatCurrency(getDREMetricsUpToCurrentMonth().variableCosts)}</span>
                                    <span className="opacity-70">Despesas Fixas:</span>
                                    <span className="text-right font-bold text-rose-400">{formatCurrency(getDREMetricsUpToCurrentMonth().fixedExpenses)}</span>
                                    <div className="col-span-2 border-t border-white/10 my-1"></div>
                                    <span className="font-bold">Resultado Líquido do Período:</span>
                                    <span className={cn(
                                        "text-right font-black",
                                        getDREMetricsUpToCurrentMonth().netResult >= 0 ? "text-emerald-400" : "text-rose-400"
                                    )}>
                                        {formatCurrency(getDREMetricsUpToCurrentMonth().netResult)}
                                    </span>
                                </div>
                            </div>

                            {/* Saúde Financeira */}
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

                            {/* Resumo */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Award className="h-4 w-4" /> Análise do CFO IA
                                </h4>
                                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                    {analysisResult.analysis_summary}
                                </p>
                            </div>

                            {/* Detalhes de custos */}
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

                            {/* Recomendações */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4" /> Recomendações Estratégicas
                                </h4>
                                <ul className="space-y-2">
                                    {analysisResult.recommendations.map((rec, i) => (
                                        <li key={i} className="flex gap-3 text-xs text-slate-300 font-medium bg-white/5 p-3 rounded-xl border border-white/5">
                                            <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 text-amber-500 font-black">
                                                {i + 1}
                                            </span>
                                            <span className="leading-normal">{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DRETab;

