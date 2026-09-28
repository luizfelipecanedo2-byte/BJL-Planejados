import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Percent, DollarSign, Calculator, Save, RotateCcw, CheckCircle2, TrendingUp, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function TaxasTab() {
    // Parâmetros de Taxas e Custos
    const [taxa10, setTaxa10] = useState<number>(11);
    const [taxa21, setTaxa21] = useState<number>(18);
    const [custoDiario, setCustoDiario] = useState<number>(470);
    const [margemLucro, setMargemLucro] = useState<number>(15);
    const [comissao, setComissao] = useState<number>(3);
    const [imposto, setImposto] = useState<number>(4);

    // Simulador em Tempo Real
    const [simulatedValue, setSimulatedValue] = useState<number>(10000);
    const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);

    useEffect(() => {
        // Carregar configurações salvas no localStorage
        const stored10 = localStorage.getItem("bjl_card_fee_10");
        const stored21 = localStorage.getItem("bjl_card_fee_21");
        const storedDaily = localStorage.getItem("bjl_daily_fixed_cost");
        const storedMargin = localStorage.getItem("bjl_default_profit_margin");
        const storedCom = localStorage.getItem("bjl_commission");
        const storedTax = localStorage.getItem("bjl_tax");

        if (stored10 !== null) setTaxa10(parseFloat(stored10) || 11);
        if (stored21 !== null) setTaxa21(parseFloat(stored21) || 18);
        if (storedDaily !== null) setCustoDiario(parseFloat(storedDaily) || 470);
        if (storedMargin !== null) setMargemLucro(parseFloat(storedMargin) || 15);
        if (storedCom !== null) setComissao(parseFloat(storedCom) || 3);
        if (storedTax !== null) setImposto(parseFloat(storedTax) || 4);
    }, []);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem("bjl_card_fee_10", taxa10.toString());
        localStorage.setItem("bjl_card_fee_21", taxa21.toString());
        localStorage.setItem("bjl_daily_fixed_cost", custoDiario.toString());
        localStorage.setItem("bjl_default_profit_margin", margemLucro.toString());
        localStorage.setItem("bjl_commission", comissao.toString());
        localStorage.setItem("bjl_tax", imposto.toString());

        setIsSavedRecently(true);
        setTimeout(() => setIsSavedRecently(false), 3000);
        toast.success("Taxas e parâmetros de precificação salvos com sucesso!");
    };

    const handleResetDefaults = () => {
        setTaxa10(11);
        setTaxa21(18);
        setCustoDiario(470);
        setMargemLucro(15);
        setComissao(3);
        setImposto(4);

        localStorage.setItem("bjl_card_fee_10", "11");
        localStorage.setItem("bjl_card_fee_21", "18");
        localStorage.setItem("bjl_daily_fixed_cost", "470");
        localStorage.setItem("bjl_default_profit_margin", "15");
        localStorage.setItem("bjl_commission", "3");
        localStorage.setItem("bjl_tax", "4");

        toast.info("Valores padrão da BJL Planejados restaurados (11% em 10x, 18% em 21x, R$ 470 diária).");
    };

    // Cálculos da simulação
    const total10 = simulatedValue * (1 + taxa10 / 100);
    const parcela10 = total10 / 10;

    const total21 = simulatedValue * (1 + taxa21 / 100);
    const parcela21 = total21 / 21;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna 1 e 2: Parâmetros de Taxas e Custos */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Taxas da Maquininha */}
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b border-white/5">
                            <CardTitle className="text-lg font-black uppercase tracking-widest text-primary flex items-center justify-between">
                                <span className="flex items-center gap-3">
                                    <CreditCard className="h-5 w-5" /> Taxas da Maquininha de Cartão
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                                    Aplicado nos Orçamentos & WhatsApp
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Defina as taxas cobradas pela sua operadora de maquininha de cartão. O sistema calcula automaticamente o valor total e o valor exato das parcelas tanto para apresentação ao cliente no orçamento impresso/PDF quanto na mensagem rápida de WhatsApp.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                                        <Percent className="h-3 w-3 text-amber-400" />
                                        Taxa Cartão em 10x (%)
                                    </Label>
                                    <div className="relative group">
                                        <Input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            value={taxa10}
                                            onChange={(e) => setTaxa10(parseFloat(e.target.value) || 0)}
                                            className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11 text-base text-amber-400"
                                        />
                                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground">Padrão da empresa: 11%</p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                                        <Percent className="h-3 w-3 text-primary" />
                                        Taxa Cartão em 21x (%)
                                    </Label>
                                    <div className="relative group">
                                        <Input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="100"
                                            value={taxa21}
                                            onChange={(e) => setTaxa21(parseFloat(e.target.value) || 0)}
                                            className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11 text-base text-primary"
                                        />
                                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground">Padrão da empresa: 18%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Custos Fixos & Margem Padrão */}
                    <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b border-white/5">
                            <CardTitle className="text-lg font-black uppercase tracking-widest text-primary flex items-center gap-3">
                                <DollarSign className="h-5 w-5" /> Custos de Oficina & Margens Padrão
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                    Custo Diário Oficina (R$)
                                </Label>
                                <div className="relative group">
                                    <Input
                                        type="number"
                                        step="1"
                                        min="0"
                                        value={custoDiario}
                                        onChange={(e) => setCustoDiario(parseFloat(e.target.value) || 0)}
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11"
                                    />
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <p className="text-[9px] text-muted-foreground">Padrão: R$ 470 / dia</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                    Margem de Lucro (%)
                                </Label>
                                <div className="relative group">
                                    <Input
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="100"
                                        value={margemLucro}
                                        onChange={(e) => setMargemLucro(parseFloat(e.target.value) || 0)}
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11 text-emerald-400"
                                    />
                                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <p className="text-[9px] text-muted-foreground">Padrão: 15%</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                    Comissão de Venda (%)
                                </Label>
                                <div className="relative group">
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="100"
                                        value={comissao}
                                        onChange={(e) => setComissao(parseFloat(e.target.value) || 0)}
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11"
                                    />
                                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <p className="text-[9px] text-muted-foreground">Padrão: 3%</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                    Impostos Padrão (%)
                                </Label>
                                <div className="relative group">
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="100"
                                        value={imposto}
                                        onChange={(e) => setImposto(parseFloat(e.target.value) || 0)}
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-bold focus:bg-white/10 transition-all pl-11"
                                    />
                                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <p className="text-[9px] text-muted-foreground">Padrão: 4%</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Coluna 3: Simulador em Tempo Real & Botões de Ação */}
                <div className="space-y-8">
                    {/* Simulador Interativo */}
                    <Card className="glass-card border-primary/20 shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                        <CardHeader className="bg-primary/10 border-b border-white/5">
                            <CardTitle className="text-base font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Calculator className="h-4 w-4" /> Simulador em Tempo Real
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                    Valor de Teste (À Vista)
                                </Label>
                                <div className="relative group">
                                    <Input
                                        type="number"
                                        step="100"
                                        min="1"
                                        value={simulatedValue}
                                        onChange={(e) => setSimulatedValue(parseFloat(e.target.value) || 0)}
                                        className="h-11 bg-white/5 border-white/10 rounded-xl font-black text-lg focus:bg-white/10 transition-all pl-11 text-emerald-400"
                                    />
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                            </div>

                            {/* Resultados da Simulação */}
                            <div className="space-y-3 pt-2">
                                {/* Opção 1: À Vista */}
                                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">À Vista</p>
                                        <p className="text-xs text-muted-foreground font-bold">Pix / Dinheiro</p>
                                    </div>
                                    <span className="text-base font-black text-emerald-400">
                                        {formatCurrency(simulatedValue)}
                                    </span>
                                </div>

                                {/* Opção 2: 10x */}
                                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                                            10x no Cartão
                                        </p>
                                        <p className="text-xs text-muted-foreground font-bold">
                                            10x de {formatCurrency(parcela10)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-base font-black text-amber-400">
                                            {formatCurrency(total10)}
                                        </span>
                                    </div>
                                </div>

                                {/* Opção 3: 21x */}
                                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                                            21x no Cartão
                                        </p>
                                        <p className="text-xs text-muted-foreground font-bold">
                                            21x de {formatCurrency(parcela21)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-base font-black text-primary">
                                            {formatCurrency(total21)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[9px] text-muted-foreground leading-relaxed text-center italic">
                                * Sem porcentagens visíveis para o cliente final. Apenas o valor das parcelas e total.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Botões de Ação */}
                    <Card className="glass-card border-white/10 p-6 space-y-4">
                        <Button
                            type="submit"
                            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {isSavedRecently ? (
                                <>
                                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                                    Taxas Salvas com Sucesso!
                                </>
                            ) : (
                                <>
                                    <Save className="h-5 w-5" />
                                    Salvar Taxas & Parâmetros
                                </>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleResetDefaults}
                            className="w-full h-11 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restaurar Padrões da Marcenaria
                        </Button>
                    </Card>
                </div>
            </form>
        </div>
    );
}
