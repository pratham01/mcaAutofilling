import { AOC4FinancialData, AOC4FormFieldMapping } from '../../shared/types.js';
import { AOC4_FIELD_CONFIG, AOC4FieldDef } from '../config/aoc4FieldConfig.js';

/**
 * AOC4MapperAgent — Generates deterministic mappings from parsed Excel
 * financial data to AOC-4 form fields on the MCA V3 portal.
 *
 * Unlike the generic SemanticMapperAgent (which uses fuzzy matching),
 * this mapper uses hard-coded field paths because AOC-4 is a standardized
 * regulatory form with a known structure.
 */
export class AOC4MapperAgent {

  /**
   * Generate field mappings from parsed financial data
   */
  public generateMappings(financialData: AOC4FinancialData): AOC4FormFieldMapping[] {
    const mappings: AOC4FormFieldMapping[] = [];

    for (const fieldDef of AOC4_FIELD_CONFIG) {
      const rawValue = this.resolveFieldPath(financialData, fieldDef.sourceField);
      const transformedValue = this.applyTransform(rawValue, fieldDef.valueTransform);

      mappings.push({
        id: fieldDef.id,
        sourceField: fieldDef.sourceField,
        sourceValue: transformedValue,
        formSection: fieldDef.formSection,
        formFieldLabel: fieldDef.formFieldLabel,
        formFieldSelector: fieldDef.formFieldSelector,
        valueTransform: fieldDef.valueTransform || 'none',
        isRequired: fieldDef.isRequired,
        isConfirmed: rawValue !== undefined && rawValue !== null && rawValue !== 0 && rawValue !== '',
      });
    }

    return mappings;
  }

  /**
   * Apply a user override to a specific mapping
   */
  public applyOverride(
    mappings: AOC4FormFieldMapping[],
    fieldId: string,
    newValue: any
  ): AOC4FormFieldMapping[] {
    return mappings.map(m => {
      if (m.id === fieldId) {
        return {
          ...m,
          sourceValue: newValue,
          userOverride: newValue,
          isConfirmed: true,
        };
      }
      return m;
    });
  }

  /**
   * Confirm all mappings (bulk approve)
   */
  public confirmAll(mappings: AOC4FormFieldMapping[]): AOC4FormFieldMapping[] {
    return mappings.map(m => ({ ...m, isConfirmed: true }));
  }

  /**
   * Get mapping statistics
   */
  public getStats(mappings: AOC4FormFieldMapping[]): {
    total: number;
    confirmed: number;
    unconfirmed: number;
    withValues: number;
    empty: number;
    required: number;
    requiredFilled: number;
    sections: string[];
  } {
    const sections = [...new Set(mappings.map(m => m.formSection))];

    return {
      total: mappings.length,
      confirmed: mappings.filter(m => m.isConfirmed).length,
      unconfirmed: mappings.filter(m => !m.isConfirmed).length,
      withValues: mappings.filter(m => m.sourceValue !== null && m.sourceValue !== undefined && m.sourceValue !== '' && m.sourceValue !== 0).length,
      empty: mappings.filter(m => m.sourceValue === null || m.sourceValue === undefined || m.sourceValue === '' || m.sourceValue === 0).length,
      required: mappings.filter(m => m.isRequired).length,
      requiredFilled: mappings.filter(m => m.isRequired && m.sourceValue !== null && m.sourceValue !== undefined && m.sourceValue !== '').length,
      sections,
    };
  }

  /**
   * Validate mappings and return issues
   */
  public validateMappings(mappings: AOC4FormFieldMapping[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const m of mappings) {
      if (m.isRequired && (m.sourceValue === null || m.sourceValue === undefined || m.sourceValue === '')) {
        errors.push(`Required field "${m.formFieldLabel}" in section "${m.formSection}" has no value`);
      }
    }

    // Check balance sheet tally
    const bsTotal = mappings.find(m => m.id === 'bs_total_assets');
    const bsLiabilities = mappings.find(m => m.id === 'bs_total_equity_liabilities');
    if (bsTotal && bsLiabilities && bsTotal.sourceValue !== bsLiabilities.sourceValue) {
      warnings.push(`Balance Sheet does not tally: Total Assets (${bsTotal.sourceValue}) ≠ Total Equity & Liabilities (${bsLiabilities.sourceValue})`);
    }

    // Check P&L arithmetic
    const revenue = mappings.find(m => m.id === 'pl_total_revenue');
    const expenses = mappings.find(m => m.id === 'pl_total_expenses');
    const pbt = mappings.find(m => m.id === 'pl_profit_before_tax');
    if (revenue && expenses && pbt) {
      const expectedPBT = Number(revenue.sourceValue) - Number(expenses.sourceValue);
      const actualPBT = Number(pbt.sourceValue);
      if (Math.abs(expectedPBT - actualPBT) > 1) {
        warnings.push(`P&L check: Revenue (${revenue.sourceValue}) - Expenses (${expenses.sourceValue}) = ${expectedPBT}, but PBT is ${actualPBT}`);
      }
    }

    // Check unconfirmed fields
    const unconfirmed = mappings.filter(m => !m.isConfirmed && m.isRequired);
    if (unconfirmed.length > 0) {
      warnings.push(`${unconfirmed.length} required field(s) not yet confirmed by user`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  /**
   * Resolve a dot-path (e.g., "balanceSheet.totalAssets") from the financial data object
   */
  private resolveFieldPath(data: any, path: string): any {
    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Apply value transforms before populating the form
   */
  private applyTransform(value: any, transform?: string): any {
    if (value === null || value === undefined) return value;

    switch (transform) {
      case 'formatINR':
        // Keep as number but round to nearest rupee
        return typeof value === 'number' ? Math.round(value) : value;

      case 'roundTo100':
        // Round to nearest 100
        return typeof value === 'number' ? Math.round(value / 100) * 100 : value;

      case 'dateFormat':
        // Ensure DD/MM/YYYY format
        if (typeof value === 'string') {
          // Already in format
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;
          // Convert from YYYY-MM-DD
          const match = value.match(/(\d{4})-(\d{2})-(\d{2})/);
          if (match) return `${match[3]}/${match[2]}/${match[1]}`;
        }
        return value;

      default:
        return value;
    }
  }
}

export const aoc4MapperAgent = new AOC4MapperAgent();
