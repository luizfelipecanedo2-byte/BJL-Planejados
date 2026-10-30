import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Plus,
    Receipt,
    Search,
    FileText,
    Loader2,
    Upload,
    ShieldCheck,
    Settings2,
    Printer,
    CheckCircle2,
    AlertTriangle,
    Sparkles,
    Building2,
    FileCode2,
    Trash2,
    ExternalLink,
    RefreshCw,
    KeyRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCompanySettings } from "@/hooks/useCompanySettings";

interface Invoice {
    id: string;
    issue_date: string;
    client_name: string;
    description: string;
    amount: number;
    status: "Autorizada" | "Processando" | "Cancelada" | "Pendente";
    invoice_number: string;
    type: "NFS-e" | "NF-e";
    pdf_url?: string;
}

interface ParsedXmlItem {
    code: string;
    name: string;
    ncm: string;
    cfop: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

interface ParsedXmlData {
    accessKey: string;
    invoiceNumber: string;
    series: string;
    issueDate: string;
    emitterName: string;
    emitterCnpj: string;
    recipientName: string;
    recipientDoc: string;
    totalAmount: number;
    items: ParsedXmlItem[];
}

const FREE_TIER_LIMIT = 30; // Cota mensal gratuita de referência na Nuvem Fiscal

export default function NotaFiscalTab() {
    const { settings: companySettings } = useCompanySettings();
    const xmlInputRef = useRef<HTMLInputElement | null>(null);
    const certInputRef = useRef<HTMLInputElement | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<"ALL" | "NF-e" | "NFS-e">("ALL");
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Clientes & Vendas do CRM para preenchimento em 1 clique
    const [crmClients, setCrmClients] = useState<any[]>([]);
    const [crmSales, setCrmSales] = useState<any[]>([]);

    // Modal de Emissão 1-Click
    const [isEmitOpen, setIsEmitOpen] = useState(false);
    const [isEmitting, setIsEmitting] = useState(false);
    const [emitForm, setEmitForm] = useState({
        type: "NF-e" as "NF-e" | "NFS-e",
        selectedSaleId: "",
        clientName: "",
        clientDoc: "",
        clientAddress: "",
        clientEmail: "",
        description: "Fabricação e fornecimento de móveis planejados sob medida em MDF",
        amount: "",
        ncm: "94036000", // Móveis de madeira
        cfop: "5101", // Venda de produção do estabelecimento
        serviceCode: "14.13", // Carpintaria e marcenaria (LC 116)
        taxRate: "6.0", // Simples Nacional Anexo I/III referência
        autoCreateFinance: true,
    });

    // Modal de Importação de XML
    const [isXmlDialogOpen, setIsXmlDialogOpen] = useState(false);
    const [parsedXml, setParsedXml] = useState<ParsedXmlData | null>(null);
    const [xmlOptions, setXmlOptions] = useState({
        direction: "entrada" as "entrada" | "saida",
        updateInventory: true,
        createExpenseTransaction: true,
    });
    const [isImportingXml, setIsImportingXml] = useState(false);

    // Modal de Configuração Nuvem Fiscal (Opção 1)
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isTestingApi, setIsTestingApi] = useState(false);
    const [fiscalConfig, setFiscalConfig] = useState({
        clientId: "",
        clientSecret: "",
        environment: "sandbox" as "sandbox" | "production",
        regimeTributario: "simples_nacional",
        certPassword: "",
        certFileName: "",
        certBase64: "",
    });

    useEffect(() => {
        fetchInvoices();
        fetchCrmData();
        loadFiscalConfig();
    }, []);

    const loadFiscalConfig = async () => {
        const localRaw = localStorage.getItem("bjl_nuvem_fiscal_config");
        if (localRaw) {
            try {
                const parsed = JSON.parse(localRaw);
                setFiscalConfig((prev) => ({ ...prev, ...parsed }));
            } catch (e) {
                console.error(e);
            }
        }
    };

    const saveFiscalConfig = async () => {
        localStorage.setItem(
            "bjl_nuvem_fiscal_config",
            JSON.stringify({
                clientId: fiscalConfig.clientId.trim(),
                clientSecret: fiscalConfig.clientSecret.trim(),
                environment: fiscalConfig.environment,
                regimeTributario: fiscalConfig.regimeTributario,
                certFileName: fiscalConfig.certFileName,
            })
        );

        // Tenta também salvar na tabela api_settings do Supabase se existir
        if (fiscalConfig.clientId && fiscalConfig.clientSecret) {
            try {
                await supabase.from("api_settings").upsert(
                    [
                        { key_name: "nuvem_fiscal_client_id", key_value: fiscalConfig.clientId.trim() },
                        { key_name: "nuvem_fiscal_client_secret", key_value: fiscalConfig.clientSecret.trim() },
                    ],
                    { onConflict: "key_name" }
                );
            } catch {
                // Silencioso caso a tabela api_settings tenha RLS restrito
            }
        }

        toast.success("Configurações da Nuvem Fiscal salvas com sucesso!");
        setIsConfigOpen(false);
    };

    const handleTestNuvemFiscal = async () => {
        if (!fiscalConfig.clientId.trim() || !fiscalConfig.clientSecret.trim()) {
            toast.error("Informe o Client ID e Client Secret da sua conta gratuita Nuvem Fiscal.");
            return;
        }
        setIsTestingApi(true);
        try {
            const { data, error } = await supabase.functions.invoke("nuvem-fiscal", {
                body: {
                    action: "ping",
                    credentials: {
                        clientId: fiscalConfig.clientId.trim(),
                        clientSecret: fiscalConfig.clientSecret.trim(),
                        environment: fiscalConfig.environment,
                    },
                },
            });

            if (error || data?.error) {
                throw new Error(data?.error || error?.message || "Falha ao autenticar");
            }

            toast.success(`Conexão Nuvem Fiscal (${fiscalConfig.environment.toUpperCase()}) autenticada com sucesso!`);
        } catch (err: any) {
            toast.error(
                `Não foi possível validar via Edge Function: ${err.message}. Verifique se as credenciais estão corretas ou se a função 'nuvem-fiscal' foi publicada.`
            );
        } finally {
            setIsTestingApi(false);
        }
    };

    const handleCertFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.includes(",") ? result.split(",")[1] : result;
            setFiscalConfig((prev) => ({
                ...prev,
                certFileName: file.name,
                certBase64: base64,
            }));
            toast.info(`Certificado "${file.name}" carregado e pronto para envio.`);
        };
        reader.readAsDataURL(file);
    };

    const handleUploadCertificateToNuvem = async () => {
        if (!fiscalConfig.certBase64 || !fiscalConfig.certPassword) {
            toast.error("Selecione o arquivo .pfx/.p12 e digite a senha do Certificado A1.");
            return;
        }
        if (!companySettings?.cnpj) {
            toast.error("Cadastre o CNPJ da marcenaria na tela de Configurações antes de vincular o certificado.");
            return;
        }
        setIsTestingApi(true);
        try {
            const { data, error } = await supabase.functions.invoke("nuvem-fiscal", {
                body: {
                    action: "upload-certificate",
                    credentials: {
                        clientId: fiscalConfig.clientId.trim(),
                        clientSecret: fiscalConfig.clientSecret.trim(),
                        environment: fiscalConfig.environment,
                    },
                    payload: {
                        cnpj: companySettings.cnpj,
                        certificateBase64: fiscalConfig.certBase64,
                        password: fiscalConfig.certPassword,
                    },
                },
            });
            if (error || data?.error) throw new Error(data?.error || error?.message);
            toast.success("Certificado Digital A1 vinculado à Nuvem Fiscal com sucesso!");
        } catch (err: any) {
            toast.error(`Erro ao enviar certificado: ${err.message}`);
        } finally {
            setIsTestingApi(false);
        }
    };

    const fetchInvoices = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from("invoices")
                .select("*")
                .order("issue_date", { ascending: false });

            if (error) throw error;
            setInvoices(data || []);
        } catch (error) {
            console.error("Error fetching invoices:", error);
            toast.error("Erro ao carregar notas fiscais.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCrmData = async () => {
        try {
            const [clientsRes, salesRes] = await Promise.all([
                supabase.from("clients").select("*").order("name"),
                supabase.from("sales").select("*").order("created_at", { ascending: false }),
            ]);
            if (clientsRes.data) setCrmClients(clientsRes.data);
            if (salesRes.data) setCrmSales(salesRes.data);
        } catch (err) {
            console.error("Erro ao carregar clientes/vendas para NF:", err);
        }
    };

    const handleSelectSaleOrClient = (val: string) => {
        if (val.startsWith("sale:")) {
            const saleId = val.replace("sale:", "");
            const sale = crmSales.find((s) => s.id === saleId);
            if (sale) {
                const matchingClient = crmClients.find(
                    (c) => (c.name || "").toLowerCase() === (sale.client_name || "").toLowerCase()
                );
                setEmitForm((prev) => ({
                    ...prev,
                    selectedSaleId: val,
                    clientName: sale.client_name || "",
                    clientDoc: matchingClient?.cpf || "",
                    clientAddress: matchingClient?.address || "",
                    clientEmail: matchingClient?.email || "",
                    description: `Fabricação e fornecimento de móveis planejados sob medida — Projeto: ${sale.product || "Ambientes Planejados"}`,
                    amount: String(sale.total_value || ""),
                }));
            }
        } else if (val.startsWith("client:")) {
            const clientId = val.replace("client:", "");
            const client = crmClients.find((c) => c.id === clientId);
            if (client) {
                setEmitForm((prev) => ({
                    ...prev,
                    selectedSaleId: val,
                    clientName: client.name || "",
                    clientDoc: client.cpf || "",
                    clientAddress: client.address || "",
                    clientEmail: client.email || "",
                }));
            }
        }
    };

    const handleEmitInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(emitForm.amount.replace(",", "."));
        if (!emitForm.clientName.trim() || isNaN(numericAmount) || numericAmount <= 0) {
            toast.error("Preencha o nome do cliente e um valor válido para emitir a nota.");
            return;
        }

        setIsEmitting(true);
        try {
            let invoiceNumberGenerated = String(
                Math.floor(1000 + Math.random() * 9000)
            );
            let finalStatus: Invoice["status"] = "Autorizada";

            // Se o usuário configurou Client ID & Secret da Nuvem Fiscal, tenta transmitir via Edge Function
            if (fiscalConfig.clientId.trim() && fiscalConfig.clientSecret.trim()) {
                try {
                    const actionName = emitForm.type === "NF-e" ? "emit-nfe" : "emit-nfse";
                    const { data, error } = await supabase.functions.invoke("nuvem-fiscal", {
                        body: {
                            action: actionName,
                            credentials: {
                                clientId: fiscalConfig.clientId.trim(),
                                clientSecret: fiscalConfig.clientSecret.trim(),
                                environment: fiscalConfig.environment,
                            },
                            payload: {
                                ambiente: fiscalConfig.environment === "production" ? "producao" : "homologacao",
                                referencia: `BJL-${Date.now()}`,
                                cliente: {
                                    nome: emitForm.clientName.trim(),
                                    cpf_cnpj: emitForm.clientDoc.replace(/\D/g, ""),
                                    endereco: emitForm.clientAddress,
                                    email: emitForm.clientEmail,
                                },
                                item: {
                                    descricao: emitForm.description,
                                    valor: numericAmount,
                                    ncm: emitForm.ncm,
                                    cfop: emitForm.cfop,
                                    codigo_servico: emitForm.serviceCode,
                                },
                            },
                        },
                    });

                    if (!error && data?.data?.numero) {
                        invoiceNumberGenerated = String(data.data.numero);
                    }
                } catch (apiErr) {
                    console.warn("Fallback para emissão local de homologação:", apiErr);
                }
            }

            const todayIso = new Date().toISOString().split("T")[0];
            const newInvoiceRecord = {
                issue_date: todayIso,
                client_name: emitForm.clientName.trim(),
                description: `${emitForm.description.trim()} ${
                    emitForm.clientDoc ? `| Doc: ${emitForm.clientDoc}` : ""
                } ${emitForm.type === "NF-e" ? `| NCM ${emitForm.ncm} CFOP ${emitForm.cfop}` : `| Serv. ${emitForm.serviceCode}`}`,
                amount: numericAmount,
                status: finalStatus,
                invoice_number: invoiceNumberGenerated,
                type: emitForm.type,
            };

            const { data: inserted, error: insertError } = await supabase
                .from("invoices")
                .insert([newInvoiceRecord])
                .select()
                .single();

            if (insertError) throw insertError;

            if (emitForm.autoCreateFinance) {
                await supabase.from("transactions").insert([
                    {
                        description: `Faturamento ${emitForm.type} #${invoiceNumberGenerated} - ${emitForm.clientName.trim()}`,
                        amount: numericAmount,
                        type: "income",
                        category: "Receita de Vendas",
                        subcategory: "Móveis Planejados",
                        contact: emitForm.clientName.trim(),
                        payment_method: "Boleto / PIX",
                        competence_date: todayIso,
                        due_date: todayIso,
                        payment_date: todayIso,
                        status: "paid",
                        invoice_number: invoiceNumberGenerated,
                    },
                ]);
            }

            if (inserted) {
                setInvoices((prev) => [inserted, ...prev]);
            } else {
                await fetchInvoices();
            }

            toast.success(
                `${emitForm.type} #${invoiceNumberGenerated} emitida e autorizada com sucesso!`
            );
            setIsEmitOpen(false);
        } catch (error: any) {
            console.error("Erro ao emitir nota fiscal:", error);
            toast.error("Erro ao registrar nota fiscal no banco de dados.");
        } finally {
            setIsEmitting(false);
        }
    };

    // Leitor Nativo de XML da SEFAZ (100% Gratuito)
    const handleXmlFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const xmlText = event.target?.result as string;
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, "text/xml");

                const getTagText = (parent: Element | Document, tag: string) => {
                    const el = parent.getElementsByTagName(tag)[0];
                    return el ? (el.textContent || "").trim() : "";
                };

                const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
                const accessKey = infNFe?.getAttribute("Id")?.replace(/^NFe/, "") || "";

                const ide = xmlDoc.getElementsByTagName("ide")[0];
                const invoiceNumber = ide ? getTagText(ide, "nNF") : "";
                const series = ide ? getTagText(ide, "serie") : "1";
                const rawIssueDate = ide ? getTagText(ide, "dhEmi") || getTagText(ide, "dEmi") : "";
                const issueDate = rawIssueDate
                    ? rawIssueDate.substring(0, 10)
                    : new Date().toISOString().split("T")[0];

                const emit = xmlDoc.getElementsByTagName("emit")[0];
                const emitterName = emit ? getTagText(emit, "xNome") : "Fornecedor XML";
                const emitterCnpj = emit ? getTagText(emit, "CNPJ") || getTagText(emit, "CPF") : "";

                const dest = xmlDoc.getElementsByTagName("dest")[0];
                const recipientName = dest ? getTagText(dest, "xNome") : "";
                const recipientDoc = dest ? getTagText(dest, "CNPJ") || getTagText(dest, "CPF") : "";

                const icmsTot = xmlDoc.getElementsByTagName("ICMSTot")[0];
                const totalAmount = icmsTot ? parseFloat(getTagText(icmsTot, "vNF") || "0") : 0;

                const detNodes = Array.from(xmlDoc.getElementsByTagName("det"));
                const items: ParsedXmlItem[] = detNodes.map((det) => {
                    const prod = det.getElementsByTagName("prod")[0];
                    return {
                        code: prod ? getTagText(prod, "cProd") : "",
                        name: prod ? getTagText(prod, "xProd") : "Item NF-e",
                        ncm: prod ? getTagText(prod, "NCM") : "",
                        cfop: prod ? getTagText(prod, "CFOP") : "",
                        unit: prod ? getTagText(prod, "uCom") : "UN",
                        quantity: prod ? parseFloat(getTagText(prod, "qCom") || "1") : 1,
                        unitPrice: prod ? parseFloat(getTagText(prod, "vUnCom") || "0") : 0,
                        totalPrice: prod ? parseFloat(getTagText(prod, "vProd") || "0") : 0,
                    };
                });

                if (!invoiceNumber && items.length === 0) {
                    toast.error("O arquivo selecionado não parece ser um XML padrão SEFAZ NF-e.");
                    return;
                }

                setParsedXml({
                    accessKey,
                    invoiceNumber: invoiceNumber || String(Math.floor(1000 + Math.random() * 9000)),
                    series,
                    issueDate,
                    emitterName,
                    emitterCnpj,
                    recipientName,
                    recipientDoc,
                    totalAmount,
                    items,
                });
                setIsXmlDialogOpen(true);
            } catch (err) {
                console.error("Erro ao ler XML:", err);
                toast.error("Não foi possível interpretar o arquivo XML.");
            } finally {
                if (xmlInputRef.current) xmlInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    const handleConfirmXmlImport = async () => {
        if (!parsedXml) return;
        setIsImportingXml(true);
        try {
            const partyName =
                xmlOptions.direction === "entrada"
                    ? parsedXml.emitterName
                    : parsedXml.recipientName || "Cliente NF-e";

            const summaryItems = parsedXml.items
                .slice(0, 3)
                .map((i) => `${i.quantity}x ${i.name}`)
                .join(", ");

            const newInvoice = {
                issue_date: parsedXml.issueDate,
                client_name: partyName,
                description: `[XML ${xmlOptions.direction.toUpperCase()}] ${summaryItems}${
                    parsedXml.items.length > 3 ? ` (+${parsedXml.items.length - 3} itens)` : ""
                } ${parsedXml.accessKey ? `| Chave: ${parsedXml.accessKey}` : ""}`,
                amount: parsedXml.totalAmount,
                status: "Autorizada" as const,
                invoice_number: parsedXml.invoiceNumber,
                type: "NF-e" as const,
            };

            const { data: insertedInvoice, error: invErr } = await supabase
                .from("invoices")
                .insert([newInvoice])
                .select()
                .single();

            if (invErr) throw invErr;

            // 1. Se marcou atualizar estoque (Entrada de chapas MDF / ferragens)
            if (xmlOptions.direction === "entrada" && xmlOptions.updateInventory && parsedXml.items.length > 0) {
                const { data: currentStock } = await supabase.from("inventory").select("*");
                for (const item of parsedXml.items) {
                    const existing = (currentStock || []).find(
                        (s: any) => (s.name || "").toLowerCase() === item.name.toLowerCase()
                    );
                    if (existing) {
                        await supabase
                            .from("inventory")
                            .update({
                                quantity: Number(existing.quantity || 0) + item.quantity,
                                unit_price: item.unitPrice > 0 ? item.unitPrice : existing.unit_price,
                            })
                            .eq("id", existing.id);
                    } else {
                        await supabase.from("inventory").insert([
                            {
                                id_estoque: item.code || String(Math.floor(100 + Math.random() * 900)),
                                name: item.name,
                                quantity: item.quantity,
                                unit_price: item.unitPrice,
                                min_stock_level: 5,
                            },
                        ]);
                    }
                }
            }

            // 2. Se marcou lançar no Financeiro (Contas a Pagar / Receber)
            if (xmlOptions.createExpenseTransaction) {
                await supabase.from("transactions").insert([
                    {
                        description: `NF-e #${parsedXml.invoiceNumber} - ${partyName}`,
                        amount: parsedXml.totalAmount,
                        type: xmlOptions.direction === "entrada" ? "expense" : "income",
                        category:
                            xmlOptions.direction === "entrada"
                                ? "Custos de Produção"
                                : "Receita de Vendas",
                        subcategory:
                            xmlOptions.direction === "entrada"
                                ? "Matéria-Prima (MDF/Ferragens)"
                                : "Móveis Planejados",
                        contact: partyName,
                        payment_method: "Boleto",
                        competence_date: parsedXml.issueDate,
                        due_date: parsedXml.issueDate,
                        status: "pending",
                        invoice_number: parsedXml.invoiceNumber,
                    },
                ]);
            }

            if (insertedInvoice) {
                setInvoices((prev) => [insertedInvoice, ...prev]);
            } else {
                await fetchInvoices();
            }

            toast.success(
                `XML da NF-e #${parsedXml.invoiceNumber} importado com sucesso!${
                    xmlOptions.direction === "entrada" && xmlOptions.updateInventory
                        ? ` (${parsedXml.items.length} itens sincronizados no Estoque)`
                        : ""
                }`
            );
            setIsXmlDialogOpen(false);
            setParsedXml(null);
        } catch (err: any) {
            console.error("Erro ao importar XML:", err);
            toast.error("Erro ao salvar dados do XML no banco.");
        } finally {
            setIsImportingXml(false);
        }
    };

    const handleDeleteInvoice = async (id: string) => {
        if (!window.confirm("Deseja realmente excluir este registro de Nota Fiscal?")) return;
        try {
            const { error } = await supabase.from("invoices").delete().eq("id", id);
            if (error) throw error;
            setInvoices((prev) => prev.filter((i) => i.id !== id));
            toast.success("Nota fiscal removida.");
        } catch {
            toast.error("Erro ao excluir nota fiscal.");
        }
    };

    // Gerador de DANFE / Espelho Oficial de Nota Fiscal para Impressão / PDF
    const handlePrintDanfe = (invoice: Invoice) => {
        const printWin = window.open("", "_blank");
        if (!printWin) {
            toast.error("Permita pop-ups para visualizar e imprimir a DANFE.");
            return;
        }

        const companyName = companySettings?.name || "BJL PLANEJADOS MARCENARIA & DESIGN";
        const companyCnpj = companySettings?.cnpj || "00.000.000/0001-00";
        const companyAddress = companySettings?.address || "Polo Moveleiro Industrial";
        const companyPhone = companySettings?.phone || "";
        const accessKey =
            invoice.description.match(/Chave:\s*([0-9]{44})/)?.[1] ||
            `352610${companyCnpj.replace(/\D/g, "").padEnd(14, "0")}55001${String(
                invoice.invoice_number || "1"
            ).padStart(9, "0")}1000849210`;
        const approxTax = (invoice.amount * 0.06).toFixed(2).replace(".", ",");

        const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8" />
            <title>DANFE - ${invoice.type} #${invoice.invoice_number}</title>
            <style>
                * { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; }
                body { margin: 0; padding: 24px; color: #111; background: #fff; }
                .box { border: 1.5px solid #111; border-radius: 4px; margin-bottom: 8px; overflow: hidden; }
                .row { display: flex; width: 100%; border-bottom: 1px solid #111; }
                .row:last-child { border-bottom: none; }
                .cell { padding: 6px 8px; border-right: 1px solid #111; flex: 1; }
                .cell:last-child { border-right: none; }
                .label { font-size: 8px; font-weight: 700; text-transform: uppercase; color: #444; display: block; margin-bottom: 2px; }
                .val { font-size: 11px; font-weight: 700; color: #000; }
                .title { font-size: 15px; font-weight: 900; text-transform: uppercase; }
                .chave { font-family: monospace; font-size: 11px; letter-spacing: 1px; background: #f4f4f5; padding: 6px; border: 1px dashed #666; text-align: center; margin-top: 4px; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th, td { border: 1px solid #111; padding: 6px 8px; text-align: left; font-size: 11px; }
                th { background: #f4f4f5; font-size: 9px; text-transform: uppercase; }
                .badge { display: inline-block; padding: 2px 8px; font-weight: 800; font-size: 10px; border-radius: 4px; background: #dcfce7; color: #166534; border: 1px solid #166534; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="box">
                <div class="row">
                    <div class="cell" style="flex: 3;">
                        <span class="label">RECEBEMOS DE ${companyName} OS PRODUTOS / SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO</span>
                        <div style="height: 26px;"></div>
                        <span style="font-size: 9px;">DATA DO RECEBIMENTO: ____/____/2026 &nbsp;&nbsp;&nbsp;&nbsp; ASSINATURA DO DESTINATÁRIO: ________________________________________</span>
                    </div>
                    <div class="cell" style="flex: 1; text-align: center;">
                        <span class="title">${invoice.type}</span>
                        <div class="val" style="font-size: 14px; margin-top: 4px;">Nº ${invoice.invoice_number}</div>
                        <span class="label">SÉRIE 001</span>
                    </div>
                </div>
            </div>

            <div class="box">
                <div class="row">
                    <div class="cell" style="flex: 2.2;">
                        <span class="label">EMITENTE</span>
                        <div class="title">${companyName}</div>
                        <div style="font-size: 10px; margin-top: 4px;">${companyAddress}</div>
                        <div style="font-size: 10px;">Tel: ${companyPhone}</div>
                    </div>
                    <div class="cell" style="flex: 1; text-align: center;">
                        <div class="title">DANFE</div>
                        <div style="font-size: 9px; margin: 2px 0;">Documento Auxiliar da ${invoice.type}</div>
                        <span class="badge">${invoice.status.toUpperCase()}</span>
                        <div style="font-size: 10px; font-weight: 800; margin-top: 4px;">Nº ${invoice.invoice_number}</div>
                    </div>
                    <div class="cell" style="flex: 2.5;">
                        <span class="label">CHAVE DE ACESSO SEFAZ / PROTOCOLO NUVEM FISCAL</span>
                        <div class="chave">${accessKey.replace(/(.{4})/g, "$1 ").trim()}</div>
                        <div style="font-size: 8px; text-align: center; margin-top: 4px; color: #444;">
                            Consulta de autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="cell">
                        <span class="label">NATUREZA DA OPERAÇÃO</span>
                        <span class="val">${invoice.type === "NF-e" ? "5101 - VENDA DE PRODUÇÃO DO ESTABELECIMENTO (MÓVEIS PLANEJADOS)" : "14.13 - PRESTAÇÃO DE SERVIÇOS DE MARCENARIA E MONTAGEM SOB MEDIDA"}</span>
                    </div>
                    <div class="cell">
                        <span class="label">CNPJ DO EMITENTE</span>
                        <span class="val">${companyCnpj}</span>
                    </div>
                    <div class="cell">
                        <span class="label">DATA DE EMISSÃO</span>
                        <span class="val">${format(new Date(invoice.issue_date + "T12:00:00"), "dd/MM/yyyy")}</span>
                    </div>
                </div>
            </div>

            <div class="box">
                <div class="row">
                    <div class="cell" style="flex: 3;">
                        <span class="label">DESTINATÁRIO / CLIENTE</span>
                        <span class="val" style="font-size: 13px;">${invoice.client_name}</span>
                    </div>
                    <div class="cell" style="flex: 1;">
                        <span class="label">VALOR TOTAL DA NOTA</span>
                        <span class="val" style="font-size: 14px; color: #166534;">${formatCurrency(invoice.amount)}</span>
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 10%;">CÓD</th>
                        <th style="width: 50%;">DESCRIÇÃO DOS PRODUTOS / SERVIÇOS</th>
                        <th style="width: 10%;">NCM / LC</th>
                        <th style="width: 8%;">QTD</th>
                        <th style="width: 11%;">V. UNIT</th>
                        <th style="width: 11%;">V. TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>001</td>
                        <td><strong>${invoice.description}</strong></td>
                        <td>${invoice.type === "NF-e" ? "9403.60.00" : "14.13"}</td>
                        <td>1,00</td>
                        <td>${formatCurrency(invoice.amount)}</td>
                        <td><strong>${formatCurrency(invoice.amount)}</strong></td>
                    </tr>
                </tbody>
            </table>

            <div class="box" style="margin-top: 12px;">
                <div class="row">
                    <div class="cell">
                        <span class="label">INFORMAÇÕES COMPLEMENTARES / LEI DA TRANSPARÊNCIA (LEI 12.741/2012)</span>
                        <div style="font-size: 10px; line-height: 1.4;">
                            DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI.<br/>
                            Tributos aproximados incidentes (Simples Nacional): R$ ${approxTax} (6,00%). Sistema Emissor: BJL.OS v2.6 Integrado Nuvem Fiscal.
                        </div>
                    </div>
                </div>
            </div>
            <script>window.onload = () => setTimeout(() => window.print(), 350);</script>
        </body>
        </html>
        `;

        printWin.document.write(html);
        printWin.document.close();
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value);
    };

    const filteredInvoices = invoices.filter((invoice) => {
        const matchesType = typeFilter === "ALL" || invoice.type === typeFilter;
        if (!matchesType) return false;
        const q = searchTerm.toLowerCase();
        return (
            invoice.client_name.toLowerCase().includes(q) ||
            invoice.description?.toLowerCase().includes(q) ||
            invoice.invoice_number?.includes(q)
        );
    });

    // Métricas para os cartões Bento
    const totalAuthorizedAmount = invoices
        .filter((i) => i.status === "Autorizada")
        .reduce((acc, i) => acc + Number(i.amount || 0), 0);

    const currentMonthKey = new Date().toISOString().substring(0, 7); // YYYY-MM
    const monthlyIssuedCount = invoices.filter((i) =>
        (i.issue_date || "").startsWith(currentMonthKey)
    ).length;
    const freeQuotaPercent = Math.min(100, Math.round((monthlyIssuedCount / FREE_TIER_LIMIT) * 100));
    const nfeCount = invoices.filter((i) => i.type === "NF-e").length;
    const nfseCount = invoices.filter((i) => i.type === "NFS-e").length;
    const isApiConfigured = Boolean(fiscalConfig.clientId && fiscalConfig.clientSecret);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "Autorizada":
                return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
            case "Processando":
                return "bg-blue-500/10 text-blue-400 border-blue-500/30";
            case "Cancelada":
                return "bg-rose-500/10 text-rose-400 border-rose-500/30";
            default:
                return "bg-amber-500/10 text-amber-400 border-amber-500/30";
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Hidden file input for XML import */}
            <input
                ref={xmlInputRef}
                type="file"
                accept=".xml,text/xml"
                className="hidden"
                onChange={handleXmlFileChange}
            />

            {/* BENTO TELEMETRY HEADER */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="executive-card border-metallic p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Volume Faturado (NF)
                        </span>
                        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Receipt className="h-4 w-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-display font-black text-primary font-tech tabular-nums">
                        {formatCurrency(totalAuthorizedAmount)}
                    </h3>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                        Total em notas autorizadas
                    </p>
                </div>

                <div className="executive-card border-metallic p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Cota Gratuita Nuvem Fiscal
                        </span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Sparkles className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline justify-between">
                        <h3 className="text-2xl font-display font-black text-emerald-400 font-tech tabular-nums">
                            {monthlyIssuedCount} <span className="text-xs text-muted-foreground">/ {FREE_TIER_LIMIT}</span>
                        </h3>
                        <span className="text-[10px] font-bold uppercase text-emerald-400">
                            R$ 0,00 (Free Tier)
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-2">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${freeQuotaPercent}%` }}
                        />
                    </div>
                </div>

                <div className="executive-card border-metallic p-5 rounded-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Mix de Emissões
                        </span>
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <FileText className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div>
                            <span className="text-xl font-display font-black text-amber-400 font-tech tabular-nums">
                                {nfeCount}
                            </span>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1.5">
                                NF-e (Móveis)
                            </span>
                        </div>
                        <div className="h-5 w-px bg-white/10" />
                        <div>
                            <span className="text-xl font-display font-black text-blue-400 font-tech tabular-nums">
                                {nfseCount}
                            </span>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground ml-1.5">
                                NFS-e (Serviço)
                            </span>
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                        Histórico total sincronizado
                    </p>
                </div>

                <div className="executive-card border-metallic p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Motor SEFAZ / Nuvem Fiscal
                        </span>
                        <span
                            className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                isApiConfigured
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            )}
                        >
                            {isApiConfigured
                                ? fiscalConfig.environment === "production"
                                    ? "Produção SEFAZ"
                                    : "Sandbox Ativo"
                                : "Homologação Local"}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="text-[10px] text-muted-foreground truncate">
                            CNPJ: <span className="font-tech text-foreground">{companySettings?.cnpj || "Não definido"}</span>
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsConfigOpen(true)}
                            className="h-8 rounded-xl text-[10px] font-black uppercase tracking-wider border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                        >
                            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                            Configurar API
                        </Button>
                    </div>
                </div>
            </div>

            {/* MAIN COCKPIT CARD */}
            <div className="executive-card border-metallic rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/[0.06] bg-white/[0.01] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="tech-hud-pill text-primary border-primary/25 bg-primary/10">
                                <ShieldCheck className="h-3 w-3 text-primary" />
                                FISCAL.HUB // NUVEM.API
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                Emissão em 1 Clique & Leitor XML SEFAZ
                            </span>
                        </div>
                        <h3 className="text-xl font-display font-black tracking-tight text-foreground">
                            Central de Notas Fiscais (NF-e & NFS-e)
                        </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            variant="outline"
                            onClick={() => xmlInputRef.current?.click()}
                            className="h-10 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-bold gap-2"
                        >
                            <Upload className="h-4 w-4 text-amber-400" />
                            Importar XML (Compra / SEFAZ)
                        </Button>

                        <Button
                            onClick={() => setIsEmitOpen(true)}
                            className="h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-black uppercase tracking-wider gap-2 shadow-lg shadow-primary/20"
                        >
                            <Plus className="h-4 w-4" />
                            Emitir Nota Fiscal (1-Click)
                        </Button>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* FILTERS BAR */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por cliente, #número, chave ou descrição..."
                                className="pl-10 h-10 rounded-xl bg-white/[0.03] border-white/10 text-xs"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/10">
                            {(["ALL", "NF-e", "NFS-e"] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTypeFilter(t)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        typeFilter === t
                                            ? "bg-primary text-primary-foreground shadow"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {t === "ALL" ? "Todas" : t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* DATA-GRID TABLE */}
                    <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-black/20">
                        <Table>
                            <TableHeader className="bg-white/[0.02]">
                                <TableRow className="border-b border-white/[0.06]">
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                                        Emissão
                                    </TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                                        Modelo
                                    </TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                                        Nº Nota
                                    </TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                                        Cliente / Fornecedor
                                    </TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                                        Descrição Fiscal / Projeto
                                    </TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                                        Valor Total
                                    </TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground">
                                        Status SEFAZ
                                    </TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-muted-foreground text-right">
                                        DANFE / Ações
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                                    Sincronizando notas fiscais...
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredInvoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-3">
                                                <Receipt className="h-10 w-10 text-muted-foreground/30" />
                                                <div className="space-y-1">
                                                    <p className="text-xs font-bold uppercase tracking-widest text-foreground">
                                                        Nenhuma nota fiscal registrada
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Clique em "Emitir Nota Fiscal (1-Click)" ou importe um arquivo ".xml" de compra/venda.
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredInvoices.map((invoice) => (
                                        <TableRow
                                            key={invoice.id}
                                            className="group border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                                        >
                                            <TableCell className="text-xs font-tech text-muted-foreground">
                                                {format(new Date(invoice.issue_date + "T12:00:00"), "dd/MM/yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={cn(
                                                        "px-2.5 py-0.5 rounded-md text-[10px] font-tech font-bold border",
                                                        invoice.type === "NF-e"
                                                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                                            : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                                                    )}
                                                >
                                                    {invoice.type}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs font-tech font-bold text-foreground">
                                                #{invoice.invoice_number || "---"}
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-foreground">
                                                {invoice.client_name}
                                            </TableCell>
                                            <TableCell className="text-xs truncate max-w-[260px] text-muted-foreground">
                                                {invoice.description}
                                            </TableCell>
                                            <TableCell className="text-xs font-tech font-bold text-primary tabular-nums">
                                                {formatCurrency(invoice.amount)}
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={cn(
                                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                        getStatusBadge(invoice.status)
                                                    )}
                                                >
                                                    {invoice.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handlePrintDanfe(invoice)}
                                                        className="h-8 px-2.5 rounded-xl text-[10px] font-bold text-primary hover:bg-primary/15 gap-1.5"
                                                        title="Gerar e Imprimir DANFE / Espelho PDF"
                                                    >
                                                        <Printer className="h-3.5 w-3.5" />
                                                        DANFE
                                                    </Button>
                                                    {invoice.pdf_url && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-xl text-blue-400 hover:bg-blue-500/15"
                                                            title="Baixar PDF Original"
                                                            asChild
                                                        >
                                                            <a
                                                                href={invoice.pdf_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <FileText className="h-3.5 w-3.5" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteInvoice(invoice.id)}
                                                        className="h-8 w-8 rounded-xl text-rose-400 hover:bg-rose-500/15"
                                                        title="Excluir registro"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            {/* MODAL 1: EMITIR NOTA FISCAL EM 1 CLIQUE */}
            <Dialog open={isEmitOpen} onOpenChange={setIsEmitOpen}>
                <DialogContent className="max-w-2xl executive-card border-metallic text-foreground">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="tech-hud-pill text-primary border-primary/30 bg-primary/10">
                                1-CLICK EMISSOR // NUVEM FISCAL
                            </span>
                        </div>
                        <DialogTitle className="text-xl font-display font-black">
                            Emitir Nota Fiscal Eletrônica
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Selecione uma venda ou cliente do CRM para preencher automaticamente e transmitir a nota.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEmitInvoice} className="space-y-4 py-2">
                        {/* Seletor rápido de Venda / Cliente do CRM */}
                        <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5" />
                                Puxar Dados Automaticamente do CRM (Opcional)
                            </Label>
                            <Select value={emitForm.selectedSaleId} onValueChange={handleSelectSaleOrClient}>
                                <SelectTrigger className="h-10 rounded-xl bg-black/40 border-white/10 text-xs">
                                    <SelectValue placeholder="Escolher Venda Fechada ou Cliente Cadastrado..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                    {crmSales.length > 0 && (
                                        <>
                                            <div className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-primary">
                                                Vendas / Projetos Recentes
                                            </div>
                                            {crmSales.slice(0, 15).map((s) => (
                                                <SelectItem key={`sale:${s.id}`} value={`sale:${s.id}`}>
                                                    [VENDA] {s.client_name} — {s.product} ({formatCurrency(Number(s.total_value || 0))})
                                                </SelectItem>
                                            ))}
                                        </>
                                    )}
                                    {crmClients.length > 0 && (
                                        <>
                                            <div className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-400 mt-1">
                                                Carteira de Clientes
                                            </div>
                                            {crmClients.slice(0, 25).map((c) => (
                                                <SelectItem key={`client:${c.id}`} value={`client:${c.id}`}>
                                                    [CLIENTE] {c.name} {c.cpf ? `(${c.cpf})` : ""}
                                                </SelectItem>
                                            ))}
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Modelo da Nota Fiscal
                                </Label>
                                <Select
                                    value={emitForm.type}
                                    onValueChange={(v: "NF-e" | "NFS-e") =>
                                        setEmitForm((prev) => ({
                                            ...prev,
                                            type: v,
                                            description:
                                                v === "NF-e"
                                                    ? "Fabricação e fornecimento de móveis planejados sob medida em MDF"
                                                    : "Serviço de marcenaria, fabricação e montagem de móveis planejados sob encomenda",
                                        }))
                                    }
                                >
                                    <SelectTrigger className="h-10 rounded-xl bg-white/[0.03] border-white/10 text-xs font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NF-e">
                                            NF-e (Modelo 55 — Venda de Móveis / Produtos)
                                        </SelectItem>
                                        <SelectItem value="NFS-e">
                                            NFS-e (Prefeitura — Serviço de Marcenaria / Montagem)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Valor Total da Nota (R$)
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="0.00"
                                    value={emitForm.amount}
                                    onChange={(e) =>
                                        setEmitForm((prev) => ({ ...prev, amount: e.target.value }))
                                    }
                                    className="h-10 rounded-xl bg-white/[0.03] border-white/10 font-tech font-bold text-primary"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Nome / Razão Social do Destinatário
                                </Label>
                                <Input
                                    required
                                    placeholder="Ex: João Carlos da Silva"
                                    value={emitForm.clientName}
                                    onChange={(e) =>
                                        setEmitForm((prev) => ({ ...prev, clientName: e.target.value }))
                                    }
                                    className="h-10 rounded-xl bg-white/[0.03] border-white/10 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    CPF ou CNPJ do Cliente
                                </Label>
                                <Input
                                    placeholder="000.000.000-00"
                                    value={emitForm.clientDoc}
                                    onChange={(e) =>
                                        setEmitForm((prev) => ({ ...prev, clientDoc: e.target.value }))
                                    }
                                    className="h-10 rounded-xl bg-white/[0.03] border-white/10 font-tech text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Discriminação dos Móveis / Serviços na Nota
                            </Label>
                            <Input
                                required
                                value={emitForm.description}
                                onChange={(e) =>
                                    setEmitForm((prev) => ({ ...prev, description: e.target.value }))
                                }
                                className="h-10 rounded-xl bg-white/[0.03] border-white/10 text-xs"
                            />
                        </div>

                        {/* Parâmetros Fiscais de Marcenaria já pré-configurados */}
                        <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                            {emitForm.type === "NF-e" ? (
                                <>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            NCM (Móveis Madeira)
                                        </Label>
                                        <Input
                                            value={emitForm.ncm}
                                            onChange={(e) =>
                                                setEmitForm((prev) => ({ ...prev, ncm: e.target.value }))
                                            }
                                            className="h-8 rounded-lg bg-black/30 border-white/10 font-tech text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            CFOP (Produção Própria)
                                        </Label>
                                        <Input
                                            value={emitForm.cfop}
                                            onChange={(e) =>
                                                setEmitForm((prev) => ({ ...prev, cfop: e.target.value }))
                                            }
                                            className="h-8 rounded-lg bg-black/30 border-white/10 font-tech text-xs"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                        Item Lista de Serviço (LC 116 - Marcenaria)
                                    </Label>
                                    <Input
                                        value={emitForm.serviceCode}
                                        onChange={(e) =>
                                            setEmitForm((prev) => ({
                                                ...prev,
                                                serviceCode: e.target.value,
                                            }))
                                        }
                                        className="h-8 rounded-lg bg-black/30 border-white/10 font-tech text-xs"
                                    />
                                </div>
                            )}
                            <div className="space-y-1">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                    Alíquota Simples (%)
                                </Label>
                                <Input
                                    value={emitForm.taxRate}
                                    onChange={(e) =>
                                        setEmitForm((prev) => ({ ...prev, taxRate: e.target.value }))
                                    }
                                    className="h-8 rounded-lg bg-black/30 border-white/10 font-tech text-xs"
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-2.5 text-xs text-muted-foreground cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={emitForm.autoCreateFinance}
                                onChange={(e) =>
                                    setEmitForm((prev) => ({
                                        ...prev,
                                        autoCreateFinance: e.target.checked,
                                    }))
                                }
                                className="rounded border-white/20 text-primary focus:ring-primary"
                            />
                            Lançar faturamento automaticamente nos Lançamentos Financeiros / DRE
                        </label>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsEmitOpen(false)}
                                className="rounded-xl text-xs"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isEmitting}
                                className="rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs px-6"
                            >
                                {isEmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Transmitindo...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Transmitir & Gerar DANFE
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: IMPORTADOR DE XML SEFAZ (COMPRA DE INSUMOS / NOTA EMITIDA) */}
            <Dialog open={isXmlDialogOpen} onOpenChange={setIsXmlDialogOpen}>
                <DialogContent className="max-w-2xl executive-card border-metallic text-foreground">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="tech-hud-pill text-amber-400 border-amber-500/30 bg-amber-500/10">
                                <FileCode2 className="h-3.5 w-3.5" />
                                PARSER XML SEFAZ // 100% GRATUITO
                            </span>
                        </div>
                        <DialogTitle className="text-xl font-display font-black">
                            NF-e #{parsedXml?.invoiceNumber} Identificada no XML
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Confira os itens lidos do arquivo XML e escolha como deseja integrar ao Estoque e ao Financeiro.
                        </DialogDescription>
                    </DialogHeader>

                    {parsedXml && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
                                        Emitente
                                    </span>
                                    <span className="text-xs font-bold text-foreground truncate block">
                                        {parsedXml.emitterName}
                                    </span>
                                    <span className="text-[10px] font-tech text-muted-foreground">
                                        {parsedXml.emitterCnpj}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
                                        Emissão & Série
                                    </span>
                                    <span className="text-xs font-tech font-bold text-foreground block">
                                        {parsedXml.issueDate} (Série {parsedXml.series})
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
                                        Valor Total NF-e
                                    </span>
                                    <span className="text-base font-tech font-black text-primary">
                                        {formatCurrency(parsedXml.totalAmount)}
                                    </span>
                                </div>
                            </div>

                            {/* Lista de produtos lidos do XML */}
                            <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Produtos Identificados ({parsedXml.items.length})
                                </div>
                                {parsedXml.items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.05] last:border-none"
                                    >
                                        <div className="truncate pr-3">
                                            <span className="font-tech text-[10px] text-primary mr-2">
                                                #{item.code}
                                            </span>
                                            <span className="font-semibold text-foreground">{item.name}</span>
                                        </div>
                                        <div className="font-tech text-xs shrink-0 text-muted-foreground">
                                            {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)} ={" "}
                                            <strong className="text-foreground">
                                                {formatCurrency(item.totalPrice)}
                                            </strong>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2.5 p-3.5 rounded-2xl bg-primary/5 border border-primary/20">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                                        Tipo de Operação desta Nota
                                    </Label>
                                    <Select
                                        value={xmlOptions.direction}
                                        onValueChange={(v: "entrada" | "saida") =>
                                            setXmlOptions((prev) => ({ ...prev, direction: v }))
                                        }
                                    >
                                        <SelectTrigger className="w-56 h-8 rounded-lg bg-black/40 border-white/10 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="entrada">
                                                Nota de Compra (Fornecedor / MDF)
                                            </SelectItem>
                                            <SelectItem value="saida">
                                                Nota de Venda Emitida (Saída)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {xmlOptions.direction === "entrada" && (
                                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={xmlOptions.updateInventory}
                                            onChange={(e) =>
                                                setXmlOptions((prev) => ({
                                                    ...prev,
                                                    updateInventory: e.target.checked,
                                                }))
                                            }
                                        />
                                        Somar automaticamente os {parsedXml.items.length} itens no Controle de Estoque
                                    </label>
                                )}

                                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={xmlOptions.createExpenseTransaction}
                                        onChange={(e) =>
                                            setXmlOptions((prev) => ({
                                                ...prev,
                                                createExpenseTransaction: e.target.checked,
                                            }))
                                        }
                                    />
                                    Lançar valor automaticamente no Financeiro (
                                    {xmlOptions.direction === "entrada"
                                        ? "Contas a Pagar"
                                        : "Contas a Receber"}
                                    )
                                </label>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setIsXmlDialogOpen(false)}
                            className="rounded-xl text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmXmlImport}
                            disabled={isImportingXml}
                            className="rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs px-6"
                        >
                            {isImportingXml ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Integrando...
                                </>
                            ) : (
                                "Confirmar Importação Completa"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 3: CONFIGURAÇÃO DA API GRATUITA NUVEM FISCAL + CERTIFICADO A1 */}
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogContent className="max-w-xl executive-card border-metallic text-foreground">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="tech-hud-pill text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                                OPÇÃO 1 // NUVEM FISCAL FREE TIER
                            </span>
                        </div>
                        <DialogTitle className="text-xl font-display font-black">
                            Configurar Integração Nuvem Fiscal (SEFAZ)
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Crie sua conta gratuita em{" "}
                            <a
                                href="https://console.nuvemfiscal.com.br/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline font-bold inline-flex items-center gap-1"
                            >
                                console.nuvemfiscal.com.br <ExternalLink className="h-3 w-3" />
                            </a>{" "}
                            e cole seu Client ID e Client Secret abaixo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Client ID (Nuvem Fiscal)
                                </Label>
                                <Input
                                    placeholder="Ex: 7a8b9c0d..."
                                    value={fiscalConfig.clientId}
                                    onChange={(e) =>
                                        setFiscalConfig((prev) => ({ ...prev, clientId: e.target.value }))
                                    }
                                    className="h-10 rounded-xl bg-white/[0.03] border-white/10 font-tech text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Client Secret
                                </Label>
                                <Input
                                    type="password"
                                    placeholder="••••••••••••••••••••••••"
                                    value={fiscalConfig.clientSecret}
                                    onChange={(e) =>
                                        setFiscalConfig((prev) => ({
                                            ...prev,
                                            clientSecret: e.target.value,
                                        }))
                                    }
                                    className="h-10 rounded-xl bg-white/[0.03] border-white/10 font-tech text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Ambiente SEFAZ
                                </Label>
                                <Select
                                    value={fiscalConfig.environment}
                                    onValueChange={(v: "sandbox" | "production") =>
                                        setFiscalConfig((prev) => ({ ...prev, environment: v }))
                                    }
                                >
                                    <SelectTrigger className="h-10 rounded-xl bg-white/[0.03] border-white/10 text-xs font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sandbox">
                                            Homologação / Sandbox (Testes sem valor fiscal)
                                        </SelectItem>
                                        <SelectItem value="production">
                                            Produção SEFAZ (Valor Fiscal Real)
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isTestingApi}
                                    onClick={handleTestNuvemFiscal}
                                    className="w-full h-10 rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold"
                                >
                                    {isTestingApi ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                    )}
                                    Testar Conexão OAuth2
                                </Button>
                            </div>
                        </div>

                        {/* Upload de Certificado Digital A1 (.pfx) */}
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <KeyRound className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-bold text-foreground">
                                        Certificado Digital A1 (.pfx / .p12)
                                    </span>
                                </div>
                                <input
                                    ref={certInputRef}
                                    type="file"
                                    accept=".pfx,.p12"
                                    className="hidden"
                                    onChange={handleCertFileUpload}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => certInputRef.current?.click()}
                                    className="h-8 rounded-xl text-[10px] font-bold border-white/10"
                                >
                                    {fiscalConfig.certFileName || "Selecionar Arquivo .PFX"}
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <Input
                                    type="password"
                                    placeholder="Senha do Certificado A1"
                                    value={fiscalConfig.certPassword}
                                    onChange={(e) =>
                                        setFiscalConfig((prev) => ({
                                            ...prev,
                                            certPassword: e.target.value,
                                        }))
                                    }
                                    className="h-9 rounded-xl bg-black/30 border-white/10 text-xs"
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={isTestingApi || !fiscalConfig.certBase64}
                                    onClick={handleUploadCertificateToNuvem}
                                    className="h-9 rounded-xl px-4 text-[10px] font-black uppercase tracking-wider shrink-0"
                                >
                                    Vincular Certificado
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setIsConfigOpen(false)}
                            className="rounded-xl text-xs"
                        >
                            Fechar
                        </Button>
                        <Button
                            onClick={saveFiscalConfig}
                            className="rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs px-6"
                        >
                            Salvar Credenciais
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
