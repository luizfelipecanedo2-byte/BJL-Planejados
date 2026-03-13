import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calculator, FileText, Search, TrendingUp, DollarSign, Package, Trash2, Pencil, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Orcamento = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    };

    // Mock data for initial view
    const [orcamentos, setOrcamentos] = useState([
        {
            id: "1",
            cliente: "João Silva",
            ambiente: "Cozinha Planejada",
            valor: 15400,
            custoEstimado: 8500,
            status: "em_elaboracao",
            data: "2024-03-10"
        },
        {
            id: "2",
            cliente: "Maria Oliveira",
            ambiente: "Dormitório Casal",
            valor: 12800,
            custoEstimado: 6200,
            status: "enviado",
            data: "2024-03-12"
        },
        {
            id: "3",
            cliente: "Pedro Santos",
            ambiente: "Sala de Estar",
            valor: 8900,
            custoEstimado: 4100,
            status: "aprovado",
            data: "2024-03-05"
        }
    ]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "em_elaboracao":
                return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-200 font-bold uppercase text-[9px] tracking-widest px-2 py-0.5">Em Elaboração</Badge>;
            case "enviado":
                return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200 font-bold uppercase text-[9px] tracking-widest px-2 py-0.5">Enviado</Badge>;
            case "aprovado":
                return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 font-bold uppercase text-[9px] tracking-widest px-2 py-0.5">Aprovado</Badge>;
            case "rejeitado":
                return <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 border-rose-200 font-bold uppercase text-[9px] tracking-widest px-2 py-0.5">Rejeitado</Badge>;
            default:
                return <Badge className="uppercase text-[9px] tracking-widest">{status}</Badge>;
        }
    };

    const handleNewOrcamento = (e: React.FormEvent) => {
        e.preventDefault();
        toast.success("Funcionalidade de salvar orçamentos será integrada em breve!");
        setIsDialogOpen(false);
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-primary uppercase">Orçamentos</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-60">Gestão de propostas técnico-comerciais</p>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-xs px-8 h-14 rounded-2xl shadow-2xl shadow-primary/20 gap-3 transition-all hover:scale-105 active:scale-95 group">
                            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                            Novo Orçamento
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] border-none shadow-2xl rounded-3xl overflow-hidden p-0">
                        <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Calculator size={120} />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black uppercase tracking-tighter">Criar Nova Proposta</h3>
                                <p className="text-xs opacity-80 font-bold uppercase tracking-widest mt-1">Preencha os dados básicos para iniciar o projeto</p>
                            </div>
                        </div>
                        <form onSubmit={handleNewOrcamento} className="p-8 space-y-6 bg-card">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="cliente" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cliente</Label>
                                    <Input id="cliente" placeholder="Nome completo do cliente" className="rounded-xl border-muted bg-muted/20 focus:ring-primary h-12" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="ambiente" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ambiente</Label>
                                    <Input id="ambiente" placeholder="Ex: Cozinha, Dormitório..." className="rounded-xl border-muted bg-muted/20 focus:ring-primary h-12" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="valor" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor Estimado (R$)</Label>
                                    <Input id="valor" type="number" placeholder="0,00" className="rounded-xl border-muted bg-muted/20 focus:ring-primary h-12 font-bold" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="prazo" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Prazo Estimado (Dias)</Label>
                                    <Input id="prazo" type="number" placeholder="Ex: 30" className="rounded-xl border-muted bg-muted/20 focus:ring-primary h-12" required />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 h-12 font-black uppercase tracking-widest text-[10px] rounded-xl">Cancelar</Button>
                                <Button type="submit" className="flex-1 bg-primary h-12 font-black uppercase tracking-widest text-[10px] rounded-xl">Gerar Orçamento</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-blue-500/5 border-blue-500/20 border-l-4 border-l-blue-500 p-6 flex flex-col gap-3 shadow-xl shadow-blue-500/5 transition-all hover:translate-y-[-4px] group">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                            <Calculator size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600/50 group-hover:text-blue-600 transition-colors">Total Aberto</span>
                    </div>
                    <div>
                        <span className="text-3xl font-black text-blue-600 tracking-tighter">{formatCurrency(28200)}</span>
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight mt-1 opacity-60">Soma de orçamentos pendentes</p>
                    </div>
                </Card>

                <Card className="bg-emerald-500/5 border-emerald-500/20 border-l-4 border-l-emerald-500 p-6 flex flex-col gap-3 shadow-xl shadow-emerald-500/5 transition-all hover:translate-y-[-4px] group">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 group-hover:text-emerald-600 transition-colors">Aprovados</span>
                    </div>
                    <div>
                        <span className="text-3xl font-black text-emerald-600 tracking-tighter">{formatCurrency(8900)}</span>
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight mt-1 opacity-60">Conversão em vendas (mês)</p>
                    </div>
                </Card>

                <Card className="bg-amber-500/5 border-amber-500/20 border-l-4 border-l-amber-500 p-6 flex flex-col gap-3 shadow-xl shadow-amber-500/5 transition-all hover:translate-y-[-4px] group">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                            <DollarSign size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/50 group-hover:text-amber-600 transition-colors">Ticket Médio</span>
                    </div>
                    <div>
                        <span className="text-3xl font-black text-amber-600 tracking-tighter">{formatCurrency(12366)}</span>
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight mt-1 opacity-60">Valor médio por proposta</p>
                    </div>
                </Card>

                <Card className="bg-primary/5 border-primary/20 border-l-4 border-l-primary p-6 flex flex-col gap-3 shadow-xl shadow-primary/5 transition-all hover:translate-y-[-4px] group">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <FileText size={18} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/50 group-hover:text-primary transition-colors">Eficiência</span>
                    </div>
                    <div>
                        <span className="text-3xl font-black text-primary tracking-tighter">72%</span>
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight mt-1 opacity-60">Taxa de aprovação geral</p>
                    </div>
                </Card>
            </div>

            <Card className="border-none shadow-2xl bg-card overflow-hidden rounded-[2.5rem]">
                <CardHeader className="p-8 border-b border-border/10 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl text-primary border border-border shadow-sm">
                            <Package className="h-6 w-6" />
                        </div>
                        <div className="space-y-0.5">
                            <CardTitle className="text-lg font-black uppercase tracking-tighter text-foreground">Propostas Recentes</CardTitle>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">Relatório detalhado de propostas comerciais</p>
                        </div>
                    </div>
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                            placeholder="Filtrar por cliente ou ambiente..."
                            className="pl-12 bg-white border-border/50 h-12 rounded-2xl text-xs font-medium shadow-inner focus:ring-2 focus:ring-primary/20 appearance-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-slate-50 text-muted-foreground/50 h-16 border-b border-border/10">
                                    <th className="px-8 text-left font-black uppercase tracking-[0.1em] text-[10px]">Identificação</th>
                                    <th className="px-8 text-left font-black uppercase tracking-[0.1em] text-[10px]">Ambiente</th>
                                    <th className="px-8 text-left font-black uppercase tracking-[0.1em] text-[10px]">Data Criação</th>
                                    <th className="px-8 text-right font-black uppercase tracking-[0.1em] text-[10px]">Valor Proposta</th>
                                    <th className="px-8 text-center font-black uppercase tracking-[0.1em] text-[10px]">Status Ativo</th>
                                    <th className="px-8 text-right font-black uppercase tracking-[0.1em] text-[10px]">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/5">
                                {orcamentos.map((orc) => (
                                    <tr key={orc.id} className="hover:bg-slate-50/80 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center font-black text-xs text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                    {orc.cliente.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-[13px] uppercase text-foreground group-hover:text-primary transition-colors leading-tight">{orc.cliente}</span>
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Ref: #{orc.id.padStart(4, '0')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-bold text-[11px] uppercase text-muted-foreground tracking-tighter bg-muted/20 px-3 py-1.5 rounded-lg border border-border/5 group-hover:border-primary/10 transition-colors">{orc.ambiente}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-muted-foreground/70 font-bold text-[11px]">
                                                <span className="text-muted-foreground/40 font-black">@</span>
                                                {new Date(orc.data).toLocaleDateString('pt-BR')}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className="font-black text-sm text-foreground tabular-nums group-hover:text-primary transition-colors">{formatCurrency(orc.valor)}</span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex justify-center">
                                                {getStatusBadge(orc.status)}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2 pr-2">
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/10 text-slate-400 hover:text-primary transition-all active:scale-95 border border-border/5">
                                                    <Pencil size={16} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 transition-all active:scale-95 border border-border/5">
                                                    <CheckCircle2 size={16} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all active:scale-95 border border-border/5">
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-8 bg-slate-50/30 border-t border-border/10 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                        <span>BJL Planejados - Gerenciador de Performance Comercial</span>
                        <div className="flex gap-4">
                            <span className="text-primary/60">Versão 2.4.0</span>
                            <span>© 2024</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                <Card className="p-8 bg-primary/5 border border-primary/10 rounded-3xl flex items-start gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-black text-primary text-xs uppercase tracking-[0.2em]">Inteligência Comercial</h4>
                        <p className="text-[11px] text-primary/80 font-bold leading-relaxed">Seu ticket médio cresceu 12% em relação ao mês anterior. Recomendamos focar em ambientes de Cozinha para maximizar a margem bruta no próximo trimestre.</p>
                    </div>
                </Card>
                <Card className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl flex items-start gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-600">
                        <Calculator className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-black text-emerald-700 text-xs uppercase tracking-[0.2em]">Status de Conversão</h4>
                        <p className="text-[11px] text-emerald-600/80 font-bold leading-relaxed">Você possui 3 orçamentos aguardando aprovação há mais de 5 dias. Sugerimos realizar um acompanhamento (follow-up) para garantir o fechamento.</p>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Orcamento;
