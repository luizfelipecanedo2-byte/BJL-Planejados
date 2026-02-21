
export type ServiceType = "Fabricação" | "Assistência";
export type ServiceStatus = "Em Andamento" | "Encerrado";

export interface ServiceOrder {
    id: string;
    ticketNumber: string;
    openDate: Date;
    client: string;
    type: ServiceType;
    action: string;
    status: ServiceStatus;
    forecastDate: Date;
    completionDate?: Date;
    notes?: string;
}
