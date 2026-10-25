import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { fileParserAgent } from '../agents/fileParserAgent.js';
import { domInspectorAgent } from '../agents/domInspectorAgent.js';
import { semanticMapperAgent } from '../agents/semanticMapperAgent.js';
import { executionAgent } from '../agents/executionAgent.js';
import { validationAgent } from '../agents/validationAgent.js';
import { memoryStore } from '../services/memoryStore.js';
import { FieldMapping, SourceDocument, HITLDecision } from '../../shared/types.js';
import { mcaBrowserAgent } from '../agents/mcaBrowserAgent.js';
import { continuousObservability } from '../services/continuousObservability.js';
import { professionalFeedbackEngine } from '../services/professionalFeedbackEngine.js';
import { clientIsolationService } from '../services/clientIsolationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRESETS_DIR = path.resolve(__dirname, '../../data/presets');

const upload = multer({ dest: path.resolve(__dirname, '../../data/uploads') });

export const apiRouter = express.Router();

let broadcastStep: ((step: any) => void) | null = null;
export const setWsBroadcaster = (fn: (step: any) => void) => {
  broadcastStep = fn;
  mcaBrowserAgent.setStepCallback((step) => {
    if (broadcastStep) broadcastStep(step);
  });
};

// 0. Health check
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), port: process.env.PORT || 3001 });
});

// 1. Get available presets
apiRouter.get('/presets', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(PRESETS_DIR)) {
      return res.json([]);
    }
    const files = fs.readdirSync(PRESETS_DIR);
    const presets = files.map((file) => ({
      name: file,
      displayName: file
        .replace(/\.[^/.]+$/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      ext: path.extname(file).toLowerCase(),
    }));
    return res.json(presets);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Load and parse preset
apiRouter.get('/presets/:name', async (req: Request, res: Response) => {
  try {
    const filePath = path.join(PRESETS_DIR, req.params.name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Preset file not found' });
    }
    const doc = await fileParserAgent.parseFile(filePath, req.params.name);
    return res.json(doc);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Upload and parse custom file
apiRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (req.file) {
      const doc = await fileParserAgent.parseFile(req.file.path, req.file.originalname);
      fs.unlinkSync(req.file.path);
      return res.json(doc);
    } else if (req.body.rawText) {
      const doc = fileParserAgent.parseRawText(req.body.rawText, req.body.fileName || 'custom_data.json');
      return res.json(doc);
    }
    return res.status(400).json({ error: 'No file or raw text provided' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Inspect target web form
apiRouter.post('/inspect-target', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Target URL is required' });

    if (broadcastStep) {
      broadcastStep({
        id: `step-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agentName: 'DOM Inspector Agent',
        stepName: 'Scanning Form',
        status: 'running',
        message: `Analyzing DOM hierarchy and bot constraints at ${url}`,
      });
    }

    const { analysis, screenshotBase64 } = await domInspectorAgent.inspectPage(url);

    if (broadcastStep) {
      broadcastStep({
        id: `step-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agentName: 'DOM Inspector Agent',
        stepName: 'Inspection Complete',
        status: analysis.isRestricted ? 'warning' : 'completed',
        message: `Found ${analysis.fields.length} form fields across ${analysis.sections.length} sections. Restricted mode: ${analysis.isRestricted}`,
        screenshot: screenshotBase64,
      });
    }

    return res.json({ analysis, screenshotBase64 });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Generate Semantic Mappings
apiRouter.post('/generate-mapping', (req: Request, res: Response) => {
  try {
    const { sourceDoc, formFields, targetUrl } = req.body;
    if (!sourceDoc || !formFields || !targetUrl) {
      return res.status(400).json({ error: 'Missing sourceDoc, formFields, or targetUrl' });
    }

    const mappings = semanticMapperAgent.generateMappings(sourceDoc, formFields, targetUrl);

    if (broadcastStep) {
      const highConf = mappings.filter((m) => m.confidence >= 0.85).length;
      broadcastStep({
        id: `step-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agentName: 'Semantic Mapper Agent',
        stepName: 'Mapping Generated',
        status: 'completed',
        message: `Synthesized ${mappings.length} field mappings (${highConf} high confidence, ${mappings.length - highConf} pending verification)`,
      });
    }

    return res.json({ mappings });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Execute Automated Fill via Playwright
apiRouter.post('/execute-fill', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const { targetUrl, mappings, sourceDoc, isSimulated } = req.body;
    if (!targetUrl || !mappings) {
      return res.status(400).json({ error: 'Missing targetUrl or mappings' });
    }

    let result;
    let validationResult;

    if (isSimulated) {
      result = {
        success: true,
        filledCount: mappings.filter((m: FieldMapping) => m.sourceKey).length,
        errors: [],
      };
      validationResult = validationAgent.validateSimulatedDiff(mappings);
    } else {
      const execAndVal = await executionAgent.executeAutomatedFillAndValidate(
        targetUrl,
        mappings,
        sourceDoc,
        (step) => {
          if (broadcastStep) broadcastStep(step);
        }
      );
      result = execAndVal.execution;
      validationResult = execAndVal.validation;
    }

    const durationMs = Date.now() - startTime;
    const mappedCount = mappings.filter((m: FieldMapping) => m.sourceKey).length;
    const mappingAccuracy = mappings.length > 0 ? (mappedCount / mappings.length) * 100 : 100;

    return res.json({
      execution: result,
      validation: validationResult,
      durationMs,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Generate Complete Interactive Fallback Map (for restricted/anti-bot sites)
apiRouter.post('/generate-fallback-map', (req: Request, res: Response) => {
  try {
    const { targetUrl, mappings } = req.body;
    if (!targetUrl || !mappings) {
      return res.status(400).json({ error: 'Missing targetUrl or mappings' });
    }

    const fallbackPayload = executionAgent.generateInteractiveMapPayload(targetUrl, mappings);

    if (broadcastStep) {
      broadcastStep({
        id: `step-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agentName: 'Execution & Driver Agent',
        stepName: 'Fallback Map Ready',
        status: 'completed',
        message: `Complete interactive field map & 1-click bypass injection payload prepared for ${mappings.length} target fields`,
      });
    }

    return res.json(fallbackPayload);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Dual Validation Endpoint
apiRouter.post('/validate-fill', async (req: Request, res: Response) => {
  try {
    const { targetUrl, mappings, sourceDoc, filledOverrides } = req.body;
    let result;
    if (targetUrl && !targetUrl.includes('simulate')) {
      result = await validationAgent.validateFilledForm(targetUrl, mappings, sourceDoc);
    } else {
      result = validationAgent.validateSimulatedDiff(mappings, filledOverrides);
    }
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. Record HITL Decision & Learn
apiRouter.post('/hitl-decision', (req: Request, res: Response) => {
  try {
    const { decision, mappings, domain, overrides } = req.body;
    if (decision === 'approved' || decision === 'modified') {
      mappings.forEach((m: FieldMapping) => {
        if (m.sourceKey && m.targetSelector) {
          const isManual = m.isManualOverride || (overrides && overrides[m.targetSelector] !== undefined);
          memoryStore.recordLearnedMapping(domain, m.sourceKey, m.targetSelector, m.targetFieldName, isManual);
        }
      });

      if (broadcastStep) {
        broadcastStep({
          id: `step-${Date.now()}`,
          timestamp: new Date().toISOString(),
          agentName: 'Memory & Learning Engine',
          stepName: 'Knowledge Reinforced',
          status: 'completed',
          message: `Learned memory weights updated for domain "${domain}". Future fills on this schema will achieve 100% confidence.`,
        });
      }
    }

    return res.json({ success: true, message: 'Decision recorded and memory reinforced.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 10. Memory Rules management
apiRouter.get('/memory', (req: Request, res: Response) => {
  res.json(memoryStore.getAllRules());
});

apiRouter.delete('/memory/:domain/:key', (req: Request, res: Response) => {
  const ok = memoryStore.deleteRule(req.params.domain, req.params.key);
  res.json({ success: ok });
});

apiRouter.post('/memory/reset', (req: Request, res: Response) => {
  memoryStore.resetMemory();
  res.json({ success: true });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AOC-4 E-FILING AUTOMATION ENDPOINTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { excelParserAgent } from '../agents/excelParserAgent.js';
import { aoc4MapperAgent } from '../agents/aoc4MapperAgent.js';
import { AOC4FormFieldMapping } from '../../shared/types.js';

// Store current state in memory for the session
let currentFinancialData: any = null;
let currentMappings: AOC4FormFieldMapping[] = [];
let lastParsedFilePath: string = '';
let automaticAoc4RunActive = false;

// 12. Parse Excel file for AOC-4
apiRouter.post('/aoc4/parse-excel', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let filePath: string;
    let cleanup = false;

    if (req.file) {
      filePath = req.file.path;
      cleanup = true;
    } else if (req.body.filePath) {
      filePath = req.body.filePath;
    } else {
      return res.status(400).json({ error: 'No Excel file provided. Upload a file or provide filePath.' });
    }
    lastParsedFilePath = filePath;

    if (broadcastStep) {
      broadcastStep({
        id: `step-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agentName: 'Excel Parser Agent',
        stepName: 'Parsing Excel File',
        status: 'running',
        message: `Reading multi-sheet financial data from ${path.basename(filePath)}...`,
      });
    }

    const financialData = excelParserAgent.parseExcelFile(filePath);
    const summary = excelParserAgent.getSummary(financialData);
    currentFinancialData = financialData;

    if (cleanup && req.file) {
      fs.unlinkSync(req.file.path);
    }

    if (broadcastStep) {
      broadcastStep({
        id: `step-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agentName: 'Excel Parser Agent',
        stepName: 'Excel Parsed Successfully',
        status: 'completed',
        message: `Extracted data from ${Object.keys(financialData.rawSheetData).length} sheets. Company: ${financialData.companyInfo.name}, CIN: ${financialData.companyInfo.cin}`,
      });
    }

    return res.json({ financialData, summary });
  } catch (err: any) {
    if (broadcastStep) {
      broadcastStep({
        id: `step-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agentName: 'Excel Parser Agent',
        stepName: 'Parse Error',
        status: 'failed',
        message: err.message,
      });
    }
    return res.status(500).json({ error: err.message });
  }
});

// 13. Generate AOC-4 field mappings
apiRouter.post('/aoc4/generate-mapping', (req: Request, res: Response) => {
  try {
    const financialData = req.body.financialData || currentFinancialData;
    if (!financialData) {
      return res.status(400).json({ error: 'No financial data available. Parse an Excel file first.' });
    }

    const mappings = aoc4MapperAgent.generateMappings(financialData);
    const stats = aoc4MapperAgent.getStats(mappings);
    const validation = aoc4MapperAgent.validateMappings(mappings);
    currentMappings = mappings;

    if (broadcastStep) {
      broadcastStep({
        id: `step-${Date.now()}`,
        timestamp: new Date().toISOString(),
        agentName: 'AOC-4 Mapper Agent',
        stepName: 'Mapping Generated',
        status: validation.isValid ? 'completed' : 'warning',
        message: `Generated ${stats.total} field mappings. ${stats.withValues} have values, ${stats.empty} empty. ${validation.warnings.length} warnings.`,
      });
    }

    return res.json({ mappings, stats, validation });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 14. Update a single field mapping (user override)
apiRouter.put('/aoc4/update-mapping', (req: Request, res: Response) => {
  try {
    const { fieldId, newValue } = req.body;
    if (!fieldId) {
      return res.status(400).json({ error: 'fieldId is required' });
    }

    currentMappings = aoc4MapperAgent.applyOverride(currentMappings, fieldId, newValue);
    const stats = aoc4MapperAgent.getStats(currentMappings);
    const validation = aoc4MapperAgent.validateMappings(currentMappings);

    return res.json({ mappings: currentMappings, stats, validation });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 15. Confirm all mappings
apiRouter.post('/aoc4/confirm-all', (req: Request, res: Response) => {
  try {
    const validation = aoc4MapperAgent.validateMappings(currentMappings);
    if (!validation.isValid) {
      return res.status(422).json({
        error: 'Required mapping values are missing. Add them to the mapping table before approval.',
        validation,
      });
    }
    currentMappings = aoc4MapperAgent.confirmAll(currentMappings);
    return res.json({ mappings: currentMappings, validation, message: 'All mappings confirmed.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 16. Launch MCA browser session
apiRouter.post('/aoc4/start-session', async (req: Request, res: Response) => {
  try {
    // Set broadcaster
    mcaBrowserAgent.setStepCallback((step) => {
      if (broadcastStep) broadcastStep(step);
    });

    await mcaBrowserAgent.launchBrowser();

    const { email, password } = req.body;
    if (email && password) {
      const result = await mcaBrowserAgent.navigateToPortal(email, password) as any;
      if (result?.alreadyLoggedIn) {
        return res.json({
          session: mcaBrowserAgent.getSession(),
          loggedIn: true,
          needsOTP: false,
          hasCaptcha: false,
          captchaImage: '',
          message: 'Already authenticated on MCA portal! Step 1 complete.',
        });
      }
      const captchaImage = await mcaBrowserAgent.getCaptchaImage();
      return res.json({
        session: mcaBrowserAgent.getSession(),
        loggedIn: false,
        needsOTP: result?.needsOTP || false,
        hasCaptcha: true, // MCA portal fologin ALWAYS requires CAPTCHA after entering credentials!
        captchaImage: captchaImage || '',
        message: 'Credentials auto-filled in Chrome. Please enter CAPTCHA to receive 4-digit OTP.',
      });
    }

    return res.json({
      session: mcaBrowserAgent.getSession(),
      needsOTP: false,
      hasCaptcha: false,
      captchaImage: '',
      message: 'Browser launched.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 16b. Open MCA login page for human-controlled authentication
apiRouter.post('/aoc4/open-login', async (_req: Request, res: Response) => {
  try {
    await mcaBrowserAgent.launchBrowser();
    await mcaBrowserAgent.openLoginPage();

    return res.json({
      session: mcaBrowserAgent.getSession(),
      message: 'MCA login page opened. Complete credentials, CAPTCHA, and 4-digit OTP in the Chrome window.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 17. Get live Captcha image
apiRouter.get('/aoc4/captcha-image', async (req: Request, res: Response) => {
  try {
    const captchaImage = await mcaBrowserAgent.getCaptchaImage();
    return res.json({ captchaImage, hasCaptcha: !!captchaImage });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 17b. Refresh Captcha
apiRouter.post('/aoc4/refresh-captcha', async (req: Request, res: Response) => {
  try {
    const captchaImage = await mcaBrowserAgent.refreshCaptcha();
    return res.json({ captchaImage, hasCaptcha: !!captchaImage });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 17c. Inspect Login DOM for Captcha elements
apiRouter.get('/aoc4/inspect-login-dom', async (_req: Request, res: Response) => {
  try {
    const page = mcaBrowserAgent.getPage();
    if (!page) return res.json({ error: 'No active browser page' });

    await page.screenshot({ path: path.resolve(__dirname, '../../data/screenshots/live_current_view.png') });

    const dom = await page.evaluate(() => {
      const c = document.querySelector('#customCaptchaInput');
      const modal = c ? (c.closest('.modal-content, .modal-dialog, .modal, form, .login-box, .captchaPopup') || c.parentElement?.parentElement) : null;
      const allText = document.body ? document.body.innerText.substring(0, 1000) : '';
      const alerts = Array.from(document.querySelectorAll('.alert, [role="alert"], .error, .error-message, .toast, .feedback, [class*="error" i]'))
        .map(el => {
          const style = window.getComputedStyle(el);
          const isVisible = (el as HTMLElement).offsetParent !== null && style.display !== 'none' && style.visibility !== 'hidden';
          return {
            tag: el.tagName,
            className: el.className,
            text: (el.textContent || '').trim(),
            isVisible,
            outerHTML: el.outerHTML.substring(0, 150),
          };
        })
        .filter(t => t.text.length > 0);

      const captchaImg = document.querySelector('img[src*="captcha" i], #captchaImg, .captcha-img, .modal-content img, .captchaPopup img') as HTMLImageElement | null;
      const continueBtn = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'))
        .find(b => (b.textContent || (b as HTMLInputElement).value || '').toLowerCase().includes('continue'));
      const refreshBtn = Array.from(document.querySelectorAll('button, a, span, img'))
        .find(b => (b.textContent || '').toLowerCase().includes('refresh captcha') || (b.getAttribute('title') || '').toLowerCase().includes('refresh'));

      const inputs = Array.from(document.querySelectorAll('input'))
        .filter(i => (i as HTMLElement).offsetParent !== null)
        .map(i => ({
          id: i.id,
          name: (i as HTMLInputElement).name,
          type: (i as HTMLInputElement).type,
          placeholder: (i as HTMLInputElement).placeholder,
          value: (i as HTMLInputElement).value,
        }));

      return {
        url: window.location.href,
        hasInput: !!c,
        modalVisible: !!modal,
        alerts,
        captchaDetails: {
          hasImage: !!captchaImg,
          imgSrc: captchaImg ? captchaImg.src.substring(0, 80) : '',
          naturalWidth: captchaImg ? captchaImg.naturalWidth : 0,
          naturalHeight: captchaImg ? captchaImg.naturalHeight : 0,
          continueButtonFound: !!continueBtn,
          refreshButtonFound: !!refreshBtn,
        },
        bodyTextSnippet: allText,
        visibleInputs: inputs,
      };
    });
    return res.json(dom);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 18. Submit Captcha for MCA login
apiRouter.post('/aoc4/submit-captcha', async (req: Request, res: Response) => {
  try {
    const { captcha } = req.body;
    if (!captcha) return res.status(400).json({ error: 'Captcha is required' });

    const result = await mcaBrowserAgent.submitCaptcha(captcha);
    return res.json({
      ...result,
      session: mcaBrowserAgent.getSession(),
      message: result.needsOTP
        ? 'Captcha accepted. OTP sent to your registered mobile/email.'
        : 'Captcha submitted.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 18b. Continue when a human completed CAPTCHA directly in Chrome
apiRouter.post('/aoc4/continue-to-otp', async (_req: Request, res: Response) => {
  try {
    const result = await mcaBrowserAgent.continueToOTP();
    return res.json({
      ...result,
      session: mcaBrowserAgent.getSession(),
      message: result.needsOTP
        ? 'OTP screen detected. Enter the OTP received from MCA.'
        : 'OTP screen is not visible yet. Complete or correct the CAPTCHA in Chrome first.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19. Submit OTP for MCA login
apiRouter.post('/aoc4/enter-otp', async (req: Request, res: Response) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ error: 'OTP is required' });

    const result = await mcaBrowserAgent.submitOTP(otp);
    return res.json({
      success: result.success,
      session: mcaBrowserAgent.getSession(),
      message: result.message,
      error: result.error,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, success: false });
  }
});

// 19b. Resend OTP on MCA portal
apiRouter.post('/aoc4/resend-otp', async (_req: Request, res: Response) => {
  try {
    const result = await mcaBrowserAgent.resendOTP();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 19c. Get real-time screenshot of the Chrome browser
apiRouter.get('/aoc4/live-screenshot', async (_req: Request, res: Response) => {
  try {
    const screenshot = await mcaBrowserAgent.getLiveScreenshot();
    return res.json({ screenshot, active: !!screenshot });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, active: false });
  }
});

// 19e. Get chronological action history performed by our system on MCA
apiRouter.get('/aoc4/steps', (_req: Request, res: Response) => {
  try {
    const steps = mcaBrowserAgent.getStepHistory();
    return res.json({ steps });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, steps: [] });
  }
});

// 19d. Live check if browser is authenticated on MCA
apiRouter.get('/aoc4/check-session', async (_req: Request, res: Response) => {
  try {
    const status = await mcaBrowserAgent.getDetailedLoginStatus();
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({
      isLoggedIn: false,
      stage: 'idle',
      url: '',
      hasMyApplication: false,
      hasLogout: false,
      hasSignIn: false,
      reason: `Session check error: ${err.message}`,
    });
  }
});

// 18. Navigate to AOC-4 form and enter CIN
apiRouter.post('/aoc4/navigate-form', async (req: Request, res: Response) => {
  try {
    const cin = req.body.cin || currentFinancialData?.companyInfo?.cin;
    if (!cin) return res.status(400).json({ error: 'CIN is required' });

    await mcaBrowserAgent.navigateToAOC4Form(cin);
    return res.json({
      session: mcaBrowserAgent.getSession(),
      message: `Navigated to AOC-4 form. CIN ${cin} entered.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 18b. Step 2: Verify Access to Form AOC-4
apiRouter.post('/aoc4/verify-form-access', async (req: Request, res: Response) => {
  try {
    const cin = req.body.cin || currentFinancialData?.companyInfo?.cin;
    if (!cin) return res.status(400).json({ error: 'CIN is required' });

    const result = await mcaBrowserAgent.verifyFormAccess(cin);
    if (!result.accessible) {
      return res.status(403).json({
        accessible: false,
        error: result.error || 'Form AOC-4 is not accessible. Ensure you are logged into MCA portal first.',
        session: mcaBrowserAgent.getSession(),
      });
    }

    return res.json({
      accessible: true,
      companyName: result.companyName,
      session: mcaBrowserAgent.getSession(),
      message: `Form AOC-4 access verified for CIN ${cin}. Ready for Step 3 mapping review.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, accessible: false });
  }
});

// 19. Fill form fields (section by section)
apiRouter.post('/aoc4/fill-form', async (req: Request, res: Response) => {
  try {
    let mappings = req.body.mappings || currentMappings;
    if (!mappings || mappings.length === 0) {
      if (lastParsedFilePath && fs.existsSync(lastParsedFilePath)) {
        currentFinancialData = excelParserAgent.parseExcelFile(lastParsedFilePath);
      } else {
        const clientState = clientIsolationService.getClientMappingState();
        if (clientState) {
          currentFinancialData = clientState;
        }
      }
      if (currentFinancialData) {
        currentMappings = aoc4MapperAgent.generateMappings(currentFinancialData);
        mappings = currentMappings;
      }
    }

    const validation = aoc4MapperAgent.validateMappings(mappings);
    if (!validation.isValid) {
      return res.status(422).json({
        error: 'Cannot fill or save the form until required mapping values are provided.',
        validation,
        missingRequired: validation.errors,
      });
    }

    // Run direct statutory schedule fill
    if (currentFinancialData) {
      try {
        await mcaBrowserAgent.fillAOC4FormDirect(currentFinancialData);
      } catch (e: any) {
        console.warn('[api/aoc4/fill-form] Direct statutory fill warning:', e.message);
      }
    }

    const result = mappings && mappings.length > 0
      ? await mcaBrowserAgent.fillFormFields(mappings)
      : { filledCount: 0, failedCount: 0, errors: [], requiredMissing: [], sectionsSaved: [] };

    return res.json({
      ...result,
      session: mcaBrowserAgent.getSession(),
      message: `Statutory schedules and ${result.filledCount} fields populated into Form AOC-4.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19b. Directly populate statutory AOC-4 schedules
apiRouter.post('/aoc4/fill-direct', async (req: Request, res: Response) => {
  try {
    let data = req.body.financialData || currentFinancialData;
    if (!data && lastParsedFilePath && fs.existsSync(lastParsedFilePath)) {
      currentFinancialData = excelParserAgent.parseExcelFile(lastParsedFilePath);
      data = currentFinancialData;
    }
    if (!data) {
      return res.status(400).json({ error: 'No financial data available. Parse an Excel file first.' });
    }

    const result = await mcaBrowserAgent.fillAOC4FormDirect(data);
    return res.json({
      ...result,
      session: mcaBrowserAgent.getSession(),
      message: `Directly populated ${result.filledCount} statutory fields.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c. Populate a single section (Section 1: Part A, Section 2: Part B, Section 3: Part C)
apiRouter.post('/aoc4/fill-section', async (req: Request, res: Response) => {
  try {
    const { section, financialData, cin } = req.body;
    const targetCin = cin || financialData?.companyInfo?.cin || clientIsolationService.getActiveCin();

    // Load data strictly from the isolated client workspace
    let data = clientIsolationService.getClientMappingState(targetCin);
    if (!data) {
      data = financialData || currentFinancialData;
    }

    // Safety Interlock: Verify that active browser portal tab matches this client's CIN
    const activeSession = mcaBrowserAgent.getSession();
    if (activeSession.cin && targetCin && activeSession.cin.trim().toUpperCase() !== targetCin.trim().toUpperCase()) {
      return res.status(403).json({
        error: `CROSS-CLIENT SAFETY INTERLOCK ACTIVATED: The active MCA portal tab is for company '${activeSession.cin}', but the requested client file is for '${targetCin}'. Form filling has been safely aborted to prevent cross-client data contamination.`,
        portalCin: activeSession.cin,
        clientCin: targetCin,
      });
    }

    let result;
    if (section === 'part_a' || section === 'section_1') {
      result = await mcaBrowserAgent.fillSection1Direct(data, targetCin);
    } else if (section === 'part_b' || section === 'section_2') {
      result = await mcaBrowserAgent.fillSection2Direct(data, targetCin);
    } else if (section === 'part_c' || section === 'section_3') {
      result = await mcaBrowserAgent.fillSection3Direct(data, targetCin);
    } else {
      return res.status(400).json({ error: `Unknown section: ${section}. Expected part_a, part_b, or part_c.` });
    }

    // Append audit log strictly to this client's isolated file
    clientIsolationService.appendClientAudit(targetCin, {
      action: 'fill_section',
      section,
      filledCount: result.filledCount,
      errorCount: result.errors?.length || 0,
    });

    return res.json({
      ...result,
      section,
      cin: targetCin,
      session: mcaBrowserAgent.getSession(),
      message: `Successfully populated ${result.filledCount} fields in ${section} for isolated client ${targetCin}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c1a. List all isolated client workspaces
apiRouter.get('/clients', (_req: Request, res: Response) => {
  try {
    const clients = clientIsolationService.listClients();
    return res.json({ clients, activeCin: clientIsolationService.getActiveCin() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c1b. Switch active client workspace
apiRouter.post('/clients/active', (req: Request, res: Response) => {
  try {
    const { cin } = req.body;
    if (!cin) return res.status(400).json({ error: 'Missing CIN' });
    clientIsolationService.setActiveCin(cin);
    return res.json({ success: true, activeCin: clientIsolationService.getActiveCin() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c1c. Create a new isolated client workspace
apiRouter.post('/clients/create', (req: Request, res: Response) => {
  try {
    const { cin, companyName, seedData } = req.body;
    if (!cin) return res.status(400).json({ error: 'Missing CIN' });
    const clientDir = clientIsolationService.ensureClientWorkspace(cin, companyName, seedData);
    clientIsolationService.setActiveCin(cin);
    return res.json({ success: true, cin, clientDir, message: `Created isolated client workspace for ${cin}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c2. Get editable statutory mapping state (Current vs Previous reporting periods) strictly per client
apiRouter.get('/aoc4/mapping-state', (req: Request, res: Response) => {
  try {
    const cin = (req.query.cin as string) || (req.headers['x-client-cin'] as string);
    const state = clientIsolationService.getClientMappingState(cin);
    if (!state) {
      return res.status(404).json({ error: 'Mapping state file not found for client' });
    }
    return res.json({
      success: true,
      ...state,
      mappingState: state,
      financialData: state,
      companyInfo: state.companyInfo,
      partB_balanceSheet: state.partB_balanceSheet,
      partC_profitAndLoss: state.partC_profitAndLoss,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c3. Update statutory mapping state strictly inside isolated client directory
apiRouter.post('/aoc4/mapping-state', (req: Request, res: Response) => {
  try {
    const { mappingState, cin } = req.body;
    if (!mappingState) {
      return res.status(400).json({ error: 'Missing mappingState payload' });
    }
    const targetCin = cin || mappingState.companyInfo?.cin || clientIsolationService.getActiveCin();
    clientIsolationService.saveClientMappingState(targetCin, mappingState);
    return res.json({ success: true, message: `Mapping state saved to isolated workspace for ${targetCin}`, mappingState });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c4. Swap Current and Previous reporting period columns strictly inside isolated client workspace
apiRouter.post('/aoc4/mapping-state/swap-columns', (req: Request, res: Response) => {
  try {
    const cin = (req.query.cin as string) || req.body.cin;
    const targetCin = cin || clientIsolationService.getActiveCin();
    const state = clientIsolationService.getClientMappingState(targetCin);
    if (!state) {
      return res.status(404).json({ error: 'Mapping state file not found' });
    }
    if (Array.isArray(state.partB_balanceSheet)) {
      state.partB_balanceSheet.forEach((row: any) => {
        const temp = row.currentReportingPeriod;
        row.currentReportingPeriod = row.previousReportingPeriod;
        row.previousReportingPeriod = temp;
      });
    }
    if (Array.isArray(state.partC_profitAndLoss)) {
      state.partC_profitAndLoss.forEach((row: any) => {
        const temp = row.currentReportingPeriod;
        row.currentReportingPeriod = row.previousReportingPeriod;
        row.previousReportingPeriod = temp;
      });
    }
    clientIsolationService.saveClientMappingState(targetCin, state);
    return res.json({ success: true, message: `Columns swapped in isolated workspace for ${targetCin}`, mappingState: state });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c5. Get active financial data for extension sync
apiRouter.get('/aoc4/financial-data', async (req: Request, res: Response) => {
  try {
    const cin = (req.query.cin as string) || (req.headers['x-client-cin'] as string);
    const clientState = clientIsolationService.getClientMappingState(cin);
    if (clientState) {
      return res.json({
        success: true,
        financialData: clientState,
        mappingState: clientState,
        companyInfo: clientState.companyInfo,
        partB_balanceSheet: clientState.partB_balanceSheet,
        partC_profitAndLoss: clientState.partC_profitAndLoss,
      });
    }
    if (currentFinancialData) {
      return res.json({ success: true, financialData: currentFinancialData });
    }
    const mappingStatePath = path.resolve(__dirname, '../../data/aoc4_mapping_state.json');
    if (fs.existsSync(mappingStatePath)) {
      const state = JSON.parse(fs.readFileSync(mappingStatePath, 'utf-8'));
      return res.json({
        success: true,
        financialData: state,
        mappingState: state,
        companyInfo: state.companyInfo,
        partB_balanceSheet: state.partB_balanceSheet,
        partC_profitAndLoss: state.partC_profitAndLoss,
      });
    }
    return res.status(404).json({ error: 'No financial data available yet.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c5a. Continuous Observability Live Stream (Zero-latency MJPEG Stream)
apiRouter.get('/aoc4/live-stream', (req: Request, res: Response) => {
  continuousObservability.registerMjpegClient(res);
});

// 19c5b. Continuous Observability Telemetry (FPS, Frame Count, Active Tab URL)
apiRouter.get('/aoc4/live-telemetry', (_req: Request, res: Response) => {
  return res.json(continuousObservability.getTelemetry());
});

// 19c5c. Submit Professional Feedback & Trigger Background Adaptation
apiRouter.post('/aoc4/feedback', async (req: Request, res: Response) => {
  try {
    const result = await professionalFeedbackEngine.processFeedback(req.body);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c5d. Get Professional Feedback History
apiRouter.get('/aoc4/feedback', (_req: Request, res: Response) => {
  return res.json({ history: professionalFeedbackEngine.getHistory() });
});

// 19c6. List all statutory templates
apiRouter.get('/templates', (_req: Request, res: Response) => {
  try {
    const templatesDir = path.resolve(__dirname, '../../data/templates');
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
    const templates = files.map(f => {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(templatesDir, f), 'utf-8'));
        return {
          id: content.id || f.replace('.json', ''),
          name: content.name || f,
          formType: content.formType || 'AOC-4',
          applicableTo: content.applicableTo || 'General Corporate',
          accountingStandard: content.accountingStandard || 'Indian GAAP',
          version: content.version || '1.0',
          description: content.description || '',
          isDefault: !!content.isDefault,
          updatedAt: content.updatedAt || new Date().toISOString(),
          fieldCount: (content.mappingState?.partB_balanceSheet?.length || 0) + (content.mappingState?.partC_profitAndLoss?.length || 0)
        };
      } catch (_) {
        return null;
      }
    }).filter(Boolean);

    return res.json(templates);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c7. Get specific template by ID
apiRouter.get('/templates/:id', (req: Request, res: Response) => {
  try {
    const templatePath = path.resolve(__dirname, '../../data/templates', `${req.params.id}.json`);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: `Template '${req.params.id}' not found` });
    }
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
    return res.json(template);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c8. Create or update template
apiRouter.post('/templates', (req: Request, res: Response) => {
  try {
    const { id, name, formType, applicableTo, accountingStandard, description, mappingState, isDefault } = req.body;
    if (!name || !mappingState) {
      return res.status(400).json({ error: 'Missing template name or mappingState' });
    }
    const templateId = id || name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const templatesDir = path.resolve(__dirname, '../../data/templates');
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
    }
    const template = {
      id: templateId,
      name,
      formType: formType || 'AOC-4',
      applicableTo: applicableTo || 'Private Limited Companies',
      accountingStandard: accountingStandard || 'Indian GAAP / AS (Schedule III)',
      version: '1.0',
      description: description || '',
      isDefault: !!isDefault,
      updatedAt: new Date().toISOString(),
      mappingState
    };
    fs.writeFileSync(path.join(templatesDir, `${templateId}.json`), JSON.stringify(template, null, 2), 'utf-8');
    return res.json({ success: true, message: `Template '${name}' saved successfully`, template });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c9. Apply template to active filing
apiRouter.post('/templates/:id/apply', (req: Request, res: Response) => {
  try {
    const templatePath = path.resolve(__dirname, '../../data/templates', `${req.params.id}.json`);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: `Template '${req.params.id}' not found` });
    }
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
    if (!template.mappingState) {
      return res.status(400).json({ error: 'Template does not contain mappingState' });
    }

    const targetCin = req.body?.cin || (req.query?.cin as string) || clientIsolationService.getActiveCin();

    // Overwrite isolated client workspace mapping state
    clientIsolationService.saveClientMappingState(targetCin, template.mappingState);

    return res.json({
      success: true,
      message: `Template '${template.name}' applied to isolated filing for ${targetCin}. Form filling will now use this template.`,
      mappingState: template.mappingState,
      cin: targetCin
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19c10. Delete custom template
apiRouter.delete('/templates/:id', (req: Request, res: Response) => {
  try {
    const templatePath = path.resolve(__dirname, '../../data/templates', `${req.params.id}.json`);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Template not found' });
    }
    fs.unlinkSync(templatePath);
    return res.json({ success: true, message: `Template '${req.params.id}' deleted` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19d. Inspect section for red borders, missing fields, or portal alert dialogs
apiRouter.get('/aoc4/inspect-section-errors', async (req: Request, res: Response) => {
  try {
    const section = (req.query.section as string) || (req.query.sectionName as string) || 'section_1';
    const check = await mcaBrowserAgent.inspectSectionErrors(section);
    return res.json(check);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19d2. Autonomous Self-Healing: Detect and repair all red validation borders and missing values
apiRouter.post('/aoc4/auto-fix', async (req: Request, res: Response) => {
  try {
    const section = (req.body.section as string) || (req.query.section as string) || 'section_1';
    const result = await mcaBrowserAgent.autoFixSectionIssues(section);
    return res.json({
      ...result,
      session: mcaBrowserAgent.getSession(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19e. Save active section draft with pre and post validation verification
apiRouter.post('/aoc4/save-section', async (req: Request, res: Response) => {
  try {
    const { sectionName } = req.body;
    const result = await mcaBrowserAgent.saveSectionDraft(sectionName || 'Active Section');
    return res.json({
      ...result,
      session: mcaBrowserAgent.getSession(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 19f. Navigate/switch active view to a specific section panel
apiRouter.post('/aoc4/navigate-section', async (req: Request, res: Response) => {
  try {
    const { section } = req.body;
    if (!section) return res.status(400).json({ error: 'Missing section parameter' });
    const result = await mcaBrowserAgent.navigateToSection(section);
    return res.json({
      ...result,
      session: mcaBrowserAgent.getSession(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 20. Capture pre-submit review screenshot
apiRouter.post('/aoc4/review', async (req: Request, res: Response) => {
  try {
    const screenshot = await mcaBrowserAgent.capturePreSubmitReview();
    return res.json({
      screenshot,
      session: mcaBrowserAgent.getSession(),
      message: '⛔ REVIEW REQUIRED: Form filled but NOT submitted. Review in browser and submit manually with DSC.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 20a. Capture section-by-section schedule proof screenshots
apiRouter.post('/aoc4/capture-schedules', async (req: Request, res: Response) => {
  try {
    const screenshots = await mcaBrowserAgent.captureScheduleScreenshots();
    return res.json({
      screenshots,
      session: mcaBrowserAgent.getSession(),
      message: 'Captured schedule-by-schedule proof screenshots for user verification.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 20b. Save draft on MCA portal
apiRouter.post('/aoc4/save-draft', async (req: Request, res: Response) => {
  try {
    const result = await mcaBrowserAgent.saveDraft();
    return res.json({
      ...result,
      session: mcaBrowserAgent.getSession(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 20c. Advance to Step 2 (Attachments) via form toolbar Next button
apiRouter.post('/aoc4/next-step', async (req: Request, res: Response) => {
  try {
    const result = await mcaBrowserAgent.proceedToNextStep();
    return res.json({
      ...result,
      session: mcaBrowserAgent.getSession(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 20d. Inspect My Application > Pending for Action tab in MCA portal
apiRouter.get('/aoc4/check-applications', async (req: Request, res: Response) => {
  try {
    const targetCin = (req.query.cin as string) || currentFinancialData?.companyInfo?.cin;
    const result = await mcaBrowserAgent.checkMyApplications(targetCin);
    // Return without rawHtml in normal response to keep payload small
    const { rawHtml, ...rest } = result as any;
    return res.json(rest);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 20d-debug. Return raw HTML of applications page for debugging selector issues
apiRouter.get('/aoc4/check-applications-debug', async (req: Request, res: Response) => {
  try {
    const result = await mcaBrowserAgent.checkMyApplications();
    return res.json(result); // includes rawHtml for debugging
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 20e. Check Verification tab and upload status
apiRouter.get('/aoc4/verification-status', async (req: Request, res: Response) => {
  try {
    const result = await mcaBrowserAgent.checkVerificationAndUploadStatus();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 21. Get current session status
apiRouter.get('/aoc4/status', async (req: Request, res: Response) => {
  const isLoggedIn = await mcaBrowserAgent.checkIfLoggedIn();
  return res.json({ session: mcaBrowserAgent.getSession(), isLoggedIn });
});

// 21b. Inspect live form DOM elements
apiRouter.get('/aoc4/inspect-dom', async (req: Request, res: Response) => {
  try {
    const elements = await mcaBrowserAgent.inspectFormDOM();
    return res.json({ elements });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 21c. Detailed inspection of Section 1 elements, datatypes, and error states
apiRouter.get('/aoc4/inspect-section1-detailed', async (req: Request, res: Response) => {
  try {
    const data = await mcaBrowserAgent.inspectSection1Detailed();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 22. Abort session
apiRouter.post('/aoc4/abort', async (req: Request, res: Response) => {
  try {
    await mcaBrowserAgent.abort();
    return res.json({ message: 'Session aborted. Browser closed safely.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 23. Get parsed financial data summary
apiRouter.get('/aoc4/financial-data-summary', (req: Request, res: Response) => {
  if (!currentFinancialData) {
    return res.status(404).json({ error: 'No financial data parsed yet.' });
  }
  const summary = excelParserAgent.getSummary(currentFinancialData);
  return res.json({ financialData: currentFinancialData, summary });
});

// 24. Get current mappings
apiRouter.get('/aoc4/mappings', (req: Request, res: Response) => {
  if (!currentMappings || currentMappings.length === 0) {
    return res.status(404).json({ error: 'No mappings generated yet.' });
  }
  const stats = aoc4MapperAgent.getStats(currentMappings);
  const validation = aoc4MapperAgent.validateMappings(currentMappings);
  return res.json({ mappings: currentMappings, stats, validation });
});

// 25. Get discovered attachments in filing directory
apiRouter.get('/aoc4/attachments', (req: Request, res: Response) => {
  try {
    const dir = (req.query.dir as string) || (lastParsedFilePath ? path.dirname(lastParsedFilePath) : '');
    if (!dir || !fs.existsSync(dir)) {
      return res.json({ attachments: [], directory: dir, error: 'Directory not found or not specified.' });
    }

    const files = fs.readdirSync(dir);
    const attachments = files.map(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      const ext = path.extname(file).toLowerCase();
      let category = 'other';

      const lower = file.toLowerCase();
      if (lower.includes('balance') || lower.includes('balancesheet')) {
        category = 'balance_sheet';
      } else if (lower.includes('pandl') || lower.includes('profit') || lower.includes('p&l')) {
        category = 'profit_loss';
      } else if (lower.includes('audit') || lower.includes('auditor')) {
        category = 'auditor_report';
      } else if (lower.includes('annual report') || lower.includes('board') || lower.includes('director')) {
        category = 'board_report';
      } else if (lower.includes('aoc-1') || lower.includes('aoc1')) {
        category = 'aoc_1';
      } else if (lower.includes('aoc-2') || lower.includes('aoc2')) {
        category = 'aoc_2';
      } else if (lower.includes('computation') || lower.includes('itc')) {
        category = 'it_computation';
      }

      return {
        fileName: file,
        filePath: fullPath,
        sizeBytes: stat.size,
        sizeFormatted: `${(stat.size / 1024).toFixed(1)} KB`,
        extension: ext,
        category,
        isPdf: ext === '.pdf',
        isReadyForMCA: ext === '.pdf' && stat.size > 0,
        lastModified: stat.mtime.toISOString(),
      };
    });

    return res.json({ directory: dir, attachments });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
