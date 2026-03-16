import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Receipt, Search, FileText, Loader2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Invoice {
    id: string;
    issue_date: string;
    client_name: string;
    description: string;
    amount: number;
    status: 'Autorizada' | 'Processando' | 'Cancelada' | 'Pendente';
    invoice_number: string;
    type: 'NFS-e' | 'NF-e';
    pdf_url?: string;
}

export default function NotaFiscalTab() {
    const [searchTerm, setSearchTerm] = useState("");
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .order('issue_date', { ascending: false });

            if (error) throw error;
            setInvoices(data || []);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast.error("Erro ao carregar notas fiscais.");
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const filteredInvoices = invoices.filter(invoice =>
        invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoice_number?.includes(searchTerm)
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Autorizada': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Processando': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Cancelada': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-card/40 backdrop-blur-md border-border/40 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/20 bg-muted/10">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-blue-500" />
                            Gestão de Notas Fiscais
                        </CardTitle>
                        <CardDescription className="text-xs pt-1">
                            Controle e histórico de notas fiscais (NFS-e / NF-e).
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="mb-6 flex items-center max-w-md relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por cliente, número ou descrição..."
                            className="pl-10 h-10 rounded-xl bg-muted/30 border-border/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="rounded-xl border border-border/20 overflow-hidden bg-background/50">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">Data</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">Tipo</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">Nº Nota</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">Cliente</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">Descrição / Serviço</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">Valor</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider">Status</TableHead>
                                    <TableHead className="font-bold text-xs uppercase tracking-wider w-[100px]">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                                <p>Carregando notas fiscais...</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredInvoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <Receipt className="h-8 w-8 text-muted-foreground/30" />
                                                <p>Nenhuma nota fiscal encontrada.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredInvoices.map((invoice) => (
                                        <TableRow key={invoice.id} className="group hover:bg-muted/10 transition-colors">
                                            <TableCell className="text-sm">{format(new Date(invoice.issue_date + 'T12:00:00'), "dd/MM/yyyy")}</TableCell>
                                            <TableCell className="text-sm">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${invoice.type === 'NF-e' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {invoice.type}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">#{invoice.invoice_number || '---'}</TableCell>
                                            <TableCell className="text-sm font-semibold">{invoice.client_name}</TableCell>
                                            <TableCell className="text-sm truncate max-w-[200px] text-muted-foreground">{invoice.description}</TableCell>
                                            <TableCell className="text-sm font-bold text-blue-600">{formatCurrency(invoice.amount)}</TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(invoice.status)}`}>
                                                    {invoice.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    {invoice.pdf_url && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50" title="Baixar PDF" asChild>
                                                            <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                                                                <FileText className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    )}
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

        </div>
    );
}

