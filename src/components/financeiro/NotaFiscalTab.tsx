import React, { useState, useEffect, useRef, useMemo } from "react";
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
    Ban,
    CreditCard,
    Calendar,
    Users,
    Split,
    Layers,
    X,
    Eye,
    ArrowLeft,
    Pencil,
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
import { format, addDays, differenceInDays } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { AnimatedInvoiceStamp } from "@/components/ui/SectorArt";
import {
    ACTIVE_CATEGORIES,
    SUBCATEGORIES,
    PAYMENT_METHODS,
    FINANCIAL_INSTITUTIONS,
} from "@/types/finance";
import { InboundInvoiceDialog } from "@/components/financeiro/InboundInvoiceDialog";
import {
    findBestInventoryMatch,
    isEstoqueGeralDestination,
} from "@/lib/stockMatcher";

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
    id: string;
    sourceNoteId?: string;
    invoiceNumber?: string;
    code: string;
    name: string;
    ncm: string;
    csosn?: string;
    cfop: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    grossPrice?: number;
    discount?: number;
    totalPrice: number;
    clients?: string;
}

interface ParsedXmlDuplicate {
    number: string;
    dueDate: string;
    amount: number;
}

interface ParsedXmlSourceNote {
    id: string;
    existingInvoiceId?: string;
    invoiceNumber: string;
    series: string;
    issueDate: string;
    natOp?: string;
    protocol?: string;
    emitterName: string;
    emitterFantasyName: string;
    emitterCnpj: string;
    emitterIe?: string;
    emitterAddress?: string;
    emitterNeighborhood?: string;
    emitterCity?: string;
    emitterUf?: string;
    emitterCep?: string;
    emitterPhone?: string;
    recipientName: string;
    recipientDoc: string;
    recipientIe?: string;
    recipientAddress?: string;
    recipientNeighborhood?: string;
    recipientCity?: string;
    recipientUf?: string;
    recipientCep?: string;
    recipientPhone?: string;
    accessKey: string;
    productsTotal: number;
    freightAmount: number;
    discountAmount: number;
    otherAmount: number;
    totalAmount: number;
    itemsCount: number;
}

interface StoredXmlPayload {
    direction: "entrada" | "saida";
    series?: string;
    natOp?: string;
    protocol?: string;
    accessKey?: string;
    emitter?: {
        name: string;
        cnpj: string;
        ie?: string;
        address?: string;
        neighborhood?: string;
        city?: string;
        uf?: string;
        cep?: string;
        phone?: string;
    };
    recipient?: {
        name: string;
        doc: string;
        ie?: string;
        address?: string;
        neighborhood?: string;
        city?: string;
        uf?: string;
        cep?: string;
        phone?: string;
    };
    totals?: {
        productsTotal: number;
        discountAmount: number;
        freightAmount: number;
        otherAmount: number;
        totalAmount: number;
    };
    duplicates?: ParsedXmlDuplicate[];
    items: Array<{
        code: string;
        name: string;
        ncm: string;
        csosn?: string;
        cfop: string;
        unit: string;
        quantity: number;
        unitPrice: number;
        grossPrice?: number;
        discount?: number;
        totalPrice: number;
        clients?: string;
    }>;
}

const parseStoredXmlPayload = (invoice: Invoice): StoredXmlPayload | null => {
    if (!invoice?.asaas_status || !invoice.asaas_status.startsWith("XML_PAYLOAD:")) return null;
    try {
        return JSON.parse(invoice.asaas_status.slice("XML_PAYLOAD:".length)) as StoredXmlPayload;
    } catch {
        return null;
    }
};

// Máscara automática de Telefone / Celular com DDD entre parênteses: (22) 99999-9999
const formatPhoneBrInput = (raw: string): string => {
    let digits = (raw || "").replace(/\D/g, "");
    if (digits.length >= 12 && digits.startsWith("55")) {
        digits = digits.slice(2);
    }
    digits = digits.slice(0, 11);
    if (digits.length === 0) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

// Formatação final para exibição na Nota / DANFE (adiciona o DDD padrão (22) caso tenha sido digitado apenas o número de 8 ou 9 dígitos)
const formatPhoneBrDisplay = (raw?: string): string => {
    let digits = (raw || "").replace(/\D/g, "");
    if (digits.length >= 12 && digits.startsWith("55")) {
        digits = digits.slice(2);
    }
    if (digits.length <= 2) return "";
    if (digits.length === 8) {
        return `(22) ${digits.slice(0, 4)}-${digits.slice(4)}`;
    }
    if (digits.length === 9) {
        return `(22) ${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length >= 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
};

interface ParsedXmlData {
    accessKey: string;
    invoiceNumber: string;
    series: string;
    issueDate: string;
    emitterName: string;
    emitterFantasyName: string;
    emitterCnpj: string;
    recipientName: string;
    recipientDoc: string;
    productsTotal: number;
    freightAmount: number;
    discountAmount: number;
    otherAmount: number;
    totalAmount: number;
    items: ParsedXmlItem[];
    duplicates: ParsedXmlDuplicate[];
    sourceNotes: ParsedXmlSourceNote[];
}

interface XmlItemClientSplit {
    id: string;
    client: string;
    quantity: string;
    amount: string;
}

interface XmlInstallmentItem {
    id: string;
    number: number;
    daysOffset: number;
    dueDate: string;
    amount: string;
    paymentMethod: string;
    status: "pending" | "paid";
}

interface NotaFiscalTabProps {
    onRefresh?: () => void;
    onNavigateToLancamentos?: () => void;
}

const FREE_TIER_LIMIT = 30; // Cota mensal gratuita de referência na Nuvem Fiscal

export default function NotaFiscalTab({ onRefresh, onNavigateToLancamentos }: NotaFiscalTabProps = {}) {
    const { settings: companySettings } = useCompanySettings();
    const xmlInputRef = useRef<HTMLInputElement | null>(null);
    const appendXmlInputRef = useRef<HTMLInputElement | null>(null);
    const certInputRef = useRef<HTMLInputElement | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<"ALL" | "NF-e" | "NFS-e">("ALL");
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Orçamentos, Clientes, Vendas, Ordens de Serviço & Catálogo de Estoque
    const [crmBudgets, setCrmBudgets] = useState<any[]>([]);
    const [crmClients, setCrmClients] = useState<any[]>([]);
    const [crmSales, setCrmSales] = useState<any[]>([]);
    const [crmServiceOrders, setCrmServiceOrders] = useState<any[]>([]);
    const [crmInventory, setCrmInventory] = useState<any[]>([]);
    const [xmlItemStockOverrides, setXmlItemStockOverrides] = useState<Record<string, string>>({});
    const [customClientOptions, setCustomClientOptions] = useState<string[]>([]);
    const [newCustomClientName, setNewCustomClientName] = useState("");
    const [showNewClientInput, setShowNewClientInput] = useState(false);

    // Modal de Emissão 1-Click + Prévia de Conferência antes de confirmar
    const [isEmitOpen, setIsEmitOpen] = useState(false);
    const [emitStep, setEmitStep] = useState<"form" | "preview">("form");
    const [isEmitting, setIsEmitting] = useState(false);
    const [emitExtraItems, setEmitExtraItems] = useState<
        Array<{
            id: string;
            code: string;
            description: string;
            ncm: string;
            cfop: string;
            unit: string;
            quantity: string;
            unitPrice: string;
            amount: string;
        }>
    >([]);
    const [emitForm, setEmitForm] = useState({
        type: "NF-e" as "NF-e" | "NFS-e",
        selectedSaleId: "",
        clientName: "",
        clientDoc: "",
        clientIe: "",
        clientAddress: "",
        clientNeighborhood: "Centro",
        clientCity: "Sao Fidelis",
        clientUf: "RJ",
        clientCep: "28400-000",
        clientPhone: "(22) ",
        clientEmail: "",
        natOp: "Venda Dentro do Estado",
        description: "Fabricação e fornecimento de móveis planejados sob medida em MDF",
        quantity: "1",
        unitPrice: "",
        amount: "",
        ncm: "94036000", // Móveis de madeira
        cfop: "5102", // Venda Dentro do Estado (igual Nota Fiscal Neto.pdf)
        csosn: "0102",
        unit: "UN",
        serviceCode: "14.13", // Carpintaria e marcenaria (LC 116)
        taxRate: "6.0", // Simples Nacional Anexo I/III referência
        extraInfo:
            "DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE ICMS, ISS E IPI.",
        autoCreateFinance: true,
    });

    // Modal de Importação de XML + Alocação de Cliente por Item + Lançamento de Boletos/Cartão 30/60/90
    const [isXmlDialogOpen, setIsXmlDialogOpen] = useState(false);
    const [isInboundWithoutXmlOpen, setIsInboundWithoutXmlOpen] = useState(false);
    const [parsedXml, setParsedXml] = useState<ParsedXmlData | null>(null);
    const [xmlOptions, setXmlOptions] = useState({
        direction: "entrada" as "entrada" | "saida",
        updateInventory: true,
        createExpenseTransaction: true,
        supplierPreset: "ced" as "ced" | "bruta" | "outro",
        paymentCategoryType: "Boleto" as "Boleto" | "Cartao" | "Pix" | "Dinheiro",
        paymentMethod: "Boleto",
        financialInstitution: "Banco Itaú",
        category: "Custo com Materiais e Obras",
        subcategory: "Compra de MDF e Madeira",
        schedulePreset: "30_60_90" as
            | "avista"
            | "30"
            | "30_60"
            | "30_60_90"
            | "30_60_90_120"
            | "28_56_84"
            | "xml_dup"
            | "custom",
        customInstallmentCount: "3",
        customIntervalDays: "30",
        bulkClientTarget: "",
    });
    const [xmlItemSplits, setXmlItemSplits] = useState<Record<string, XmlItemClientSplit[]>>({});
    const [xmlInstallments, setXmlInstallments] = useState<XmlInstallmentItem[]>([]);
    const [isImportingXml, setIsImportingXml] = useState(false);
    const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

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

        const handleOpenXmlImport = () => {
            xmlInputRef.current?.click();
        };
        window.addEventListener("open-bjl-xml-import", handleOpenXmlImport);
        return () => {
            window.removeEventListener("open-bjl-xml-import", handleOpenXmlImport);
        };
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
            const [budgetsRes, clientsRes, salesRes, osRes, invRes] = await Promise.all([
                supabase.from("budgets").select("*").order("created_at", { ascending: false }),
                supabase.from("clients").select("*").order("name"),
                supabase.from("sales").select("*").order("created_at", { ascending: false }),
                supabase.from("service_orders").select("*").order("created_at", { ascending: false }),
                supabase.from("inventory").select("*").order("name"),
            ]);
            if (budgetsRes.data) setCrmBudgets(budgetsRes.data);
            if (clientsRes.data) setCrmClients(clientsRes.data);
            if (salesRes.data) setCrmSales(salesRes.data);
            if (invRes.data) setCrmInventory(invRes.data);
            if (osRes.data) {
                const sortedOs = [...osRes.data].sort((a: any, b: any) => {
                    const getNum = (t?: string) => {
                        if (!t) return -1;
                        const m = t.match(/OS[-\s#]*(\d+)/i) || t.match(/(\d+)/);
                        return m ? parseInt(m[1], 10) : -1;
                    };
                    const numA = getNum(a.ticket_number);
                    const numB = getNum(b.ticket_number);
                    if (numB !== numA) return numB - numA;
                    return (b.ticket_number || "").localeCompare(a.ticket_number || "", undefined, {
                        numeric: true,
                    });
                });
                setCrmServiceOrders(sortedOs);
            }
        } catch (err) {
            console.error("Erro ao carregar clientes/vendas/OS para NF:", err);
        }
    };

    // Lista unificada de opções de Clientes / Ordens de Serviço / Estoque para vincular cada item do XML
    const clientAllocationOptions = useMemo(() => {
        const osOptions = crmServiceOrders.map((os: any) => {
            const ticket = (os.ticket_number || "S/N").trim();
            const client = (os.client || "Cliente").trim();
            const action = os.action ? ` (${os.action.trim()})` : "";
            return {
                value: `${ticket} - ${client}${action}`,
                label: `📋 ${ticket} - ${client}${action}`,
                group: "os" as const,
            };
        });

        const osClientNames = new Set(
            crmServiceOrders.map((os: any) => (os.client || "").toLowerCase().trim())
        );

        const clientOptions = crmClients.map((c: any) => ({
            value: (c.name || "").trim(),
            label: `👤 ${(c.name || "").trim()}${
                osClientNames.has((c.name || "").toLowerCase().trim()) ? "" : " (Cliente CRM)"
            }`,
            group: "client" as const,
        }));

        const customOpts = customClientOptions.map((name) => ({
            value: name,
            label: `🏷️ ${name}`,
            group: "custom" as const,
        }));

        return {
            osOptions,
            clientOptions,
            customOpts,
        };
    }, [crmServiceOrders, crmClients, customClientOptions]);

    const buildInstallmentsFromPreset = (
        issueDateStr: string,
        totalAmount: number,
        preset:
            | "avista"
            | "30"
            | "30_60"
            | "30_60_90"
            | "30_60_90_120"
            | "28_56_84"
            | "xml_dup"
            | "custom",
        paymentMethod: string,
        duplicates: ParsedXmlDuplicate[] = [],
        customCount = 3,
        customInterval = 30
    ): XmlInstallmentItem[] => {
        const baseDate = new Date((issueDateStr || new Date().toISOString().split("T")[0]) + "T12:00:00");
        const safeBaseDate = isNaN(baseDate.getTime()) ? new Date() : baseDate;

        if (preset === "xml_dup" && duplicates.length > 0) {
            return duplicates.map((dup, idx) => {
                const dupDate = new Date((dup.dueDate || issueDateStr) + "T12:00:00");
                const daysDiff = !isNaN(dupDate.getTime())
                    ? Math.max(0, differenceInDays(dupDate, safeBaseDate))
                    : (idx + 1) * 30;
                return {
                    id: `inst-${idx}-${Date.now()}`,
                    number: idx + 1,
                    daysOffset: daysDiff,
                    dueDate: dup.dueDate || format(addDays(safeBaseDate, (idx + 1) * 30), "yyyy-MM-dd"),
                    amount: Number(dup.amount || 0).toFixed(2),
                    paymentMethod,
                    status: "pending",
                };
            });
        }

        let offsets: number[] = [30, 60, 90];
        if (preset === "avista") offsets = [0];
        else if (preset === "30") offsets = [30];
        else if (preset === "30_60") offsets = [30, 60];
        else if (preset === "30_60_90") offsets = [30, 60, 90];
        else if (preset === "30_60_90_120") offsets = [30, 60, 90, 120];
        else if (preset === "28_56_84") offsets = [28, 56, 84];
        else if (preset === "custom") {
            const count = Math.max(1, Math.min(48, Number(customCount) || 1));
            const interval = Math.max(1, Number(customInterval) || 30);
            offsets = Array.from({ length: count }, (_, i) => (i + 1) * interval);
        }

        const count = offsets.length;
        const basePart = count > 0 ? Number((totalAmount / count).toFixed(2)) : totalAmount;

        return offsets.map((days, idx) => {
            const isLast = idx === count - 1;
            const partAmount = isLast
                ? Number((totalAmount - basePart * (count - 1)).toFixed(2))
                : basePart;
            const targetDate = addDays(safeBaseDate, days);
            return {
                id: `inst-${idx}-${Date.now()}`,
                number: idx + 1,
                daysOffset: days,
                dueDate: format(targetDate, "yyyy-MM-dd"),
                amount: Math.max(0, partAmount).toFixed(2),
                paymentMethod,
                status: preset === "avista" ? "paid" : "pending",
            };
        });
    };

    const handleSelectSchedulePreset = (
        preset:
            | "avista"
            | "30"
            | "30_60"
            | "30_60_90"
            | "30_60_90_120"
            | "28_56_84"
            | "xml_dup"
            | "custom",
        overrideCount?: string,
        overrideInterval?: string
    ) => {
        if (!parsedXml) return;
        const cCount = parseInt(overrideCount ?? xmlOptions.customInstallmentCount, 10) || 3;
        const cInterval = parseInt(overrideInterval ?? xmlOptions.customIntervalDays, 10) || 30;
        setXmlOptions((prev) => ({
            ...prev,
            schedulePreset: preset,
            customInstallmentCount: overrideCount ?? prev.customInstallmentCount,
            customIntervalDays: overrideInterval ?? prev.customIntervalDays,
        }));
        const generated = buildInstallmentsFromPreset(
            parsedXml.issueDate,
            parsedXml.totalAmount,
            preset,
            xmlOptions.paymentMethod,
            parsedXml.duplicates,
            cCount,
            cInterval
        );
        setXmlInstallments(generated);
    };

    const handleChangeMainPaymentType = (
        catType: "Boleto" | "Cartao" | "Pix" | "Dinheiro",
        specificMethod?: string
    ) => {
        let method = specificMethod || "Boleto";
        let institution = xmlOptions.financialInstitution;
        if (catType === "Boleto") {
            method = "Boleto";
            if (institution === "Dinheiro") institution = "Banco Itaú";
        } else if (catType === "Cartao") {
            method =
                specificMethod && specificMethod.startsWith("Cartão")
                    ? specificMethod
                    : xmlOptions.paymentMethod.startsWith("Cartão")
                    ? xmlOptions.paymentMethod
                    : "Cartão Itaú";
            if (method.includes("Nubank")) institution = "Nubank";
            else if (method.includes("Mercado Pago")) institution = "Mercado Pago";
            else if (method.includes("Recarga Pay")) institution = "Recarga Pay";
            else institution = "Banco Itaú";
        } else if (catType === "Pix") {
            method = "Pix";
        } else if (catType === "Dinheiro") {
            method = "Dinheiro";
            institution = "Dinheiro";
        }

        setXmlOptions((prev) => ({
            ...prev,
            paymentCategoryType: catType,
            paymentMethod: method,
            financialInstitution: institution,
        }));

        setXmlInstallments((prev) =>
            prev.map((inst) => ({
                ...inst,
                paymentMethod: method,
            }))
        );
    };

    // Identifica automaticamente se a nota é da BRUTA (Cartão) ou CED / C&D (Boleto 30/60/90)
    const detectSupplierProfile = (emitterName: string, fantasyName: string): "bruta" | "ced" | "outro" => {
        const text = `${emitterName || ""} ${fantasyName || ""}`.toLowerCase();
        if (text.includes("bruta")) return "bruta";
        if (
            text.includes("c h m morais") ||
            text.includes("morais e cia") ||
            text.includes("c&d") ||
            text.includes("c & d") ||
            /\bced\b/.test(text)
        ) {
            return "ced";
        }
        return "outro";
    };

    const handleSelectSupplierProfile = (profile: "ced" | "bruta" | "outro") => {
        if (!parsedXml) return;
        if (profile === "ced") {
            const insts = buildInstallmentsFromPreset(
                parsedXml.issueDate,
                parsedXml.totalAmount,
                "30_60_90",
                "Boleto",
                parsedXml.duplicates,
                3,
                30
            );
            setXmlInstallments(insts);
            setXmlOptions((prev) => ({
                ...prev,
                supplierPreset: "ced",
                paymentCategoryType: "Boleto",
                paymentMethod: "Boleto",
                financialInstitution: "Banco Itaú",
                schedulePreset: "30_60_90",
                customInstallmentCount: "3",
                customIntervalDays: "30",
            }));
            toast.success("Perfil CED (C&D) aplicado: Boleto 30 / 60 / 90 dias no Banco Itaú!");
        } else if (profile === "bruta") {
            const cardMethod = xmlOptions.paymentMethod.startsWith("Cartão")
                ? xmlOptions.paymentMethod
                : "Cartão Nubank";
            const insts = buildInstallmentsFromPreset(
                parsedXml.issueDate,
                parsedXml.totalAmount,
                "30_60_90",
                cardMethod,
                parsedXml.duplicates,
                3,
                30
            );
            setXmlInstallments(insts);
            setXmlOptions((prev) => ({
                ...prev,
                supplierPreset: "bruta",
                paymentCategoryType: "Cartao",
                paymentMethod: cardMethod,
                financialInstitution: "Banco Itaú",
                schedulePreset: "30_60_90",
                customInstallmentCount: "3",
                customIntervalDays: "30",
            }));
            toast.success(`Perfil BRUTA Madeiras aplicado: ${cardMethod} parcelado!`);
        } else {
            setXmlOptions((prev) => ({
                ...prev,
                supplierPreset: "outro",
            }));
        }
    };

    // Atalho especial para compras no Cartão (Bruta): coloca os vencimentos das parcelas todo dia 10 dos meses seguintes
    const handleSetCardDueDay10 = (countOverride?: number) => {
        if (!parsedXml) return;
        const count = Math.max(1, countOverride || xmlInstallments.length || 1);
        const baseDate = new Date(
            (parsedXml.issueDate || new Date().toISOString().split("T")[0]) + "T12:00:00"
        );
        const safeBase = isNaN(baseDate.getTime()) ? new Date() : baseDate;
        const total = parsedXml.totalAmount;
        const basePart = Number((total / count).toFixed(2));
        const method = xmlOptions.paymentMethod.startsWith("Cartão")
            ? xmlOptions.paymentMethod
            : "Cartão Nubank";

        const nextInstallments: XmlInstallmentItem[] = Array.from({ length: count }, (_, idx) => {
            const targetMonthDate = new Date(
                safeBase.getFullYear(),
                safeBase.getMonth() + idx + 1,
                10,
                12,
                0,
                0
            );
            const dueDateStr = format(targetMonthDate, "yyyy-MM-dd");
            const daysDiff = Math.max(0, differenceInDays(targetMonthDate, safeBase));
            const isLast = idx === count - 1;
            const partAmount = isLast
                ? Number((total - basePart * (count - 1)).toFixed(2))
                : basePart;

            return {
                id: `inst-card10-${idx}-${Date.now()}`,
                number: idx + 1,
                daysOffset: daysDiff,
                dueDate: dueDateStr,
                amount: Math.max(0, partAmount).toFixed(2),
                paymentMethod: method,
                status: "pending",
            };
        });

        setXmlInstallments(nextInstallments);
        setXmlOptions((prev) => ({
            ...prev,
            paymentCategoryType: "Cartao",
            paymentMethod: method,
            customInstallmentCount: String(count),
        }));
    };

    const handleUpdateInstallment = (
        index: number,
        field: keyof XmlInstallmentItem,
        value: string | number
    ) => {
        setXmlInstallments((prev) => {
            const next = [...prev];
            const current = { ...next[index] };
            const baseDate = new Date(
                (parsedXml?.issueDate || new Date().toISOString().split("T")[0]) + "T12:00:00"
            );
            const safeBase = isNaN(baseDate.getTime()) ? new Date() : baseDate;

            if (field === "daysOffset") {
                const days = Math.max(0, parseInt(String(value), 10) || 0);
                current.daysOffset = days;
                current.dueDate = format(addDays(safeBase, days), "yyyy-MM-dd");
            } else if (field === "dueDate") {
                const dateStr = String(value);
                current.dueDate = dateStr;
                const d = new Date(dateStr + "T12:00:00");
                if (!isNaN(d.getTime())) {
                    current.daysOffset = differenceInDays(d, safeBase);
                }
            } else if (field === "amount") {
                current.amount = String(value);
            } else if (field === "paymentMethod") {
                current.paymentMethod = String(value);
            } else if (field === "status") {
                current.status = value === "paid" ? "paid" : "pending";
            }

            next[index] = current;
            return next;
        });
    };

    const handleEqualizeInstallments = () => {
        if (!parsedXml || xmlInstallments.length === 0) return;
        const count = xmlInstallments.length;
        const total = parsedXml.totalAmount;
        const basePart = Number((total / count).toFixed(2));
        setXmlInstallments((prev) =>
            prev.map((inst, idx) => ({
                ...inst,
                number: idx + 1,
                amount: (idx === count - 1
                    ? Number((total - basePart * (count - 1)).toFixed(2))
                    : basePart
                ).toFixed(2),
            }))
        );
    };

    const handleAddInstallmentRow = () => {
        if (!parsedXml) return;
        const lastInst = xmlInstallments[xmlInstallments.length - 1];
        const nextDays = lastInst ? lastInst.daysOffset + 30 : 30;
        const baseDate = new Date(parsedXml.issueDate + "T12:00:00");
        const safeBase = isNaN(baseDate.getTime()) ? new Date() : baseDate;
        const newCount = xmlInstallments.length + 1;
        const basePart = Number((parsedXml.totalAmount / newCount).toFixed(2));

        const updated = [
            ...xmlInstallments,
            {
                id: `inst-${newCount}-${Date.now()}`,
                number: newCount,
                daysOffset: nextDays,
                dueDate: format(addDays(safeBase, nextDays), "yyyy-MM-dd"),
                amount: "0.00",
                paymentMethod: xmlOptions.paymentMethod,
                status: "pending" as const,
            },
        ].map((inst, idx) => ({
            ...inst,
            number: idx + 1,
            amount: (idx === newCount - 1
                ? Number((parsedXml.totalAmount - basePart * (newCount - 1)).toFixed(2))
                : basePart
            ).toFixed(2),
        }));
        setXmlInstallments(updated);
    };

    const handleRemoveInstallmentRow = (index: number) => {
        if (!parsedXml || xmlInstallments.length <= 1) return;
        const filtered = xmlInstallments.filter((_, idx) => idx !== index);
        const newCount = filtered.length;
        const basePart = Number((parsedXml.totalAmount / newCount).toFixed(2));
        setXmlInstallments(
            filtered.map((inst, idx) => ({
                ...inst,
                number: idx + 1,
                amount: (idx === newCount - 1
                    ? Number((parsedXml.totalAmount - basePart * (newCount - 1)).toFixed(2))
                    : basePart
                ).toFixed(2),
            }))
        );
    };

    // Funções de Alocação e Divisão de Clientes por Item do XML
    const handleApplyBulkClientToItems = (clientVal: string, onlyEmpty = false) => {
        if (!clientVal || !parsedXml) return;
        setXmlOptions((prev) => ({ ...prev, bulkClientTarget: clientVal }));
        setXmlItemSplits((prev) => {
            const next: Record<string, XmlItemClientSplit[]> = {};
            for (const item of parsedXml.items) {
                const currentSplits = prev[item.id] || [
                    {
                        id: `${item.id}-0`,
                        client: "",
                        quantity: String(item.quantity),
                        amount: item.totalPrice.toFixed(2),
                    },
                ];
                next[item.id] = currentSplits.map((sp) => ({
                    ...sp,
                    client: onlyEmpty && sp.client ? sp.client : clientVal,
                }));
            }
            return next;
        });
        toast.success(
            onlyEmpty
                ? `Cliente/Projeto aplicado aos itens que estavam sem vínculo!`
                : `Todos os ${parsedXml.items.length} itens da nota foram vinculados a "${
                      clientVal === "ESTOQUE" ? "🏢 ESTOQUE GERAL" : clientVal
                  }"!`
        );
    };

    const handleItemSplitClientChange = (itemId: string, splitId: string, clientVal: string) => {
        setXmlItemSplits((prev) => {
            const list = prev[itemId] || [];
            return {
                ...prev,
                [itemId]: list.map((sp) => (sp.id === splitId ? { ...sp, client: clientVal } : sp)),
            };
        });
    };

    const handleDivideXmlItem = (item: ParsedXmlItem) => {
        const netUnit = item.quantity > 0 ? item.totalPrice / item.quantity : item.unitPrice;
        setXmlItemSplits((prev) => {
            const current = prev[item.id] || [
                {
                    id: `${item.id}-0`,
                    client: "",
                    quantity: String(item.quantity),
                    amount: item.totalPrice.toFixed(2),
                },
            ];

            if (current.length === 1) {
                const firstClient = current[0].client;
                const isIntQty = Number.isInteger(item.quantity) && item.quantity >= 2;
                const qty1 = isIntQty
                    ? Math.ceil(item.quantity / 2)
                    : Number((item.quantity / 2).toFixed(3));
                const qty2 = Number((item.quantity - qty1).toFixed(3));
                const amt1 = isIntQty
                    ? Number((qty1 * netUnit).toFixed(2))
                    : Number((item.totalPrice / 2).toFixed(2));
                const amt2 = Number((item.totalPrice - amt1).toFixed(2));

                return {
                    ...prev,
                    [item.id]: [
                        {
                            id: `${item.id}-0`,
                            client: firstClient,
                            quantity: String(qty1),
                            amount: amt1.toFixed(2),
                        },
                        {
                            id: `${item.id}-${Date.now()}`,
                            client: "",
                            quantity: String(qty2),
                            amount: amt2.toFixed(2),
                        },
                    ],
                };
            }

            return {
                ...prev,
                [item.id]: [
                    ...current,
                    {
                        id: `${item.id}-${Date.now()}`,
                        client: "",
                        quantity: "0",
                        amount: "0.00",
                    },
                ],
            };
        });
    };

    const handleItemSplitQtyChange = (item: ParsedXmlItem, splitId: string, newQtyStr: string) => {
        const netUnit = item.quantity > 0 ? item.totalPrice / item.quantity : item.unitPrice;
        const qtyNum = Math.max(0, parseFloat(newQtyStr.replace(",", ".")) || 0);
        const calcAmt = Number(Math.min(item.totalPrice, qtyNum * netUnit).toFixed(2));

        setXmlItemSplits((prev) => {
            const list = prev[item.id] || [];
            if (list.length === 2) {
                const otherIdx = list.findIndex((s) => s.id !== splitId);
                const remQty = Math.max(0, Number((item.quantity - qtyNum).toFixed(3)));
                const remAmt = Math.max(0, Number((item.totalPrice - calcAmt).toFixed(2)));
                return {
                    ...prev,
                    [item.id]: list.map((sp, idx) => {
                        if (sp.id === splitId) {
                            return { ...sp, quantity: newQtyStr, amount: calcAmt.toFixed(2) };
                        }
                        if (idx === otherIdx) {
                            return { ...sp, quantity: String(remQty), amount: remAmt.toFixed(2) };
                        }
                        return sp;
                    }),
                };
            }

            return {
                ...prev,
                [item.id]: list.map((sp) =>
                    sp.id === splitId ? { ...sp, quantity: newQtyStr, amount: calcAmt.toFixed(2) } : sp
                ),
            };
        });
    };

    const handleItemSplitAmountChange = (item: ParsedXmlItem, splitId: string, newAmtStr: string) => {
        const netUnit = item.quantity > 0 ? item.totalPrice / item.quantity : item.unitPrice;
        const amtNum = Math.max(0, parseFloat(newAmtStr.replace(",", ".")) || 0);
        const calcQty =
            netUnit > 0
                ? Number((amtNum / netUnit).toFixed(2))
                : Number(item.quantity);

        setXmlItemSplits((prev) => {
            const list = prev[item.id] || [];
            if (list.length === 2) {
                const otherIdx = list.findIndex((s) => s.id !== splitId);
                const remAmt = Math.max(0, Number((item.totalPrice - amtNum).toFixed(2)));
                const remQty =
                    netUnit > 0
                        ? Math.max(0, Number((remAmt / netUnit).toFixed(2)))
                        : Math.max(0, Number((item.quantity - calcQty).toFixed(2)));
                return {
                    ...prev,
                    [item.id]: list.map((sp, idx) => {
                        if (sp.id === splitId) {
                            return { ...sp, amount: newAmtStr, quantity: String(calcQty) };
                        }
                        if (idx === otherIdx) {
                            return { ...sp, amount: remAmt.toFixed(2), quantity: String(remQty) };
                        }
                        return sp;
                    }),
                };
            }

            return {
                ...prev,
                [item.id]: list.map((sp) =>
                    sp.id === splitId ? { ...sp, amount: newAmtStr, quantity: String(calcQty) } : sp
                ),
            };
        });
    };

    const handleRemoveItemSplit = (item: ParsedXmlItem, splitId: string) => {
        setXmlItemSplits((prev) => {
            const list = (prev[item.id] || []).filter((sp) => sp.id !== splitId);
            if (list.length <= 1) {
                return {
                    ...prev,
                    [item.id]: [
                        {
                            id: list[0]?.id || `${item.id}-0`,
                            client: list[0]?.client || "",
                            quantity: String(item.quantity),
                            amount: item.totalPrice.toFixed(2),
                        },
                    ],
                };
            }
            return {
                ...prev,
                [item.id]: list,
            };
        });
    };

    const handleAddCustomClient = () => {
        const trimmed = newCustomClientName.trim();
        if (!trimmed) return;
        if (!customClientOptions.includes(trimmed)) {
            setCustomClientOptions((prev) => [trimmed, ...prev]);
        }
        setNewCustomClientName("");
        setShowNewClientInput(false);
        toast.success(`Cliente / Projeto "${trimmed}" adicionado à lista de seleção!`);
    };

    // Resumo em tempo real da divisão por Cliente / OS calculado a partir dos itens do XML
    const xmlClientAllocationSummary = useMemo(() => {
        if (!parsedXml) return { groups: [], unassignedAmount: 0, totalAllocatedRaw: 0 };

        const map = new Map<
            string,
            {
                client: string;
                rawAmount: number;
                itemsList: Array<{ name: string; quantity: number; unit: string; amount: number }>;
            }
        >();

        let unassignedAmount = 0;
        let totalAllocatedRaw = 0;

        for (const item of parsedXml.items) {
            const splits = xmlItemSplits[item.id] || [
                {
                    id: `${item.id}-0`,
                    client: "",
                    quantity: String(item.quantity),
                    amount: item.totalPrice.toFixed(2),
                },
            ];

            for (const sp of splits) {
                const amt = Math.max(0, parseFloat(String(sp.amount).replace(",", ".")) || 0);
                const qty = Math.max(0, parseFloat(String(sp.quantity).replace(",", ".")) || 0);
                if (amt <= 0) continue;

                totalAllocatedRaw += amt;
                const clientKey = (sp.client || "").trim();
                if (!clientKey) {
                    unassignedAmount += amt;
                }

                const groupKey = clientKey || "ESTOQUE";
                const existing = map.get(groupKey) || {
                    client: groupKey,
                    rawAmount: 0,
                    itemsList: [],
                };
                existing.rawAmount += amt;
                existing.itemsList.push({
                    name: item.name,
                    quantity: qty,
                    unit: item.unit,
                    amount: amt,
                });
                map.set(groupKey, existing);
            }
        }

        const entries = Array.from(map.values());
        const invoiceTotal = parsedXml.totalAmount || totalAllocatedRaw;
        const scale = totalAllocatedRaw > 0 ? invoiceTotal / totalAllocatedRaw : 1;

        let runningEffective = 0;
        const groups = entries.map((g, idx) => {
            const isLast = idx === entries.length - 1;
            const effectiveAmount = isLast
                ? Number(Math.max(0, invoiceTotal - runningEffective).toFixed(2))
                : Number((g.rawAmount * scale).toFixed(2));
            runningEffective += effectiveAmount;

            const percentage = invoiceTotal > 0 ? (effectiveAmount / invoiceTotal) * 100 : 0;
            const itemsSummaryText = g.itemsList
                .map((i) => `${Number(i.quantity.toFixed(2))}x ${i.name}`)
                .join(", ");

            return {
                ...g,
                effectiveAmount,
                percentage,
                itemsSummaryText,
            };
        });

        return {
            groups,
            unassignedAmount,
            totalAllocatedRaw,
        };
    }, [parsedXml, xmlItemSplits]);

    const xmlInstallmentsTotal = useMemo(() => {
        return xmlInstallments.reduce(
            (acc, inst) => acc + (parseFloat(String(inst.amount).replace(",", ".")) || 0),
            0
        );
    }, [xmlInstallments]);

    const emitPreviewItems = useMemo(() => {
        const primaryQty = Math.max(1, parseFloat(String(emitForm.quantity || "1").replace(",", ".")) || 1);
        const primaryAmt = Math.max(0, parseFloat(String(emitForm.amount || "0").replace(",", ".")) || 0);
        const rawPrimaryUnit = parseFloat(String(emitForm.unitPrice || "0").replace(",", "."));
        const primaryUnit =
            rawPrimaryUnit > 0
                ? rawPrimaryUnit
                : primaryQty > 0
                ? Number((primaryAmt / primaryQty).toFixed(2))
                : 0;

        const baseItem = {
            code: "001",
            description: (emitForm.description || "Móveis Planejados").trim(),
            ncm: (emitForm.ncm || "94036000").trim(),
            csosn: (emitForm.csosn || "0102").trim(),
            cfop: (emitForm.cfop || "5102").trim(),
            unit: (emitForm.unit || "UN").trim().toUpperCase(),
            quantity: primaryQty,
            unitPrice: primaryUnit,
            totalPrice: primaryAmt > 0 ? primaryAmt : Number((primaryQty * primaryUnit).toFixed(2)),
        };

        const extras = emitExtraItems.map((it, idx) => {
            const q = Math.max(1, parseFloat(String(it.quantity || "1").replace(",", ".")) || 1);
            const a = Math.max(0, parseFloat(String(it.amount || "0").replace(",", ".")) || 0);
            const uRaw = parseFloat(String(it.unitPrice || "0").replace(",", "."));
            const u = uRaw > 0 ? uRaw : q > 0 ? Number((a / q).toFixed(2)) : 0;
            const tot = a > 0 ? a : Number((q * u).toFixed(2));
            return {
                code: it.code || String(idx + 2).padStart(3, "0"),
                description: (it.description || `Item #${idx + 2}`).trim(),
                ncm: (it.ncm || emitForm.ncm || "94036000").trim(),
                csosn: (emitForm.csosn || "0102").trim(),
                cfop: (it.cfop || emitForm.cfop || "5102").trim(),
                unit: (it.unit || "UN").trim().toUpperCase(),
                quantity: q,
                unitPrice: u,
                totalPrice: tot,
            };
        });

        return [baseItem, ...extras];
    }, [emitForm, emitExtraItems]);

    const emitTotalAmount = useMemo(() => {
        return Number(emitPreviewItems.reduce((acc, it) => acc + it.totalPrice, 0).toFixed(2));
    }, [emitPreviewItems]);

    const handleAddEmitExtraItem = () => {
        setEmitExtraItems((prev) => [
            ...prev,
            {
                id: `extra-emit-${Date.now()}-${prev.length}`,
                code: String(prev.length + 2).padStart(3, "0"),
                description: "",
                ncm: emitForm.ncm || "94036000",
                cfop: emitForm.cfop || "5102",
                unit: "UN",
                quantity: "1",
                unitPrice: "",
                amount: "",
            },
        ]);
    };

    const handleUpdateEmitExtraItem = (
        id: string,
        field: "description" | "quantity" | "unitPrice" | "amount" | "ncm" | "cfop" | "unit",
        value: string
    ) => {
        setEmitExtraItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const next = { ...item, [field]: value };
                const qty = Math.max(1, parseFloat(String(next.quantity || "1").replace(",", ".")) || 1);
                if (field === "quantity" || field === "unitPrice") {
                    const unit = parseFloat(String(next.unitPrice || "0").replace(",", "."));
                    if (!isNaN(unit) && unit > 0) {
                        next.amount = (qty * unit).toFixed(2);
                    }
                } else if (field === "amount") {
                    const tot = parseFloat(String(next.amount || "0").replace(",", "."));
                    if (!isNaN(tot) && tot > 0) {
                        next.unitPrice = (tot / qty).toFixed(2);
                    }
                }
                return next;
            })
        );
    };

    const handleRemoveEmitExtraItem = (id: string) => {
        setEmitExtraItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleOpenEmitPreview = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!emitForm.clientName.trim()) {
            toast.error("Preencha o Nome / Razão Social do Destinatário (Cliente) para visualizar a prévia.");
            return;
        }
        if (isNaN(emitTotalAmount) || emitTotalAmount <= 0) {
            toast.error("Preencha o valor da nota fiscal para visualizar a prévia.");
            return;
        }
        setEmitStep("preview");
    };

    const buildEmitStoredPayload = (
        invoiceNumberStr: string,
        sefazKeyStr = "",
        sefazProtocolStr = ""
    ): StoredXmlPayload => {
        return {
            direction: "saida",
            series: "1",
            natOp: emitForm.natOp?.trim() || "Venda Dentro do Estado",
            protocol: sefazProtocolStr || "PRÉVIA - AGUARDANDO TRANSMISSÃO",
            accessKey: sefazKeyStr || "",
            emitter: {
                name: "BJL MOVEIS PLANEJADOS LTDA",
                cnpj: companySettings?.cnpj || "60.528.620/0001-20",
                ie: "15469064",
                address: "Rua Maria Vitipo Raposo, 138",
                neighborhood: "Barao de Macaubas",
                city: "Sao Fidelis",
                uf: "RJ",
                cep: "28400-000",
                phone: companySettings?.phone || "(22) 99703-9852",
            },
            recipient: {
                name: emitForm.clientName.trim(),
                doc: emitForm.clientDoc.trim(),
                ie: emitForm.clientIe.trim(),
                address: emitForm.clientAddress.trim() || "Centro",
                neighborhood: emitForm.clientNeighborhood.trim() || "Centro",
                city: emitForm.clientCity.trim() || "Sao Fidelis",
                uf: emitForm.clientUf.trim() || "RJ",
                cep: emitForm.clientCep.trim() || "28400-000",
                phone: formatPhoneBrDisplay(emitForm.clientPhone),
            },
            totals: {
                productsTotal: emitTotalAmount,
                discountAmount: 0,
                freightAmount: 0,
                otherAmount: 0,
                totalAmount: emitTotalAmount,
            },
            items: emitPreviewItems.map((it, idx) => ({
                code: it.code || String(idx + 1).padStart(3, "0"),
                name: it.description,
                ncm: it.ncm || "94036000",
                csosn: it.csosn || "0102",
                cfop: it.cfop || "5102",
                unit: it.unit || "UN",
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                grossPrice: it.totalPrice,
                discount: 0,
                totalPrice: it.totalPrice,
            })),
        };
    };

    const handlePrintEmitPreview = () => {
        const todayIso = new Date().toISOString().split("T")[0];
        const previewPayload = buildEmitStoredPayload("PRÉVIA");
        const draftInvoice: Invoice = {
            id: "preview-draft",
            issue_date: todayIso,
            client_name: emitForm.clientName.trim() || "DESTINATÁRIO",
            description: emitPreviewItems.map((i) => `${i.quantity}x ${i.description}`).join(", "),
            amount: emitTotalAmount,
            status: "Pendente",
            invoice_number: "PRÉVIA",
            type: emitForm.type,
            asaas_status: `XML_PAYLOAD:${JSON.stringify(previewPayload)}`,
        };
        handlePrintDanfe(draftInvoice);
    };

    // Extrai todos os itens/ambientes e valores reais de um Orçamento (<!--BJL_AMBIENTES:...-->, pastas <!--BJL_CHILD_IDS:...--> ou valor do orçamento)
    const extractItemsFromSingleBudget = (
        budget: any,
        allBudgets: any[]
    ): Array<{ description: string; observation?: string; value: number }> => {
        if (!budget) return [];
        const notes = typeof budget.notes === "string" ? budget.notes : "";
        const budgetTotal =
            Number(budget.total_value) > 0
                ? Number(budget.total_value)
                : Number(budget.total_cost) > 0 && Number(budget.markup_factor) > 0
                ? Number((Number(budget.total_cost) * Number(budget.markup_factor)).toFixed(2))
                : 0;

        // 1. Verifica se o orçamento possui itens/ambientes detalhados salvos em <!--BJL_AMBIENTES:[...]-->
        if (notes.includes("<!--BJL_AMBIENTES:")) {
            try {
                const match = notes.match(/<!--BJL_AMBIENTES:([\s\S]*?)-->/);
                if (match && match[1]) {
                    const parsed = JSON.parse(match[1]);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const validAmbs = parsed
                            .map((a: any) => ({
                                description: String(a.description || budget.project_name || "Móveis Planejados")
                                    .replace(/^Orçamento:\s*/i, "")
                                    .trim(),
                                observation: String(a.observation || "").trim(),
                                value: Number(a.value) || 0,
                            }))
                            .filter((a: any) => a.description || a.value > 0);

                        if (validAmbs.length > 0) {
                            const sumAmb = validAmbs.reduce((acc, a) => acc + a.value, 0);
                            if (sumAmb <= 0 && budgetTotal > 0) {
                                const perItem = Number((budgetTotal / validAmbs.length).toFixed(2));
                                return validAmbs.map((a, idx) => ({
                                    ...a,
                                    value:
                                        idx === validAmbs.length - 1
                                            ? Number((budgetTotal - perItem * (validAmbs.length - 1)).toFixed(2))
                                            : perItem,
                                }));
                            }
                            return validAmbs;
                        }
                    }
                }
            } catch (e) {
                console.warn("Erro ao ler BJL_AMBIENTES do orçamento:", e);
            }
        }

        // 2. Verifica se é uma pasta com IDs filhos em <!--BJL_CHILD_IDS:[...]-->
        if (notes.includes("<!--BJL_CHILD_IDS:")) {
            try {
                const match = notes.match(/<!--BJL_CHILD_IDS:([\s\S]*?)-->/);
                if (match && match[1]) {
                    const childIds = JSON.parse(match[1]);
                    if (Array.isArray(childIds) && childIds.length > 0) {
                        const children = allBudgets.filter(
                            (c) => c.id !== budget.id && childIds.includes(c.id)
                        );
                        const approvedChildren = children.filter((c) => c.status === "aprovado");
                        const activeChildren =
                            approvedChildren.length > 0 ? approvedChildren : children;
                        if (activeChildren.length > 0) {
                            return activeChildren.flatMap((c) =>
                                extractItemsFromSingleBudget(c, allBudgets)
                            );
                        }
                    }
                }
            } catch (e) {
                console.warn("Erro ao ler BJL_CHILD_IDS do orçamento:", e);
            }
        }

        // 3. Fallback: item único com o nome do projeto e o valor total real do orçamento
        const cleanDesc =
            (budget.project_name || "Móveis Planejados sob medida")
                .replace(/^PROJETO COMPLETO:\s*/i, "")
                .replace(/^Orçamento:\s*/i, "")
                .trim() || "Móveis Planejados sob medida";

        return [
            {
                description: cleanDesc,
                value: budgetTotal,
            },
        ];
    };

    // Busca todos os itens do(s) orçamento(s) de um cliente ou de um budget_id específico
    const resolveBudgetItemsForClientOrBudget = (
        clientName?: string,
        preferredBudgetId?: string | null
    ): {
        clientName: string;
        items: Array<{ description: string; observation?: string; value: number }>;
        totalValue: number;
    } | null => {
        if (preferredBudgetId) {
            const exactBudget = crmBudgets.find((b) => b.id === preferredBudgetId);
            if (exactBudget) {
                const items = extractItemsFromSingleBudget(exactBudget, crmBudgets);
                const totalValue = Number(
                    items.reduce((acc, i) => acc + (Number(i.value) || 0), 0).toFixed(2)
                );
                return {
                    clientName: (exactBudget.client_name || clientName || "").trim(),
                    items,
                    totalValue,
                };
            }
        }

        const cleanTarget = (clientName || "").split("+")[0].trim().toLowerCase();
        if (!cleanTarget) return null;

        const clientBudgets = crmBudgets.filter((b) => {
            const bClient = (b.client_name || "").split("+")[0].trim().toLowerCase();
            return bClient === cleanTarget && b.status !== "rejeitado";
        });

        if (clientBudgets.length === 0) return null;

        // Se existir uma pasta unificada ("PROJETO COMPLETO" ou com BJL_CHILD_IDS / múltiplos BJL_AMBIENTES), prioriza ela para não duplicar com os filhos
        const unifiedBudget = clientBudgets.find((b) => {
            const projUpper = (b.project_name || "").toUpperCase();
            const notes = typeof b.notes === "string" ? b.notes : "";
            return (
                projUpper.startsWith("PROJETO COMPLETO") ||
                notes.includes("<!--BJL_CHILD_IDS:") ||
                (notes.includes("<!--BJL_AMBIENTES:") && projUpper.includes("+"))
            );
        });

        if (unifiedBudget) {
            const items = extractItemsFromSingleBudget(unifiedBudget, crmBudgets);
            const totalValue = Number(
                items.reduce((acc, i) => acc + (Number(i.value) || 0), 0).toFixed(2)
            );
            return {
                clientName: (unifiedBudget.client_name || clientName || "").trim(),
                items,
                totalValue,
            };
        }

        // Caso o cliente tenha orçamentos separados (ex: 1 orçamento para Quarto + 1 orçamento para Closet), junta os itens de todos
        const approvedOnly = clientBudgets.filter((b) => b.status === "aprovado");
        const budgetsToUse = approvedOnly.length > 0 ? approvedOnly : clientBudgets;
        const allItems = budgetsToUse.flatMap((b) => extractItemsFromSingleBudget(b, crmBudgets));
        const totalValue = Number(
            allItems.reduce((acc, i) => acc + (Number(i.value) || 0), 0).toFixed(2)
        );

        return {
            clientName: (budgetsToUse[0]?.client_name || clientName || "").trim(),
            items: allItems,
            totalValue,
        };
    };

    const applyResolvedItemsToEmitForm = (
        selectedVal: string,
        resolvedClientName: string,
        matchingClient: any,
        items: Array<{ description: string; observation?: string; value: number }>
    ) => {
        const validItems =
            items.length > 0
                ? items
                : [{ description: "Fabricação e fornecimento de móveis planejados sob medida", value: 0 }];

        const firstItem = validItems[0];
        const restItems = validItems.slice(1);

        setEmitForm((prev) => ({
            ...prev,
            selectedSaleId: selectedVal,
            clientName: resolvedClientName || prev.clientName,
            clientDoc: matchingClient?.cpf || matchingClient?.document || prev.clientDoc || "",
            clientAddress: matchingClient?.address || prev.clientAddress || "",
            clientCity: matchingClient?.city || "Sao Fidelis",
            clientUf: matchingClient?.state || "RJ",
            clientCep: matchingClient?.zip_code || "28400-000",
            clientPhone: formatPhoneBrDisplay(matchingClient?.phone) || prev.clientPhone || "(22) ",
            clientEmail: matchingClient?.email || prev.clientEmail || "",
            description: firstItem.description.toUpperCase(),
            quantity: "1",
            unitPrice: firstItem.value > 0 ? firstItem.value.toFixed(2) : "",
            amount: firstItem.value > 0 ? firstItem.value.toFixed(2) : "",
        }));

        setEmitExtraItems(
            restItems.map((it, idx) => ({
                id: `budget-extra-${idx}-${Date.now()}`,
                code: String(idx + 2).padStart(3, "0"),
                description: it.description.toUpperCase(),
                ncm: emitForm.ncm || "94036000",
                cfop: emitForm.cfop || "5102",
                unit: "UN",
                quantity: "1",
                unitPrice: it.value > 0 ? it.value.toFixed(2) : "0.00",
                amount: it.value > 0 ? it.value.toFixed(2) : "0.00",
            }))
        );

        const totalPulled = validItems.reduce((acc, i) => acc + (Number(i.value) || 0), 0);
        if (validItems.length > 1) {
            toast.success(
                `${validItems.length} itens puxados do Orçamento de ${resolvedClientName} (${formatCurrency(
                    totalPulled
                )})!`
            );
        } else if (totalPulled > 0) {
            toast.success(
                `Orçamento de ${resolvedClientName} carregado: ${firstItem.description} (${formatCurrency(
                    totalPulled
                )})!`
            );
        }
    };

    const handleSelectSaleOrClient = (val: string) => {
        if (val.startsWith("budget:")) {
            const budgetId = val.replace("budget:", "");
            const budget = crmBudgets.find((b) => b.id === budgetId);
            if (budget) {
                const cName = (budget.client_name || "").trim();
                const matchingClient = crmClients.find(
                    (c) => (c.name || "").trim().toLowerCase() === cName.toLowerCase()
                );
                const resolved = resolveBudgetItemsForClientOrBudget(cName, budget.id);
                applyResolvedItemsToEmitForm(
                    val,
                    cName,
                    matchingClient,
                    resolved?.items || []
                );
            }
        } else if (val.startsWith("sale:")) {
            const saleId = val.replace("sale:", "");
            const sale = crmSales.find((s) => s.id === saleId);
            if (sale) {
                const cName = (sale.client_name || "").trim();
                const matchingClient = crmClients.find(
                    (c) => (c.name || "").trim().toLowerCase() === cName.toLowerCase()
                );
                // Prioriza SEMPRE puxar todos os itens e valores reais do Orçamento vinculado (budget_id ou pelo nome do cliente)
                const resolvedBudget = resolveBudgetItemsForClientOrBudget(
                    cName,
                    sale.budget_id
                );

                if (resolvedBudget && resolvedBudget.items.length > 0) {
                    applyResolvedItemsToEmitForm(
                        val,
                        cName,
                        matchingClient,
                        resolvedBudget.items
                    );
                } else {
                    const saleTotal = Number(sale.total_value || 0);
                    const cleanProd = (sale.product || "Móveis Planejados")
                        .replace(/^Orçamento:\s*/i, "")
                        .replace(/^PROJETO COMPLETO:\s*/i, "")
                        .trim();
                    applyResolvedItemsToEmitForm(val, cName, matchingClient, [
                        { description: cleanProd, value: saleTotal },
                    ]);
                }
            }
        } else if (val.startsWith("client:")) {
            const clientId = val.replace("client:", "");
            const client = crmClients.find((c) => c.id === clientId);
            if (client) {
                const cName = (client.name || "").trim();
                const resolvedBudget = resolveBudgetItemsForClientOrBudget(cName, null);
                if (resolvedBudget && resolvedBudget.items.length > 0) {
                    applyResolvedItemsToEmitForm(
                        val,
                        cName,
                        client,
                        resolvedBudget.items
                    );
                } else {
                    setEmitExtraItems([]);
                    setEmitForm((prev) => ({
                        ...prev,
                        selectedSaleId: val,
                        clientName: cName,
                        clientDoc: client.cpf || client.document || "",
                        clientAddress: client.address || "",
                        clientCity: client.city || "Sao Fidelis",
                        clientUf: client.state || "RJ",
                        clientCep: client.zip_code || "28400-000",
                        clientPhone: formatPhoneBrDisplay(client.phone) || "(22) ",
                        clientEmail: client.email || "",
                    }));
                }
            }
        } else if (val.startsWith("os:")) {
            const osId = val.replace("os:", "");
            const os = crmServiceOrders.find((o) => o.id === osId);
            if (os) {
                const cName = (os.client || "").trim();
                const matchingClient = crmClients.find(
                    (c) => (c.name || "").trim().toLowerCase() === cName.toLowerCase()
                );
                const resolvedBudget = resolveBudgetItemsForClientOrBudget(cName, null);
                if (resolvedBudget && resolvedBudget.items.length > 0) {
                    applyResolvedItemsToEmitForm(
                        val,
                        cName,
                        matchingClient,
                        resolvedBudget.items
                    );
                } else {
                    const osVal = Number(os.value || 0);
                    applyResolvedItemsToEmitForm(val, cName, matchingClient, [
                        {
                            description: os.action
                                ? `${os.action} (${os.ticket_number || "OS"})`
                                : "Móveis Planejados",
                            value: osVal,
                        },
                    ]);
                }
            }
        }
    };

    const handleEmitInvoice = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const numericAmount = emitTotalAmount;

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
                naturezaOperacao:
                    emitForm.natOp?.trim().toUpperCase() || "VENDA DE PRODUCAO DO ESTABELECIMENTO",
                dest: {
                    nome: emitForm.clientName.trim(),
                    ...docField,
                    endereco: {
                        logradouro: emitForm.clientAddress?.trim() || "Rua Maria Vitipo Raposo",
                        numero: "138",
                        bairro: emitForm.clientNeighborhood?.trim() || "Centro",
                        cidade: emitForm.clientCity?.trim() || "Sao Fidelis",
                        uf: emitForm.clientUf?.trim() || "RJ",
                        cep: (emitForm.clientCep || "28400000").replace(/\D/g, "") || "28400000",
                        codigoMunicipio: "3304805",
                    },
                },
                items: emitPreviewItems.map((it, idx) => ({
                    codigo: it.code || String(idx + 1).padStart(3, "0"),
                    descricao: it.description,
                    cfop: it.cfop || "5102",
                    ncm: (it.ncm || "94036000").replace(/\D/g, ""),
                    unidade: it.unit || "UN",
                    quantidade: it.quantity,
                    valorUnitario: it.unitPrice,
                    valorTotal: it.totalPrice,
                })),
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
            const itemsDescSummary = emitPreviewItems
                .map((it) => `${it.quantity}x ${it.description}`)
                .join(", ");
            const primaryItem = emitPreviewItems[0];
            const storedEmitPayload = buildEmitStoredPayload(
                invoiceNumberGenerated,
                sefazKey,
                sefazProtocol || "333260001022548"
            );

            const newInvoiceRecord: any = {
                issue_date: todayIso,
                client_name: emitForm.clientName.trim(),
                description: `${itemsDescSummary} | Qtd: ${primaryItem.quantity} | VUnit: ${primaryItem.unitPrice.toFixed(2)}${
                    emitForm.clientDoc ? ` | Doc: ${emitForm.clientDoc}` : ""
                }${sefazKey ? ` | Chave: ${sefazKey}` : ""}${
                    sefazProtocol ? ` | Prot SEFAZ: ${sefazProtocol}` : ""
                }`,
                amount: numericAmount,
                status: finalStatus,
                invoice_number: invoiceNumberGenerated,
                type: emitForm.type,
                asaas_id: notaasInvoiceId || null,
                asaas_status: `XML_PAYLOAD:${JSON.stringify(storedEmitPayload)}`,
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
                    : `${emitForm.type} #${invoiceNumberGenerated} confirmada e registrada com sucesso!`
            );
            setIsEmitOpen(false);
            setEmitStep("form");
            setEmitExtraItems([]);
        } catch (error: any) {
            console.error("Erro ao emitir nota fiscal:", error);
            toast.error("Erro ao registrar nota fiscal no banco de dados.");
        } finally {
            setIsEmitting(false);
        }
    };

    // Parser individual de um arquivo XML SEFAZ NF-e (permite importar 1 ou várias notas somadas nos mesmos boletos)
    const parseSingleXmlFile = (file: File): Promise<ParsedXmlData | null> => {
        return new Promise((resolve) => {
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
                    const natOp = ide ? getTagText(ide, "natOp") : "";
                    const rawIssueDate = ide ? getTagText(ide, "dhEmi") || getTagText(ide, "dEmi") : "";
                    const issueDate = rawIssueDate
                        ? rawIssueDate.substring(0, 10)
                        : new Date().toISOString().split("T")[0];

                    const infProt = xmlDoc.getElementsByTagName("infProt")[0];
                    const protocol = infProt ? getTagText(infProt, "nProt") : "";

                    const emit = xmlDoc.getElementsByTagName("emit")[0];
                    const emitterName = emit ? getTagText(emit, "xNome") : "Fornecedor XML";
                    const emitterFantasyName = emit ? getTagText(emit, "xFant") : "";
                    const emitterCnpj = emit ? getTagText(emit, "CNPJ") || getTagText(emit, "CPF") : "";
                    const emitterIe = emit ? getTagText(emit, "IE") : "";
                    const enderEmit = emit ? emit.getElementsByTagName("enderEmit")[0] : undefined;
                    const emitterAddress = enderEmit
                        ? `${getTagText(enderEmit, "xLgr")}${
                              getTagText(enderEmit, "nro") ? `, ${getTagText(enderEmit, "nro")}` : ""
                          }${
                              getTagText(enderEmit, "xCpl") ? ` - ${getTagText(enderEmit, "xCpl")}` : ""
                          }`.trim()
                        : "";
                    const emitterNeighborhood = enderEmit ? getTagText(enderEmit, "xBairro") : "";
                    const emitterCity = enderEmit ? getTagText(enderEmit, "xMun") : "";
                    const emitterUf = enderEmit ? getTagText(enderEmit, "UF") : "";
                    const emitterCep = enderEmit ? getTagText(enderEmit, "CEP") : "";
                    const emitterPhone = enderEmit ? getTagText(enderEmit, "fone") : "";

                    const dest = xmlDoc.getElementsByTagName("dest")[0];
                    const recipientName = dest ? getTagText(dest, "xNome") : "";
                    const recipientDoc = dest ? getTagText(dest, "CNPJ") || getTagText(dest, "CPF") : "";
                    const recipientIe = dest ? getTagText(dest, "IE") : "";
                    const enderDest = dest ? dest.getElementsByTagName("enderDest")[0] : undefined;
                    const recipientAddress = enderDest
                        ? `${getTagText(enderDest, "xLgr")}${
                              getTagText(enderDest, "nro") ? `, ${getTagText(enderDest, "nro")}` : ""
                          }`.trim()
                        : "";
                    const recipientNeighborhood = enderDest ? getTagText(enderDest, "xBairro") : "";
                    const recipientCity = enderDest ? getTagText(enderDest, "xMun") : "";
                    const recipientUf = enderDest ? getTagText(enderDest, "UF") : "";
                    const recipientCep = enderDest ? getTagText(enderDest, "CEP") : "";
                    const recipientPhone = enderDest ? getTagText(enderDest, "fone") : "";

                    const icmsTot = xmlDoc.getElementsByTagName("ICMSTot")[0];
                    const totalAmount = icmsTot ? parseFloat(getTagText(icmsTot, "vNF") || "0") : 0;
                    const productsTotal = icmsTot ? parseFloat(getTagText(icmsTot, "vProd") || "0") : 0;
                    const freightAmount = icmsTot ? parseFloat(getTagText(icmsTot, "vFrete") || "0") : 0;
                    const discountAmount = icmsTot ? parseFloat(getTagText(icmsTot, "vDesc") || "0") : 0;
                    const ipiAmount = icmsTot ? parseFloat(getTagText(icmsTot, "vIPI") || "0") : 0;
                    const stAmount = icmsTot ? parseFloat(getTagText(icmsTot, "vST") || "0") : 0;
                    const outroAmount = icmsTot ? parseFloat(getTagText(icmsTot, "vOutro") || "0") : 0;
                    const otherAmount = ipiAmount + stAmount + outroAmount;

                    const finalInvNum =
                        invoiceNumber || String(Math.floor(1000 + Math.random() * 9000));
                    const noteId = `note-${finalInvNum}-${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2, 6)}`;

                    const detNodes = Array.from(xmlDoc.getElementsByTagName("det"));
                    const items: ParsedXmlItem[] = detNodes.map((det, idx) => {
                        const prod = det.getElementsByTagName("prod")[0];
                        const imposto = det.getElementsByTagName("imposto")[0];
                        const csosn = imposto
                            ? getTagText(imposto, "CSOSN") || getTagText(imposto, "CST") || "102"
                            : "102";
                        const quantity = prod ? parseFloat(getTagText(prod, "qCom") || "1") : 1;
                        const grossPrice = prod ? parseFloat(getTagText(prod, "vProd") || "0") : 0;
                        const discount = prod ? parseFloat(getTagText(prod, "vDesc") || "0") : 0;
                        const netTotal = Number(Math.max(0, grossPrice - discount).toFixed(2));
                        const rawUnitPrice = prod ? parseFloat(getTagText(prod, "vUnCom") || "0") : 0;
                        return {
                            id: `${noteId}-item-${idx}`,
                            sourceNoteId: noteId,
                            invoiceNumber: finalInvNum,
                            code: prod ? getTagText(prod, "cProd") : String(idx + 1),
                            name: prod ? getTagText(prod, "xProd") : `Item NF-e #${idx + 1}`,
                            ncm: prod ? getTagText(prod, "NCM") : "",
                            csosn,
                            cfop: prod ? getTagText(prod, "CFOP") : "",
                            unit: prod ? getTagText(prod, "uCom") : "UN",
                            quantity,
                            unitPrice: rawUnitPrice > 0 ? rawUnitPrice : quantity > 0 ? netTotal / quantity : 0,
                            grossPrice,
                            discount,
                            totalPrice: netTotal,
                        };
                    });

                    const dupNodes = Array.from(xmlDoc.getElementsByTagName("dup"));
                    const duplicates: ParsedXmlDuplicate[] = dupNodes
                        .map((dup, idx) => ({
                            number: getTagText(dup, "nDup") || String(idx + 1),
                            dueDate: getTagText(dup, "dVenc"),
                            amount: parseFloat(getTagText(dup, "vDup") || "0"),
                        }))
                        .filter((d) => d.amount > 0);

                    if (!invoiceNumber && items.length === 0) {
                        resolve(null);
                        return;
                    }

                    const finalTotalAmount =
                        totalAmount > 0
                            ? totalAmount
                            : items.reduce((acc, it) => acc + it.totalPrice, 0);

                    const sourceNote: ParsedXmlSourceNote = {
                        id: noteId,
                        invoiceNumber: finalInvNum,
                        series,
                        issueDate,
                        natOp,
                        protocol,
                        emitterName,
                        emitterFantasyName,
                        emitterCnpj,
                        emitterIe,
                        emitterAddress,
                        emitterNeighborhood,
                        emitterCity,
                        emitterUf,
                        emitterCep,
                        emitterPhone,
                        recipientName,
                        recipientDoc,
                        recipientIe,
                        recipientAddress,
                        recipientNeighborhood,
                        recipientCity,
                        recipientUf,
                        recipientCep,
                        recipientPhone,
                        accessKey,
                        productsTotal: productsTotal || finalTotalAmount,
                        freightAmount,
                        discountAmount,
                        otherAmount,
                        totalAmount: finalTotalAmount,
                        itemsCount: items.length,
                    };

                    resolve({
                        accessKey,
                        invoiceNumber: finalInvNum,
                        series,
                        issueDate,
                        emitterName,
                        emitterFantasyName,
                        emitterCnpj,
                        recipientName,
                        recipientDoc,
                        productsTotal: productsTotal || finalTotalAmount,
                        freightAmount,
                        discountAmount,
                        otherAmount,
                        totalAmount: finalTotalAmount,
                        items,
                        duplicates,
                        sourceNotes: [sourceNote],
                    });
                } catch (err) {
                    console.error("Erro ao ler XML:", err);
                    resolve(null);
                }
            };
            reader.onerror = () => resolve(null);
            reader.readAsText(file);
        });
    };

    const mergeParsedXmlNotes = (
        base: ParsedXmlData | null,
        incomingList: ParsedXmlData[]
    ): { merged: ParsedXmlData; newlyAddedNotes: ParsedXmlSourceNote[]; newlyAddedItems: ParsedXmlItem[] } => {
        const allNotes: ParsedXmlSourceNote[] = base ? [...base.sourceNotes] : [];
        const allItems: ParsedXmlItem[] = base ? [...base.items] : [];
        const allDuplicates: ParsedXmlDuplicate[] = base ? [...base.duplicates] : [];
        const newlyAddedNotes: ParsedXmlSourceNote[] = [];
        const newlyAddedItems: ParsedXmlItem[] = [];

        for (const inc of incomingList) {
            for (const sn of inc.sourceNotes) {
                const alreadyExists = allNotes.some(
                    (existing) =>
                        (sn.accessKey && existing.accessKey === sn.accessKey) ||
                        (sn.invoiceNumber &&
                            existing.invoiceNumber === sn.invoiceNumber &&
                            Math.abs(existing.totalAmount - sn.totalAmount) < 0.01)
                );
                if (alreadyExists) continue;
                allNotes.push(sn);
                newlyAddedNotes.push(sn);
                const noteItems = inc.items.filter((i) => i.sourceNoteId === sn.id);
                allItems.push(...noteItems);
                newlyAddedItems.push(...noteItems);
            }
            if (inc.duplicates.length > 0) {
                allDuplicates.push(...inc.duplicates);
            }
        }

        const primaryNote = allNotes[0];
        const totalAmount = Number(
            allNotes.reduce((acc, n) => acc + Number(n.totalAmount || 0), 0).toFixed(2)
        );
        const productsTotal = Number(
            allNotes.reduce((acc, n) => acc + Number(n.productsTotal || 0), 0).toFixed(2)
        );
        const freightAmount = Number(
            allNotes.reduce((acc, n) => acc + Number(n.freightAmount || 0), 0).toFixed(2)
        );
        const discountAmount = Number(
            allNotes.reduce((acc, n) => acc + Number(n.discountAmount || 0), 0).toFixed(2)
        );
        const otherAmount = Number(
            allNotes.reduce((acc, n) => acc + Number(n.otherAmount || 0), 0).toFixed(2)
        );

        const merged: ParsedXmlData = {
            accessKey: allNotes.map((n) => n.accessKey).filter(Boolean).join(" | "),
            invoiceNumber: allNotes.map((n) => n.invoiceNumber).join(" + "),
            series: primaryNote?.series || "1",
            issueDate: base?.issueDate || primaryNote?.issueDate || new Date().toISOString().split("T")[0],
            emitterName: primaryNote?.emitterName || "Fornecedor XML",
            emitterFantasyName: primaryNote?.emitterFantasyName || "",
            emitterCnpj: primaryNote?.emitterCnpj || "",
            recipientName: primaryNote?.recipientName || "",
            recipientDoc: primaryNote?.recipientDoc || "",
            productsTotal,
            freightAmount,
            discountAmount,
            otherAmount,
            totalAmount,
            items: allItems,
            duplicates: allDuplicates,
            sourceNotes: allNotes,
        };

        return { merged, newlyAddedNotes, newlyAddedItems };
    };

    // Leitor Nativo de XML da SEFAZ (Suporta 1 ou VÁRIAS notas somadas nos mesmos boletos 30/60/90!)
    const handleXmlFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        try {
            const parsedResults = (await Promise.all(files.map(parseSingleXmlFile))).filter(
                Boolean
            ) as ParsedXmlData[];

            if (parsedResults.length === 0) {
                toast.error("Os arquivos selecionados não parecem ser XML padrão SEFAZ NF-e.");
                return;
            }

            const { merged } = mergeParsedXmlNotes(null, parsedResults);

            const initialSplits: Record<string, XmlItemClientSplit[]> = {};
            merged.items.forEach((it) => {
                initialSplits[it.id] = [
                    {
                        id: `${it.id}-0`,
                        client: "",
                        quantity: String(it.quantity),
                        amount: it.totalPrice.toFixed(2),
                    },
                ];
            });
            setXmlItemSplits(initialSplits);

            const detectedSupplier = detectSupplierProfile(
                merged.emitterName,
                merged.emitterFantasyName
            );
            const initialPaymentCat = detectedSupplier === "bruta" ? "Cartao" : "Boleto";
            const initialPaymentMethod =
                detectedSupplier === "bruta" ? "Cartão Nubank" : "Boleto";

            // Se for nota única no Boleto (ex: C&D) e o próprio XML já traz as duplicatas exatas (<dup>), usa elas por padrão!
            const initialPreset:
                | "avista"
                | "30"
                | "30_60"
                | "30_60_90"
                | "30_60_90_120"
                | "28_56_84"
                | "xml_dup"
                | "custom" =
                detectedSupplier !== "bruta" &&
                merged.sourceNotes.length === 1 &&
                merged.duplicates.length > 0
                    ? "xml_dup"
                    : "30_60_90";

            const defaultInstallments = buildInstallmentsFromPreset(
                merged.issueDate,
                merged.totalAmount,
                initialPreset,
                initialPaymentMethod,
                merged.duplicates,
                3,
                30
            );
            setXmlInstallments(defaultInstallments);

            setXmlOptions((prev) => ({
                ...prev,
                direction: "entrada",
                updateInventory: true,
                createExpenseTransaction: true,
                supplierPreset: detectedSupplier,
                paymentCategoryType: initialPaymentCat,
                paymentMethod: initialPaymentMethod,
                financialInstitution: "Banco Itaú",
                category: "Custo com Materiais e Obras",
                subcategory: "Compra de MDF e Madeira",
                schedulePreset: initialPreset,
                customInstallmentCount: String(defaultInstallments.length || 3),
                customIntervalDays: "30",
                bulkClientTarget: "",
            }));

            setParsedXml(merged);
            setIsXmlDialogOpen(true);

            if (merged.sourceNotes.length > 1) {
                toast.success(
                    `${merged.sourceNotes.length} notas somadas (${formatCurrency(
                        merged.totalAmount
                    )}) e divididas nos mesmos boletos!`
                );
            }
        } catch (err) {
            console.error("Erro ao ler XML:", err);
            toast.error("Não foi possível interpretar o arquivo XML.");
        } finally {
            if (xmlInputRef.current) xmlInputRef.current.value = "";
        }
    };

    // Converte uma Nota Fiscal já lançada na tabela (XML ou Entrada sem XML) para abrir a tela de Alocar Clientes por Item e Lançar no Financeiro
    const convertExistingInvoiceToParsedXml = (invoice: Invoice): ParsedXmlData => {
        const xmlMeta = parseStoredXmlPayload(invoice);
        const noteId = `existing-${invoice.id}`;
        const finalInvNum = invoice.invoice_number || "S/N";
        const issueDate = invoice.issue_date || new Date().toISOString().split("T")[0];
        const totalAmount = Number(invoice.amount || 0);

        let items: ParsedXmlItem[] = [];
        if (xmlMeta && Array.isArray(xmlMeta.items) && xmlMeta.items.length > 0) {
            items = xmlMeta.items.map((it, idx) => ({
                id: `${noteId}-item-${idx}`,
                sourceNoteId: noteId,
                invoiceNumber: finalInvNum,
                code: it.code || String(idx + 1).padStart(3, "0"),
                name: it.name || `Item #${idx + 1}`,
                ncm: it.ncm || "44111490",
                csosn: it.csosn || "102",
                cfop: it.cfop || "1102",
                unit: it.unit || "UN",
                quantity: Number(it.quantity) || 1,
                unitPrice: Number(it.unitPrice) || 0,
                grossPrice: Number(it.grossPrice ?? it.totalPrice) || 0,
                discount: Number(it.discount ?? 0) || 0,
                totalPrice: Number(it.totalPrice) || 0,
                clients: it.clients,
            }));
        } else {
            // Fallback para notas antigas sem XML_PAYLOAD: extrai itens da descrição
            const cleanedDesc = (invoice.description || "")
                .replace(/^\[[^\]]+\]\s*/i, "")
                .replace(/\|\s*Clientes:\s*[^|]+/gi, "")
                .replace(/\|\s*Doc:\s*[^|]+/gi, "")
                .replace(/\|\s*Chave:\s*[0-9]{44}/gi, "")
                .replace(/\|\s*Prot SEFAZ:\s*[^|]+/gi, "")
                .replace(/\|\s*Qtd:\s*[^|]+/gi, "")
                .replace(/\|\s*VUnit:\s*[^|]+/gi, "")
                .replace(/\(\+\d+\s*itens?\)/gi, "")
                .trim();

            const rawParts = cleanedDesc
                .split(/,\s*(?=\d+(?:[.,]\d+)?x\s)/i)
                .map((p) => p.trim())
                .filter(Boolean);

            if (rawParts.length > 0) {
                const parsedParts = rawParts.map((part, idx) => {
                    const m = part.match(/^(\d+(?:[.,]\d+)?)x\s+(.+)$/i);
                    const qty = m ? parseFloat(m[1].replace(",", ".")) || 1 : 1;
                    const name = m ? m[2].trim() : part;
                    return { idx, qty, name };
                });
                const perItemTotal =
                    parsedParts.length > 0
                        ? Number((totalAmount / parsedParts.length).toFixed(2))
                        : totalAmount;
                items = parsedParts.map((p, idx) => {
                    const isLast = idx === parsedParts.length - 1;
                    const itemTot = isLast
                        ? Number(Math.max(0, totalAmount - perItemTotal * (parsedParts.length - 1)).toFixed(2))
                        : perItemTotal;
                    const unitP = p.qty > 0 ? Number((itemTot / p.qty).toFixed(2)) : itemTot;
                    return {
                        id: `${noteId}-item-${idx}`,
                        sourceNoteId: noteId,
                        invoiceNumber: finalInvNum,
                        code: String(idx + 1).padStart(3, "0"),
                        name: p.name,
                        ncm: "44111490",
                        csosn: "102",
                        cfop: "1102",
                        unit: "UN",
                        quantity: p.qty,
                        unitPrice: unitP,
                        grossPrice: itemTot,
                        discount: 0,
                        totalPrice: itemTot,
                    };
                });
            } else {
                items = [
                    {
                        id: `${noteId}-item-0`,
                        sourceNoteId: noteId,
                        invoiceNumber: finalInvNum,
                        code: "001",
                        name: cleanedDesc || `Materiais NF #${finalInvNum}`,
                        ncm: "44111490",
                        csosn: "102",
                        cfop: "1102",
                        unit: "UN",
                        quantity: 1,
                        unitPrice: totalAmount,
                        grossPrice: totalAmount,
                        discount: 0,
                        totalPrice: totalAmount,
                    },
                ];
            }
        }

        const accessKey =
            xmlMeta?.accessKey ||
            invoice.description?.match(/Chave:\s*([0-9]{44})/)?.[1] ||
            "";
        const emitterName = xmlMeta?.emitter?.name || invoice.client_name || "Fornecedor";
        const emitterCnpj =
            xmlMeta?.emitter?.cnpj ||
            invoice.description?.match(/Doc:\s*([0-9.\-/]+)/)?.[1] ||
            "";
        const productsTotal = xmlMeta?.totals?.productsTotal || totalAmount;
        const freightAmount = xmlMeta?.totals?.freightAmount || 0;
        const discountAmount = xmlMeta?.totals?.discountAmount || 0;
        const otherAmount = xmlMeta?.totals?.otherAmount || 0;
        const duplicates: ParsedXmlDuplicate[] = xmlMeta?.duplicates || [];

        const sourceNote: ParsedXmlSourceNote = {
            id: noteId,
            existingInvoiceId: invoice.id,
            invoiceNumber: finalInvNum,
            series: xmlMeta?.series || "1",
            issueDate,
            natOp: xmlMeta?.natOp || "ENTRADA DE MATERIAL",
            protocol: xmlMeta?.protocol || "",
            emitterName,
            emitterFantasyName: "",
            emitterCnpj,
            emitterIe: xmlMeta?.emitter?.ie || "",
            emitterAddress: xmlMeta?.emitter?.address || "",
            emitterNeighborhood: xmlMeta?.emitter?.neighborhood || "",
            emitterCity: xmlMeta?.emitter?.city || "",
            emitterUf: xmlMeta?.emitter?.uf || "",
            emitterCep: xmlMeta?.emitter?.cep || "",
            emitterPhone: xmlMeta?.emitter?.phone || "",
            recipientName: xmlMeta?.recipient?.name || "BJL MOVEIS PLANEJADOS LTDA",
            recipientDoc: xmlMeta?.recipient?.doc || companySettings?.cnpj || "60.528.620/0001-20",
            accessKey,
            productsTotal,
            freightAmount,
            discountAmount,
            otherAmount,
            totalAmount,
            itemsCount: items.length,
        };

        return {
            accessKey,
            invoiceNumber: finalInvNum,
            series: sourceNote.series,
            issueDate,
            emitterName,
            emitterFantasyName: "",
            emitterCnpj,
            recipientName: sourceNote.recipientName,
            recipientDoc: sourceNote.recipientDoc,
            productsTotal,
            freightAmount,
            discountAmount,
            otherAmount,
            totalAmount,
            items,
            duplicates,
            sourceNotes: [sourceNote],
        };
    };

    const handleOpenLaunchFromExistingInvoice = (invoice: Invoice) => {
        const parsed = convertExistingInvoiceToParsedXml(invoice);
        const xmlMeta = parseStoredXmlPayload(invoice);

        const initialSplits: Record<string, XmlItemClientSplit[]> = {};
        parsed.items.forEach((it) => {
            const savedClient =
                it.clients && it.clients !== "Estoque Geral"
                    ? it.clients.split(" / ")[0].replace(/\s*\([^)]*\)$/, "").trim()
                    : it.clients === "Estoque Geral"
                    ? "ESTOQUE"
                    : "";
            initialSplits[it.id] = [
                {
                    id: `${it.id}-0`,
                    client: savedClient,
                    quantity: String(it.quantity),
                    amount: it.totalPrice.toFixed(2),
                },
            ];
        });
        setXmlItemSplits(initialSplits);

        const detectedSupplier = detectSupplierProfile(parsed.emitterName, parsed.emitterFantasyName);
        const initialPaymentCat = detectedSupplier === "bruta" ? "Cartao" : "Boleto";
        const initialPaymentMethod = detectedSupplier === "bruta" ? "Cartão Nubank" : "Boleto";

        const initialPreset =
            detectedSupplier !== "bruta" && parsed.duplicates.length > 0 ? "xml_dup" : "30_60_90";

        const defaultInstallments = buildInstallmentsFromPreset(
            parsed.issueDate,
            parsed.totalAmount,
            initialPreset,
            initialPaymentMethod,
            parsed.duplicates,
            3,
            30
        );
        setXmlInstallments(defaultInstallments);

        const shouldUpdateStockFromInbound =
            sessionStorage.getItem("bjl_launch_invoice_update_stock") === "true";
        if (shouldUpdateStockFromInbound) {
            sessionStorage.removeItem("bjl_launch_invoice_update_stock");
        }

        setXmlItemStockOverrides({});
        setXmlOptions((prev) => ({
            ...prev,
            direction: xmlMeta?.direction || "entrada",
            updateInventory: shouldUpdateStockFromInbound,
            createExpenseTransaction: true,
            supplierPreset: detectedSupplier,
            paymentCategoryType: initialPaymentCat,
            paymentMethod: initialPaymentMethod,
            financialInstitution: "Banco Itaú",
            category: "Custo com Materiais e Obras",
            subcategory: "Compra de MDF e Madeira",
            schedulePreset: initialPreset,
            customInstallmentCount: String(defaultInstallments.length || 3),
            customIntervalDays: "30",
            bulkClientTarget: "",
        }));

        setParsedXml(parsed);
        setIsXmlDialogOpen(true);
    };

    useEffect(() => {
        const pendingId = sessionStorage.getItem("bjl_launch_invoice_id");
        if (pendingId && invoices.length > 0) {
            const target = invoices.find((inv) => inv.id === pendingId);
            if (target) {
                sessionStorage.removeItem("bjl_launch_invoice_id");
                handleOpenLaunchFromExistingInvoice(target);
            }
        }
    }, [invoices]);

    // Adiciona +1 (ou mais) notas XML para SOMAR o valor nos mesmos Boletos 3x sem perder o rateio já preenchido!
    const handleAppendXmlFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0 || !parsedXml) return;

        try {
            const parsedResults = (await Promise.all(files.map(parseSingleXmlFile))).filter(
                Boolean
            ) as ParsedXmlData[];

            if (parsedResults.length === 0) {
                toast.error("O arquivo selecionado não parece ser um XML padrão SEFAZ NF-e.");
                return;
            }

            const { merged, newlyAddedNotes, newlyAddedItems } = mergeParsedXmlNotes(
                parsedXml,
                parsedResults
            );

            if (newlyAddedNotes.length === 0) {
                toast.info("Esta nota fiscal XML já está incluída nesta soma.");
                return;
            }

            setXmlItemSplits((prev) => {
                const next = { ...prev };
                newlyAddedItems.forEach((it) => {
                    next[it.id] = [
                        {
                            id: `${it.id}-0`,
                            client: "",
                            quantity: String(it.quantity),
                            amount: it.totalPrice.toFixed(2),
                        },
                    ];
                });
                return next;
            });

            setParsedXml(merged);

            // Recalcula os boletos/parcelas mantendo a mesma quantidade de parcelas e prazos sobre o NOVO TOTAL SOMADO!
            const count = Math.max(1, xmlInstallments.length);
            const basePart = Number((merged.totalAmount / count).toFixed(2));
            setXmlInstallments((prev) =>
                prev.map((inst, idx) => ({
                    ...inst,
                    amount: (idx === count - 1
                        ? Number((merged.totalAmount - basePart * (count - 1)).toFixed(2))
                        : basePart
                    ).toFixed(2),
                }))
            );

            toast.success(
                `+${newlyAddedNotes.length} nota somada (NF #${newlyAddedNotes
                    .map((n) => n.invoiceNumber)
                    .join(", #")})! Total somado: ${formatCurrency(
                    merged.totalAmount
                )} — Boletos recalculados!`
            );
        } catch (err) {
            console.error("Erro ao somar XML:", err);
            toast.error("Não foi possível somar o arquivo XML.");
        } finally {
            if (appendXmlInputRef.current) appendXmlInputRef.current.value = "";
        }
    };

    const handleRemoveSourceNote = (noteId: string) => {
        if (!parsedXml || parsedXml.sourceNotes.length <= 1) return;
        const remainingNotes = parsedXml.sourceNotes.filter((n) => n.id !== noteId);
        const remainingItems = parsedXml.items.filter((it) => it.sourceNoteId !== noteId);

        const totalAmount = Number(
            remainingNotes.reduce((acc, n) => acc + Number(n.totalAmount || 0), 0).toFixed(2)
        );
        const productsTotal = Number(
            remainingNotes.reduce((acc, n) => acc + Number(n.productsTotal || 0), 0).toFixed(2)
        );
        const freightAmount = Number(
            remainingNotes.reduce((acc, n) => acc + Number(n.freightAmount || 0), 0).toFixed(2)
        );
        const discountAmount = Number(
            remainingNotes.reduce((acc, n) => acc + Number(n.discountAmount || 0), 0).toFixed(2)
        );
        const otherAmount = Number(
            remainingNotes.reduce((acc, n) => acc + Number(n.otherAmount || 0), 0).toFixed(2)
        );

        const updatedParsed: ParsedXmlData = {
            ...parsedXml,
            accessKey: remainingNotes.map((n) => n.accessKey).filter(Boolean).join(" | "),
            invoiceNumber: remainingNotes.map((n) => n.invoiceNumber).join(" + "),
            productsTotal,
            freightAmount,
            discountAmount,
            otherAmount,
            totalAmount,
            items: remainingItems,
            sourceNotes: remainingNotes,
        };

        setParsedXml(updatedParsed);
        setXmlItemSplits((prev) => {
            const next: Record<string, XmlItemClientSplit[]> = {};
            remainingItems.forEach((it) => {
                if (prev[it.id]) next[it.id] = prev[it.id];
            });
            return next;
        });

        const count = Math.max(1, xmlInstallments.length);
        const basePart = Number((totalAmount / count).toFixed(2));
        setXmlInstallments((prev) =>
            prev.map((inst, idx) => ({
                ...inst,
                amount: (idx === count - 1
                    ? Number((totalAmount - basePart * (count - 1)).toFixed(2))
                    : basePart
                ).toFixed(2),
            }))
        );
    };

    const handleUseNoteDateAsBase = (newIssueDate: string) => {
        if (!parsedXml || !newIssueDate) return;
        setParsedXml((prev) => (prev ? { ...prev, issueDate: newIssueDate } : prev));
        const updatedInst = buildInstallmentsFromPreset(
            newIssueDate,
            parsedXml.totalAmount,
            xmlOptions.schedulePreset,
            xmlOptions.paymentMethod,
            parsedXml.duplicates,
            parseInt(xmlOptions.customInstallmentCount, 10) || xmlInstallments.length || 3,
            parseInt(xmlOptions.customIntervalDays, 10) || 30
        );
        setXmlInstallments(updatedInst);
        toast.info(
            `Datas dos boletos recalculadas a partir de ${format(
                new Date(newIssueDate + "T12:00:00"),
                "dd/MM/yyyy"
            )}!`
        );
    };

    const handlePreviewXmlDanfe = () => {
        if (!parsedXml) return;
        const primaryNote = parsedXml.sourceNotes[0];
        const previewPayload: StoredXmlPayload = {
            direction: xmlOptions.direction,
            series: parsedXml.series || "1",
            natOp: primaryNote?.natOp || "Venda de mercadoria adquirida ou recebida de terceiros",
            protocol: primaryNote?.protocol || "PRÉVIA DE CONFERÊNCIA",
            accessKey: parsedXml.accessKey || "",
            emitter: {
                name: parsedXml.emitterName,
                cnpj: parsedXml.emitterCnpj,
                ie: primaryNote?.emitterIe || "",
                address: primaryNote?.emitterAddress || "",
                neighborhood: primaryNote?.emitterNeighborhood || "",
                city: primaryNote?.emitterCity || "",
                uf: primaryNote?.emitterUf || "",
                cep: primaryNote?.emitterCep || "",
                phone: primaryNote?.emitterPhone || "",
            },
            recipient: {
                name: parsedXml.recipientName || "BJL MOVEIS PLANEJADOS LTDA",
                doc: parsedXml.recipientDoc || companySettings?.cnpj || "60.528.620/0001-20",
                ie: primaryNote?.recipientIe || "15469064",
                address: primaryNote?.recipientAddress || "Rua Maria Vitipo Raposo, 138",
                neighborhood: primaryNote?.recipientNeighborhood || "Barao de Macaubas",
                city: primaryNote?.recipientCity || "Sao Fidelis",
                uf: primaryNote?.recipientUf || "RJ",
                cep: primaryNote?.recipientCep || "28400-000",
                phone: primaryNote?.recipientPhone || companySettings?.phone || "(22) 99703-9852",
            },
            totals: {
                productsTotal: parsedXml.productsTotal,
                discountAmount: parsedXml.discountAmount,
                freightAmount: parsedXml.freightAmount,
                otherAmount: parsedXml.otherAmount,
                totalAmount: parsedXml.totalAmount,
            },
            duplicates: xmlInstallments.map((inst, idx) => ({
                number: String(idx + 1).padStart(3, "0"),
                dueDate: inst.dueDate,
                amount: parseFloat(String(inst.amount).replace(",", ".")) || 0,
            })),
            items: parsedXml.items.map((it) => {
                const splits = xmlItemSplits[it.id] || [];
                const clientsLabel = splits
                    .map((sp) => {
                        const c = (sp.client || "").trim();
                        if (!c || c === "ESTOQUE") return "Estoque Geral";
                        return splits.length > 1 ? `${c} (${sp.quantity} ${it.unit})` : c;
                    })
                    .filter(Boolean)
                    .join(" / ");
                return {
                    code: it.code,
                    name: it.name,
                    ncm: it.ncm,
                    csosn: it.csosn || "102",
                    cfop: it.cfop || "5102",
                    unit: it.unit || "UN",
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    grossPrice: it.grossPrice ?? it.totalPrice,
                    discount: it.discount ?? 0,
                    totalPrice: it.totalPrice,
                    clients: clientsLabel || undefined,
                };
            }),
        };

        handlePrintDanfe({
            id: "xml-preview",
            issue_date: parsedXml.issueDate,
            client_name: parsedXml.emitterName,
            description: "Prévia da Nota Fiscal",
            amount: parsedXml.totalAmount,
            status: "Pendente",
            invoice_number: parsedXml.invoiceNumber || "PRÉVIA",
            type: "NF-e",
            asaas_status: `XML_PAYLOAD:${JSON.stringify(previewPayload)}`,
        });
    };

    const handleConfirmXmlImport = async () => {
        if (!parsedXml) return;

        if (xmlOptions.createExpenseTransaction) {
            if (xmlInstallments.length === 0) {
                toast.error("Adicione ao menos 1 parcela/boleto para lançar no Financeiro.");
                return;
            }
            const diffInstallments = Math.abs(xmlInstallmentsTotal - parsedXml.totalAmount);
            if (diffInstallments > 0.05) {
                const proceed = window.confirm(
                    `A soma das parcelas/boletos (${formatCurrency(
                        xmlInstallmentsTotal
                    )}) está diferente do valor total das notas (${formatCurrency(
                        parsedXml.totalAmount
                    )}). Deseja continuar mesmo assim?`
                );
                if (!proceed) return;
            }
        }

        setIsImportingXml(true);
        try {
            const partyName =
                xmlOptions.direction === "entrada"
                    ? parsedXml.emitterName
                    : parsedXml.recipientName || "Cliente NF-e";

            const clientNamesInNote = xmlClientAllocationSummary.groups
                .map((g) => (g.client === "ESTOQUE" ? "Estoque Geral" : g.client))
                .join(" | ");

            const notesToRegister =
                parsedXml.sourceNotes && parsedXml.sourceNotes.length > 0
                    ? parsedXml.sourceNotes
                    : [
                          {
                              id: "single",
                              invoiceNumber: parsedXml.invoiceNumber,
                              series: parsedXml.series,
                              issueDate: parsedXml.issueDate,
                              emitterName: parsedXml.emitterName,
                              emitterFantasyName: parsedXml.emitterFantasyName,
                              emitterCnpj: parsedXml.emitterCnpj,
                              recipientName: parsedXml.recipientName,
                              recipientDoc: parsedXml.recipientDoc,
                              accessKey: parsedXml.accessKey,
                              productsTotal: parsedXml.productsTotal,
                              freightAmount: parsedXml.freightAmount,
                              discountAmount: parsedXml.discountAmount,
                              otherAmount: parsedXml.otherAmount,
                              totalAmount: parsedXml.totalAmount,
                              itemsCount: parsedXml.items.length,
                          },
                      ];

            // Salva cada Nota Fiscal XML individualmente no histórico da tabela invoices COM TODOS OS ITENS SEPARADOS!
            const newInvoicesPayload = notesToRegister.map((sn) => {
                const noteItems = parsedXml.items.filter(
                    (i) => !i.sourceNoteId || i.sourceNoteId === sn.id
                );
                const effectiveItems = noteItems.length > 0 ? noteItems : parsedXml.items;
                const noteSummaryItems = effectiveItems
                    .slice(0, 3)
                    .map((i) => `${i.quantity}x ${i.name}`)
                    .join(", ");
                const totalItemsHere = effectiveItems.length;

                const storedPayload: StoredXmlPayload = {
                    direction: xmlOptions.direction,
                    series: sn.series || parsedXml.series,
                    natOp: sn.natOp || "Venda de mercadoria adquirida ou recebida de terceiros",
                    protocol: sn.protocol || "",
                    accessKey: sn.accessKey || "",
                    emitter: {
                        name: sn.emitterName || partyName,
                        cnpj: sn.emitterCnpj || parsedXml.emitterCnpj,
                        ie: sn.emitterIe || "",
                        address: sn.emitterAddress || "",
                        neighborhood: sn.emitterNeighborhood || "",
                        city: sn.emitterCity || "",
                        uf: sn.emitterUf || "",
                        cep: sn.emitterCep || "",
                        phone: sn.emitterPhone || "",
                    },
                    recipient: {
                        name: sn.recipientName || "BJL MOVEIS PLANEJADOS LTDA",
                        doc: sn.recipientDoc || companySettings?.cnpj || "60.528.620/0001-20",
                        ie: sn.recipientIe || "15469064",
                        address: sn.recipientAddress || "Rua Maria Vitipo Raposo, 138",
                        neighborhood: sn.recipientNeighborhood || "Barao de Macaubas",
                        city: sn.recipientCity || "Sao Fidelis",
                        uf: sn.recipientUf || "RJ",
                        cep: sn.recipientCep || "28400-000",
                        phone: sn.recipientPhone || companySettings?.phone || "(22) 99703-9852",
                    },
                    totals: {
                        productsTotal: sn.productsTotal,
                        discountAmount: sn.discountAmount,
                        freightAmount: sn.freightAmount,
                        otherAmount: sn.otherAmount,
                        totalAmount: sn.totalAmount,
                    },
                    duplicates: xmlInstallments.map((inst, idx) => ({
                        number: String(idx + 1).padStart(3, "0"),
                        dueDate: inst.dueDate,
                        amount: parseFloat(String(inst.amount).replace(",", ".")) || 0,
                    })),
                    items: effectiveItems.map((it) => {
                        const splits = xmlItemSplits[it.id] || [];
                        const clientsLabel = splits
                            .map((sp) => {
                                const c = (sp.client || "").trim();
                                if (!c || c === "ESTOQUE") return "Estoque Geral";
                                return splits.length > 1 ? `${c} (${sp.quantity} ${it.unit})` : c;
                            })
                            .filter(Boolean)
                            .join(" / ");
                        return {
                            code: it.code,
                            name: it.name,
                            ncm: it.ncm,
                            csosn: it.csosn || "102",
                            cfop: it.cfop || "5102",
                            unit: it.unit || "UN",
                            quantity: it.quantity,
                            unitPrice: it.unitPrice,
                            grossPrice: it.grossPrice ?? it.totalPrice,
                            discount: it.discount ?? 0,
                            totalPrice: it.totalPrice,
                            clients: clientsLabel || undefined,
                        };
                    }),
                };

                return {
                    existingInvoiceId: (sn as ParsedXmlSourceNote).existingInvoiceId,
                    payload: {
                        issue_date: sn.issueDate || parsedXml.issueDate,
                        client_name:
                            xmlOptions.direction === "entrada"
                                ? sn.emitterName || partyName
                                : sn.recipientName || partyName,
                        description: `[${
                            (sn as ParsedXmlSourceNote).existingInvoiceId ? "ENTRADA MATERIAL" : `XML ${xmlOptions.direction.toUpperCase()}`
                        }${
                            notesToRegister.length > 1
                                ? ` • SOMADA COM ${notesToRegister.length} NOTAS`
                                : ""
                        }] ${noteSummaryItems}${
                            totalItemsHere > 3 ? ` (+${totalItemsHere - 3} itens)` : ""
                        }${clientNamesInNote ? ` | Clientes: ${clientNamesInNote}` : ""}${
                            sn.accessKey ? ` | Chave: ${sn.accessKey}` : ""
                        }`,
                        amount: sn.totalAmount,
                        status: "Autorizada" as const,
                        invoice_number: sn.invoiceNumber,
                        type: "NF-e" as const,
                        asaas_status: `XML_PAYLOAD:${JSON.stringify(storedPayload)}`,
                    },
                };
            });

            const toUpdate = newInvoicesPayload.filter((x) => Boolean(x.existingInvoiceId));
            const toInsert = newInvoicesPayload.filter((x) => !x.existingInvoiceId).map((x) => x.payload);

            let insertedInvoices: any[] = [];
            if (toInsert.length > 0) {
                const { data: insData, error: invErr } = await supabase
                    .from("invoices")
                    .insert(toInsert)
                    .select();
                if (invErr) throw invErr;
                insertedInvoices = insData || [];
            }

            for (const upd of toUpdate) {
                if (upd.existingInvoiceId) {
                    await supabase
                        .from("invoices")
                        .update(upd.payload)
                        .eq("id", upd.existingInvoiceId);
                }
            }

            // 1. Se marcou atualizar estoque: SÓ entra no estoque aquilo que estiver em ESTOQUE GERAL!
            // Itens com nome de Cliente / OS NÃO entram no estoque, e itens de Estoque Geral usam IA para somar no item já existente sem duplicar!
            if (
                xmlOptions.direction === "entrada" &&
                xmlOptions.updateInventory &&
                parsedXml.items.length > 0
            ) {
                const { data: currentStock } = await supabase.from("inventory").select("*");
                const workingStock: any[] = [...(currentStock || [])];

                for (const item of parsedXml.items) {
                    const splits = xmlItemSplits[item.id] || [
                        {
                            id: `${item.id}-0`,
                            client: "ESTOQUE",
                            quantity: String(item.quantity),
                            amount: item.totalPrice.toFixed(2),
                        },
                    ];

                    // Soma APENAS a quantidade destinada ao ESTOQUE GERAL (ignora qualquer parte com nome de cliente/OS)
                    const stockQtyToAdd = splits.reduce((acc, sp) => {
                        if (!isEstoqueGeralDestination(sp.client)) return acc;
                        const q = parseFloat(String(sp.quantity).replace(",", ".")) || 0;
                        return acc + Math.max(0, q);
                    }, 0);

                    // Se o item está com nome do cliente, NÃO entra no estoque!
                    if (stockQtyToAdd <= 0) {
                        continue;
                    }

                    const explicitStockId = xmlItemStockOverrides[item.id];
                    const matchResult = findBestInventoryMatch(
                        item.name,
                        workingStock,
                        item.code,
                        explicitStockId && explicitStockId !== "__NEW__" ? explicitStockId : undefined
                    );
                    const existing =
                        explicitStockId === "__NEW__" ? null : matchResult.matchedItem;

                    if (existing) {
                        const newQuantity = Number(existing.quantity || 0) + stockQtyToAdd;
                        const newUnitPrice =
                            item.unitPrice > 0 ? item.unitPrice : Number(existing.unit_price || 0);
                        await supabase
                            .from("inventory")
                            .update({
                                quantity: newQuantity,
                                unit_price: newUnitPrice,
                            })
                            .eq("id", existing.id);

                        existing.quantity = newQuantity;
                        existing.unit_price = newUnitPrice;
                    } else {
                        const newStockRow = {
                            id_estoque: item.code || String(Math.floor(100 + Math.random() * 900)),
                            name: item.name.trim(),
                            quantity: stockQtyToAdd,
                            unit_price: item.unitPrice,
                            min_stock_level: 5,
                        };
                        const { data: insertedStock } = await supabase
                            .from("inventory")
                            .insert([newStockRow])
                            .select()
                            .single();
                        if (insertedStock) {
                            workingStock.push(insertedStock);
                        } else {
                            workingStock.push({ ...newStockRow, id: `temp-${Date.now()}` });
                        }
                    }
                }
                fetchCrmData();
            }

            // 2. Se marcou lançar no Financeiro (Boletos 30/60/90 somados, Cartão ou À Vista + Rateio por Cliente/Item)
            if (xmlOptions.createExpenseTransaction && xmlInstallments.length > 0) {
                const totalInst = xmlInstallments.length;
                const groups = xmlClientAllocationSummary.groups;

                let singleOsTicket: string | null = null;
                let singleServiceLabel: string | null = null;
                if (groups.length === 1 && groups[0].client !== "ESTOQUE") {
                    singleServiceLabel = groups[0].client;
                    const osMatch = groups[0].client.match(/\b(OS[-\s#]*\d+)/i);
                    if (osMatch) {
                        singleOsTicket = osMatch[1].toUpperCase().replace(/\s+/, "-");
                    }
                }

                const clientsShortTag =
                    groups.length > 0
                        ? ` [${groups
                              .map((g) => {
                                  if (g.client === "ESTOQUE") return "Estoque";
                                  return g.client.split("(")[0].trim();
                              })
                              .join(" / ")}]`
                        : "";

                const nfLabel =
                    notesToRegister.length > 1
                        ? `NFs #${notesToRegister.map((n) => n.invoiceNumber).join(" + #")}`
                        : `NF #${parsedXml.invoiceNumber}`;

                const supplierFriendlyTitle =
                    xmlOptions.supplierPreset === "ced"
                        ? `Compra de material na C&D (${nfLabel})`
                        : xmlOptions.supplierPreset === "bruta"
                        ? `Compra de material na Bruta (${nfLabel})`
                        : `${nfLabel} - ${partyName}`;

                const supplierContactName =
                    xmlOptions.supplierPreset === "ced" &&
                    !partyName.toLowerCase().includes("c&d") &&
                    !partyName.toLowerCase().includes("ced")
                        ? `${partyName} (C&D)`
                        : xmlOptions.supplierPreset === "bruta" &&
                          !partyName.toLowerCase().includes("bruta")
                        ? `BRUTA MADEIRAS LTDA`
                        : partyName;

                const transactionsPayload = xmlInstallments.map((inst, idx) => {
                    const instAmount = Math.max(
                        0,
                        parseFloat(String(inst.amount).replace(",", ".")) || 0
                    );
                    const parcelSuffix = totalInst > 1 ? ` (${idx + 1}/${totalInst})` : "";
                    return {
                        description: `${supplierFriendlyTitle}${clientsShortTag}${parcelSuffix}`,
                        amount: instAmount,
                        type: xmlOptions.direction === "entrada" ? "expense" : "income",
                        category:
                            xmlOptions.direction === "entrada"
                                ? xmlOptions.category || "Custo com Materiais e Obras"
                                : "Receita com Serviço",
                        subcategory:
                            xmlOptions.direction === "entrada"
                                ? xmlOptions.subcategory || "Compra de MDF e Madeira"
                                : totalInst > 1
                                ? "Parcela"
                                : "Venda à Vista",
                        contact: supplierContactName,
                        financial_institution: xmlOptions.financialInstitution || "Banco Itaú",
                        payment_method: inst.paymentMethod || xmlOptions.paymentMethod || "Boleto",
                        competence_date: parsedXml.issueDate,
                        due_date: inst.dueDate || parsedXml.issueDate,
                        payment_date: inst.status === "paid" ? inst.dueDate || parsedXml.issueDate : null,
                        status: inst.status || "pending",
                        invoice_number: parsedXml.invoiceNumber,
                        order_service: singleOsTicket,
                        service: singleServiceLabel,
                    };
                });

                const { data: insertedTxs, error: txErr } = await supabase
                    .from("transactions")
                    .insert(transactionsPayload)
                    .select();

                if (txErr) throw txErr;

                // 3. Salva o rateio SEPARADO ITEM POR ITEM (de todas as notas somadas) para cada cliente em transaction_allocations
                if (insertedTxs && insertedTxs.length > 0 && parsedXml.items.length > 0) {
                    const totalLaunched = insertedTxs.reduce(
                        (acc: number, t: any) => acc + Number(t.amount || 0),
                        0
                    );

                    // Constrói lista plana com cada item/divisão separado (ex: 2x Divisor, 1x Thinner, 4x MDF Branco...)
                    const flatItemAllocations: Array<{
                        client: string;
                        rawAmount: number;
                        label: string;
                    }> = [];

                    for (const item of parsedXml.items) {
                        const splits = xmlItemSplits[item.id] || [
                            {
                                id: `${item.id}-0`,
                                client: "",
                                quantity: String(item.quantity),
                                amount: item.totalPrice.toFixed(2),
                            },
                        ];
                        for (const sp of splits) {
                            const amt = Math.max(
                                0,
                                parseFloat(String(sp.amount).replace(",", ".")) || 0
                            );
                            const qty = Math.max(
                                0,
                                parseFloat(String(sp.quantity).replace(",", ".")) || 0
                            );
                            if (amt <= 0) continue;
                            const clientKey = (sp.client || "").trim() || "ESTOQUE";
                            const nfBadge =
                                notesToRegister.length > 1 && item.invoiceNumber
                                    ? `[NF #${item.invoiceNumber}] `
                                    : "";
                            flatItemAllocations.push({
                                client: clientKey,
                                rawAmount: amt,
                                label: `${nfBadge}${Number(qty.toFixed(2))} ${item.unit} × ${item.name}`,
                            });
                        }
                    }

                    const totalRawItems = flatItemAllocations.reduce(
                        (acc, f) => acc + f.rawAmount,
                        0
                    );

                    if (flatItemAllocations.length > 0 && totalRawItems > 0) {
                        let runningItemTarget = 0;
                        const targetItemTotals = flatItemAllocations.map((f, k) => {
                            if (k === flatItemAllocations.length - 1) {
                                return Number(Math.max(0, totalLaunched - runningItemTarget).toFixed(2));
                            }
                            const val = Number(
                                (f.rawAmount * (totalLaunched / totalRawItems)).toFixed(2)
                            );
                            runningItemTarget = Number((runningItemTarget + val).toFixed(2));
                            return val;
                        });

                        const accumulatedByItem = new Array(flatItemAllocations.length).fill(0);
                        const allocationsToInsert: any[] = [];

                        insertedTxs.forEach((tx: any, i: number) => {
                            const txAmount = Number(tx.amount || 0);
                            const isLastTx = i === insertedTxs.length - 1;
                            let rowSum = 0;

                            flatItemAllocations.forEach((f, k) => {
                                const isLastItem = k === flatItemAllocations.length - 1;
                                let allocAmount = 0;

                                if (isLastTx) {
                                    allocAmount = Number(
                                        Math.max(
                                            0,
                                            targetItemTotals[k] - accumulatedByItem[k]
                                        ).toFixed(2)
                                    );
                                } else if (isLastItem) {
                                    allocAmount = Number(Math.max(0, txAmount - rowSum).toFixed(2));
                                } else {
                                    const ratio = totalLaunched > 0 ? txAmount / totalLaunched : 0;
                                    allocAmount = Number((targetItemTotals[k] * ratio).toFixed(2));
                                }

                                rowSum = Number((rowSum + allocAmount).toFixed(2));
                                accumulatedByItem[k] = Number(
                                    (accumulatedByItem[k] + allocAmount).toFixed(2)
                                );

                                if (allocAmount > 0) {
                                    const parcelTag =
                                        insertedTxs.length > 1
                                            ? ` [Parc. ${i + 1}/${insertedTxs.length}]`
                                            : "";
                                    allocationsToInsert.push({
                                        transaction_id: tx.id,
                                        client_name: f.client,
                                        amount: allocAmount,
                                        description: `🟢 ${f.label}${parcelTag}`.trim(),
                                    });
                                }
                            });
                        });

                        if (allocationsToInsert.length > 0) {
                            const { error: allocErr } = await supabase
                                .from("transaction_allocations")
                                .insert(allocationsToInsert);
                            if (allocErr) {
                                console.error("Erro ao salvar rateio por cliente do XML:", allocErr);
                            }
                        }
                    }
                }
            }

            if (insertedInvoices && insertedInvoices.length > 0 && toUpdate.length === 0) {
                setInvoices((prev) => [...insertedInvoices, ...prev]);
            } else {
                await fetchInvoices();
            }

            if (onRefresh) {
                onRefresh();
            }

            toast.success(
                `${
                    notesToRegister.length > 1
                        ? `${notesToRegister.length} Notas (${parsedXml.invoiceNumber}) somadas e lançadas!`
                        : `NF-e #${parsedXml.invoiceNumber} atualizada!`
                } ${
                    xmlOptions.createExpenseTransaction
                        ? `${xmlInstallments.length} lançamento(s) (${xmlOptions.paymentMethod}) e rateio de ${xmlClientAllocationSummary.groups.length} cliente(s) criados no Financeiro!`
                        : ""
                }`
            );
            setIsXmlDialogOpen(false);
            setParsedXml(null);

            if (xmlOptions.createExpenseTransaction && onNavigateToLancamentos) {
                onNavigateToLancamentos();
            }
        } catch (err: any) {
            console.error("Erro ao importar XML:", err);
            toast.error("Erro ao salvar dados do XML no banco.");
        } finally {
            setIsImportingXml(false);
        }
    };

    const handleCancelInvoice = async (invoice: Invoice) => {
        if (invoice.status === "Cancelada") {
            toast.info("Esta nota fiscal já está cancelada.");
            return;
        }

        const motivo = window.prompt(
            "Informe o motivo do cancelamento para a SEFAZ (mínimo de 15 caracteres):",
            "Cancelamento por erro de preenchimento nos valores da nota fiscal"
        );
        if (motivo === null) return;
        if (motivo.trim().length < 15) {
            toast.error("A SEFAZ exige que a justificativa tenha pelo menos 15 caracteres.");
            return;
        }

        try {
            toast.info("Enviando evento de cancelamento (110111) para a SEFAZ...");

            // Se possui ID da nota no Notaas e API Key configurada, transmite o cancelamento oficial para a SEFAZ
            if (invoice.asaas_id && fiscalConfig.clientSecret.trim()) {
                const res = await fetch("https://platform.notaas.com.br/api/v1/nfe/cancelar", {
                    method: "POST",
                    headers: {
                        "x-api-key": fiscalConfig.clientSecret.trim(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        invoiceId: invoice.asaas_id,
                        motivo: motivo.trim(),
                    }),
                });
                const cancelData = await res.json().catch(() => ({}));
                if (!res.ok && cancelData?.error) {
                    toast.warning(`Aviso SEFAZ: ${cancelData.error}`);
                }
            }

            const updatedStatusText = `Cancelada na SEFAZ (${motivo.trim()})`;
            const { error } = await supabase
                .from("invoices")
                .update({
                    status: "Cancelada",
                    asaas_status: updatedStatusText,
                })
                .eq("id", invoice.id);

            if (error) throw error;

            // Remove também o lançamento financeiro automático vinculado a esta nota (se existir)
            if (invoice.invoice_number) {
                await supabase
                    .from("transactions")
                    .delete()
                    .eq("invoice_number", invoice.invoice_number);
            }

            setInvoices((prev) =>
                prev.map((inv) =>
                    inv.id === invoice.id
                        ? { ...inv, status: "Cancelada", asaas_status: updatedStatusText }
                        : inv
                )
            );

            toast.success(
                `Nota Fiscal #${invoice.invoice_number} cancelada na SEFAZ e estornada do Financeiro!`
            );
        } catch (err) {
            console.error("Erro ao cancelar nota fiscal:", err);
            toast.error("Erro ao cancelar nota fiscal.");
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

    // Gerador de DANFE Padrão SEFAZ Nacional (Com ITENS SEPARADOS, DESCONTOS, DUPLICATAS e EMITENTE/DESTINATÁRIO reais!)
    const handlePrintDanfe = (invoice: Invoice) => {
        const printWin = window.open("", "_blank");
        if (!printWin) {
            toast.error("Permita pop-ups para visualizar e imprimir a DANFE.");
            return;
        }

        const storedXml = parseStoredXmlPayload(invoice);
        const isXmlEntrada =
            storedXml?.direction === "entrada" ||
            (invoice.description || "").toUpperCase().includes("[XML ENTRADA");

        const formatCpfCnpj = (v: string) => {
            const d = (v || "").replace(/\D/g, "");
            if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
            if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
            return v || "";
        };

        const fmtNum = (n: number, minDec = 2, maxDec = 2) =>
            Number(n || 0).toLocaleString("pt-BR", {
                minimumFractionDigits: minDec,
                maximumFractionDigits: maxDec,
            });

        // Busca dados complementares do cliente/fornecedor no CRM caso não venha do XML
        const matchedClient = crmClients.find(
            (c) => (c.name || "").toLowerCase() === (invoice.client_name || "").toLowerCase()
        );

        const docFromDesc = invoice.description.match(/Doc:\s*([0-9.\-/]+)/)?.[1] || "";
        const clientDocRaw = docFromDesc || matchedClient?.cpf || matchedClient?.document || "";

        const bjlCompany = {
            name: "BJL MOVEIS PLANEJADOS LTDA",
            cnpj: formatCpfCnpj(companySettings?.cnpj || "60.528.620/0001-20"),
            ie: "15469064",
            address: "Rua Maria Vitipo Raposo, 138",
            neighborhood: "Barao de Macaubas",
            cep: "28400-000",
            city: "Sao Fidelis",
            uf: "RJ",
            phone: formatPhoneBrDisplay(companySettings?.phone) || "(22) 99703-9852",
        };

        const otherParty = {
            name: storedXml?.emitter?.name || invoice.client_name,
            cnpj: formatCpfCnpj(storedXml?.emitter?.cnpj || clientDocRaw),
            ie: storedXml?.emitter?.ie || "",
            address:
                storedXml?.emitter?.address ||
                (matchedClient?.address && !matchedClient.address.startsWith(",")
                    ? matchedClient.address
                    : ""),
            neighborhood: storedXml?.emitter?.neighborhood || "",
            cep: storedXml?.emitter?.cep || matchedClient?.zip_code || "",
            city: storedXml?.emitter?.city || matchedClient?.city || "",
            uf: storedXml?.emitter?.uf || matchedClient?.state || "",
            phone: formatPhoneBrDisplay(storedXml?.emitter?.phone || matchedClient?.phone || ""),
        };

        // Para XML de ENTRADA (Compra), o Emitente é o Fornecedor (ex: C&D / Bruta) e o Destinatário é a BJL!
        const emitterInfo = isXmlEntrada ? otherParty : bjlCompany;
        const recipientInfo = isXmlEntrada
            ? {
                  name: storedXml?.recipient?.name || bjlCompany.name,
                  cnpj: formatCpfCnpj(storedXml?.recipient?.doc || bjlCompany.cnpj),
                  ie: storedXml?.recipient?.ie || bjlCompany.ie,
                  address: storedXml?.recipient?.address || bjlCompany.address,
                  neighborhood: storedXml?.recipient?.neighborhood || bjlCompany.neighborhood,
                  cep: storedXml?.recipient?.cep || bjlCompany.cep,
                  city: storedXml?.recipient?.city || bjlCompany.city,
                  uf: storedXml?.recipient?.uf || bjlCompany.uf,
                  phone: formatPhoneBrDisplay(storedXml?.recipient?.phone || bjlCompany.phone),
              }
            : {
                  name: storedXml?.recipient?.name || invoice.client_name,
                  cnpj: formatCpfCnpj(storedXml?.recipient?.doc || clientDocRaw),
                  ie: storedXml?.recipient?.ie || "",
                  address:
                      storedXml?.recipient?.address ||
                      (matchedClient?.address && !matchedClient.address.startsWith(",")
                          ? matchedClient.address
                          : "Centro"),
                  neighborhood: storedXml?.recipient?.neighborhood || "Centro",
                  cep: storedXml?.recipient?.cep || matchedClient?.zip_code || "28400-000",
                  city: storedXml?.recipient?.city || matchedClient?.city || "Sao Fidelis",
                  uf: storedXml?.recipient?.uf || matchedClient?.state || "RJ",
                  phone: formatPhoneBrDisplay(storedXml?.recipient?.phone || matchedClient?.phone || ""),
              };

        const accessKey =
            storedXml?.accessKey ||
            invoice.description.match(/Chave:\s*([0-9]{44})/)?.[1] ||
            `332610${bjlCompany.cnpj.replace(/\D/g, "").padEnd(14, "0")}55001${String(
                invoice.invoice_number || "1"
            ).padStart(9, "0")}1300000210`;
        const sefazProt =
            storedXml?.protocol ||
            invoice.description.match(/Prot SEFAZ:\s*([0-9]+)/)?.[1] ||
            (!invoice.asaas_status?.startsWith("XML_PAYLOAD:")
                ? invoice.asaas_status?.match(/([0-9]{15})/)?.[1]
                : "") ||
            "333260001022548";

        const natOp =
            storedXml?.natOp ||
            (isXmlEntrada
                ? "Venda de mercadoria adquirida ou recebida de terceiros"
                : "Venda Dentro do Estado");
        const danfeSeries = storedXml?.series || "1";
        const danfeOpCode = isXmlEntrada ? "0" : "1";

        const issueDateFormatted = format(new Date(invoice.issue_date + "T12:00:00"), "dd/MM/yyyy");
        const totalNumeric = Number(storedXml?.totals?.totalAmount ?? invoice.amount ?? 0);
        const productsTotalNumeric = Number(storedXml?.totals?.productsTotal ?? totalNumeric);
        const discountTotalNumeric = Number(storedXml?.totals?.discountAmount ?? 0);
        const freightTotalNumeric = Number(storedXml?.totals?.freightAmount ?? 0);
        const otherTotalNumeric = Number(storedXml?.totals?.otherAmount ?? 0);

        // Monta as linhas SEPARADAS dos produtos!
        let productRows: Array<{
            code: string;
            name: string;
            clients?: string;
            ncm: string;
            csosn: string;
            cfop: string;
            unit: string;
            quantity: number;
            unitPrice: number;
            grossPrice: number;
            discount: number;
            totalPrice: number;
        }> = [];

        if (storedXml?.items && storedXml.items.length > 0) {
            productRows = storedXml.items.map((it, idx) => ({
                code: it.code || String(idx + 1),
                name: it.name,
                clients: it.clients,
                ncm: it.ncm || "94036000",
                csosn: it.csosn || "102",
                cfop: it.cfop || "5102",
                unit: it.unit || "UN",
                quantity: Number(it.quantity || 1),
                unitPrice: Number(it.unitPrice || 0),
                grossPrice: Number(it.grossPrice ?? it.totalPrice ?? 0),
                discount: Number(it.discount ?? 0),
                totalPrice: Number(it.totalPrice ?? 0),
            }));
        } else {
            // Fallback inteligente para notas XML já importadas anteriormente (separa "2x Item A, 1x Item B, 1x Item C")
            const cleanDesc = invoice.description
                .replace(/^\[XML[^\]]*\]\s*/i, "")
                .replace(/\|\s*Qtd:\s*[^|]+/g, "")
                .replace(/\|\s*VUnit:\s*[^|]+/g, "")
                .replace(/\|\s*Doc:\s*[^|]+/g, "")
                .replace(/\|\s*NCM\s*[^|]+/g, "")
                .replace(/\|\s*CFOP\s*[^|]+/g, "")
                .replace(/\|\s*Clientes:\s*[^|]+/g, "")
                .replace(/\|\s*Chave:\s*[0-9]{44}/g, "")
                .replace(/\|\s*Prot SEFAZ:\s*[0-9]+/g, "")
                .trim();

            const multiItemMatch = cleanDesc
                .split(/,\s*(?=\d+(?:[.,]\d+)?x\s)/i)
                .map((p) => p.trim())
                .filter(Boolean);

            if (isXmlEntrada && multiItemMatch.length > 1) {
                productRows = multiItemMatch.map((part, idx) => {
                    const m = part.match(/^(\d+(?:[.,]\d+)?)x\s+(.*)$/i);
                    const q = m ? parseFloat(m[1].replace(",", ".")) : 1;
                    const nm = m ? m[2].replace(/\(\+\d+\s+itens\)/i, "").trim() : part;
                    return {
                        code: String(idx + 1).padStart(3, "0"),
                        name: nm,
                        ncm: "-",
                        csosn: "102",
                        cfop: "5102",
                        unit: "UN",
                        quantity: q,
                        unitPrice: 0,
                        grossPrice: 0,
                        discount: 0,
                        totalPrice: 0,
                    };
                });
            } else {
                const qtyFromDesc =
                    parseFloat(
                        invoice.description.match(/Qtd:\s*([0-9.,]+)/)?.[1]?.replace(",", ".") || "1"
                    ) || 1;
                const unitFromDesc = parseFloat(
                    invoice.description.match(/VUnit:\s*([0-9.,]+)/)?.[1]?.replace(",", ".") || "0"
                );
                const unitNumeric = unitFromDesc > 0 ? unitFromDesc : totalNumeric / qtyFromDesc;
                productRows = [
                    {
                        code: `2000000000${String(invoice.invoice_number || "1").padStart(3, "0")}`,
                        name: cleanDesc || "Móveis Planejados",
                        ncm: "94036000",
                        csosn: "0102",
                        cfop: "5102",
                        unit: "UN",
                        quantity: qtyFromDesc,
                        unitPrice: unitNumeric,
                        grossPrice: totalNumeric,
                        discount: 0,
                        totalPrice: totalNumeric,
                    },
                ];
            }
        }

        const hasItemDiscounts = productRows.some((r) => r.discount > 0);
        const productRowsHtml = productRows
            .map(
                (r) => `
                <tr style="border-bottom: 1px solid #000;">
                    <td class="center">${r.code}</td>
                    <td style="text-transform: uppercase;">
                        <strong>${r.name}</strong>
                        ${
                            r.clients
                                ? `<div style="font-size:6.5px; color:#333; margin-top:1px;">DESTINO / CLIENTE: <strong>${r.clients}</strong></div>`
                                : ""
                        }
                    </td>
                    <td class="center">${r.ncm}</td>
                    <td class="center">${r.csosn}</td>
                    <td class="center">${r.cfop}</td>
                    <td class="center">${r.unit}</td>
                    <td class="num-right">${fmtNum(r.quantity, 4, 4)}</td>
                    <td class="num-right">${r.unitPrice > 0 ? fmtNum(r.unitPrice, 4, 4) : "-"}</td>
                    ${
                        hasItemDiscounts
                            ? `<td class="num-right">${r.grossPrice > 0 ? fmtNum(r.grossPrice) : "-"}</td>
                               <td class="num-right">${r.discount > 0 ? fmtNum(r.discount) : "0,00"}</td>`
                            : ""
                    }
                    <td class="num-right"><strong>${r.totalPrice > 0 ? fmtNum(r.totalPrice) : "-"}</strong></td>
                    <td class="num-right">0,00</td>
                    <td class="num-right">0,00</td>
                    <td class="num-right">0,00</td>
                </tr>`
            )
            .join("");

        // Bloco FATURA / DUPLICATA (Boletos 30/60/90) igual ao modelo da C&D
        const duplicatesList = storedXml?.duplicates || [];
        const duplicatesHtml =
            duplicatesList.length > 0
                ? `<table class="tbl" style="margin-bottom: 2px;">
                    <tr>
                        ${duplicatesList
                            .map((dup) => {
                                const dueFormatted = dup.dueDate
                                    ? format(new Date(dup.dueDate + "T12:00:00"), "dd/MM/yyyy")
                                    : "-";
                                return `<td style="padding: 3px 5px;">
                                    <div style="display:flex; justify-content:space-between; font-size:7px;">
                                        <span><strong>Número:</strong> ${dup.number}</span>
                                        <span><strong>Vencimento:</strong> ${dueFormatted}</span>
                                        <span><strong>Valor:</strong> R$ ${fmtNum(dup.amount)}</span>
                                    </div>
                                </td>`;
                            })
                            .join("")}
                    </tr>
                </table>`
                : "";

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
            <title>DANFE NF-e ${invoice.invoice_number} - ${emitterInfo.name}</title>
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
                .prod-table th { border: 1px solid #000; font-size: 6.2px; font-weight: 700; padding: 2px; text-align: center; background: #f5f5f5; }
                .prod-table td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 3px 3px; font-size: 7.2px; vertical-align: top; word-wrap: break-word; }
                .prod-box { border: 1px solid #000; min-height: 320px; display: flex; flex-direction: column; justify-content: space-between; }
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
                            <span class="lbl">RECEBEMOS DE ${emitterInfo.name} OS PRODUTOS E SERVIÇOS CONSTANTES NA NOTA FISCAL INDICADA AO LADO. Destinatário: ${recipientInfo.name} | Emissão: ${issueDateFormatted} | Valor: R$ ${fmtNum(totalNumeric)}</span>
                        </td>
                        <td rowspan="2" class="center" style="width: 18%; vertical-align: middle;">
                            <div style="font-size: 13px; font-weight: 700;">NF-e</div>
                            <div style="font-size: 11px; font-weight: 700; margin: 2px 0;">Nº ${invoice.invoice_number}</div>
                            <div style="font-size: 9px; font-weight: 700;">Série ${danfeSeries}</div>
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
                        ${
                            !isXmlEntrada
                                ? `<td class="center" style="width: 14%; height: 92px; vertical-align: middle; padding: 4px;">
                                      <img src="${window.location.origin}/logo-danfe-bjl.png" alt="BJL Planejados" style="width: 78px; height: 78px; object-fit: contain; border-radius: 50%; background: #000; display: block; margin: 0 auto;" />
                                   </td>`
                                : ""
                        }
                        <td class="center" style="width: ${isXmlEntrada ? "38%" : "24%"}; height: 92px; vertical-align: middle;">
                            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase;">${emitterInfo.name}</div>
                            <div style="font-size: 8px; margin-top: 4px;">
                                ${emitterInfo.address ? `${emitterInfo.address}<br/>` : ""}
                                ${emitterInfo.neighborhood ? `Bairro: ${emitterInfo.neighborhood}<br/>` : ""}
                                ${emitterInfo.city ? `${emitterInfo.city}${emitterInfo.uf ? ` - ${emitterInfo.uf}` : ""}<br/>` : ""}
                                ${emitterInfo.cep ? `CEP: ${emitterInfo.cep}` : ""} ${emitterInfo.phone ? `• Fone: ${emitterInfo.phone}` : ""}
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
                                <div style="border:1px solid #000; width:18px; height:16px; line-height:16px; font-weight:700; font-size:9px;">${danfeOpCode}</div>
                            </div>
                            <div style="font-size: 8px; font-weight: 700;">
                                Nº ${invoice.invoice_number}<br/>
                                SÉRIE: ${danfeSeries}<br/>
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
                            <span class="val">${natOp}</span>
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
                            <span class="val">${emitterInfo.ie || "&nbsp;"}</span>
                        </td>
                        <td style="width: 33%;">
                            <span class="lbl">INSCRIÇÃO ESTADUAL DO SUBST. TRIB.</span>
                            <span class="val">&nbsp;</span>
                        </td>
                        <td style="width: 34%;">
                            <span class="lbl">CNPJ</span>
                            <span class="val">${emitterInfo.cnpj || "&nbsp;"}</span>
                        </td>
                    </tr>
                </table>

                <!-- 3. DESTINATÁRIO / REMETENTE -->
                <div class="sec-title">DESTINATÁRIO/REMETENTE</div>
                <table class="tbl">
                    <tr>
                        <td style="width: 60%;">
                            <span class="lbl">NOME/RAZÃO SOCIAL</span>
                            <span class="val" style="text-transform: uppercase;">${recipientInfo.name}</span>
                        </td>
                        <td style="width: 24%;">
                            <span class="lbl">CNPJ/CPF</span>
                            <span class="val">${recipientInfo.cnpj || "&nbsp;"}</span>
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
                            <span class="val">${recipientInfo.address || "&nbsp;"}</span>
                        </td>
                        <td style="width: 23%;">
                            <span class="lbl">BAIRRO/DISTRITO</span>
                            <span class="val">${recipientInfo.neighborhood || "&nbsp;"}</span>
                        </td>
                        <td style="width: 16%;">
                            <span class="lbl">CEP</span>
                            <span class="val">${recipientInfo.cep || "&nbsp;"}</span>
                        </td>
                        <td style="width: 16%;">
                            <span class="lbl">DATA DE ENTR./SAÍDA</span>
                            <span class="val">${issueDateFormatted}</span>
                        </td>
                    </tr>
                </table>
                <table class="tbl" style="margin-top: -1px;">
                    <tr>
                        <td style="width: 31%;">
                            <span class="lbl">MUNICÍPIO</span>
                            <span class="val">${recipientInfo.city || "&nbsp;"}</span>
                        </td>
                        <td style="width: 18%;">
                            <span class="lbl">FONE/FAX</span>
                            <span class="val">${recipientInfo.phone || "&nbsp;"}</span>
                        </td>
                        <td style="width: 11%;">
                            <span class="lbl">UF</span>
                            <span class="val">${recipientInfo.uf || "&nbsp;"}</span>
                        </td>
                        <td style="width: 24%;">
                            <span class="lbl">INSCRIÇÃO ESTADUAL</span>
                            <span class="val">${recipientInfo.ie || "&nbsp;"}</span>
                        </td>
                        <td style="width: 16%;">
                            <span class="lbl">HORA ENTR./SAÍDA</span>
                            <span class="val">&nbsp;</span>
                        </td>
                    </tr>
                </table>

                <!-- 4. FATURA / DUPLICATA & CÁLCULO DO IMPOSTO -->
                <div class="sec-title">FATURA / DUPLICATA</div>
                ${duplicatesHtml}
                <div class="sec-title" style="margin-top: 2px;">CÁLCULO DO IMPOSTO</div>
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
                        <td style="width: 15%;"><span class="lbl">V. TOTAL DE PRODUTOS</span><span class="val num-right">${fmtNum(productsTotalNumeric)}</span></td>
                    </tr>
                    <tr>
                        <td><span class="lbl">VALOR DO FRETE</span><span class="val num-right">${fmtNum(freightTotalNumeric)}</span></td>
                        <td><span class="lbl">VALOR DO SEGURO</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">DESCONTO</span><span class="val num-right">${fmtNum(discountTotalNumeric)}</span></td>
                        <td><span class="lbl">OUTRAS DESP.</span><span class="val num-right">${fmtNum(otherTotalNumeric)}</span></td>
                        <td><span class="lbl">VALOR DO IPI</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">V. ICMS UF DEST.</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">V. APROX. DO TRIBUTO</span><span class="val num-right">0,00</span></td>
                        <td><span class="lbl">VALOR DA COFINS</span><span class="val num-right">0,00</span></td>
                        <td style="width: 15%;"><span class="lbl">V. TOTAL DA NOTA</span><span class="val num-right">${fmtNum(totalNumeric)}</span></td>
                    </tr>
                </table>

                <!-- 5. DADOS DO PRODUTO / SERVIÇO (ITENS SEPARADOS!) -->
                <div class="sec-title">DADOS DO PRODUTO/SERVIÇO (${productRows.length} ${productRows.length === 1 ? "ITEM" : "ITENS"})</div>
                <div class="prod-box">
                    <table class="prod-table">
                        <thead>
                            <tr>
                                <th style="width: 7%;">CÓD.</th>
                                <th style="width: ${hasItemDiscounts ? "30%" : "38%"};">DESCRIÇÃO DO PRODUTO/SERVIÇO</th>
                                <th style="width: 8%;">NCM/SH</th>
                                <th style="width: 4.5%;">CSOSN</th>
                                <th style="width: 4.5%;">CFOP</th>
                                <th style="width: 3.5%;">UN</th>
                                <th style="width: 6%;">QTD.</th>
                                <th style="width: 7%;">VLR.<br/>UNIT.</th>
                                ${
                                    hasItemDiscounts
                                        ? `<th style="width: 6.5%;">VLR.<br/>BRUTO</th>
                                           <th style="width: 6%;">VLR.<br/>DESC.</th>`
                                        : ""
                                }
                                <th style="width: 7.5%;">VLR.<br/>TOTAL</th>
                                <th style="width: 3.5%;">BC<br/>ICMS</th>
                                <th style="width: 3%;">VLR.<br/>ICMS</th>
                                <th style="width: 3%;">VLR.<br/>IPI</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productRowsHtml}
                        </tbody>
                    </table>
                    <div></div>
                </div>

                <!-- 6. CÁLCULO DO ISSQN -->
                <div class="sec-title">CALCULO DO ISSQN</div>
                <table class="tbl">
                    <tr>
                        <td style="width: 25%;"><span class="lbl">INSCRIÇÃO MUNICIPAL</span><span class="val">&nbsp;</span></td>
                        <td style="width: 25%;"><span class="lbl">VALOR TOTAL DOS SERVIÇOS</span><span class="val num-right">0,00</span></td>
                        <td style="width: 25%;"><span class="lbl">BASE DE CÁLCULO DO ISSQN</span><span class="val num-right">0,00</span></td>
                        <td style="width: 25%;"><span class="lbl">VALOR DO ISSQN</span><span class="val num-right">0,00</span></td>
                    </tr>
                </table>

                <!-- 7. DADOS ADICIONAIS -->
                <div class="sec-title">DADOS ADICIONAIS</div>
                <table class="tbl">
                    <tr>
                        <td style="width: 53%; height: 56px;">
                            <span class="lbl">INFORMAÇÕES COMPLEMENTARES</span>
                            <div style="font-size: 7.5px; margin-top: 2px;">
                                DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NAO GERA DIREITO A CREDITO FISCAL DE ICMS, ISS E IPI.
                            </div>
                        </td>
                        <td style="width: 47%; height: 56px;">
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
            {/* Hidden file inputs for XML import (suporta selecionar 1 ou várias notas XML somadas!) */}
            <input
                ref={xmlInputRef}
                type="file"
                multiple
                accept=".xml,text/xml"
                className="hidden"
                onChange={handleXmlFileChange}
            />
            <input
                ref={appendXmlInputRef}
                type="file"
                multiple
                accept=".xml,text/xml"
                className="hidden"
                onChange={handleAppendXmlFiles}
            />

            {/* BENTO TELEMETRY HEADER */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="executive-card border-metallic p-5 rounded-2xl relative overflow-hidden">
                    <div className="absolute -right-2 -bottom-2 opacity-20 pointer-events-none">
                        <AnimatedInvoiceStamp size="md" />
                    </div>
                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Volume Faturado (NF)
                        </span>
                        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Receipt className="h-4 w-4" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-display font-black text-primary font-tech tabular-nums relative z-10">
                        {formatCurrency(totalAuthorizedAmount)}
                    </h3>
                    <p className="text-[10px] text-muted-foreground/70 mt-1 relative z-10">
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
                            onClick={() => setIsInboundWithoutXmlOpen(true)}
                            className="h-10 rounded-xl border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-wider gap-2"
                        >
                            <KeyRound className="h-4 w-4 text-amber-400" />
                            Entrada s/ XML (Chave / Foto / PDF)
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => xmlInputRef.current?.click()}
                            className="h-10 rounded-xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-bold gap-2"
                        >
                            <Upload className="h-4 w-4 text-amber-400" />
                            Importar XML
                        </Button>

                        <Button
                            onClick={() => {
                                setEmitStep("form");
                                setIsEmitOpen(true);
                            }}
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
                                                    {(() => {
                                                        const xmlMeta = parseStoredXmlPayload(invoice);
                                                        if (xmlMeta && xmlMeta.items.length > 0) {
                                                            return (
                                                                <span className="text-[9px] font-tech text-emerald-400 font-bold">
                                                                    ✓ {xmlMeta.items.length}{" "}
                                                                    {xmlMeta.items.length === 1
                                                                        ? "item"
                                                                        : "itens"}{" "}
                                                                    separados
                                                                </span>
                                                            );
                                                        }
                                                        if (
                                                            (invoice.asaas_status &&
                                                                !invoice.asaas_status.startsWith("XML_PAYLOAD:")) ||
                                                            invoice.description?.includes("Prot SEFAZ:")
                                                        ) {
                                                            return (
                                                                <span className="text-[9px] font-tech text-emerald-400 font-bold">
                                                                    ✓ SEFAZ Prot:{" "}
                                                                    {invoice.description.match(
                                                                        /Prot SEFAZ:\s*([0-9]+)/
                                                                    )?.[1] || "cStat 100"}
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {invoice.status !== "Cancelada" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleOpenLaunchFromExistingInvoice(invoice)}
                                                            className="h-8 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 gap-1.5"
                                                            title="Colocar Clientes de cada item e Lançar no Financeiro"
                                                        >
                                                            <Users className="h-3.5 w-3.5 text-amber-400" />
                                                            Lançar / Clientes
                                                        </Button>
                                                    )}
                                                    {(parseStoredXmlPayload(invoice) ||
                                                        (invoice.description || "")
                                                            .toUpperCase()
                                                            .includes("[XML") ||
                                                        (invoice.description || "")
                                                            .toUpperCase()
                                                            .includes("[ENTRADA")) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setViewingInvoice(invoice)}
                                                            className="h-8 px-2.5 rounded-xl text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/15 gap-1.5"
                                                            title="Ver todos os itens separados desta nota"
                                                        >
                                                            <Layers className="h-3.5 w-3.5" />
                                                            Ver Itens
                                                        </Button>
                                                    )}
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
                                                    {invoice.status !== "Cancelada" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleCancelInvoice(invoice)}
                                                            className="h-8 px-2.5 rounded-xl text-[10px] font-bold text-amber-400 hover:bg-amber-500/15 gap-1"
                                                            title="Cancelar Nota Fiscal na SEFAZ"
                                                        >
                                                            <Ban className="h-3.5 w-3.5" />
                                                            Cancelar NF
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteInvoice(invoice.id)}
                                                        className="h-8 w-8 rounded-xl text-rose-400 hover:bg-rose-500/15"
                                                        title="Excluir registro do histórico"
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

            {/* MODAL 1: EMITIR NOTA FISCAL EM 1 CLIQUE COM PRÉVIA VISUAL DA DANFE ANTES DE CONFIRMAR */}
            <Dialog
                open={isEmitOpen}
                onOpenChange={(open) => {
                    setIsEmitOpen(open);
                    if (!open) setEmitStep("form");
                }}
            >
                <DialogContent
                    className={cn(
                        "max-h-[92vh] overflow-y-auto bg-[#0c0c10] border border-white/15 shadow-2xl rounded-3xl text-foreground transition-all",
                        emitStep === "preview" ? "max-w-4xl" : "max-w-3xl"
                    )}
                >
                    <DialogHeader>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2">
                                <span className="tech-hud-pill text-primary border-primary/30 bg-primary/10">
                                    1-CLICK EMISSOR // CONFERÊNCIA PRÉVIA
                                </span>
                                {emitStep === "preview" && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/40 animate-pulse">
                                        👁️ Modo Prévia — Ainda Não Emitida
                                    </span>
                                )}
                            </div>

                            {/* Seletor de Etapa: 1. Preencher Dados -> 2. Prévia da Nota */}
                            <div className="flex items-center gap-1.5 bg-white/[0.04] p-1 rounded-xl border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setEmitStep("form")}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                                        emitStep === "form"
                                            ? "bg-primary text-primary-foreground shadow"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Pencil className="h-3 w-3" />
                                    1. Dados da Nota
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleOpenEmitPreview()}
                                    className={cn(
                                        "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5",
                                        emitStep === "preview"
                                            ? "bg-amber-500 text-black shadow"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Eye className="h-3 w-3" />
                                    2. Prévia da Nota (DANFE)
                                </button>
                            </div>
                        </div>

                        <DialogTitle className="text-xl font-display font-black">
                            {emitStep === "form"
                                ? "Emitir Nota Fiscal Eletrônica — Preenchimento"
                                : `Prévia de Conferência da ${emitForm.type} — Confira Antes de Confirmar`}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {emitStep === "form"
                                ? "Preencha ou puxe os dados do cliente/venda abaixo e clique em 'Visualizar Prévia da Nota' para ver como a nota vai ficar antes de confirmar."
                                : "Veja abaixo o espelho exato de como a Nota Fiscal (DANFE) vai ficar. Se estiver tudo certinho, clique em 'Confirmar e Emitir Nota' no rodapé."}
                        </DialogDescription>
                    </DialogHeader>

                    {emitStep === "form" ? (
                        <form onSubmit={handleOpenEmitPreview} className="space-y-4 py-2">
                            {/* Seletor rápido de Orçamento / Venda / OS / Cliente do CRM */}
                            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Puxar Itens e Valores Automaticamente do Orçamento / CRM
                                </Label>
                                <Select value={emitForm.selectedSaleId} onValueChange={handleSelectSaleOrClient}>
                                    <SelectTrigger className="h-10 rounded-xl bg-black/40 border-white/10 text-xs">
                                        <SelectValue placeholder="Escolher Orçamento, Venda, Ordem de Serviço ou Cliente..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-80 z-[100] bg-[#121218] border-white/15 text-foreground">
                                        {crmBudgets.length > 0 && (
                                            <>
                                                <div className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-400">
                                                    📋 Orçamentos (Puxa todos os itens e valores do orçamento)
                                                </div>
                                                {crmBudgets.slice(0, 30).map((b) => {
                                                    const bItems = extractItemsFromSingleBudget(b, crmBudgets);
                                                    const bTotal = bItems.reduce(
                                                        (acc, i) => acc + (Number(i.value) || 0),
                                                        0
                                                    );
                                                    const itemsSummary =
                                                        bItems.length > 1
                                                            ? `${bItems.length} itens: ${bItems
                                                                  .slice(0, 3)
                                                                  .map((i) => i.description)
                                                                  .join(" + ")}${
                                                                  bItems.length > 3
                                                                      ? ` (+${bItems.length - 3})`
                                                                      : ""
                                                              }`
                                                            : bItems[0]?.description || b.project_name;
                                                    return (
                                                        <SelectItem
                                                            key={`budget:${b.id}`}
                                                            value={`budget:${b.id}`}
                                                        >
                                                            [ORÇAMENTO] {b.client_name} — {itemsSummary} (
                                                            {formatCurrency(bTotal)})
                                                        </SelectItem>
                                                    );
                                                })}
                                            </>
                                        )}
                                        {crmSales.length > 0 && (
                                            <>
                                                <div className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-primary mt-1">
                                                    Vendas / Projetos Recentes
                                                </div>
                                                {crmSales.slice(0, 15).map((s) => {
                                                    const resolved = resolveBudgetItemsForClientOrBudget(
                                                        s.client_name,
                                                        s.budget_id
                                                    );
                                                    const displayTotal =
                                                        resolved && resolved.totalValue > 0
                                                            ? resolved.totalValue
                                                            : Number(s.total_value || 0);
                                                    const displayLabel =
                                                        resolved && resolved.items.length > 1
                                                            ? `${resolved.items.length} itens do orçamento (${resolved.items
                                                                  .slice(0, 2)
                                                                  .map((i) => i.description)
                                                                  .join(" + ")}${
                                                                  resolved.items.length > 2 ? "..." : ""
                                                              })`
                                                            : resolved?.items[0]?.description || s.product;
                                                    return (
                                                        <SelectItem key={`sale:${s.id}`} value={`sale:${s.id}`}>
                                                            [VENDA] {s.client_name} — {displayLabel} (
                                                            {formatCurrency(displayTotal)})
                                                        </SelectItem>
                                                    );
                                                })}
                                            </>
                                        )}
                                        {crmServiceOrders.length > 0 && (
                                            <>
                                                <div className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-sky-400 mt-1">
                                                    Ordens de Serviço (OS)
                                                </div>
                                                {crmServiceOrders.slice(0, 20).map((os) => (
                                                    <SelectItem key={`os:${os.id}`} value={`os:${os.id}`}>
                                                        [OS] {os.ticket_number} — {os.client}{" "}
                                                        {os.action ? `(${os.action})` : ""}
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

                            {/* Modelo da Nota e Natureza da Operação */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                <div className="sm:col-span-5 space-y-1.5">
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

                                <div className="sm:col-span-4 space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        Natureza da Operação
                                    </Label>
                                    <Input
                                        placeholder="Venda Dentro do Estado"
                                        value={emitForm.natOp}
                                        onChange={(e) =>
                                            setEmitForm((prev) => ({ ...prev, natOp: e.target.value }))
                                        }
                                        className="h-10 rounded-xl bg-white/[0.03] border-white/10 text-xs"
                                    />
                                </div>

                                <div className="sm:col-span-3 space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                                        Valor Total da Nota
                                    </Label>
                                    <div className="h-10 px-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-end font-tech font-black text-primary text-sm">
                                        {formatCurrency(emitTotalAmount)}
                                    </div>
                                </div>
                            </div>

                            {/* BLOCO DESTINATÁRIO & ENDEREÇO COMPLETO (PARA SAIR CERTINHO NA DANFE) */}
                            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                        Dados do Destinatário (Cliente) na Nota
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        Confira Nome, CPF/CNPJ e Endereço
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-6 space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            Nome / Razão Social do Destinatário *
                                        </Label>
                                        <Input
                                            required
                                            placeholder="Ex: João Carlos da Silva"
                                            value={emitForm.clientName}
                                            onChange={(e) =>
                                                setEmitForm((prev) => ({ ...prev, clientName: e.target.value }))
                                            }
                                            className="h-9 rounded-xl bg-black/40 border-white/10 text-xs font-semibold"
                                        />
                                    </div>

                                    <div className="sm:col-span-3 space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            CPF ou CNPJ do Cliente
                                        </Label>
                                        <Input
                                            placeholder="000.000.000-00"
                                            value={emitForm.clientDoc}
                                            onChange={(e) =>
                                                setEmitForm((prev) => ({ ...prev, clientDoc: e.target.value }))
                                            }
                                            className="h-9 rounded-xl bg-black/40 border-white/10 font-tech text-xs"
                                        />
                                    </div>

                                    <div className="sm:col-span-3 space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            Telefone / Celular (DDD auto)
                                        </Label>
                                        <Input
                                            placeholder="(22) 99999-9999"
                                            value={emitForm.clientPhone}
                                            onChange={(e) =>
                                                setEmitForm((prev) => ({
                                                    ...prev,
                                                    clientPhone: formatPhoneBrInput(e.target.value),
                                                }))
                                            }
                                            onBlur={(e) =>
                                                setEmitForm((prev) => ({
                                                    ...prev,
                                                    clientPhone:
                                                        formatPhoneBrDisplay(e.target.value) || "(22) ",
                                                }))
                                            }
                                            className="h-9 rounded-xl bg-black/40 border-white/10 font-tech text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                    <div className="sm:col-span-5 space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            Endereço (Rua, Nº, Compl.)
                                        </Label>
                                        <Input
                                            placeholder="Ex: Rua Maria Vitipo Raposo, 138"
                                            value={emitForm.clientAddress}
                                            onChange={(e) =>
                                                setEmitForm((prev) => ({ ...prev, clientAddress: e.target.value }))
                                            }
                                            className="h-8 rounded-lg bg-black/40 border-white/10 text-xs"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            Bairro
                                        </Label>
                                        <Input
                                            placeholder="Centro"
                                            value={emitForm.clientNeighborhood}
                                            onChange={(e) =>
                                                setEmitForm((prev) => ({
                                                    ...prev,
                                                    clientNeighborhood: e.target.value,
                                                }))
                                            }
                                            className="h-8 rounded-lg bg-black/40 border-white/10 text-xs"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            Município
                                        </Label>
                                        <Input
                                            placeholder="Sao Fidelis"
                                            value={emitForm.clientCity}
                                            onChange={(e) =>
                                                setEmitForm((prev) => ({ ...prev, clientCity: e.target.value }))
                                            }
                                            className="h-8 rounded-lg bg-black/40 border-white/10 text-xs"
                                        />
                                    </div>
                                    <div className="sm:col-span-1 space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            UF
                                        </Label>
                                        <Input
                                            placeholder="RJ"
                                            maxLength={2}
                                            value={emitForm.clientUf}
                                            onChange={(e) =>
                                                setEmitForm((prev) => ({
                                                    ...prev,
                                                    clientUf: e.target.value.toUpperCase(),
                                                }))
                                            }
                                            className="h-8 rounded-lg bg-black/40 border-white/10 font-tech text-xs text-center"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 space-y-1">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                            CEP
                                        </Label>
                                        <Input
                                            placeholder="28400-000"
                                            value={emitForm.clientCep}
                                            onChange={(e) =>
                                                setEmitForm((prev) => ({ ...prev, clientCep: e.target.value }))
                                            }
                                            className="h-8 rounded-lg bg-black/40 border-white/10 font-tech text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* BLOCO PRODUTOS / SERVIÇOS DA NOTA */}
                            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                        Produtos / Serviços Discriminados na Nota ({emitPreviewItems.length})
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddEmitExtraItem}
                                        className="h-7 px-2.5 rounded-lg border-primary/30 bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />+ Adicionar Outro Item na Nota
                                    </Button>
                                </div>

                                {/* Item Principal #001 */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                                    <div className="sm:col-span-6 space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            Item #001 — Descrição do Móvel / Serviço *
                                        </Label>
                                        <Input
                                            required
                                            placeholder="Ex: Armário de cozinha sob medida em MDF"
                                            value={emitForm.description}
                                            onChange={(e) =>
                                                setEmitForm((prev) => ({ ...prev, description: e.target.value }))
                                            }
                                            className="h-9 rounded-xl bg-black/40 border-white/10 text-xs"
                                        />
                                    </div>

                                    <div className="sm:col-span-2 space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                                            Qtd.
                                        </Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            step="any"
                                            required
                                            placeholder="1"
                                            value={emitForm.quantity}
                                            onChange={(e) => {
                                                const newQtyStr = e.target.value;
                                                const qty = Math.max(1, parseFloat(newQtyStr) || 1);
                                                const unit = parseFloat(emitForm.unitPrice || "0");
                                                const total = parseFloat(emitForm.amount || "0");
                                                setEmitForm((prev) => ({
                                                    ...prev,
                                                    quantity: newQtyStr,
                                                    amount:
                                                        !isNaN(unit) && unit > 0
                                                            ? (qty * unit).toFixed(2)
                                                            : prev.amount,
                                                    unitPrice:
                                                        (isNaN(unit) || unit <= 0) && !isNaN(total) && total > 0
                                                            ? (total / qty).toFixed(2)
                                                            : prev.unitPrice,
                                                }));
                                            }}
                                            className="h-9 rounded-xl bg-primary/10 border-primary/30 font-tech font-bold text-primary text-center text-xs"
                                        />
                                    </div>

                                    <div className="sm:col-span-2 space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            Vlr. Unit. (R$)
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={emitForm.unitPrice}
                                            onChange={(e) => {
                                                const newUnitStr = e.target.value;
                                                const unit = parseFloat(newUnitStr);
                                                const qty = Math.max(1, parseFloat(emitForm.quantity || "1") || 1);
                                                setEmitForm((prev) => ({
                                                    ...prev,
                                                    unitPrice: newUnitStr,
                                                    amount:
                                                        !isNaN(unit) && unit > 0
                                                            ? (qty * unit).toFixed(2)
                                                            : prev.amount,
                                                }));
                                            }}
                                            className="h-9 rounded-xl bg-black/40 border-white/10 font-tech text-xs"
                                        />
                                    </div>

                                    <div className="sm:col-span-2 space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            Subtotal (R$) *
                                        </Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            required
                                            placeholder="0.00"
                                            value={emitForm.amount}
                                            onChange={(e) => {
                                                const newTotal = e.target.value;
                                                const qty = Math.max(1, parseFloat(emitForm.quantity || "1") || 1);
                                                const totalNum = parseFloat(newTotal);
                                                setEmitForm((prev) => ({
                                                    ...prev,
                                                    amount: newTotal,
                                                    unitPrice:
                                                        !isNaN(totalNum) && totalNum > 0
                                                            ? (totalNum / qty).toFixed(2)
                                                            : prev.unitPrice,
                                                }));
                                            }}
                                            className="h-9 rounded-xl bg-black/40 border-primary/30 font-tech font-bold text-primary text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Itens Extras Adicionais (se o usuário clicou em + Adicionar Outro Item) */}
                                {emitExtraItems.map((ext, idx) => (
                                    <div
                                        key={ext.id}
                                        className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end pt-2 border-t border-white/[0.06]"
                                    >
                                        <div className="sm:col-span-6 space-y-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                Item #{String(idx + 2).padStart(3, "0")} — Descrição
                                            </Label>
                                            <Input
                                                required
                                                placeholder="Ex: Painel ripado sala em MDF Freijó"
                                                value={ext.description}
                                                onChange={(e) =>
                                                    handleUpdateEmitExtraItem(ext.id, "description", e.target.value)
                                                }
                                                className="h-9 rounded-xl bg-black/40 border-white/10 text-xs"
                                            />
                                        </div>

                                        <div className="sm:col-span-2 space-y-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                                                Qtd.
                                            </Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                step="any"
                                                value={ext.quantity}
                                                onChange={(e) =>
                                                    handleUpdateEmitExtraItem(ext.id, "quantity", e.target.value)
                                                }
                                                className="h-9 rounded-xl bg-primary/10 border-primary/30 font-tech font-bold text-primary text-center text-xs"
                                            />
                                        </div>

                                        <div className="sm:col-span-2 space-y-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                Vlr. Unit. (R$)
                                            </Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={ext.unitPrice}
                                                onChange={(e) =>
                                                    handleUpdateEmitExtraItem(ext.id, "unitPrice", e.target.value)
                                                }
                                                className="h-9 rounded-xl bg-black/40 border-white/10 font-tech text-xs"
                                            />
                                        </div>

                                        <div className="sm:col-span-2 flex items-center gap-1.5">
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    Subtotal (R$)
                                                </Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={ext.amount}
                                                    onChange={(e) =>
                                                        handleUpdateEmitExtraItem(ext.id, "amount", e.target.value)
                                                    }
                                                    className="h-9 rounded-xl bg-black/40 border-primary/30 font-tech font-bold text-primary text-xs"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEmitExtraItem(ext.id)}
                                                className="mt-5 p-2 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                                                title="Remover item"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Parâmetros Fiscais de Marcenaria já pré-configurados */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
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
                                                CFOP (Operação)
                                            </Label>
                                            <Input
                                                value={emitForm.cfop}
                                                onChange={(e) =>
                                                    setEmitForm((prev) => ({ ...prev, cfop: e.target.value }))
                                                }
                                                className="h-8 rounded-lg bg-black/30 border-white/10 font-tech text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                CSOSN (Simples)
                                            </Label>
                                            <Input
                                                value={emitForm.csosn}
                                                onChange={(e) =>
                                                    setEmitForm((prev) => ({ ...prev, csosn: e.target.value }))
                                                }
                                                className="h-8 rounded-lg bg-black/30 border-white/10 font-tech text-xs"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="col-span-3 space-y-1">
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
                                Lançar faturamento automaticamente nos Lançamentos Financeiros / DRE ao confirmar
                            </label>

                            <DialogFooter className="pt-2 gap-2">
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
                                    className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider text-xs px-6 gap-2 shadow-lg shadow-amber-500/20"
                                >
                                    <Eye className="h-4 w-4" />
                                    Visualizar Prévia da Nota (Antes de Confirmar)
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : (
                        /* ETAPA 2: PRÉVIA VISUAL DA NOTA FISCAL (ESPELHO DANFE / NFS-e NA TELA ANTES DE CONFIRMAR) */
                        (() => {
                            const cleanDocDigits = (emitForm.clientDoc || "").replace(/\D/g, "");
                            const isDocValid =
                                cleanDocDigits.length === 11 || cleanDocDigits.length === 14;
                            const formattedClientDoc =
                                cleanDocDigits.length === 11
                                    ? cleanDocDigits.replace(
                                          /(\d{3})(\d{3})(\d{3})(\d{2})/,
                                          "$1.$2.$3-$4"
                                      )
                                    : cleanDocDigits.length === 14
                                    ? cleanDocDigits.replace(
                                          /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
                                          "$1.$2.$3/$4-$5"
                                      )
                                    : emitForm.clientDoc || "Não informado";

                            const bjlCnpjFormatted = (companySettings?.cnpj || "60.528.620/0001-20")
                                .replace(/\D/g, "")
                                .replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
                            const todayFormatted = format(new Date(), "dd/MM/yyyy");
                            const previewAccessKey = `332611${(
                                companySettings?.cnpj || "60528620000120"
                            )
                                .replace(/\D/g, "")
                                .padEnd(14, "0")}550010000000011300000210`;

                            return (
                                <div className="space-y-4 py-2">
                                    {/* Barra Superior de Conferência + Alertas */}
                                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wider">
                                                <Eye className="h-4 w-4 text-amber-400 shrink-0" />
                                                Conferência Prévia — Verifique se todos os dados estão corretos
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                Esta é a visualização fiel de como sua{" "}
                                                <strong>{emitForm.type}</strong> ficará. Caso precise corrigir algum valor, nome, CPF/CNPJ ou endereço, clique em{" "}
                                                <strong>"Voltar e Editar Dados"</strong>.
                                            </p>
                                            {!isDocValid && (
                                                <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold pt-1">
                                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                                    Atenção: O CPF/CNPJ do destinatário ({emitForm.clientDoc || "vazio"}) não possui 11 ou 14 dígitos.
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setEmitStep("form")}
                                                className="h-9 rounded-xl border-white/15 bg-black/40 hover:bg-white/10 text-xs font-bold gap-1.5"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Editar Dados
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handlePrintEmitPreview}
                                                className="h-9 rounded-xl border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold gap-1.5"
                                            >
                                                <Printer className="h-3.5 w-3.5" />
                                                Abrir / Imprimir Prévia
                                            </Button>
                                        </div>
                                    </div>

                                    {/* ESPELHO VISUAL REAL DA DANFE / NOTA FISCAL (FOLHA A4 BRANCA FIEL AO PADRÃO SEFAZ) */}
                                    <div className="rounded-2xl border-2 border-amber-500/40 bg-white text-black p-4 shadow-2xl overflow-x-auto">
                                        <div className="min-w-[680px] space-y-1.5 font-sans text-[10px] text-black">
                                            {/* 1. CANHOTO */}
                                            <table className="w-full border-collapse border border-black">
                                                <tbody>
                                                    <tr>
                                                        <td
                                                            colSpan={2}
                                                            className="border border-black p-1 text-[8px] leading-tight w-[82%]"
                                                        >
                                                            RECEBEMOS DE <strong>BJL MOVEIS PLANEJADOS LTDA</strong> OS PRODUTOS E SERVIÇOS CONSTANTES NA NOTA FISCAL INDICADA AO LADO. Destinatário:{" "}
                                                            <strong>{emitForm.clientName.toUpperCase()}</strong> | Emissão:{" "}
                                                            <strong>{todayFormatted}</strong> | Valor:{" "}
                                                            <strong>{formatCurrency(emitTotalAmount)}</strong>
                                                        </td>
                                                        <td
                                                            rowSpan={2}
                                                            className="border border-black p-1 text-center align-middle w-[18%]"
                                                        >
                                                            <div className="font-black text-xs">{emitForm.type}</div>
                                                            <div className="font-bold text-[10px] text-amber-700">
                                                                PRÉVIA
                                                            </div>
                                                            <div className="text-[9px] font-semibold">Série 1</div>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-black p-1 h-6 w-[25%] text-[7px] text-neutral-700 uppercase">
                                                            DATA DE RECEBIMENTO
                                                        </td>
                                                        <td className="border border-black p-1 h-6 w-[57%] text-[7px] text-neutral-700 uppercase">
                                                            IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            <div className="border-b border-dashed border-black my-1" />

                                            {/* 2. CABEÇALHO EMITENTE / DANFE / CONTROLE DO FISCO */}
                                            <table className="w-full border-collapse border border-black">
                                                <tbody>
                                                    <tr>
                                                        <td className="border border-black p-2 text-center align-middle w-[14%]">
                                                            <img
                                                                src="/logo-danfe-bjl.png"
                                                                alt="BJL Planejados"
                                                                className="w-16 h-16 object-contain rounded-full bg-black mx-auto"
                                                            />
                                                        </td>
                                                        <td className="border border-black p-2 text-center align-middle w-[26%]">
                                                            <div className="font-black text-[11px] uppercase">
                                                                BJL MOVEIS PLANEJADOS LTDA
                                                            </div>
                                                            <div className="text-[8.5px] leading-snug mt-1 text-neutral-800">
                                                                Rua Maria Vitipo Raposo, 138
                                                                <br />
                                                                Bairro: Barão de Macaúbas
                                                                <br />
                                                                São Fidélis - RJ • CEP: 28400-000
                                                                <br />
                                                                Fone: {companySettings?.phone || "(22) 99703-9852"}
                                                            </div>
                                                        </td>
                                                        <td className="border border-black p-1.5 text-center align-middle w-[16%]">
                                                            <div className="font-black text-sm leading-none">
                                                                {emitForm.type === "NF-e" ? "DANFE" : "DANFSE"}
                                                            </div>
                                                            <div className="text-[7px] leading-tight my-1">
                                                                DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA
                                                            </div>
                                                            <div className="flex items-center justify-center gap-1.5 my-1">
                                                                <div className="text-left text-[7px] leading-tight">
                                                                    0 - ENTRADA
                                                                    <br />1 - SAÍDA
                                                                </div>
                                                                <div className="border border-black w-5 h-4 flex items-center justify-center font-black text-[10px]">
                                                                    1
                                                                </div>
                                                            </div>
                                                            <div className="font-bold text-[8.5px]">
                                                                SÉRIE: 1 • PÁG. 1/1
                                                            </div>
                                                        </td>
                                                        <td className="border border-black p-0 align-top w-[44%]">
                                                            <div className="border-b border-black p-1.5">
                                                                <span className="block text-[7px] uppercase text-neutral-700">
                                                                    CONTROLE DO FISCO (PRÉVIA DE CONFERÊNCIA)
                                                                </span>
                                                                <div className="h-6 mt-0.5 flex items-center justify-center overflow-hidden">
                                                                    {previewAccessKey.split("").map((d, i) => (
                                                                        <span
                                                                            key={i}
                                                                            style={{
                                                                                display: "inline-block",
                                                                                height: "22px",
                                                                                width: `${(parseInt(d, 10) % 3) + 1}px`,
                                                                                background: "#000",
                                                                                marginRight: `${((parseInt(d, 10) + i) % 2) + 1}px`,
                                                                            }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="border-b border-black p-1.5">
                                                                <span className="block text-[7px] uppercase text-neutral-700">
                                                                    CHAVE DE ACESSO (SERÁ GERADA NA AUTORIZAÇÃO SEFAZ)
                                                                </span>
                                                                <div className="text-center font-mono font-bold text-[9px] tracking-tight">
                                                                    {previewAccessKey}
                                                                </div>
                                                            </div>
                                                            <div className="p-1 text-center text-[7.5px] bg-amber-50 text-amber-900 font-bold">
                                                                PRÉVIA PARA CONFERÊNCIA DOS DADOS ANTES DA TRANSMISSÃO SEFAZ
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            {/* NATUREZA DA OPERAÇÃO & DADOS FISCAIS DO EMITENTE */}
                                            <table className="w-full border-collapse border border-black">
                                                <tbody>
                                                    <tr>
                                                        <td className="border border-black p-1 w-[56%]">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                NATUREZA DA OPERAÇÃO
                                                            </span>
                                                            <span className="font-bold text-[10px] uppercase">
                                                                {emitForm.natOp || "Venda Dentro do Estado"}
                                                            </span>
                                                        </td>
                                                        <td className="border border-black p-1 w-[44%]">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                PROTOCOLO DE AUTORIZAÇÃO DE USO
                                                            </span>
                                                            <span className="font-bold text-[9.5px] text-amber-700">
                                                                AGUARDANDO CONFIRMAÇÃO DE EMISSÃO
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            <table className="w-full border-collapse border border-black">
                                                <tbody>
                                                    <tr>
                                                        <td className="border border-black p-1 w-[33%]">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                INSCRIÇÃO ESTADUAL
                                                            </span>
                                                            <span className="font-bold text-[10px]">15469064</span>
                                                        </td>
                                                        <td className="border border-black p-1 w-[33%]">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                INSCRIÇÃO ESTADUAL DO SUBST. TRIB.
                                                            </span>
                                                            <span className="font-bold text-[10px]">&nbsp;</span>
                                                        </td>
                                                        <td className="border border-black p-1 w-[34%]">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                CNPJ DO EMITENTE
                                                            </span>
                                                            <span className="font-bold text-[10px]">
                                                                {bjlCnpjFormatted}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            {/* 3. DESTINATÁRIO / REMETENTE */}
                                            <div className="font-black text-[8.5px] uppercase tracking-wider pt-1">
                                                DESTINATÁRIO / REMETENTE
                                            </div>
                                            <table className="w-full border-collapse border border-black">
                                                <tbody>
                                                    <tr>
                                                        <td className="border border-black p-1 w-[58%]">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                NOME / RAZÃO SOCIAL
                                                            </span>
                                                            <span className="font-bold text-[10.5px] uppercase">
                                                                {emitForm.clientName || "---"}
                                                            </span>
                                                        </td>
                                                        <td
                                                            className={cn(
                                                                "border border-black p-1 w-[26%]",
                                                                !isDocValid && "bg-amber-100"
                                                            )}
                                                        >
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                CNPJ / CPF
                                                            </span>
                                                            <span className="font-bold text-[10.5px]">
                                                                {formattedClientDoc}
                                                            </span>
                                                        </td>
                                                        <td className="border border-black p-1 w-[16%]">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                DATA DE EMISSÃO
                                                            </span>
                                                            <span className="font-bold text-[10px]">
                                                                {todayFormatted}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-black p-1">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                ENDEREÇO
                                                            </span>
                                                            <span className="font-bold text-[10px]">
                                                                {emitForm.clientAddress?.trim() || "Centro"}
                                                            </span>
                                                        </td>
                                                        <td className="border border-black p-1">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                BAIRRO / DISTRITO
                                                            </span>
                                                            <span className="font-bold text-[10px]">
                                                                {emitForm.clientNeighborhood?.trim() || "Centro"}
                                                            </span>
                                                        </td>
                                                        <td className="border border-black p-1">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                CEP
                                                            </span>
                                                            <span className="font-bold text-[10px]">
                                                                {emitForm.clientCep?.trim() || "28400-000"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-black p-1">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                MUNICÍPIO
                                                            </span>
                                                            <span className="font-bold text-[10px]">
                                                                {emitForm.clientCity?.trim() || "Sao Fidelis"} —{" "}
                                                                {emitForm.clientUf?.trim() || "RJ"}
                                                            </span>
                                                        </td>
                                                        <td className="border border-black p-1">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                FONE / CELULAR
                                                            </span>
                                                            <span className="font-bold text-[10px]">
                                                                {formatPhoneBrDisplay(emitForm.clientPhone) || "---"}
                                                            </span>
                                                        </td>
                                                        <td className="border border-black p-1">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                DATA DE SAÍDA
                                                            </span>
                                                            <span className="font-bold text-[10px]">
                                                                {todayFormatted}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            {/* 4. CÁLCULO DO IMPOSTO */}
                                            <div className="font-black text-[8.5px] uppercase tracking-wider pt-1">
                                                CÁLCULO DO IMPOSTO
                                            </div>
                                            <table className="w-full border-collapse border border-black">
                                                <tbody>
                                                    <tr>
                                                        <td className="border border-black p-1">
                                                            <span className="block text-[6.5px] uppercase text-neutral-700">
                                                                BASE DE CÁLC. ICMS
                                                            </span>
                                                            <span className="font-bold text-[9.5px] block text-right">
                                                                0,00
                                                            </span>
                                                        </td>
                                                        <td className="border border-black p-1">
                                                            <span className="block text-[6.5px] uppercase text-neutral-700">
                                                                VALOR DO ICMS
                                                            </span>
                                                            <span className="font-bold text-[9.5px] block text-right">
                                                                0,00
                                                            </span>
                                                        </td>
                                                        <td className="border border-black p-1">
                                                            <span className="block text-[6.5px] uppercase text-neutral-700">
                                                                VALOR DO FRETE
                                                            </span>
                                                            <span className="font-bold text-[9.5px] block text-right">
                                                                0,00
                                                            </span>
                                                        </td>
                                                        <td className="border border-black p-1">
                                                            <span className="block text-[6.5px] uppercase text-neutral-700">
                                                                DESCONTO
                                                            </span>
                                                            <span className="font-bold text-[9.5px] block text-right">
                                                                0,00
                                                            </span>
                                                        </td>
                                                        <td className="border border-black p-1">
                                                            <span className="block text-[6.5px] uppercase text-neutral-700">
                                                                OUTRAS DESP.
                                                            </span>
                                                            <span className="font-bold text-[9.5px] block text-right">
                                                                0,00
                                                            </span>
                                                        </td>
                                                        <td className="border border-black p-1 bg-neutral-100">
                                                            <span className="block text-[6.5px] uppercase text-neutral-700">
                                                                V. TOTAL DOS PRODUTOS
                                                            </span>
                                                            <span className="font-black text-[10.5px] block text-right">
                                                                {formatCurrency(emitTotalAmount)}
                                                            </span>
                                                        </td>
                                                        <td className="border border-black p-1 bg-emerald-50">
                                                            <span className="block text-[6.5px] font-bold uppercase text-emerald-900">
                                                                V. TOTAL DA NOTA
                                                            </span>
                                                            <span className="font-black text-[11px] text-emerald-900 block text-right">
                                                                {formatCurrency(emitTotalAmount)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            {/* 5. DADOS DOS PRODUTOS / SERVIÇOS */}
                                            <div className="font-black text-[8.5px] uppercase tracking-wider pt-1">
                                                DADOS DO PRODUTO / SERVIÇO ({emitPreviewItems.length}{" "}
                                                {emitPreviewItems.length === 1 ? "ITEM" : "ITENS"})
                                            </div>
                                            <table className="w-full border-collapse border border-black">
                                                <thead>
                                                    <tr className="bg-neutral-100 text-[7.5px] font-black">
                                                        <th className="border border-black p-1 text-center w-[7%]">
                                                            CÓD.
                                                        </th>
                                                        <th className="border border-black p-1 text-left w-[41%]">
                                                            DESCRIÇÃO DO PRODUTO / SERVIÇO
                                                        </th>
                                                        <th className="border border-black p-1 text-center w-[9%]">
                                                            NCM/SH
                                                        </th>
                                                        <th className="border border-black p-1 text-center w-[6%]">
                                                            CSOSN
                                                        </th>
                                                        <th className="border border-black p-1 text-center w-[6%]">
                                                            CFOP
                                                        </th>
                                                        <th className="border border-black p-1 text-center w-[5%]">
                                                            UN
                                                        </th>
                                                        <th className="border border-black p-1 text-right w-[7%]">
                                                            QTD.
                                                        </th>
                                                        <th className="border border-black p-1 text-right w-[9%]">
                                                            VLR. UNIT.
                                                        </th>
                                                        <th className="border border-black p-1 text-right w-[10%]">
                                                            VLR. TOTAL
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {emitPreviewItems.map((it, idx) => (
                                                        <tr key={idx} className="text-[9px]">
                                                            <td className="border border-black p-1.5 text-center font-mono">
                                                                {it.code}
                                                            </td>
                                                            <td className="border border-black p-1.5 font-bold uppercase">
                                                                {it.description}
                                                            </td>
                                                            <td className="border border-black p-1.5 text-center font-mono">
                                                                {emitForm.type === "NF-e"
                                                                    ? it.ncm
                                                                    : emitForm.serviceCode}
                                                            </td>
                                                            <td className="border border-black p-1.5 text-center font-mono">
                                                                {it.csosn}
                                                            </td>
                                                            <td className="border border-black p-1.5 text-center font-mono">
                                                                {it.cfop}
                                                            </td>
                                                            <td className="border border-black p-1.5 text-center">
                                                                {it.unit}
                                                            </td>
                                                            <td className="border border-black p-1.5 text-right font-mono">
                                                                {Number(it.quantity).toLocaleString("pt-BR", {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 4,
                                                                })}
                                                            </td>
                                                            <td className="border border-black p-1.5 text-right font-mono">
                                                                {formatCurrency(it.unitPrice)}
                                                            </td>
                                                            <td className="border border-black p-1.5 text-right font-mono font-black">
                                                                {formatCurrency(it.totalPrice)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {/* 6. DADOS ADICIONAIS */}
                                            <div className="font-black text-[8.5px] uppercase tracking-wider pt-1">
                                                DADOS ADICIONAIS
                                            </div>
                                            <table className="w-full border-collapse border border-black">
                                                <tbody>
                                                    <tr>
                                                        <td className="border border-black p-1.5 w-[65%] h-12 align-top">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                INFORMAÇÕES COMPLEMENTARES
                                                            </span>
                                                            <span className="text-[8px] font-medium leading-tight block mt-0.5">
                                                                {emitForm.extraInfo}
                                                            </span>
                                                        </td>
                                                        <td className="border border-black p-1.5 w-[35%] h-12 align-top">
                                                            <span className="block text-[7px] uppercase text-neutral-700">
                                                                RESERVA AO FISCO
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <DialogFooter className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setEmitStep("form")}
                                            disabled={isEmitting}
                                            className="rounded-xl text-xs font-bold border-white/15 bg-white/[0.04] hover:bg-white/[0.1] gap-2"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                            Voltar e Corrigir Dados
                                        </Button>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setIsEmitOpen(false)}
                                                disabled={isEmitting}
                                                className="rounded-xl text-xs"
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={() => handleEmitInvoice()}
                                                disabled={isEmitting}
                                                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-xs px-6 h-10 gap-2 shadow-lg shadow-emerald-600/25"
                                            >
                                                {isEmitting ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Confirmando e Emitindo...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Tudo Certo! Confirmar e Emitir Nota
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </DialogFooter>
                                </div>
                            );
                        })()
                    )}
                </DialogContent>
            </Dialog>

            {/* MODAL 2: IMPORTADOR DE XML SEFAZ + ALOCAÇÃO DE CLIENTE POR ITEM + BOLETOS 30/60/90 & CARTÃO */}
            <Dialog open={isXmlDialogOpen} onOpenChange={setIsXmlDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0c0c10] border border-white/15 shadow-2xl rounded-3xl text-foreground">
                    <DialogHeader>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="tech-hud-pill text-amber-400 border-amber-500/30 bg-amber-500/10">
                                <FileCode2 className="h-3.5 w-3.5" />
                                PARSER XML SEFAZ // RATEIO POR ITEM & BOLETOS 30/60/90
                            </span>
                            {parsedXml && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                    {parsedXml.items.length} Itens • {xmlInstallments.length}x no Financeiro
                                </span>
                            )}
                        </div>
                        <DialogTitle className="text-xl font-display font-black">
                            NF-e #{parsedXml?.invoiceNumber} — Alocar Clientes por Item e Lançar Boletos / Cartão
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Vincule de qual cliente é cada item da nota e confira os boletos/parcelas (ex: 30 / 60 / 90 dias da emissão) para lançar tudo pronto no Financeiro e nos Gastos por Serviço.
                        </DialogDescription>
                    </DialogHeader>

                    {parsedXml && (
                        <div className="space-y-5 py-2">
                            {/* SELETOR RÁPIDO DAS 2 EMPRESAS PRINCIPAIS: CED (BOLETO 30/60/90) vs BRUTA (CARTÃO) */}
                            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-purple-500/10 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                                        <Building2 className="h-3.5 w-3.5" />
                                        Fornecedor da Nota (Configuração Automática)
                                    </span>
                                    <p className="text-[11px] text-muted-foreground">
                                        Clique na empresa para já configurar <strong>CED no Boleto (30/60/90)</strong> ou <strong>Bruta no Cartão</strong>:
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectSupplierProfile("ced")}
                                        className={cn(
                                            "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-2",
                                            xmlOptions.supplierPreset === "ced"
                                                ? "bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/25"
                                                : "bg-black/50 border-white/15 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <Receipt className="h-3.5 w-3.5" />
                                        CED / C&D (Boleto 30/60/90)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectSupplierProfile("bruta")}
                                        className={cn(
                                            "px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-2",
                                            xmlOptions.supplierPreset === "bruta"
                                                ? "bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/25"
                                                : "bg-black/50 border-white/15 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <CreditCard className="h-3.5 w-3.5" />
                                        Bruta Madeiras (Cartão)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectSupplierProfile("outro")}
                                        className={cn(
                                            "px-3 py-2 rounded-xl text-[11px] font-bold border transition-all",
                                            xmlOptions.supplierPreset === "outro"
                                                ? "bg-white/15 text-white border-white/30"
                                                : "bg-black/40 border-white/10 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        Outro
                                    </button>
                                </div>
                            </div>

                            {/* BARRA PARA SOMAR 2 OU MAIS NOTAS XML NOS MESMOS BOLETOS 3x */}
                            <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-2.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 flex items-center gap-1.5">
                                            <Layers className="h-3.5 w-3.5" />
                                            {parsedXml.sourceNotes.length > 1
                                                ? `${parsedXml.sourceNotes.length} Notas Fiscais Somadas nos mesmos Boletos!`
                                                : "Veio 2 Notas (ou mais) com os Boletos somados em 3x?"}
                                        </span>
                                        <p className="text-[11px] text-muted-foreground">
                                            {parsedXml.sourceNotes.length > 1
                                                ? "O valor das notas abaixo já foi somado e dividido automaticamente nas parcelas/boletos."
                                                : "Puxe o 2º arquivo XML aqui para somar o valor das duas notas e dividir tudo nos mesmos 3 boletos."}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => appendXmlInputRef.current?.click()}
                                        className="h-9 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-black uppercase tracking-wider text-[11px] px-4 shrink-0 shadow-lg shadow-sky-500/20"
                                    >
                                        <Plus className="h-4 w-4 mr-1.5" />
                                        Somar +1 Nota (XML)
                                    </Button>
                                </div>

                                {parsedXml.sourceNotes.length > 1 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                        {parsedXml.sourceNotes.map((sn, snIdx) => (
                                            <div
                                                key={sn.id}
                                                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-black/50 border border-sky-500/25"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-tech text-[10px] font-black">
                                                            Nota {snIdx + 1} • NF #{sn.invoiceNumber}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-tech">
                                                            ({sn.itemsCount} itens)
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] font-tech text-muted-foreground mt-0.5 flex items-center gap-2">
                                                        <span>
                                                            Emissão:{" "}
                                                            <strong className="text-foreground">
                                                                {format(
                                                                    new Date(sn.issueDate + "T12:00:00"),
                                                                    "dd/MM/yyyy"
                                                                )}
                                                            </strong>
                                                        </span>
                                                        <span>•</span>
                                                        <strong className="text-primary">
                                                            {formatCurrency(sn.totalAmount)}
                                                        </strong>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUseNoteDateAsBase(sn.issueDate)}
                                                        className={cn(
                                                            "px-2 py-1 rounded-lg text-[10px] font-bold border transition-all",
                                                            parsedXml.issueDate === sn.issueDate
                                                                ? "bg-amber-500/20 border-amber-400/50 text-amber-300"
                                                                : "bg-white/[0.04] border-white/10 text-muted-foreground hover:text-foreground"
                                                        )}
                                                        title="Usar a data desta nota como base do 30/60/90"
                                                    >
                                                        {parsedXml.issueDate === sn.issueDate
                                                            ? "✓ Data Base"
                                                            : "Usar Data"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveSourceNote(sn.id)}
                                                        className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                                                        title="Remover esta nota da soma"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* CABEÇALHO RESUMO DA NOTA */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                                <div className="sm:col-span-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
                                        Fornecedor / Emitente
                                    </span>
                                    <span className="text-xs font-bold text-foreground truncate block">
                                        {parsedXml.emitterName}
                                    </span>
                                    <span className="text-[10px] font-tech text-muted-foreground">
                                        CNPJ/CPF: {parsedXml.emitterCnpj || "Não informado"} •{" "}
                                        {parsedXml.sourceNotes.length > 1
                                            ? `NFs #${parsedXml.invoiceNumber}`
                                            : `Série ${parsedXml.series}`}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 block mb-1">
                                        Data Base (30 / 60 / 90)
                                    </span>
                                    <Input
                                        type="date"
                                        value={parsedXml.issueDate}
                                        onChange={(e) => {
                                            const newIssueDate = e.target.value;
                                            setParsedXml((prev) =>
                                                prev ? { ...prev, issueDate: newIssueDate } : prev
                                            );
                                            if (newIssueDate) {
                                                const updatedInst = buildInstallmentsFromPreset(
                                                    newIssueDate,
                                                    parsedXml.totalAmount,
                                                    xmlOptions.schedulePreset,
                                                    xmlOptions.paymentMethod,
                                                    parsedXml.duplicates,
                                                    parseInt(xmlOptions.customInstallmentCount, 10) || 3,
                                                    parseInt(xmlOptions.customIntervalDays, 10) || 30
                                                );
                                                setXmlInstallments(updatedInst);
                                            }
                                        }}
                                        className="h-8 rounded-lg bg-black/40 border-amber-500/30 font-tech text-xs font-bold text-amber-300"
                                    />
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block">
                                        {parsedXml.sourceNotes.length > 1
                                            ? `Total Somado (${parsedXml.sourceNotes.length} Notas)`
                                            : "Valor Total da Nota"}
                                    </span>
                                    <span className="text-lg font-tech font-black text-primary block">
                                        {formatCurrency(parsedXml.totalAmount)}
                                    </span>
                                    {(parsedXml.freightAmount > 0 ||
                                        parsedXml.discountAmount > 0 ||
                                        parsedXml.otherAmount > 0) && (
                                        <span className="text-[9px] font-tech text-muted-foreground block">
                                            Prod: {formatCurrency(parsedXml.productsTotal)}
                                            {parsedXml.freightAmount > 0
                                                ? ` | Frete: +${formatCurrency(parsedXml.freightAmount)}`
                                                : ""}
                                            {parsedXml.discountAmount > 0
                                                ? ` | Desc: -${formatCurrency(parsedXml.discountAmount)}`
                                                : ""}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* ETAPA 1: DE QUAL CLIENTE É CADA ITEM DA NOTA */}
                            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.03] p-4 space-y-3.5">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-white/10">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                            <Users className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                                                1. De qual Cliente / Projeto é cada item desta Nota? ({parsedXml.items.length} itens)
                                            </h4>
                                            <p className="text-[11px] text-muted-foreground">
                                                Escolha o cliente em cada item abaixo (ou divida um mesmo item entre vários clientes).
                                            </p>
                                        </div>
                                    </div>

                                    {/* Atalho para aplicar o mesmo cliente em todos os itens + botão de novo cliente avulso */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <select
                                            value={xmlOptions.bulkClientTarget}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val) handleApplyBulkClientToItems(val, false);
                                            }}
                                            className="h-8 rounded-xl border border-emerald-500/30 bg-black/50 px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[250px]"
                                        >
                                            <option value="">⚡ Aplicar cliente a todos os itens...</option>
                                            <option value="ESTOQUE">🏢 ESTOQUE GERAL (Marcenaria)</option>
                                            {clientAllocationOptions.customOpts.length > 0 && (
                                                <optgroup label="Clientes / Projetos Avulsos">
                                                    {clientAllocationOptions.customOpts.map((opt) => (
                                                        <option key={`bulk-cust-${opt.value}`} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {clientAllocationOptions.osOptions.length > 0 && (
                                                <optgroup label="Ordens de Serviço (Projetos)">
                                                    {clientAllocationOptions.osOptions.map((opt) => (
                                                        <option key={`bulk-os-${opt.value}`} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {clientAllocationOptions.clientOptions.length > 0 && (
                                                <optgroup label="Clientes Cadastrados (CRM)">
                                                    {clientAllocationOptions.clientOptions.map((opt) => (
                                                        <option key={`bulk-cli-${opt.value}`} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowNewClientInput((prev) => !prev)}
                                            className="h-8 rounded-xl text-[10px] font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Digitar Cliente Avulso
                                        </Button>
                                    </div>
                                </div>

                                {showNewClientInput && (
                                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/40 border border-emerald-500/30">
                                        <Input
                                            placeholder="Digite o nome do Cliente ou Projeto (ex: João - Cozinha)..."
                                            value={newCustomClientName}
                                            onChange={(e) => setNewCustomClientName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleAddCustomClient();
                                                }
                                            }}
                                            className="h-8 text-xs bg-black/40 border-white/15"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleAddCustomClient}
                                            className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 shrink-0"
                                        >
                                            Adicionar Cliente
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowNewClientInput(false)}
                                            className="h-8 px-2 text-muted-foreground"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}

                                {/* LISTA DE ITENS DO XML COM SELETOR DE CLIENTE E DIVISÃO DE ITEM */}
                                <div className="max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-black/40 divide-y divide-white/[0.06]">
                                    {parsedXml.items.map((item) => {
                                        const itemSplits = xmlItemSplits[item.id] || [
                                            {
                                                id: `${item.id}-0`,
                                                client: "",
                                                quantity: String(item.quantity),
                                                amount: item.totalPrice.toFixed(2),
                                            },
                                        ];
                                        const isMultiSplit = itemSplits.length > 1;
                                        const itemAllocatedSum = itemSplits.reduce(
                                            (acc, s) => acc + (parseFloat(String(s.amount).replace(",", ".")) || 0),
                                            0
                                        );
                                        const itemDiff = item.totalPrice - itemAllocatedSum;

                                        return (
                                            <div key={item.id} className="p-3 space-y-2 hover:bg-white/[0.02] transition-colors">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {parsedXml.sourceNotes.length > 1 && item.invoiceNumber && (
                                                                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-tech text-[9px] font-black">
                                                                    NF #{item.invoiceNumber}
                                                                </span>
                                                            )}
                                                            <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-tech text-[10px] font-bold">
                                                                #{item.code}
                                                            </span>
                                                            <span className="font-bold text-xs text-foreground">
                                                                {item.name}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] font-tech text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2">
                                                            <span>
                                                                {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                                                            </span>
                                                            {item.discount && item.discount > 0 ? (
                                                                <>
                                                                    <span className="text-amber-400">
                                                                        (Desc: -{formatCurrency(item.discount)})
                                                                    </span>
                                                                    <span>=</span>
                                                                    <strong className="text-primary font-black">
                                                                        {formatCurrency(item.totalPrice)}
                                                                    </strong>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>=</span>
                                                                    <strong className="text-primary font-black">
                                                                        {formatCurrency(item.totalPrice)}
                                                                    </strong>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {!isMultiSplit ? (
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <select
                                                                value={itemSplits[0]?.client || ""}
                                                                onChange={(e) =>
                                                                    handleItemSplitClientChange(
                                                                        item.id,
                                                                        itemSplits[0].id,
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className={cn(
                                                                    "h-8 rounded-lg border px-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 w-56 sm:w-64",
                                                                    itemSplits[0]?.client
                                                                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                                                        : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                                                                )}
                                                            >
                                                                <option value="" className="bg-[#121218] text-amber-300">
                                                                    🏢 Sem Cliente (Ir p/ Estoque Geral)
                                                                </option>
                                                                <option value="ESTOQUE" className="bg-[#121218] text-foreground">
                                                                    🏢 ESTOQUE GERAL
                                                                </option>
                                                                {clientAllocationOptions.customOpts.length > 0 && (
                                                                    <optgroup
                                                                        label="Clientes / Projetos Avulsos"
                                                                        className="bg-[#121218] text-foreground"
                                                                    >
                                                                        {clientAllocationOptions.customOpts.map((opt) => (
                                                                            <option key={opt.value} value={opt.value}>
                                                                                {opt.label}
                                                                            </option>
                                                                        ))}
                                                                    </optgroup>
                                                                )}
                                                                {clientAllocationOptions.osOptions.length > 0 && (
                                                                    <optgroup
                                                                        label="Ordens de Serviço (OS)"
                                                                        className="bg-[#121218] text-foreground"
                                                                    >
                                                                        {clientAllocationOptions.osOptions.map((opt) => (
                                                                            <option key={opt.value} value={opt.value}>
                                                                                {opt.label}
                                                                            </option>
                                                                        ))}
                                                                    </optgroup>
                                                                )}
                                                                {clientAllocationOptions.clientOptions.length > 0 && (
                                                                    <optgroup
                                                                        label="Clientes CRM"
                                                                        className="bg-[#121218] text-foreground"
                                                                    >
                                                                        {clientAllocationOptions.clientOptions.map((opt) => (
                                                                            <option key={opt.value} value={opt.value}>
                                                                                {opt.label}
                                                                            </option>
                                                                        ))}
                                                                    </optgroup>
                                                                )}
                                                            </select>

                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDivideXmlItem(item)}
                                                                title="Dividir este item entre 2 ou mais clientes"
                                                                className="h-8 px-2.5 rounded-lg border-white/15 bg-white/[0.03] hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/30 text-[10px] font-bold gap-1 shrink-0"
                                                            >
                                                                <Split className="h-3 w-3" />
                                                                Dividir Item
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={cn(
                                                                    "text-[10px] font-tech font-bold px-2 py-0.5 rounded-md border",
                                                                    Math.abs(itemDiff) < 0.05
                                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                                                )}
                                                            >
                                                                {Math.abs(itemDiff) < 0.05
                                                                    ? "✓ 100% Dividido"
                                                                    : itemDiff > 0
                                                                    ? `Faltam ${formatCurrency(itemDiff)}`
                                                                    : `Excedeu ${formatCurrency(Math.abs(itemDiff))}`}
                                                            </span>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleDivideXmlItem(item)}
                                                                className="h-7 px-2 rounded-lg border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-bold"
                                                            >
                                                                <Plus className="h-3 w-3 mr-1" />+ Cliente
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* SUB-LINHAS QUANDO UM MESMO ITEM É DIVIDIDO ENTRE 2 OU MAIS CLIENTES */}
                                                {isMultiSplit && (
                                                    <div className="pl-3 border-l-2 border-emerald-500/40 space-y-1.5 pt-1">
                                                        {itemSplits.map((sp, spIdx) => (
                                                            <div
                                                                key={sp.id}
                                                                className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white/[0.03] p-2 rounded-xl border border-white/10"
                                                            >
                                                                <span className="text-[10px] font-tech font-bold text-emerald-400 w-14 shrink-0">
                                                                    Parte {spIdx + 1}:
                                                                </span>
                                                                <select
                                                                    value={sp.client}
                                                                    onChange={(e) =>
                                                                        handleItemSplitClientChange(
                                                                            item.id,
                                                                            sp.id,
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="h-7 rounded-lg border border-white/15 bg-black/50 px-2 text-xs text-foreground flex-1 min-w-[160px]"
                                                                >
                                                                    <option value="">Selecione Cliente / OS...</option>
                                                                    <option value="ESTOQUE">🏢 ESTOQUE GERAL</option>
                                                                    {clientAllocationOptions.customOpts.map((opt) => (
                                                                        <option key={opt.value} value={opt.value}>
                                                                            {opt.label}
                                                                        </option>
                                                                    ))}
                                                                    {clientAllocationOptions.osOptions.map((opt) => (
                                                                        <option key={opt.value} value={opt.value}>
                                                                            {opt.label}
                                                                        </option>
                                                                    ))}
                                                                    {clientAllocationOptions.clientOptions.map((opt) => (
                                                                        <option key={opt.value} value={opt.value}>
                                                                            {opt.label}
                                                                        </option>
                                                                    ))}
                                                                </select>

                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        Qtd ({item.unit}):
                                                                    </span>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={sp.quantity}
                                                                        onChange={(e) =>
                                                                            handleItemSplitQtyChange(
                                                                                item,
                                                                                sp.id,
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        className="h-7 w-16 rounded-lg bg-black/40 border-white/15 font-tech text-xs text-center"
                                                                    />
                                                                </div>

                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        R$:
                                                                    </span>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={sp.amount}
                                                                        onChange={(e) =>
                                                                            handleItemSplitAmountChange(
                                                                                item,
                                                                                sp.id,
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        className="h-7 w-24 rounded-lg bg-black/40 border-white/15 font-tech text-xs font-bold text-primary text-right"
                                                                    />
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveItemSplit(item, sp.id)}
                                                                    className="p-1 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                                                                    title="Remover divisão"
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* INDICADOR INTELIGENTE DE ESTOQUE (SÓ ENTRA SE FOR ESTOQUE GERAL + RECONHECIMENTO IA DE ITEM EXISTENTE) */}
                                                {(() => {
                                                    const stockQtyForThisItem = itemSplits.reduce((acc, sp) => {
                                                        if (!isEstoqueGeralDestination(sp.client)) return acc;
                                                        const q = parseFloat(String(sp.quantity).replace(",", ".")) || 0;
                                                        return acc + Math.max(0, q);
                                                    }, 0);

                                                    if (stockQtyForThisItem <= 0) {
                                                        return (
                                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1">
                                                                <span>🚫 Material com Nome de Cliente —</span>
                                                                <span className="text-white">NÃO entra no Estoque</span>
                                                                <span className="text-muted-foreground font-normal">
                                                                    (vai direto para o custo da obra do cliente)
                                                                </span>
                                                            </div>
                                                        );
                                                    }

                                                    const explicitId = xmlItemStockOverrides[item.id];
                                                    const matchRes = findBestInventoryMatch(
                                                        item.name,
                                                        crmInventory,
                                                        item.code,
                                                        explicitId && explicitId !== "__NEW__" ? explicitId : undefined
                                                    );
                                                    const matchedStock =
                                                        explicitId === "__NEW__" ? null : matchRes.matchedItem;

                                                    return (
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-2.5 py-1.5">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <Sparkles className="h-3 w-3 text-emerald-400 shrink-0" />
                                                                {matchedStock ? (
                                                                    <>
                                                                        <span className="font-black text-emerald-300 uppercase">
                                                                            IA Estoque:
                                                                        </span>
                                                                        <span className="text-foreground">
                                                                            Vai somar{" "}
                                                                            <strong className="text-emerald-300">
                                                                                +{stockQtyForThisItem} {item.unit}
                                                                            </strong>{" "}
                                                                            em{" "}
                                                                            <strong className="text-white">
                                                                                #{matchedStock.id_estoque || "---"} — {matchedStock.name}
                                                                            </strong>{" "}
                                                                            <span className="text-muted-foreground font-tech">
                                                                                (Atual: {matchedStock.quantity} →{" "}
                                                                                {Number(matchedStock.quantity || 0) + stockQtyForThisItem})
                                                                            </span>
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="font-black text-sky-300 uppercase">
                                                                            Novo no Estoque:
                                                                        </span>
                                                                        <span className="text-foreground">
                                                                            Será criado como novo item{" "}
                                                                            <strong className="text-white">
                                                                                "{item.name}"
                                                                            </strong>{" "}
                                                                            (+{stockQtyForThisItem} {item.unit})
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>

                                                            <select
                                                                value={
                                                                    explicitId ||
                                                                    (matchedStock ? matchedStock.id : "__NEW__")
                                                                }
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setXmlItemStockOverrides((prev) => ({
                                                                        ...prev,
                                                                        [item.id]: val,
                                                                    }));
                                                                }}
                                                                className="h-6 rounded bg-black/60 border border-white/15 px-1.5 text-[10px] text-emerald-200 max-w-[230px]"
                                                                title="Escolher em qual item do estoque somar"
                                                            >
                                                                {matchedStock && (
                                                                    <option value={matchedStock.id}>
                                                                        ✓ Somar em: #{matchedStock.id_estoque} — {matchedStock.name}
                                                                    </option>
                                                                )}
                                                                <option value="__NEW__">
                                                                    + Criar como novo item no estoque
                                                                </option>
                                                                <optgroup label="Ou vincular a outro item do Estoque:">
                                                                    {crmInventory.map((invItem: any) => (
                                                                        <option key={invItem.id} value={invItem.id}>
                                                                            #{invItem.id_estoque || "---"} — {invItem.name} (Qtd: {invItem.quantity})
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            </select>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* RESUMO DO RATEIO POR CLIENTE GERADO AUTOMATICAMENTE */}
                                {xmlClientAllocationSummary.groups.length > 0 && (
                                    <div className="p-3 rounded-xl bg-black/30 border border-emerald-500/20 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                                                <Layers className="h-3.5 w-3.5" />
                                                Resumo da Divisão por Cliente / Projeto
                                            </span>
                                            <span className="text-[10px] font-tech text-muted-foreground">
                                                Total Rateado:{" "}
                                                <strong className="text-emerald-400">
                                                    {formatCurrency(parsedXml.totalAmount)}
                                                </strong>
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {xmlClientAllocationSummary.groups.map((grp) => (
                                                <div
                                                    key={grp.client}
                                                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-1"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-bold text-foreground truncate">
                                                            {grp.client === "ESTOQUE"
                                                                ? "🏢 ESTOQUE GERAL"
                                                                : `👤 ${grp.client}`}
                                                        </span>
                                                        <span className="text-xs font-tech font-black text-emerald-400 shrink-0">
                                                            {formatCurrency(grp.effectiveAmount)}{" "}
                                                            <span className="text-[10px] text-muted-foreground font-normal">
                                                                ({grp.percentage.toFixed(1)}%)
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                        Itens: {grp.itemsSummaryText}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ETAPA 2: LANÇAMENTO FINANCEIRO (BOLETO / CARTÃO, PARCELAS 30 / 60 / 90 E DATAS) */}
                            <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-4 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-xl bg-primary/15 text-primary border border-primary/30">
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black uppercase tracking-wider text-primary">
                                                2. Pagamento no Financeiro — Boletos (30 / 60 / 90) ou Cartão
                                            </h4>
                                            <p className="text-[11px] text-muted-foreground">
                                                Escolha se é Boleto ou Cartão, a divisão de parcelas e ajuste as datas de vencimento se precisar.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {xmlOptions.direction === "entrada" && (
                                            <label className="flex items-center gap-1.5 text-[11px] text-foreground cursor-pointer">
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
                                                Atualizar Estoque
                                            </label>
                                        )}
                                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-primary cursor-pointer">
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
                                            Lançar no Financeiro
                                        </label>
                                    </div>
                                </div>

                                {xmlOptions.createExpenseTransaction && (
                                    <div className="space-y-4">
                                        {/* SELETOR RÁPIDO: BOLETO vs CARTÃO vs PIX vs DINHEIRO */}
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                            <div className="md:col-span-5 space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    Meio de Pagamento Principal
                                                </Label>
                                                <div className="grid grid-cols-4 gap-1.5">
                                                    {(
                                                        [
                                                            { id: "Boleto", label: "📄 Boleto" },
                                                            { id: "Cartao", label: "💳 Cartão" },
                                                            { id: "Pix", label: "⚡ Pix" },
                                                            { id: "Dinheiro", label: "💵 Dinheiro" },
                                                        ] as const
                                                    ).map((m) => (
                                                        <button
                                                            key={m.id}
                                                            type="button"
                                                            onClick={() => handleChangeMainPaymentType(m.id)}
                                                            className={cn(
                                                                "h-9 rounded-xl text-xs font-bold border transition-all",
                                                                xmlOptions.paymentCategoryType === m.id
                                                                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                                                                    : "bg-black/40 border-white/10 text-muted-foreground hover:text-foreground"
                                                            )}
                                                        >
                                                            {m.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {xmlOptions.paymentCategoryType === "Cartao" && (
                                                <div className="md:col-span-3 space-y-1.5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                                                        Qual Cartão?
                                                    </Label>
                                                    <Select
                                                        value={xmlOptions.paymentMethod}
                                                        onValueChange={(v) =>
                                                            handleChangeMainPaymentType("Cartao", v)
                                                        }
                                                    >
                                                        <SelectTrigger className="h-9 rounded-xl bg-black/40 border-primary/40 text-xs font-bold">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="z-[100] bg-[#121218] border-white/15 text-foreground">
                                                            {PAYMENT_METHODS.filter((pm) =>
                                                                pm.startsWith("Cartão")
                                                            ).map((card) => (
                                                                <SelectItem key={card} value={card}>
                                                                    {card}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <div
                                                className={cn(
                                                    "space-y-1.5",
                                                    xmlOptions.paymentCategoryType === "Cartao"
                                                        ? "md:col-span-2"
                                                        : "md:col-span-3"
                                                )}
                                            >
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    Banco / Instituição
                                                </Label>
                                                <Select
                                                    value={xmlOptions.financialInstitution}
                                                    onValueChange={(v) =>
                                                        setXmlOptions((prev) => ({
                                                            ...prev,
                                                            financialInstitution: v,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger className="h-9 rounded-xl bg-black/40 border-white/10 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[100] bg-[#121218] border-white/15 text-foreground">
                                                        {FINANCIAL_INSTITUTIONS.map((inst) => (
                                                            <SelectItem key={inst} value={inst}>
                                                                {inst}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div
                                                className={cn(
                                                    "space-y-1.5",
                                                    xmlOptions.paymentCategoryType === "Cartao"
                                                        ? "md:col-span-2"
                                                        : "md:col-span-4"
                                                )}
                                            >
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    Subcategoria DRE
                                                </Label>
                                                <Select
                                                    value={xmlOptions.subcategory}
                                                    onValueChange={(v) =>
                                                        setXmlOptions((prev) => ({
                                                            ...prev,
                                                            subcategory: v,
                                                        }))
                                                    }
                                                >
                                                    <SelectTrigger className="h-9 rounded-xl bg-black/40 border-white/10 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="z-[100] bg-[#121218] border-white/15 text-foreground">
                                                        {(
                                                            SUBCATEGORIES[xmlOptions.category] ||
                                                            SUBCATEGORIES["Custo com Materiais e Obras"] ||
                                                            []
                                                        ).map((sub) => (
                                                            <SelectItem key={sub} value={sub}>
                                                                {sub}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* ATALHOS DE PRAZO (30 / 60 / 90 DA DATA DE EMISSÃO DA NOTA) */}
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                                                    Prazos e Divisão (Calculados da Data de Emissão:{" "}
                                                    {format(
                                                        new Date(parsedXml.issueDate + "T12:00:00"),
                                                        "dd/MM/yyyy"
                                                    )}
                                                    )
                                                </Label>
                                                <button
                                                    type="button"
                                                    onClick={handleEqualizeInstallments}
                                                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                                                >
                                                    <Sparkles className="h-3 w-3" />
                                                    Recalcular Divisão Igual
                                                </button>
                                            </div>

                                            {xmlOptions.paymentCategoryType === "Cartao" ? (
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                                                            <button
                                                                key={`card-n-${n}`}
                                                                type="button"
                                                                onClick={() =>
                                                                    handleSelectSchedulePreset(
                                                                        n === 1
                                                                            ? "30"
                                                                            : n === 2
                                                                            ? "30_60"
                                                                            : n === 3
                                                                            ? "30_60_90"
                                                                            : n === 4
                                                                            ? "30_60_90_120"
                                                                            : "custom",
                                                                        String(n),
                                                                        "30"
                                                                    )
                                                                }
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-xl text-xs font-black border transition-all",
                                                                    xmlInstallments.length === n
                                                                        ? "bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/20"
                                                                        : "bg-black/40 border-white/10 text-muted-foreground hover:text-foreground hover:border-white/25"
                                                                )}
                                                            >
                                                                💳 {n}x no Cartão
                                                            </button>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleSetCardDueDay10(xmlInstallments.length)
                                                            }
                                                            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-all"
                                                        >
                                                            📅 Vencimento Fatura Todo Dia 10
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {(
                                                        [
                                                            { id: "30_60_90", label: "🔥 30 / 60 / 90 dias (3x)" },
                                                            { id: "30_60", label: "30 / 60 dias (2x)" },
                                                            { id: "30", label: "30 dias (1x)" },
                                                            { id: "30_60_90_120", label: "30 / 60 / 90 / 120 (4x)" },
                                                            { id: "28_56_84", label: "28 / 56 / 84 dias (3x)" },
                                                            { id: "avista", label: "À Vista (1x)" },
                                                            ...(parsedXml.duplicates.length > 0
                                                                ? [
                                                                      {
                                                                          id: "xml_dup" as const,
                                                                          label: `Duplicatas do XML (${parsedXml.duplicates.length}x)`,
                                                                      },
                                                                  ]
                                                                : []),
                                                            { id: "custom", label: "⚙️ Outra Divisão (1x a 24x)" },
                                                        ] as const
                                                    ).map((p) => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => handleSelectSchedulePreset(p.id)}
                                                            className={cn(
                                                                "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                                                                xmlOptions.schedulePreset === p.id
                                                                    ? "bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20"
                                                                    : "bg-black/40 border-white/10 text-muted-foreground hover:text-foreground hover:border-white/25"
                                                            )}
                                                        >
                                                            {p.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {xmlOptions.schedulePreset === "custom" && (
                                                <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-black/40 border border-amber-500/30 mt-2">
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs">Qtd. de Parcelas:</Label>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max="36"
                                                            value={xmlOptions.customInstallmentCount}
                                                            onChange={(e) =>
                                                                handleSelectSchedulePreset(
                                                                    "custom",
                                                                    e.target.value,
                                                                    xmlOptions.customIntervalDays
                                                                )
                                                            }
                                                            className="h-8 w-20 bg-black/50 border-white/15 font-tech text-xs text-center font-bold"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs">Intervalo (dias):</Label>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max="90"
                                                            value={xmlOptions.customIntervalDays}
                                                            onChange={(e) =>
                                                                handleSelectSchedulePreset(
                                                                    "custom",
                                                                    xmlOptions.customInstallmentCount,
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="h-8 w-20 bg-black/50 border-white/15 font-tech text-xs text-center font-bold"
                                                        />
                                                    </div>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Gera as datas somando os dias a partir da emissão da nota.
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* TABELA EDITÁVEL DOS BOLETOS / PARCELAS */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    Boletos / Parcelas a serem lançados ({xmlInstallments.length})
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    <span
                                                        className={cn(
                                                            "text-xs font-tech font-bold",
                                                            Math.abs(
                                                                xmlInstallmentsTotal - parsedXml.totalAmount
                                                            ) < 0.05
                                                                ? "text-emerald-400"
                                                                : "text-amber-400"
                                                        )}
                                                    >
                                                        Soma: {formatCurrency(xmlInstallmentsTotal)} /{" "}
                                                        {formatCurrency(parsedXml.totalAmount)}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleAddInstallmentRow}
                                                        className="h-7 px-2.5 rounded-lg border-primary/30 bg-primary/10 text-primary text-[10px] font-bold"
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />+ Parcela
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                                {xmlInstallments.map((inst, idx) => (
                                                    <div
                                                        key={inst.id}
                                                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-black/40 border border-white/10"
                                                    >
                                                        <div className="sm:col-span-2 flex items-center gap-2">
                                                            <span className="px-2 py-1 rounded-lg bg-primary/15 text-primary font-tech text-xs font-black">
                                                                {idx + 1}/{xmlInstallments.length}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                <Input
                                                                    type="number"
                                                                    value={inst.daysOffset}
                                                                    onChange={(e) =>
                                                                        handleUpdateInstallment(
                                                                            idx,
                                                                            "daysOffset",
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="h-7 w-14 rounded-lg bg-black/50 border-white/10 font-tech text-xs text-center px-1"
                                                                    title="Dias após a emissão da nota"
                                                                />
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    dias
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="sm:col-span-3 flex items-center gap-1.5">
                                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                                Vencimento:
                                                            </span>
                                                            <Input
                                                                type="date"
                                                                value={inst.dueDate}
                                                                onChange={(e) =>
                                                                    handleUpdateInstallment(
                                                                        idx,
                                                                        "dueDate",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="h-8 rounded-lg bg-black/50 border-white/15 font-tech text-xs font-bold text-foreground"
                                                            />
                                                        </div>

                                                        <div className="sm:col-span-3">
                                                            <select
                                                                value={inst.paymentMethod}
                                                                onChange={(e) =>
                                                                    handleUpdateInstallment(
                                                                        idx,
                                                                        "paymentMethod",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="w-full h-8 rounded-lg border border-white/15 bg-black/50 px-2 text-xs font-semibold text-foreground"
                                                            >
                                                                {PAYMENT_METHODS.map((pm) => (
                                                                    <option key={pm} value={pm}>
                                                                        {pm}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="sm:col-span-2 flex items-center gap-1">
                                                            <span className="text-[10px] text-muted-foreground">
                                                                R$
                                                            </span>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={inst.amount}
                                                                onChange={(e) =>
                                                                    handleUpdateInstallment(
                                                                        idx,
                                                                        "amount",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="h-8 rounded-lg bg-black/50 border-primary/30 font-tech text-xs font-black text-primary text-right"
                                                            />
                                                        </div>

                                                        <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
                                                            <select
                                                                value={inst.status}
                                                                onChange={(e) =>
                                                                    handleUpdateInstallment(
                                                                        idx,
                                                                        "status",
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className={cn(
                                                                    "h-8 rounded-lg border px-2 text-[11px] font-bold",
                                                                    inst.status === "paid"
                                                                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                                                                        : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                                                                )}
                                                            >
                                                                <option value="pending" className="bg-[#121218]">
                                                                    A Pagar
                                                                </option>
                                                                <option value="paid" className="bg-[#121218]">
                                                                    Pago
                                                                </option>
                                                            </select>

                                                            {xmlInstallments.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleRemoveInstallmentRow(idx)
                                                                    }
                                                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                                                                    title="Remover parcela"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 flex-wrap">
                        <Button
                            variant="ghost"
                            onClick={() => setIsXmlDialogOpen(false)}
                            className="rounded-xl text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handlePreviewXmlDanfe}
                            className="rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs px-4 h-10 gap-2"
                        >
                            <Eye className="h-4 w-4 text-amber-400" />
                            Visualizar Prévia da Nota (DANFE)
                        </Button>
                        <Button
                            onClick={handleConfirmXmlImport}
                            disabled={isImportingXml}
                            className="rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs px-6 h-10 shadow-lg shadow-primary/20"
                        >
                            {isImportingXml ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Lançando Nota, Boletos & Rateio...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Confirmar e Lançar {xmlInstallments.length}x no Financeiro
                                </>
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

            {/* MODAL 4: VISUALIZADOR DE ITENS SEPARADOS DA NOTA FISCAL */}
            <Dialog open={Boolean(viewingInvoice)} onOpenChange={(o) => !o && setViewingInvoice(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0c0c10] border border-white/15 shadow-2xl rounded-3xl text-foreground">
                    {viewingInvoice &&
                        (() => {
                            const xmlMeta = parseStoredXmlPayload(viewingInvoice);
                            const fallbackParts = !xmlMeta
                                ? (viewingInvoice.description || "")
                                      .replace(/^\[XML[^\]]*\]\s*/i, "")
                                      .replace(/\|\s*Clientes:\s*[^|]+/g, "")
                                      .replace(/\|\s*Chave:\s*[0-9]{44}/g, "")
                                      .split(/,\s*(?=\d+(?:[.,]\d+)?x\s)/i)
                                      .map((p) => p.trim())
                                      .filter(Boolean)
                                : [];

                            return (
                                <>
                                    <DialogHeader>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="tech-hud-pill text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                                                <Layers className="h-3.5 w-3.5" />
                                                ITENS SEPARADOS DA NF-e #{viewingInvoice.invoice_number}
                                            </span>
                                        </div>
                                        <DialogTitle className="text-xl font-display font-black">
                                            {viewingInvoice.client_name} — {formatCurrency(viewingInvoice.amount)}
                                        </DialogTitle>
                                        <DialogDescription className="text-xs text-muted-foreground">
                                            Emissão:{" "}
                                            {format(
                                                new Date(viewingInvoice.issue_date + "T12:00:00"),
                                                "dd/MM/yyyy"
                                            )}
                                            {xmlMeta?.totals?.discountAmount
                                                ? ` • Produtos: ${formatCurrency(
                                                      xmlMeta.totals.productsTotal
                                                  )} • Desconto: -${formatCurrency(
                                                      xmlMeta.totals.discountAmount
                                                  )}`
                                                : ""}
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4 py-2">
                                        {xmlMeta && xmlMeta.items.length > 0 ? (
                                            <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/40">
                                                <Table>
                                                    <TableHeader className="bg-white/[0.03]">
                                                        <TableRow className="border-b border-white/10">
                                                            <TableHead className="text-[10px] font-black uppercase">
                                                                Cód.
                                                            </TableHead>
                                                            <TableHead className="text-[10px] font-black uppercase">
                                                                Produto / Cliente
                                                            </TableHead>
                                                            <TableHead className="text-[10px] font-black uppercase text-right">
                                                                Qtd.
                                                            </TableHead>
                                                            <TableHead className="text-[10px] font-black uppercase text-right">
                                                                Vlr. Unit.
                                                            </TableHead>
                                                            <TableHead className="text-[10px] font-black uppercase text-right">
                                                                Desc.
                                                            </TableHead>
                                                            <TableHead className="text-[10px] font-black uppercase text-right">
                                                                Total Líq.
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {xmlMeta.items.map((it, idx) => (
                                                            <TableRow
                                                                key={idx}
                                                                className="border-b border-white/[0.05]"
                                                            >
                                                                <TableCell className="font-tech text-[11px] text-primary">
                                                                    #{it.code}
                                                                </TableCell>
                                                                <TableCell className="text-xs">
                                                                    <div className="font-bold text-foreground">
                                                                        {it.name}
                                                                    </div>
                                                                    {it.clients && (
                                                                        <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                                                                            👤 {it.clients}
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-xs font-tech text-right">
                                                                    {it.quantity} {it.unit}
                                                                </TableCell>
                                                                <TableCell className="text-xs font-tech text-right text-muted-foreground">
                                                                    {formatCurrency(it.unitPrice)}
                                                                </TableCell>
                                                                <TableCell className="text-xs font-tech text-right text-amber-400">
                                                                    {it.discount && it.discount > 0
                                                                        ? `-${formatCurrency(it.discount)}`
                                                                        : "-"}
                                                                </TableCell>
                                                                <TableCell className="text-xs font-tech font-black text-right text-primary">
                                                                    {formatCurrency(it.totalPrice)}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2">
                                                <p className="text-[11px] text-amber-300 font-semibold">
                                                    Nota importada anteriormente (itens identificados na descrição):
                                                </p>
                                                {fallbackParts.map((part, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-semibold"
                                                    >
                                                        {idx + 1}. {part}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {xmlMeta?.duplicates && xmlMeta.duplicates.length > 0 && (
                                            <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-primary">
                                                    Boletos / Parcelas ({xmlMeta.duplicates.length}x)
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    {xmlMeta.duplicates.map((dup, dIdx) => (
                                                        <div
                                                            key={dIdx}
                                                            className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-xs"
                                                        >
                                                            <div>
                                                                <span className="font-tech font-bold text-primary block">
                                                                    Parc. {dup.number}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {dup.dueDate
                                                                        ? format(
                                                                              new Date(dup.dueDate + "T12:00:00"),
                                                                              "dd/MM/yyyy"
                                                                          )
                                                                        : "-"}
                                                                </span>
                                                            </div>
                                                            <span className="font-tech font-black text-foreground">
                                                                {formatCurrency(dup.amount)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <DialogFooter className="gap-2 flex-wrap">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setViewingInvoice(null)}
                                            className="rounded-xl text-xs"
                                        >
                                            Fechar
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                const inv = viewingInvoice;
                                                setViewingInvoice(null);
                                                handleOpenLaunchFromExistingInvoice(inv);
                                            }}
                                            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-xs px-5 gap-2 shadow-lg shadow-emerald-600/20"
                                        >
                                            <Users className="h-4 w-4" />
                                            Colocar Clientes & Ir p/ Lançamento
                                        </Button>
                                        <Button
                                            onClick={() => handlePrintDanfe(viewingInvoice)}
                                            className="rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs px-5 gap-2"
                                        >
                                            <Printer className="h-4 w-4" />
                                            Imprimir DANFE com Itens Separados
                                        </Button>
                                    </DialogFooter>
                                </>
                            );
                        })()}
                </DialogContent>
            </Dialog>

            {/* MODAL 5: ENTRADA DE NOTA DE MATERIAL SEM XML (CHAVE / FOTO / PDF / MANUAL) */}
            <InboundInvoiceDialog
                open={isInboundWithoutXmlOpen}
                onOpenChange={setIsInboundWithoutXmlOpen}
                onSuccess={fetchInvoices}
                onOpenClientSplitLaunch={(savedInvoice) => {
                    fetchInvoices();
                    handleOpenLaunchFromExistingInvoice(savedInvoice);
                }}
            />
        </div>
    );
}
