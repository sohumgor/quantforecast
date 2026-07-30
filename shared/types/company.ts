// Mirrors backend/api/schemas/company.py

export interface CompanyInfoResponse {
  ticker: string;
  name: string;
  description: string;
  website: string | null;
  sector: string | null;
  industry: string | null;
}
