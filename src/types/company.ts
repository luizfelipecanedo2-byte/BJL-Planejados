
export interface CompanySettings {
  id: string;
  name: string;
  cnpj: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  instagram: string | null;
  facebook: string | null;
  responsible_name: string | null;
  capacity_production_staff?: number;
  capacity_efficiency?: number;
  capacity_daily_hours?: number;
  created_at: string;
  updated_at: string;
}
