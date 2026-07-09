import { validateLead } from '../validators/lead.validator';

const testCases = [
  {
    name: "Valid Lead with Email and Phone",
    input: {
      name: "John Doe",
      email: "john@example.com",
      country_code: "+1",
      mobile_without_country_code: "5551234567",
      company: "Acme Corp",
      crm_status: "GOOD_LEAD_FOLLOW_UP",
      data_source: "leads_on_demand"
    },
    expectedValid: true
  },
  {
    name: "Valid Lead with only Email",
    input: {
      name: "John Doe",
      email: "john@example.com",
      crm_status: "GOOD_LEAD_FOLLOW_UP",
    },
    expectedValid: true
  },
  {
    name: "Valid Lead with only Phone",
    input: {
      name: "John Doe",
      mobile_without_country_code: "5551234567",
      crm_status: "GOOD_LEAD_FOLLOW_UP",
    },
    expectedValid: true
  },
  {
    name: "Invalid Lead - missing both Email and Phone",
    input: {
      name: "John Doe",
      company: "Acme Corp",
    },
    expectedValid: false
  },
  {
    name: "Invalid Lead - invalid email format",
    input: {
      name: "John Doe",
      email: "not-an-email",
      mobile_without_country_code: "5551234567"
    },
    expectedValid: false
  },
  {
    name: "Normalized Lead - invalid enum values normalized to empty string",
    input: {
      name: "John Doe",
      email: "john@example.com",
      crm_status: "INTERESTED_BUT_BUSY", // Invalid, should be normalized to ""
      data_source: "external_ads" // Invalid, should be normalized to ""
    },
    expectedValid: true,
    checkNormalization: (lead: any) => lead.crm_status === '' && lead.data_source === ''
  }
];

function runTests() {
  console.log("🏃 Running Validator Tests...");
  let passCount = 0;
  
  for (const tc of testCases) {
    const result = validateLead(tc.input);
    const passed = result.isValid === tc.expectedValid && 
                   (!tc.checkNormalization || (result.lead && tc.checkNormalization(result.lead)));
    
    if (passed) {
      console.log(`✅ PASSED: ${tc.name}`);
      passCount++;
    } else {
      console.error(`❌ FAILED: ${tc.name}`);
      console.error(`   Expected: isValid=${tc.expectedValid}`);
      console.error(`   Actual: isValid=${result.isValid}, errors=${JSON.stringify(result.errors)}`);
    }
  }
  
  console.log(`📊 Validator Tests complete: ${passCount}/${testCases.length} passed.`);
  process.exit(passCount === testCases.length ? 0 : 1);
}

runTests();
