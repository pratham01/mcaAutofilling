import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { FieldMapping, AgentStep, DualValidationResult, FieldValidationDiff, SourceDocument } from '../../shared/types.js';

export class ExecutionAgent {
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
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      });
    }
  }

  public async executeAutomatedFillAndValidate(
    url: string,
    mappings: FieldMapping[],
    sourceDoc: SourceDocument,
    onStepUpdate?: (step: AgentStep) => void
  ): Promise<{
    execution: { success: boolean; filledCount: number; errors: string[] };
    validation: DualValidationResult;
  }> {
    await this.init();
    if (!this.context) throw new Error('Browser context not initialized');

    const page = await this.context.newPage();
    const errors: string[] = [];
    let filledCount = 0;

    try {
      this.emitStep(onStepUpdate, 'Execution & Driver Agent', 'Navigating to Target', 'running', `Opening ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(600);

      this.emitStep(onStepUpdate, 'Execution & Driver Agent', 'Target Form Ready', 'completed', `DOM ready, injecting ${mappings.length} fields`);

      // Inject values into DOM
      for (let i = 0; i < mappings.length; i++) {
        const mapping = mappings[i];
        if (!mapping.sourceKey || mapping.sourceValue === undefined || mapping.sourceValue === '') {
          continue;
        }

        const selector = mapping.targetSelector;
        const value = mapping.sourceValue;

        try {
          const el = await page.$(selector);
          if (!el) {
            continue;
          }

          const tagName = await page.$eval(selector, (e) => e.tagName.toLowerCase()).catch(() => 'input');
          const inputType = await page.$eval(selector, (e) => (e as HTMLInputElement).type || '').catch(() => '');

          if (tagName === 'select') {
            await page.selectOption(selector, { label: String(value) }).catch(async () => {
              await page.selectOption(selector, { value: String(value) }).catch(() => {});
            });
          } else if (inputType === 'checkbox') {
            const isChecked = Boolean(value === true || String(value).toLowerCase() === 'true' || String(value) === '1');
            await page.setChecked(selector, isChecked).catch(() => {});
          } else if (inputType === 'radio') {
            await page.click(selector).catch(() => {});
          } else {
            const textToFill = Array.isArray(value) ? value.join(', ') : String(value);
            await page.fill(selector, textToFill).catch(() => {});
          }

          // Trigger simulated input/change events
          await page.evaluate(`
            try {
              const node = document.querySelector(${JSON.stringify(selector)});
              if (node) {
                node.dispatchEvent(new Event('input', { bubbles: true }));
                node.dispatchEvent(new Event('change', { bubbles: true }));
                node.dispatchEvent(new Event('blur', { bubbles: true }));
              }
            } catch(e) {}
          `);

          filledCount++;
          await page.waitForTimeout(50);
        } catch (err: any) {
          errors.push(`Error filling ${mapping.targetFieldName}: ${err.message}`);
        }
      }

      this.emitStep(
        onStepUpdate,
        'Execution & Driver Agent',
        'Auto-Fill Complete',
        'completed',
        `Successfully populated ${filledCount} form elements`
      );

      // Now extract active DOM values directly on this filled page for validation
      this.emitStep(
        onStepUpdate,
        'Validation & QA Agent',
        'Inspecting Active DOM',
        'running',
        'Reading filled DOM values and checking validity constraints...'
      );

      const targetSelectors = mappings.map((m) => m.targetSelector);
      const domState: Record<string, { value: any; validityValid: boolean; validationMessage: string }> = await page.evaluate(
        (selectors: string[]) => {
          const res: Record<string, any> = {};
          selectors.forEach((sel) => {
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
              res[sel] = { value: '', validityValid: true, validationMessage: '' };
            }
          });
          return res;
        },
        targetSelectors
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
        const actual = domEntry !== undefined ? domEntry.value : undefined;

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
      const screenshotBase64 = `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;

      const validationResult: DualValidationResult = {
        id: `val-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        overallScore,
        passed,
        totalFieldsChecked: totalChecked,
        matchCount,
        warningCount,
        mismatchCount,
        diffs,
        screenshot: screenshotBase64,
        htmlValidityErrors,
        requiresHITL: !passed || warningCount > 0,
      };

      this.emitStep(
        onStepUpdate,
        'Validation & QA Agent',
        'Dual Validation Result',
        passed ? 'completed' : 'warning',
        `Validation score: ${overallScore}%. Matches: ${matchCount}, Warnings: ${warningCount}, Mismatches: ${mismatchCount}`,
        screenshotBase64
      );

      return {
        execution: {
          success: errors.length === 0,
          filledCount,
          errors,
        },
        validation: validationResult,
      };
    } finally {
      await page.close();
    }
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

    // Numerical check
    if (!isNaN(Number(expStr)) && !isNaN(Number(actStr))) {
      if (Number(expStr) === Number(actStr)) {
        return { isMatch: true, matchScore: 100, status: 'match', message: 'Equivalent numerical value' };
      }
    }

    // Boolean check
    if (typeof expected === 'boolean' || targetType === 'checkbox') {
      const expBool = Boolean(expected);
      const actBool = Boolean(actual === true || actual === 'true' || actual === 'on' || actual === '1');
      if (expBool === actBool) {
        return { isMatch: true, matchScore: 100, status: 'match', message: 'Boolean state match' };
      } else {
        return { isMatch: false, matchScore: 0, status: 'mismatch', message: `Checkbox mismatch (expected: ${expBool}, actual: ${actBool})` };
      }
    }

    // Substring or partial format difference
    if (actStr.includes(expStr) || expStr.includes(actStr)) {
      return {
        isMatch: true,
        matchScore: 90,
        status: 'match',
        message: 'Partial value match / formatted variation',
      };
    }

    return {
      isMatch: false,
      matchScore: 30,
      status: 'mismatch',
      message: `Discrepancy (expected: "${expStr}", filled: "${actStr}")`,
    };
  }

  public generateInteractiveMapPayload(url: string, mappings: FieldMapping[]): {
    bookmarkletCode: string;
    consoleInjectionScript: string;
    interactiveFieldList: Array<{
      selector: string;
      label: string;
      value: any;
      type: string;
      copySnippet: string;
    }>;
  } {
    const validMappings = mappings.filter((m) => m.sourceKey && m.sourceValue !== undefined);

    const injectionPayloadData: Record<string, any> = {};
    validMappings.forEach((m) => {
      injectionPayloadData[m.targetSelector] = {
        value: m.sourceValue,
        type: m.targetType,
        fieldName: m.targetFieldName,
      };
    });

    const consoleInjectionScript = `
/* FormMind Universal Client-Side Auto-Fill Injector */
(function() {
  const payload = ${JSON.stringify(injectionPayloadData, null, 2)};
  let filled = 0;
  console.log("%c[FormMind Agent] Starting universal form injection...", "color: #38bdf8; font-weight: bold;");

  for (const [selector, item] of Object.entries(payload)) {
    try {
      const el = document.querySelector(selector);
      if (!el) {
        console.warn("[FormMind] Selector not found:", selector, item.fieldName);
        continue;
      }

      if (el.tagName.toLowerCase() === 'select') {
        const valStr = String(item.value).toLowerCase();
        let matched = false;
        for (const opt of el.options) {
          if (opt.text.toLowerCase().includes(valStr) || opt.value.toLowerCase().includes(valStr)) {
            el.value = opt.value;
            matched = true;
            break;
          }
        }
        if (!matched) el.value = item.value;
      } else if (el.type === 'checkbox') {
        el.checked = Boolean(item.value === true || String(item.value).toLowerCase() === 'true' || item.value === '1');
      } else if (el.type === 'radio') {
        el.checked = true;
      } else {
        el.value = Array.isArray(item.value) ? item.value.join(', ') : item.value;
      }

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
      el.style.outline = '2px solid #22c55e';
      el.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
      filled++;
    } catch(err) {
      console.error("[FormMind] Error injecting", selector, err);
    }
  }

  // Visual success banner
  const banner = document.createElement('div');
  banner.style = 'position:fixed;top:20px;right:20px;background:#0f172a;color:#38bdf8;padding:16px 24px;border:1px solid #38bdf8;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.5);z-index:999999;font-family:sans-serif;font-size:14px;';
  banner.innerHTML = '<strong>🚀 FormMind Autonomous Fill</strong><div style="color:#94a3b8;font-size:12px;margin-top:4px;">Successfully populated ' + filled + ' fields bypass-free!</div>';
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 6000);
  console.log("%c[FormMind Agent] Complete! Populated " + filled + " fields.", "color: #22c55e; font-weight: bold;");
})();
    `.trim();

    const minified = consoleInjectionScript.replace(/\n\s*/g, ' ').replace(/"/g, "'");
    const bookmarkletCode = `javascript:(function(){${encodeURIComponent(minified)}})();`;

    const interactiveFieldList = validMappings.map((m) => ({
      selector: m.targetSelector,
      label: m.targetFieldName,
      value: m.sourceValue,
      type: m.targetType,
      copySnippet: Array.isArray(m.sourceValue) ? m.sourceValue.join(', ') : String(m.sourceValue),
    }));

    return {
      bookmarkletCode,
      consoleInjectionScript,
      interactiveFieldList,
    };
  }

  private emitStep(
    onStepUpdate: ((step: AgentStep) => void) | undefined,
    agentName: AgentStep['agentName'],
    stepName: string,
    status: AgentStep['status'],
    message: string,
    screenshot?: string
  ): void {
    if (onStepUpdate) {
      onStepUpdate({
        id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        timestamp: new Date().toISOString(),
        agentName,
        stepName,
        status,
        message,
        screenshot,
      });
    }
  }
}

export const executionAgent = new ExecutionAgent();
