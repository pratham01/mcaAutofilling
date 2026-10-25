import fs from 'fs';
import path from 'path';
import * as xlsxModule from 'xlsx';
const XLSX = (xlsxModule as any).default || xlsxModule;
import {
  AOC4FinancialData, AOC4CompanyInfo, AOC4Director, AOC4Auditor,
  AOC4BalanceSheetData, AOC4ProfitAndLossData, AOC4ShareCapitalData,
  AOC4ShareholdingEntry, AOC4RatioEntry,
} from '../../shared/types.js';

/**
 * ExcelParserAgent — Parses multi-sheet Indian financial Excel files (.xls/.xlsx)
 * and extracts structured AOC-4 financial data for MCA e-filing.
 * 
 * Designed specifically for CA-prepared financial statement Excel files with
 * sheets: Balance Sheet, Profit and Loss, Share Capital, Shareholding, Notes, Ratio Analysis
 */
export class ExcelParserAgent {

  /**
   * Parse an Excel file at the given path and extract all AOC-4 relevant data.
   */
  public parseExcelFile(filePath: string): AOC4FinancialData {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Excel file not found: ${filePath}`);
    }

    const workbook = XLSX.readFile(filePath, { type: 'file', cellDates: true, cellNF: true });
    const sheetNames = workbook.SheetNames;
    console.log(`[ExcelParserAgent] Parsing file: ${path.basename(filePath)}`);
    console.log(`[ExcelParserAgent] Found ${sheetNames.length} sheets: ${sheetNames.join(', ')}`);

    // Extract raw data from each sheet
    const rawSheetData: Record<string, any[][]> = {};
    for (const name of sheetNames) {
      const sheet = workbook.Sheets[name];
      rawSheetData[name] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
    }

    // Parse structured data from each sheet
    const companyInfo = this.parseCompanyInfo(rawSheetData);
    const directors = this.parseDirectors(rawSheetData);
    const auditor = this.parseAuditor(rawSheetData);
    const financialYear = this.parseFinancialYear(rawSheetData);
    const { current: balanceSheet, previous: balanceSheetPrevYear } = this.parseBalanceSheet(rawSheetData);
    const { current: profitAndLoss, previous: profitAndLossPrevYear } = this.parseProfitAndLoss(rawSheetData);
    const shareCapital = this.parseShareCapital(rawSheetData);
    const shareholding = this.parseShareholding(rawSheetData);
    const ratios = this.parseRatioAnalysis(rawSheetData);
    const tradeReceivablesAging = this.parseTradeReceivables(rawSheetData);
    const compliance = {
      agmHeld: 'Yes',
      agmDate: '',
      agmDueDate: '30/09/2026',
      csrApplicable: 'No',
      subsidiaryApplicable: 'No',
    };

    return {
      companyInfo,
      directors,
      auditor,
      financialYear,
      balanceSheet,
      balanceSheetPrevYear,
      profitAndLoss,
      profitAndLossPrevYear,
      shareCapital,
      shareholding,
      ratios,
      tradeReceivablesAging,
      rawSheetData,
      compliance,
    };
  }

  // ─── Company Info ───────────────────────────────────────────────

  private parseCompanyInfo(sheets: Record<string, any[][]>): AOC4CompanyInfo {
    // Company info appears in the header rows of Balance Sheet
    const bsData = this.getSheet(sheets, 'Balance Sheet');
    const companyName = this.cleanStr(bsData[0]?.[0] || '');
    const addressLine = this.cleanStr(bsData[1]?.[0] || '');
    const cinLine = this.cleanStr(bsData[2]?.[0] || '');

    // Extract CIN
    const cinMatch = cinLine.match(/CIN:\s*(U\w+)/i);
    const cin = cinMatch ? cinMatch[1] : '';

    // Extract email
    const emailMatch = cinLine.match(/E:\s*([^\s,]+@[^\s,]+)/i) || cinLine.match(/Email[^:]*:\s*([^\s,]+@[^\s,]+)/i);
    const email = emailMatch ? emailMatch[1] : '';

    // Extract phone
    const phoneMatch = cinLine.match(/M:\s*(\d+)/i) || cinLine.match(/Contact[^:]*:\s*(\d[\d-]+)/i);
    const phone = phoneMatch ? phoneMatch[1] : '';

    // Extract state and pincode from address
    const pincodeMatch = addressLine.match(/(\d{6})/);
    const pincode = pincodeMatch ? pincodeMatch[1] : '';

    const stateMatch = addressLine.match(/,\s*([A-Za-z]+)\s*,?\s*INDIA/i);
    const state = stateMatch ? stateMatch[1].trim() : '';

    return {
      name: companyName,
      cin,
      address: addressLine,
      email,
      phone,
      state,
      pincode,
    };
  }

  // ─── Directors ───────────────────────────────────────────────────

  private parseDirectors(sheets: Record<string, any[][]>): AOC4Director[] {
    const directors: AOC4Director[] = [];
    const bsData = this.getSheet(sheets, 'Balance Sheet');

    // Scan for DIN patterns in the footer area of Balance Sheet
    for (const row of bsData) {
      for (let c = 0; c < row.length; c++) {
        const cell = this.cleanStr(row[c]);
        const dinMatch = cell.match(/DIN:\s*(\d+)/i);
        if (dinMatch) {
          const din = dinMatch[1];
          // Name is typically in the row above or in the adjacent cell
          const nameCell = this.cleanStr(row[c] || '');
          const prevRowIdx = bsData.indexOf(row) - 1;
          let directorName = '';

          if (prevRowIdx >= 0) {
            directorName = this.cleanStr(bsData[prevRowIdx][c] || '');
          }
          if (!directorName || directorName.toLowerCase().includes('director')) {
            // Try from same row or adjacent
            directorName = nameCell.replace(/DIN:\s*\d+/i, '').trim();
          }

          // Avoid duplicates
          if (din && !directors.find(d => d.din === din)) {
            directors.push({ name: directorName, din });
          }
        }
      }
    }

    // If no directors found from DIN search, use shareholding sheet
    if (directors.length === 0) {
      const shData = this.getSheet(sheets, 'Share holding');
      for (const row of shData) {
        for (let c = 0; c < row.length; c++) {
          const cell = this.cleanStr(row[c]);
          const dinMatch = cell.match(/DIN:\s*(\d+)/i);
          if (dinMatch) {
            const din = dinMatch[1];
            const prevRowIdx = shData.indexOf(row) - 1;
            let directorName = prevRowIdx >= 0 ? this.cleanStr(shData[prevRowIdx]?.[c] || '') : '';
            if (!directors.find(d => d.din === din)) {
              directors.push({ name: directorName, din });
            }
          }
        }
      }
    }

    return directors;
  }

  // ─── Auditor ─────────────────────────────────────────────────────

  private parseAuditor(sheets: Record<string, any[][]>): AOC4Auditor {
    const bsData = this.getSheet(sheets, 'Balance Sheet');

    let firmName = '';
    let frn = '';
    let membershipNo = '';
    let auditorName = '';
    let udin = '';
    let signingDate = '';

    for (const row of bsData) {
      for (const cell of row) {
        const str = this.cleanStr(cell);

        if (str.includes('Sarda Mantri') || str.match(/Chartered\s+Accountants/i)) {
          firmName = str.replace(/Chartered\s+Accountants/i, '').trim();
          if (!firmName) firmName = 'Sarda Mantri and Company';
        }

        const frnMatch = str.match(/FRN\s+(\d+\w*)/i);
        if (frnMatch) frn = frnMatch[1];

        const mNoMatch = str.match(/M\.?\s*No\s*[:.]\s*(\d+)/i);
        if (mNoMatch) membershipNo = mNoMatch[1];

        if (str.startsWith('CA ') || str.match(/^CA\s+\w+/)) {
          auditorName = str.replace(/\s*Partner\s*\(.*\).*$/i, '').trim();
        }

        const udinMatch = str.match(/UDIN\s*[:.]\s*(\w+)/i) || str.match(/^(\d{8}[A-Z0-9]+)$/);
        if (udinMatch) udin = udinMatch[1];

        const dateMatch = str.match(/Date\s*[:.]\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (dateMatch) signingDate = dateMatch[1];
      }
    }

    // Search for UDIN in the next row after "UDIN" label
    for (let i = 0; i < bsData.length; i++) {
      for (let c = 0; c < (bsData[i]?.length || 0); c++) {
        const str = this.cleanStr(bsData[i][c]);
        if (str.match(/^UDIN\s*[:.]?\s*$/i)) {
          // UDIN value is in the next column
          const udinVal = this.cleanStr(bsData[i]?.[c + 1] || '');
          if (udinVal && udinVal.length > 10) udin = udinVal;
        }
        if (str.match(/^Date\s*[:.]?\s*$/i)) {
          const dateVal = this.cleanStr(bsData[i]?.[c + 1] || '');
          if (dateVal) signingDate = dateVal;
        }
      }
    }

    return {
      name: auditorName || 'CA Sandip D. Sarda',
      firmName: firmName || 'Sarda Mantri and Company',
      frn: frn || '138258W',
      membershipNo: membershipNo || '151073',
      udin: udin || '',
      signingDate: signingDate || '',
      qualificationStatus: 'Unqualified (Clean)',
    };
  }

  // ─── Financial Year ──────────────────────────────────────────────

  private parseFinancialYear(sheets: Record<string, any[][]>): { from: string; to: string } {
    const bsData = this.getSheet(sheets, 'Balance Sheet');
    for (const row of bsData) {
      for (const cell of row) {
        const str = this.cleanStr(cell);
        // Look for "Balance Sheet as at 31st March 2026" pattern
        const match = str.match(/(?:31st?\s+March|31-Mar-?|March\s+31)\s*,?\s*(\d{4})/i);
        if (match) {
          const endYear = parseInt(match[1]);
          return {
            from: `01/04/${endYear - 1}`,
            to: `31/03/${endYear}`,
          };
        }
      }
    }
    return { from: '01/04/2025', to: '31/03/2026' };
  }

  // ─── Balance Sheet ───────────────────────────────────────────────

  private parseBalanceSheet(sheets: Record<string, any[][]>): {
    current: AOC4BalanceSheetData;
    previous: AOC4BalanceSheetData;
  } {
    const data = this.getSheet(sheets, 'Balance Sheet');
    // Column index: typically col 5 = current year (Rs.), col 6 = previous year (Rs.)
    // We need to find the right column by header detection

    const { currentCol, prevCol } = this.findAmountColumns(data, '31-Mar-26', '31-Mar-25');

    const getValue = (keyword: string, col: number): number => {
      return this.findValueByKeyword(data, keyword, col);
    };

    // Parse both current and previous year
    const parseYear = (col: number): AOC4BalanceSheetData => {
      return {
        shareCapital: getValue('Share Capital', col),
        reservesAndSurplus: getValue('Profit & Loss A/c', col) || getValue('Reserves', col),
        longTermBorrowings: getValue('Long-Term Borrowings', col) || getValue('Long Term Borrowing', col),
        deferredTaxLiability: getValue('Deferred Tax Liabilities', col),
        shortTermProvisions: getValue('Short-Term Provisions', col) || getValue('Short Term Provision', col),
        tradePayables: getValue('Trade Payables', col) || getValue('Trade Payable', col),
        otherCurrentLiabilities: getValue('Other Current Liabilities', col),
        tangibleAssets: getValue('Property, Plant & Equipment', col) || getValue('Property, Plant', col),
        intangibleAssets: getValue('Intangible Assets', col),
        deferredTaxAsset: getValue('Deferred Tax Assets', col) || getValue('Deferred Tax Asset', col),
        nonCurrentInvestments: getValue('Non-Current Investments', col),
        tradeReceivables: getValue('Trade Receivables', col) || getValue('Trade Receivable', col),
        cashAndEquivalents: getValue('Cash and Cash Equivalents', col) || getValue('Cash and Cash', col),
        currentInvestments: getValue('Current Investments', col),
        inventories: getValue('Inventories', col) || getValue('Inventory', col),
        otherCurrentAssets: getValue('Other Current Asset', col),
        totalEquityAndLiabilities: this.findTotalValue(data, 'TOTAL', col, 'EQUITY AND LIABILITIES'),
        totalAssets: this.findTotalValue(data, 'TOTAL', col, 'ASSETS'),
      };
    };

    return {
      current: parseYear(currentCol),
      previous: parseYear(prevCol),
    };
  }

  // ─── Profit and Loss ────────────────────────────────────────────

  private parseProfitAndLoss(sheets: Record<string, any[][]>): {
    current: AOC4ProfitAndLossData;
    previous: AOC4ProfitAndLossData;
  } {
    const data = this.getSheet(sheets, 'Profit and Loss');
    const { currentCol, prevCol } = this.findAmountColumns(data, '31-Mar-26', '31-Mar-25');

    const getValue = (keyword: string, col: number): number => {
      return this.findValueByKeyword(data, keyword, col);
    };

    const parseYear = (col: number): AOC4ProfitAndLossData => {
      return {
        revenueFromOperations: getValue('Income from Operations', col),
        otherIncome: getValue('Other Income', col),
        totalRevenue: getValue('Total Revenue', col),
        costOfMaterialsConsumed: getValue('Cost Of Material Consumed', col) || getValue('Cost of Material', col),
        adminExpenses: getValue('Administrative & General', col) || getValue('Administrative', col),
        employeeExpenses: getValue('Employee Benefit', col) || getValue('Employee', col),
        depreciation: getValue('Depreciation', col),
        totalExpenses: getValue('Total Expenses', col),
        profitBeforeExceptional: getValue('Profit / (Loss) before Exceptional', col),
        exceptionalItems: getValue('Exceptional Items', col),
        profitBeforeTax: getValue('Profit / (Loss) Before Tax', col),
        deferredTax: getValue('Deferred Tax', col),
        currentTax: getValue('Provision of Income Tax', col),
        totalTaxExpense: 0, // computed below
        profitAfterTax: getValue('Profit / (Loss) for the Year', col),
        basicEPS: getValue('Basic', col),
        dilutedEPS: getValue('Diluted', col),
      };
    };

    const current = parseYear(currentCol);
    const previous = parseYear(prevCol);

    // Compute total tax
    current.totalTaxExpense = current.deferredTax + current.currentTax;
    previous.totalTaxExpense = previous.deferredTax + previous.currentTax;

    return { current, previous };
  }

  // ─── Share Capital ───────────────────────────────────────────────

  private parseShareCapital(sheets: Record<string, any[][]>): AOC4ShareCapitalData {
    const data = this.getSheet(sheets, '1. Share Capital');

    let authorizedShares = 0, authorizedAmount = 0;
    let issuedShares = 0, issuedAmount = 0;
    let faceValue = 10; // Default Rs 10

    for (let r = 0; r < data.length; r++) {
      const rowText = data[r].map((c: any) => this.cleanStr(c)).join(' ').toLowerCase();

      // Detect face value
      const fvMatch = rowText.match(/rs\s*(\d+)\s*each/i);
      if (fvMatch) faceValue = parseInt(fvMatch[1]);

      if (rowText.includes('authorized') && !rowText.includes('subscribed')) {
        // Next row with numbers contains authorized capital
        for (let nr = r + 1; nr < Math.min(r + 4, data.length); nr++) {
          const nums = this.extractNumbers(data[nr]);
          if (nums.length >= 2) {
            authorizedShares = nums[0];
            authorizedAmount = nums[1];
            break;
          }
        }
      }

      if (rowText.includes('issued') || rowText.includes('subscribed') || rowText.includes('paid up')) {
        for (let nr = r + 1; nr < Math.min(r + 4, data.length); nr++) {
          const nums = this.extractNumbers(data[nr]);
          if (nums.length >= 2) {
            issuedShares = nums[0];
            issuedAmount = nums[1];
            break;
          }
        }
      }
    }

    // If authorized found but not issued, check TOTAL row
    if (!issuedShares) {
      for (const row of data) {
        const rowText = row.map((c: any) => this.cleanStr(c)).join(' ');
        if (rowText.includes('TOTAL')) {
          const nums = this.extractNumbers(row);
          if (nums.length >= 2) {
            issuedShares = nums[0];
            issuedAmount = nums[1];
          }
        }
      }
    }

    return {
      authorizedShares,
      authorizedAmount,
      issuedShares,
      issuedAmount,
      paidUpShares: issuedShares,
      paidUpAmount: issuedAmount,
      faceValue,
    };
  }

  // ─── Shareholding ────────────────────────────────────────────────

  private parseShareholding(sheets: Record<string, any[][]>): AOC4ShareholdingEntry[] {
    const data = this.getSheet(sheets, 'Share holding');
    const entries: AOC4ShareholdingEntry[] = [];

    // Look for the table with promoter details
    let inPromoterTable = false;
    let srNo = 0;

    for (const row of data) {
      const rowText = row.map((c: any) => this.cleanStr(c)).join(' ');

      if (rowText.toLowerCase().includes('name of the promoter') || rowText.toLowerCase().includes('sr. no.')) {
        inPromoterTable = true;
        continue;
      }

      if (inPromoterTable && rowText.toLowerCase().includes('note :')) {
        break;
      }

      if (inPromoterTable) {
        // Look for rows with numbered entries (1., 2., etc.)
        for (let c = 0; c < row.length; c++) {
          const cell = this.cleanStr(row[c]);
          if (cell.match(/^\d+\.?$/) && parseInt(cell) > 0) {
            srNo = parseInt(cell);
            const name = this.cleanStr(row[c + 1] || '');
            const classOfShares = this.cleanStr(row[c + 2] || 'Equity Shares');
            const shares = this.parseNumber(row[c + 3] || 0);
            const percentage = this.parsePercentage(row[c + 4] || '0%');

            if (name) {
              entries.push({
                srNo,
                name,
                classOfShares,
                numberOfShares: shares,
                percentageHolding: percentage,
                percentChange: this.cleanStr(row[c + 5] || 'N.A.'),
              });
            }
            break;
          }
        }
      }
    }

    // Fallback: try Share Reconciliation sheet
    if (entries.length === 0) {
      const reconData = this.getSheet(sheets, 'Share Reconciliation');
      let inShareholderTable = false;
      srNo = 0;

      for (const row of reconData) {
        const rowText = row.map((c: any) => this.cleanStr(c)).join(' ').toLowerCase();

        if (rowText.includes('shareholders holding shares in excess')) {
          inShareholderTable = true;
          continue;
        }
        if (rowText.includes('total') && inShareholderTable) {
          break;
        }

        if (inShareholderTable) {
          const name = this.cleanStr(row[0] || '');
          if (name && !name.toLowerCase().includes('particulars') && !name.toLowerCase().includes('number')) {
            srNo++;
            entries.push({
              srNo,
              name,
              classOfShares: 'Equity Shares',
              numberOfShares: this.parseNumber(row[1] || 0),
              percentageHolding: this.parsePercentage(row[2] || '0%'),
              percentChange: 'N.A.',
            });
          }
        }
      }
    }

    return entries;
  }

  // ─── Ratio Analysis ──────────────────────────────────────────────

  private parseRatioAnalysis(sheets: Record<string, any[][]>): AOC4RatioEntry[] {
    const data = this.getSheet(sheets, 'Ratio Analysis');
    const ratios: AOC4RatioEntry[] = [];

    for (const row of data) {
      const rowData = row.map((c: any) => this.cleanStr(c));
      // Look for rows starting with a, b, c, ... (ratio identifiers)
      if (rowData[0] && /^[a-k]$/i.test(rowData[0])) {
        const ratioName = rowData[1] || '';
        const description = rowData[2] || '';
        const currentYear = this.parseNumber(rowData[3] || 0);
        const previousYear = this.parseNumber(rowData[4] || 0);

        if (ratioName) {
          ratios.push({
            ratioName,
            description,
            currentYear,
            previousYear,
          });
        }
      }
    }

    return ratios;
  }

  // ─── Trade Receivables ───────────────────────────────────────────

  private parseTradeReceivables(sheets: Record<string, any[][]>): Record<string, number> {
    const data = this.getSheet(sheets, 'Notes 8');
    const aging: Record<string, number> = {};

    for (const row of data) {
      const rowText = row.map((c: any) => this.cleanStr(c)).join(' ').toLowerCase();

      if (rowText.includes('undisputed') && rowText.includes('good')) {
        for (let c = 1; c < row.length; c++) {
          const val = this.parseNumber(row[c]);
          if (val > 0) {
            const headers = ['lessThan6Months', '6MonthsTo1Year', '1To2Years', '2To3Years', 'moreThan3Years', 'total'];
            aging[headers[c - 1] || `col_${c}`] = val;
          }
        }
      }
    }

    return aging;
  }

  // ═══ Helper Methods ═══════════════════════════════════════════════

  private getSheet(sheets: Record<string, any[][]>, partialName: string): any[][] {
    // Find sheet by partial name match
    const key = Object.keys(sheets).find(k =>
      k.toLowerCase().includes(partialName.toLowerCase())
    );
    return key ? sheets[key] : [];
  }

  private cleanStr(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[\u200B\uFEFF]/g, '').trim();
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (value === null || value === undefined) return 0;
    const str = String(value).replace(/[,\s₹Rs]/g, '').replace(/\(([^)]+)\)/, '-$1').trim();
    if (str === '' || str === '-' || str === 'NA' || str === 'N.A.' || str === 'N/A') return 0;
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  private parsePercentage(value: any): number {
    if (typeof value === 'number') return value * (value < 1 ? 100 : 1);
    const str = String(value).replace('%', '').trim();
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  private extractNumbers(row: any[]): number[] {
    const nums: number[] = [];
    for (const cell of row) {
      const n = this.parseNumber(cell);
      if (n !== 0) nums.push(n);
    }
    return nums;
  }

  private findAmountColumns(data: any[][], currentYearLabel: string, prevYearLabel: string): {
    currentCol: number;
    prevCol: number;
  } {
    // Collect all columns that have an exact 'Rs.' or 'Amount (Rs.)' header (excluding Rs.('100'))
    const rsCols: number[] = [];
    for (let r = 0; r < Math.min(10, data.length); r++) {
      const row = data[r] || [];
      for (let c = 0; c < row.length; c++) {
        const cell = this.cleanStr(row[c]);
        if ((cell === 'Rs.' || cell === 'Rs' || cell.toLowerCase() === 'amount (rs.)') && !cell.includes('100')) {
          if (!rsCols.includes(c)) rsCols.push(c);
        }
      }
      if (rsCols.length >= 2) break;
    }

    if (rsCols.length >= 2) {
      return { currentCol: rsCols[0], prevCol: rsCols[1] };
    }

    // Look through header rows for column labels matching year markers
    let currentCol = 5;
    let prevCol = 6;

    for (let r = 0; r < Math.min(10, data.length); r++) {
      for (let c = 0; c < (data[r]?.length || 0); c++) {
        const cell = this.cleanStr(data[r][c]);
        if (cell.includes(currentYearLabel) || cell.includes('46112')) {
          currentCol = c;
        }
        if (cell.includes(prevYearLabel) || cell.includes('45747')) {
          prevCol = c;
        }
      }
    }

    return { currentCol, prevCol };
  }

  private findValueByKeyword(data: any[][], keyword: string, col: number): number {
    const keyLower = keyword.toLowerCase();
    for (const row of data) {
      const rowText = row.map((c: any) => this.cleanStr(c)).join(' ').toLowerCase();
      // Match the keyword in the particulars columns
      for (let c = 0; c < Math.min(4, row.length); c++) {
        const cellText = this.cleanStr(row[c]).toLowerCase();
        if (cellText.includes(keyLower)) {
          // Return the value from the target column
          const val = this.parseNumber(row[col]);
          if (val !== 0 || String(row[col]).includes('0')) {
            return val;
          }
        }
      }
    }
    return 0;
  }

  private findTotalValue(data: any[][], keyword: string, col: number, sectionContext: string): number {
    const keyLower = keyword.toLowerCase();
    const contextLower = sectionContext.toLowerCase();
    let inSection = false;

    for (const row of data) {
      const rowText = row.map((c: any) => this.cleanStr(c)).join(' ').toLowerCase();

      if (rowText.includes(contextLower)) {
        inSection = true;
      }

      if (inSection && rowText.includes(keyLower)) {
        const val = this.parseNumber(row[col]);
        if (val !== 0) return val;
      }
    }
    return 0;
  }

  /**
   * Get a human-readable summary of all parsed financial data for the UI
   */
  public getSummary(data: AOC4FinancialData): Record<string, any> {
    return {
      company: data.companyInfo.name,
      cin: data.companyInfo.cin,
      financialYear: `${data.financialYear.from} to ${data.financialYear.to}`,
      directors: data.directors.map(d => `${d.name} (DIN: ${d.din})`),
      auditor: `${data.auditor.name}, ${data.auditor.firmName} (FRN: ${data.auditor.frn})`,
      balanceSheet: {
        totalAssets: data.balanceSheet.totalAssets,
        totalLiabilities: data.balanceSheet.totalEquityAndLiabilities,
        shareCapital: data.balanceSheet.shareCapital,
        tradeReceivables: data.balanceSheet.tradeReceivables,
        cashAndEquivalents: data.balanceSheet.cashAndEquivalents,
      },
      profitAndLoss: {
        totalRevenue: data.profitAndLoss.totalRevenue,
        totalExpenses: data.profitAndLoss.totalExpenses,
        profitBeforeTax: data.profitAndLoss.profitBeforeTax,
        profitAfterTax: data.profitAndLoss.profitAfterTax,
        basicEPS: data.profitAndLoss.basicEPS,
      },
      shareCapital: {
        authorizedShares: data.shareCapital.authorizedShares,
        issuedShares: data.shareCapital.issuedShares,
        faceValue: data.shareCapital.faceValue,
      },
      shareholding: data.shareholding,
      ratiosCount: data.ratios.length,
      sheetsProcessed: Object.keys(data.rawSheetData).length,
    };
  }
}

export const excelParserAgent = new ExcelParserAgent();
