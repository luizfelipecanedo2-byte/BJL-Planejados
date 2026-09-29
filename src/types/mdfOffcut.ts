export type GrainDirection = 'none' | 'longitudinal' | 'transversal';
export type OffcutStatus = 'disponivel' | 'reservado' | 'utilizado' | 'descartado';

export interface MdfOffcut {
    id: string;
    code: string;
    materialName: string;
    thicknessMm: number;
    lengthMm: number;
    widthMm: number;
    quantity: number;
    grainDirection: GrainDirection;
    location: string;
    status: OffcutStatus;
    reservedProject?: string | null;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
}
