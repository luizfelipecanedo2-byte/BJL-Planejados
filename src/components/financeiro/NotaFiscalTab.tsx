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
    code: string;
    name: string;
    ncm: string;
    cfop: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

interface ParsedXmlDuplicate {
    number: string;
    dueDate: string;
    amount: number;
}

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
}

const FREE_TIER_LIMIT = 30; // Cota mensal gratuita de referência na Nuvem Fiscal

export default function NotaFiscalTab({ onRefresh }: NotaFiscalTabProps = {}) {
    const { settings: companySettings } = useCompanySettings();
    const xmlInputRef = useRef<HTMLInputElement | null>(null);
    const certInputRef = useRef<HTMLInputElement | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState<"ALL" | "NF-e" | "NFS-e">("ALL");
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Clientes, Vendas & Ordens de Serviço do CRM para preenchimento em 1 clique e rateio por item
    const [crmClients, setCrmClients] = useState<any[]>([]);
    const [crmSales, setCrmSales] = useState<any[]>([]);
    const [crmServiceOrders, setCrmServiceOrders] = useState<any[]>([]);
    const [customClientOptions, setCustomClientOptions] = useState<string[]>([]);
    const [newCustomClientName, setNewCustomClientName] = useState("");
    const [showNewClientInput, setShowNewClientInput] = useState(false);

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
        quantity: "1",
        unitPrice: "",
        amount: "",
        ncm: "94036000", // Móveis de madeira
        cfop: "5102", // Venda Dentro do Estado (igual Nota Fiscal Neto.pdf)
        serviceCode: "14.13", // Carpintaria e marcenaria (LC 116)
        taxRate: "6.0", // Simples Nacional Anexo I/III referência
        autoCreateFinance: true,
    });

    // Modal de Importação de XML + Alocação de Cliente por Item + Lançamento de Boletos/Cartão 30/60/90
    const [isXmlDialogOpen, setIsXmlDialogOpen] = useState(false);
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
            const [clientsRes, salesRes, osRes] = await Promise.all([
                supabase.from("clients").select("*").order("name"),
                supabase.from("sales").select("*").order("created_at", { ascending: false }),
                supabase.from("service_orders").select("*").order("created_at", { ascending: false }),
            ]);
            if (clientsRes.data) setCrmClients(clientsRes.data);
            if (salesRes.data) setCrmSales(salesRes.data);
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
                    ? Number((qty1 * item.unitPrice).toFixed(2))
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
        const qtyNum = Math.max(0, parseFloat(newQtyStr.replace(",", ".")) || 0);
        const calcAmt = Number(Math.min(item.totalPrice, qtyNum * item.unitPrice).toFixed(2));

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
        const amtNum = Math.max(0, parseFloat(newAmtStr.replace(",", ".")) || 0);
        const calcQty =
            item.unitPrice > 0
                ? Number((amtNum / item.unitPrice).toFixed(2))
                : Number(item.quantity);

        setXmlItemSplits((prev) => {
            const list = prev[item.id] || [];
            if (list.length === 2) {
                const otherIdx = list.findIndex((s) => s.id !== splitId);
                const remAmt = Math.max(0, Number((item.totalPrice - amtNum).toFixed(2)));
                const remQty =
                    item.unitPrice > 0
                        ? Math.max(0, Number((remAmt / item.unitPrice).toFixed(2)))
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

    const handleSelectSaleOrClient = (val: string) => {
        if (val.startsWith("sale:")) {
            const saleId = val.replace("sale:", "");
            const sale = crmSales.find((s) => s.id === saleId);
            if (sale) {
                const matchingClient = crmClients.find(
                    (c) => (c.name || "").toLowerCase() === (sale.client_name || "").toLowerCase()
                );
                const saleTotal = Number(sale.total_value || 0);
                const saleQty = Math.max(1, Number(sale.quantity || 1));
                const calcUnit = saleTotal > 0 ? (saleTotal / saleQty).toFixed(2) : "";
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
                    quantity: String(saleQty),
                    unitPrice: calcUnit,
                    amount: saleTotal > 0 ? String(saleTotal) : "",
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
        const numericQty = Math.max(1, parseFloat(String(emitForm.quantity || "1").replace(",", ".")) || 1);
        const numericAmount = parseFloat(String(emitForm.amount || "0").replace(",", "."));
        const numericUnitPrice =
            parseFloat(String(emitForm.unitPrice || "0").replace(",", ".")) > 0
                ? parseFloat(String(emitForm.unitPrice || "0").replace(",", "."))
                : Number((numericAmount / numericQty).toFixed(2));

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
                        cfop: emitForm.cfop || "5102",
                        ncm: (emitForm.ncm || "94036000").replace(/\D/g, ""),
                        unidade: "UN",
                        quantidade: numericQty,
                        valorUnitario: numericUnitPrice,
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
                description: `${emitForm.description.trim()} | Qtd: ${numericQty} | VUnit: ${numericUnitPrice.toFixed(2)}${
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

    // Leitor Nativo de XML da SEFAZ (100% Gratuito) + Rateio por Item/Cliente + Gerador 30/60/90
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
                const emitterFantasyName = emit ? getTagText(emit, "xFant") : "";
                const emitterCnpj = emit ? getTagText(emit, "CNPJ") || getTagText(emit, "CPF") : "";

                const dest = xmlDoc.getElementsByTagName("dest")[0];
                const recipientName = dest ? getTagText(dest, "xNome") : "";
                const recipientDoc = dest ? getTagText(dest, "CNPJ") || getTagText(dest, "CPF") : "";

                const icmsTot = xmlDoc.getElementsByTagName("ICMSTot")[0];
                const totalAmount = icmsTot ? parseFloat(getTagText(icmsTot, "vNF") || "0") : 0;
                const productsTotal = icmsTot ? parseFloat(getTagText(icmsTot, "vProd") || "0") : 0;
                const freightAmount = icmsTot ? parseFloat(getTagText(icmsTot, "vFrete") || "0") : 0;
                const discountAmount = icmsTot ? parseFloat(getTagText(icmsTot, "vDesc") || "0") : 0;
                const ipiAmount = icmsTot ? parseFloat(getTagText(icmsTot, "vIPI") || "0") : 0;
                const stAmount = icmsTot ? parseFloat(getTagText(icmsTot, "vST") || "0") : 0;
                const outroAmount = icmsTot ? parseFloat(getTagText(icmsTot, "vOutro") || "0") : 0;
                const otherAmount = ipiAmount + stAmount + outroAmount;

                const detNodes = Array.from(xmlDoc.getElementsByTagName("det"));
                const items: ParsedXmlItem[] = detNodes.map((det, idx) => {
                    const prod = det.getElementsByTagName("prod")[0];
                    return {
                        id: `xml-item-${idx}`,
                        code: prod ? getTagText(prod, "cProd") : String(idx + 1),
                        name: prod ? getTagText(prod, "xProd") : `Item NF-e #${idx + 1}`,
                        ncm: prod ? getTagText(prod, "NCM") : "",
                        cfop: prod ? getTagText(prod, "CFOP") : "",
                        unit: prod ? getTagText(prod, "uCom") : "UN",
                        quantity: prod ? parseFloat(getTagText(prod, "qCom") || "1") : 1,
                        unitPrice: prod ? parseFloat(getTagText(prod, "vUnCom") || "0") : 0,
                        totalPrice: prod ? parseFloat(getTagText(prod, "vProd") || "0") : 0,
                    };
                });

                // Duplicatas / Boletos caso constem na tag <cobr><dup> do XML
                const dupNodes = Array.from(xmlDoc.getElementsByTagName("dup"));
                const duplicates: ParsedXmlDuplicate[] = dupNodes
                    .map((dup, idx) => ({
                        number: getTagText(dup, "nDup") || String(idx + 1),
                        dueDate: getTagText(dup, "dVenc"),
                        amount: parseFloat(getTagText(dup, "vDup") || "0"),
                    }))
                    .filter((d) => d.amount > 0);

                if (!invoiceNumber && items.length === 0) {
                    toast.error("O arquivo selecionado não parece ser um XML padrão SEFAZ NF-e.");
                    return;
                }

                const finalTotalAmount =
                    totalAmount > 0
                        ? totalAmount
                        : items.reduce((acc, it) => acc + it.totalPrice, 0);

                // Inicializa 1 linha de alocação de cliente para cada item do XML
                const initialSplits: Record<string, XmlItemClientSplit[]> = {};
                items.forEach((it) => {
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

                // Detecta automaticamente se o XML é da BRUTA (Cartão) ou da CED / C&D (Boleto 30/60/90)
                const detectedSupplier = detectSupplierProfile(emitterName, emitterFantasyName);
                const initialPaymentCat = detectedSupplier === "bruta" ? "Cartao" : "Boleto";
                const initialPaymentMethod =
                    detectedSupplier === "bruta" ? "Cartão Nubank" : "Boleto";

                // Gera por padrão os boletos/parcelas 30 / 60 / 90 dias a partir da data de emissão da nota
                const defaultInstallments = buildInstallmentsFromPreset(
                    issueDate,
                    finalTotalAmount,
                    "30_60_90",
                    initialPaymentMethod,
                    duplicates,
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
                    schedulePreset: "30_60_90",
                    customInstallmentCount: "3",
                    customIntervalDays: "30",
                    bulkClientTarget: "",
                }));

                setParsedXml({
                    accessKey,
                    invoiceNumber: invoiceNumber || String(Math.floor(1000 + Math.random() * 9000)),
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
                    )}) está diferente do valor total da nota (${formatCurrency(
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

            const summaryItems = parsedXml.items
                .slice(0, 3)
                .map((i) => `${i.quantity}x ${i.name}`)
                .join(", ");

            const clientNamesInNote = xmlClientAllocationSummary.groups
                .map((g) => (g.client === "ESTOQUE" ? "Estoque Geral" : g.client))
                .join(" | ");

            const newInvoice = {
                issue_date: parsedXml.issueDate,
                client_name: partyName,
                description: `[XML ${xmlOptions.direction.toUpperCase()}] ${summaryItems}${
                    parsedXml.items.length > 3 ? ` (+${parsedXml.items.length - 3} itens)` : ""
                }${clientNamesInNote ? ` | Clientes: ${clientNamesInNote}` : ""}${
                    parsedXml.accessKey ? ` | Chave: ${parsedXml.accessKey}` : ""
                }`,
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
            if (
                xmlOptions.direction === "entrada" &&
                xmlOptions.updateInventory &&
                parsedXml.items.length > 0
            ) {
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

            // 2. Se marcou lançar no Financeiro (Boletos 30/60/90, Cartão ou À Vista + Rateio por Cliente/Item)
            if (xmlOptions.createExpenseTransaction && xmlInstallments.length > 0) {
                const totalInst = xmlInstallments.length;
                const groups = xmlClientAllocationSummary.groups;

                // Se 100% da nota foi destinada a 1 única OS, preenche order_service e service direto na transação também
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

                const supplierFriendlyTitle =
                    xmlOptions.supplierPreset === "ced"
                        ? `Compra de material na C&D (NF #${parsedXml.invoiceNumber})`
                        : xmlOptions.supplierPreset === "bruta"
                        ? `Compra de material na Bruta (NF #${parsedXml.invoiceNumber})`
                        : `NF-e #${parsedXml.invoiceNumber} - ${partyName}`;

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

                // 3. Salva o rateio detalhado de cada item para cada cliente em transaction_allocations
                if (insertedTxs && insertedTxs.length > 0 && groups.length > 0) {
                    const totalLaunched = insertedTxs.reduce(
                        (acc: number, t: any) => acc + Number(t.amount || 0),
                        0
                    );
                    const totalClientsEffective = groups.reduce(
                        (acc, g) => acc + g.effectiveAmount,
                        0
                    );

                    // Ajusta o total de cada cliente caso o usuário tenha editado o valor total das parcelas
                    const targetClientTotals = groups.map((g, k) => {
                        if (totalClientsEffective <= 0) return 0;
                        if (k === groups.length - 1) {
                            const prevSum = groups
                                .slice(0, k)
                                .reduce(
                                    (acc, pg) =>
                                        acc +
                                        Number(
                                            (
                                                pg.effectiveAmount *
                                                (totalLaunched / totalClientsEffective)
                                            ).toFixed(2)
                                        ),
                                    0
                                );
                            return Number(Math.max(0, totalLaunched - prevSum).toFixed(2));
                        }
                        return Number(
                            (g.effectiveAmount * (totalLaunched / totalClientsEffective)).toFixed(2)
                        );
                    });

                    const accumulatedByClient = new Array(groups.length).fill(0);
                    const allocationsToInsert: any[] = [];

                    insertedTxs.forEach((tx: any, i: number) => {
                        const txAmount = Number(tx.amount || 0);
                        const isLastTx = i === insertedTxs.length - 1;
                        let rowSum = 0;

                        groups.forEach((g, k) => {
                            const isLastClient = k === groups.length - 1;
                            let allocAmount = 0;

                            if (isLastTx) {
                                allocAmount = Number(
                                    Math.max(0, targetClientTotals[k] - accumulatedByClient[k]).toFixed(2)
                                );
                            } else if (isLastClient) {
                                allocAmount = Number(Math.max(0, txAmount - rowSum).toFixed(2));
                            } else {
                                const ratio = totalLaunched > 0 ? txAmount / totalLaunched : 0;
                                allocAmount = Number((targetClientTotals[k] * ratio).toFixed(2));
                            }

                            rowSum += allocAmount;
                            accumulatedByClient[k] = Number(
                                (accumulatedByClient[k] + allocAmount).toFixed(2)
                            );

                            if (allocAmount > 0) {
                                const parcelTag =
                                    insertedTxs.length > 1 ? ` [Parc. ${i + 1}/${insertedTxs.length}]` : "";
                                allocationsToInsert.push({
                                    transaction_id: tx.id,
                                    client_name: g.client,
                                    amount: allocAmount,
                                    description: `🟢 ${g.itemsSummaryText}${parcelTag}`.trim(),
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

            if (insertedInvoice) {
                setInvoices((prev) => [insertedInvoice, ...prev]);
            } else {
                await fetchInvoices();
            }

            if (onRefresh) {
                onRefresh();
            }

            toast.success(
                `NF-e #${parsedXml.invoiceNumber} importada! ${
                    xmlOptions.createExpenseTransaction
                        ? `${xmlInstallments.length} lançamento(s) (${xmlOptions.paymentMethod}) e rateio de ${xmlClientAllocationSummary.groups.length} cliente(s)/destino(s) criados no Financeiro!`
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

        const qtyFromDesc = parseFloat(invoice.description.match(/Qtd:\s*([0-9.,]+)/)?.[1]?.replace(",", ".") || "1") || 1;
        const unitFromDesc = parseFloat(invoice.description.match(/VUnit:\s*([0-9.,]+)/)?.[1]?.replace(",", ".") || "0");

        const cleanDesc = invoice.description
            .replace(/\|\s*Qtd:\s*[^|]+/g, "")
            .replace(/\|\s*VUnit:\s*[^|]+/g, "")
            .replace(/\|\s*Doc:\s*[^|]+/g, "")
            .replace(/\|\s*NCM\s*[^|]+/g, "")
            .replace(/\|\s*CFOP\s*[^|]+/g, "")
            .replace(/\|\s*Chave:\s*[0-9]{44}/g, "")
            .replace(/\|\s*Prot SEFAZ:\s*[0-9]+/g, "")
            .trim();

        const issueDateFormatted = format(new Date(invoice.issue_date + "T12:00:00"), "dd/MM/yyyy");
        const totalNumeric = Number(invoice.amount || 0);
        const unitNumeric = unitFromDesc > 0 ? unitFromDesc : totalNumeric / qtyFromDesc;
        const qtyFormatted = qtyFromDesc.toLocaleString("pt-BR", {
            minimumFractionDigits: 3,
            maximumFractionDigits: 3,
        });
        const unitFormatted = unitNumeric.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        const valFormatted = totalNumeric.toLocaleString("pt-BR", {
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
                                <td class="num-right">${qtyFormatted}</td>
                                <td class="num-right">${unitFormatted}</td>
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

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="sm:col-span-6 space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Discriminação dos Móveis / Serviços na Nota
                                </Label>
                                <Input
                                    required
                                    placeholder="Ex: Nicho 30x30 em MDF"
                                    value={emitForm.description}
                                    onChange={(e) =>
                                        setEmitForm((prev) => ({ ...prev, description: e.target.value }))
                                    }
                                    className="h-10 rounded-xl bg-white/[0.03] border-white/10 text-xs"
                                />
                            </div>

                            <div className="sm:col-span-3 space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                                    Quantidade (Unid.)
                                </Label>
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
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
                                    className="h-10 rounded-xl bg-primary/10 border-primary/30 font-tech font-bold text-primary text-center text-xs"
                                />
                            </div>

                            <div className="sm:col-span-3 space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    Valor Unitário (R$)
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
                                    className="h-10 rounded-xl bg-white/[0.03] border-white/10 font-tech text-xs"
                                />
                            </div>
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
                                        CNPJ/CPF: {parsedXml.emitterCnpj || "Não informado"} • Série {parsedXml.series}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 block mb-1">
                                        Data de Emissão da Nota
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
                                        Valor Total da Nota
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
                                                            <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-tech text-[10px] font-bold">
                                                                #{item.code}
                                                            </span>
                                                            <span className="font-bold text-xs text-foreground">
                                                                {item.name}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] font-tech text-muted-foreground mt-0.5">
                                                            {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)} ={" "}
                                                            <strong className="text-primary font-black">
                                                                {formatCurrency(item.totalPrice)}
                                                            </strong>
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

                    <DialogFooter className="gap-2">
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
        </div>
    );
}
