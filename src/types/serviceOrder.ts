
export type ServiceType = "Fabricação" | "Assistência";
export type ServiceStatus = "Plano de corte" | "Pronto para produção" | "Corte da caixa" | "Fita" | "Montagem das caixas" | "Corte das portas + Tamponados" | "Colocação dos tamponados" | "Embalagem" | "Pronto para entrega" | "Instalação" | "Entregue e Finalizado";

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
}
