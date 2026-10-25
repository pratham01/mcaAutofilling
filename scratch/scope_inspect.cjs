const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('E:/AutomateFormFIll/server/agents/mcaBrowserAgent.ts');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Remove window.guideBridge.validate() from selfHealScript
const oldGbValidate = `          // Trigger AEM guideBridge validation / recalculation if present
          if (window.guideBridge && typeof window.guideBridge.validate === 'function') {
            try { window.guideBridge.validate(); } catch (_) {}
          }`;

if (code.includes(oldGbValidate)) {
  code = code.replace(oldGbValidate, '// guideBridge.validate omitted to prevent premature cross-section validation');
  console.log('Removed guideBridge.validate() from selfHealScript');
}

// 2. Enhance inspectSectionErrors signature and implementation to support sectionName scoping
const oldInspectStart = `  public async inspectSectionErrors(): Promise<{
    hasErrors: boolean;
    issues: Array<{ type: string; label: string; error: string; fieldId: string; currentValue: string }>;
    screenshot: string;
  }> {
    if (!this.page || this.page.isClosed()) {
      return {
        hasErrors: false,
        issues: [{ type: 'browser', label: 'Browser', error: 'Chrome browser is not currently running.', fieldId: '', currentValue: '' }],
        screenshot: ''
      };
    }

    const issues = await this.page.evaluate(() => {
      const found: Array<{ type: string; label: string; error: string; fieldId: string; currentValue: string }> = [];

      // 1. Error message text elements
      const errorElements = Array.from(document.querySelectorAll(
        '.guideErrorMessage, .help-block, .error-message, .alert, [class*="error" i], [class*="invalid" i]'
      )).filter(el => {
        if ((el as HTMLElement).offsetParent === null) return false;
        const txt = (el.textContent || '').trim();
        return txt.length > 0 && (
          txt.toLowerCase().includes('relevant') ||
          txt.toLowerCase().includes('mandatory') ||
          txt.toLowerCase().includes('required') ||
          txt.toLowerCase().includes('invalid') ||
          txt.toLowerCase().includes('error') ||
          txt.toLowerCase().includes('failed')
        );
      });

      for (const errEl of errorElements) {
        const parentField = errEl.closest('.guideFieldNode, .guidePanelNode, .form-group, tr, div');
        const label = parentField?.querySelector('label, .guideFieldLabel, th')?.textContent?.trim() || '';
        const input = parentField?.querySelector('input, select, textarea') as HTMLInputElement | null;
        found.push({
          type: 'field_error',
          label: label || 'Form Field',
          error: (errEl.textContent || '').trim(),
          fieldId: input?.id || '',
          currentValue: input?.value || ''
        });
      }

      // 2. Inputs with red borders or invalid attributes
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea')) as HTMLInputElement[];
      for (const input of inputs) {
        if (input.offsetParent === null) continue;
        const style = window.getComputedStyle(input);
        const borderColor = style.borderColor || '';
        const isRedBorder = borderColor.includes('220,') || borderColor.includes('239,') ||
                            borderColor.includes('255, 0, 0') || borderColor.includes('rgb(220') ||
                            borderColor.includes('red');
        const isAriaInvalid = input.getAttribute('aria-invalid') === 'true';

        if (isRedBorder || isAriaInvalid) {
          const parent = input.closest('.guideFieldNode, .form-group, tr, td, div');
          const label = parent?.querySelector('label, .guideFieldLabel, th')?.textContent?.trim() || input.name || input.id;
          if (!found.some(i => i.fieldId === input.id)) {
            found.push({
              type: 'validation_border',
              label: label || 'Required Field',
              error: 'Field has red validation border / invalid state.',
              fieldId: input.id,
              currentValue: input.value
            });
          }
        }
      }

      // 3. Modal / Dialog alerts
      const modals = Array.from(document.querySelectorAll('.modal, [role="dialog"], .ui-dialog, [class*="dialog" i]')) as HTMLElement[];
      for (const m of modals) {
        if (m.offsetParent !== null && (m.innerText || '').length > 0) {
          const txt = (m.innerText || '').replace(/\\\\s+/g, ' ').trim();
          if (txt.toLowerCase().includes('error') || txt.toLowerCase().includes('mandatory') || txt.toLowerCase().includes('warning') || txt.toLowerCase().includes('failed')) {
            found.push({
              type: 'modal_alert',
              label: 'MCA Dialog Alert',
              error: txt.substring(0, 200),
              fieldId: '',
              currentValue: ''
            });
          }
        }
      }

      return found;
    });`;

const newInspectStart = `  public async inspectSectionErrors(sectionName?: string): Promise<{
    hasErrors: boolean;
    issues: Array<{ type: string; label: string; error: string; fieldId: string; currentValue: string }>;
    screenshot: string;
  }> {
    if (!this.page || this.page.isClosed()) {
      return {
        hasErrors: false,
        issues: [{ type: 'browser', label: 'Browser', error: 'Chrome browser is not currently running.', fieldId: '', currentValue: '' }],
        screenshot: ''
      };
    }

    const inspectScript = \`
      ((targetSection) => {
        const found = [];
        const norm = (targetSection || '').toLowerCase();

        const isFieldInSection = (fieldId, el) => {
          if (!norm || norm === 'all') {
            // Default to visible active panel or Section 1 if early in the process
            const visiblePanel = document.querySelector('.guidePanelNodeWrapper.active, .guidePanelNode.active, [id*="panel"]:not([style*="display: none"])');
            if (visiblePanel) {
              return el.closest('.guidePanelNodeWrapper.active, .guidePanelNode.active, [id*="panel"]:not([style*="display: none"])') !== null ||
                     fieldId.includes('panel1AOC4') || fieldId.includes('panel2AOC4');
            }
            return true;
          }
          if (norm.includes('1') || norm.includes('part_a') || norm.includes('part a')) {
            return fieldId.includes('panel1AOC4') || fieldId.includes('panel2AOC4') || (el && el.closest('[id*="panel1AOC4"], [id*="panel2AOC4"]'));
          }
          if (norm.includes('2') || norm.includes('part_b') || norm.includes('balance sheet') || norm.includes('part b')) {
            return fieldId.includes('panel3AOC4') || fieldId.includes('panel4AOC4') || fieldId.includes('panel5AOC4') || (el && el.closest('[id*="panel3AOC4"], [id*="panel4AOC4"], [id*="panel5AOC4"]'));
          }
          if (norm.includes('3') || norm.includes('part_c') || norm.includes('profit') || norm.includes('part c')) {
            return fieldId.includes('panel6AOC4') || (el && el.closest('[id*="panel6AOC4"]'));
          }
          return true;
        };

        // 1. Error message text elements
        const errorElements = Array.from(document.querySelectorAll(
          '.guideErrorMessage, .help-block, .error-message, .alert, [class*="error" i], [class*="invalid" i]'
        )).filter(el => {
          if (el.offsetParent === null) return false;
          const txt = (el.textContent || '').trim();
          return txt.length > 0 && (
            txt.toLowerCase().includes('relevant') ||
            txt.toLowerCase().includes('mandatory') ||
            txt.toLowerCase().includes('required') ||
            txt.toLowerCase().includes('invalid') ||
            txt.toLowerCase().includes('error') ||
            txt.toLowerCase().includes('failed')
          );
        });

        for (const errEl of errorElements) {
          const parentField = errEl.closest('.guideFieldNode, .guidePanelNode, .form-group, tr, div');
          const input = parentField ? parentField.querySelector('input, select, textarea') : null;
          const fieldId = input ? input.id : (errEl.id || '');
          if (!isFieldInSection(fieldId, errEl)) continue;

          const label = parentField?.querySelector('label, .guideFieldLabel, th')?.textContent?.trim() || '';
          found.push({
            type: 'field_error',
            label: label || 'Form Field',
            error: (errEl.textContent || '').trim(),
            fieldId: fieldId,
            currentValue: input ? input.value : ''
          });
        }

        // 2. Inputs with red borders or invalid attributes
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'));
        for (const input of inputs) {
          if (input.offsetParent === null) continue;
          if (!isFieldInSection(input.id, input)) continue;

          const style = window.getComputedStyle(input);
          const borderColor = style.borderColor || '';
          const isRedBorder = borderColor.includes('220,') || borderColor.includes('239,') ||
                              borderColor.includes('255, 0, 0') || borderColor.includes('rgb(220') ||
                              borderColor.includes('red');
          const isAriaInvalid = input.getAttribute('aria-invalid') === 'true';

          if (isRedBorder || isAriaInvalid) {
            const parent = input.closest('.guideFieldNode, .form-group, tr, td, div');
            const label = parent?.querySelector('label, .guideFieldLabel, th')?.textContent?.trim() || input.name || input.id;
            if (!found.some(i => i.fieldId === input.id)) {
              found.push({
                type: 'validation_border',
                label: label || 'Required Field',
                error: 'Field has red validation border / invalid state.',
                fieldId: input.id,
                currentValue: input.value
              });
            }
          }
        }

        // 3. Modal / Dialog alerts
        const modals = Array.from(document.querySelectorAll('.modal, [role="dialog"], .ui-dialog, [class*="dialog" i]'));
        for (const m of modals) {
          if (m.offsetParent !== null && (m.innerText || '').length > 0) {
            const txt = (m.innerText || '').replace(/\\\\s+/g, ' ').trim();
            if (txt.toLowerCase().includes('error') || txt.toLowerCase().includes('mandatory') || txt.toLowerCase().includes('warning') || txt.toLowerCase().includes('failed')) {
              found.push({
                type: 'modal_alert',
                label: 'MCA Dialog Alert',
                error: txt.substring(0, 200),
                fieldId: '',
                currentValue: ''
              });
            }
          }
        }

        return found;
      })(\${JSON.stringify(sectionName || '')})
    \`;

    const issues = (await this.page.evaluate(inspectScript)) as Array<{
      type: string;
      label: string;
      error: string;
      fieldId: string;
      currentValue: string;
    }>;`;

if (code.includes(oldInspectStart)) {
  code = code.replace(oldInspectStart, newInspectStart);
  console.log('Successfully enhanced inspectSectionErrors with section-aware scoping!');
} else {
  console.warn('Warning: oldInspectStart not found.');
}

// 3. Update autoFixSectionIssues signature to accept optional sectionName
code = code.replace(
  'public async autoFixSectionIssues(): Promise<{',
  'public async autoFixSectionIssues(sectionName?: string): Promise<{'
);
code = code.replace(
  'const inspectRes = await this.inspectSectionErrors();',
  'const inspectRes = await this.inspectSectionErrors(sectionName);'
);
code = code.replace(
  'const finalCheck = await this.inspectSectionErrors();',
  'const finalCheck = await this.inspectSectionErrors(sectionName);'
);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Agent file updated!');
