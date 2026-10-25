export interface SourceField {
  key: string;
  rawKey: string;
  value: any;
  inferredType: 'string' | 'email' | 'phone' | 'date' | 'number' | 'boolean' | 'array' | 'object';
  label: string;
  required?: boolean;
  isValid: boolean;
  validationError?: string;
  validationWarning?: string;
}

export interface ValidationReport {
  isValid: boolean;
  totalFields: number;
  validFields: number;
  errorCount: number;
  warningCount: number;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

export interface SourceDocument {
  id: string;
  fileName: string;
  fileType: 'json' | 'csv' | 'kv' | 'yaml' | 'xlsx';
  uploadedAt: string;
  rawContent: string;
  fields: Record<string, SourceField>;
  canonicalData: Record<string, any>;
  validationReport: ValidationReport;
}

export interface FormOption {
  label: string;
  value: string;
}

export interface FormField {
  selector: string;
  id?: string;
  name?: string;
  tagName: string;
  type: string; // text, email, tel, number, date, select, radio, checkbox, textarea, file
  label: string;
  placeholder?: string;
  isRequired: boolean;
  currentValue?: any;
  options?: FormOption[];
  ariaLabel?: string;
  sectionTitle?: string;
  isRestricted?: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TargetFormAnalysis {
  url: string;
  title: string;
  isRestricted: boolean;
  restrictionReason?: string;
  fields: FormField[];
  sections: Array<{
    title: string;
    fieldSelectors: string[];
  }>;
  hasCaptcha: boolean;
  hasSubmitButton: boolean;
  submitSelector?: string;
}

export interface FieldMapping {
  sourceKey: string;
  sourceLabel: string;
  sourceValue: any;
  targetSelector: string;
  targetFieldName: string;
  targetType: string;
  confidence: number; // 0.0 to 1.0
  matchReason: string;
  isManualOverride: boolean;
  isConfirmed: boolean;
  suggestedTransform?: string;
  optionsAvailable?: FormOption[];
}

export type AgentName = 
  | 'Document Ingestion Agent'
  | 'DOM Inspector Agent'
  | 'Semantic Mapper Agent'
  | 'Execution & Driver Agent'
  | 'Validation & QA Agent'
  | 'Memory & Learning Engine'
  | 'Excel Parser Agent'
  | 'AOC-4 Mapper Agent'
  | 'MCA Browser Agent';

export interface AgentStep {
  id: string;
  timestamp: string;
  agentName: AgentName;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'warning' | 'failed';
  message: string;
  details?: any;
  screenshot?: string;
}

export interface FieldValidationDiff {
  sourceKey: string;
  sourceLabel: string;
  targetSelector: string;
  targetFieldName: string;
  expectedValue: any;
  actualFilledValue: any;
  isMatch: boolean;
  matchScore: number; // 0 to 100
  status: 'match' | 'warning' | 'mismatch';
  message: string;
  userCorrection?: any;
}

export interface DualValidationResult {
  id: string;
  timestamp: string;
  overallScore: number; // 0 to 100
  passed: boolean;
  totalFieldsChecked: number;
  matchCount: number;
  warningCount: number;
  mismatchCount: number;
  diffs: FieldValidationDiff[];
  screenshot?: string;
  htmlValidityErrors: string[];
  requiresHITL: boolean;
}

export interface HITLDecision {
  status: 'approved' | 'rejected' | 'modified';
  decidedAt: string;
  userNotes?: string;
  overrides?: Record<string, any>;
}

export interface MemoryRule {
  domain: string;
  sourceKey: string;
  targetSelector: string;
  targetName: string;
  frequency: number;
  confidence: number;
  lastUsed: string;
}

export interface TelemetryRecord {
  runId: string;
  timestamp: string;
  domain: string;
  fileName: string;
  durationMs: number;
  totalSourceFields: number;
  mappedFieldsCount: number;
  mappingAccuracy: number;
  validationScore: number;
  hitlIntervention: boolean;
  mode: 'automated' | 'fallback_map';
  discrepanciesResolved: number;
}

// ─── AOC-4 E-Filing Types ───────────────────────────────────────

export interface AOC4CompanyInfo {
  name: string;
  cin: string;
  address: string;
  email: string;
  phone: string;
  state: string;
  pincode: string;
}

export interface AOC4Director {
  name: string;
  din: string;
}

export interface AOC4Auditor {
  name: string;
  firmName: string;
  frn: string;
  membershipNo: string;
  udin: string;
  signingDate: string;
  qualificationStatus?: string;
}

export interface AOC4BalanceSheetData {
  shareCapital: number;
  reservesAndSurplus: number;
  longTermBorrowings: number;
  deferredTaxLiability: number;
  shortTermProvisions: number;
  tradePayables: number;
  otherCurrentLiabilities: number;
  tangibleAssets: number;
  intangibleAssets: number;
  deferredTaxAsset: number;
  nonCurrentInvestments: number;
  tradeReceivables: number;
  cashAndEquivalents: number;
  currentInvestments: number;
  inventories: number;
  otherCurrentAssets: number;
  totalEquityAndLiabilities: number;
  totalAssets: number;
}

export interface AOC4ProfitAndLossData {
  revenueFromOperations: number;
  otherIncome: number;
  totalRevenue: number;
  costOfMaterialsConsumed: number;
  adminExpenses: number;
  employeeExpenses: number;
  depreciation: number;
  totalExpenses: number;
  profitBeforeExceptional: number;
  exceptionalItems: number;
  profitBeforeTax: number;
  deferredTax: number;
  currentTax: number;
  totalTaxExpense: number;
  profitAfterTax: number;
  basicEPS: number;
  dilutedEPS: number;
}

export interface AOC4ShareCapitalData {
  authorizedShares: number;
  authorizedAmount: number;
  issuedShares: number;
  issuedAmount: number;
  paidUpShares: number;
  paidUpAmount: number;
  faceValue: number;
}

export interface AOC4ShareholdingEntry {
  srNo: number;
  name: string;
  classOfShares: string;
  numberOfShares: number;
  percentageHolding: number;
  percentChange: string;
}

export interface AOC4RatioEntry {
  ratioName: string;
  description: string;
  currentYear: number;
  previousYear: number;
}

export interface AOC4FinancialData {
  companyInfo: AOC4CompanyInfo;
  directors: AOC4Director[];
  auditor: AOC4Auditor;
  financialYear: { from: string; to: string };
  balanceSheet: AOC4BalanceSheetData;
  balanceSheetPrevYear: AOC4BalanceSheetData;
  profitAndLoss: AOC4ProfitAndLossData;
  profitAndLossPrevYear: AOC4ProfitAndLossData;
  shareCapital: AOC4ShareCapitalData;
  shareholding: AOC4ShareholdingEntry[];
  ratios: AOC4RatioEntry[];
  tradeReceivablesAging: Record<string, number>;
  rawSheetData: Record<string, any[][]>;
  compliance?: {
    agmHeld: string;
    agmDate: string;
    agmDueDate: string;
    csrApplicable: string;
    subsidiaryApplicable: string;
  };
}

export interface AOC4FormFieldMapping {
  id: string;
  sourceField: string;
  sourceValue: any;
  formSection: string;
  formFieldLabel: string;
  formFieldSelector: string;
  valueTransform?: 'roundTo100' | 'formatINR' | 'dateFormat' | 'none';
  isRequired: boolean;
  isConfirmed: boolean;
  userOverride?: any;
}

export type AOC4SessionStage =
  | 'idle'
  | 'excel_parsed'
  | 'mapping_ready'
  | 'browser_launched'
  | 'login_waiting_captcha'
  | 'login_waiting_otp'
  | 'logged_in'
  | 'navigating_form'
  | 'filling_form'
  | 'fill_complete'
  | 'review_pending'
  | 'aborted'
  | 'error';

export interface AOC4Attachment {
  id: string;
  name: string;
  category: 'balance_sheet' | 'profit_loss' | 'auditor_report' | 'board_report' | 'aoc_1' | 'aoc_2' | 'other';
  isRequired: boolean;
  fileName?: string;
  filePath?: string;
  status: 'ready' | 'pending' | 'uploaded' | 'not_applicable';
  notes?: string;
}

export interface AOC4FilingPreferences {
  agmDate: string;
  auditorReportStatus: 'clean' | 'qualified' | 'adverse' | 'disclaimer';
  csr2Applicable: boolean;
  formVariant: 'standard' | 'xbrl' | 'cfs';
  aoc1Applicable: boolean;
  attachments: AOC4Attachment[];
}

export interface AOC4FilingSession {
  id: string;
  cin?: string;
  companyName?: string;
  stage: AOC4SessionStage;
  startedAt: string;
  financialData?: AOC4FinancialData;
  mappings?: AOC4FormFieldMapping[];
  preferences?: AOC4FilingPreferences;
  sectionsCompleted: string[];
  screenshots: Array<{ section: string; timestamp: string; base64: string }>;
  errors: string[];
  currentMessage: string;
}
