"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadValidatorSchema = void 0;
exports.validateLead = validateLead;
const zod_1 = require("zod");
const allowedCRMStatuses = [
    'GOOD_LEAD_FOLLOW_UP',
    'DID_NOT_CONNECT',
    'BAD_LEAD',
    'SALE_DONE'
];
const allowedDataSources = [
    'leads_on_demand',
    'meridian_tower',
    'eden_park',
    'varah_swamy',
    'sarjapur_plots'
];
exports.leadValidatorSchema = zod_1.z.object({
    created_at: zod_1.z.string().default(() => new Date().toISOString()),
    name: zod_1.z.string().trim().default(''),
    email: zod_1.z.string().trim().toLowerCase().default(''),
    country_code: zod_1.z.string().trim().default(''),
    mobile_without_country_code: zod_1.z.string().trim().default(''),
    company: zod_1.z.string().trim().default(''),
    city: zod_1.z.string().trim().default(''),
    state: zod_1.z.string().trim().default(''),
    country: zod_1.z.string().trim().default(''),
    lead_owner: zod_1.z.string().trim().default(''),
    crm_status: zod_1.z.preprocess((val) => {
        if (typeof val !== 'string')
            return '';
        const upperVal = val.toUpperCase().trim();
        return allowedCRMStatuses.includes(upperVal) ? upperVal : '';
    }, zod_1.z.string().default('')),
    crm_note: zod_1.z.string().trim().default(''),
    data_source: zod_1.z.preprocess((val) => {
        if (typeof val !== 'string')
            return '';
        const lowerVal = val.toLowerCase().trim();
        return allowedDataSources.includes(lowerVal) ? lowerVal : '';
    }, zod_1.z.string().default('')),
    possession_time: zod_1.z.string().trim().default(''),
    description: zod_1.z.string().trim().default('')
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
function validateLead(data) {
    const result = exports.leadValidatorSchema.safeParse(data);
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
        lead: result.data,
        errors: []
    };
}
