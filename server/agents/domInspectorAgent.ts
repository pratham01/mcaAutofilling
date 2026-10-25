import { chromium, Browser, BrowserContext } from 'playwright';
import { FormField, TargetFormAnalysis } from '../../shared/types.js';

export class DomInspectorAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  public async init(): Promise<void> {
    if (!this.browser) {
      try {
        this.browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
        });
        this.context = await this.browser.newContext({
          viewport: { width: 1280, height: 900 },
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        });
      } catch (err) {
        console.error('Failed to launch Playwright browser:', err);
        throw err;
      }
    }
  }

  public async inspectPage(url: string): Promise<{ analysis: TargetFormAnalysis; screenshotBase64: string }> {
    await this.init();
    if (!this.context) throw new Error('Browser context not initialized');

    const page = await this.context.newPage();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(800);

      const title = await page.title();
      const pageContent = await page.content();

      const isRestricted = this.detectBotRestrictions(pageContent, url);
      let restrictionReason: string | undefined;

      if (isRestricted) {
        restrictionReason = 'Target website has active anti-bot detection / CAPTCHA challenge or restricted automated submission.';
      }

      // Extract fields using safe CSS selectors
      const fields: FormField[] = await page.evaluate(`
        (() => {
          const results = [];
          const seenSelectors = new Set();

          const formElements = document.querySelectorAll(
            'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea, [role="textbox"], [role="combobox"]'
          );

          formElements.forEach((el, index) => {
            const tagName = el.tagName.toLowerCase();
            const inputType = el.getAttribute('type') || tagName;
            const nameAttr = el.getAttribute('name');
            const idAttr = el.id;
            const valAttr = el.getAttribute('value');

            let selector = '';
            if (idAttr) {
              selector = '#' + idAttr;
            } else if (nameAttr && (inputType === 'radio' || inputType === 'checkbox') && valAttr) {
              selector = 'input[name="' + nameAttr + '"][value="' + valAttr + '"]';
            } else if (nameAttr) {
              selector = '[name="' + nameAttr + '"]';
            } else {
              selector = tagName + ':nth-of-type(' + (index + 1) + ')';
            }

            if (seenSelectors.has(selector)) {
              if (valAttr) {
                selector = tagName + '[name="' + nameAttr + '"][value="' + valAttr + '"]';
              } else {
                selector = tagName + ':nth-of-type(' + (index + 1) + ')';
              }
            }
            seenSelectors.add(selector);

            const rect = el.getBoundingClientRect();

            let type = inputType;
            if (tagName === 'select') type = 'select';
            if (tagName === 'textarea') type = 'textarea';

            let labelText = '';
            if (idAttr) {
              const labelEl = document.querySelector('label[for="' + idAttr + '"]');
              if (labelEl && labelEl.textContent) labelText = labelEl.textContent.trim();
            }
            if (!labelText) {
              const parentLabel = el.closest('label');
              if (parentLabel && parentLabel.textContent) {
                labelText = parentLabel.innerText.split('\\n')[0].trim();
              }
            }
            if (!labelText) {
              const parentContainer = el.closest('.form-group, .field-group, .input-group, div');
              if (parentContainer) {
                const lbl = parentContainer.querySelector('label, .label, .field-label, span');
                if (lbl && lbl.textContent && !lbl.contains(el)) {
                  labelText = lbl.textContent.trim();
                }
              }
            }
            if (!labelText && el.getAttribute('aria-label')) labelText = el.getAttribute('aria-label');
            if (!labelText && el.placeholder) labelText = el.placeholder;
            if (!labelText && nameAttr) labelText = nameAttr;
            if (!labelText) labelText = idAttr || 'Field';

            // Clean up required asterisk
            labelText = labelText.replace(/\\*$/, '').trim();

            let options = undefined;
            if (tagName === 'select') {
              options = Array.from(el.options).map((opt) => ({
                label: opt.text.trim(),
                value: opt.value,
              }));
            }

            let currentValue = '';
            if (type === 'checkbox' || type === 'radio') {
              currentValue = el.checked;
            } else {
              currentValue = el.value || '';
            }

            const section = el.closest('fieldset, section, .form-section, .card');
            let sectionTitle = undefined;
            if (section) {
              const legend = section.querySelector('legend, h2, h3, h4, .section-title');
              if (legend && legend.textContent) {
                sectionTitle = legend.textContent.trim();
              }
            }

            results.push({
              selector: selector,
              id: idAttr || undefined,
              name: nameAttr || undefined,
              tagName: tagName,
              type: type,
              label: labelText,
              placeholder: el.placeholder || undefined,
              isRequired: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
              currentValue: currentValue,
              options: options,
              ariaLabel: el.getAttribute('aria-label') || undefined,
              sectionTitle: sectionTitle,
              boundingBox: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
            });
          });

          return results;
        })()
      `);

      // Group into sections
      const sectionMap = new Map<string, string[]>();
      fields.forEach((f) => {
        const sec = f.sectionTitle || 'General Information';
        if (!sectionMap.has(sec)) sectionMap.set(sec, []);
        sectionMap.get(sec)!.push(f.selector);
      });

      const sections = Array.from(sectionMap.entries()).map(([title, fieldSelectors]) => ({
        title,
        fieldSelectors,
      }));

      // Detect submit button
      const submitSelector: string | undefined = await page.evaluate(`
        (() => {
          const btn = document.querySelector('button[type="submit"], input[type="submit"], button.submit-btn, .btn-primary');
          if (btn) {
            return btn.id ? '#' + btn.id : (btn.getAttribute('name') ? '[name="' + btn.getAttribute('name') + '"]' : 'button[type="submit"]');
          }
          return undefined;
        })()
      `);

      // Capture screenshot
      const screenshotBuffer = await page.screenshot({ fullPage: false });
      const screenshotBase64 = `data:image/jpeg;base64,${screenshotBuffer.toString('base64')}`;

      const analysis: TargetFormAnalysis = {
        url,
        title,
        isRestricted,
        restrictionReason,
        fields,
        sections,
        hasCaptcha: pageContent.includes('g-recaptcha') || pageContent.includes('cf-turnstile') || pageContent.includes('h-captcha'),
        hasSubmitButton: !!submitSelector,
        submitSelector: submitSelector || undefined,
      };

      return { analysis, screenshotBase64 };
    } finally {
      await page.close();
    }
  }

  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
    }
  }

  private detectBotRestrictions(pageContent: string, url: string): boolean {
    const lower = pageContent.toLowerCase();
    const urlLower = url.toLowerCase();

    if (urlLower.includes('restricted') || urlLower.includes('bot-protected') || urlLower.includes('mode=restricted')) {
      return true;
    }

    if (
      (lower.includes('cloudflare') && (lower.includes('verify you are human') || lower.includes('challenge-running'))) ||
      lower.includes('please complete the security check') ||
      lower.includes('access denied - bot detected') ||
      lower.includes('cf-turnstile') ||
      lower.includes('g-recaptcha')
    ) {
      return true;
    }

    return false;
  }
}

export const domInspectorAgent = new DomInspectorAgent();
