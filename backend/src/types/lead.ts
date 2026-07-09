export interface RawCSVRow {
  [key: string]: string;
}

export type CRMStatus = 
  | 'GOOD_LEAD_FOLLOW_UP'
  | 'DID_NOT_CONNECT'
  | 'BAD_LEAD'
  | 'SALE_DONE';

export type DataSource = 
  | 'leads_on_demand'
  | 'meridian_tower'
  | 'eden_park'
  | 'varah_swamy'
  | 'sarjapur_plots'
  | '';

export interface CRMLead {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CRMStatus | '';
  crm_note: string;
  data_source: DataSource;
  possession_time: string;
  description: string;
}

export interface AIExtractedLead {
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

export interface AILeadResult {
  index: number;
  extracted_data: AIExtractedLead;
  confidence: number;
  explanation: string;
  detected_mapping: Record<string, string>;
}

export interface ProcessedLeadResult {
  index: number;
  isValid: boolean;
  lead: CRMLead | null;
  errors: string[];
  rawRow: RawCSVRow;
  confidence: number;
  explanation: string;
  detectedMapping: Record<string, string>;
}

export interface ImportJobSummary {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  duplicateCount: number;
  averageConfidence: number;
  processingTimeMs: number;
  mostCommonCity: string;
  mostCommonState: string;
  topLeadStatus: string;
  mostCommonCompany: string;
  estimatedDataQuality: string;
  aiSummary: string;
  importedLeads: ProcessedLeadResult[];
  skippedLeads: ProcessedLeadResult[];
}

export interface ColumnMapping {
  originalColumn: string;
  crmField: string;
  confidence: number;
  reasoning: string;
}

export interface AIDetectedSource {
  source: string;
  confidence: number;
  reasoning: string;
  language: string;
  dateFormat: string;
  phoneFormat: string;
  ignoredColumns: string[];
  duplicateColumns: string[];
  potentialMissingInfo: string;
  columnMappings: ColumnMapping[];
}
