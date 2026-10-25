// ==============================================================================
// MCA AOC-4 Page Main World GuideBridge State Binding Bridge
// Runs in "world": "MAIN" to directly bind state to window.guideBridge
// ==============================================================================

(function() {
  console.log('[MCA AOC-4 PageBridge] Active in page execution context with robust AEM GuideBridge state binding.');

  let guideBridgeReady = false;

  // ─── FIX 1: GUIDEBRIDGE CONNECT() READY GUARD ──────────────────────────────
  // AEM Adaptive Forms require waiting for guideBridge.connect() before any
  // value binding will persist to the internal form model (Layer 2).
  // Without this, DOM values are set but GuideBridge ignores them on Save.
  function waitForGuideBridge(callback, maxWait) {
    if (maxWait === undefined) maxWait = 30000;
    var start = Date.now();

    function check() {
      if (window.guideBridge && typeof window.guideBridge.connect === 'function') {
        window.guideBridge.connect(function() {
          guideBridgeReady = true;
          console.log('[PageBridge] ✅ GuideBridge connected and ready for state binding.');
          window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_READY', { detail: { ready: true } }));
          if (callback) callback();
        });
      } else if (Date.now() - start < maxWait) {
        setTimeout(check, 300);
      } else {
        console.warn('[PageBridge] ⚠️ GuideBridge not found after', maxWait, 'ms timeout. Proceeding with DOM-only fallback.');
        window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_READY', { detail: { ready: false, fallback: true } }));
        if (callback) callback();
      }
    }
    check();
  }

  // ─── GUIDEBRIDGE STATUS CHECK ───────────────────────────────────────────────
  window.addEventListener('MCA_AOC4_GB_STATUS_CHECK', function() {
    window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_STATUS_RESULT', {
      detail: {
        ready: guideBridgeReady,
        hasGuideBridge: !!(window.guideBridge),
        hasConnect: !!(window.guideBridge && typeof window.guideBridge.connect === 'function'),
        hasResolveNode: !!(window.guideBridge && typeof window.guideBridge.resolveNode === 'function'),
        hasSetProperty: !!(window.guideBridge && typeof window.guideBridge.setProperty === 'function')
      }
    }));
  });

  // ─── VALUE BINDING (only executes after GuideBridge is ready) ───────────────
  function bindGuideBridgeValue(somOrId, value) {
    var gb = window.guideBridge;
    if (!gb) {
      console.warn('[PageBridge] GuideBridge not available, DOM-only value set for:', somOrId);
      // Still set DOM value as fallback
      setDomValueOnly(somOrId, value);
      return false;
    }

    try {
      var strVal = String(value);

      // FIX: Date Format Conversion for AEM GuideBridge
      // AEM natively expects YYYY-MM-DD internally for date fields. If we pass DD/MM/YYYY, validation fails and Save is blocked.
      var isDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.test(strVal);
      var gbFormattedVal = strVal;
      if (isDate) {
        gbFormattedVal = strVal.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1');
      }

      // Find DOM element if available
      var el = document.getElementById(somOrId) || document.querySelector('[id*="' + somOrId + '"]');
      var som = somOrId;

      if (el) {
        var wrapper = el.closest('.guideFieldNode, [data-som-expression], [data-guide-som]') || el;
        som = wrapper.getAttribute('data-som-expression') ||
              wrapper.getAttribute('data-guide-som') ||
              el.getAttribute('data-som-expression') ||
              el.getAttribute('data-guide-som') ||
              (window.$ && (window.$(wrapper).data('somExpression') || window.$(el).data('somExpression'))) ||
              somOrId.replace(/___widget$/, '');
      } else {
        som = somOrId.replace(/___widget$/, '');
      }

      var bound = false;

      // Method 1: resolveNode to access the form model directly (MOST RELIABLE)
      if (typeof gb.resolveNode === 'function') {
        // Try multiple SOM resolution strategies
        var candidates = [som];
        if (el && el.id) candidates.push(el.id.replace(/___widget$/, ''));
        if (somOrId !== som) candidates.push(somOrId);
        // Also try stripping the leading # if present
        if (som.startsWith('#')) candidates.push(som.substring(1));

        for (var i = 0; i < candidates.length; i++) {
          try {
            var node = gb.resolveNode(candidates[i]);
            if (node) {
              // Set value using AEM specific date format if applicable, otherwise use string value
              node.value = gbFormattedVal;
              if (typeof node.validate === 'function') {
                try { node.validate(); } catch (_) {}
              }
              if (typeof node.trigger === 'function') {
                try { node.trigger('change'); } catch (_) {}
                try { node.trigger('blur'); } catch (_) {}
              }
              bound = true;
              break;
            }
          } catch (_) {}
        }
      }

      // Method 2: setProperty on SOM expression in GuideBridge
      if (!bound && typeof gb.setProperty === 'function' && som) {
        try {
          gb.setProperty([som], 'value', [gbFormattedVal]);
          bound = true;
        } catch (_) {}
      }

      // Method 3: Direct Native DOM input value setter (so widget UI repaints)
      if (el) {
        setDomValueForElement(el, strVal);
      }

      return bound;
    } catch (err) {
      console.warn('[PageBridge] GuideBridge error:', err);
      return false;
    }
  }

  // ─── DOM-ONLY FALLBACK VALUE SETTER ─────────────────────────────────────────
  function setDomValueOnly(somOrId, value) {
    var el = document.getElementById(somOrId) || document.querySelector('[id*="' + somOrId + '"]');
    if (el) setDomValueForElement(el, String(value));
  }

  function setDomValueForElement(el, strVal) {
    if (el instanceof HTMLInputElement || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      if (nativeSetter && nativeSetter.set) {
        nativeSetter.set.call(el, strVal);
      } else {
        el.value = strVal;
      }
      el.setAttribute('value', strVal);
    } else if (el instanceof HTMLSelectElement || el.tagName === 'SELECT') {
      el.value = strVal;
    } else {
      el.textContent = strVal;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    if (window.$) {
      try { window.$(el).val(strVal).trigger('input').trigger('change').trigger('blur'); } catch (_) {}
    }
  }

  // ─── EVENT LISTENERS ────────────────────────────────────────────────────────

  // Event listener for single field binding from content script
  window.addEventListener('MCA_AOC4_GB_SET_VALUE', function(e) {
    if (e.detail && e.detail.somOrId !== undefined) {
      bindGuideBridgeValue(e.detail.somOrId, e.detail.value);
    }
  });

  // Event listener for form-wide GuideBridge validation
  window.addEventListener('MCA_AOC4_GB_VALIDATE', function() {
    if (window.guideBridge && typeof window.guideBridge.validate === 'function') {
      try { window.guideBridge.validate(); } catch (_) {}
    }
  });

  // Event listener to force calculation of dependent fields
  window.addEventListener('MCA_AOC4_GB_CALCULATE', function() {
    if (window.guideBridge && typeof window.guideBridge.calculate === 'function') {
      try { window.guideBridge.calculate(); console.log('[PageBridge] GB Calculate triggered.'); } catch (_) {}
    }
  });

  // Event listener to commit data to GuideBridge model
  window.addEventListener('MCA_AOC4_GB_COMMIT', function() {
    if (window.guideBridge && typeof window.guideBridge.commit === 'function') {
      try { window.guideBridge.commit(); console.log('[PageBridge] GB Commit triggered.'); } catch (_) {}
    }
  });

  // Event listener for GuideBridge native draft save with MCA specific fallbacks
  window.addEventListener('MCA_AOC4_GB_DRAFT_SAVE', function() {
    var result = { success: false, message: 'Save failed' };
    try {
      // Step 1: Pre-Scrutiny / Form Checks (Click "Check Form" if available)
      var checkFormBtn = document.querySelector('button[id*="checkform" i]') ||
                         Array.from(document.querySelectorAll('button')).find(function(b) {
                           return (b.innerText || '').toLowerCase().includes('check form');
                         });
      if (checkFormBtn) {
        console.log('[PageBridge] Triggering Check Form (Pre-Scrutiny) before Save...');
        try { checkFormBtn.click(); } catch (_) {}
      }

      // Step 2: Try specific MCA Window Save functions if they exist
      if (typeof window.saveFormData === 'function') {
         window.saveFormData();
         result = { success: true, method: 'window.saveFormData' };
      } else if (typeof window.customSaveDraft === 'function') {
         window.customSaveDraft();
         result = { success: true, method: 'window.customSaveDraft' };
      } 
      // Step 3: Fallback to GuideBridge draftSave
      else if (window.guideBridge && typeof window.guideBridge.draftSave === 'function') {
        window.guideBridge.draftSave();
        result = { success: true, method: 'guideBridge.draftSave' };
      } else {
        result = { success: false, message: 'No valid GuideBridge or MCA save function found' };
      }
    } catch (err) {
      result = { success: false, message: err.message };
    }
    window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_DRAFT_SAVE_RESULT', { detail: result }));
  });

  // ─── FIX 2: PER-SECTION SAVE + NAVIGATE ────────────────────────────────────
  // MCA AOC-4 requires each section to be saved before proceeding.
  // This handles clicking the section-level "Save & Next" / navigation buttons
  // from within the MAIN world where we have full DOM + GuideBridge access.
  window.addEventListener('MCA_AOC4_GB_SECTION_SAVE', function(e) {
    var detail = e.detail || {};
    var sectionPanelId = detail.sectionPanelId;
    var result = { success: false, message: 'Section panel not found' };

    try {
      // Run GuideBridge validation first to ensure all fields are synced
      if (window.guideBridge && typeof window.guideBridge.validate === 'function') {
        try { window.guideBridge.validate(); } catch (_) {}
      }

      // Strategy 1: Find MCA's section-level navigation button
      // MCA AOC-4 uses "nextItemNav" buttons at the bottom of each section panel
      var sectionPanel = sectionPanelId ? document.querySelector('[id*="' + sectionPanelId + '"]') : null;
      var nextBtn = null;

      if (sectionPanel) {
        // Look for the section's specific "Save and Next" / "Next" button
        nextBtn = sectionPanel.querySelector('[id*="nextitemnav" i]') ||
                  sectionPanel.querySelector('[id*="nextItemNav"]') ||
                  sectionPanel.querySelector('[id*="mca_button___widget"]') ||
                  sectionPanel.querySelector('button[id*="nextitemnav" i]');

        // Fallback: find any button with "Next" or "Save and Next" text within the section
        if (!nextBtn) {
          var buttons = Array.from(sectionPanel.querySelectorAll('button, input[type="button"], a.btn, span.guideButton'));
          nextBtn = buttons.find(function(b) {
            var t = (b.innerText || b.textContent || '').trim().toLowerCase();
            return t.includes('save and next') || t.includes('save & next') || t === 'next';
          });
        }
      }

      // Strategy 2: Look globally for the tab/wizard navigation
      if (!nextBtn) {
        // MCA AOC-4 uses a wizard-style tab navigation — try clicking the next tab
        var allTabs = Array.from(document.querySelectorAll('.guideTab a, .wizard-tab-link, [role="tab"], .tab-link'));
        if (detail.nextTabIndex !== undefined && allTabs[detail.nextTabIndex]) {
          nextBtn = allTabs[detail.nextTabIndex];
        }
      }

      // Strategy 3: Find the bottom toolbar "Save" then the next section tab
      if (!nextBtn) {
        // Click global save first
        var globalSaveBtn = document.querySelector('[id*="panel_622013715"][id*="mca_button_copy___widget"]') ||
                            document.querySelector('#guideContainer-rootPanel-panel_622013715-mca_button_copy___widget');
        if (globalSaveBtn) {
          globalSaveBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          globalSaveBtn.click();
          result = { success: true, method: 'globalSaveButton', note: 'Used global save as fallback' };
        }
      }

      if (nextBtn) {
        nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nextBtn.click();
        result = { success: true, method: 'sectionNextButton', id: nextBtn.id || 'unknown' };
      }

    } catch (err) {
      result = { success: false, message: err.message };
    }

    window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_SECTION_SAVE_RESULT', { detail: result }));
  });

  // ─── FIX 4: PRE-SAVE DOM SWEEP SYNC ─────────────────────────────────────────
  // Scans all inputs and forces GuideBridge to adopt their values if out of sync
  window.addEventListener('MCA_AOC4_GB_SYNC_ALL', function() {
    var gb = window.guideBridge;
    if (!gb || typeof gb.resolveNode !== 'function') return;
    
    console.log('[PageBridge] Sweeping DOM to force-sync GuideBridge model...');
    var inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    var synced = 0;
    
    inputs.forEach(function(el) {
      if (!el.id) return;
      var val = el.value;
      if (el.type === 'radio' || el.type === 'checkbox') {
        if (!el.checked) return;
      }
      
      // Try to find the exact SOM expression from wrapper or element attributes
      var wrapper = el.closest('.guideFieldNode, [data-som-expression], [data-guide-som]') || el;
      var som = wrapper.getAttribute('data-som-expression') ||
                wrapper.getAttribute('data-guide-som') ||
                el.getAttribute('data-som-expression') ||
                el.getAttribute('data-guide-som');
      
      var baseId = el.id.replace(/___widget$/, '');
      var didSync = false;
      
      try {
        var node = gb.resolveNode(som || baseId);
        if (node && node.value !== val) {
          // If value is a date, update using AEM format for Guidebridge node
          var isDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.test(val);
          var gbVal = isDate ? val.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1') : val;
          node.value = gbVal;
          if (typeof node.trigger === 'function') {
            node.trigger('change');
            node.trigger('blur');
          }
          didSync = true;
        }
      } catch (err) {}
      
      if (!didSync && som && typeof gb.setProperty === 'function') {
        try {
          gb.setProperty([som], 'value', [val]);
          didSync = true;
        } catch (err) {}
      }
      
      if (didSync) synced++;
    });
    console.log('[PageBridge] Sync sweep complete. Force-updated ' + synced + ' nodes.');
  });

  // ─── GUIDEBRIDGE DATA EXTRACTION (for verification) ─────────────────────────
  window.addEventListener('MCA_AOC4_GB_EXTRACT_DATA', function() {
    var result = { success: false };
    try {
      if (window.guideBridge && typeof window.guideBridge.getDataXML === 'function') {
        window.guideBridge.getDataXML({
          success: function(guideResultObj) {
            result = { success: true, dataXml: guideResultObj.data };
            window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_EXTRACT_DATA_RESULT', { detail: result }));
          },
          error: function() {
            result = { success: false, message: 'getDataXML failed' };
            window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_EXTRACT_DATA_RESULT', { detail: result }));
          }
        });
        return; // async callback will dispatch
      }
    } catch (err) {
      result = { success: false, message: err.message };
    }
    window.dispatchEvent(new CustomEvent('MCA_AOC4_GB_EXTRACT_DATA_RESULT', { detail: result }));
  });

  // Initialize: wait for GuideBridge to be ready
  waitForGuideBridge(function() {
    console.log('[PageBridge] Initialization complete. GuideBridge ready:', guideBridgeReady);
  });
})();
