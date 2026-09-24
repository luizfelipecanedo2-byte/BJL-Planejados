import React, { useState, useMemo, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    BankStatementItem,
    MatchedResultItem,
    parseOfxOrCsv,
    matchBankItemsWithCRM,
    suggestCategoryAndSubcategory
} from "@/lib/ofxParser";
import { supabase } from "@/lib/supabase";
import { CATEGORIES, SUBCATEGORIES } from "@/types/finance";
import {
    Upload,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    ArrowDownLeft,
    FileSpreadsheet,
    Building2,
    Sparkles,
    Check,
    Layers,
    Search,
    RefreshCw,
    X,
    FileText
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ItauConciliationModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: any[];
    serviceOrders: any[];
    onRefresh?: () => void;
}

export const ItauConciliationModal: React.FC<ItauConciliationModalProps> = ({
    isOpen,
    onClose,
    transactions,
    serviceOrders,
    onRefresh
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string>("");
    const [rawItems, setRawItems] = useState<BankStatementItem[]>([]);
    const [activeTab, setActiveTab] = useState<string>("unmatched");
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>("");

    // Estado do formulário de identificação rápida de item avulso (ex: Loja Rossi)
    const [identifyingItemId, setIdentifyingItemId] = useState<string | null>(null);
    const [editDesc, setEditDesc] = useState<string>("");
    const [editCategory, setEditCategory] = useState<string>("Despesa com Serviço");
    const [editSubcategory, setEditSubcategory] = useState<string>("Compra de Material");
    const [selectedOS, setSelectedOS] = useState<string>("none");
    const [isSavingItem, setIsSavingItem] = useState<boolean>(false);

    // Cruzamento automático de dados
    const { matched, unmatched } = useMemo(() => {
        if (rawItems.length === 0) return { matched: [], unmatched: [] };
        return matchBankItemsWithCRM(rawItems, transactions);
    }, [rawItems, transactions]);

    // Resumos financeiros do extrato
    const summary = useMemo(() => {
        const totalCredits = rawItems
            .filter(i => i.type === 'credit')
            .reduce((sum, i) => sum + i.amount, 0);

        const totalDebits = rawItems
            .filter(i => i.type === 'debit')
            .reduce((sum, i) => sum + i.amount, 0);

        return {
            total: rawItems.length,
            matchedCount: matched.length,
            unmatchedCount: unmatched.length,
            totalCredits,
            totalDebits,
            balance: totalCredits - totalDebits
        };
    }, [rawItems, matched, unmatched]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();

        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (!content) return;

            try {
                const parsed = parseOfxOrCsv(file.name, content);
                if (parsed.length === 0) {
                    toast.error("Nenhuma transação encontrada no arquivo.");
                    return;
                }
                setRawItems(parsed);
                toast.success(`${parsed.length} lançamentos importados do extrato Itaú!`);
                if (parsed.length > 0) {
                    setActiveTab(unmatched.length > 0 ? "unmatched" : "matched");
                }
            } catch (err) {
                console.error("Erro ao ler extrato:", err);
                toast.error("Erro ao processar arquivo do extrato.");
            }
        };

        reader.readAsText(file, 'ISO-8859-1'); // Suporta caracteres acentuados padrão Itaú
    };

    const handleStartIdentifying = (item: BankStatementItem) => {
        setIdentifyingItemId(item.id);
        setEditDesc(item.cleanMemo || item.memo);
        const suggestion = suggestCategoryAndSubcategory(item.memo, item.type);
        setEditCategory(suggestion.category);
        setEditSubcategory(suggestion.subcategory);
        setSelectedOS("none");
    };

    const handleSaveUnmatchedItem = async (item: BankStatementItem) => {
        if (!editDesc.trim()) {
            toast.error("Informe a descrição do gasto.");
            return;
        }

        setIsSavingItem(true);
        try {
            const isDebit = item.type === 'debit';
            const txType = isDebit ? 'expense' : 'income';

            // Determina vinculo de OS
            let osLabel: string | undefined = undefined;
            let targetClientName: string = "Geral";
            if (selectedOS && selectedOS !== 'none' && selectedOS !== 'estoque') {
                const foundOS = serviceOrders.find(o => o.id === selectedOS);
                if (foundOS) {
                    osLabel = `${foundOS.ticketNumber || 'OS'} - ${foundOS.client}`;
                    targetClientName = `${foundOS.ticketNumber || 'OS'} - ${foundOS.client}${foundOS.action ? ` (${foundOS.action})` : ''}`;
                }
            } else if (selectedOS === 'estoque') {
                targetClientName = "🏢 ESTOQUE GERAL";
                osLabel = "ESTOQUE GERAL";
            }

            // 1. Inserir a transação já quitada pelo banco
            const newTx = {
                description: editDesc.trim(),
                amount: item.amount,
                type: txType,
                category: editCategory,
                subcategory: editSubcategory,
                contact: isDebit ? (item.cleanMemo || "Fornecedor Itaú") : (osLabel || "Cliente Itaú"),
                financial_institution: "Banco Itaú",
                payment_method: item.memo.toLowerCase().includes('pix') ? 'Pix' : 'Cartão Itaú',
                competence_date: item.dateStr,
                due_date: item.dateStr,
                payment_date: item.dateStr,
                status: 'paid',
                order_service: osLabel || null
            };

            const { data: insertedData, error: txError } = await supabase
                .from('transactions')
                .insert([newTx])
                .select();

            if (txError) throw txError;

            // 2. Se foi vinculada a uma OS ou Estoque, registra o rateio / alocação direta
            if (insertedData && insertedData[0] && selectedOS !== 'none') {
                const insertedId = insertedData[0].id;
                const { error: allocError } = await supabase
                    .from('transaction_allocations')
                    .insert([{
                        transaction_id: insertedId,
                        client_name: targetClientName,
                        amount: item.amount,
                        description: editDesc.trim()
                    }]);

                if (allocError) console.error("Erro ao salvar alocação de OS:", allocError);
            }

            // Remove o item da lista não cadastrada
            setRawItems(prev => prev.filter(i => i.id !== item.id));
            setIdentifyingItemId(null);

            toast.success(`Lançamento de ${formatBRL(item.amount)} salvo e conciliado com sucesso!`);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Erro ao salvar item avulso:", error);
            toast.error("Erro ao registrar lançamento no sistema.");
        } finally {
            setIsSavingItem(false);
        }
    };

    // Baixa em massa todos os batidos que estiverem pendentes no CRM
    const handleReconcileAllMatched = async () => {
        const pendingMatched = matched.filter(m => m.crmTransaction && m.crmTransaction.status !== 'paid');
        if (pendingMatched.length === 0) {
            toast.info("Todos os lançamentos batidos já constam como pagos no CRM.");
            return;
        }

        setIsProcessing(true);
        try {
            for (const match of pendingMatched) {
                await supabase
                    .from('transactions')
                    .update({
                        status: 'paid',
                        payment_date: match.statementItem.dateStr,
                        financial_institution: 'Banco Itaú'
                    })
                    .eq('id', match.crmTransaction.id);
            }

            toast.success(`${pendingMatched.length} lançamentos foram baixados e quitados no CRM!`);
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Erro ao conciliar itens:", error);
            toast.error("Erro ao conciliar lançamentos.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Baixar um item batido individual
    const handleReconcileSingleMatched = async (match: MatchedResultItem) => {
        if (!match.crmTransaction) return;
        try {
            await supabase
                .from('transactions')
                .update({
                    status: 'paid',
                    payment_date: match.statementItem.dateStr,
                    financial_institution: 'Banco Itaú'
                })
                .eq('id', match.crmTransaction.id);

            // Atualiza status localmente
            match.crmTransaction.status = 'paid';
            match.crmTransaction.paymentDate = match.statementItem.date;
            toast.success("Lançamento marcado como Pago no CRM!");
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error("Erro ao atualizar transação:", error);
            toast.error("Erro ao atualizar transação.");
        }
    };

    const formatBRL = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-950 border-slate-800 text-slate-100 shadow-2xl">
                {/* Header Itaú */}
                <div className="bg-gradient-to-r from-[#00246B] via-[#08183A] to-slate-950 p-6 border-b border-blue-500/20 relative">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-[#00246B] border border-blue-400/40 p-1.5 flex items-center justify-center shadow-lg shadow-blue-500/25">
                                <img src="/itau-logo.png" alt="Itaú" className="h-full w-full object-contain rounded-md" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
                                    Conciliação Inteligente Itaú
                                    <Badge className="bg-[#EC7000] hover:bg-[#d66500] text-white border-0 text-[10px] uppercase font-black tracking-wider">
                                        OFX / CSV
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-300">
                                    Cruze o extrato da sua conta Itaú com o CRM e vincule compras de rua diretamente às Ordens de Serviço.
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Botão de carregar novo arquivo */}
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".ofx,.csv"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-[#EC7000] hover:bg-[#d66500] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2"
                            >
                                <Upload className="h-4 w-4" />
                                {fileName ? "Substituir Extrato" : "Carregar Extrato (.OFX / .CSV)"}
                            </Button>
                        </div>
                    </div>

                    {/* Resumo do Arquivo Carregado */}
                    {rawItems.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
                            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Extrato</span>
                                <div className="text-base font-black text-white flex items-center gap-1.5 mt-0.5">
                                    <FileSpreadsheet className="h-4 w-4 text-blue-400" />
                                    {summary.total} itens
                                </div>
                            </div>

                            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">Entradas</span>
                                <div className="text-base font-black text-emerald-400 flex items-center gap-1.5 mt-0.5">
                                    <ArrowUpRight className="h-4 w-4" />
                                    {formatBRL(summary.totalCredits)}
                                </div>
                            </div>

                            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-rose-400">Saídas</span>
                                <div className="text-base font-black text-rose-400 flex items-center gap-1.5 mt-0.5">
                                    <ArrowDownLeft className="h-4 w-4" />
                                    {formatBRL(summary.totalDebits)}
                                </div>
                            </div>

                            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
                                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400">A Vincular (Rua)</span>
                                <div className="text-base font-black text-amber-400 flex items-center gap-1.5 mt-0.5">
                                    <AlertCircle className="h-4 w-4" />
                                    {summary.unmatchedCount} não cadastrados
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Conteúdo Principal */}
                {rawItems.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <Upload className="h-8 w-8" />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white">Nenhum extrato importado ainda</h4>
                            <p className="text-xs text-slate-400 max-w-md mt-1">
                                Baixe o arquivo <strong>.OFX</strong> ou <strong>.CSV</strong> do Itaú no seu Internet Banking e solte-o aqui para conciliar seus lançamentos e gastos com materiais em poucos segundos.
                            </p>
                        </div>
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-[#EC7000] hover:bg-[#d66500] text-white font-bold rounded-xl px-6 py-5 shadow-lg"
                        >
                            Selecionar Arquivo do Itaú
                        </Button>
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-6 py-2.5 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between gap-4">
                            <TabsList className="bg-slate-800/80 p-1 rounded-xl">
                                <TabsTrigger value="unmatched" className="text-xs font-bold gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    Não Cadastrados / Compras de Rua
                                    <Badge variant="outline" className="ml-1 text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/40">
                                        {unmatched.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger value="matched" className="text-xs font-bold gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-black">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Batidos no CRM (100%)
                                    <Badge variant="outline" className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                                        {matched.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger value="all" className="text-xs font-bold gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                                    <Layers className="h-3.5 w-3.5" />
                                    Todos ({rawItems.length})
                                </TabsTrigger>
                            </TabsList>

                            {/* Search */}
                            <div className="relative w-64 hidden sm:block">
                                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                <Input
                                    placeholder="Buscar descrição ou valor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-8 bg-slate-950 border-slate-800 text-xs rounded-lg"
                                />
                            </div>
                        </div>

                        {/* TAB 1: NÃO CADASTRADOS (COMPRAS DE RUA) */}
                        <TabsContent value="unmatched" className="flex-1 overflow-y-auto p-6 space-y-3 m-0">
                            {unmatched.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-2" />
                                    <p className="font-bold text-white text-base">Excelente! Nenhum lançamento pendente.</p>
                                    <p className="text-xs text-slate-400">Todos os registros do seu extrato já foram identificados ou conciliados.</p>
                                </div>
                            ) : (
                                unmatched
                                    .filter(i => !searchTerm || i.memo.toLowerCase().includes(searchTerm.toLowerCase()) || i.amount.toString().includes(searchTerm))
                                    .map(item => {
                                        const isIdentifying = identifyingItemId === item.id;
                                        return (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "border rounded-2xl p-4 transition-all duration-300",
                                                    isIdentifying
                                                        ? "bg-slate-900 border-amber-500/50 shadow-xl shadow-amber-500/5"
                                                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                                                )}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[11px] font-black text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                                                {item.displayDate}
                                                            </span>
                                                            <Badge className={cn(
                                                                "text-[10px] font-black uppercase tracking-wider",
                                                                item.type === 'debit' ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                                            )}>
                                                                {item.type === 'debit' ? 'Saída (Débito/Pix)' : 'Entrada (Crédito)'}
                                                            </Badge>
                                                        </div>
                                                        <div className="font-bold text-white text-sm">
                                                            {item.cleanMemo}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 font-mono">
                                                            Original: {item.memo}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between sm:justify-end gap-4">
                                                        <div className={cn(
                                                            "text-lg font-black tracking-tight",
                                                            item.type === 'debit' ? "text-rose-400" : "text-emerald-400"
                                                        )}>
                                                            {item.type === 'debit' ? '-' : '+'}{formatBRL(item.amount)}
                                                        </div>

                                                        {!isIdentifying && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleStartIdentifying(item)}
                                                                className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl gap-1.5 shadow-md"
                                                            >
                                                                <Sparkles className="h-3.5 w-3.5" />
                                                                + Vincular a OS / Identificar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Formulário Rápido de Identificação inline */}
                                                {isIdentifying && (
                                                    <div className="mt-4 pt-4 border-t border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                                                <Sparkles className="h-3.5 w-3.5" />
                                                                Identificação Rápida & Rateio de Custo
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setIdentifyingItemId(null)}
                                                                className="text-slate-400 hover:text-white h-7 w-7 p-0"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Descrição do Material / Gasto</Label>
                                                                <Input
                                                                    value={editDesc}
                                                                    onChange={(e) => setEditDesc(e.target.value)}
                                                                    placeholder="Ex: Rodízios para gaveteiro - Loja Rossi"
                                                                    className="bg-slate-950 border-slate-700 text-xs h-9 rounded-xl"
                                                                />
                                                            </div>

                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Vincular a Ordem de Serviço (OS)</Label>
                                                                <Select value={selectedOS} onValueChange={setSelectedOS}>
                                                                    <SelectTrigger className="bg-slate-950 border-slate-700 text-xs h-9 rounded-xl">
                                                                        <SelectValue placeholder="Selecione a OS" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-60">
                                                                        <SelectItem value="none" className="text-slate-400 font-medium">
                                                                            Geral da Empresa (Sem OS)
                                                                        </SelectItem>
                                                                        <SelectItem value="estoque" className="text-amber-400 font-bold">
                                                                            🏢 ESTOQUE GERAL
                                                                        </SelectItem>
                                                                        {serviceOrders.map(os => (
                                                                            <SelectItem key={os.id} value={os.id} className="text-xs">
                                                                                {os.ticketNumber || 'OS'} - {os.client} {os.action ? `(${os.action})` : ''}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Categoria</Label>
                                                                <Select value={editCategory} onValueChange={(val) => {
                                                                    setEditCategory(val);
                                                                    const subs = SUBCATEGORIES[val] || [];
                                                                    if (subs.length > 0) setEditSubcategory(subs[0]);
                                                                }}>
                                                                    <SelectTrigger className="bg-slate-950 border-slate-700 text-xs h-9 rounded-xl">
                                                                        <SelectValue placeholder="Categoria" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                                                                        {(item.type === 'debit' ? CATEGORIES.expense : CATEGORIES.income).map(cat => (
                                                                            <SelectItem key={cat} value={cat} className="text-xs">
                                                                                {cat}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-end gap-2 pt-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setIdentifyingItemId(null)}
                                                                className="border-slate-700 text-xs font-bold rounded-xl"
                                                            >
                                                                Cancelar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                disabled={isSavingItem}
                                                                onClick={() => handleSaveUnmatchedItem(item)}
                                                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl gap-2 shadow-lg shadow-emerald-500/20"
                                                            >
                                                                {isSavingItem ? (
                                                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <Check className="h-3.5 w-3.5" />
                                                                )}
                                                                Salvar & Conciliar no Itaú
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                            )}
                        </TabsContent>

                        {/* TAB 2: BATIDOS (100%) */}
                        <TabsContent value="matched" className="flex-1 overflow-y-auto p-6 space-y-4 m-0">
                            {matched.length > 0 && (
                                <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h5 className="font-black text-sm text-emerald-300">
                                                {matched.length} Lançamentos Batidos com o CRM
                                            </h5>
                                            <p className="text-xs text-slate-400">
                                                Valores e datas conferem perfeitamente com os registros do sistema.
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        disabled={isProcessing}
                                        onClick={handleReconcileAllMatched}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl gap-2 shadow-lg"
                                    >
                                        {isProcessing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        Baixar Todos os Batidos
                                    </Button>
                                </div>
                            )}

                            <div className="space-y-3">
                                {matched.map((m, idx) => {
                                    const isPaid = m.crmTransaction?.status === 'paid';
                                    return (
                                        <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-black text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                                        {m.statementItem.displayDate}
                                                    </span>
                                                    <Badge className={cn(
                                                        "text-[10px] font-black uppercase tracking-wider",
                                                        isPaid ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                                    )}>
                                                        {isPaid ? "Já Pago no CRM" : "Pendente de Baixa"}
                                                    </Badge>
                                                </div>

                                                <div className="font-bold text-white text-sm">
                                                    Extrato: {m.statementItem.cleanMemo}
                                                </div>
                                                <div className="text-xs text-blue-400 font-medium flex items-center gap-1.5">
                                                    <span>CRM:</span>
                                                    <span>{m.crmTransaction?.description || 'Lançamento correspondente'}</span>
                                                    {m.crmTransaction?.orderService && (
                                                        <Badge variant="outline" className="text-[9px] border-slate-700 bg-slate-800 text-slate-300">
                                                            {m.crmTransaction.orderService}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-4">
                                                <div className="text-base font-black text-white">
                                                    {formatBRL(m.statementItem.amount)}
                                                </div>

                                                {!isPaid ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleReconcileSingleMatched(m)}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl gap-1.5"
                                                    >
                                                        <Check className="h-3 w-3" />
                                                        Confirmar Baixa
                                                    </Button>
                                                ) : (
                                                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Conciliado
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </TabsContent>

                        {/* TAB 3: EXTRATO COMPLETO */}
                        <TabsContent value="all" className="flex-1 overflow-y-auto p-6 space-y-2 m-0">
                            {rawItems.map(item => (
                                <div key={item.id} className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-slate-400">{item.displayDate}</span>
                                        <span className="font-bold text-white">{item.cleanMemo}</span>
                                        <span className="text-[10px] text-slate-500 font-mono hidden md:inline">({item.memo})</span>
                                    </div>
                                    <span className={cn(
                                        "font-black font-mono",
                                        item.type === 'debit' ? "text-rose-400" : "text-emerald-400"
                                    )}>
                                        {item.type === 'debit' ? '-' : '+'}{formatBRL(item.amount)}
                                    </span>
                                </div>
                            ))}
                        </TabsContent>
                    </Tabs>
                )}

                {/* Footer */}
                <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                        {fileName ? `Extrato ativo: ${fileName}` : "Nenhum arquivo selecionado"}
                    </span>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="border-slate-700 text-white font-bold rounded-xl text-xs"
                    >
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ItauConciliationModal;
