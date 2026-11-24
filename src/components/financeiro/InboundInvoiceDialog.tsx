import React, { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    KeyRound,
    Upload,
    FileText,
    Sparkles,
    CheckCircle2,
    Loader2,
    Plus,
    Trash2,
    ExternalLink,
    Copy,
    Package,
    Building2,
    AlertTriangle,
    Camera,
    ClipboardPaste,
    Search,
    Truck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { extractDanfeWithAI } from "@/services/geminiService";

export interface InboundInvoiceItem {
    code: string;
    name: string;
    ncm: string;
    cfop: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    inventoryId?: string;
    weeklyOrderId?: string;
}

interface InboundInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

const UF_CODES: Record<string, string> = {
    "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO",
    "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA",
    "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
    "41": "PR", "42": "SC", "43": "RS",
    "50": "MS", "51": "MT", "52": "GO", "53": "DF",
};

export interface DecodedSefazKey {
    rawKey: string;
    ufCode: string;
    ufSigla: string;
    yearMonth: string; // YYYY-MM
    cnpj: string;
    formattedCnpj: string;
    model: string;
    series: string;
    invoiceNumber: string;
    isValidCheckDigit: boolean;
}

export function decodeSefazAccessKey(input: string): DecodedSefazKey | null {
    const clean = input.replace(/\D/g, "");
    if (clean.length !== 44) return null;

    const ufCode = clean.substring(0, 2);
    const ufSigla = UF_CODES[ufCode] || "BR";
    const yy = clean.substring(2, 4);
    const mm = clean.substring(4, 6);
    const yearMonth = `20${yy}-${mm}`;
    const cnpj = clean.substring(6, 20);
    const formattedCnpj = cnpj.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
    );
    const model = clean.substring(20, 22);
    const series = String(parseInt(clean.substring(22, 25), 10) || 1);
    const invoiceNumber = String(parseInt(clean.substring(25, 34), 10) || 1);

    // Cálculo oficial Módulo 11 SEFAZ para validar o 44º dígito verificador
    let sum = 0;
    let weight = 2;
    for (let i = 42; i >= 0; i--) {
        sum += parseInt(clean[i], 10) * weight;
        weight = weight === 9 ? 2 : weight + 1;
    }
    const remainder = sum % 11;
    const expectedDv = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
    const actualDv = parseInt(clean[43], 10);

    return {
        rawKey: clean,
        ufCode,
        ufSigla,
        yearMonth,
        cnpj,
        formattedCnpj,
        model,
        series,
        invoiceNumber,
        isValidCheckDigit: expectedDv === actualDv,
    };
}

export const InboundInvoiceDialog: React.FC<InboundInvoiceDialogProps> = ({
    open,
    onOpenChange,
    onSuccess,
}) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [activeMethod, setActiveMethod] = useState<string>("chave");

    // Dados do Cabeçalho da Nota
    const [accessKeyInput, setAccessKeyInput] = useState("");
    const [decodedKey, setDecodedKey] = useState<DecodedSefazKey | null>(null);
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [series, setSeries] = useState("1");
    const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [emitterName, setEmitterName] = useState("");
    const [emitterCnpj, setEmitterCnpj] = useState("");
    const [totalAmount, setTotalAmount] = useState("");

    // Itens da Nota
    const [items, setItems] = useState<InboundInvoiceItem[]>([]);

    // Catálogo de Estoque & Pedidos Pendentes para adição em 1 clique
    const [inventoryCatalog, setInventoryCatalog] = useState<any[]>([]);
    const [pendingWeeklyOrders, setPendingWeeklyOrders] = useState<any[]>([]);
    const [selectedStockId, setSelectedStockId] = useState<string>("");

    // Estados de busca / carregamento
    const [isPullingKey, setIsPullingKey] = useState(false);
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [pastedText, setPastedText] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [needsGeminiKey, setNeedsGeminiKey] = useState(false);
    const [tempGeminiKey, setTempGeminiKey] = useState("");

    // Opções de integração Estoque + Financeiro
    const [options, setOptions] = useState({
        updateInventory: true,
        createExpenseTransaction: true,
        paymentStatus: "pending" as "pending" | "paid",
        paymentMethod: "Boleto",
        dueDate: new Date().toISOString().split("T")[0],
    });

    useEffect(() => {
        if (open) {
            loadStockAndOrders();
        }
    }, [open]);

    const loadStockAndOrders = async () => {
        try {
            const [stockRes, ordersRes] = await Promise.all([
                supabase.from("inventory").select("*").order("name"),
                supabase.from("weekly_orders").select("*").eq("status", "pendente").order("order_date", { ascending: false }),
            ]);
            if (stockRes.data) setInventoryCatalog(stockRes.data);
            if (ordersRes.data) setPendingWeeklyOrders(ordersRes.data);
        } catch (err) {
            console.error("Erro ao carregar estoque/pedidos:", err);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

    // Consulta pública do CNPJ do fornecedor via BrasilAPI / ReceitaWS / CNPJ.ws
    const lookupSupplierByCnpj = async (rawCnpj: string): Promise<{ name: string; city?: string; uf?: string } | null> => {
        const cleanCnpj = rawCnpj.replace(/\D/g, "");
        if (cleanCnpj.length !== 14) return null;

        // 1. Tenta BrasilAPI (gratuita e rápida)
        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
            if (res.ok) {
                const data = await res.json();
                const name = (data.nome_fantasia || data.razao_social || "").trim();
                if (name) {
                    return { name, city: data.municipio, uf: data.uf };
                }
            }
        } catch {
            // fallback
        }

        // 2. Fallback: publica.cnpj.ws
        try {
            const res = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`);
            if (res.ok) {
                const data = await res.json();
                const name = (data.estabelecimento?.nome_fantasia || data.razao_social || "").trim();
                if (name) {
                    return {
                        name,
                        city: data.estabelecimento?.cidade?.nome,
                        uf: data.estabelecimento?.estado?.sigla,
                    };
                }
            }
        } catch {
            // ignore
        }

        return null;
    };

    // Puxar dados pela Chave de Acesso de 44 dígitos
    const handlePullByAccessKey = async (customKey?: string) => {
        const raw = (customKey ?? accessKeyInput).replace(/\D/g, "");
        if (raw.length !== 44) {
            toast.error(`A Chave de Acesso precisa ter 44 dígitos numéricos (atual: ${raw.length} dígitos).`);
            return;
        }

        const decoded = decodeSefazAccessKey(raw);
        if (!decoded) return;

        setDecodedKey(decoded);
        setInvoiceNumber(decoded.invoiceNumber);
        setSeries(decoded.series);
        setEmitterCnpj(decoded.formattedCnpj);

        // Ajusta a data de emissão caso o mês/ano da chave seja diferente do mês atual
        const currentYm = issueDate.substring(0, 7);
        if (decoded.yearMonth && decoded.yearMonth !== currentYm) {
            const [y, m] = decoded.yearMonth.split("-");
            const monthNum = parseInt(m, 10);
            if (monthNum >= 1 && monthNum <= 12) {
                setIssueDate(`${y}-${m}-01`);
            }
        }

        setIsPullingKey(true);
        try {
            // 1. Consulta o CNPJ do fornecedor na Receita Federal (BrasilAPI / CNPJ.ws)
            const supplierInfo = await lookupSupplierByCnpj(decoded.cnpj);
            if (supplierInfo?.name) {
                setEmitterName(supplierInfo.name);
            }

            // 2. Verifica se existe API Fiscal configurada (Notaas / Focus NFe) para tentar baixar itens
            let pulledItemsFromApi = false;
            const localFiscalRaw = localStorage.getItem("bjl_nuvem_fiscal_config");
            if (localFiscalRaw) {
                try {
                    const fiscalCfg = JSON.parse(localFiscalRaw);
                    if (fiscalCfg?.clientSecret) {
                        const apiKey = fiscalCfg.clientSecret.trim();
                        if (fiscalCfg.provider === "notaas" || apiKey.startsWith("ntaas_")) {
                            const res = await fetch(`https://platform.notaas.com.br/api/v1/nfe/${decoded.rawKey}`, {
                                headers: { "x-api-key": apiKey },
                            }).catch(() => null);
                            if (res && res.ok) {
                                const data = await res.json().catch(() => ({}));
                                if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
                                    const apiItems: InboundInvoiceItem[] = data.items.map((it: any, idx: number) => ({
                                        code: it.codigo || String(idx + 1),
                                        name: it.descricao || "Material NF-e",
                                        ncm: it.ncm || "",
                                        cfop: it.cfop || "1102",
                                        unit: it.unidade || "UN",
                                        quantity: Number(it.quantidade) || 1,
                                        unitPrice: Number(it.valorUnitario) || 0,
                                        totalPrice: Number(it.valorTotal) || 0,
                                    }));
                                    setItems(apiItems);
                                    const sum = apiItems.reduce((acc, i) => acc + i.totalPrice, 0);
                                    if (sum > 0) setTotalAmount(sum.toFixed(2));
                                    pulledItemsFromApi = true;
                                }
                            }
                        }
                    }
                } catch {
                    // ignore
                }
            }

            if (pulledItemsFromApi) {
                toast.success(
                    `NF-e #${decoded.invoiceNumber} (${supplierInfo?.name || decoded.formattedCnpj}) e itens carregados pela Chave de Acesso!`
                );
            } else if (supplierInfo?.name) {
                toast.success(
                    `Chave decodificada! Fornecedor identificado: ${supplierInfo.name} (NF-e #${decoded.invoiceNumber} • Série ${decoded.series}). Agora informe ou selecione os materiais abaixo!`
                );
            } else {
                toast.info(
                    `Chave SEFAZ decodificada: NF-e #${decoded.invoiceNumber} (Série ${decoded.series} • CNPJ ${decoded.formattedCnpj}).`
                );
            }
        } finally {
            setIsPullingKey(false);
        }
    };

    const handleKeyInputChange = (val: string) => {
        const clean = val.replace(/\D/g, "").slice(0, 44);
        setAccessKeyInput(clean);
        if (clean.length === 44) {
            handlePullByAccessKey(clean);
        } else {
            setDecodedKey(null);
        }
    };

    const handleOpenSefazPortal = () => {
        const clean = accessKeyInput.replace(/\D/g, "");
        if (clean.length === 44) {
            navigator.clipboard.writeText(clean);
            toast.success("Chave de 44 dígitos copiada! Cole (Ctrl+V) no Portal da SEFAZ que abriu.");
        }
        window.open(
            "https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g=",
            "_blank",
            "noopener,noreferrer"
        );
    };

    // Extrator local inteligente de texto (para PDFs baseados em texto ou texto colado do Portal SEFAZ / DANFE)
    const parseRawTextLocally = async (text: string) => {
        let foundSomething = false;

        // 1. Procura qualquer sequência de 44 dígitos (mesmo separada por espaços/pontos a cada 4 dígitos)
        const keyRegex = /(?:\d[\s.-]*){44}/g;
        const candidates = text.match(keyRegex) || [];
        for (const cand of candidates) {
            const digits = cand.replace(/\D/g, "");
            if (digits.length === 44) {
                const dec = decodeSefazAccessKey(digits);
                if (dec && (dec.model === "55" || dec.model === "65" || dec.isValidCheckDigit)) {
                    setAccessKeyInput(digits);
                    await handlePullByAccessKey(digits);
                    foundSomething = true;
                    break;
                }
            }
        }

        // 2. Procura Valor Total da Nota
        const totalMatch =
            text.match(/VALOR\s+TOTAL\s+DA\s+NOTA[\s:R$]*([0-9.]+,[0-9]{2})/i) ||
            text.match(/V\.\s*TOTAL\s+DA\s+NOTA[\s:R$]*([0-9.]+,[0-9]{2})/i) ||
            text.match(/Valor\s+Total\s+da\s+NF-e[\s:R$]*([0-9.]+,[0-9]{2})/i);
        if (totalMatch?.[1]) {
            const parsedVal = parseFloat(totalMatch[1].replace(/\./g, "").replace(",", "."));
            if (!isNaN(parsedVal) && parsedVal > 0) {
                setTotalAmount(parsedVal.toFixed(2));
                foundSomething = true;
            }
        }

        // 3. Procura Data de Emissão (DD/MM/YYYY)
        const dateMatch = text.match(/(\d{2})\/(\d{2})\/(20\d{2})/);
        if (dateMatch) {
            const iso = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
            setIssueDate(iso);
            setOptions((prev) => ({ ...prev, dueDate: iso }));
        }

        // 4. Procura linhas de itens (padrão Portal SEFAZ ou tabela DANFE)
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const extractedItems: InboundInvoiceItem[] = [];

        for (const line of lines) {
            // Padrão tabela DANFE: CODIGO DESCRICAO NCM(8 digitos) CST CFOP UN QTD V_UNIT V_TOTAL
            const danfeRowMatch = line.match(
                /^([A-Za-z0-9.-]{1,15})\s+(.+?)\s+(\d{8})\s+(\d{3,4})\s+(\d{4})\s+([A-Za-z]{1,6})\s+([0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)/
            );
            if (danfeRowMatch) {
                const qty = parseFloat(danfeRowMatch[7].replace(/\./g, "").replace(",", ".")) || 1;
                const unitP = parseFloat(danfeRowMatch[8].replace(/\./g, "").replace(",", ".")) || 0;
                const totP = parseFloat(danfeRowMatch[9].replace(/\./g, "").replace(",", ".")) || qty * unitP;
                extractedItems.push({
                    code: danfeRowMatch[1],
                    name: danfeRowMatch[2].trim(),
                    ncm: danfeRowMatch[3],
                    cfop: danfeRowMatch[5],
                    unit: danfeRowMatch[6].toUpperCase(),
                    quantity: qty,
                    unitPrice: unitP,
                    totalPrice: totP,
                });
            }
        }

        if (extractedItems.length > 0) {
            setItems(extractedItems);
            const sum = extractedItems.reduce((acc, i) => acc + i.totalPrice, 0);
            if (sum > 0) setTotalAmount(sum.toFixed(2));
            foundSomething = true;
        }

        return foundSomething;
    };

    // Upload de Foto, Print, PDF da DANFE ou XML
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Se o usuário selecionou um XML aqui por engano, também lemos normalmente!
        if (file.name.toLowerCase().endsWith(".xml") || file.type.includes("xml")) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const xmlText = ev.target?.result as string;
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
                    const getTag = (p: Element | Document, t: string) =>
                        p.getElementsByTagName(t)[0]?.textContent?.trim() || "";

                    const infNFe = xmlDoc.getElementsByTagName("infNFe")[0];
                    const key = infNFe?.getAttribute("Id")?.replace(/^NFe/, "") || "";
                    if (key.length === 44) {
                        setAccessKeyInput(key);
                        setDecodedKey(decodeSefazAccessKey(key));
                    }
                    const ide = xmlDoc.getElementsByTagName("ide")[0];
                    if (ide) {
                        setInvoiceNumber(getTag(ide, "nNF"));
                        setSeries(getTag(ide, "serie") || "1");
                        const dt = (getTag(ide, "dhEmi") || getTag(ide, "dEmi")).substring(0, 10);
                        if (dt) setIssueDate(dt);
                    }
                    const emit = xmlDoc.getElementsByTagName("emit")[0];
                    if (emit) {
                        setEmitterName(getTag(emit, "xNome"));
                        setEmitterCnpj(getTag(emit, "CNPJ") || getTag(emit, "CPF"));
                    }
                    const icmsTot = xmlDoc.getElementsByTagName("ICMSTot")[0];
                    if (icmsTot) {
                        setTotalAmount(getTag(icmsTot, "vNF"));
                    }
                    const detNodes = Array.from(xmlDoc.getElementsByTagName("det"));
                    const xmlItems: InboundInvoiceItem[] = detNodes.map((det) => {
                        const prod = det.getElementsByTagName("prod")[0];
                        return {
                            code: prod ? getTag(prod, "cProd") : "",
                            name: prod ? getTag(prod, "xProd") : "Material",
                            ncm: prod ? getTag(prod, "NCM") : "",
                            cfop: prod ? getTag(prod, "CFOP") : "",
                            unit: prod ? getTag(prod, "uCom") : "UN",
                            quantity: prod ? parseFloat(getTag(prod, "qCom") || "1") : 1,
                            unitPrice: prod ? parseFloat(getTag(prod, "vUnCom") || "0") : 0,
                            totalPrice: prod ? parseFloat(getTag(prod, "vProd") || "0") : 0,
                        };
                    });
                    if (xmlItems.length > 0) setItems(xmlItems);
                    toast.success(`XML lido com sucesso (${xmlItems.length} itens encontrados)!`);
                } catch {
                    toast.error("Erro ao ler arquivo XML.");
                }
            };
            reader.readAsText(file);
            return;
        }

        setIsReadingFile(true);
        try {
            // 1. Se for PDF, tenta também extrair a chave de 44 dígitos diretamente dos bytes do PDF no navegador
            if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
                const arrayBuffer = await file.arrayBuffer();
                const latin1Text = new TextDecoder("latin1").decode(arrayBuffer);
                await parseRawTextLocally(latin1Text);
            }

            // 2. Converte para DataURL Base64 e envia para leitura inteligente (Gemini 2.5 Flash Vision)
            const base64DataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const aiData = await extractDanfeWithAI({
                base64DataUrl,
                customApiKey: tempGeminiKey.trim() || undefined,
            });

            applyExtractedData(aiData);
            toast.success("Nota Fiscal lida automaticamente com sucesso! Confira os itens abaixo.");
            setNeedsGeminiKey(false);
        } catch (err: any) {
            if (err?.message === "MISSING_GEMINI_KEY") {
                setNeedsGeminiKey(true);
                toast.info(
                    "Para leitura visual automática de Fotos/PDFs por IA, informe a chave Gemini ou use a Chave de Acesso de 44 dígitos!"
                );
            } else {
                console.warn("Aviso na leitura por IA:", err);
                toast.info(
                    "Arquivo analisado! Caso algum item não tenha sido preenchido, use a Chave de Acesso ou selecione os materiais do Estoque abaixo."
                );
            }
        } finally {
            setIsReadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const applyExtractedData = async (data: any) => {
        if (!data) return;
        const cleanKey = (data.accessKey || "").replace(/\D/g, "");
        if (cleanKey.length === 44) {
            setAccessKeyInput(cleanKey);
            const dec = decodeSefazAccessKey(cleanKey);
            setDecodedKey(dec);
            if (dec) {
                if (!data.invoiceNumber) setInvoiceNumber(dec.invoiceNumber);
                if (!data.series) setSeries(dec.series);
                if (!data.emitterCnpj) setEmitterCnpj(dec.formattedCnpj);
            }
        }
        if (data.invoiceNumber) setInvoiceNumber(String(data.invoiceNumber));
        if (data.series) setSeries(String(data.series));
        if (data.issueDate && /^\d{4}-\d{2}-\d{2}$/.test(data.issueDate)) {
            setIssueDate(data.issueDate);
            setOptions((prev) => ({ ...prev, dueDate: data.issueDate }));
        }
        if (data.emitterName) setEmitterName(data.emitterName);
        if (data.emitterCnpj) setEmitterCnpj(data.emitterCnpj);
        if (data.totalAmount && Number(data.totalAmount) > 0) {
            setTotalAmount(Number(data.totalAmount).toFixed(2));
        }

        if (Array.isArray(data.items) && data.items.length > 0) {
            const mapped: InboundInvoiceItem[] = data.items.map((it: any, idx: number) => {
                const qty = Number(it.quantity) || 1;
                const unitP = Number(it.unitPrice) || 0;
                const totP = Number(it.totalPrice) || Number((qty * unitP).toFixed(2));
                return {
                    code: String(it.code || idx + 1),
                    name: String(it.name || "Material"),
                    ncm: String(it.ncm || ""),
                    cfop: String(it.cfop || "1102"),
                    unit: String(it.unit || "UN").toUpperCase(),
                    quantity: qty,
                    unitPrice: unitP,
                    totalPrice: totP,
                };
            });
            setItems(mapped);
            if (!data.totalAmount || Number(data.totalAmount) <= 0) {
                const sum = mapped.reduce((acc, i) => acc + i.totalPrice, 0);
                if (sum > 0) setTotalAmount(sum.toFixed(2));
            }
        }
    };

    const handleParsePastedText = async () => {
        if (!pastedText.trim()) {
            toast.error("Cole o texto copiado da DANFE ou do Portal SEFAZ primeiro.");
            return;
        }
        setIsReadingFile(true);
        try {
            const foundLocal = await parseRawTextLocally(pastedText);
            try {
                const aiData = await extractDanfeWithAI({
                    rawText: pastedText,
                    customApiKey: tempGeminiKey.trim() || undefined,
                });
                await applyExtractedData(aiData);
                toast.success("Dados e materiais extraídos do texto com sucesso!");
                return;
            } catch {
                if (foundLocal) {
                    toast.success("Dados extraídos do texto colado! Confira os campos abaixo.");
                } else {
                    toast.info("Texto analisado. Preencha ou ajuste os itens na ficha abaixo.");
                }
            }
        } finally {
            setIsReadingFile(false);
        }
    };

    // Adicionar item existente do Catálogo do Estoque BJL em 1 clique
    const handleAddStockItem = (stockId: string) => {
        const prod = inventoryCatalog.find((p) => p.id === stockId);
        if (!prod) return;

        const unitPrice = Number(prod.unit_price) || 0;
        const newItem: InboundInvoiceItem = {
            code: prod.id_estoque || String(items.length + 1).padStart(3, "0"),
            name: prod.name,
            ncm: "44111490",
            cfop: "1102",
            unit: "UN",
            quantity: 1,
            unitPrice,
            totalPrice: unitPrice,
            inventoryId: prod.id,
        };

        const nextItems = [...items, newItem];
        setItems(nextItems);
        recalculateTotal(nextItems);
        setSelectedStockId("");
        toast.success(`"${prod.name}" adicionado à lista da nota! Ajuste a quantidade comprada.`);
    };

    // Puxar itens de Pedidos da Semana Pendentes em 1 clique
    const handleImportPendingOrders = () => {
        if (pendingWeeklyOrders.length === 0) {
            toast.info("Não há pedidos pendentes na lista da semana no momento.");
            return;
        }
        const imported: InboundInvoiceItem[] = pendingWeeklyOrders.map((o, idx) => {
            const qty = Number(o.quantity) || 1;
            const unitP = Number(o.unit_price) || 0;
            const matchedStock = inventoryCatalog.find(
                (p) => (p.name || "").toLowerCase() === (o.product || "").toLowerCase()
            );
            return {
                code: matchedStock?.id_estoque || String(items.length + idx + 1).padStart(3, "0"),
                name: o.product || "Insumo",
                ncm: "",
                cfop: "1102",
                unit: "UN",
                quantity: qty,
                unitPrice: unitP,
                totalPrice: Number(o.total_value) || Number((qty * unitP).toFixed(2)),
                inventoryId: matchedStock?.id,
                weeklyOrderId: o.id,
            };
        });

        const nextItems = [...items, ...imported];
        setItems(nextItems);
        recalculateTotal(nextItems);
        toast.success(`${imported.length} itens puxados dos Pedidos da Semana!`);
    };

    const handleAddBlankItem = () => {
        const nextItems: InboundInvoiceItem[] = [
            ...items,
            {
                code: String(items.length + 1).padStart(3, "0"),
                name: "",
                ncm: "",
                cfop: "1102",
                unit: "UN",
                quantity: 1,
                unitPrice: 0,
                totalPrice: 0,
            },
        ];
        setItems(nextItems);
    };

    const handleUpdateItem = (index: number, field: keyof InboundInvoiceItem, value: any) => {
        const updated = items.map((item, idx) => {
            if (idx !== index) return item;
            const next = { ...item, [field]: value };
            if (field === "quantity" || field === "unitPrice") {
                const q = Number(field === "quantity" ? value : next.quantity) || 0;
                const u = Number(field === "unitPrice" ? value : next.unitPrice) || 0;
                next.totalPrice = Number((q * u).toFixed(2));
            }
            return next;
        });
        setItems(updated);
        if (field === "quantity" || field === "unitPrice") {
            recalculateTotal(updated);
        }
    };

    const handleRemoveItem = (index: number) => {
        const updated = items.filter((_, idx) => idx !== index);
        setItems(updated);
        recalculateTotal(updated);
    };

    const recalculateTotal = (currentItems: InboundInvoiceItem[]) => {
        const sum = currentItems.reduce((acc, i) => acc + (Number(i.totalPrice) || 0), 0);
        if (sum > 0) {
            setTotalAmount(sum.toFixed(2));
        }
    };

    // Salvar Nota Fiscal + Atualizar Estoque + Lançar no Financeiro
    const handleConfirmInboundInvoice = async () => {
        const validItems = items.filter((i) => i.name.trim() !== "");
        const calcSum = validItems.reduce((acc, i) => acc + (Number(i.totalPrice) || 0), 0);
        const finalAmount =
            parseFloat(String(totalAmount || "0").replace(",", ".")) > 0
                ? parseFloat(String(totalAmount || "0").replace(",", "."))
                : calcSum;

        if (!emitterName.trim()) {
            toast.error("Informe o nome do Fornecedor (ou digite os 44 dígitos da Chave de Acesso para puxar automaticamente).");
            return;
        }

        if (finalAmount <= 0 && validItems.length === 0) {
            toast.error("Informe o Valor Total da Nota ou adicione pelo menos 1 material na lista.");
            return;
        }

        setIsSaving(true);
        try {
            const finalInvoiceNum =
                invoiceNumber.trim() ||
                decodedKey?.invoiceNumber ||
                String(Math.floor(1000 + Math.random() * 9000));
            const cleanKey = accessKeyInput.replace(/\D/g, "");

            const summaryItems =
                validItems.length > 0
                    ? validItems
                          .slice(0, 3)
                          .map((i) => `${i.quantity}x ${i.name}`)
                          .join(", ") +
                      (validItems.length > 3 ? ` (+${validItems.length - 3} itens)` : "")
                    : "Entrada de Materiais / Insumos";

            // 1. Registra a Nota Fiscal de Entrada na tabela invoices (incluindo XML_PAYLOAD para visualização e impressão dos itens separados na DANFE)
            const storedPayload = {
                direction: "entrada" as const,
                series: series || "1",
                natOp: "ENTRADA DE MATERIAL / INSUMOS",
                accessKey: cleanKey.length === 44 ? cleanKey : undefined,
                emitter: {
                    name: emitterName.trim(),
                    cnpj: emitterCnpj.trim(),
                },
                totals: {
                    productsTotal: finalAmount,
                    discountAmount: 0,
                    freightAmount: 0,
                    otherAmount: 0,
                    totalAmount: finalAmount,
                },
                items: validItems.map((it) => ({
                    code: it.code || "001",
                    name: it.name,
                    ncm: it.ncm || "44111490",
                    cfop: it.cfop || "1102",
                    unit: it.unit || "UN",
                    quantity: Number(it.quantity) || 1,
                    unitPrice: Number(it.unitPrice) || 0,
                    totalPrice: Number(it.totalPrice) || 0,
                })),
            };

            const newInvoice = {
                issue_date: issueDate || new Date().toISOString().split("T")[0],
                client_name: emitterName.trim(),
                description: `[ENTRADA MATERIAL] ${summaryItems}${
                    emitterCnpj ? ` | Doc: ${emitterCnpj}` : ""
                }${cleanKey.length === 44 ? ` | Chave: ${cleanKey}` : ""}`,
                amount: finalAmount,
                status: "Autorizada" as const,
                invoice_number: finalInvoiceNum,
                type: "NF-e" as const,
                asaas_status: validItems.length > 0 ? `XML_PAYLOAD:${JSON.stringify(storedPayload)}` : null,
            };

            const { error: invErr } = await supabase.from("invoices").insert([newInvoice]);
            if (invErr) throw invErr;

            // 2. Atualiza ou cadastra cada material no Controle de Estoque (inventory)
            let updatedStockCount = 0;
            if (options.updateInventory && validItems.length > 0) {
                const { data: currentStock } = await supabase.from("inventory").select("*");
                for (const item of validItems) {
                    const existing = (currentStock || []).find(
                        (s: any) =>
                            (item.inventoryId && s.id === item.inventoryId) ||
                            (s.name || "").trim().toLowerCase() === item.name.trim().toLowerCase()
                    );

                    if (existing) {
                        await supabase
                            .from("inventory")
                            .update({
                                quantity: Number(existing.quantity || 0) + Number(item.quantity || 0),
                                unit_price:
                                    Number(item.unitPrice) > 0
                                        ? Number(item.unitPrice)
                                        : Number(existing.unit_price || 0),
                            })
                            .eq("id", existing.id);
                    } else {
                        await supabase.from("inventory").insert([
                            {
                                id_estoque: item.code || String(Math.floor(100 + Math.random() * 900)),
                                name: item.name.trim(),
                                quantity: Number(item.quantity) || 1,
                                unit_price: Number(item.unitPrice) || 0,
                                min_stock_level: 5,
                            },
                        ]);
                    }
                    updatedStockCount++;

                    // Se o item veio de um Pedido da Semana pendente, marca como concluído
                    if (item.weeklyOrderId) {
                        await supabase
                            .from("weekly_orders")
                            .update({ status: "concluido", supplier: emitterName.trim() })
                            .eq("id", item.weeklyOrderId);
                    }
                }
            }

            // 3. Lança no Financeiro (Contas a Pagar)
            if (options.createExpenseTransaction && finalAmount > 0) {
                const due = options.dueDate || issueDate || new Date().toISOString().split("T")[0];
                await supabase.from("transactions").insert([
                    {
                        description: `NF-e Entrada #${finalInvoiceNum} - ${emitterName.trim()} (${summaryItems})`,
                        amount: finalAmount,
                        type: "expense",
                        category: "Custos de Produção",
                        subcategory: "Matéria-Prima (MDF/Ferragens)",
                        contact: emitterName.trim(),
                        payment_method: options.paymentMethod,
                        competence_date: issueDate,
                        due_date: due,
                        payment_date: options.paymentStatus === "paid" ? due : null,
                        status: options.paymentStatus,
                        invoice_number: finalInvoiceNum,
                    },
                ]);
            }

            toast.success(
                `Nota de Entrada #${finalInvoiceNum} (${emitterName.trim()}) registrada com sucesso!${
                    updatedStockCount > 0 ? ` • ${updatedStockCount} materiais somados ao Estoque!` : ""
                }`
            );

            // Limpa estado e fecha
            setAccessKeyInput("");
            setDecodedKey(null);
            setInvoiceNumber("");
            setEmitterName("");
            setEmitterCnpj("");
            setTotalAmount("");
            setItems([]);
            setPastedText("");
            onOpenChange(false);
            onSuccess?.();
        } catch (err: any) {
            console.error("Erro ao registrar nota de entrada:", err);
            toast.error(`Erro ao salvar nota de entrada: ${err?.message || "Verifique os dados"}`);
        } finally {
            setIsSaving(false);
        }
    };

    const keyDigitCount = accessKeyInput.replace(/\D/g, "").length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0c0c10] border border-white/15 shadow-2xl rounded-3xl text-foreground p-6">
                <DialogHeader>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="tech-hud-pill text-amber-400 border-amber-500/30 bg-amber-500/10">
                            <KeyRound className="h-3.5 w-3.5" />
                            ENTRADA DE MATERIAL SEM XML // SEFAZ + IA
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                            Integra Estoque & Contas a Pagar Automaticamente
                        </span>
                    </div>
                    <DialogTitle className="text-xl font-display font-black">
                        Dar Entrada em Nota de Material (Sem precisar do XML)
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        Puxe os dados da nota usando a <strong>Chave de Acesso (44 dígitos)</strong>, enviando uma{" "}
                        <strong>Foto / PDF da DANFE</strong>, ou selecionando os materiais diretamente no{" "}
                        <strong>Catálogo do Estoque</strong>.
                    </DialogDescription>
                </DialogHeader>

                {/* ABAS DE CAPTURA RÁPIDA SEM XML */}
                <Tabs value={activeMethod} onValueChange={setActiveMethod} className="w-full">
                    <TabsList className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-white/[0.03] p-1.5 rounded-2xl border border-white/10 h-auto">
                        <TabsTrigger
                            value="chave"
                            className="rounded-xl py-2.5 px-3 text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                            <KeyRound className="h-4 w-4" />
                            1. Pela Chave de Acesso (44 dígitos)
                        </TabsTrigger>
                        <TabsTrigger
                            value="foto_pdf"
                            className="rounded-xl py-2.5 px-3 text-xs font-bold gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-black"
                        >
                            <Camera className="h-4 w-4" />
                            2. Por Foto ou PDF da Nota (DANFE)
                        </TabsTrigger>
                        <TabsTrigger
                            value="texto"
                            className="rounded-xl py-2.5 px-3 text-xs font-bold gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-black"
                        >
                            <ClipboardPaste className="h-4 w-4" />
                            3. Colar Texto (Portal SEFAZ / PDF)
                        </TabsTrigger>
                    </TabsList>

                    {/* MÉTODO 1: CHAVE DE ACESSO DE 44 DÍGITOS */}
                    <TabsContent value="chave" className="mt-3">
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                    <KeyRound className="h-3.5 w-3.5" />
                                    Digite ou Cole a Chave de Acesso da Nota (44 Números)
                                </Label>
                                <span
                                    className={cn(
                                        "text-[10px] font-tech font-bold px-2.5 py-0.5 rounded-full border",
                                        keyDigitCount === 44
                                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                            : "bg-white/5 text-muted-foreground border-white/10"
                                    )}
                                >
                                    {keyDigitCount} / 44 dígitos
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    placeholder="Ex: 3326 1112 3456 7800 0199 5500 1000 0154 2010 0015 4208"
                                    value={accessKeyInput}
                                    onChange={(e) => handleKeyInputChange(e.target.value)}
                                    className="h-11 rounded-xl bg-black/50 border-white/15 font-tech text-xs tracking-wider text-foreground flex-1"
                                />
                                <Button
                                    type="button"
                                    onClick={() => handlePullByAccessKey()}
                                    disabled={isPullingKey || keyDigitCount !== 44}
                                    className="h-11 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-wider text-xs px-5 shrink-0 gap-2"
                                >
                                    {isPullingKey ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Consultando...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4" />
                                            Puxar Dados da Chave
                                        </>
                                    )}
                                </Button>
                            </div>

                            {decodedKey && (
                                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                        <span className="font-bold text-emerald-300">
                                            Chave SEFAZ Decodificada:
                                        </span>
                                        <span className="font-tech bg-black/40 px-2 py-0.5 rounded text-[11px] text-white">
                                            NF-e #{decodedKey.invoiceNumber} (Série {decodedKey.series})
                                        </span>
                                        <span className="font-tech bg-black/40 px-2 py-0.5 rounded text-[11px] text-amber-300">
                                            CNPJ: {decodedKey.formattedCnpj} ({decodedKey.ufSigla})
                                        </span>
                                        {!decodedKey.isValidCheckDigit && (
                                            <span className="text-[10px] text-amber-400 flex items-center gap-1">
                                                <AlertTriangle className="h-3 w-3" /> Confira o último dígito verificador
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleOpenSefazPortal}
                                        className="h-8 rounded-lg text-[10px] font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 shrink-0 gap-1.5"
                                    >
                                        <Copy className="h-3 w-3" />
                                        Ver Itens no Portal SEFAZ (Copia Chave)
                                        <ExternalLink className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}

                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                💡 <strong>Como funciona:</strong> Ao colar os 44 dígitos da Chave de Acesso, o sistema extrai na hora o{" "}
                                <strong>Nº da Nota</strong>, a <strong>Série</strong>, a <strong>Data</strong> e consulta a Receita Federal para preencher o{" "}
                                <strong>Fornecedor e CNPJ</strong> automaticamente! Depois, basta escolher abaixo os materiais que chegaram (ou enviar uma foto da nota na Aba 2).
                            </p>
                        </div>
                    </TabsContent>

                    {/* MÉTODO 2: FOTO, PRINT OU PDF DA DANFE */}
                    <TabsContent value="foto_pdf" className="mt-3">
                        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,image/*,.xml"
                                className="hidden"
                                onChange={handleFileUpload}
                            />

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                        <Camera className="h-4 w-4" />
                                        Leitor Inteligente de DANFE (PDF, Foto do Celular ou Print)
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground">
                                        Tem apenas a folha impressa ou o PDF da nota enviado pelo fornecedor no WhatsApp? Envie aqui que o sistema lê a chave, o fornecedor e os materiais para você.
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isReadingFile}
                                    className="h-11 rounded-xl bg-amber-500 text-black hover:bg-amber-400 font-black uppercase tracking-wider text-xs px-6 shrink-0 gap-2"
                                >
                                    {isReadingFile ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Lendo Nota Fiscal...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4" />
                                            Escolher Foto ou PDF da Nota
                                        </>
                                    )}
                                </Button>
                            </div>

                            {needsGeminiKey && (
                                <div className="p-3 rounded-xl bg-black/40 border border-amber-500/30 space-y-2">
                                    <Label className="text-[10px] font-bold uppercase text-amber-300">
                                        Chave Gratuita Google Gemini (Opcional — para leitura óptica de Fotos por IA):
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="password"
                                            placeholder="Cole sua chave AIzaSy... do Google AI Studio"
                                            value={tempGeminiKey}
                                            onChange={(e) => setTempGeminiKey(e.target.value)}
                                            className="h-9 rounded-lg bg-black/50 border-white/15 text-xs font-tech"
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => {
                                                if (tempGeminiKey.trim()) {
                                                    localStorage.setItem("bjl_gemini_api_key", tempGeminiKey.trim());
                                                    setNeedsGeminiKey(false);
                                                    toast.success("Chave Gemini salva! Clique novamente para ler a foto/PDF.");
                                                }
                                            }}
                                            className="h-9 rounded-lg text-xs font-bold"
                                        >
                                            Salvar Chave
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* MÉTODO 3: COLAR TEXTO DO PORTAL SEFAZ OU PDF */}
                    <TabsContent value="texto" className="mt-3">
                        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                        <ClipboardPaste className="h-4 w-4" />
                                        Colar Texto da Nota (Copiado de um PDF ou da Consulta SEFAZ)
                                    </h4>
                                    <p className="text-[11px] text-muted-foreground">
                                        Abriu a nota no site da SEFAZ ou em PDF? Selecione tudo (Ctrl+A), copie (Ctrl+C) e cole abaixo:
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleParsePastedText}
                                    disabled={isReadingFile || !pastedText.trim()}
                                    className="h-9 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 font-black uppercase tracking-wider text-xs px-4 shrink-0 gap-1.5"
                                >
                                    {isReadingFile ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Sparkles className="h-3.5 w-3.5" />
                                    )}
                                    Extrair Dados do Texto
                                </Button>
                            </div>
                            <Textarea
                                rows={3}
                                placeholder="Cole aqui o texto copiado do PDF da DANFE ou da página da SEFAZ..."
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                className="rounded-xl bg-black/40 border-white/10 text-xs font-mono"
                            />
                        </div>
                    </TabsContent>
                </Tabs>

                {/* FICHA PRINCIPAL DA NOTA DE ENTRADA (SEMPRE VISÍVEL E EDITÁVEL) */}
                <div className="space-y-4 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                            Dados do Fornecedor & Cabeçalho da Nota
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-5 space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Fornecedor / Emitente *
                            </Label>
                            <Input
                                placeholder="Ex: Léo Madeiras / CED / Duratex"
                                value={emitterName}
                                onChange={(e) => setEmitterName(e.target.value)}
                                className="h-10 rounded-xl bg-white/[0.03] border-white/10 text-xs font-bold"
                            />
                        </div>

                        <div className="sm:col-span-3 space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                CNPJ do Fornecedor
                            </Label>
                            <Input
                                placeholder="00.000.000/0001-00"
                                value={emitterCnpj}
                                onChange={(e) => setEmitterCnpj(e.target.value)}
                                onBlur={async () => {
                                    if (!emitterName.trim() && emitterCnpj.replace(/\D/g, "").length === 14) {
                                        const info = await lookupSupplierByCnpj(emitterCnpj);
                                        if (info?.name) setEmitterName(info.name);
                                    }
                                }}
                                className="h-10 rounded-xl bg-white/[0.03] border-white/10 font-tech text-xs"
                            />
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Nº da NF-e
                            </Label>
                            <Input
                                placeholder="12345"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                className="h-10 rounded-xl bg-white/[0.03] border-white/10 font-tech font-bold text-xs"
                            />
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                Emissão
                            </Label>
                            <Input
                                type="date"
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                className="h-10 rounded-xl bg-white/[0.03] border-white/10 font-tech text-xs"
                            />
                        </div>
                    </div>

                    {/* SEÇÃO DE ITENS / MATERIAIS DA NOTA */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                                    <Package className="h-4 w-4 text-primary" />
                                    Materiais / Insumos da Nota ({items.length})
                                </h4>
                                <p className="text-[10px] text-muted-foreground">
                                    Selecione um insumo do seu Estoque para somar a quantidade comprada ou adicione novos itens:
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {/* Seletor 1-Clique do Estoque */}
                                <Select value={selectedStockId} onValueChange={handleAddStockItem}>
                                    <SelectTrigger className="w-60 h-9 rounded-xl bg-primary/10 border-primary/30 text-xs font-bold text-primary">
                                        <SelectValue placeholder="+ Puxar Insumo do Estoque..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-72 z-[100] bg-[#121218] border-white/15 text-foreground">
                                        {inventoryCatalog.map((prod) => (
                                            <SelectItem key={prod.id} value={prod.id}>
                                                #{prod.id_estoque || "---"} — {prod.name} (Est: {prod.quantity} |{" "}
                                                {formatCurrency(Number(prod.unit_price || 0))})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {pendingWeeklyOrders.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleImportPendingOrders}
                                        className="h-9 rounded-xl border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-bold gap-1.5"
                                    >
                                        <Truck className="h-3.5 w-3.5" />
                                        Puxar Pedidos da Semana ({pendingWeeklyOrders.length})
                                    </Button>
                                )}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddBlankItem}
                                    className="h-9 rounded-xl border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold gap-1.5"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Adicionar Item Manual
                                </Button>
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <div className="text-center py-6 px-4 rounded-xl border border-dashed border-white/10 bg-black/20 space-y-2">
                                <p className="text-xs text-muted-foreground">
                                    Nenhum material listado ainda. Escolha um insumo em{" "}
                                    <strong className="text-primary">"+ Puxar Insumo do Estoque"</strong> acima, clique em{" "}
                                    <strong className="text-foreground">"Adicionar Item Manual"</strong>, ou apenas informe o{" "}
                                    <strong>Valor Total da Nota</strong> abaixo caso queira somente registrar a nota fiscal e o financeiro.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {items.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-black/40 border border-white/[0.07]"
                                    >
                                        <div className="col-span-2 sm:col-span-1">
                                            <Input
                                                placeholder="Cód"
                                                value={item.code}
                                                onChange={(e) => handleUpdateItem(idx, "code", e.target.value)}
                                                className="h-8 rounded-lg bg-white/[0.03] border-white/10 font-tech text-[11px] px-2"
                                            />
                                        </div>
                                        <div className="col-span-10 sm:col-span-5">
                                            <Input
                                                placeholder="Nome do Material (Ex: MDF Branco TX 15mm)"
                                                value={item.name}
                                                onChange={(e) => handleUpdateItem(idx, "name", e.target.value)}
                                                className="h-8 rounded-lg bg-white/[0.03] border-white/10 text-xs font-semibold"
                                            />
                                        </div>
                                        <div className="col-span-3 sm:col-span-1">
                                            <Input
                                                placeholder="UN"
                                                value={item.unit}
                                                onChange={(e) =>
                                                    handleUpdateItem(idx, "unit", e.target.value.toUpperCase())
                                                }
                                                className="h-8 rounded-lg bg-white/[0.03] border-white/10 font-tech text-[11px] text-center px-1"
                                            />
                                        </div>
                                        <div className="col-span-3 sm:col-span-2">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                placeholder="Qtd"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    handleUpdateItem(idx, "quantity", parseFloat(e.target.value) || 0)
                                                }
                                                className="h-8 rounded-lg bg-primary/10 border-primary/30 font-tech font-bold text-primary text-xs text-center"
                                                title="Quantidade comprada"
                                            />
                                        </div>
                                        <div className="col-span-4 sm:col-span-2">
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="V. Unit"
                                                value={item.unitPrice}
                                                onChange={(e) =>
                                                    handleUpdateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)
                                                }
                                                className="h-8 rounded-lg bg-white/[0.03] border-white/10 font-tech text-xs"
                                                title="Valor Unitário (R$)"
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveItem(idx)}
                                                className="h-8 w-8 rounded-lg text-rose-400 hover:bg-rose-500/15"
                                                title="Remover item"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* OPÇÕES DE INTEGRAÇÃO ESTOQUE + FINANCEIRO & VALOR TOTAL */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/20">
                        <div className="md:col-span-7 space-y-2.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary block">
                                Automação de Entrada (Estoque & Financeiro)
                            </Label>

                            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={options.updateInventory}
                                    onChange={(e) =>
                                        setOptions((prev) => ({ ...prev, updateInventory: e.target.checked }))
                                    }
                                    className="rounded border-white/20 text-primary"
                                />
                                Somar automaticamente as quantidades no <strong>Controle de Estoque</strong>
                            </label>

                            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={options.createExpenseTransaction}
                                    onChange={(e) =>
                                        setOptions((prev) => ({
                                            ...prev,
                                            createExpenseTransaction: e.target.checked,
                                        }))
                                    }
                                    className="rounded border-white/20 text-primary"
                                />
                                Lançar valor automaticamente no <strong>Financeiro (Custos de Produção)</strong>
                            </label>

                            {options.createExpenseTransaction && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                    <div>
                                        <span className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">
                                            Status do Pagamento
                                        </span>
                                        <Select
                                            value={options.paymentStatus}
                                            onValueChange={(v: "pending" | "paid") =>
                                                setOptions((prev) => ({ ...prev, paymentStatus: v }))
                                            }
                                        >
                                            <SelectTrigger className="h-8 rounded-lg bg-black/40 border-white/10 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="z-[100] bg-[#121218] border-white/15 text-foreground">
                                                <SelectItem value="pending">A Pagar (Pendente)</SelectItem>
                                                <SelectItem value="paid">Já Pago (Quitado)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">
                                            Meio de Pagamento
                                        </span>
                                        <Select
                                            value={options.paymentMethod}
                                            onValueChange={(v) =>
                                                setOptions((prev) => ({ ...prev, paymentMethod: v }))
                                            }
                                        >
                                            <SelectTrigger className="h-8 rounded-lg bg-black/40 border-white/10 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="z-[100] bg-[#121218] border-white/15 text-foreground">
                                                <SelectItem value="Boleto">Boleto</SelectItem>
                                                <SelectItem value="PIX">PIX</SelectItem>
                                                <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                                                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">
                                            Data de Vencimento
                                        </span>
                                        <Input
                                            type="date"
                                            value={options.dueDate}
                                            onChange={(e) =>
                                                setOptions((prev) => ({ ...prev, dueDate: e.target.value }))
                                            }
                                            className="h-8 rounded-lg bg-black/40 border-white/10 font-tech text-xs"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-5 flex flex-col justify-between p-3.5 rounded-xl bg-black/40 border border-white/10">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">
                                Valor Total da Nota Fiscal (R$) *
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={totalAmount}
                                onChange={(e) => setTotalAmount(e.target.value)}
                                className="h-12 rounded-xl bg-white/[0.04] border-primary/40 font-tech font-black text-xl text-primary mt-1"
                            />
                            <span className="text-[10px] text-muted-foreground mt-1">
                                Calculado automaticamente pelos itens ou digitado manualmente.
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-2 gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl text-xs"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirmInboundInvoice}
                        disabled={isSaving}
                        className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-wider text-xs px-6 h-11 gap-2 shadow-lg shadow-primary/20"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Registrando Entrada...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                Confirmar Entrada da Nota (Estoque + Financeiro)
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
