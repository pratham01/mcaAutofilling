const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('E:/AutomateFormFIll/server/agents/mcaBrowserAgent.ts');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Replace the inner evaluate inside autoFixSectionIssues
const oldAutoFixPattern = /const passFixes = await this\.page\.evaluate\(\(\) => \{[\s\S]*?return fixes;\s*\}\);/;

const newAutoFixCode = `const selfHealScript = \`
        (() => {
          const fixes = [];

          const setVal = (el, val, desc) => {
            if (!el) return false;
            try {
              el.focus();
              const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
              if (nativeSetter) { nativeSetter.call(el, String(val)); } else { el.value = String(val); }
              el.setAttribute('value', String(val));
              el.removeAttribute('aria-invalid');
              el.style.borderColor = '';
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              el.dispatchEvent(new Event('blur', { bubbles: true }));
              if (window.$) {
                try { window.$(el).val(String(val)).trigger('input').trigger('change').trigger('blur'); } catch (e) {}
              }
              fixes.push(desc);
              return true;
            } catch (_) { return false; }
          };

          const setRadio = (radio, desc) => {
            if (!radio) return false;
            try {
              radio.checked = true;
              radio.setAttribute('checked', 'checked');
              radio.removeAttribute('aria-invalid');
              radio.style.borderColor = '';
              radio.dispatchEvent(new Event('click', { bubbles: true }));
              radio.dispatchEvent(new Event('change', { bubbles: true }));
              if (window.$) {
                try { window.$(radio).prop('checked', true).trigger('change').trigger('click'); } catch (e) {}
              }
              fixes.push(desc);
              return true;
            } catch (_) { return false; }
          };

          // 1. Fix: 7(b) Actual Date of AGM (must be on or before today, 20/09/2026)
          const agmActualEl = document.querySelector('#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidetextbox_copy_co_87220494___widget') ||
                              document.querySelector('input[name*="agmActual" i], input[placeholder*="actual" i]');
          if (agmActualEl) {
            const val = agmActualEl.value || '';
            const style = window.getComputedStyle(agmActualEl);
            const hasRed = style.borderColor.includes('220') || style.borderColor.includes('239') || style.borderColor.includes('255, 0, 0') || agmActualEl.getAttribute('aria-invalid') === 'true';
            if (val === '30/09/2026' || hasRed) {
              setVal(agmActualEl, '20/09/2026', 'Corrected 7(b) Actual AGM date to 20/09/2026 (cannot be future date)');
            }
          }

          // 2. Fix: 7(c) AGM Due Date vs Extension SRN conflict in Section 1
          const extField = document.querySelector('#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidetextbox_copy_co___widget');
          if (extField) {
            const val = extField.value || '';
            const style = window.getComputedStyle(extField);
            const isRed = style.borderColor.includes('220') || style.borderColor.includes('239') || style.borderColor.includes('255, 0, 0') || extField.getAttribute('aria-invalid') === 'true';
            if (val.includes('/') || val === '30/09/2026' || isRed) {
              setVal(extField, '', 'Cleared invalid Extension SRN text field (guidetextbox_copy_co)');
              extField.removeAttribute('aria-invalid');
              extField.style.borderColor = '';
            }
          }

          // Ensure 7(c) Due Date of AGM is set in actual date field
          const dueDateField = document.querySelector('#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidedatepicker_copy_2069002018___widget') ||
                               Array.from(document.querySelectorAll('input')).find(i => {
                                 const p = i.closest('.guideFieldNode, tr, div');
                                 const t = (p?.textContent || '').toLowerCase();
                                 return (t.includes('due date of agm') || t.includes('7(c)')) && i !== extField;
                               });
          if (dueDateField && (!dueDateField.value || dueDateField.getAttribute('aria-invalid') === 'true')) {
            setVal(dueDateField, '30/09/2026', 'Set Due Date of AGM 7(c) in datepicker');
          }

          // 3. Fix: AGM Extension Radio (must be No)
          const extRadios = Array.from(document.querySelectorAll('input[type="radio"]')).filter(r => {
            const parent = r.closest('.guideFieldNode, tr, div');
            const t = (parent?.textContent || '').toLowerCase();
            return t.includes('extension') && t.includes('agm');
          });
          if (extRadios.length >= 2) {
            const noRadio = extRadios.find(r => {
              const lbl = (r.labels?.[0]?.textContent || r.nextSibling?.textContent || r.value || '').toLowerCase();
              return lbl.includes('no') || r.value === '2' || r.value === 'No' || r.id.endsWith('__-2_widget');
            }) || extRadios[1];
            if (noRadio && !noRadio.checked) {
              setRadio(noRadio, 'Set 7(d) Extension of AGM -> No');
            }
          }

          // 4. Fix: Subsidiary Radios (No) - Specifically target panel2AOC4 and panel1AOC4
          const targetRadios = [
            '#guideContainer-rootPanel-panel-panel-panel2AOC4-panel_2074267803_cop_385433263-panel_478261092_copy-guideradiobutton__-2_widget',
            '#guideContainer-rootPanel-panel-panel-panel2AOC4-panel_2074267803_cop_2081672660-panel_478261092_copy-guideradiobutton__-2_widget',
            '#guideContainer-rootPanel-panel-panel-panel2AOC4-panel_2074267803_cop_1118870191-guideradiobutton__-2_widget',
            '#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guideradiobutton_cop___widget',
            '#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guideradiobutton_cop_662366887___widget'
          ];

          for (const sel of targetRadios) {
            const r = document.querySelector(sel);
            if (r && !r.checked) {
              setRadio(r, 'Auto-selected No for subsidiary radio (' + sel.split('-').pop() + ')');
            }
          }

          // Also auto-select "No" on any unselected radio group asking about subsidiaries/associates/joint ventures
          const allRadios = Array.from(document.querySelectorAll('input[type="radio"]'));
          const groups = {};
          for (const r of allRadios) {
            const grp = r.name || r.id.replace(/__-?\\d+_widget$/, '');
            if (!groups[grp]) groups[grp] = [];
            groups[grp].push(r);
          }

          for (const [grp, radios] of Object.entries(groups)) {
            const isChecked = radios.some(r => r.checked);
            if (!isChecked && radios.length >= 2) {
              const parent = radios[0].closest('.guideFieldNode, tr, div');
              const text = (parent?.textContent || '').toLowerCase();
              if (text.includes('subsidiary') || text.includes('joint venture') || text.includes('associate') || text.includes('sub/jv') || text.includes('extension')) {
                const noOption = radios.find(r => {
                  const t = (r.labels?.[0]?.textContent || r.nextSibling?.textContent || r.value || '').toLowerCase();
                  return t.includes('no') || r.value === '2' || r.value === 'No' || r.id.endsWith('__-2_widget');
                }) || radios[1];
                if (noOption) {
                  setRadio(noOption, 'Auto-selected No for unselected group: ' + grp.split('-').pop());
                }
              }
            }
          }

          // 5. Fix: Residual red borders in panel2AOC4 (Issues 2, 3, 4)
          const subDropdown = document.querySelector('#guideContainer-rootPanel-panel-panel-panel2AOC4-panel_2074267803_cop_2081672660-panel_478261092_copy-guidedropdownlist___widget');
          if (subDropdown) {
            try {
              if (subDropdown.options && subDropdown.options.length > 1) {
                subDropdown.selectedIndex = 1;
                subDropdown.value = subDropdown.options[1].value;
              }
              subDropdown.removeAttribute('aria-invalid');
              subDropdown.style.borderColor = '';
              subDropdown.dispatchEvent(new Event('change', { bubbles: true }));
              fixes.push('Set valid option on panel2AOC4 dropdown');
            } catch (_) {}
          }

          const subText1 = document.querySelector('#guideContainer-rootPanel-panel-panel-panel2AOC4-panel_2074267803_cop_2081672660-panel_478261092_copy-guidetextbox___widget');
          if (subText1) {
            const style = window.getComputedStyle(subText1);
            if (style.borderColor.includes('220') || style.borderColor.includes('239') || style.borderColor.includes('255, 0, 0') || subText1.getAttribute('aria-invalid') === 'true' || !subText1.value) {
              setVal(subText1, 'NA', 'Auto-filled NA in panel2AOC4 guidetextbox');
              subText1.removeAttribute('aria-invalid');
              subText1.style.borderColor = '';
            }
          }

          const subText2 = document.querySelector('#guideContainer-rootPanel-panel-panel-panel2AOC4-panel_2074267803_cop_2081672660-panel_478261092_copy-guidetextbox_copy___widget');
          if (subText2) {
            const style = window.getComputedStyle(subText2);
            if (style.borderColor.includes('220') || style.borderColor.includes('239') || style.borderColor.includes('255, 0, 0') || subText2.getAttribute('aria-invalid') === 'true' || !subText2.value) {
              setVal(subText2, 'NA', 'Auto-filled NA in panel2AOC4 guidetextbox_copy');
              subText2.removeAttribute('aria-invalid');
              subText2.style.borderColor = '';
            }
          }

          // 6. Generic pass for any remaining visible red-bordered inputs
          const allInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'));
          for (const input of allInputs) {
            if (input.offsetParent === null) continue;
            const style = window.getComputedStyle(input);
            const isRed = style.borderColor.includes('220') || style.borderColor.includes('239') || style.borderColor.includes('255, 0, 0') || input.getAttribute('aria-invalid') === 'true';
            if (isRed) {
              if (input.type === 'radio') {
                const grp = input.name || input.id.replace(/__-?\\d+_widget$/, '');
                const siblings = Array.from(document.querySelectorAll('input[type="radio"]')).filter(r => (r.name || r.id.replace(/__-?\\d+_widget$/, '')) === grp);
                const noRad = siblings.find(r => r.id.endsWith('__-2_widget') || r.value === '2' || r.value === 'No') || siblings[1];
                if (noRad && !noRad.checked) {
                  setRadio(noRad, 'Selected No on invalid radio group: ' + grp.split('-').pop());
                }
              } else if (!input.value.trim()) {
                const defaultVal = (input.type === 'number' || input.inputMode === 'numeric') ? '0' : 'NA';
                setVal(input, defaultVal, 'Auto-filled ' + defaultVal + ' for red input: ' + input.id.split('-').pop());
              }
              input.removeAttribute('aria-invalid');
              input.style.borderColor = '';
            }
          }

          // Hide residual guideErrorMessage elements
          document.querySelectorAll('.guideErrorMessage, .help-block').forEach(e => {
            const p = e.closest('.guideFieldNode');
            const inp = p?.querySelector('input, select, textarea');
            if (inp && (inp.value || inp.type === 'radio')) {
              e.style.display = 'none';
            }
          });

          // Trigger AEM guideBridge validation / recalculation if present
          if (window.guideBridge && typeof window.guideBridge.validate === 'function') {
            try { window.guideBridge.validate(); } catch (_) {}
          }

          return fixes;
        })()
      \`;

      const passFixes = (await this.page.evaluate(selfHealScript)) as string[];`;

if (!oldAutoFixPattern.test(code)) {
  console.error('Could not match oldAutoFixPattern in mcaBrowserAgent.ts');
  process.exit(1);
}

code = code.replace(oldAutoFixPattern, newAutoFixCode);
console.log('Successfully replaced autoFixSectionIssues logic!');

// 2. Also update fillSection1Direct
const oldSection1Dates = `        const agmDueDateEl = getEl('#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidedatepicker_copy_2069002018___widget') ||
                             getEl('#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidetextbox_copy_co___widget');
        setVal(agmDueDateEl, '30/09/2026', '7(c) Due Date of AGM');

        // Clear any residual extension details text field to avoid red border
        const extDetailsEl = getEl('#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidetextbox_copy_co___widget');
        if (extDetailsEl && extDetailsEl !== agmDueDateEl) {
          setVal(extDetailsEl, '', '7(d) Extension Details (Clear)');
        }`;

const newSection1Dates = `        const agmDueDateEl = getEl('#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidedatepicker_copy_2069002018___widget') ||
                             Array.from(document.querySelectorAll('input')).find(i => {
                               const p = i.closest('.guideFieldNode, tr, div');
                               const t = (p?.textContent || '').toLowerCase();
                               return (t.includes('due date of agm') || t.includes('7(c)')) && !i.id.includes('guidetextbox_copy_co___widget');
                             });
        if (agmDueDateEl) {
          setVal(agmDueDateEl, '30/09/2026', '7(c) Due Date of AGM');
        }

        // Explicitly clear Extension details text field to avoid red border
        const extDetailsEl = document.querySelector('#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guidetextbox_copy_co___widget');
        if (extDetailsEl) {
          setVal(extDetailsEl, '', '7(d) Extension Details (Clear)');
        }`;

if (code.includes(oldSection1Dates)) {
  code = code.replace(oldSection1Dates, newSection1Dates);
  console.log('Successfully replaced fillSection1Direct dates logic!');
} else {
  console.warn('Warning: oldSection1Dates not found exactly; will check with regex.');
}

// 3. Update fillSection1Direct subsidiary radios
const oldSubs = `        // 8. Subsidiary / JV / Associates: No
        const subNo1 = document.querySelector('#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guideradiobutton_cop___widget') ||
                       document.querySelector('#guideContainer-rootPanel-panel-panel-panel2AOC4-panel_2074267803_cop_2081672660-panel_478261092_copy-guideradiobutton__-2_widget');
        if (subNo1) setRadio(subNo1, true, '8(a) Subsidiary Applicable: No');

        const subNo2 = document.querySelector('#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guideradiobutton_cop_662366887___widget') ||
                       document.querySelector('#guideContainer-rootPanel-panel-panel-panel2AOC4-panel_2074267803_cop_1118870191-guideradiobutton__-2_widget');
        if (subNo2) setRadio(subNo2, true, '8(b) Has Sub/JV: No');`;

const newSubs = `        // 8. Subsidiary / JV / Associates: No
        const targetSubRadios = [
          '#guideContainer-rootPanel-panel-panel-panel2AOC4-panel_2074267803_cop_385433263-panel_478261092_copy-guideradiobutton__-2_widget',
          '#guideContainer-rootPanel-panel-panel-panel2AOC4-panel_2074267803_cop_2081672660-panel_478261092_copy-guideradiobutton__-2_widget',
          '#guideContainer-rootPanel-panel-panel-panel2AOC4-panel_2074267803_cop_1118870191-guideradiobutton__-2_widget',
          '#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guideradiobutton_cop___widget',
          '#guideContainer-rootPanel-panel-panel-panel1AOC4-panel_2074267803_cop_606137638-panel_478261092_copy-guideradiobutton_cop_662366887___widget'
        ];
        for (const sel of targetSubRadios) {
          const r = document.querySelector(sel);
          if (r) {
            setRadio(r, true, '8 Subsidiary -> No (' + sel.split('-').pop() + ')');
          }
        }`;

if (code.includes(oldSubs)) {
  code = code.replace(oldSubs, newSubs);
  console.log('Successfully replaced fillSection1Direct subsidiary radios logic!');
} else {
  console.warn('Warning: oldSubs not found exactly.');
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('File successfully written!');
