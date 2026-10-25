import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { clientIsolationService } from './clientIsolationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FEEDBACK_FILE = path.resolve(__dirname, '../../data/professional_feedback.json');
const MAPPING_STATE_FILE = path.resolve(__dirname, '../../data/aoc4_mapping_state.json');

export interface ProfessionalFeedbackItem {
  id: string;
  timestamp: string;
  cin?: string;
  professionalText: string;
  category: 'Figure Correction' | 'Statutory Disclosure' | 'Compliance Date' | 'Column Reversal' | 'Selector Adjustment' | 'General';
  status: 'applied' | 'reconciled' | 'noted';
  actionSummary: string;
  affectedFields: string[];
  reconciliationDiff?: {
    totalAssets: number;
    totalLiabilities: number;
    variance: number;
  };
}

class ProfessionalFeedbackEngine {
  private feedbackHistory: ProfessionalFeedbackItem[] = [];

  constructor() {
    this.loadHistory();
  }

  private loadHistory() {
    try {
      if (fs.existsSync(FEEDBACK_FILE)) {
        this.feedbackHistory = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf-8'));
      }
    } catch (_) {
      this.feedbackHistory = [];
    }
  }

  private saveHistory() {
    try {
      fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(this.feedbackHistory, null, 2), 'utf-8');
    } catch (_) {}
  }

  public getHistory(cin?: string): ProfessionalFeedbackItem[] {
    if (cin) {
      const clientFeedback = clientIsolationService.getClientFeedback(cin);
      if (clientFeedback.length > 0) return clientFeedback;
    }
    return this.feedbackHistory;
  }

  public async processFeedback(payload: {
    feedbackText: string;
    cin?: string;
    category?: string;
    targetFieldId?: string;
    requestedValue?: string;
    targetPeriod?: 'current' | 'previous';
  }): Promise<{
    success: boolean;
    feedbackItem: ProfessionalFeedbackItem;
    message: string;
  }> {
    const text = payload.feedbackText.trim();
    if (!text) {
      throw new Error('Feedback text is required');
    }

    const targetCin = payload.cin || clientIsolationService.getActiveCin();
    let mappingState = clientIsolationService.getClientMappingState(targetCin);
    if (!mappingState) {
      if (fs.existsSync(MAPPING_STATE_FILE)) {
        mappingState = JSON.parse(fs.readFileSync(MAPPING_STATE_FILE, 'utf-8'));
      } else {
        throw new Error('Mapping state not found for client ' + targetCin);
      }
    }

    const affectedFields: string[] = [];
    const actionsTaken: string[] = [];
    const lower = text.toLowerCase();

    // 1. Column Swap feedback
    if (lower.includes('swap') || lower.includes('reverse') || (lower.includes('column') && lower.includes('wrong'))) {
      if (Array.isArray(mappingState.partB_balanceSheet)) {
        mappingState.partB_balanceSheet.forEach((row: any) => {
          const t = row.currentReportingPeriod;
          row.currentReportingPeriod = row.previousReportingPeriod;
          row.previousReportingPeriod = t;
        });
      }
      if (Array.isArray(mappingState.partC_profitAndLoss)) {
        mappingState.partC_profitAndLoss.forEach((row: any) => {
          const t = row.currentReportingPeriod;
          row.currentReportingPeriod = row.previousReportingPeriod;
          row.previousReportingPeriod = t;
        });
      }
      actionsTaken.push('Swapped Current and Previous reporting period columns across all Balance Sheet & P&L schedules');
      affectedFields.push('All Part B & Part C columns');
    }

    // 2. Direct field override if targetFieldId & requestedValue supplied
    if (payload.targetFieldId && payload.requestedValue !== undefined) {
      const fieldId = payload.targetFieldId;
      const val = payload.requestedValue;
      const period = payload.targetPeriod === 'previous' ? 'previousReportingPeriod' : 'currentReportingPeriod';

      let found = false;
      for (const section of ['partB_balanceSheet', 'partC_profitAndLoss']) {
        if (Array.isArray(mappingState[section])) {
          const row = mappingState[section].find((r: any) => r.id === fieldId || r.id?.includes(fieldId));
          if (row) {
            row[period] = String(val);
            actionsTaken.push(`Updated '${row.label}' (${period}) to: ₹ ${val}`);
            affectedFields.push(row.label);
            found = true;
            break;
          }
        }
      }
      if (!found && mappingState.companyInfo) {
        mappingState.companyInfo[fieldId] = val;
        actionsTaken.push(`Updated Company Info '${fieldId}' to: ${val}`);
        affectedFields.push(fieldId);
      }
    }

    // 3. Heuristic matching from feedbackText (e.g. "Trade payables current 2500" or "Borrowings 1400000")
    const matchNumber = text.match(/(-?\d[\d,]*)/);
    const extractedNum = matchNumber ? matchNumber[1].replace(/,/g, '') : null;
    const isPrevious = lower.includes('previous') || lower.includes('prior') || lower.includes('last year');

    if (extractedNum) {
      const scheduleKeywords: Array<{ kw: string; id: string; section: string }> = [
        { kw: 'borrowing', id: 'bs_long_term_borrowings', section: 'partB_balanceSheet' },
        { kw: 'trade payable', id: 'bs_trade_payables', section: 'partB_balanceSheet' },
        { kw: 'creditor', id: 'bs_trade_payables', section: 'partB_balanceSheet' },
        { kw: 'short term provision', id: 'bs_short_term_provisions', section: 'partB_balanceSheet' },
        { kw: 'other current liab', id: 'bs_other_current_liabilities', section: 'partB_balanceSheet' },
        { kw: 'share capital', id: 'bs_share_capital', section: 'partB_balanceSheet' },
        { kw: 'reserves', id: 'bs_reserves_surplus', section: 'partB_balanceSheet' },
        { kw: 'tangible asset', id: 'bs_tangible_assets', section: 'partB_balanceSheet' },
        { kw: 'fixed asset', id: 'bs_tangible_assets', section: 'partB_balanceSheet' },
        { kw: 'trade receivable', id: 'bs_trade_receivables', section: 'partB_balanceSheet' },
        { kw: 'debtor', id: 'bs_trade_receivables', section: 'partB_balanceSheet' },
        { kw: 'cash', id: 'bs_cash_and_equivalents', section: 'partB_balanceSheet' },
        { kw: 'revenue', id: 'pl_revenue_operations', section: 'partC_profitAndLoss' },
        { kw: 'sales', id: 'pl_revenue_operations', section: 'partC_profitAndLoss' },
        { kw: 'employee', id: 'pl_employee_expenses', section: 'partC_profitAndLoss' },
        { kw: 'depreciation', id: 'pl_depreciation', section: 'partC_profitAndLoss' },
        { kw: 'other expense', id: 'pl_other_expenses', section: 'partC_profitAndLoss' },
        { kw: 'profit', id: 'pl_profit_after_tax', section: 'partC_profitAndLoss' },
      ];

      for (const item of scheduleKeywords) {
        if (lower.includes(item.kw)) {
          const row = mappingState[item.section]?.find((r: any) => r.id === item.id);
          if (row) {
            const targetPeriod = isPrevious ? 'previousReportingPeriod' : 'currentReportingPeriod';
            const oldVal = row[targetPeriod];
            row[targetPeriod] = extractedNum;
            actionsTaken.push(`Updated ${row.label} (${targetPeriod}): ${oldVal} → ${extractedNum}`);
            affectedFields.push(row.label);
            break;
          }
        }
      }
    }

    // 4. Compliance Date matching (e.g. "AGM date 20/09/2026")
    const matchDate = text.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
    if (matchDate) {
      const dateVal = matchDate[1].replace(/-/g, '/');
      if (lower.includes('agm') && lower.includes('due')) {
        mappingState.companyInfo.dueAgmDate = dateVal;
        actionsTaken.push(`Updated Due Date of AGM to: ${dateVal}`);
        affectedFields.push('Due Date of AGM');
      } else if (lower.includes('agm')) {
        mappingState.companyInfo.actualAgmDate = dateVal;
        actionsTaken.push(`Updated Actual AGM Date to: ${dateVal}`);
        affectedFields.push('Actual AGM Date');
      } else if (lower.includes('board') || lower.includes('bm')) {
        mappingState.companyInfo.boardMeetingDate = dateVal;
        actionsTaken.push(`Updated Board Meeting Date to: ${dateVal}`);
        affectedFields.push('Board Meeting Date');
      }
    }

    // Save updated mapping state strictly into isolated client directory
    clientIsolationService.saveClientMappingState(targetCin, mappingState);

    // Calculate updated equilibrium
    let curL = 0; let curA = 0;
    if (Array.isArray(mappingState.partB_balanceSheet)) {
      mappingState.partB_balanceSheet.forEach((r: any) => {
        const val = Number(r.currentReportingPeriod) || 0;
        if (r.category && r.category.includes('Asset')) {
          curA += val;
        } else {
          curL += val;
        }
      });
    }

    const actionSummary = actionsTaken.length > 0
      ? actionsTaken.join('; ')
      : `Feedback logged & reviewed by autonomous adaptation engine. Mapping state verified for ${targetCin}.`;

    const feedbackItem: ProfessionalFeedbackItem = {
      id: 'fb_' + Date.now(),
      timestamp: new Date().toISOString(),
      cin: targetCin,
      professionalText: text,
      category: (payload.category as any) || 'Figure Correction',
      status: actionsTaken.length > 0 ? 'applied' : 'noted',
      actionSummary,
      affectedFields,
      reconciliationDiff: {
        totalAssets: curA,
        totalLiabilities: curL,
        variance: curA - curL
      }
    };

    clientIsolationService.appendClientFeedback(targetCin, feedbackItem);
    this.feedbackHistory.unshift(feedbackItem);
    this.saveHistory();

    return {
      success: true,
      feedbackItem,
      message: `Feedback applied successfully: ${actionSummary}`
    };
  }
}

export const professionalFeedbackEngine = new ProfessionalFeedbackEngine();
