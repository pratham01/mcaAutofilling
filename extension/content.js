// ==============================================================================
// MCA AOC-4 Direct Browser Auto-Fill Content Script
// Operates with 100% human-native DOM privileges, bypassing Playwright & bot flags
// Includes MCA Pre-Populated Data Protection to prevent clobbering last year's figures
// ==============================================================================

const FINANCIAL_DATA_DEFAULT = {
  companyInfo: {
    cin: '',
    companyName: '',
    address: '',
    email: '',
    numberOfMembers: '2',
    financialYearFrom: '01/04/2025',
    financialYearTo: '31/03/2026',
    boardMeetingDate: '',
    boardMeetingReportDate: '',
    auditorReportDate: '',
    agmHeld: 'Yes',
    actualAgmDate: '',
    dueAgmDate: '',
    agmExtension: 'No',
    natureOfFinancialStatements: 'Adopted by AGM',
    director1Din: '',
    director1Name: '',
    auditor: {
      count: '1',
      category: 'Firm',
      pan: '',
      name: '',
      frn: '',
      auditorName: '',
      membershipNumber: ''
    }
  },
  balanceSheet: [],
  profitAndLoss: [],
  partB_balanceSheet: [],
  partC_profitAndLoss: []
};

let activeFinancialData = FINANCIAL_DATA_DEFAULT;
let protectPrePopulated = true; // Statutory safeguard: DO NOT override MCA pre-populated figures

// Synchronize with stored user financial dataset and protection settings
try {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['aoc4_active_financial_data', 'aoc4_protect_prev_year'], (res) => {
      if (res && res.aoc4_active_financial_data) {
        activeFinancialData = res.aoc4_active_financial_data;
        console.log('[AOC-4 Extension] Initialized with stored financial data for:', activeFinancialData.companyInfo?.companyName || activeFinancialData.companyInfo?.cin);
      }
      if (res && typeof res.aoc4_protect_prev_year === 'boolean') {
        protectPrePopulated = res.aoc4_protect_prev_year;
      }
    });

    if (chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
          if (changes.aoc4_active_financial_data) {
            activeFinancialData = changes.aoc4_active_financial_data.newValue || FINANCIAL_DATA_DEFAULT;
            console.log('[AOC-4 Extension] Active data updated from storage for:', activeFinancialData.companyInfo?.companyName || activeFinancialData.companyInfo?.cin);
          }
          if (changes.aoc4_protect_prev_year) {
            protectPrePopulated = changes.aoc4_protect_prev_year.newValue !== false;
            console.log('[AOC-4 Extension] Pre-populated data protection toggle changed to:', protectPrePopulated);
          }
        }
      });
    }
  }
} catch (e) {
  console.warn('[AOC-4 Extension] Storage sync error:', e);
}

// ─── HELPER: CHECK IF A FIELD IS PRE-POPULATED BY MCA PORTAL ─────────────────
function isFieldPrePopulated(el) {
  if (!el) return false;
  // If disabled or read-only, it is locked or auto-managed by MCA
  if (el.disabled || el.readOnly) return true;
  if (el.classList && (el.classList.contains('guideDisabled') || el.classList.contains('prefilled') || el.classList.contains('af-disabled'))) {
    return true;
  }

  // Check input / textarea value
  if (el instanceof HTMLInputElement || el.tagName === 'INPUT' || el instanceof HTMLTextAreaElement || el.tagName === 'TEXTAREA') {
    const val = (el.value !== undefined && el.value !== null) ? String(el.value).trim() : '';
    // A non-empty value indicates the portal pre-filled it (from master database or prior year filing)
    return val !== '';
  }

  // Check select element
  if (el instanceof HTMLSelectElement || el.tagName === 'SELECT') {
    return el.selectedIndex > 0 && el.value !== '';
  }

  // For display / text nodes
  const text = (el.textContent || '').trim();
  return text !== '';
}

// ─── ENSURE FINANCIAL DATA IS LOADED (FALLBACK TO BACKEND) ───────────────────
async function ensureFinancialDataLoaded() {
  const hasBs = (activeFinancialData?.partB_balanceSheet && activeFinancialData.partB_balanceSheet.length > 0) ||
                (activeFinancialData?.balanceSheet && activeFinancialData.balanceSheet.length > 0);
  if (activeFinancialData && activeFinancialData.companyInfo?.cin && hasBs) {
    return activeFinancialData;
  }

  try {
    const portalCinEl = document.querySelector('#CIN, #cin, input[name*="cin" i]');
    const portalCin = portalCinEl ? (portalCinEl.value || portalCinEl.innerText || '').trim().toUpperCase() : '';
    const url = portalCin 
      ? `http://localhost:3001/api/aoc4/mapping-state?cin=${encodeURIComponent(portalCin)}`
      : 'http://localhost:3001/api/aoc4/mapping-state';

    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      const raw = data.mappingState || data.financialData || data;
      if (raw && (raw.partB_balanceSheet || raw.balanceSheet)) {
        activeFinancialData = raw;
        console.log('[AOC-4 Extension] Auto-fetched client mapping from backend for:', raw.companyInfo?.companyName || raw.companyInfo?.cin);
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ aoc4_active_financial_data: raw });
        }
      }
    }
  } catch (err) {
    console.warn('[AOC-4 Extension] Fallback backend fetch note:', err.message);
  }
  return activeFinancialData;
}

// Safe native element value setter that works with AEM, React & Angular
function setFieldValue(el, val) {
  if (!el || val === undefined || val === null) return false;
  try {
    if (typeof el.focus === 'function') el.focus();
    let strVal = String(val);

    // Convert DD/MM/YYYY to YYYY-MM-DD for native input fields to match AEM
    if (/^(\d{2})\/(\d{2})\/(\d{4})$/.test(strVal)) {
      strVal = strVal.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1');
    }

    if (el instanceof HTMLInputElement || el.tagName === 'INPUT' || el instanceof HTMLTextAreaElement || el.tagName === 'TEXTAREA') {
      const proto = (el instanceof HTMLInputElement || el.tagName === 'INPUT') 
        ? window.HTMLInputElement?.prototype 
        : window.HTMLTextAreaElement?.prototype;
      const nativeSetter = proto ? Object.getOwnPropertyDescriptor(proto, 'value')?.set : null;
      if (nativeSetter) {
        nativeSetter.call(el, strVal);
      } else {
        el.value = strVal;
      }
      el.setAttribute('value', strVal);
    } else if (el instanceof HTMLSelectElement || el.tagName === 'SELECT') {
      el.value = strVal;
      const matchingOpt = Array.from(el.options || []).find(o => 
        (o.value || '').toLowerCase() === strVal.toLowerCase() || 
        (o.text || '').toLowerCase().includes(strVal.toLowerCase())
      );
      if (matchingOpt) {
        el.value = matchingOpt.value;
      }
    } else {
      el.textContent = strVal;
      el.innerText = strVal;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    try { el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: strVal })); } catch (_) {}
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));

    if (window.$) {
      try { window.$(el).val(strVal).trigger('input').trigger('change').trigger('blur'); } catch (_) {}
    }

    // AEM GuideBridge State Sync (Direct & via PageBridge CustomEvent in Main World)
    const wrapper = el.closest('.guideFieldNode, [data-som-expression], [data-guide-som]') || el;
    const som = wrapper.getAttribute('data-som-expression') ||
                wrapper.getAttribute('data-guide-som') ||
                el.getAttribute('data-som-expression') ||
                el.getAttribute('data-guide-som') ||
                el.id.replace(/___widget$/, '');
    if (som) {
      try {
        window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_SET_VALUE', {
          detail: { somOrId: som, value: strVal }
        }));
      } catch (_) {}
    }
    if (window.guideBridge && typeof window.guideBridge.resolveNode === 'function' && som) {
      try {
        const node = window.guideBridge.resolveNode(som) || window.guideBridge.resolveNode(el.id.replace(/___widget$/, ''));
        if (node && 'value' in node) {
          node.value = strVal;
          if (typeof node.validate === 'function') node.validate();
          if (typeof node.trigger === 'function') node.trigger('change');
        }
      } catch (_) {}
    }
    return true;
  } catch (err) {
    console.error('[AOC-4 Extension] setFieldValue error:', err);
    return false;
  }
}

// ─── CROSS-CLIENT ISOLATION INTERLOCK ─────────────────────────────────────────
function checkCrossClientSafety(clientData) {
  try {
    const portalCinEl = document.querySelector('#CIN, #cin, input[name*="cin" i], [id*="cin" i]');
    const portalCin = portalCinEl ? (portalCinEl.value || portalCinEl.innerText || '').trim().toUpperCase() : '';
    const clientCin = (clientData?.companyInfo?.cin || activeFinancialData?.companyInfo?.cin || '').trim().toUpperCase();

    if (portalCin && clientCin && portalCin !== clientCin) {
      const msg = `CRITICAL CROSS-CLIENT SAFETY BLOCK:\n\nThe active MCA portal page is for company CIN: '${portalCin}', but your selected client file in the extension is for CIN: '${clientCin}'.\n\nAuto-fill has been safely halted to prevent cross-client data contamination.`;
      alert(msg);
      console.error('[AOC-4 Extension] ' + msg);
      return false;
    }
  } catch (err) {
    console.warn('[AOC-4 Extension] Safety check error:', err);
  }
  return true;
}

function setRadioChecked(radio, checked = true) {
  if (!radio) return false;
  try {
    radio.checked = checked;
    if (checked) radio.setAttribute('checked', 'checked');
    radio.dispatchEvent(new Event('click', { bubbles: true }));
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    if (window.$) {
      try { window.$(radio).prop('checked', checked).trigger('change').trigger('click'); } catch (_) {}
    }
    if (checked) {
      const som = radio.getAttribute('data-som-expression') || radio.id;
      const val = radio.value !== undefined && radio.value !== '' ? radio.value : (radio.id.includes('-1') ? '0' : '1');
      if (som) {
        try {
          window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_SET_VALUE', {
            detail: { somOrId: som, value: val }
          }));
        } catch (_) {}
      }
    }
    return true;
  } catch (err) {
    console.error('[AOC-4 Extension] setRadioChecked error:', err);
    return false;
  }
}

function findWidgetElement(partialId) {
  if (!partialId) return null;
  const cleanId = partialId.replace(/^#/, '');

  // 1. Exact ID
  let el = document.getElementById(cleanId);
  if (el) return el;

  // 2. Query by substring
  try {
    el = document.querySelector(`[id*="${cleanId}"]`);
    if (el) return el;
  } catch (_) {}

  // 3. Match by distinctive widget triplet suffix
  const parts = cleanId.split('-');

  // Specific table row items (contain unique timestamps like Row1643805949296)
  if (cleanId.includes('tableItem') || cleanId.includes('Row1')) {
    const rowItem = parts.slice(-2).join('-');
    el = Array.from(document.querySelectorAll('input, select, textarea')).find(e => e.id && e.id.includes(rowItem));
    if (el) return el;
  }

  // Triplet matching for Section 1 fields
  if (parts.length >= 3) {
    const triplet = parts.slice(-3).join('-');
    el = Array.from(document.querySelectorAll('input, select, textarea')).find(e => e.id && e.id.includes(triplet));
    if (el) return el;
  }

  return null;
}

function revealPanel(panelId) {
  const node = document.querySelector(`[id*="${panelId}"]`);
  if (node) {
    let curr = node;
    while (curr && curr !== document.body) {
      if (curr.style) {
        curr.style.display = 'block';
        curr.style.visibility = 'visible';
      }
      curr = curr.parentElement;
    }
    node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ─── SECTION 1 AUTOFILL FUNCTION ─────────────────────────────────────────────
function fillSection1(data = activeFinancialData, options = {}) {
  const shouldProtect = options.protectPrevYear !== undefined ? options.protectPrevYear : protectPrePopulated;
  if (!checkCrossClientSafety(data)) return { results: ['Cross-client safety check failed'], filledCount: 0, protectedCount: 0 };
  console.log('[AOC-4 Extension] Starting Section 1 (Part A) Autofill... (Protect Pre-Populated:', shouldProtect, ')');
  const ci = (data && data.companyInfo) || activeFinancialData.companyInfo || FINANCIAL_DATA_DEFAULT.companyInfo;
  const results = [];
  let filledCount = 0;
  let protectedCount = 0;

  revealPanel('panel1AOC4');

  // 1(a) CIN
  const cinEl = findWidgetElement('panel1AOC4-panel-panel-guidetextbox___widget') ||
                findWidgetElement('panel1AOC4-panel-panel-panel-guidedropdownlist_co___widget') ||
                document.querySelector('#CIN, #cin, input[name*="cin" i]');
  if (cinEl && ci.cin) {
    setFieldValue(cinEl, ci.cin);
    results.push('1(a) CIN: ' + ci.cin);
    filledCount++;

    // Trigger MCA prefill search
    const searchBtn = document.getElementById('autoSearchIcon') ||
                      document.querySelector('[id*="autoSearchIcon"]') ||
                      Array.from(document.querySelectorAll('button')).find(b => {
                        const t = (b.innerText || b.textContent || '').toLowerCase();
                        return t.includes('search') || t.includes('pre-fill') || t.includes('prefill');
                      });
    if (searchBtn) {
      try { searchBtn.click(); } catch (_) {}
    }
  }

  // Helper to fill or protect master data fields
  const fillOrProtect = (el, val, label) => {
    if (!el) return;
    if (shouldProtect && isFieldPrePopulated(el)) {
      results.push(`[PROTECTED] ${label}: Preserved MCA pre-fill ('${el.value || el.textContent}')`);
      protectedCount++;
    } else if (val) {
      setFieldValue(el, val);
      results.push(`${label}: ${val}`);
      filledCount++;
    }
  };

  // 1(c) Number of Members
  const memberEl = Array.from(document.querySelectorAll('input')).find(i => {
    const r = i.closest('tr, [class*="row" i], .guidePanelNode, div');
    const t = (r?.textContent || '').toLowerCase();
    return t.includes('number of members') || t.includes('members of the company');
  });
  if (memberEl) fillOrProtect(memberEl, ci.numberOfMembers, '1(c) Members');

  // 2(a) Company Name
  const nameEl = findWidgetElement('panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy___widget');
  fillOrProtect(nameEl, ci.companyName, '2(a) Company Name');

  // 2(b) Address
  const addrEl = findWidgetElement('panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy_673278796___widget');
  fillOrProtect(addrEl, ci.address, '2(b) Address');

  // 2(c) Email
  const emailEl = findWidgetElement('panel1AOC4-panel_478261092-panel_252196987-guidetextbox_copy_375806483___widget');
  fillOrProtect(emailEl, ci.email, '2(c) Email');

  // 3 Financial Year From & To
  const fyFrom = findWidgetElement('panel1AOC4-panel_478261092_copy-panel_252196987-guidetextbox_copy___widget');
  if (fyFrom && ci.financialYearFrom) { setFieldValue(fyFrom, ci.financialYearFrom); results.push('3 FY From: ' + ci.financialYearFrom); filledCount++; }

  const fyTo = findWidgetElement('panel1AOC4-panel_478261092_copy-panel_252196987-guidetextbox_copy_673278796___widget');
  if (fyTo && ci.financialYearTo) { setFieldValue(fyTo, ci.financialYearTo); results.push('3 FY To: ' + ci.financialYearTo); filledCount++; }

  // 4(a) Board meeting date
  const bmDate = findWidgetElement('panel1AOC4-panel_2074267803-panel_478261092_copy_1688980105-guidetextbox_copy_co___widget');
  if (bmDate && ci.boardMeetingDate) { setFieldValue(bmDate, ci.boardMeetingDate); results.push('4(a) BM Date: ' + ci.boardMeetingDate); filledCount++; }

  // 4(b) Nature of Financial Statements
  const natureSelect = findWidgetElement('panel1AOC4-panel_2074267803-panel_478261092_copy_1688980105-panel_252196987-guidetextbox_copy___widget') ||
                       document.querySelector('select[name*="nature" i]');
  if (natureSelect) {
    if (natureSelect.tagName === 'SELECT') {
      const opt = Array.from(natureSelect.options || []).find(o => 
        (o.text || '').toLowerCase().includes('adopted by agm') || 
        (o.value || '').toLowerCase().includes('adopted')
      );
      if (opt) {
        natureSelect.value = opt.value;
        natureSelect.dispatchEvent(new Event('change', { bubbles: true }));
        results.push('4(b) Nature: ' + opt.text);
        filledCount++;
      } else if (natureSelect.options && natureSelect.options.length > 2) {
        natureSelect.selectedIndex = 2;
        natureSelect.value = natureSelect.options[2].value;
        natureSelect.dispatchEvent(new Event('change', { bubbles: true }));
        results.push('4(b) Nature: ' + natureSelect.options[2].text);
        filledCount++;
      }
    } else {
      setFieldValue(natureSelect, 'Adopted by AGM');
      results.push('4(b) Nature: Adopted by AGM');
      filledCount++;
    }
  }

  // 5(a) Board Report Approval Date
  const brDate = findWidgetElement('panel1AOC4-panel_2074267803_cop-panel_478261092_copy-guidetextbox_copy_co___widget');
  if (brDate && ci.boardMeetingReportDate) { setFieldValue(brDate, ci.boardMeetingReportDate); results.push('5(a) Report BM Date: ' + ci.boardMeetingReportDate); filledCount++; }

  // 6 Auditor Report Date
  const audDate = findWidgetElement('panel1AOC4-panel_2074267803_cop_606137638-guidedatepicker_423285079___widget');
  if (audDate && ci.auditorReportDate) { setFieldValue(audDate, ci.auditorReportDate); results.push('6 Auditor Report Date: ' + ci.auditorReportDate); filledCount++; }

  // 7(a) AGM Held: Yes
  const agmYes = document.querySelector('[id*="cop_606137638-panel_478261092_copy-guideradiobutton__-1_widget"]') ||
                 document.querySelector('input[type="radio"][value="Yes"], input[type="radio"][value="0"]');
  if (agmYes) { setRadioChecked(agmYes, true); results.push('7(a) AGM Held: Yes'); filledCount++; }

  // 7(b) Actual Date of AGM
  const agmDateEl = findWidgetElement('panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidetextbox_copy_co___widget');
  if (agmDateEl && ci.actualAgmDate) { setFieldValue(agmDateEl, ci.actualAgmDate); results.push('7(b) Actual AGM Date: ' + ci.actualAgmDate); filledCount++; }

  // 7(c) Due Date of AGM
  const agmDueDateEl = findWidgetElement('panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidetextbox_copy_co_87220494___widget') ||
                       findWidgetElement('panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidedatepicker_copy_2069002018___widget');
  if (agmDueDateEl && ci.dueAgmDate) { setFieldValue(agmDueDateEl, ci.dueAgmDate); results.push('7(c) Due AGM Date: ' + ci.dueAgmDate); filledCount++; }

  // 7(d) Extension for AGM: No
  const extNo = document.querySelector('[id*="cop_606137638-panel_478261092_copy-guideradiobutton_cop__-2_widget"]') ||
                document.querySelector('input[type="radio"][value="No"], input[type="radio"][value="2"]');
  if (extNo) { setRadioChecked(extNo, true); results.push('7(d) AGM Extension: No'); filledCount++; }

  // 8 Subsidiary / JV: No
  const subRadios = [
    '#guideContainer-rootPanel-panel-panel-panel2AOC4-panel_2074267803_cop_385433263-panel_478261092_copy-guideradiobutton__-2_widget',
    '#guideContainer-rootPanel-panel-panel-panel2AOC4-panel_2074267803_cop_2081672660-panel_478261092_copy-guideradiobutton__-2_widget',
    '#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guideradiobutton_cop___widget',
    '#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guideradiobutton_cop_662366887___widget'
  ];
  for (const s of subRadios) {
    const r = document.querySelector(s);
    if (r) setRadioChecked(r, true);
  }

  // Director 1 Details
  const din1 = findWidgetElement('panel1AOC4-panel_2074267803-panel_478261092_copy_1688980105-table-Row1-tableItem1___widget');
  if (din1 && ci.director1Din) { setFieldValue(din1, ci.director1Din); results.push('Director 1 DIN'); filledCount++; }

  const dirName1 = findWidgetElement('panel1AOC4-panel_2074267803-panel_478261092_copy_1688980105-table-Row1-headerItem1643788021607___widget');
  if (dirName1 && ci.director1Name) { setFieldValue(dirName1, ci.director1Name); results.push('Director 1 Name'); filledCount++; }

  // Auditor Details
  const aud = ci.auditor || {};
  const numAud = findWidgetElement('panel2AOC4-panel_1603825367-guidetextbox___widget');
  if (numAud) { setFieldValue(numAud, aud.count || '1'); results.push('Auditor Count: 1'); filledCount++; }

  const audFirmRadio = document.querySelector('[id*="panel2AOC4-panel_1603825367-panel-guideradiobutton__-2_widget"]');
  if (audFirmRadio) setRadioChecked(audFirmRadio, true);

  const audPan = findWidgetElement('panel2AOC4-panel_1603825367-panel-guidetextbox_1445978033___widget');
  if (audPan && aud.pan) { setFieldValue(audPan, aud.pan); results.push('Auditor PAN'); filledCount++; }

  const audName = findWidgetElement('panel2AOC4-panel_1603825367-panel-guidetextbox_411574882___widget');
  if (audName && aud.name) { setFieldValue(audName, aud.name); results.push('Auditor Name'); filledCount++; }

  const audFrn = findWidgetElement('panel2AOC4-panel_1603825367-panel-guidetextbox_1212875133___widget');
  if (audFrn && aud.frn) { setFieldValue(audFrn, aud.frn); results.push('Auditor FRN'); filledCount++; }

  const audMem = findWidgetElement('panel2AOC4-panel_1603825367-panel-guidetextbox_382138727___widget');
  if (audMem && (aud.membershipNo || aud.membershipNumber)) {
    setFieldValue(audMem, aud.membershipNo || aud.membershipNumber);
    results.push('Auditor Membership No');
    filledCount++;
  }

  console.log(`[AOC-4 Extension] Section 1 complete. Filled: ${filledCount}, Preserved: ${protectedCount}`);
  return { results, filledCount, protectedCount };
}

// ─── SECTION 2 AUTOFILL FUNCTION (BALANCE SHEET) ──────────────────────────────
function fillSection2(data = activeFinancialData, options = {}) {
  const shouldProtect = options.protectPrevYear !== undefined ? options.protectPrevYear : protectPrePopulated;
  if (!checkCrossClientSafety(data)) return { results: ['Cross-client safety check failed'], filledCount: 0, protectedCount: 0 };
  console.log('[AOC-4 Extension] Starting Section 2 (Balance Sheet) Autofill... (Protect Pre-Populated:', shouldProtect, ')');
  const results = [];
  let filledCount = 0;
  let protectedCount = 0;
  revealPanel('panel3AOC4');

  // Case A: Rich Schedule III partB_balanceSheet array
  if (data && Array.isArray(data.partB_balanceSheet) && data.partB_balanceSheet.length > 0) {
    for (const item of data.partB_balanceSheet) {
      // 1. Current Reporting Period (Always populate from client financials)
      if (item.currentSelector && item.currentReportingPeriod !== undefined && item.currentReportingPeriod !== '') {
        const curEl = findWidgetElement(item.currentSelector);
        if (curEl) {
          setFieldValue(curEl, item.currentReportingPeriod);
          results.push(`${item.label} (Current): ${item.currentReportingPeriod}`);
          filledCount++;
        }
      }

      // 2. Previous Reporting Period (Check protection)
      if (item.previousSelector) {
        const prevEl = findWidgetElement(item.previousSelector);
        if (prevEl) {
          if (shouldProtect && isFieldPrePopulated(prevEl)) {
            // Field is already auto-populated by MCA from last year's filing -> KEEP IT!
            results.push(`[PROTECTED] ${item.label} (Prev): Preserved MCA figure ('${prevEl.value || prevEl.textContent}')`);
            protectedCount++;
          } else if (item.previousReportingPeriod !== undefined && item.previousReportingPeriod !== '') {
            // Portal didn't pre-populate or protection disabled -> fill from dataset
            setFieldValue(prevEl, item.previousReportingPeriod);
            results.push(`${item.label} (Prev): ${item.previousReportingPeriod}`);
            filledCount++;
          }
        }
      }
    }
  } else {
    // Case B: Legacy 20-tuple fallback
    const bs = (data && data.balanceSheet) || activeFinancialData.balanceSheet || FINANCIAL_DATA_DEFAULT.balanceSheet || [];
    for (const [sel, val, lbl] of bs) {
      const el = findWidgetElement(sel);
      if (el) {
        const isPrev = lbl.includes('(Prev)');
        if (isPrev && shouldProtect && isFieldPrePopulated(el)) {
          results.push(`[PROTECTED] ${lbl}: Preserved MCA figure ('${el.value || el.textContent}')`);
          protectedCount++;
        } else {
          setFieldValue(el, val);
          results.push(`${lbl}: ${val}`);
          filledCount++;
        }
      }
    }
  }

  console.log(`[AOC-4 Extension] Section 2 complete. Filled: ${filledCount}, Preserved: ${protectedCount}`);
  return { results, filledCount, protectedCount };
}

// ─── SECTION 3 AUTOFILL FUNCTION (PROFIT & LOSS) ──────────────────────────────
function fillSection3(data = activeFinancialData, options = {}) {
  const shouldProtect = options.protectPrevYear !== undefined ? options.protectPrevYear : protectPrePopulated;
  if (!checkCrossClientSafety(data)) return { results: ['Cross-client safety check failed'], filledCount: 0, protectedCount: 0 };
  console.log('[AOC-4 Extension] Starting Section 3 (Profit & Loss) Autofill... (Protect Pre-Populated:', shouldProtect, ')');
  const results = [];
  let filledCount = 0;
  let protectedCount = 0;
  revealPanel('panel6AOC4');

  // Case A: Rich Schedule III partC_profitAndLoss array
  if (data && Array.isArray(data.partC_profitAndLoss) && data.partC_profitAndLoss.length > 0) {
    for (const item of data.partC_profitAndLoss) {
      // 1. Current Reporting Period (Always populate from client financials)
      if (item.currentSelector && item.currentReportingPeriod !== undefined && item.currentReportingPeriod !== '') {
        const curEl = findWidgetElement(item.currentSelector);
        if (curEl) {
          setFieldValue(curEl, item.currentReportingPeriod);
          results.push(`${item.label} (Current): ${item.currentReportingPeriod}`);
          filledCount++;
        }
      }

      // 2. Previous Reporting Period (Check protection)
      if (item.previousSelector) {
        const prevEl = findWidgetElement(item.previousSelector);
        if (prevEl) {
          if (shouldProtect && isFieldPrePopulated(prevEl)) {
            // Field is already auto-populated by MCA from last year's filing -> KEEP IT!
            results.push(`[PROTECTED] ${item.label} (Prev): Preserved MCA figure ('${prevEl.value || prevEl.textContent}')`);
            protectedCount++;
          } else if (item.previousReportingPeriod !== undefined && item.previousReportingPeriod !== '') {
            // Portal didn't pre-populate or protection disabled -> fill from dataset
            setFieldValue(prevEl, item.previousReportingPeriod);
            results.push(`${item.label} (Prev): ${item.previousReportingPeriod}`);
            filledCount++;
          }
        }
      }
    }
  } else {
    // Case B: Legacy 20-tuple fallback
    const pl = (data && data.profitAndLoss) || activeFinancialData.profitAndLoss || FINANCIAL_DATA_DEFAULT.profitAndLoss || [];
    for (const [sel, val, lbl] of pl) {
      const el = findWidgetElement(sel);
      if (el) {
        const isPrev = lbl.includes('(Prev)');
        if (isPrev && shouldProtect && isFieldPrePopulated(el)) {
          results.push(`[PROTECTED] ${lbl}: Preserved MCA figure ('${el.value || el.textContent}')`);
          protectedCount++;
        } else {
          setFieldValue(el, val);
          results.push(`${lbl}: ${val}`);
          filledCount++;
        }
      }
    }
  }

  console.log(`[AOC-4 Extension] Section 3 complete. Filled: ${filledCount}, Preserved: ${protectedCount}`);
  return { results, filledCount, protectedCount };
}

// ─── HELPER: DELAY UTILITY ────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── FIX 2: GUIDEBRIDGE READY GUARD ──────────────────────────────────────────
// Waits for pageBridge.js (MAIN world) to signal GuideBridge is connected.
// This ensures all value bindings reach AEM's internal form model (Layer 2),
// not just the visible DOM (Layer 1).
let _guideBridgeReady = false;
window.addEventListener('MCA_AOC4_GB_READY', (e) => {
  _guideBridgeReady = true;
  console.log('[AOC-4 Extension] GuideBridge ready signal received.', e.detail);
});

function waitForGuideBridgeReady(timeoutMs = 15000) {
  if (_guideBridgeReady) return Promise.resolve(true);
  return new Promise((resolve) => {
    const start = Date.now();
    const handler = () => {
      _guideBridgeReady = true;
      window.removeEventListener('MCA_AOC4_GB_READY', handler);
      resolve(true);
    };
    window.addEventListener('MCA_AOC4_GB_READY', handler);
    // Also fire a status check to see if it's already ready
    try { window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_STATUS_CHECK')); } catch (_) {}
    // Timeout fallback — proceed with DOM-only if GuideBridge never initializes
    const checkTimeout = () => {
      if (_guideBridgeReady) return;
      if (Date.now() - start >= timeoutMs) {
        console.warn('[AOC-4 Extension] GuideBridge ready timeout after', timeoutMs, 'ms. Proceeding with DOM-only.');
        window.removeEventListener('MCA_AOC4_GB_READY', handler);
        resolve(false);
      } else {
        setTimeout(checkTimeout, 500);
      }
    };
    setTimeout(checkTimeout, 500);
  });
}

// ─── FIX 3: PER-SECTION SAVE + NAVIGATE ──────────────────────────────────────
// MCA AOC-4 requires: Fill Section → Save Section → Navigate to Next Section.
// Without saving each section, the portal doesn't persist partial state.
async function saveAndNavigateSection(sectionPanelId, nextPanelId) {
  console.log(`[AOC-4 Extension] Saving section ${sectionPanelId} and navigating to ${nextPanelId || 'next'}...`);

  // 1. Force DOM-to-GuideBridge sweep sync, then validate
  try {
    window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_SYNC_ALL'));
    window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_CALCULATE'));
    window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_COMMIT'));
    window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_VALIDATE'));
  } catch (_) {}
  await delay(800);

  // 2. Try the section-level save+navigate via PageBridge (MAIN world GuideBridge access)
  const sectionSaveResult = await new Promise((resolve) => {
    const handler = (e) => {
      window.removeEventListener('MCA_AOC4_GB_SECTION_SAVE_RESULT', handler);
      resolve(e.detail || { success: false });
    };
    window.addEventListener('MCA_AOC4_GB_SECTION_SAVE_RESULT', handler);
    try {
      window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_SECTION_SAVE', {
        detail: { sectionPanelId, nextPanelId }
      }));
    } catch (_) {}
    // Timeout if PageBridge doesn't respond
    setTimeout(() => {
      window.removeEventListener('MCA_AOC4_GB_SECTION_SAVE_RESULT', handler);
      resolve({ success: false, message: 'PageBridge section save timeout' });
    }, 5000);
  });

  if (sectionSaveResult.success) {
    console.log(`[AOC-4 Extension] Section save+navigate succeeded via ${sectionSaveResult.method}`);
    await delay(2500); // Wait for MCA portal to process the section transition
    return sectionSaveResult;
  }

  // 3. Fallback: Try clicking section navigation buttons directly from content script
  console.log('[AOC-4 Extension] PageBridge section save fallback — trying DOM-level button click...');

  const sectionPanel = sectionPanelId ? document.querySelector(`[id*="${sectionPanelId}"]`) : null;
  let nextBtn = null;

  if (sectionPanel) {
    // MCA uses "nextItemNav" or "mca_button" buttons at the bottom of each section
    nextBtn = sectionPanel.querySelector('[id*="nextitemnav" i]') ||
              sectionPanel.querySelector('[id*="nextItemNav"]') ||
              sectionPanel.querySelector('[id*="mca_button___widget"]');

    if (!nextBtn) {
      const buttons = Array.from(sectionPanel.querySelectorAll('button, input[type="button"]'));
      nextBtn = buttons.find(b => {
        const t = (b.innerText || b.textContent || '').trim().toLowerCase();
        return t.includes('save and next') || t.includes('save & next') || t === 'next';
      });
    }
  }

  // Try tab-level navigation as another fallback
  if (!nextBtn && nextPanelId) {
    const nextTab = document.querySelector(`[id*="${nextPanelId}"]`);
    if (nextTab) {
      const tabLink = nextTab.closest('[role="tab"]') ||
                      nextTab.querySelector('a, button') ||
                      nextTab;
      nextBtn = tabLink;
    }
  }

  if (nextBtn) {
    nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    nextBtn.click();
    console.log(`[AOC-4 Extension] Clicked section button: ${nextBtn.id || 'unknown'}`);
    await delay(3000); // Wait for MCA validation and transition
    return { success: true, method: 'domButtonClick', id: nextBtn.id };
  }

  // 4. Last resort: just click global save
  console.log('[AOC-4 Extension] No section button found, falling back to global save...');
  const globalResult = triggerGlobalSaveDraft();
  await delay(3000);
  return globalResult;
}

// ─── SEQUENTIAL FILL → SAVE → NAVIGATE PIPELINE ──────────────────────────────
// This is the corrected flow that MCA requires:
// Fill Section 1 → Wait → Save & Navigate → Fill Section 2 → Wait → Save & Navigate → ...
async function sequentialFillAllSections(data, opts) {
  console.log('[AOC-4 Extension] ═══════════════════════════════════════════');
  console.log('[AOC-4 Extension] Starting Sequential Fill → Save → Next Pipeline');
  console.log('[AOC-4 Extension] ═══════════════════════════════════════════');

  const results = { section1: null, section2: null, section3: null, saves: [] };

  // Wait for GuideBridge to be ready before starting
  const gbReady = await waitForGuideBridgeReady(10000);
  console.log(`[AOC-4 Extension] GuideBridge ready: ${gbReady}`);

  // Step 1: Fill Part A (Section 1) → Wait for GuideBridge digest → Save & Navigate
  console.log('[AOC-4 Extension] ── Step 1/3: Filling Part A (General Info) ──');
  results.section1 = fillSection1(data, opts);
  await delay(2000); // Let GuideBridge absorb all values

  const save1 = await saveAndNavigateSection('panel1AOC4', 'panel3AOC4');
  results.saves.push({ section: 'Part A', ...save1 });

  // Step 2: Fill Part B (Balance Sheet) → Wait → Save & Navigate
  console.log('[AOC-4 Extension] ── Step 2/3: Filling Part B (Balance Sheet) ──');
  results.section2 = fillSection2(data, opts);
  await delay(2000);

  const save2 = await saveAndNavigateSection('panel3AOC4', 'panel6AOC4');
  results.saves.push({ section: 'Part B (BS)', ...save2 });

  // Step 3: Fill Part C (Profit & Loss) → Wait → Final Global Save
  console.log('[AOC-4 Extension] ── Step 3/3: Filling Part C (Profit & Loss) ──');
  results.section3 = fillSection3(data, opts);
  await delay(2000);

  // Final global save to persist everything
  const finalSave = triggerGlobalSaveDraft();
  results.saves.push({ section: 'Final Global Save', ...finalSave });

  const totalFilled = (results.section1?.filledCount || 0) +
                      (results.section2?.filledCount || 0) +
                      (results.section3?.filledCount || 0);
  const totalProtected = (results.section1?.protectedCount || 0) +
                         (results.section2?.protectedCount || 0) +
                         (results.section3?.protectedCount || 0);

  console.log('[AOC-4 Extension] ═══════════════════════════════════════════');
  console.log(`[AOC-4 Extension] Pipeline Complete! Filled: ${totalFilled}, Protected: ${totalProtected}`);
  console.log(`[AOC-4 Extension] Section saves:`, results.saves);
  console.log('[AOC-4 Extension] ═══════════════════════════════════════════');

  return { totalFilled, totalProtected, results };
}

// ─── GLOBAL SAVE DRAFT TRIGGER ────────────────────────────────────────────────
function triggerGlobalSaveDraft() {
  console.log('[AOC-4 Extension] Triggering Global Save Draft...');

  // 1. Trigger sweep sync and GuideBridge validation first
  try {
    window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_SYNC_ALL'));
    window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_CALCULATE'));
    window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_COMMIT'));
    window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_VALIDATE'));
  } catch (_) {}

  // 2. Try GuideBridge native draft save (via PageBridge in Main World)
  try {
    window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_DRAFT_SAVE'));
  } catch (_) {}

  if (window.guideBridge && typeof window.guideBridge.draftSave === 'function') {
    try {
      window.guideBridge.draftSave();
      return { success: true, method: 'guideBridge.draftSave' };
    } catch (e) {
      console.warn('Guidebridge draftSave error:', e);
    }
  }

  // 3. Click the Bottom Toolbar Global Save button
  const globalSaveBtn = document.querySelector('#guideContainer-rootPanel-panel_622013715-mca_button_copy___widget') ||
                        document.querySelector('[id*="panel_622013715"][id*="mca_button_copy___widget"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => {
                          const t = (b.innerText || b.textContent || '').trim().toLowerCase();
                          const id = (b.id || '').toLowerCase();
                          return (t === 'save' || t === 'save draft') && !id.includes('nextitemnav');
                        });

  if (globalSaveBtn) {
    globalSaveBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    globalSaveBtn.click();
    return { success: true, method: 'globalSaveButton', id: globalSaveBtn.id };
  }

  return { success: false, message: 'Global Save button not found' };
}

// Expose directly on window for browser console debugging and test scripts
window.__MCA_AOC4_AUTOFILL__ = {
  fillSection1,
  fillSection2,
  fillSection3,
  triggerGlobalSaveDraft,
  saveAndNavigateSection,
  sequentialFillAllSections,
  waitForGuideBridgeReady,
  isFieldPrePopulated,
  ensureFinancialDataLoaded,
  getActiveFinancialData: () => activeFinancialData,
  getProtectionState: () => protectPrePopulated,
  setProtectionState: (val) => { protectPrePopulated = !!val; },
  isGuideBridgeReady: () => _guideBridgeReady
};

// ─── FLOATING UI INJECTION ON MCA PORTAL ──────────────────────────────────────
function injectFloatingAssistant() {
  if (document.getElementById('mca-aoc4-autofill-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'mca-aoc4-autofill-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    background: #090d16;
    color: #f8fafc;
    border: 1px solid #1e3a8a;
    border-radius: 12px;
    padding: 16px 18px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.6), 0 8px 10px -6px rgba(0,0,0,0.6);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    width: 300px;
  `;

  panel.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
      <div style="font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
        <span>⚡ FormMind AOC-4 Auto-Filler</span>
      </div>
      <button id="mca-panel-close" style="background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer;">✕</button>
    </div>
    
    <!-- Protection Interlock -->
    <div style="background: #0f1c3f; border: 1px solid #1e40af; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px;">
      <label style="display: flex; align-items: center; gap: 7px; cursor: pointer; font-size: 11px; font-weight: 600; color: #93c5fd;">
        <input type="checkbox" id="mca-panel-chk-protect" ${protectPrePopulated ? 'checked' : ''} style="accent-color: #38bdf8; cursor: pointer;" />
        <span>🛡️ Protect MCA Pre-Filled Data</span>
      </label>
    </div>

    <div style="display: flex; flex-direction: column; gap: 7px;">
      <button id="btn-fill-sec1" style="background: #2563eb; color: #fff; border: none; border-radius: 6px; padding: 7px 12px; font-weight: 600; font-size: 12px; cursor: pointer; text-align: left; display: flex; justify-content: space-between;">
        <span>1. Fill & Save Section 1 (Part A)</span>
        <span>▶</span>
      </button>
      <button id="btn-fill-sec2" style="background: #0284c7; color: #fff; border: none; border-radius: 6px; padding: 7px 12px; font-weight: 600; font-size: 12px; cursor: pointer; text-align: left; display: flex; justify-content: space-between;">
        <span>2. Fill & Save Section 2 (BS)</span>
        <span>▶</span>
      </button>
      <button id="btn-fill-sec3" style="background: #0d9488; color: #fff; border: none; border-radius: 6px; padding: 7px 12px; font-weight: 600; font-size: 12px; cursor: pointer; text-align: left; display: flex; justify-content: space-between;">
        <span>3. Fill & Save Section 3 (P&L)</span>
        <span>▶</span>
      </button>
      <div style="border-top: 1px solid #1e293b; margin: 2px 0;"></div>
      <button id="btn-fill-all" style="background: linear-gradient(135deg, #16a34a, #059669); color: #fff; border: none; border-radius: 6px; padding: 9px 12px; font-weight: 700; font-size: 12px; cursor: pointer; text-align: center;">
        🚀 Sequential Fill → Save → Next (All)
      </button>
      <button id="btn-save-draft" style="background: #334155; color: #fff; border: 1px solid #475569; border-radius: 6px; padding: 7px 12px; font-weight: 600; font-size: 12px; cursor: pointer; text-align: center;">
        💾 Global Save Draft
      </button>
    </div>
    <div id="mca-gb-status" style="margin-top: 6px; font-size: 10px; color: #64748b; text-align: center;">⏳ Waiting for GuideBridge...</div>
    <div id="mca-autofill-status" style="margin-top: 6px; font-size: 11px; color: #cbd5e1; max-height: 80px; overflow-y: auto; padding: 6px 8px; background: #020617; border-radius: 4px; display: none; line-height: 1.4;"></div>
  `;

  document.body.appendChild(panel);

  const statusEl = document.getElementById('mca-autofill-status');
  const showStatus = (msg, isErr = false) => {
    statusEl.style.display = 'block';
    statusEl.style.color = isErr ? '#f87171' : '#4ade80';
    statusEl.innerText = msg;
  };

  const chkPanelProtect = document.getElementById('mca-panel-chk-protect');
  if (chkPanelProtect) {
    chkPanelProtect.onchange = () => {
      protectPrePopulated = chkPanelProtect.checked;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ aoc4_protect_prev_year: protectPrePopulated });
      }
    };
  }

  document.getElementById('mca-panel-close').onclick = () => panel.remove();

  // Update GuideBridge status indicator
  const gbStatusEl = document.getElementById('mca-gb-status');
  const updateGbStatus = () => {
    if (gbStatusEl) {
      gbStatusEl.textContent = _guideBridgeReady ? '🟢 GuideBridge Connected' : '⏳ Waiting for GuideBridge...';
      gbStatusEl.style.color = _guideBridgeReady ? '#4ade80' : '#64748b';
    }
  };
  updateGbStatus();
  window.addEventListener('MCA_AOC4_GB_READY', updateGbStatus);
  // Check periodically for late initialization
  const gbCheckInterval = setInterval(() => {
    updateGbStatus();
    if (_guideBridgeReady) clearInterval(gbCheckInterval);
  }, 2000);

  // Helper to disable/enable buttons during async operations
  const setButtonsEnabled = (enabled) => {
    ['btn-fill-sec1', 'btn-fill-sec2', 'btn-fill-sec3', 'btn-fill-all', 'btn-save-draft'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = !enabled;
        btn.style.opacity = enabled ? '1' : '0.5';
        btn.style.cursor = enabled ? 'pointer' : 'wait';
      }
    });
  };

  document.getElementById('btn-fill-sec1').onclick = async () => {
    setButtonsEnabled(false);
    showStatus('⏳ Waiting for GuideBridge + loading data...');
    await waitForGuideBridgeReady(8000);
    await ensureFinancialDataLoaded();
    showStatus('⏳ Filling Section 1 (Part A)...');
    const r = fillSection1(activeFinancialData, { protectPrevYear: protectPrePopulated });
    await delay(1500);
    showStatus('⏳ Saving Section 1...');
    const saveResult = await saveAndNavigateSection('panel1AOC4', 'panel3AOC4');
    const protMsg = r.protectedCount ? ` (🛡️ ${r.protectedCount} preserved)` : '';
    const saveMsg = saveResult.success ? ' ✅ Saved!' : ' ⚠️ Save pending';
    showStatus(`✅ Section 1: ${r.filledCount} fields filled${protMsg}${saveMsg}`);
    setButtonsEnabled(true);
  };

  document.getElementById('btn-fill-sec2').onclick = async () => {
    setButtonsEnabled(false);
    showStatus('⏳ Waiting for GuideBridge + loading data...');
    await waitForGuideBridgeReady(8000);
    await ensureFinancialDataLoaded();
    showStatus('⏳ Filling Section 2 (Balance Sheet)...');
    const r = fillSection2(activeFinancialData, { protectPrevYear: protectPrePopulated });
    await delay(1500);
    showStatus('⏳ Saving Section 2...');
    const saveResult = await saveAndNavigateSection('panel3AOC4', 'panel6AOC4');
    const protMsg = r.protectedCount ? ` (🛡️ ${r.protectedCount} preserved)` : '';
    const saveMsg = saveResult.success ? ' ✅ Saved!' : ' ⚠️ Save pending';
    showStatus(`✅ Section 2: ${r.filledCount} BS fields filled${protMsg}${saveMsg}`);
    setButtonsEnabled(true);
  };

  document.getElementById('btn-fill-sec3').onclick = async () => {
    setButtonsEnabled(false);
    showStatus('⏳ Waiting for GuideBridge + loading data...');
    await waitForGuideBridgeReady(8000);
    await ensureFinancialDataLoaded();
    showStatus('⏳ Filling Section 3 (Profit & Loss)...');
    const r = fillSection3(activeFinancialData, { protectPrevYear: protectPrePopulated });
    await delay(1500);
    showStatus('⏳ Final save...');
    const saveResult = triggerGlobalSaveDraft();
    const protMsg = r.protectedCount ? ` (🛡️ ${r.protectedCount} preserved)` : '';
    const saveMsg = saveResult.success ? ' ✅ Saved!' : ' ⚠️ Save pending';
    showStatus(`✅ Section 3: ${r.filledCount} P&L fields filled${protMsg}${saveMsg}`);
    setButtonsEnabled(true);
  };

  document.getElementById('btn-fill-all').onclick = async () => {
    setButtonsEnabled(false);
    showStatus('🚀 Starting sequential Fill → Save → Next pipeline...');
    await ensureFinancialDataLoaded();
    const opts = { protectPrevYear: protectPrePopulated };
    const result = await sequentialFillAllSections(activeFinancialData, opts);
    const saveStatuses = result.results.saves.map(s => s.success ? '✅' : '⚠️').join(' ');
    showStatus(`🎉 Pipeline complete! ${result.totalFilled} fields filled (🛡️ ${result.totalProtected} preserved) | Saves: ${saveStatuses}`);
    setButtonsEnabled(true);
  };

  document.getElementById('btn-save-draft').onclick = () => {
    const res = triggerGlobalSaveDraft();
    if (res.success) {
      showStatus(`💾 Triggered global draft save via ${res.method}!`);
    } else {
      showStatus(`⚠️ ${res.message}`, true);
    }
  };
}

// Auto-inject when on AOC-4 URL or when AOC-4 panel exists in DOM
function checkAndInject() {
  const url = window.location.href.toLowerCase();
  const isAoc4 = url.includes('form-aoc4') || url.includes('aoc-4') || url.includes('aoc4') || !!document.querySelector('[id*="panel1AOC4"]');
  if (isAoc4) {
    injectFloatingAssistant();
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', checkAndInject);
} else {
  checkAndInject();
}
setTimeout(checkAndInject, 1500);
setTimeout(checkAndInject, 3500);

// ─── MESSAGE LISTENER FROM POPUP ──────────────────────────────────────────────
try {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      (async () => {
        try {
          if (msg.data) {
            activeFinancialData = msg.data;
          } else {
            await ensureFinancialDataLoaded();
          }

          const opts = {
            protectPrevYear: msg.protectPrevYear !== undefined ? msg.protectPrevYear : protectPrePopulated
          };

          if (msg.action === 'FILL_SEC1') {
            const r = fillSection1(activeFinancialData, opts);
            sendResponse({ success: true, count: r.filledCount, protectedCount: r.protectedCount, details: r.results });
          } else if (msg.action === 'FILL_SEC2') {
            const r = fillSection2(activeFinancialData, opts);
            sendResponse({ success: true, count: r.filledCount, protectedCount: r.protectedCount, details: r.results });
          } else if (msg.action === 'FILL_SEC3') {
            const r = fillSection3(activeFinancialData, opts);
            sendResponse({ success: true, count: r.filledCount, protectedCount: r.protectedCount, details: r.results });
          } else if (msg.action === 'FILL_ALL') {
            // Use the sequential pipeline that properly saves each section
            const result = await sequentialFillAllSections(activeFinancialData, opts);
            sendResponse({ success: true, total: result.totalFilled, protectedCount: result.totalProtected, saves: result.results.saves });
          } else if (msg.action === 'SAVE_DRAFT') {
            const res = triggerGlobalSaveDraft();
            sendResponse(res);
          } else {
            sendResponse({ success: false, message: 'Unknown action: ' + msg.action });
          }
        } catch (err) {
          sendResponse({ success: false, message: err.message });
        }
      })();
      return true; // Keep channel open for async response
    });
  }
} catch (e) {
  console.warn('[AOC-4 Extension] onMessage listener registration:', e);
}
