/**
 * Motor Inteligente de Reconhecimento e Unificação de Insumos de Marcenaria (BJL Planejados)
 *
 * Evita duplicação de itens no Estoque quando notas fiscais vêm de fornecedores diferentes
 * com nomenclaturas distintas (ex: Bruta Madeiras vs C&D vs Catálogo Interno BJL).
 *
 * Exemplos que são reconhecidos como o MESMO item de estoque:
 * - "MDF BRANCO 2F 15MM - FIBRAFPLAC PL40" (Bruta)
 * - "MDF BRANCO TX 2 FACES 15 MM FIBRAPLAC" (C&D)
 * - "MDF BRANCO TX 2 FACES 15 MM SUDATI" (C&D)
 * - "Chapa 15mm branco tx" (Catálogo BJL)
 *
 * - "MDF BRANCO 2F 6MM - FIBRAFPLAC PL80" (Bruta) <-> "Chapa 6mm branco tx"
 * - "FITA PVC BRANCO TX 22MMX50M PROADEC" (Bruta) <-> "Fita 22 mm Branco tx" <-> "BORDA BRANCO TX 022 MM"
 * - "THINNER PITBULL MULTIUSO 05 LITROS" (C&D) <-> "THINNER PROFISSIONAL SAYERLACK 05 LITROS" <-> "Thinner 5 litros"
 * - "TAPA FURO ADESIVO BRANCO TX 13MM - MARFIM" <-> "Tapa Furo Branco"
 * - "CORREDIÇA TELESCÓPICA 450MM - RENNA" <-> "Corrediças 45cm"
 * - "CORREDIÇA TELESCÓPICA 400MM - RENNA" <-> "CORREDICA TELESCOPICA 400MM - RENNA"
 * - "COLA INSTANTANEA 100G - TEKBOND" <-> "Cola rendibond"
 */

export interface InventoryCandidate {
    id: string;
    id_estoque?: string;
    idEstoque?: string;
    name: string;
    quantity: number;
    unit_price?: number;
    unitPrice?: number;
    min_stock_level?: number;
    minStockLevel?: number;
}

export interface StockMatchResult<T extends InventoryCandidate = InventoryCandidate> {
    matchedItem: T | null;
    matchType: "exact_id" | "exact_name" | "semantic_signature" | "fuzzy_tokens" | "none";
    signature: string | null;
    canonicalLabel: string;
    confidence: number;
}

const SUPPLIER_AND_NOISE_WORDS = new Set([
    "fibrafplac",
    "fibraplac",
    "duratex",
    "eucatex",
    "arauco",
    "guararapes",
    "sudati",
    "berneck",
    "greenplac",
    "floraplac",
    "renna",
    "proadec",
    "rehau",
    "tece",
    "tekbond",
    "sayerlack",
    "pitbull",
    "fgvtn",
    "hafele",
    "blum",
    "kisa",
    "fix",
    "rendicola",
    "rendibond",
    "pl40",
    "pl80",
    "og38",
    "multiuso",
    "profissional",
    "placas",
    "placa",
    "un",
    "pe",
    "pc",
    "rl",
    "mt",
    "mts",
    "cx",
    "c",
    "com",
    "de",
    "da",
    "do",
    "para",
    "em",
]);

export function normalizeText(raw?: string): string {
    if (!raw) return "";
    return raw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9.,/]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Verifica se o destino de um item/rateio da nota é o Estoque Geral da marcenaria.
 * Se tiver nome de cliente ou OS, retorna false (NÃO deve entrar no estoque).
 */
export function isEstoqueGeralDestination(clientValue?: string | null): boolean {
    const clean = normalizeText(clientValue || "");
    if (!clean) return true;
    if (
        clean === "estoque" ||
        clean === "estoque geral" ||
        clean === "estoque geral marcenaria" ||
        clean === "almoxarifado"
    ) {
        return true;
    }
    return false;
}

/**
 * Extrai a assinatura semântica canônica de um insumo de marcenaria.
 */
export function classifyWoodworkingItem(rawName: string): {
    signature: string | null;
    canonicalLabel: string;
    category: string;
} {
    const norm = normalizeText(rawName);
    if (!norm) {
        return { signature: null, canonicalLabel: rawName, category: "outro" };
    }

    // 1. PARAFUSOS (ex: "PARAFUSO MDF RENNA 4,0X45 (CX.300)", "Parafuso 35x25", "PARAFUSO 3,5X14")
    if (/\bparafusos?\b/.test(norm)) {
        const dimMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/);
        if (dimMatch) {
            const rawGauge = parseFloat(dimMatch[1].replace(",", "."));
            const rawLen = parseFloat(dimMatch[2].replace(",", "."));
            const gauge = rawGauge < 10 ? Math.round(rawGauge * 10) : Math.round(rawGauge);
            const len = Math.round(rawLen);
            return {
                signature: `parafuso:${gauge}x${len}`,
                canonicalLabel: `Parafuso ${gauge}x${len}`,
                category: "parafuso",
            };
        }
    }

    // 2. CORREDIÇAS (ex: "CORREDIÇA TELESCÓPICA 400MM - RENNA", "Corrediças 45cm", "CORREDICA 250MM")
    if (/\b(corredicas?|telescopicas?)\b/.test(norm)) {
        let sizeMm: number | null = null;
        const mmMatch = norm.match(/\b(200|250|300|350|400|450|500|550|600)\s*(?:mm)?\b/);
        const cmMatch = norm.match(/\b(20|25|30|35|40|45|50|55|60)\s*cm\b/);
        if (cmMatch) {
            sizeMm = parseInt(cmMatch[1], 10) * 10;
        } else if (mmMatch) {
            sizeMm = parseInt(mmMatch[1], 10);
        }
        const subtype = /\b(oculta|invisivel)\b/.test(norm) ? "oculta" : "telescopica";
        if (sizeMm) {
            return {
                signature: `corredica:${subtype}:${sizeMm}mm`,
                canonicalLabel: `Corrediça ${subtype === "oculta" ? "Oculta" : "Telescópica"} ${sizeMm}mm (${sizeMm / 10}cm)`,
                category: "corredica",
            };
        }
    }

    // 3. DOBRADIÇAS (ex: "Dobradiças reta", "DOBRADICA CANECO 35MM RETA", "DOBRADIÇA CURVA")
    if (/\bdobradicas?\b/.test(norm)) {
        const subtype = /\b(super\s*curva|165)\b/.test(norm)
            ? "super_curva"
            : /\bcurva\b/.test(norm)
            ? "curva"
            : "reta";
        return {
            signature: `dobradica:${subtype}`,
            canonicalLabel: `Dobradiça ${subtype === "curva" ? "Curva" : subtype === "super_curva" ? "Super Curva" : "Reta"}`,
            category: "dobradica",
        };
    }

    // 4. THINNER / SOLVENTE (ex: "THINNER PITBULL MULTIUSO 05 LITROS", "THINNER PROFISSIONAL SAYERLACK 05 LITROS", "Thinner 5 litros")
    if (/\b(thinner|tiner)\b/.test(norm)) {
        let vol = "5l";
        if (/\b900\s*ml\b/.test(norm)) vol = "900ml";
        else if (/\b18\s*(l|lt|lts|litros?)\b/.test(norm)) vol = "18l";
        else if (/\b0?1\s*(l|lt|litro)\b/.test(norm)) vol = "1l";
        else if (/\b0?5\s*(l|lt|lts|litros?)\b/.test(norm)) vol = "5l";
        return {
            signature: `thinner:${vol}`,
            canonicalLabel: `Thinner ${vol.toUpperCase()}`,
            category: "thinner",
        };
    }

    // 5. TAPA FURO (ex: "TAPA FURO ADESIVO BRANCO TX 13MM - MARFIM", "Tapa Furo Branco")
    if (/\btapa\s*furos?\b|\btapafuros?\b/.test(norm)) {
        // Remove marca após hífen se houver (ex: "- MARFIM")
        const beforeHyphen = normalizeText(rawName.split("-")[0] || rawName);
        const colorTokens = beforeHyphen
            .split(" ")
            .filter(
                (t) =>
                    t &&
                    ![
                        "tapa",
                        "furo",
                        "furos",
                        "tapafuro",
                        "adesivo",
                        "pvc",
                        "tx",
                        "mm",
                        "12mm",
                        "13mm",
                        "14mm",
                        "12",
                        "13",
                        "14",
                        "cartela",
                    ].includes(t) &&
                    !SUPPLIER_AND_NOISE_WORDS.has(t)
            );
        const color =
            colorTokens.includes("branco") || colorTokens.includes("branca")
                ? "branco"
                : colorTokens.join(" ") || "branco";
        return {
            signature: `tapa_furo:${color}`,
            canonicalLabel: `Tapa Furo ${color.charAt(0).toUpperCase() + color.slice(1)}`,
            category: "tapa_furo",
        };
    }

    // 6. FITAS DE BORDA (ex: "FITA PVC BRANCO TX 22MMX50M PROADEC", "Fita 22 mm Branco tx", "BORDA ITAPARICA 065 MM")
    if (
        /\bbordas?\b/.test(norm) ||
        (/\bfitas?\b/.test(norm) && !/\b(led|crepe|dupla|isolante)\b/.test(norm))
    ) {
        let widthMm: number | null = null;
        const wMatch =
            norm.match(/\b0?(19|22|29|35|40|45|64|65|100|260)\s*mm/) ||
            norm.match(/\b0?(19|22|29|35|40|45|64|65|100|260)\s*x\s*\d+/);
        if (wMatch) {
            const parsedW = parseInt(wMatch[1], 10);
            widthMm = parsedW === 64 ? 65 : parsedW;
        }

        const colorTokens = norm
            .replace(/\b\d+mmx\d+m?\b/g, " ")
            .replace(/\b0?(19|22|29|35|40|45|64|65|100|260)\s*mm\b/g, " ")
            .replace(/\bc\s*\/?\s*\d+\s*(mts?|m)\b/g, " ")
            .split(" ")
            .filter(
                (t) =>
                    t &&
                    ![
                        "fita",
                        "fitas",
                        "borda",
                        "bordas",
                        "pvc",
                        "abs",
                        "tx",
                        "mm",
                        "mt",
                        "mts",
                        "m",
                        "rl",
                        "rolo",
                        "20",
                        "50",
                        "100",
                        "022",
                        "22",
                        "035",
                        "35",
                        "040",
                        "40",
                        "064",
                        "64",
                        "065",
                        "65",
                        "260",
                        "20m",
                        "50m",
                    ].includes(t) &&
                    !SUPPLIER_AND_NOISE_WORDS.has(t)
            );

        let color = colorTokens.join(" ").trim();
        if (
            (colorTokens.includes("branco") || colorTokens.includes("branca")) &&
            colorTokens.every((t) => ["branco", "branca", "gelo", "artico", "diamante"].includes(t))
        ) {
            color = "branco";
        } else if (colorTokens.includes("freijo")) {
            color = "freijo";
        }

        if (widthMm && color) {
            return {
                signature: `fita_borda:${widthMm}mm:${color}`,
                canonicalLabel: `Fita de Borda ${widthMm}mm ${color.toUpperCase()}`,
                category: "fita_borda",
            };
        }
    }

    // 7. COLAS (ex: "COLA INSTANTANEA 100G - TEKBOND", "Cola rendibond", "Cola em Grão Kisa Fix Branca")
    if (/\b(colas?|tekbond|rendibond|rendicola)\b/.test(norm)) {
        if (/\b(grao|hotmelt)\b/.test(norm)) {
            const isTransp = /\b(transparente|rendicola)\b/.test(norm);
            return {
                signature: isTransp ? "cola:grao_transparente" : "cola:grao_branca",
                canonicalLabel: isTransp ? "Cola em Grão Transparente" : "Cola em Grão Branca",
                category: "cola",
            };
        }
        if (/\b(instantanea|tekbond|rendibond|793|100g|cianoacrilato)\b/.test(norm)) {
            return {
                signature: "cola:instantanea",
                canonicalLabel: "Cola Instantânea 100g",
                category: "cola",
            };
        }
        if (/\b(contato|formica)\b/.test(norm)) {
            return {
                signature: "cola:contato",
                canonicalLabel: "Cola de Contato",
                category: "cola",
            };
        }
    }

    // 8. CHAPAS DE MDF (ex: "MDF BRANCO 2F 15MM - FIBRAFPLAC PL40", "MDF BRANCO TX 2 FACES 15 MM FIBRAPLAC", "Chapa 15mm branco tx", "Chapa 6mm branco tx")
    if (/\b(mdf|chapas?|compensados?)\b/.test(norm)) {
        let thicknessMm: number | null = null;
        const thMatch = norm.match(/\b0?(3|6|9|12|15|18|25)\s*mm\b/);
        if (thMatch) {
            thicknessMm = parseInt(thMatch[1], 10);
        }

        const cleanedForColor = norm
            .replace(/\b1\s*lado\s*br\b/g, " ")
            .replace(/\b1f\s*br\b/g, " ")
            .replace(/\b[12]\s*faces?\b/g, " ")
            .replace(/\b[12]\s*lados?\b/g, " ")
            .replace(/\b[12]f\b/g, " ")
            .replace(/\b0?(3|6|9|12|15|18|25)\s*mm\b/g, " ")
            .replace(/\bpl\s*\d+\b/g, " ");

        const colorTokens = cleanedForColor
            .split(" ")
            .filter(
                (t) =>
                    t &&
                    ![
                        "mdf",
                        "chapa",
                        "chapas",
                        "compensado",
                        "tx",
                        "matt",
                        "supermatt",
                        "trama",
                        "cristal",
                        "mm",
                        "03",
                        "3",
                        "06",
                        "6",
                        "09",
                        "9",
                        "12",
                        "15",
                        "18",
                        "25",
                    ].includes(t) &&
                    !SUPPLIER_AND_NOISE_WORDS.has(t)
            );

        let color = colorTokens.join(" ").trim();
        if (
            (colorTokens.includes("branco") || colorTokens.includes("branca")) &&
            colorTokens.every((t) => ["branco", "branca", "artico", "diamante", "gelo"].includes(t))
        ) {
            color = "branco";
        } else if (colorTokens.includes("freijo")) {
            color = "freijo";
        }

        if (thicknessMm && color) {
            return {
                signature: `chapa_mdf:${thicknessMm}mm:${color}`,
                canonicalLabel: `Chapa MDF ${thicknessMm}mm ${color.toUpperCase()}`,
                category: "chapa_mdf",
            };
        }
    }

    return {
        signature: null,
        canonicalLabel: rawName.trim(),
        category: "outro",
    };
}

function getCoreTokens(rawName: string): string[] {
    const norm = normalizeText(rawName);
    return norm
        .split(" ")
        .filter((t) => t.length >= 2 && !SUPPLIER_AND_NOISE_WORDS.has(t));
}

/**
 * Encontra o item correspondente no estoque existente usando:
 * 1. Vínculo explícito (inventoryId)
 * 2. Igualdade de nome normalizado
 * 3. Assinatura Semântica de Marcenaria (Chapa MDF espessura+cor, Fita largura+cor, Corrediça tamanho, Thinner, Tapa Furo, Parafuso, etc.)
 * 4. Código do produto ou similaridade de tokens
 */
export function findBestInventoryMatch<T extends InventoryCandidate>(
    incomingName: string,
    inventoryList: T[],
    incomingCode?: string,
    explicitInventoryId?: string
): StockMatchResult<T> {
    if (!inventoryList || inventoryList.length === 0) {
        const cls = classifyWoodworkingItem(incomingName);
        return {
            matchedItem: null,
            matchType: "none",
            signature: cls.signature,
            canonicalLabel: cls.canonicalLabel,
            confidence: 0,
        };
    }

    const incomingCls = classifyWoodworkingItem(incomingName);
    const normIncoming = normalizeText(incomingName);

    // 1. ID explícito selecionado pelo usuário
    if (explicitInventoryId) {
        const byId = inventoryList.find((item) => item.id === explicitInventoryId);
        if (byId) {
            return {
                matchedItem: byId,
                matchType: "exact_id",
                signature: incomingCls.signature,
                canonicalLabel: incomingCls.canonicalLabel,
                confidence: 1,
            };
        }
    }

    // 2. Nome idêntico (ignorando acentos e maiúsculas/minúsculas)
    const exactNameMatch = inventoryList.find(
        (item) => normalizeText(item.name) === normIncoming
    );
    if (exactNameMatch) {
        return {
            matchedItem: exactNameMatch,
            matchType: "exact_name",
            signature: incomingCls.signature,
            canonicalLabel: incomingCls.canonicalLabel,
            confidence: 1,
        };
    }

    // 3. Assinatura Semântica de Marcenaria (ex: chapa_mdf:15mm:branco)
    if (incomingCls.signature) {
        const signatureMatches = inventoryList.filter((item) => {
            const candidateCls = classifyWoodworkingItem(item.name);
            return candidateCls.signature === incomingCls.signature;
        });

        if (signatureMatches.length > 0) {
            // Prioriza o item do catálogo principal BJL (código curto numérico como #1..#50 ou maior quantidade)
            signatureMatches.sort((a, b) => {
                const codeA = String(a.id_estoque || a.idEstoque || "999999").trim();
                const codeB = String(b.id_estoque || b.idEstoque || "999999").trim();
                const isShortA = codeA.length <= 2 ? 0 : 1;
                const isShortB = codeB.length <= 2 ? 0 : 1;
                if (isShortA !== isShortB) return isShortA - isShortB;
                return Number(b.quantity || 0) - Number(a.quantity || 0);
            });

            return {
                matchedItem: signatureMatches[0],
                matchType: "semantic_signature",
                signature: incomingCls.signature,
                canonicalLabel: incomingCls.canonicalLabel,
                confidence: 0.96,
            };
        }
    }

    // 4. Similaridade por tokens principais (para itens gerais como Estopa, Filme Stretch, Fita de LED, Fonte 10A)
    const incomingTokens = getCoreTokens(incomingName);
    if (incomingTokens.length > 0) {
        let bestCandidate: T | null = null;
        let bestScore = 0;

        for (const item of inventoryList) {
            const candidateCls = classifyWoodworkingItem(item.name);
            // Se ambos têm assinatura semântica conhecida e são DIFERENTES (ex: MDF 15mm vs MDF 6mm), nunca mistura!
            if (
                incomingCls.signature &&
                candidateCls.signature &&
                incomingCls.signature !== candidateCls.signature
            ) {
                continue;
            }

            const candTokens = getCoreTokens(item.name);
            if (candTokens.length === 0) continue;

            const intersection = incomingTokens.filter((t) => candTokens.includes(t));
            const minLen = Math.min(incomingTokens.length, candTokens.length);
            const unionLen = new Set([...incomingTokens, ...candTokens]).size;

            const containment = minLen > 0 ? intersection.length / minLen : 0;
            const jaccard = unionLen > 0 ? intersection.length / unionLen : 0;
            const score = containment * 0.65 + jaccard * 0.35;

            if (score > bestScore && intersection.length >= 2) {
                bestScore = score;
                bestCandidate = item;
            }
        }

        if (bestCandidate && bestScore >= 0.75) {
            return {
                matchedItem: bestCandidate,
                matchType: "fuzzy_tokens",
                signature: incomingCls.signature,
                canonicalLabel: incomingCls.canonicalLabel,
                confidence: bestScore,
            };
        }
    }

    return {
        matchedItem: null,
        matchType: "none",
        signature: incomingCls.signature,
        canonicalLabel: incomingCls.canonicalLabel,
        confidence: 0,
    };
}
