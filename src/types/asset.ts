
export interface Asset {
    id: string;
    acquisitionDate: Date;
    name: string;
    value: number;
    usefulLife: number; // in years
    depreciationRate?: number; // Optional: calculated or manual
}
