/**
 * AOC-4 Field Configuration — Maps canonical financial data fields
 * to their corresponding MCA V3 portal form field identifiers.
 *
 * The selectors here are based on the MCA V3 portal's AOC-4 form structure.
 * They may need updating if MCA changes their portal DOM.
 *
 * NOTE: MCA V3 uses Angular-based dynamic forms. Selectors use a combination
 * of name attributes, IDs, and aria-labels for robustness.
 */

export interface AOC4FieldDef {
  id: string;
  sourceField: string;       // dot-path into AOC4FinancialData
  formSection: string;
  formFieldLabel: string;
  formFieldSelector: string; // CSS selector or identifier
  valueTransform?: 'roundTo100' | 'formatINR' | 'dateFormat' | 'none';
  isRequired: boolean;
  fieldType: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea';
  notes?: string;
}

// Grouped by AOC-4 form sections
export const AOC4_FIELD_CONFIG: AOC4FieldDef[] = [
  // ━━━ Section 1: General Information (mostly auto-populated via CIN) ━━━
  {
    id: 'gen_cin',
    sourceField: 'companyInfo.cin',
    formSection: 'General Information',
    formFieldLabel: 'Corporate Identity Number (CIN)',
    formFieldSelector: 'input[name="cin"], #cin, input[aria-label*="CIN"]',
    isRequired: true,
    fieldType: 'text',
    notes: 'Enter CIN first — other fields auto-populate',
  },
  {
    id: 'gen_company_name',
    sourceField: 'companyInfo.name',
    formSection: 'General Information',
    formFieldLabel: 'Name of the Company',
    formFieldSelector: 'input[name="companyName"], #companyName',
    isRequired: true,
    fieldType: 'text',
    notes: 'Auto-populated from CIN',
  },
  {
    id: 'gen_email',
    sourceField: 'companyInfo.email',
    formSection: 'General Information',
    formFieldLabel: 'Email ID of the Company',
    formFieldSelector: 'input[name="email"], input[type="email"]',
    isRequired: true,
    fieldType: 'text',
  },
  {
    id: 'gen_fy_from',
    sourceField: 'financialYear.from',
    formSection: 'General Information',
    formFieldLabel: 'Financial Year From',
    formFieldSelector: 'input[name="fyFrom"], input[aria-label*="Financial Year From"]',
    valueTransform: 'dateFormat',
    isRequired: true,
    fieldType: 'date',
  },
  {
    id: 'gen_fy_to',
    sourceField: 'financialYear.to',
    formSection: 'General Information',
    formFieldLabel: 'Financial Year To',
    formFieldSelector: 'input[name="fyTo"], input[aria-label*="Financial Year To"]',
    valueTransform: 'dateFormat',
    isRequired: true,
    fieldType: 'date',
  },
  {
    id: 'gen_agm_held',
    sourceField: 'compliance.agmHeld',
    formSection: 'General Information',
    formFieldLabel: 'Whether AGM Held',
    formFieldSelector: 'input[name="agmHeld"][value="Yes"], #agmHeldYes, select[name="agmHeld"]',
    isRequired: true,
    fieldType: 'select',
    notes: 'Standard: Yes',
  },
  {
    id: 'gen_agm_date',
    sourceField: 'compliance.agmDate',
    formSection: 'General Information',
    formFieldLabel: 'Actual Date of AGM (Manual)',
    formFieldSelector: 'input[name="agmDate"], #agmDate, input[aria-label*="Actual Date of AGM"]',
    valueTransform: 'dateFormat',
    isRequired: true,
    fieldType: 'date',
    notes: 'AGM date can vary so manually fill',
  },
  {
    id: 'gen_agm_due_date',
    sourceField: 'compliance.agmDueDate',
    formSection: 'General Information',
    formFieldLabel: 'Due Date of AGM',
    formFieldSelector: 'input[name="agmDueDate"], #agmDueDate, input[aria-label*="Due Date of AGM"]',
    valueTransform: 'dateFormat',
    isRequired: true,
    fieldType: 'date',
    notes: 'Standard due date: 30/09/2026',
  },
  {
    id: 'gen_csr_applicable',
    sourceField: 'compliance.csrApplicable',
    formSection: 'General Information',
    formFieldLabel: 'Whether CSR Applicable (CSR-2)',
    formFieldSelector: 'input[name="csrApplicable"][value="No"], #csrApplicableNo, select[name="csrApplicable"]',
    isRequired: true,
    fieldType: 'select',
    notes: 'CSR-2 not applicable per company profile',
  },
  {
    id: 'gen_subsidiary_aoc1',
    sourceField: 'compliance.subsidiaryApplicable',
    formSection: 'General Information',
    formFieldLabel: 'Subsidiaries / Joint Ventures (AOC-1)',
    formFieldSelector: 'input[name="subsidiariesApplicable"][value="No"], #subsidiariesNo, select[name="subsidiariesApplicable"]',
    isRequired: true,
    fieldType: 'select',
    notes: 'AOC-1 depends on case to case (No subsidiaries)',
  },

  // ━━━ Section 2: Balance Sheet — Equity & Liabilities ━━━
  {
    id: 'bs_share_capital',
    sourceField: 'balanceSheet.shareCapital',
    formSection: 'Balance Sheet - Equity & Liabilities',
    formFieldLabel: 'Share Capital',
    formFieldSelector: 'input[name="shareCapital"], input[aria-label*="Share Capital"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'bs_reserves_surplus',
    sourceField: 'balanceSheet.reservesAndSurplus',
    formSection: 'Balance Sheet - Equity & Liabilities',
    formFieldLabel: 'Reserves and Surplus',
    formFieldSelector: 'input[name="reservesSurplus"], input[aria-label*="Reserves"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'bs_lt_borrowings',
    sourceField: 'balanceSheet.longTermBorrowings',
    formSection: 'Balance Sheet - Equity & Liabilities',
    formFieldLabel: 'Long-Term Borrowings',
    formFieldSelector: 'input[name="longTermBorrowings"], input[aria-label*="Long-Term Borrowings"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'bs_deferred_tax_liability',
    sourceField: 'balanceSheet.deferredTaxLiability',
    formSection: 'Balance Sheet - Equity & Liabilities',
    formFieldLabel: 'Deferred Tax Liabilities (Net)',
    formFieldSelector: 'input[name="deferredTaxLiabilities"], input[aria-label*="Deferred Tax"]',
    valueTransform: 'formatINR',
    isRequired: false,
    fieldType: 'number',
  },
  {
    id: 'bs_st_provisions',
    sourceField: 'balanceSheet.shortTermProvisions',
    formSection: 'Balance Sheet - Equity & Liabilities',
    formFieldLabel: 'Short-Term Provisions',
    formFieldSelector: 'input[name="shortTermProvisions"], input[aria-label*="Short-Term Provisions"]',
    valueTransform: 'formatINR',
    isRequired: false,
    fieldType: 'number',
  },
  {
    id: 'bs_trade_payables',
    sourceField: 'balanceSheet.tradePayables',
    formSection: 'Balance Sheet - Equity & Liabilities',
    formFieldLabel: 'Trade Payables',
    formFieldSelector: 'input[name="tradePayables"], input[aria-label*="Trade Payables"]',
    valueTransform: 'formatINR',
    isRequired: false,
    fieldType: 'number',
  },
  {
    id: 'bs_other_current_liabilities',
    sourceField: 'balanceSheet.otherCurrentLiabilities',
    formSection: 'Balance Sheet - Equity & Liabilities',
    formFieldLabel: 'Other Current Liabilities',
    formFieldSelector: 'input[name="otherCurrentLiabilities"], input[aria-label*="Other Current Liabilities"]',
    valueTransform: 'formatINR',
    isRequired: false,
    fieldType: 'number',
  },
  {
    id: 'bs_total_equity_liabilities',
    sourceField: 'balanceSheet.totalEquityAndLiabilities',
    formSection: 'Balance Sheet - Equity & Liabilities',
    formFieldLabel: 'Total Equity and Liabilities',
    formFieldSelector: 'input[name="totalEquityLiabilities"], input[aria-label*="Total"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },

  // ━━━ Section 3: Balance Sheet — Assets ━━━
  {
    id: 'bs_tangible_assets',
    sourceField: 'balanceSheet.tangibleAssets',
    formSection: 'Balance Sheet - Assets',
    formFieldLabel: 'Tangible Assets / Property, Plant & Equipment',
    formFieldSelector: 'input[name="tangibleAssets"], input[aria-label*="Tangible Assets"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'bs_deferred_tax_asset',
    sourceField: 'balanceSheet.deferredTaxAsset',
    formSection: 'Balance Sheet - Assets',
    formFieldLabel: 'Deferred Tax Assets (Net)',
    formFieldSelector: 'input[name="deferredTaxAssets"], input[aria-label*="Deferred Tax Assets"]',
    valueTransform: 'formatINR',
    isRequired: false,
    fieldType: 'number',
  },
  {
    id: 'bs_trade_receivables',
    sourceField: 'balanceSheet.tradeReceivables',
    formSection: 'Balance Sheet - Assets',
    formFieldLabel: 'Trade Receivables',
    formFieldSelector: 'input[name="tradeReceivables"], input[aria-label*="Trade Receivables"]',
    valueTransform: 'formatINR',
    isRequired: false,
    fieldType: 'number',
  },
  {
    id: 'bs_cash_equivalents',
    sourceField: 'balanceSheet.cashAndEquivalents',
    formSection: 'Balance Sheet - Assets',
    formFieldLabel: 'Cash and Cash Equivalents',
    formFieldSelector: 'input[name="cashEquivalents"], input[aria-label*="Cash"]',
    valueTransform: 'formatINR',
    isRequired: false,
    fieldType: 'number',
  },
  {
    id: 'bs_other_current_assets',
    sourceField: 'balanceSheet.otherCurrentAssets',
    formSection: 'Balance Sheet - Assets',
    formFieldLabel: 'Other Current Assets',
    formFieldSelector: 'input[name="otherCurrentAssets"], input[aria-label*="Other Current Assets"]',
    valueTransform: 'formatINR',
    isRequired: false,
    fieldType: 'number',
  },
  {
    id: 'bs_total_assets',
    sourceField: 'balanceSheet.totalAssets',
    formSection: 'Balance Sheet - Assets',
    formFieldLabel: 'Total Assets',
    formFieldSelector: 'input[name="totalAssets"], input[aria-label*="Total Assets"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },

  // ━━━ Section 4: Profit & Loss Statement ━━━
  {
    id: 'pl_revenue_operations',
    sourceField: 'profitAndLoss.revenueFromOperations',
    formSection: 'Profit & Loss Statement',
    formFieldLabel: 'Revenue from Operations',
    formFieldSelector: 'input[name="revenueOperations"], input[aria-label*="Revenue from Operations"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'pl_other_income',
    sourceField: 'profitAndLoss.otherIncome',
    formSection: 'Profit & Loss Statement',
    formFieldLabel: 'Other Income',
    formFieldSelector: 'input[name="otherIncome"], input[aria-label*="Other Income"]',
    valueTransform: 'formatINR',
    isRequired: false,
    fieldType: 'number',
  },
  {
    id: 'pl_total_revenue',
    sourceField: 'profitAndLoss.totalRevenue',
    formSection: 'Profit & Loss Statement',
    formFieldLabel: 'Total Revenue',
    formFieldSelector: 'input[name="totalRevenue"], input[aria-label*="Total Revenue"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'pl_employee_expenses',
    sourceField: 'profitAndLoss.employeeExpenses',
    formSection: 'Profit & Loss Statement',
    formFieldLabel: 'Employee Benefit Expenses',
    formFieldSelector: 'input[name="employeeBenefitExpenses"], input[aria-label*="Employee"]',
    valueTransform: 'formatINR',
    isRequired: false,
    fieldType: 'number',
  },
  {
    id: 'pl_depreciation',
    sourceField: 'profitAndLoss.depreciation',
    formSection: 'Profit & Loss Statement',
    formFieldLabel: 'Depreciation and Amortization',
    formFieldSelector: 'input[name="depreciation"], input[aria-label*="Depreciation"]',
    valueTransform: 'formatINR',
    isRequired: false,
    fieldType: 'number',
  },
  {
    id: 'pl_other_expenses',
    sourceField: 'profitAndLoss.adminExpenses',
    formSection: 'Profit & Loss Statement',
    formFieldLabel: 'Other Expenses / Administrative Expenses',
    formFieldSelector: 'input[name="otherExpenses"], input[aria-label*="Other Expenses"]',
    valueTransform: 'formatINR',
    isRequired: false,
    fieldType: 'number',
  },
  {
    id: 'pl_total_expenses',
    sourceField: 'profitAndLoss.totalExpenses',
    formSection: 'Profit & Loss Statement',
    formFieldLabel: 'Total Expenses',
    formFieldSelector: 'input[name="totalExpenses"], input[aria-label*="Total Expenses"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'pl_profit_before_tax',
    sourceField: 'profitAndLoss.profitBeforeTax',
    formSection: 'Profit & Loss Statement',
    formFieldLabel: 'Profit / (Loss) Before Tax',
    formFieldSelector: 'input[name="profitBeforeTax"], input[aria-label*="Profit Before Tax"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'pl_tax_expense',
    sourceField: 'profitAndLoss.totalTaxExpense',
    formSection: 'Profit & Loss Statement',
    formFieldLabel: 'Tax Expense',
    formFieldSelector: 'input[name="taxExpense"], input[aria-label*="Tax Expense"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'pl_profit_after_tax',
    sourceField: 'profitAndLoss.profitAfterTax',
    formSection: 'Profit & Loss Statement',
    formFieldLabel: 'Profit / (Loss) After Tax',
    formFieldSelector: 'input[name="profitAfterTax"], input[aria-label*="Profit After Tax"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'pl_basic_eps',
    sourceField: 'profitAndLoss.basicEPS',
    formSection: 'Profit & Loss Statement',
    formFieldLabel: 'Earnings Per Share - Basic (Rs.)',
    formFieldSelector: 'input[name="basicEPS"], input[aria-label*="Basic"]',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'pl_diluted_eps',
    sourceField: 'profitAndLoss.dilutedEPS',
    formSection: 'Profit & Loss Statement',
    formFieldLabel: 'Earnings Per Share - Diluted (Rs.)',
    formFieldSelector: 'input[name="dilutedEPS"], input[aria-label*="Diluted"]',
    isRequired: true,
    fieldType: 'number',
  },

  // ━━━ Section 5: Share Capital Details ━━━
  {
    id: 'sc_authorized_shares',
    sourceField: 'shareCapital.authorizedShares',
    formSection: 'Share Capital Details',
    formFieldLabel: 'Authorized Capital - Number of Shares',
    formFieldSelector: 'input[name="authorizedShares"], input[aria-label*="Authorized"]',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'sc_authorized_amount',
    sourceField: 'shareCapital.authorizedAmount',
    formSection: 'Share Capital Details',
    formFieldLabel: 'Authorized Capital - Amount (Rs.)',
    formFieldSelector: 'input[name="authorizedAmount"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'sc_paid_up_shares',
    sourceField: 'shareCapital.paidUpShares',
    formSection: 'Share Capital Details',
    formFieldLabel: 'Paid-Up Capital - Number of Shares',
    formFieldSelector: 'input[name="paidUpShares"], input[aria-label*="Paid"]',
    isRequired: true,
    fieldType: 'number',
  },
  {
    id: 'sc_paid_up_amount',
    sourceField: 'shareCapital.paidUpAmount',
    formSection: 'Share Capital Details',
    formFieldLabel: 'Paid-Up Capital - Amount (Rs.)',
    formFieldSelector: 'input[name="paidUpAmount"]',
    valueTransform: 'formatINR',
    isRequired: true,
    fieldType: 'number',
  },

  // ━━━ Section 6: Auditor Information ━━━
  {
    id: 'aud_firm_name',
    sourceField: 'auditor.firmName',
    formSection: 'Auditor Information',
    formFieldLabel: 'Name of Audit Firm',
    formFieldSelector: 'input[name="auditFirmName"], input[aria-label*="Audit Firm"]',
    isRequired: true,
    fieldType: 'text',
  },
  {
    id: 'aud_frn',
    sourceField: 'auditor.frn',
    formSection: 'Auditor Information',
    formFieldLabel: 'Firm Registration Number (FRN)',
    formFieldSelector: 'input[name="frn"], input[aria-label*="FRN"]',
    isRequired: true,
    fieldType: 'text',
  },
  {
    id: 'aud_name',
    sourceField: 'auditor.name',
    formSection: 'Auditor Information',
    formFieldLabel: 'Name of Auditor',
    formFieldSelector: 'input[name="auditorName"], input[aria-label*="Auditor Name"]',
    isRequired: true,
    fieldType: 'text',
  },
  {
    id: 'aud_membership',
    sourceField: 'auditor.membershipNo',
    formSection: 'Auditor Information',
    formFieldLabel: 'Membership Number',
    formFieldSelector: 'input[name="membershipNo"], input[aria-label*="Membership"]',
    isRequired: true,
    fieldType: 'text',
  },
  {
    id: 'aud_qualification',
    sourceField: 'auditor.qualificationStatus',
    formSection: 'Auditor Information',
    formFieldLabel: 'Auditor Report Qualification Status',
    formFieldSelector: 'select[name="auditorQualification"], #auditorQualification, input[name="isQualified"][value="No"]',
    isRequired: true,
    fieldType: 'select',
    notes: 'Usually clean / unqualified per user rule',
  },
];

/**
 * Get all field definitions grouped by section
 */
export function getFieldsBySection(): Map<string, AOC4FieldDef[]> {
  const map = new Map<string, AOC4FieldDef[]>();
  for (const field of AOC4_FIELD_CONFIG) {
    if (!map.has(field.formSection)) {
      map.set(field.formSection, []);
    }
    map.get(field.formSection)!.push(field);
  }
  return map;
}

/**
 * Get all unique section names in order
 */
export function getSectionNames(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const field of AOC4_FIELD_CONFIG) {
    if (!seen.has(field.formSection)) {
      seen.add(field.formSection);
      result.push(field.formSection);
    }
  }
  return result;
}
