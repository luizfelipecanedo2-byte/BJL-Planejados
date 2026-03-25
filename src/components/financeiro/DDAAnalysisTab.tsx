import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    FileSearch, 
    RefreshCw, 
    Check, 
    X, 
    Building2, 
    Calendar, 
    DollarSign, 
    Loader2, 
    AlertCircle,
    Copy
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { fetchDDABoletos } from "@/lib/asaas";

interface PendingBoleto {
    id: string;
    description: string;
    amount: number;
    due_date: string;
    company_name: string;
    company_cnpj: string;
    status: 'pending' | 'approved' | 'discarded';
    boleto_url?: string;
    bar_code?: string;
}

export default function DDAAnalysisTab({ onTransactionUpdate }: { onTransactionUpdate: () => void }) {
    const [boletos, setBoletos] = useState<PendingBoleto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        fetchBoletosFromDB();
    }, []);

    const fetchBoletosFromDB = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('pending_boletos')
                .select('*')
                .eq('status', 'pending')
                .order('due_date', { ascending: true });

            if (error) throw error;
            setBoletos(data || []);
        } catch (error) {
            console.error('Error fetching boletos:', error);
            toast.error("Erro ao carregar boletos em análise.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setIsSyncing(true);
            toast.promise(
                async () => {
                    const asaasBoletos = await fetchDDABoletos();
                    
                    if (asaasBoletos.length === 0) return "Nenhum novo boleto encontrado.";

                    const boletosToUpsert = asaasBoletos.map(b => ({
                        asaas_id: b.id,
                        description: b.description || "Boleto DDA",
                        amount: b.amount,
                        due_date: b.dueDate,
                        issue_date: b.issueDate,
                        company_name: b.companyName,
                        company_cnpj: b.companyCnpj,
                        bar_code: b.barCode,
                        nosso_numero: b.nossoNumero,
                        bank_name: b.bankName,
                        status: 'pending'
                    }));

                    const { error } = await supabase
                        .from('pending_boletos')
                        .upsert(boletosToUpsert, { onConflict: 'asaas_id' });

                    if (error) throw error;
                    
                    await fetchBoletosFromDB();
                    return "Buscador de boletos sincronizado com sucesso!";
                },
                {
                    loading: 'Conectando ao Asaas e buscando boletos...',
                    success: (msg) => msg,
                    error: "Erro ao sincronizar buscador de boletos (DDA)."
                }
            );
        } catch (error) {
            console.error('Sync error:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleApprove = async (boleto: PendingBoleto) => {
        try {
            // 1. Cria a transação no financeiro
            const { data: transaction, error: transError } = await supabase
                .from('transactions')
                .insert([{
                    description: `PAGTO: ${boleto.company_name} - ${boleto.description}`,
                    amount: boleto.amount,
                    type: 'expense',
                    category: 'Despesa com Serviço', // Sugestão padrão
                    contact: boleto.company_name,
                    due_date: boleto.due_date,
                    status: 'pending',
                    payment_method: 'Boleto',
                    boleto_url: boleto.boleto_url
                }])
                .select()
                .single();

            if (transError) throw transError;

            // 2. Marca o boleto como aprovado e vincula a transação
            const { error: boletoError } = await supabase
                .from('pending_boletos')
                .update({ 
                    status: 'approved',
                    transaction_id: transaction.id
                })
                .eq('id', boleto.id);

            if (boletoError) throw boletoError;

            setBoletos(prev => prev.filter(b => b.id !== boleto.id));
            toast.success("Boleto aprovado e lançado no financeiro!");
            onTransactionUpdate();
        } catch (error) {
            console.error('Approval error:', error);
            toast.error("Erro ao aprovar boleto.");
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Tem certeza que deseja recusar este boleto? Ele não será lançado no financeiro.")) return;

        try {
            const { error } = await supabase
                .from('pending_boletos')
                .update({ status: 'discarded' })
                .eq('id', id);

            if (error) throw error;

            setBoletos(prev => prev.filter(b => b.id !== id));
            toast.success("Boleto recusado e removido da análise.");
        } catch (error) {
            console.error('Rejection error:', error);
            toast.error("Erro ao descartar boleto.");
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.info("Código de barras copiado!");
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    return (
        <div className="space-y-6">
            <Card className="bg-slate-950 border-slate-800 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
                
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-slate-800/50">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
                            <FileSearch className="h-6 w-6 text-blue-500" />
                            Buscador de Boletos (DDA)
                        </CardTitle>
                        <CardDescription className="text-slate-400 font-medium">
                            Analise boletos emitidos contra seu CNPJ e lance-os no financeiro com um clique.
                        </CardDescription>
                    </div>
                    <Button 
                        onClick={handleSync} 
                        disabled={isSyncing}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                        {isSyncing ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Sincronizar Asaas
                    </Button>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-900/50">
                                <TableRow className="border-slate-800 hover:bg-transparent">
                                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4">Vencimento</TableHead>
                                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4">Cedente (Quem emitiu)</TableHead>
                                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4">Valor</TableHead>
                                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4">Descrição</TableHead>
                                    <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest py-4 text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 className="h-10 w-10 animate-spin text-blue-500/50" />
                                                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Carregando boletos para análise...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : boletos.length === 0 ? (
                                    <TableRow className="hover:bg-transparent text-center">
                                        <TableCell colSpan={5} className="py-20">
                                            <div className="flex flex-col items-center gap-4 grayscale opacity-40">
                                                <AlertCircle className="h-12 w-12 text-slate-500" />
                                                <div className="space-y-1">
                                                    <p className="text-white font-black uppercase tracking-tighter">Nenhum boleto pendente</p>
                                                    <p className="text-slate-500 text-xs text-balance">Todos os boletos encontrados foram processados ou recusados.</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    boletos.map((boleto) => (
                                        <TableRow key={boleto.id} className="border-slate-800/50 group hover:bg-slate-900/20 transition-all duration-300">
                                            <TableCell className="py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-black tracking-tight">{format(new Date(boleto.due_date + 'T12:00:00'), "dd/MM/yyyy")}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        Em Aberto
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <div className="flex flex-col max-w-[250px]">
                                                    <span className="text-white font-bold truncate leading-tight">{boleto.company_name}</span>
                                                    <span className="text-[10px] text-slate-500 font-medium tabular-nums mt-0.5">{boleto.company_cnpj}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <span className="text-emerald-400 font-black text-base tracking-tighter">
                                                    {formatCurrency(boleto.amount)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <div className="flex flex-col max-w-[200px]">
                                                    <span className="text-slate-400 text-sm truncate">{boleto.description}</span>
                                                    {boleto.bar_code && (
                                                        <button 
                                                            onClick={() => copyToClipboard(boleto.bar_code!)}
                                                            className="flex items-center gap-1.5 text-[10px] text-blue-500/70 hover:text-blue-400 font-bold uppercase tracking-widest mt-1 transition-colors"
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                            Copiar Código
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5 text-right">
                                                <div className="flex items-center justify-end gap-2 pr-2">
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => handleReject(boleto.id)}
                                                        className="h-9 px-4 rounded-lg bg-slate-900 border border-slate-800 hover:bg-rose-500/10 hover:border-rose-500/20 text-slate-400 hover:text-rose-500 transition-all active:scale-95"
                                                    >
                                                        <X className="h-4 w-4 mr-2" />
                                                        Recusar
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => handleApprove(boleto)}
                                                        className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/10"
                                                    >
                                                        <Check className="h-4 w-4 mr-2" />
                                                        Aprovar
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-md p-6 flex items-center gap-4 group">
                    <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all duration-500">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aguardando Análise</p>
                        <p className="text-2xl font-black text-white tracking-tighter">{boletos.length}</p>
                    </div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-md p-6 flex items-center gap-4 group">
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Volume Total</p>
                        <p className="text-2xl font-black text-white tracking-tighter">
                            {formatCurrency(boletos.reduce((acc, curr) => acc + curr.amount, 0))}
                        </p>
                    </div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-md p-6 flex items-center gap-4 group">
                    <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Próximo Vencimento</p>
                        <p className="text-2xl font-black text-white tracking-tighter">
                            {boletos.length > 0 ? format(new Date(boletos[0].due_date + 'T12:00:00'), "dd/MM/yy") : "--"}
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
