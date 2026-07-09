import { z } from 'zod';
import { CRMStatus, DataSource, CRMLead, AIExtractedLead } from '../types/lead';

const allowedCRMStatuses: CRMStatus[] = [
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE'
];

const allowedDataSources: DataSource[] = [
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots'
];

export const leadValidatorSchema = z.object({
  created_at: z.string().default(() => new Date().toISOString()),
  name: z.string().trim().default(''),
  email: z.string().trim().toLowerCase().default(''),
  country_code: z.string().trim().default(''),
  mobile_without_country_code: z.string().trim().default(''),
  company: z.string().trim().default(''),
  city: z.string().trim().default(''),
  state: z.string().trim().default(''),
  country: z.string().trim().default(''),
  lead_owner: z.string().trim().default(''),
  crm_status: z.preprocess((val) => {
    if (typeof val !== 'string') return '';
    const upperVal = val.toUpperCase().trim();
    return allowedCRMStatuses.includes(upperVal as CRMStatus) ? upperVal : '';
  }, z.string().default('')),
  crm_note: z.string().trim().default(''),
  data_source: z.preprocess((val) => {
    if (typeof val !== 'string') return '';
    const lowerVal = val.toLowerCase().trim();
    return allowedDataSources.includes(lowerVal as DataSource) ? lowerVal : '';
  }, z.string().default('')),
  possession_time: z.string().trim().default(''),
  description: z.string().trim().default('')
}).refine((data) => {
  // Rule: Skip rows containing neither Email nor Phone.
  // This means at least one must be present and not empty.
  const hasEmail = data.email.length > 0;
  const hasPhone = data.mobile_without_country_code.length > 0;
  return hasEmail || hasPhone;
}, {
  message: "Row must contain at least a valid Email or a Phone number",
  path: ["email", "mobile_without_country_code"]
}).refine((data) => {
  // Validate email format if it is provided
  if (data.email.length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(data.email);
  }
  return true;
}, {
  message: "Invalid email format",
  path: ["email"]
}).refine((data) => {
  // Validate phone number formatting if provided (only digits, spaces, hyphens, parentheses)
  if (data.mobile_without_country_code.length > 0) {
    const cleanPhone = data.mobile_without_country_code.replace(/[\s\-()]/g, '');
    // Ensure it contains at least 5 digits
    return /^\d{5,15}$/.test(cleanPhone);
  }
  return true;
}, {
  message: "Invalid phone number format (should contain 5-15 digits)",
  path: ["mobile_without_country_code"]
});

export interface ValidationResult {
  isValid: boolean;
  lead: CRMLead | null;
  errors: string[];
}

export function validateLead(data: Partial<AIExtractedLead>): ValidationResult {
  const result = leadValidatorSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
    return {
      isValid: false,
      lead: null,
      errors
    };
  }

  return {
    isValid: true,
    lead: result.data as CRMLead,
    errors: []
  };
}
