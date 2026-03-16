import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileText, CheckCircle2, Building, Receipt, Download, X, Search, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AsaasInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderData?: {
        customerName: string;
        description: string;
        amount: number;
        clientId?: string;
    };
}

import { asaasService } from "@/services/asaas";

export function AsaasInvoiceModal({ isOpen, onClose, orderData }: AsaasInvoiceModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [clients, setClients] = useState<{ id: string, name: string, document: string, phone: string, email: string }[]>([]);
    const [openClientSelect, setOpenClientSelect] = useState(false);
    const [generatedInvoiceId, setGeneratedInvoiceId] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    // Form inputs
    const [taxType, setTaxType] = useState<"servico" | "produto">("produto");
    const [clientId, setClientId] = useState(orderData?.clientId || "");
    const [clientName, setClientName] = useState(orderData?.customerName || "");
    const [description, setDescription] = useState(orderData?.description || "");
    const [amount, setAmount] = useState(orderData?.amount ? orderData.amount.toString() : "");
    const [ncm, setNcm] = useState("");
    const [cfop, setCfop] = useState("5101");

    useEffect(() => {
        if (isOpen) {
            fetchClients();
        }
    }, [isOpen]);

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase.from('clients').select('id, name, document, phone, email').order('name');
            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error("Error fetching clients:", error);
        }
    };

    const handleEmitInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientName || !amount) {
            toast.error("Por favor, preencha o cliente e o valor.");
            return;
        }

        setIsSubmitting(true);

        try {
            let asaasCustomerId = "";

            // 1. Sincroniza Cliente se existir no CRM
            if (clientId) {
                const selectedClient = clients.find(c => c.id === clientId);
                toast.info("Sincronizando cliente com Asaas...");
                asaasCustomerId = await asaasService.getOrCreateAsaasCustomer(clientId, selectedClient);
            } else {
                toast.warning("Emitindo nota para cliente avulso (sem vínculo no CRM).");
                // Em um caso real, precisaríamos criar o cliente no Asaas mesmo assim
                // Para o demo, vamos gerar um ID temporário
                asaasCustomerId = `cus_manual_${Math.random().toString(36).substr(2, 5)}`;
            }

            // 2. Emite a Nota via Asaas Service
            toast.info("Solicitando autorização da Nota Fiscal...");
            const asaasResponse = await asaasService.createInvoice({
                asaasCustomerId,
                amount: parseFloat(amount),
                description: description,
                type: taxType === 'servico' ? 'NFS-e' : 'NF-e',
                ncm: taxType === 'produto' ? ncm : undefined,
                cfop: taxType === 'produto' ? cfop : undefined
            });

            // 3. Salva o registro final no Supabase
            const invoiceData = {
                client_name: clientName,
                client_id: clientId || null,
                description: description,
                amount: parseFloat(amount),
                type: taxType === 'servico' ? 'NFS-e' : 'NF-e',
                status: 'Autorizada',
                invoice_number: asaasResponse.invoiceNumber,
                asaas_id: asaasResponse.id,
                issue_date: new Date().toISOString().split('T')[0],
                pdf_url: asaasResponse.pdfUrl
            };

            const { error: dbError } = await supabase
                .from('invoices')
                .insert([invoiceData]);

            if (dbError) throw dbError;

            setGeneratedInvoiceId(asaasResponse.invoiceNumber);
            setPdfUrl(asaasResponse.pdfUrl);
            setIsSuccess(true);
            toast.success("Nota Fiscal emitida e registrada com sucesso!");
        } catch (error: any) {
            console.error("Error in Asaas issuance:", error);
            toast.error(`Falha na integração: ${error.message || "Erro desconhecido"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setIsSuccess(false);
        setGeneratedInvoiceId(null);
        if (!orderData) {
            setClientId("");
            setClientName("");
            setDescription("");
            setAmount("");
        }
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                {!isSuccess ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <div className="bg-[#0030B9] p-2 rounded text-white">
                                    <Building className="h-5 w-5" />
                                </div>
                                Emissão de Nota Fiscal
                                <span className="text-xs bg-blue-100 text-[#0030B9] px-2 py-1 rounded-full font-medium ml-2 border border-blue-200">
                                    Integração Asaas
                                </span>
                            </DialogTitle>
                            <DialogDescription>
                                Confirme os dados abaixo para emitir a nota fiscal automaticamente via Asaas.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleEmitInvoice} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="taxType">Tipo de Nota</Label>
                                <Select value={taxType} onValueChange={(v: any) => setTaxType(v)}>
                                    <SelectTrigger id="taxType">
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="servico">NFS-e (Nota de Serviço - Prefeituras)</SelectItem>
                                        <SelectItem value="produto">NF-e (Nota de Produto - SEFAZ)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{taxType === 'servico' ? 'Tomador do Serviço (Cliente)' : 'Destinatário (Cliente)'}</Label>
                                <Popover open={openClientSelect} onOpenChange={setOpenClientSelect}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openClientSelect}
                                            className="w-full justify-between font-normal"
                                        >
                                            {clientName || "Selecione um cliente..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[450px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Buscar cliente..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                    {clients.map((client) => (
                                                        <CommandItem
                                                            key={client.id}
                                                            value={client.name}
                                                            onSelect={() => {
                                                                setClientName(client.name);
                                                                setClientId(client.id);
                                                                setOpenClientSelect(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    clientName === client.name ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {client.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {!clientId && clientName && (
                                    <p className="text-[10px] text-amber-600 font-medium">Cliente não vinculado ao cadastro (avulso).</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição do Serviço/Produto da NFe</Label>
                                <Input
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ex: Armários sob medida para cozinha"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="value">Valor da Nota (R$)</Label>
                                <Input
                                    id="value"
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0,00"
                                    className="text-lg font-semibold text-green-700"
                                />
                            </div>

                            {taxType === 'produto' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                    <Label htmlFor="ncm">NCM do Produto Principal</Label>
                                    <Input
                                        id="ncm"
                                        value={ncm}
                                        onChange={(e) => setNcm(e.target.value)}
                                        placeholder="Ex: 9403.50.00"
                                        required
                                    />
                                    <p className="text-[10px] text-gray-400">Obrigatório para emissão de NF-e (Produto).</p>
                                </div>
                            )}

                            {taxType === 'produto' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                    <Label htmlFor="cfop">CFOP</Label>
                                    <Input
                                        id="cfop"
                                        value={cfop}
                                        onChange={(e) => setCfop(e.target.value)}
                                        placeholder="Ex: 5101"
                                        required
                                    />
                                    <p className="text-[10px] text-gray-400">Código de Operação. 5101 é comum para venda de produção.</p>
                                </div>
                            )}

                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md flex items-start gap-2 text-sm text-yellow-800">
                                <Receipt className="h-5 w-5 shrink-0 text-yellow-600 mt-0.5" />
                                <p>
                                    Ao confirmar, os dados serão enviados ao Asaas e a nota fiscal será autorizada instantaneamente no órgão responsável.
                                </p>
                            </div>

                            <div className="pt-4 flex justify-end gap-2 border-t">
                                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-[#0030B9] hover:bg-blue-800 text-white min-w-[150px]"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="mr-2 h-4 w-4" />
                                            Emitir {taxType === 'servico' ? 'NFS-e' : 'NF-e'} Asaas
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="py-8 flex flex-col items-center text-center space-y-4">
                        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Nota Fiscal Autorizada!</h2>
                        <p className="text-gray-500 max-w-sm">
                            A nota fiscal para <strong>{clientName}</strong> no valor de <strong>R$ {Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> foi gerada e enviada via Asaas.
                        </p>

                        <div className="bg-gray-50 border p-4 rounded-lg w-full mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded">
                                    <FileText className="h-5 w-5 text-blue-700" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-semibold text-gray-800">DANFE / DANFSE (PDF)</p>
                                    <p className="text-xs text-gray-500">Nº da Nota: {generatedInvoiceId}</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" className="gap-2" asChild>
                                <a href="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" target="_blank" rel="noopener noreferrer">
                                    <Download className="h-4 w-4" />
                                    Baixar PDF
                                </a>
                            </Button>
                        </div>

                        <Button className="w-full mt-4" variant="default" onClick={handleClose}>
                            Concluir e Voltar
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

