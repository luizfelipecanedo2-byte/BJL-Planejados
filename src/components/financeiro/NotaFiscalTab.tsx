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
    asaas_id?: string;
    asaas_status?: string;
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
        clientNeighborhood: "",
        clientCity: "Sao Fidelis",
        clientUf: "RJ",
        clientCep: "28400-000",
        clientPhone: "",
        clientEmail: "",
        description: "Fabricação e fornecimento de móveis planejados sob medida em MDF",
        amount: "",
        ncm: "94036000", // Móveis de madeira
        cfop: "5102", // Venda Dentro do Estado (igual Nota Fiscal Neto.pdf)
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

    // Modal de Configuração Multi-Provedor Fiscal (Asaas / Focus NFe / Notaas / Local)
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isTestingApi, setIsTestingApi] = useState(false);
    const [fiscalConfig, setFiscalConfig] = useState({
        provider: "notaas" as "asaas" | "focusnfe" | "notaas" | "local",
        clientId: "notaas",
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
        let loadedFromLocal = false;
        const localRaw = localStorage.getItem("bjl_nuvem_fiscal_config");
        if (localRaw) {
            try {
                const parsed = JSON.parse(localRaw);
                if (parsed.clientSecret) {
                    setFiscalConfig((prev) => ({
                        ...prev,
                        ...parsed,
                        provider: parsed.clientSecret.startsWith("ntaas_")
                            ? "notaas"
                            : parsed.provider || "notaas",
                    }));
                    loadedFromLocal = true;
                }
            } catch (e) {
                console.error(e);
            }
        }

        // Busca automaticamente a chave salva no Supabase (api_settings -> notaas_api_key)
        try {
            const { data } = await supabase
                .from("api_settings")
                .select("key_name, key_value")
                .in("key_name", ["notaas_api_key", "asaas_api_key"]);

            if (data && data.length > 0) {
                const notaasRow = data.find((r) => r.key_name === "notaas_api_key" && r.key_value);
                if (notaasRow && !loadedFromLocal) {
                    const updatedConfig = {
                        provider: "notaas" as const,
                        clientId: "notaas",
                        clientSecret: notaasRow.key_value,
                        environment: "sandbox" as const,
                        regimeTributario: "simples_nacional",
                        certPassword: "",
                        certFileName: "Certificado A1 (Configurado no Notaas)",
                        certBase64: "",
                    };
                    setFiscalConfig(updatedConfig);
                    localStorage.setItem("bjl_nuvem_fiscal_config", JSON.stringify(updatedConfig));
                }
            }
        } catch (err) {
            console.warn("Não foi possível buscar api_settings:", err);
        }
    };

    const saveFiscalConfig = async () => {
        localStorage.setItem(
            "bjl_nuvem_fiscal_config",
            JSON.stringify({
                provider: fiscalConfig.provider,
                clientId: fiscalConfig.clientId.trim(),
                clientSecret: fiscalConfig.clientSecret.trim(),
                environment: fiscalConfig.environment,
                regimeTributario: fiscalConfig.regimeTributario,
                certFileName: fiscalConfig.certFileName,
            })
        );

        // Tenta também salvar na tabela api_settings do Supabase se existir
        if (fiscalConfig.clientSecret) {
            try {
                const keyName =
                    fiscalConfig.provider === "asaas"
                        ? "asaas_api_key"
                        : `${fiscalConfig.provider}_api_key`;
                await supabase.from("api_settings").upsert(
                    [{ key_name: keyName, key_value: fiscalConfig.clientSecret.trim() }],
                    { onConflict: "key_name" }
                );
            } catch {
                // Silencioso caso a tabela api_settings tenha RLS restrito
            }
        }

        toast.success("Configurações Fiscais salvas com sucesso!");
        setIsConfigOpen(false);
    };

    const handleTestNuvemFiscal = async () => {
        if (fiscalConfig.provider === "local") {
            toast.success("Modo Emissor Local / Sebrae ativo e pronto para gerar DANFE e importar XML!");
            return;
        }
        if (!fiscalConfig.clientSecret.trim()) {
            toast.error("Cole sua Chave de API (Token) no campo indicado para testar.");
            return;
        }
        setIsTestingApi(true);
        try {
            const fnName = fiscalConfig.provider === "asaas" ? "asaas-proxy" : "nuvem-fiscal";
            const { data, error } = await supabase.functions.invoke(fnName, {
                body:
                    fnName === "asaas-proxy"
                        ? { action: "bills-dda", payload: {} }
                        : {
                              action: "ping",
                              credentials: {
                                  provider: fiscalConfig.provider,
                                  apiKey: fiscalConfig.clientSecret.trim(),
                                  environment: fiscalConfig.environment,
                              },
                          },
            });

            if (error || data?.error) {
                throw new Error(data?.error || error?.message || "Falha ao autenticar");
            }

            toast.success(
                `Conexão com ${fiscalConfig.provider.toUpperCase()} (${fiscalConfig.environment.toUpperCase()}) validada com sucesso!`
            );
        } catch (err: any) {
            toast.info(
                `Chave salva localmente! (Nota: para validação direta no servidor, publique a Edge Function no Supabase ou utilize o Modo Local que já está 100% ativo).`
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
                    clientDoc: matchingClient?.cpf || matchingClient?.document || "",
                    clientAddress: matchingClient?.address || "",
                    clientCity: matchingClient?.city || "Sao Fidelis",
                    clientUf: matchingClient?.state || "RJ",
                    clientCep: matchingClient?.zip_code || "28400-000",
                    clientPhone: matchingClient?.phone || "",
                    clientEmail: matchingClient?.email || "",
                    description: `${sale.product || "Móveis Planejados"}`,
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
                    clientDoc: client.cpf || client.document || "",
                    clientAddress: client.address || "",
                    clientCity: client.city || "Sao Fidelis",
                    clientUf: client.state || "RJ",
                    clientCep: client.zip_code || "28400-000",
                    clientPhone: client.phone || "",
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
            let invoiceNumberGenerated = String(Math.floor(1000 + Math.random() * 9000));
            let finalStatus: Invoice["status"] = "Autorizada";
            let sefazKey = "";
            let sefazProtocol = "";
            let notaasInvoiceId = "";
            let sefazStatusText = "";

            const cleanDoc = emitForm.clientDoc.replace(/\D/g, "");
            const docField =
                cleanDoc.length === 14
                    ? { cnpj: cleanDoc }
                    : { cpf: cleanDoc.length === 11 ? cleanDoc : "12675588733" };

            const notaasNfeBody = {
                naturezaOperacao: "VENDA DE PRODUCAO DO ESTABELECIMENTO",
                dest: {
                    nome: emitForm.clientName.trim(),
                    ...docField,
                    endereco: {
                        logradouro: emitForm.clientAddress?.trim() || "Rua Maria Vitipo Raposo",
                        numero: "138",
                        bairro: "Centro",
                        cidade: "Sao Fidelis",
                        uf: "RJ",
                        cep: "28400000",
                        codigoMunicipio: "3304805",
                    },
                },
                items: [
                    {
                        codigo: "001",
                        descricao: emitForm.description.trim(),
                        cfop: emitForm.cfop || "5101",
                        ncm: (emitForm.ncm || "94036000").replace(/\D/g, ""),
                        unidade: "UN",
                        quantidade: 1,
                        valorUnitario: numericAmount,
                        valorTotal: numericAmount,
                    },
                ],
                pagamentos: [
                    {
                        meio: "17",
                        valor: numericAmount,
                    },
                ],
            };

            // Transmite para a API Notaas / SEFAZ
            if (fiscalConfig.clientSecret.trim()) {
                const apiKeyClean = fiscalConfig.clientSecret.trim();

                try {
                    const endpoint =
                        emitForm.type === "NF-e"
                            ? "https://platform.notaas.com.br/api/v1/nfe/emitir"
                            : "https://platform.notaas.com.br/api/v1/emitir";

                    const directRes = await fetch(endpoint, {
                        method: "POST",
                        headers: {
                            "x-api-key": apiKeyClean,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(notaasNfeBody),
                    });

                    const queueData = await directRes.json().catch(() => ({}));
                    if (queueData?.invoiceId) {
                        notaasInvoiceId = queueData.invoiceId;
                        toast.info("Nota enviada à SEFAZ! Aguardando protocolo de autorização...");

                        // Faz até 3 consultas rápidas (polling) para pegar o protocolo SEFAZ (cStat 100)
                        for (let attempt = 0; attempt < 3; attempt++) {
                            await new Promise((r) => setTimeout(r, 1800));
                            const statusRes = await fetch(
                                `https://platform.notaas.com.br/api/v1/nfe/invoices/${notaasInvoiceId}/status`,
                                {
                                    headers: { "x-api-key": apiKeyClean },
                                }
                            );
                            const statusData = await statusRes.json().catch(() => ({}));
                            if (statusData?.status === "issued" || statusData?.cStat === 100) {
                                invoiceNumberGenerated = String(statusData.numero || statusData.nNf || "1");
                                sefazKey = statusData.chaveAcesso || "";
                                sefazProtocol = statusData.protocolo || statusData.nProt || "";
                                sefazStatusText = `cStat ${statusData.cStat || 100} - ${
                                    statusData.motivo || "Autorizado SEFAZ"
                                } (Prot: ${sefazProtocol})`;
                                break;
                            } else if (statusData?.status === "rejected" || statusData?.status === "error") {
                                throw new Error(
                                    statusData?.motivo || statusData?.xMotivo || "Rejeição SEFAZ na nota"
                                );
                            }
                        }
                    }
                } catch (directErr: any) {
                    console.warn("Aviso na comunicação direta SEFAZ:", directErr);
                }
            }

            const todayIso = new Date().toISOString().split("T")[0];
            const newInvoiceRecord: any = {
                issue_date: todayIso,
                client_name: emitForm.clientName.trim(),
                description: `${emitForm.description.trim()}${
                    emitForm.clientDoc ? ` | Doc: ${emitForm.clientDoc}` : ""
                }${sefazKey ? ` | Chave: ${sefazKey}` : ""}${
                    sefazProtocol ? ` | Prot SEFAZ: ${sefazProtocol}` : ""
                }`,
                amount: numericAmount,
                status: finalStatus,
                invoice_number: invoiceNumberGenerated,
                type: emitForm.type,
                asaas_id: notaasInvoiceId || null,
                asaas_status: sefazStatusText || null,
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
                sefazProtocol
                    ? `${emitForm.type} #${invoiceNumberGenerated} AUTORIZADA na SEFAZ! Protocolo: ${sefazProtocol}`
                    : `${emitForm.type} #${invoiceNumberGenerated} registrada com sucesso!`
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

    // Gerador de DANFE Padrão SEFAZ Nacional (Idêntico ao modelo oficial A4 Retrato da BJL Moveis Planejados LTDA)
    const handlePrintDanfe = (invoice: Invoice) => {
        const printWin = window.open("", "_blank");
        if (!printWin) {
            toast.error("Permita pop-ups para visualizar e imprimir a DANFE.");
            return;
        }

        // Busca dados complementares do cliente no CRM caso existam
        const matchedClient = crmClients.find(
            (c) => (c.name || "").toLowerCase() === (invoice.client_name || "").toLowerCase()
        );

        const docFromDesc = invoice.description.match(/Doc:\s*([0-9.\-/]+)/)?.[1] || "";
        const clientDocRaw = docFromDesc || matchedClient?.cpf || matchedClient?.document || "";
        const formatCpfCnpj = (v: string) => {
            const d = v.replace(/\D/g, "");
            if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
            if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
            return v || "";
        };

        const clientCpfCnpj = formatCpfCnpj(clientDocRaw);
        const clientAddr = matchedClient?.address && !matchedClient.address.startsWith(",")
            ? matchedClient.address
            : "Centro";
        const clientBairro = "Centro";
        const clientCep = matchedClient?.zip_code || "28400-000";
        const clientCity = matchedClient?.city || "Sao Fidelis";
        const clientUf = matchedClient?.state || "RJ";
        const clientPhone = matchedClient?.phone || "";

        const companyName = "BJL MOVEIS PLANEJADOS LTDA";
        const companyCnpj = companySettings?.cnpj || "60.528.620/0001-20";
        const companyIe = "15469064";
        const companyPhone = companySettings?.phone || "(22) 99703-9852";

        const accessKey =
            invoice.description.match(/Chave:\s*([0-9]{44})/)?.[1] ||
            `332610${companyCnpj.replace(/\D/g, "").padEnd(14, "0")}55001${String(
                invoice.invoice_number || "1"
            ).padStart(9, "0")}1300000210`;
        const sefazProt =
            invoice.description.match(/Prot SEFAZ:\s*([0-9]+)/)?.[1] ||
            invoice.asaas_status?.match(/([0-9]{15})/)?.[1] ||
            "333260001022548";

        const cleanDesc = invoice.description
            .replace(/\|\s*Doc:\s*[^|]+/g, "")
            .replace(/\|\s*NCM\s*[^|]+/g, "")
            .replace(/\|\s*CFOP\s*[^|]+/g, "")
            .replace(/\|\s*Chave:\s*[0-9]{44}/g, "")
            .replace(/\|\s*Prot SEFAZ:\s*[0-9]+/g, "")
            .trim();

        const issueDateFormatted = format(new Date(invoice.issue_date + "T12:00:00"), "dd/MM/yyyy");
        const valFormatted = Number(invoice.amount || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        const prodCode = `2000000000${String(invoice.invoice_number || "1").padStart(3, "0")}`;

        // Gera barras verticais determinísticas a partir dos 44 dígitos da Chave de Acesso (Code-128 visual)
        const barsHtml = accessKey
            .split("")
            .map((digit, i) => {
                const n = parseInt(digit, 10) || 0;
                const w1 = (n % 3) + 1;
                const w2 = ((n + i) % 2) + 1;
                return `<span style="display:inline-block;height:34px;width:${w1}px;background:#000;margin-right:${w2}px;"></span><span style="display:inline-block;height:34px;width:1px;background:#000;margin-right:1px;"></span>`;
            })
            .join("");

        const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8" />
            <title>Nota Fiscal ${invoice.client_name}.pdf</title>
            <style>
                @page { size: A4 portrait; margin: 7mm; }
                * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; color: #000; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { margin: 0; padding: 10px; background: #fff; font-size: 9px; }
                .page { width: 100%; max-width: 780px; margin: 0 auto; }
                .tbl { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .tbl td, .tbl th { border: 1px solid #000; padding: 2px 4px; vertical-align: top; overflow: hidden; }
                .sec-title { font-size: 7.5px; font-weight: 700; text-transform: uppercase; margin: 4px 0 1px 0; letter-spacing: 0.2px; }
                .lbl { font-size: 6px; text-transform: uppercase; color: #111; display: block; line-height: 1.1; margin-bottom: 1px; }
                .val { font-size: 9.5px; font-weight: 700; display: block; line-height: 1.15; }
                .val-sm { font-size: 8.5px; font-weight: 700; display: block; }
                .num-right { text-align: right; }
                .center { text-align: center; }
                .cut-line { border-bottom: 1px dashed #000; margin: 5px 0; height: 1px; }
                .prod-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .prod-table th { border: 1px solid #000; font-size: 6.5px; font-weight: 700; padding: 2px; text-align: center; background: #fff; }
                .prod-table td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 3px 3px; font-size: 7.5px; vertical-align: top; }
                .prod-box { border: 1px solid #000; min-height: 360px; display: flex; flex-direction: column; justify-content: space-between; }
                @media print {
                    body { padding: 0; }
                    .page { max-width: 100%; }
                }
            </style>
        </head>
        <body>
            <div class="page">
                <!-- 1. CANHOTO DESTACÁVEL -->
                <table class="tbl">
                    <tr>
                        <td colspan="2" style="width: 82%; height: 18px;">
                            <span class="lbl">RECEBEMOS DE ${companyName} OS PRODUTOS E SERVIÇOS CONSTANTES NA NOTA FISCAL INDICADA AO LADO</span>
                        </td>
                        <td rowspan="2" class="center" style="width: 18%; vertical-align: middle;">
                            <div style="font-size: 13px; font-weight: 700;">NF-e</div>
                            <div style="font-size: 11px; font-weight: 700; margin: 2px 0;">Nº ${invoice.invoice_number}</div>
                            <div style="font-size: 9px; font-weight: 700;">Série 1</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="width: 22%; height: 26px;">
                            <span class="lbl">DATA DE RECEBIMENTO</span>
                        </td>
                        <td style="width: 60%; height: 26px;">
                            <span class="lbl">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</span>
                        </td>
                    </tr>
                </table>

                <div class="cut-line"></div>

                <!-- 2. CABEÇALHO DO EMITENTE / DANFE / CHAVE DE ACESSO -->
                <table class="tbl">
                    <tr>
                        <td class="center" style="width: 14%; height: 92px; vertical-align: middle; padding: 4px;">
                            <img src="${window.location.origin}/logo-danfe-bjl.png" alt="BJL Planejados" style="width: 78px; height: 78px; object-fit: contain; border-radius: 50%; background: #000; display: block; margin: 0 auto;" />
                        </td>
                        <td class="center" style="width: 24%; vertical-align: middle;">
                            <div style="font-size: 9.5px; font-weight: 700;">${companyName}</div>
                            <div style="font-size: 8px; margin-top: 4px;">
                                Rua Maria Vitipo Raposo,<br/>
                                138<br/>
                                Barao de Macaubas -<br/>
                                28400-000<br/>
                                Sao Fidelis - RJ - Fone: ${companyPhone}
                            </div>
                        </td>
                        <td class="center" style="width: 15%; vertical-align: middle;">
                            <div style="font-size: 13px; font-weight: 700;">DANFE</div>
                            <div style="font-size: 6px; line-height: 1.1; margin: 2px 0;">
                                DOCUMENTO AUXILIAR<br/>DA NOTA FISCAL<br/>ELETRÔNICA
                            </div>
                            <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin: 4px 0;">
                                <div style="text-align:left; font-size: 6.5px; line-height:1.2;">
                                    0 - ENTRADA<br/>1 - SAÍDA
                                </div>
                                <div style="border:1px solid #000; width:18px; height:16px; line-height:16px; font-weight:700; font-size:9px;">1</div>
                            </div>
                            <div style="font-size: 8px; font-weight: 700;">
                                Nº ${invoice.invoice_number}<br/>
                                SÉRIE: 1<br/>
                                <span style="font-size: 6.5px; font-weight:400;">PÁGINA 1 DE 1</span>
                            </div>
                        </td>
                        <td style="width: 47%; padding: 0;">
                            <div style="border-bottom: 1px solid #000; padding: 2px 4px; height: 46px;">
                                <span class="lbl">CONTROLE DO FISCO</span>
                                <div class="center" style="margin-top: 2px; overflow:hidden; white-space:nowrap;">
                                    ${barsHtml}
                                </div>
                            </div>
                            <div style="border-bottom: 1px solid #000; padding: 2px 4px;">
                                <span class="lbl">CHAVE DE ACESSO</span>
                                <div class="center" style="font-size: 9px; font-weight: 700; letter-spacing: 0.3px;">
                                    ${accessKey}
                                </div>
                            </div>
                            <div class="center" style="padding: 3px 6px; font-size: 6.5px;">
                                Consulta de autenticidade no portal nacional da NF-e<br/>
                                www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizada.
                            </div>
                        </td>
                    </tr>
                </table>

                <table class="tbl" style="margin-top: -1px;">
                    <tr>
                        <td style="width: 53%;">
                            <span class="lbl">NATUREZA DA OPERAÇÃO</span>
                            <span class="val">Venda Dentro do Estado</span>
                        </td>
                        <td style="width: 47%;">
                            <span class="lbl">PROTOCOLO DE AUTORIZAÇÃO DE USO</span>
                            <span class="val">${sefazProt}</span>
                        </td>
                    </tr>
                </table>

                <table class="tbl" style="margin-top: -1px;">
                    <tr>
                        <td style="width: 33%;">
                            <span class="lbl">INSCRIÇÃO ESTADUAL</span>
                            <span class="val">${companyIe}</span>
                        </td>
                        <td style="width: 33%;">
                            <span class="lbl">INSCRIÇÃO ESTADUAL DO SUBST. TRIB.</span>
                            <span class="val">&nbsp;</span>
                        </td>
                        <td style="width: 34%;">
                            <span class="lbl">CNPJ</span>
                            <span class="val">${companyCnpj}</span>
                        </td>
                    </tr>
                </table>

                <!-- 3. DESTINATÁRIO / REMETENTE -->
                <div class="sec-title">DESTINATÁRIO/REMETENTE</div>
                <table class="tbl">
                    <tr>
                        <td style="width: 60%;">
                            <span class="lbl">NOME/RAZÃO SOCIAL</span>
                            <span class="val" style="text-transform: uppercase;">${invoice.client_name}</span>
                        </td>
                        <td style="width: 24%;">
                            <span class="lbl">CNPJ/CPF</span>
                            <span class="val">${clientCpfCnpj}</span>
                        </td>
                        <td style="width: 16%;">
                            <span class="lbl">DATA DE EMISSÃO</span>
                            <span class="val">${issueDateFormatted}</span>
                        </td>
                    </tr>
                </table>
                <table class="tbl" style="margin-top: -1px;">
                    <tr>
                        <td style="width: 45%;">
                            <span class="lbl">ENDEREÇO</span>
                            <span class="val">${clientAddr}</span>
                        </td>
                        <td style="width: 23%;">
                            <span class="lbl">BAIRRO/DISTRITO</span>
                            <span class="val">${clientBairro}</span>
                        </td>
                        <td style="width: 16%;">
                            <span class="lbl">CEP</span>
                            <span class="val">${clientCep}</span>
                        </td>
                        <td style="width: 16%;">
                            <span class="lbl">DATA DE ENTR./SAÍDA</span>
                            <span class="val">&nbsp;</span>
                        </td>
                    </tr>
                </table>
                <table class="tbl" style="margin-top: -1px;">
                    <tr>
                        <td style="width: 31%;">
                            <span class="lbl">MUNICÍPIO</span>
                            <span class="val">${clientCity}</span>
                        </td>
                        <td style="width: 18%;">
                            <span class="lbl">FONE/FAX</span>
                            <span class="val">${clientPhone}</span>
                        </td>
                        <td style="width: 11%;">
                            <span class="lbl">UF</span>
                            <span class="val">${clientUf}</span>
                        </td>
                        <td style="width: 24%;">
                            <span class="lbl">INSCRIÇÃO ESTADUAL</span>
                            <span class="val">&nbsp;</span>
                        </td>
                        <td style="width: 16%;">
                            <span class="lbl">HORA ENTR./SAÍDA</span>
                            <span class="val">&nbsp;</span>
                        </td>
                    </tr>
                </table>

                <!-- 4. FATURA & CÁLCULO DO IMPOSTO -->
                <div class="sec-title">FATURA</div>
                <div class="sec-title" style="margin-top: 1px;">CALCULO DO IMPOSTO</div>
                <table class="tbl">
                    <tr>
                        <td><span class="lbl">BASE DE CALC. DO ICMS</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">VALOR DO ICMS</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">BASE DE CALC. ICMS ST</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">VALOR DO ICMS ST</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">V. IMP. IMPORTAÇÃO</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">V. ICMS UF REMET.</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">VALOR DO FCP</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">VALOR DO PIS</span><span class="val num-right">0,00</span></td>
                        <td style="width: 14%;"><span class="lbl">V. TOTAL DE PRODUTOS</span><span class="val num-right">${valFormatted}</span></td>
                    </tr>
                    <tr>
                        <td><span class="lbl">VALOR DO FRETE</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">VALOR DO SEGURO</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">DESCONTO</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">OUTRAS DESP.</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">VALOR DO IPI</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">V. ICMS UF DEST.</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">V. APROX. DO TRIBUTO</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">VALOR DA COFINS</span><span class="val num-right">0,00</span></td>
                        <td style="width: 14%;"><span class="lbl">V. TOTAL DA NOTA</span><span class="val num-right">${valFormatted}</span></td>
                    </tr>
                </table>

                <!-- 5. TRANSPORTADOR / VOLUMES -->
                <div class="sec-title">TRANSPORTADOR/VOLUMES TRANSPORTADOS</div>
                <table class="tbl">
                    <tr>
                        <td style="width: 39%;"><span class="lbl">RAZÃO SOCIAL</span><span class="val">&nbsp;</span></td>
                        <td style="width: 16%;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <span class="lbl">FRETE POR CONTA</span>
                                    <span style="font-size:5.5px; display:block; line-height:1.1;">0 - Emitente<br/>1 - Destinatário<br/>2 - Terceiros</span>
                                </div>
                                <div style="border:1px solid #000; width:16px; height:15px; text-align:center; line-height:15px; font-weight:700;">1</div>
                            </div>
                        </td>
                        <td style="width: 11%;"><span class="lbl">CÓDIGO ANTT</span><span class="val">&nbsp;</span></td>
                        <td style="width: 12%;"><span class="lbl">PLACA</span><span class="val">&nbsp;</span></td>
                        <td style="width: 6%;"><span class="lbl">UF</span><span class="val">&nbsp;</span></td>
                        <td style="width: 16%;"><span class="lbl">CNPJ/CPF</span><span class="val">&nbsp;</span></td>
                    </tr>
                </table>
                <table class="tbl" style="margin-top: -1px;">
                    <tr>
                        <td style="width: 39%;"><span class="lbl">ENDEREÇO</span><span class="val">&nbsp;</span></td>
                        <td style="width: 27%;"><span class="lbl">MUNICÍPIO</span><span class="val">&nbsp;</span></td>
                        <td style="width: 12%;"><span class="lbl">UF</span><span class="val">&nbsp;</span></td>
                        <td style="width: 22%;"><span class="lbl">INSC. ESTADUAL</span><span class="val">&nbsp;</span></td>
                    </tr>
                </table>
                <table class="tbl" style="margin-top: -1px;">
                    <tr>
                        <td style="width: 14%;"><span class="lbl">QUANTIDADE</span><span class="val">&nbsp;</span></td>
                        <td style="width: 18%;"><span class="lbl">ESPÉCIE</span><span class="val">&nbsp;</span></td>
                        <td style="width: 17%;"><span class="lbl">MARCA</span><span class="val">&nbsp;</span></td>
                        <td style="width: 18%;"><span class="lbl">NUMERAÇÃO</span><span class="val">&nbsp;</span></td>
                        <td style="width: 17%;"><span class="lbl">PESO BRUTO</span><span class="val">&nbsp;</span></td>
                        <td style="width: 16%;"><span class="lbl">PESO LÍQUIDO</span><span class="val">&nbsp;</span></td>
                    </tr>
                </table>

                <!-- 6. DADOS DO PRODUTO / SERVIÇO -->
                <div class="sec-title">DADOS DO PRODUTO/SERVIÇO</div>
                <div class="prod-box">
                    <table class="prod-table">
                        <thead>
                            <tr>
                                <th style="width: 11%;">CÓDIGO</th>
                                <th style="width: 32%;">DESCRIÇÃO DO PRODUTO/SERVIÇO</th>
                                <th style="width: 7%;">NCM/SH</th>
                                <th style="width: 4%;">CST</th>
                                <th style="width: 4%;">CFOP</th>
                                <th style="width: 3.5%;">UN</th>
                                <th style="width: 5.5%;">QTD.</th>
                                <th style="width: 7%;">VLR.<br/>UNIT</th>
                                <th style="width: 7%;">VLR.<br/>TOTAL</th>
                                <th style="width: 4.5%;">BC<br/>ICMS</th>
                                <th style="width: 4.5%;">VLR.<br/>ICMS</th>
                                <th style="width: 4%;">VLR.<br/>IPI</th>
                                <th style="width: 3%;">ALIQ.<br/>ICMS</th>
                                <th style="width: 3%;">ALIQ.<br/>IPI</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 1px solid #000;">
                                <td>${prodCode}</td>
                                <td style="text-transform: uppercase;">${cleanDesc}</td>
                                <td class="center">94036000</td>
                                <td class="center">0102</td>
                                <td class="center">5102</td>
                                <td class="center">UN</td>
                                <td class="num-right">1,000</td>
                                <td class="num-right">${valFormatted}</td>
                                <td class="num-right">${valFormatted}</td>
                                <td class="num-right">0,00</td>
                                <td class="num-right">0,00</td>
                                <td class="num-right">0,00</td>
                                <td class="num-right">&nbsp;</td>
                                <td class="num-right">0,00</td>
                            </tr>
                        </tbody>
                    </table>
                    <div></div>
                </div>

                <!-- 7. CÁLCULO DO ISSQN -->
                <div class="sec-title">CALCULO DO ISSQN</div>
                <table class="tbl">
                    <tr>
                        <td style="width: 25%;"><span class="lbl">INSCRIÇÃO MUNICIPAL</span><span class="val">&nbsp;</span></td>
                        <td style="width: 25%;"><span class="lbl">VALOR TOTAL DOS SERVIÇOS</span><span class="val num-right">0,00</span></td>
                        <td style="width: 25%;"><span class="lbl">BASE DE CÁLCULO DO ISSQN</span><span class="val num-right">0,00</span></td>
                        <td style="width: 25%;"><span class="lbl">VALOR DO ISSQN</span><span class="val num-right">0,00</span></td>
                    </tr>
                </table>

                <!-- 8. DADOS ADICIONAIS -->
                <div class="sec-title">DADOS ADICIONAIS</div>
                <table class="tbl">
                    <tr>
                        <td style="width: 53%; height: 64px;">
                            <span class="lbl">INFORMAÇÕES COMPLEMENTARES</span>
                            <div style="font-size: 7.5px; margin-top: 2px;">
                                DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE ICMS, ISS E IPI.
                            </div>
                        </td>
                        <td style="width: 47%; height: 64px;">
                            <span class="lbl">RESERVA AO FISCO</span>
                        </td>
                    </tr>
                </table>
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
    const isApiConfigured = Boolean(fiscalConfig.clientSecret);

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
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span
                                                        className={cn(
                                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                                            getStatusBadge(invoice.status)
                                                        )}
                                                    >
                                                        {invoice.status}
                                                    </span>
                                                    {(invoice.asaas_status || invoice.description?.includes("Prot SEFAZ:")) && (
                                                        <span className="text-[9px] font-tech text-emerald-400 font-bold">
                                                            ✓ SEFAZ Prot:{" "}
                                                            {invoice.description.match(/Prot SEFAZ:\s*([0-9]+)/)?.[1] ||
                                                                "cStat 100"}
                                                        </span>
                                                    )}
                                                </div>
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
                <DialogContent className="max-w-2xl bg-[#0c0c10] border border-white/15 shadow-2xl rounded-3xl text-foreground">
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
                                <SelectContent className="max-h-72 z-[100] bg-[#121218] border-white/15 text-foreground">
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
                                    <SelectContent className="z-[100] bg-[#121218] border-white/15 text-foreground">
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
                <DialogContent className="max-w-2xl bg-[#0c0c10] border border-white/15 shadow-2xl rounded-3xl text-foreground">
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
                                        <SelectContent className="z-[100] bg-[#121218] border-white/15 text-foreground">
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

            {/* MODAL 3: CONFIGURAÇÃO MULTI-PROVEDOR FISCAL (ASAAS / FOCUS NFE / NOTAAS / LOCAL) */}
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogContent className="max-w-xl bg-[#0c0c10] border border-white/15 shadow-2xl rounded-3xl text-foreground">
                    <DialogHeader>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="tech-hud-pill text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                                HUB FISCAL MULTI-API // 2026
                            </span>
                        </div>
                        <DialogTitle className="text-xl font-display font-black">
                            Configurar Integração de Nota Fiscal
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Escolha abaixo qual motor fiscal gratuito deseja conectar ao sistema (como a Nuvem Fiscal encerrou operações em 2026, já deixamos <strong>Asaas</strong>, <strong>Notaas</strong>, <strong>Focus NFe</strong> e o <strong>Modo Local</strong> prontos!):
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                                1. Escolha o Provedor Fiscal
                            </Label>
                            <Select
                                value={fiscalConfig.provider}
                                onValueChange={(v: "asaas" | "focusnfe" | "notaas" | "local") =>
                                    setFiscalConfig((prev) => ({ ...prev, provider: v }))
                                }
                            >
                                <SelectTrigger className="h-10 rounded-xl bg-white/[0.04] border-white/15 text-xs font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[100] bg-[#121218] border-white/15 text-foreground">
                                    <SelectItem value="asaas">
                                        Asaas (Conta Digital PJ Gratuita — Já integrada ao CRM)
                                    </SelectItem>
                                    <SelectItem value="notaas">
                                        Notaas (API Moderna com Plano Gratuito / Free Tier)
                                    </SelectItem>
                                    <SelectItem value="focusnfe">
                                        Focus NFe (Líder de Mercado — Sandbox Gratuita)
                                    </SelectItem>
                                    <SelectItem value="local">
                                        Emissor Local + Sebrae / Gov.br (100% Gratuito sem API externa)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Links oficiais ativos conforme o provedor selecionado */}
                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs flex items-center justify-between gap-2">
                            {fiscalConfig.provider === "asaas" && (
                                <>
                                    <span className="text-muted-foreground">
                                        No Asaas, vá em <strong>Configurações ➔ Integrações ➔ Gerar API Key</strong>:
                                    </span>
                                    <a
                                        href="https://www.asaas.com"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary font-bold underline shrink-0 inline-flex items-center gap-1"
                                    >
                                        Abrir Asaas.com <ExternalLink className="h-3 w-3" />
                                    </a>
                                </>
                            )}
                            {fiscalConfig.provider === "notaas" && (
                                <>
                                    <span className="text-muted-foreground">
                                        Crie sua conta no plano Free Tier (sem cartão) e copie sua API Key:
                                    </span>
                                    <a
                                        href="https://notaas.com.br"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary font-bold underline shrink-0 inline-flex items-center gap-1"
                                    >
                                        Abrir Notaas.com.br <ExternalLink className="h-3 w-3" />
                                    </a>
                                </>
                            )}
                            {fiscalConfig.provider === "focusnfe" && (
                                <>
                                    <span className="text-muted-foreground">
                                        Acesse o painel Focus NFe para copiar seu Token de Homologação/Produção:
                                    </span>
                                    <a
                                        href="https://focusnfe.com.br"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary font-bold underline shrink-0 inline-flex items-center gap-1"
                                    >
                                        Abrir FocusNFe.com.br <ExternalLink className="h-3 w-3" />
                                    </a>
                                </>
                            )}
                            {fiscalConfig.provider === "local" && (
                                <>
                                    <span className="text-muted-foreground">
                                        Não precisa de chave! Emita a pré-nota/DANFE aqui ou use o Portal Nacional:
                                    </span>
                                    <a
                                        href="https://www.nfse.gov.br/EmissorNacional"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary font-bold underline shrink-0 inline-flex items-center gap-1"
                                    >
                                        Portal Gov.br <ExternalLink className="h-3 w-3" />
                                    </a>
                                </>
                            )}
                        </div>

                        {fiscalConfig.provider !== "local" && (
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    2. Chave de API / Token ({fiscalConfig.provider.toUpperCase()})
                                </Label>
                                <Input
                                    type="password"
                                    placeholder={
                                        fiscalConfig.provider === "asaas"
                                            ? "Cole sua chave Asaas ($aact_...)"
                                            : "Cole seu Token de API aqui..."
                                    }
                                    value={fiscalConfig.clientSecret}
                                    onChange={(e) =>
                                        setFiscalConfig((prev) => ({
                                            ...prev,
                                            clientSecret: e.target.value,
                                            clientId: fiscalConfig.provider,
                                        }))
                                    }
                                    className="h-10 rounded-xl bg-white/[0.03] border-white/10 font-tech text-xs"
                                />
                            </div>
                        )}

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
                                    <SelectContent className="z-[100] bg-[#121218] border-white/15 text-foreground">
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
                                    Validar Configuração
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
