// ==============================================================================
// MCA AOC-4 Extension Popup Controller
// Supports isolated client workspaces, dynamic sync, file import, and MCA pre-fill protection
// ==============================================================================

const DEFAULT_COMPANY = {
  companyInfo: {
    cin: '',
    companyName: 'No Client Selected',
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

let activeData = DEFAULT_COMPANY;

function safeRound(v) {
  if (v === undefined || v === null || isNaN(v)) return '0';
  return String(Math.round(Number(v)));
}

// Converts raw parsed financialData (from Excel or Backend) into full AOC-4 Schedule III mapping
function transformFinancialData(fd) {
  if (!fd) return DEFAULT_COMPANY;

  // Case 1: Already has rich Schedule III partB_balanceSheet & partC_profitAndLoss arrays
  if (Array.isArray(fd.partB_balanceSheet) && Array.isArray(fd.partC_profitAndLoss)) {
    const bsTuples = [];
    for (const item of fd.partB_balanceSheet) {
      if (item.currentSelector) bsTuples.push([item.currentSelector, String(item.currentReportingPeriod ?? '0'), `${item.label} (Current)`]);
      if (item.previousSelector) bsTuples.push([item.previousSelector, String(item.previousReportingPeriod ?? '0'), `${item.label} (Prev)`]);
    }
    const plTuples = [];
    for (const item of fd.partC_profitAndLoss) {
      if (item.currentSelector) plTuples.push([item.currentSelector, String(item.currentReportingPeriod ?? '0'), `${item.label} (Current)`]);
      if (item.previousSelector) plTuples.push([item.previousSelector, String(item.previousReportingPeriod ?? '0'), `${item.label} (Prev)`]);
    }

    const ci = fd.companyInfo || {};
    const aud = ci.auditor || {};
    const d1 = ci.director1 || {};

    return {
      companyInfo: {
        cin: ci.cin || '',
        companyName: ci.companyName || ci.name || '',
        address: ci.registeredAddress || ci.address || '',
        email: ci.email || '',
        numberOfMembers: String(ci.numberOfMembers || '2'),
        financialYearFrom: ci.financialYearFrom || '01/04/2025',
        financialYearTo: ci.financialYearTo || '31/03/2026',
        boardMeetingDate: ci.boardMeetingDate || '',
        boardMeetingReportDate: ci.boardMeetingReportDate || '',
        auditorReportDate: ci.auditorReportDate || '',
        agmHeld: ci.agmHeld || 'Yes',
        actualAgmDate: ci.actualAgmDate || '',
        dueAgmDate: ci.dueAgmDate || '',
        agmExtension: ci.agmExtension || 'No',
        natureOfFinancialStatements: ci.natureOfFinancialStatements || 'Adopted by AGM',
        director1Din: d1.din || ci.director1Din || '',
        director1Name: d1.name || ci.director1Name || '',
        auditor: {
          count: aud.count || '1',
          category: aud.category || 'Firm',
          pan: aud.pan || '',
          name: aud.name || '',
          frn: aud.frn || '',
          auditorName: aud.auditorName || '',
          membershipNumber: aud.membershipNo || aud.membershipNumber || ''
        }
      },
      partB_balanceSheet: fd.partB_balanceSheet,
      partC_profitAndLoss: fd.partC_profitAndLoss,
      balanceSheet: bsTuples,
      profitAndLoss: plTuples
    };
  }

  // Case 2: Already in legacy tuple format
  if (Array.isArray(fd.balanceSheet) && Array.isArray(fd.profitAndLoss) && fd.balanceSheet.length > 0) {
    return fd;
  }

  // Case 3: Raw parsed Excel structure
  const ci = fd.companyInfo || {};
  const aud = fd.auditor || {};
  const d1 = (fd.directors && fd.directors[0]) || {};
  const curBS = fd.balanceSheet || {};
  const prevBS = fd.balanceSheetPrevYear || {};
  const curPL = fd.profitAndLoss || {};
  const prevPL = fd.profitAndLossPrevYear || {};

  const legacyBS = [
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949299___widget', safeRound(curBS.shareCapital), 'Share Capital (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643805949296-tableItem1643805949300___widget', safeRound(prevBS.shareCapital), 'Share Capital (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643810517442-tableItem1643810517445___widget', safeRound(curBS.reservesAndSurplus), 'Reserves & Surplus (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643810517442-tableItem1643810517446___widget', safeRound(prevBS.reservesAndSurplus), 'Reserves & Surplus (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643811210415-tableItem1643811210419___widget', safeRound(curBS.longTermBorrowings), 'Long Term Borrowings (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643811210415-tableItem1643811210420___widget', safeRound(prevBS.longTermBorrowings), 'Long Term Borrowings (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1720503320433-tableItem1720503320436___widget', safeRound(curBS.tradePayables), 'Trade Payables Others (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1720503320433-tableItem1720503320437___widget', safeRound(prevBS.tradePayables), 'Trade Payables Others (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643867870853-tableItem1643867870856___widget', safeRound(curBS.otherCurrentLiabilities), 'Other Current Liabilities (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643867878141-tableItem1643867878144___widget', safeRound(curBS.shortTermProvisions), 'Short Term Provisions (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643867878141-tableItem1643867878145___widget', safeRound(prevBS.shortTermProvisions), 'Short Term Provisions (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869054335-tableItem1643869054338___widget', safeRound(curBS.tangibleAssets), 'PPE Tangible Assets (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869054335-tableItem1643869054339___widget', safeRound(prevBS.tangibleAssets), 'PPE Tangible Assets (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869089142-tableItem1643869089145___widget', safeRound(curBS.deferredTaxAsset), 'Deferred Tax Asset (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869691133-tableItem1643869691136___widget', safeRound(curBS.tradeReceivables), 'Trade Receivables (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869691133-tableItem1643869691137___widget', safeRound(prevBS.tradeReceivables), 'Trade Receivables (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869700097-tableItem1643869700100___widget', safeRound(curBS.cashAndEquivalents), 'Cash & Cash Eq (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869700097-tableItem1643869700101___widget', safeRound(prevBS.cashAndEquivalents), 'Cash & Cash Eq (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869716976-tableItem1643869716979___widget', safeRound(curBS.otherCurrentAssets), 'Other Current Assets (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel3AOC4-panel_2074267803_cop_1947944060-panel_478261092_copy-table-Row1643869716976-tableItem1643869716980___widget', safeRound(prevBS.otherCurrentAssets), 'Other Current Assets (Prev)']
  ];

  const legacyPL = [
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870633802-tableItem1643870633805___widget', safeRound(curPL.revenueFromOperations), 'Revenue from Ops (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870633802-tableItem1643870633806___widget', safeRound(prevPL.revenueFromOperations), 'Revenue from Ops (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870637142-tableItem1643870637145___widget', safeRound(curPL.otherIncome), 'Other Income (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870637142-tableItem1643870637146___widget', safeRound(prevPL.otherIncome), 'Other Income (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870643759-tableItem1643870643762___widget', safeRound(curPL.employeeExpenses), 'Employee Benefits (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870643759-tableItem1643870643763___widget', safeRound(prevPL.employeeExpenses), 'Employee Benefits (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870647318-tableItem1643870647321___widget', safeRound(curPL.financeCosts), 'Finance Costs (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870647318-tableItem1643870647322___widget', safeRound(prevPL.financeCosts), 'Finance Costs (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870650993-tableItem1643870650996___widget', safeRound(curPL.depreciation), 'Depreciation (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870650993-tableItem1643870650997___widget', safeRound(prevPL.depreciation), 'Depreciation (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870654215-tableItem1643870654218___widget', safeRound(curPL.adminExpenses || curPL.otherExpenses), 'Other Expenses (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870654215-tableItem1643870654219___widget', safeRound(prevPL.adminExpenses || prevPL.otherExpenses), 'Other Expenses (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870660144-tableItem1643870660147___widget', safeRound(curPL.currentTax), 'Current Tax (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870660144-tableItem1643870660148___widget', safeRound(prevPL.currentTax), 'Current Tax (Prev)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870663481-tableItem1643870663484___widget', safeRound(curPL.profitAfterTax), 'Profit After Tax (Current)'],
    ['guideContainer-rootPanel-panel-panel-panel6AOC4-panel_2074267803_cop_1303867623-panel_478261092_copy-table-Row1643870663481-tableItem1643870663485___widget', safeRound(prevPL.profitAfterTax), 'Profit After Tax (Prev)']
  ];

  return {
    companyInfo: {
      cin: ci.cin || '',
      companyName: ci.name || ci.companyName || '',
      address: ci.address || '',
      email: ci.email || '',
      numberOfMembers: String(ci.numberOfMembers || (fd.shareholding ? fd.shareholding.length : 2) || 2),
      financialYearFrom: fd.financialYear?.from || '01/04/2025',
      financialYearTo: fd.financialYear?.to || '31/03/2026',
      boardMeetingDate: fd.compliance?.boardMeetingDate || '05/09/2026',
      boardMeetingReportDate: fd.compliance?.boardMeetingReportDate || '05/09/2026',
      auditorReportDate: aud.signingDate || '04/09/2026',
      agmHeld: fd.compliance?.agmHeld || 'Yes',
      actualAgmDate: fd.compliance?.agmDate || '20/09/2026',
      dueAgmDate: fd.compliance?.agmDueDate || '30/09/2026',
      agmExtension: fd.compliance?.agmExtension || 'No',
      natureOfFinancialStatements: fd.compliance?.natureOfFinancialStatements || 'Adopted by AGM',
      director1Din: d1.din || '',
      director1Name: d1.name || '',
      auditor: {
        count: '1',
        category: 'Firm',
        pan: aud.pan || '',
        name: aud.firmName || aud.name || '',
        frn: aud.frn || '',
        auditorName: aud.name || '',
        membershipNumber: aud.membershipNo || ''
      }
    },
    balanceSheet: legacyBS,
    profitAndLoss: legacyPL
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('popup-status');
  const cardNameEl = document.getElementById('card-company-name');
  const cardCinEl = document.getElementById('card-cin');
  const cardFyEl = document.getElementById('card-fy');
  const cardStatsEl = document.getElementById('card-stats');
  const sourceBadgeEl = document.getElementById('source-badge');
  const fileNameLabelEl = document.getElementById('file-name-label');
  const fileInputEl = document.getElementById('file-input');
  const clientSelectEl = document.getElementById('client-select');
  const chkProtectPrevYear = document.getElementById('chk-protect-prev-year');

  const showStatus = (msg, isErr = false) => {
    if (!statusEl) return;
    statusEl.style.display = 'block';
    statusEl.style.color = isErr ? '#f87171' : '#4ade80';
    statusEl.innerText = msg;
  };

  const updateCardUI = (data, label = 'Preset Template', badge = 'Preset') => {
    activeData = data;
    const ci = data.companyInfo || {};
    if (cardNameEl) cardNameEl.innerText = ci.companyName || 'UNKNOWN COMPANY';
    if (cardCinEl) cardCinEl.innerText = ci.cin || 'CIN NOT PROVIDED';
    if (cardFyEl) {
      cardFyEl.innerText = (ci.financialYearFrom && ci.financialYearTo)
        ? `${ci.financialYearFrom.slice(-4)}-${ci.financialYearTo.slice(-4)}`
        : 'FY 2025-26';
    }
    if (sourceBadgeEl) sourceBadgeEl.innerText = badge;
    if (fileNameLabelEl) fileNameLabelEl.innerText = label;

    const bsCount = data.partB_balanceSheet?.length || data.balanceSheet?.length || 0;
    const plCount = data.partC_profitAndLoss?.length || data.profitAndLoss?.length || 0;
    if (cardStatsEl) {
      cardStatsEl.innerText = `Schedule III: ${bsCount} BS & ${plCount} P&L Mappings Ready`;
    }
  };

  // 1. Initialize Previous Year Protection Toggle (Default: TRUE)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['aoc4_protect_prev_year'], (res) => {
      if (chkProtectPrevYear) {
        chkProtectPrevYear.checked = res.aoc4_protect_prev_year !== false;
      }
    });
  }
  if (chkProtectPrevYear) {
    chkProtectPrevYear.addEventListener('change', () => {
      const isProtected = chkProtectPrevYear.checked;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ aoc4_protect_prev_year: isProtected });
      }
      showStatus(isProtected 
        ? '🛡️ MCA pre-populated data protection ENABLED.' 
        : '⚠️ MCA pre-populated data protection DISABLED (Force Overwrite Mode).', 
        !isProtected
      );
    });
  }

  // 2. Load Client Workspaces from Backend
  const loadClientWorkspaces = async (selectedCin) => {
    if (!clientSelectEl) return;
    try {
      const resp = await fetch('http://localhost:3001/api/clients');
      if (!resp.ok) return;
      const { clients, activeCin } = await resp.json();
      if (!Array.isArray(clients) || clients.length === 0) return;

      clientSelectEl.innerHTML = '<option value="">Select Client Workspace...</option>';
      const targetCin = selectedCin || activeCin;

      clients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.cin;
        opt.textContent = `${c.companyName || c.cin} (${c.cin})`;
        if (targetCin && c.cin.toUpperCase() === targetCin.toUpperCase()) {
          opt.selected = true;
        }
        clientSelectEl.appendChild(opt);
      });
    } catch (_) {}
  };

  // 3. Sync Client Data from Backend
  const syncClientData = async (targetCin) => {
    showStatus('Connecting to FormMind backend on port 3001...');
    try {
      const url = targetCin
        ? `http://localhost:3001/api/aoc4/mapping-state?cin=${encodeURIComponent(targetCin)}`
        : 'http://localhost:3001/api/aoc4/mapping-state';

      const resp = await fetch(url);
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const raw = data.mappingState || data.financialData || data;
      const formatted = transformFinancialData(raw);
      const companyName = formatted.companyInfo?.companyName || targetCin || 'Active Client';

      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          aoc4_active_financial_data: formatted,
          aoc4_source_label: companyName,
          aoc4_source_badge: 'Synced',
          aoc4_selected_cin: formatted.companyInfo?.cin || targetCin || ''
        });
      }
      updateCardUI(formatted, companyName, 'Synced');
      showStatus(`✅ Synced mappings for ${companyName}!`);

      if (targetCin) {
        fetch('http://localhost:3001/api/clients/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cin: targetCin })
        }).catch(() => {});
      }
    } catch (err) {
      showStatus(`Sync error: ${err.message}`, true);
    }
  };

  if (clientSelectEl) {
    clientSelectEl.addEventListener('change', () => {
      const cin = clientSelectEl.value;
      if (cin) syncClientData(cin);
    });
  }

  const btnSyncApp = document.getElementById('btn-sync-app');
  if (btnSyncApp) {
    btnSyncApp.addEventListener('click', () => {
      const cin = clientSelectEl?.value;
      syncClientData(cin);
    });
  }

  // 4. Load persisted data from chrome.storage.local
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['aoc4_active_financial_data', 'aoc4_source_label', 'aoc4_source_badge', 'aoc4_selected_cin'], (res) => {
      if (res && res.aoc4_active_financial_data) {
        updateCardUI(
          res.aoc4_active_financial_data,
          res.aoc4_source_label || 'Client Workspace',
          res.aoc4_source_badge || 'Synced'
        );
        loadClientWorkspaces(res.aoc4_selected_cin || res.aoc4_active_financial_data.companyInfo?.cin);
      } else {
        // Automatically sync from app if available
        syncClientData().then(() => loadClientWorkspaces()).catch(() => {
          updateCardUI(DEFAULT_COMPANY, 'Preset Template', 'Preset');
          loadClientWorkspaces();
        });
      }
    });
  } else {
    syncClientData().then(() => loadClientWorkspaces()).catch(() => {
      updateCardUI(DEFAULT_COMPANY, 'Preset Template', 'Preset');
    });
  }

  // 5. File Upload handler (.json / .xlsx / .xls)
  const btnUploadFile = document.getElementById('btn-upload-file');
  if (btnUploadFile && fileInputEl) {
    btnUploadFile.addEventListener('click', () => {
      fileInputEl.value = '';
      fileInputEl.click();
    });

    fileInputEl.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const lowerName = file.name.toLowerCase();

      // Case A: JSON file
      if (lowerName.endsWith('.json')) {
        showStatus(`Reading ${file.name}...`);
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const parsed = JSON.parse(evt.target.result);
            const formatted = transformFinancialData(parsed.mappingState || parsed.financialData || parsed);
            if (!formatted.companyInfo?.cin) {
              showStatus('Warning: JSON does not contain valid companyInfo.cin', true);
              return;
            }
            if (chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({
                aoc4_active_financial_data: formatted,
                aoc4_source_label: file.name,
                aoc4_source_badge: 'File',
                aoc4_selected_cin: formatted.companyInfo.cin
              });
            }
            updateCardUI(formatted, file.name, 'File');
            showStatus(`✅ Successfully loaded ${file.name}!`);
          } catch (err) {
            showStatus('Failed to parse JSON file: ' + err.message, true);
          }
        };
        reader.onerror = () => showStatus('Error reading file', true);
        reader.readAsText(file);
        return;
      }

      // Case B: Excel file (.xlsx / .xls)
      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        showStatus(`⏳ Uploading & parsing ${file.name} via local app...`);
        try {
          const formData = new FormData();
          formData.append('file', file);

          const resp = await fetch('http://localhost:3001/api/aoc4/parse-excel', {
            method: 'POST',
            body: formData
          });

          if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${resp.status}`);
          }

          const data = await resp.json();
          if (!data.financialData) {
            throw new Error('No financial data returned by parser');
          }

          const formatted = transformFinancialData(data.financialData);
          if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({
              aoc4_active_financial_data: formatted,
              aoc4_source_label: file.name,
              aoc4_source_badge: 'Excel',
              aoc4_selected_cin: formatted.companyInfo?.cin || ''
            });
          }
          updateCardUI(formatted, file.name, 'Excel');
          showStatus(`✅ Parsed & loaded ${file.name} successfully!`);
        } catch (err) {
          showStatus(`Excel parse error: ${err.message}. Ensure backend is running on port 3001.`, true);
        }
        return;
      }

      showStatus('Unsupported format. Please select a .json, .xlsx, or .xls file.', true);
    });
  }

  // 6. Reset to Default Preset
  const btnReset = document.getElementById('btn-reset-default');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(['aoc4_active_financial_data', 'aoc4_source_label', 'aoc4_source_badge', 'aoc4_selected_cin']);
      }
      updateCardUI(DEFAULT_COMPANY, 'Preset Template', 'Preset');
      showStatus('Restored default template.');
    });
  }

  // 7. Actions Handlers with Protection Interlock
  const handleResponse = (response, action) => {
    if (response && response.success) {
      const protMsg = response.protectedCount ? ` (🛡️ ${response.protectedCount} MCA pre-populated preserved)` : '';
      if (action === 'FILL_SEC1') showStatus(`✅ Populated ${response.count} fields in Section 1!${protMsg}`);
      else if (action === 'FILL_SEC2') showStatus(`✅ Populated ${response.count} Balance Sheet fields!${protMsg}`);
      else if (action === 'FILL_SEC3') showStatus(`✅ Populated ${response.count} Profit & Loss fields!${protMsg}`);
      else if (action === 'FILL_ALL') showStatus(`🎉 Populated ${response.total} fields across all sections!${protMsg}`);
      else if (action === 'SAVE_DRAFT') showStatus(`💾 Triggered global draft save via ${response.method}!`);
    } else {
      showStatus(response?.message || 'Operation executed on page.', false);
    }
  };

  const sendAction = async (action) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        showStatus('No active browser tab found', true);
        return;
      }

      const protectPrevYear = chkProtectPrevYear ? chkProtectPrevYear.checked : true;
      const payload = { 
        action, 
        data: activeData,
        protectPrevYear
      };

      chrome.tabs.sendMessage(tab.id, payload, async (response) => {
        if (chrome.runtime.lastError) {
          try {
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['pageBridge.js'],
                world: 'MAIN'
              });
            } catch (_) {}

            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            });

            chrome.tabs.sendMessage(tab.id, payload, (retryRes) => {
              if (chrome.runtime.lastError) {
                showStatus('Injected auto-filler into page. Click the button again.', false);
              } else {
                handleResponse(retryRes, action);
              }
            });
          } catch (e) {
            showStatus('Please refresh the MCA form page (F5) and click again.', true);
          }
          return;
        }

        handleResponse(response, action);
      });
    } catch (err) {
      showStatus(err.message, true);
    }
  };

  document.getElementById('btn-popup-sec1')?.addEventListener('click', () => sendAction('FILL_SEC1'));
  document.getElementById('btn-popup-sec2')?.addEventListener('click', () => sendAction('FILL_SEC2'));
  document.getElementById('btn-popup-sec3')?.addEventListener('click', () => sendAction('FILL_SEC3'));
  document.getElementById('btn-popup-all')?.addEventListener('click', () => sendAction('FILL_ALL'));
  document.getElementById('btn-popup-save')?.addEventListener('click', () => sendAction('SAVE_DRAFT'));
});
