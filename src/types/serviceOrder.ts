
export type ServiceType = "Fabricação" | "Assistência";
export type ServiceStatus = "A Definir" | "Plano de corte" | "Pronto para produção" | "Corte da caixa" | "Fita" | "Montagem das caixas" | "Corte das portas + Tamponados" | "Colocação dos tamponados" | "Embalagem" | "Pronto para entrega" | "Instalação" | "Entregue e Finalizado";

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
