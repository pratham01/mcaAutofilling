import { chromium, Browser, BrowserContext } from 'playwright';
import { FieldMapping, DualValidationResult, FieldValidationDiff, SourceDocument } from '../../shared/types.js';

export class ValidationAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  public async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
      });
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
    }
  }

  public async validateFilledForm(
    url: string,
    mappings: FieldMapping[],
    sourceDoc: SourceDocument
  ): Promise<DualValidationResult> {
    await this.init();
    if (!this.context) throw new Error('Browser context not initialized');

    const page = await this.context.newPage();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(500);

      const selectors = mappings.map((m) => m.targetSelector);
      const domState: Record<string, { value: any; validityValid: boolean; validationMessage: string }> = await page.evaluate(
        (targetSelectors: string[]) => {
          const res: Record<string, any> = {};
          targetSelectors.forEach((sel) => {
            try {
              const el = document.querySelector(sel) as HTMLInputElement | null;
              if (el) {
                let val: any = el.value;
                if (el.type === 'checkbox' || el.type === 'radio') {
                  val = el.checked;
                }
                res[sel] = {
                  value: val,
                  validityValid: el.checkValidity ? el.checkValidity() : true,
                  validationMessage: el.validationMessage || '',
                };
              }
            } catch (err) {
              res[sel] = {
                value: '',
                validityValid: true,
                validationMessage: '',
              };
            }
          });
          return res;
        },
        selectors
      );

      const diffs: FieldValidationDiff[] = [];
      const htmlValidityErrors: string[] = [];
      let totalMatchScore = 0;
      let matchCount = 0;
      let warningCount = 0;
      let mismatchCount = 0;

      for (const mapping of mappings) {
        if (!mapping.sourceKey) continue;

        const expected = mapping.sourceValue;
        const domEntry = domState[mapping.targetSelector];
        const actual = domEntry ? domEntry.value : undefined;

        if (domEntry && !domEntry.validityValid && domEntry.validationMessage) {
          htmlValidityErrors.push(`${mapping.targetFieldName}: ${domEntry.validationMessage}`);
        }

        const { isMatch, matchScore, status, message } = this.compareValues(expected, actual, mapping.targetType);

        if (status === 'match') matchCount++;
        else if (status === 'warning') warningCount++;
        else mismatchCount++;

        totalMatchScore += matchScore;

        diffs.push({
          sourceKey: mapping.sourceKey,
          sourceLabel: mapping.sourceLabel,
          targetSelector: mapping.targetSelector,
          targetFieldName: mapping.targetFieldName,
          expectedValue: expected,
          actualFilledValue: actual !== undefined ? actual : '(not populated)',
          isMatch,
          matchScore,
          status,
          message,
        });
      }

      const totalChecked = diffs.length;
      const overallScore = totalChecked > 0 ? Math.round(totalMatchScore / totalChecked) : 100;
      const passed = overallScore >= 90 && mismatchCount === 0;

      const screenshotBuffer = await page.screenshot({ fullPage: false });
      const screenshot = `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;

      return {
        id: `val-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        overallScore,
        passed,
        totalFieldsChecked: totalChecked,
        matchCount,
        warningCount,
        mismatchCount,
        diffs,
        screenshot,
        htmlValidityErrors,
        requiresHITL: !passed || warningCount > 0,
      };
    } finally {
      await page.close();
    }
  }

  public validateSimulatedDiff(
    mappings: FieldMapping[],
    filledOverrides?: Record<string, any>
  ): DualValidationResult {
    const diffs: FieldValidationDiff[] = [];
    let totalMatchScore = 0;
    let matchCount = 0;
    let warningCount = 0;
    let mismatchCount = 0;

    for (const mapping of mappings) {
      if (!mapping.sourceKey) continue;

      const expected = mapping.sourceValue;
      const actual = filledOverrides && filledOverrides[mapping.targetSelector] !== undefined
        ? filledOverrides[mapping.targetSelector]
        : expected;

      const { isMatch, matchScore, status, message } = this.compareValues(expected, actual, mapping.targetType);

      if (status === 'match') matchCount++;
      else if (status === 'warning') warningCount++;
      else mismatchCount++;

      totalMatchScore += matchScore;

      diffs.push({
        sourceKey: mapping.sourceKey,
        sourceLabel: mapping.sourceLabel,
        targetSelector: mapping.targetSelector,
        targetFieldName: mapping.targetFieldName,
        expectedValue: expected,
        actualFilledValue: actual,
        isMatch,
        matchScore,
        status,
        message,
      });
    }

    const totalChecked = diffs.length;
    const overallScore = totalChecked > 0 ? Math.round(totalMatchScore / totalChecked) : 100;

    return {
      id: `val-sim-${Date.now()}`,
      timestamp: new Date().toISOString(),
      overallScore,
      passed: overallScore >= 90 && mismatchCount === 0,
      totalFieldsChecked: totalChecked,
      matchCount,
      warningCount,
      mismatchCount,
      diffs,
      htmlValidityErrors: [],
      requiresHITL: overallScore < 100,
    };
  }

  private compareValues(
    expected: any,
    actual: any,
    targetType: string
  ): { isMatch: boolean; matchScore: number; status: 'match' | 'warning' | 'mismatch'; message: string } {
    if (expected === actual) {
      return { isMatch: true, matchScore: 100, status: 'match', message: 'Exact match' };
    }

    if (actual === undefined || actual === null || actual === '' || actual === '(not populated)') {
      return { isMatch: false, matchScore: 0, status: 'mismatch', message: 'Target field is empty in DOM' };
    }

    const expStr = String(Array.isArray(expected) ? expected.join(', ') : expected).trim().toLowerCase();
    const actStr = String(actual).trim().toLowerCase();

    if (expStr === actStr) {
      return { isMatch: true, matchScore: 100, status: 'match', message: 'Exact string match' };
    }

    if (!isNaN(Number(expStr)) && !isNaN(Number(actStr))) {
      if (Number(expStr) === Number(actStr)) {
        return { isMatch: true, matchScore: 100, status: 'match', message: 'Equivalent numerical value' };
      }
    }

    if (typeof expected === 'boolean' || targetType === 'checkbox') {
      const expBool = Boolean(expected);
      const actBool = Boolean(actual === true || actual === 'true' || actual === 'on' || actual === '1');
      if (expBool === actBool) {
        return { isMatch: true, matchScore: 100, status: 'match', message: 'Boolean state match' };
      } else {
        return { isMatch: false, matchScore: 0, status: 'mismatch', message: `Checkbox mismatch (expected: ${expBool}, actual: ${actBool})` };
      }
    }

    if (actStr.includes(expStr) || expStr.includes(actStr)) {
      return {
        isMatch: true,
        matchScore: 85,
        status: 'warning',
        message: 'Partial value match / formatting variation detected',
      };
    }

    return {
      isMatch: false,
      matchScore: 30,
      status: 'mismatch',
      message: `Value discrepancy (expected: "${expStr}", filled: "${actStr}")`,
    };
  }
}

export const validationAgent = new ValidationAgent();
