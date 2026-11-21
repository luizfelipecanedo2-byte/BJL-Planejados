
export type ServiceType = "Fabricação" | "Assistência";

export type DefaultServiceStatus =
    | "A Definir"
    | "Plano de corte"
    | "Pronto para produção"
    | "Corte da caixa"
    | "Fita"
    | "Montagem das caixas"
    | "Corte das portas + Tamponados"
    | "Colocação dos tamponados"
    | "Embalagem"
    | "Pronto para entrega"
    | "Instalação"
    | "Entregue e Finalizado";

export type ServiceStatus = DefaultServiceStatus | (string & {});

export type OSStageColorKey =
    | "slate"
    | "slate-dark"
    | "blue"
    | "orange"
    | "amber"
    | "yellow"
    | "indigo"
    | "purple"
    | "pink"
    | "cyan"
    | "emerald-light"
    | "emerald"
    | "teal"
    | "rose"
    | "violet"
    | "sky"
    | "lime";

export interface OSStageColorSpec {
    label: string;
    bg: string;
    borderTop: string;
}

export const OS_STAGE_COLORS: Record<OSStageColorKey, OSStageColorSpec> = {
    "slate": { label: "Cinza", bg: "bg-slate-500", borderTop: "border-t-slate-500" },
    "slate-dark": { label: "Grafite", bg: "bg-slate-600", borderTop: "border-t-slate-600" },
    "blue": { label: "Azul", bg: "bg-blue-500", borderTop: "border-t-blue-500" },
    "sky": { label: "Azul Claro", bg: "bg-sky-500", borderTop: "border-t-sky-500" },
    "cyan": { label: "Ciano", bg: "bg-cyan-500", borderTop: "border-t-cyan-500" },
    "teal": { label: "Turquesa", bg: "bg-teal-500", borderTop: "border-t-teal-500" },
    "emerald-light": { label: "Verde Claro", bg: "bg-emerald-400", borderTop: "border-t-emerald-400" },
    "emerald": { label: "Verde", bg: "bg-emerald-600", borderTop: "border-t-emerald-600" },
    "lime": { label: "Lima", bg: "bg-lime-600", borderTop: "border-t-lime-600" },
    "yellow": { label: "Amarelo", bg: "bg-yellow-600", borderTop: "border-t-yellow-600" },
    "amber": { label: "Âmbar", bg: "bg-amber-500", borderTop: "border-t-amber-500" },
    "orange": { label: "Laranja", bg: "bg-orange-500", borderTop: "border-t-orange-500" },
    "rose": { label: "Vermelho", bg: "bg-rose-500", borderTop: "border-t-rose-500" },
    "pink": { label: "Rosa", bg: "bg-pink-500", borderTop: "border-t-pink-500" },
    "purple": { label: "Roxo", bg: "bg-purple-500", borderTop: "border-t-purple-500" },
    "violet": { label: "Violeta", bg: "bg-violet-500", borderTop: "border-t-violet-500" },
    "indigo": { label: "Índigo", bg: "bg-indigo-500", borderTop: "border-t-indigo-500" },
};

export const CUSTOM_STAGE_COLOR_OPTIONS: OSStageColorKey[] = [
    "teal",
    "rose",
    "violet",
    "sky",
    "amber",
    "orange",
    "blue",
    "indigo",
    "pink",
    "lime",
];

export interface OSStageConfig {
    name: string;
    color: OSStageColorKey;
    isDefault?: boolean;
    insertAfter?: string;
}

export const DEFAULT_OS_STAGES: OSStageConfig[] = [
    { name: "A Definir", color: "slate", isDefault: true },
    { name: "Plano de corte", color: "slate-dark", isDefault: true },
    { name: "Pronto para produção", color: "blue", isDefault: true },
    { name: "Corte da caixa", color: "orange", isDefault: true },
    { name: "Fita", color: "amber", isDefault: true },
    { name: "Montagem das caixas", color: "yellow", isDefault: true },
    { name: "Corte das portas + Tamponados", color: "indigo", isDefault: true },
    { name: "Colocação dos tamponados", color: "purple", isDefault: true },
    { name: "Embalagem", color: "pink", isDefault: true },
    { name: "Pronto para entrega", color: "cyan", isDefault: true },
    { name: "Instalação", color: "emerald-light", isDefault: true },
    { name: "Entregue e Finalizado", color: "emerald", isDefault: true },
];

export interface LaborLog {
    id?: string;
    date: Date;
    hours: number;
    description?: string;
}

export interface ServiceOrder {
    id: string;
    ticketNumber: string;
    openDate: Date;
    clientId?: string;
    client: string;
    clientPhone?: string;
    clientAddress?: string;
    clientCity?: string;
    type: ServiceType;
    action: string;
    status: ServiceStatus;
    forecastDate: Date;
    completionDate?: Date;
    notes?: string;
    attachments?: string[];
    laborLogs?: LaborLog[];
    amount?: number;
    priorityLevel?: 'baixa' | 'normal' | 'alta' | 'urgente';
    productionPriority?: number;
    productionNotes?: string;
    daysEstimated?: number;
    tasks?: any[];
    spentCost?: number;
    costRatio?: number;
    marginStatus?: 'healthy' | 'warning' | 'danger';
    materialsDetails?: Array<{ description: string; amount: number; date?: string; invoice?: string }>;
}

export interface OSAttachmentItem {
    id?: string;
    url: string;
    title?: string;
    measurements?: string; // Ex: "Parede L: 3.20m x 2.60m, tomada a 1.10m"
    tag?: 'Foto do Local' | 'Medições / Croqui' | 'Projeto 3D' | 'Instalação' | 'Geral';
    createdAt?: string;
}

export function parseOSAttachment(raw: string): OSAttachmentItem {
    if (!raw) return { url: "" };
    if (raw.startsWith('{') && raw.endsWith('}')) {
        try {
            return JSON.parse(raw);
        } catch {
            return { url: raw, title: "Foto do Projeto" };
        }
    }
    return {
        url: raw,
        title: "Foto do Projeto",
        tag: 'Foto do Local'
    };
}

export function serializeOSAttachment(item: OSAttachmentItem): string {
    return JSON.stringify(item);
}
