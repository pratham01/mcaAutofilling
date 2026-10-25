import React, { useState, useEffect } from 'react';
import {
  Layers,
  Save,
  Download,
  Upload,
  FolderOpen,
  Plus,
  Trash2,
  Send,
  ArrowRightLeft,
  Search,
  Filter,
  Building2,
  Calendar,
  Scale,
  Sparkles,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface TemplateMetadata {
  id: string;
  name: string;
  formType: string;
  applicableTo: string;
  accountingStandard: string;
  version: string;
  description: string;
  isDefault: boolean;
  updatedAt: string;
  fieldCount: number;
}

export const StatutoryTemplateStudio: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateMetadata[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('aoc4_standard_pvt_ltd');
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'balanceSheet' | 'profitAndLoss' | 'companyInfo'>('balanceSheet');
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newTemplateDesc, setNewTemplateDesc] = useState<string>('');
  const [newTemplateAppliesTo, setNewTemplateAppliesTo] = useState<string>('Private Limited Companies');

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Embedded Professional Quick Feedback Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);

  // Load templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const list = await res.json();
        setTemplates(list);
        if (list.length > 0) {
          const defaultTpl = list.find((t: TemplateMetadata) => t.isDefault) || list[0];
          loadTemplate(defaultTpl.id);
        }
      }
    } catch (e: any) {
      setError('Failed to fetch templates: ' + e.message);
    }
  };

  const loadTemplate = async (templateId: string) => {
    setLoading(`Loading template ${templateId}...`);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/templates/${templateId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setActiveTemplate(data);
      setSelectedTemplateId(templateId);
    } catch (e: any) {
      setError(`Failed to load template: ${e.message}`);
    } finally {
      setLoading('');
    }
  };

  // Field change handler in active template
  const handleFieldChange = (
    section: 'partB_balanceSheet' | 'partC_profitAndLoss',
    index: number,
    field: 'currentReportingPeriod' | 'previousReportingPeriod' | 'label' | 'currentSelector' | 'previousSelector',
    val: string
  ) => {
    if (!activeTemplate || !activeTemplate.mappingState) return;
    const updated = JSON.parse(JSON.stringify(activeTemplate));
    if (updated.mappingState[section] && updated.mappingState[section][index]) {
      updated.mappingState[section][index][field] = val;
      setActiveTemplate(updated);
    }
  };

  const handleCompanyInfoChange = (field: string, val: string) => {
    if (!activeTemplate || !activeTemplate.mappingState) return;
    const updated = JSON.parse(JSON.stringify(activeTemplate));
    if (!updated.mappingState.companyInfo) updated.mappingState.companyInfo = {};
    updated.mappingState.companyInfo[field] = val;
    setActiveTemplate(updated);
  };

  const handleNestedCompanyInfoChange = (parent: 'auditor' | 'director1' | 'director2', field: string, val: string) => {
    if (!activeTemplate || !activeTemplate.mappingState) return;
    const updated = JSON.parse(JSON.stringify(activeTemplate));
    if (!updated.mappingState.companyInfo) updated.mappingState.companyInfo = {};
    if (!updated.mappingState.companyInfo[parent]) updated.mappingState.companyInfo[parent] = {};
    updated.mappingState.companyInfo[parent][field] = val;
    setActiveTemplate(updated);
  };

  // Swap columns handler
  const handleSwapColumns = () => {
    if (!activeTemplate || !activeTemplate.mappingState) return;
    const updated = JSON.parse(JSON.stringify(activeTemplate));
    const swap = (arr: any[]) => {
      if (!Array.isArray(arr)) return;
      arr.forEach((item) => {
        const temp = item.currentReportingPeriod;
        item.currentReportingPeriod = item.previousReportingPeriod;
        item.previousReportingPeriod = temp;
      });
    };
    swap(updated.mappingState.partB_balanceSheet);
    swap(updated.mappingState.partC_profitAndLoss);
    setActiveTemplate(updated);
    setSuccessMsg('🔄 Current and Previous reporting period columns swapped in active template.');
  };

  // Save current active template back to disk
  const handleSaveCurrentTemplate = async () => {
    if (!activeTemplate) return;
    setLoading('Saving template...');
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeTemplate),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSuccessMsg(`✅ Template '${activeTemplate.name}' saved successfully with all Schedule III fields.`);
      fetchTemplates();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading('');
    }
  };

  // Save as brand new template
  const handleSaveAsNewTemplate = async () => {
    if (!newTemplateName.trim() || !activeTemplate) return;
    setLoading('Creating new template...');
    setError('');
    setSuccessMsg('');
    try {
      const templateId = 'tpl_' + Date.now();
      const payload = {
        id: templateId,
        name: newTemplateName.trim(),
        formType: activeTemplate.formType || 'AOC-4',
        applicableTo: newTemplateAppliesTo,
        accountingStandard: activeTemplate.accountingStandard || 'Indian GAAP (Schedule III)',
        description: newTemplateDesc.trim(),
        mappingState: activeTemplate.mappingState,
        isDefault: false,
      };
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create template');
      setSuccessMsg(`✅ New template '${newTemplateName}' created and stored.`);
      setShowSaveModal(false);
      setNewTemplateName('');
      setNewTemplateDesc('');
      await fetchTemplates();
      loadTemplate(templateId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading('');
    }
  };

  // Apply template to active filing
  const handleApplyToActiveFiling = async () => {
    if (!activeTemplate || !activeTemplate.id) return;
    setLoading('Applying template to active filing...');
    setError('');
    setSuccessMsg('');
    try {
      const targetCin = activeTemplate.mappingState?.companyInfo?.cin;
      const res = await fetch(`/api/templates/${activeTemplate.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cin: targetCin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply template');
      setSuccessMsg(`🚀 Template '${activeTemplate.name}' applied to isolated filing for ${data.cin || targetCin || 'client'}! Form filling will now use all Schedule III lines from this template.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading('');
    }
  };

  // Export template as downloadable JSON
  const handleExportJSON = () => {
    if (!activeTemplate) return;
    const blob = new Blob([JSON.stringify(activeTemplate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTemplate.id || 'statutory_template'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccessMsg(`⬇️ Exported ${activeTemplate.name} as JSON.`);
  };

  // Import template from user's local JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const templateId = 'imported_' + Date.now();
        const payload = {
          id: templateId,
          name: parsed.name || file.name.replace('.json', ''),
          formType: parsed.formType || 'AOC-4',
          applicableTo: parsed.applicableTo || 'Custom Company',
          accountingStandard: parsed.accountingStandard || 'Indian GAAP',
          description: parsed.description || 'Imported statutory template',
          mappingState: parsed.mappingState || parsed,
          isDefault: false,
        };
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setSuccessMsg(`⬆️ Imported template '${payload.name}' successfully!`);
          await fetchTemplates();
          loadTemplate(templateId);
        } else {
          throw new Error('Server rejected template import');
        }
      } catch (err: any) {
        setError('Failed to import template: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Delete non-default template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this statutory template?')) return;
    try {
      const res = await fetch(`/api/templates/${templateId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('Template deleted.');
        fetchTemplates();
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Quick submit feedback from inside template studio
  const handleQuickFeedbackSubmit = async () => {
    if (!feedbackInput.trim()) return;
    setIsSubmittingFeedback(true);
    try {
      const res = await fetch('/api/aoc4/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackText: feedbackInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit feedback');
      setSuccessMsg(`✅ Background adapted: ${data.message}`);
      setFeedbackInput('');
      setShowFeedbackModal(false);
      if (selectedTemplateId) loadTemplate(selectedTemplateId);
    } catch (err: any) {
      setError(`Feedback failed: ${err.message}`);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Statutory Balance Sheet Equilibrium Calculator (Dynamic Schedule III Sum)
  const calculateEquilibrium = () => {
    if (!activeTemplate?.mappingState?.partB_balanceSheet) return null;
    const rows = activeTemplate.mappingState.partB_balanceSheet;

    let curLiabilities = 0;
    let curAssets = 0;
    let prevLiabilities = 0;
    let prevAssets = 0;

    rows.forEach((r: any) => {
      const c = Number(r.currentReportingPeriod) || 0;
      const p = Number(r.previousReportingPeriod) || 0;
      if (r.category && r.category.includes('Asset')) {
        curAssets += c;
        prevAssets += p;
      } else {
        curLiabilities += c;
        prevLiabilities += p;
      }
    });

    return {
      curLiabilities,
      curAssets,
      curDiff: curAssets - curLiabilities,
      prevLiabilities,
      prevAssets,
      prevDiff: prevAssets - prevLiabilities,
    };
  };

  const eq = calculateEquilibrium();

  // Categories available for filtering
  const balanceSheetCategories = [
    { id: 'all', label: 'All Balance Sheet Schedules' },
    { id: "Shareholders' Funds", label: "Shareholders' Funds" },
    { id: 'Non-Current Liabilities', label: 'Non-Current Liabilities' },
    { id: 'Current Liabilities', label: 'Current Liabilities' },
    { id: 'Non-Current Assets', label: 'Non-Current Assets' },
    { id: 'Current Assets', label: 'Current Assets' },
  ];

  const profitLossCategories = [
    { id: 'all', label: 'All P&L Schedules' },
    { id: 'Revenue & Income', label: 'Revenue & Other Income' },
    { id: 'Expenses', label: 'Operational & Material Expenses' },
    { id: 'Tax & Profit', label: 'Tax Expenses & Profit for Period' },
    { id: 'Earnings Per Equity Share', label: 'Earnings Per Share (EPS)' },
  ];

  // Filtering logic for Part B
  const getFilteredBalanceSheet = () => {
    const list = activeTemplate?.mappingState?.partB_balanceSheet || [];
    return list.filter((r: any) => {
      const matchCat = categoryFilter === 'all' || r.category === categoryFilter;
      const matchQuery =
        !searchQuery.trim() ||
        r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.schedule && r.schedule.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.id && r.id.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  };

  // Filtering logic for Part C
  const getFilteredProfitLoss = () => {
    const list = activeTemplate?.mappingState?.partC_profitAndLoss || [];
    return list.filter((r: any) => {
      const matchCat = categoryFilter === 'all' || r.category === categoryFilter;
      const matchQuery =
        !searchQuery.trim() ||
        r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.schedule && r.schedule.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.id && r.id.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  };

  const filteredBS = getFilteredBalanceSheet();
  const filteredPL = getFilteredProfitLoss();

  return (
    <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ── Header & Template Selector ────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '24px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="badge badge-cyan" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Layers size={13} /> Complete Schedule III Mapping Studio
              </span>
              <span className="badge badge-purple" style={{ fontSize: '11px' }}>
                All AOC-4 Fields Included ({((activeTemplate?.mappingState?.partB_balanceSheet?.length || 0) + (activeTemplate?.mappingState?.partC_profitAndLoss?.length || 0) + 25)} Fields)
              </span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
              Statutory Template &amp; Comprehensive Mapping Studio
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', margin: 0, maxWidth: '800px', lineHeight: '1.5' }}>
              Complete statutory coverage for all Form AOC-4 fields under Companies Act 2013: Master Company Information, full Schedule III Balance Sheet line items, and complete Profit &amp; Loss disclosures.
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowFeedbackModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#38bdf8', borderColor: '#0284c7' }}
              title="Provide quick professional instruction to update this template in background"
            >
              <MessageSquare size={14} /> 💬 Professional Feedback
            </button>
            <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <Upload size={14} /> Import JSON
              <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
            </label>
            <button className="btn btn-secondary" onClick={handleExportJSON} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <Download size={14} /> Export JSON
            </button>
            <button className="btn btn-secondary" onClick={() => setShowSaveModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
              <Plus size={14} /> Save As New
            </button>
            <button
              className="btn btn-primary"
              onClick={handleApplyToActiveFiling}
              disabled={!!loading}
              style={{ background: 'linear-gradient(135deg, #0284c7, #3b82f6)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
              title="Apply this template to Form AOC-4 filling engine right now"
            >
              <Send size={14} /> 🚀 Apply to Active Filing
            </button>
          </div>
        </div>

        {/* Template Switcher Bar */}
        <div style={{ marginTop: '20px', padding: '14px 18px', background: 'rgba(2, 6, 23, 0.6)', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
            <FolderOpen size={18} color="#38bdf8" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>Active Template:</span>
            <select
              value={selectedTemplateId}
              onChange={(e) => loadTemplate(e.target.value)}
              style={{
                flex: 1,
                maxWidth: '420px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: '#0f172a',
                color: '#fff',
                border: '1px solid #334155',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isDefault ? '★ (Default)' : ''} ({t.fieldCount || 45} Fields)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleSwapColumns}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', borderColor: '#7e22ce' }}
              title="Reverse Current and Previous reporting period columns"
            >
              <ArrowRightLeft size={13} /> Swap Current ⮂ Previous
            </button>

            <button
              onClick={handleSaveCurrentTemplate}
              disabled={!!loading}
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '6px 14px', background: '#10b981', borderColor: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={13} /> Save Template Changes
            </button>

            {!activeTemplate?.isDefault && (
              <button
                onClick={() => handleDeleteTemplate(selectedTemplateId)}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 10px', color: '#f87171', borderColor: '#991b1b' }}
                title="Delete this custom template"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div style={{ marginTop: '14px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '6px', color: '#fca5a5', fontSize: '13px' }}>
            ❌ {error}
          </div>
        )}
        {successMsg && (
          <div style={{ marginTop: '14px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '6px', color: '#6ee7b7', fontSize: '13px' }}>
            {successMsg}
          </div>
        )}
      </div>

      {/* ── Statutory Validation & Equilibrium Cards ───────────────────────── */}
      {eq && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Balance Sheet Equilibrium: Current Year */}
          <div className="glass-panel" style={{ padding: '18px', borderLeft: eq.curDiff === 0 ? '4px solid #10b981' : '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600, textTransform: 'uppercase' }}>
                Current Reporting Period Balance (Schedule III)
              </span>
              <span className={`badge ${eq.curDiff === 0 ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                {eq.curDiff === 0 ? 'Balanced' : 'Reconciling Difference'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '6px' }}>
              <span style={{ color: '#94a3b8' }}>Total Equity &amp; Liabilities:</span>
              <span style={{ fontWeight: 700, color: '#38bdf8' }}>₹ {eq.curLiabilities.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Total Assets:</span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>₹ {eq.curAssets.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ borderTop: '1px solid #1e293b', marginTop: '8px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Balance Variance:</span>
              <span style={{ fontWeight: 600, color: eq.curDiff === 0 ? '#10b981' : '#fbbf24' }}>
                {eq.curDiff === 0 ? '₹ 0 (Exact Match)' : `₹ ${Math.abs(eq.curDiff).toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>

          {/* Balance Sheet Equilibrium: Previous Year */}
          <div className="glass-panel" style={{ padding: '18px', borderLeft: eq.prevDiff === 0 ? '4px solid #10b981' : '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600, textTransform: 'uppercase' }}>
                Previous Reporting Period Balance (Schedule III)
              </span>
              <span className={`badge ${eq.prevDiff === 0 ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                {eq.prevDiff === 0 ? 'Balanced' : 'Reconciling Difference'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '6px' }}>
              <span style={{ color: '#94a3b8' }}>Total Equity &amp; Liabilities:</span>
              <span style={{ fontWeight: 700, color: '#a78bfa' }}>₹ {eq.prevLiabilities.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
              <span style={{ color: '#94a3b8' }}>Total Assets:</span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>₹ {eq.prevAssets.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ borderTop: '1px solid #1e293b', marginTop: '8px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Balance Variance:</span>
              <span style={{ fontWeight: 600, color: eq.prevDiff === 0 ? '#10b981' : '#fbbf24' }}>
                {eq.prevDiff === 0 ? '₹ 0 (Exact Match)' : `₹ ${Math.abs(eq.prevDiff).toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>

          {/* Template Details Summary */}
          <div className="glass-panel" style={{ padding: '18px', borderLeft: '4px solid #38bdf8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600, textTransform: 'uppercase' }}>
                Template Specification
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '10px' }}>{activeTemplate?.formType || 'AOC-4'}</span>
            </div>
            <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px' }}>
              <b>Standard:</b> {activeTemplate?.accountingStandard || 'Indian GAAP'}
            </div>
            <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '4px' }}>
              <b>Applicable Entity:</b> {activeTemplate?.applicableTo || 'Private Ltd'}
            </div>
            <div style={{ borderTop: '1px solid #1e293b', marginTop: '8px', paddingTop: '6px', fontSize: '12px', color: '#64748b' }}>
              Active Schedules: <b>{(activeTemplate?.mappingState?.partB_balanceSheet?.length || 0) + (activeTemplate?.mappingState?.partC_profitAndLoss?.length || 0)} financial lines + 25 master fields</b>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabbed Schedule Mapping Editor ─────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '18px' }}>
          <button
            onClick={() => { setActiveTab('balanceSheet'); setCategoryFilter('all'); }}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'balanceSheet' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: activeTab === 'balanceSheet' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            🏛️ Part B: Balance Sheet ({activeTemplate?.mappingState?.partB_balanceSheet?.length || 0} Statutory Lines)
          </button>

          <button
            onClick={() => { setActiveTab('profitAndLoss'); setCategoryFilter('all'); }}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'profitAndLoss' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: activeTab === 'profitAndLoss' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            📈 Part C: Profit &amp; Loss ({activeTemplate?.mappingState?.partC_profitAndLoss?.length || 0} Statutory Lines)
          </button>

          <button
            onClick={() => setActiveTab('companyInfo')}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'companyInfo' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: activeTab === 'companyInfo' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            🏢 Part A: Company &amp; Auditor Master Info (25 Statutory Fields)
          </button>
        </div>

        {/* Category Filters & Quick Search Bar (For Part B & Part C) */}
        {activeTab !== 'companyInfo' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(activeTab === 'balanceSheet' ? balanceSheetCategories : profitLossCategories).map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: categoryFilter === c.id ? '1px solid #38bdf8' : '1px solid #334155',
                    background: categoryFilter === c.id ? 'rgba(56, 189, 248, 0.2)' : '#090d16',
                    color: categoryFilter === c.id ? '#38bdf8' : '#94a3b8',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Search schedule or field..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: '#090d16',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                  width: '220px',
                }}
              />
            </div>
          </div>
        )}

        {/* ── TAB 1: Balance Sheet ────────────────────────────────────────── */}
        {activeTab === 'balanceSheet' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#090d16', borderBottom: '2px solid #1e293b', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', width: '18%' }}>Schedule Category</th>
                  <th style={{ padding: '12px 14px', width: '32%' }}>Statutory Line Item</th>
                  <th style={{ padding: '12px 14px', width: '22%', color: '#38bdf8' }}>
                    Figures as at end of (Current Period) (₹)
                  </th>
                  <th style={{ padding: '12px 14px', width: '22%', color: '#a78bfa' }}>
                    Figures as at end of (Previous Period) (₹)
                  </th>
                  <th style={{ padding: '12px 14px', width: '6%', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBS.map((row: any, idx: number) => {
                  const originalIndex = activeTemplate?.mappingState?.partB_balanceSheet?.findIndex((r: any) => r.id === row.id);
                  return (
                    <tr key={row.id || idx} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '12px' }}>
                        <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                          {row.category || 'Schedule III'}
                        </span>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                          {row.schedule || ''}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: '#e2e8f0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{row.label}</span>
                          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>ID: {row.id}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <input
                          type="text"
                          value={row.currentReportingPeriod || ''}
                          onChange={(e) => handleFieldChange('partB_balanceSheet', originalIndex, 'currentReportingPeriod', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            background: '#090d16',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            color: '#38bdf8',
                            fontWeight: 700,
                            fontSize: '13px',
                            fontFamily: 'monospace',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <input
                          type="text"
                          value={row.previousReportingPeriod || ''}
                          onChange={(e) => handleFieldChange('partB_balanceSheet', originalIndex, 'previousReportingPeriod', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            background: '#090d16',
                            border: '1px solid rgba(167, 139, 250, 0.4)',
                            color: '#a78bfa',
                            fontWeight: 700,
                            fontSize: '13px',
                            fontFamily: 'monospace',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <span className="badge badge-emerald" title={`MCA GuideBridge Selector: ${row.currentSelector}`} style={{ fontSize: '10px', cursor: 'help' }}>
                          Bound
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 2: Profit & Loss ─────────────────────────────────────────── */}
        {activeTab === 'profitAndLoss' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#090d16', borderBottom: '2px solid #1e293b', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px', width: '18%' }}>Schedule Category</th>
                  <th style={{ padding: '12px 14px', width: '32%' }}>P&amp;L Line Item</th>
                  <th style={{ padding: '12px 14px', width: '22%', color: '#38bdf8' }}>
                    Figures for (Current Period) (₹)
                  </th>
                  <th style={{ padding: '12px 14px', width: '22%', color: '#a78bfa' }}>
                    Figures for (Previous Period) (₹)
                  </th>
                  <th style={{ padding: '12px 14px', width: '6%', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPL.map((row: any, idx: number) => {
                  const originalIndex = activeTemplate?.mappingState?.partC_profitAndLoss?.findIndex((r: any) => r.id === row.id);
                  return (
                    <tr key={row.id || idx} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: '12px' }}>
                        <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                          {row.category || 'Schedule III'}
                        </span>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                          {row.schedule || ''}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: '#e2e8f0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{row.label}</span>
                          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>ID: {row.id}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <input
                          type="text"
                          value={row.currentReportingPeriod || ''}
                          onChange={(e) => handleFieldChange('partC_profitAndLoss', originalIndex, 'currentReportingPeriod', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            background: '#090d16',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            color: '#38bdf8',
                            fontWeight: 700,
                            fontSize: '13px',
                            fontFamily: 'monospace',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <input
                          type="text"
                          value={row.previousReportingPeriod || ''}
                          onChange={(e) => handleFieldChange('partC_profitAndLoss', originalIndex, 'previousReportingPeriod', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            background: '#090d16',
                            border: '1px solid rgba(167, 139, 250, 0.4)',
                            color: '#a78bfa',
                            fontWeight: 700,
                            fontSize: '13px',
                            fontFamily: 'monospace',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <span className="badge badge-emerald" title={`MCA GuideBridge Selector: ${row.currentSelector}`} style={{ fontSize: '10px', cursor: 'help' }}>
                          Bound
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB 3: Complete Company Master & Statutory Disclosures ──────── */}
        {activeTab === 'companyInfo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Panel 1: General Company Master */}
            <div style={{ padding: '18px', background: '#090d16', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
                <Building2 size={16} color="#38bdf8" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                  1. Company General Master Information (Form AOC-4 Part A)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Corporate Identity Number (CIN)</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.cin || ''}
                    onChange={(e) => handleCompanyInfoChange('cin', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Global Location Number (GLN)</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.gln || ''}
                    onChange={(e) => handleCompanyInfoChange('gln', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Company Name</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.companyName || ''}
                    onChange={(e) => handleCompanyInfoChange('companyName', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Registered Office Address</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.registeredAddress || ''}
                    onChange={(e) => handleCompanyInfoChange('registeredAddress', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Company Email ID</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.email || ''}
                    onChange={(e) => handleCompanyInfoChange('email', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Contact Phone</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.phone || ''}
                    onChange={(e) => handleCompanyInfoChange('phone', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Number of Members</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.numberOfMembers || ''}
                    onChange={(e) => handleCompanyInfoChange('numberOfMembers', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Nature of Financial Statements</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.natureOfFinancialStatements || 'Adopted by AGM'}
                    onChange={(e) => handleCompanyInfoChange('natureOfFinancialStatements', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
              </div>
            </div>

            {/* Panel 2: Financial Year, Board & AGM Dates */}
            <div style={{ padding: '18px', background: '#090d16', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
                <Calendar size={16} color="#38bdf8" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                  2. Financial Year Period &amp; AGM Compliance Dates
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>FY From (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.financialYearFrom || ''}
                    onChange={(e) => handleCompanyInfoChange('financialYearFrom', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>FY To (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.financialYearTo || ''}
                    onChange={(e) => handleCompanyInfoChange('financialYearTo', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Board Meeting Date</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.boardMeetingDate || ''}
                    onChange={(e) => handleCompanyInfoChange('boardMeetingDate', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Board Report Date</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.boardMeetingReportDate || ''}
                    onChange={(e) => handleCompanyInfoChange('boardMeetingReportDate', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Auditor Report Signing Date</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.auditorReportDate || ''}
                    onChange={(e) => handleCompanyInfoChange('auditorReportDate', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>AGM Held (Yes / No)</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.agmHeld || 'Yes'}
                    onChange={(e) => handleCompanyInfoChange('agmHeld', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Actual AGM Date</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.actualAgmDate || ''}
                    onChange={(e) => handleCompanyInfoChange('actualAgmDate', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Due Date of AGM</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.dueAgmDate || ''}
                    onChange={(e) => handleCompanyInfoChange('dueAgmDate', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
              </div>
            </div>

            {/* Panel 3: Statutory Auditor Details */}
            <div style={{ padding: '18px', background: '#090d16', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
                <Scale size={16} color="#38bdf8" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                  3. Details of Statutory Auditor (Form AOC-4 Part A Line 16)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Auditor Category (Individual / Firm)</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.auditor?.category || 'Firm'}
                    onChange={(e) => handleNestedCompanyInfoChange('auditor', 'category', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Auditor Firm Name</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.auditor?.name || ''}
                    onChange={(e) => handleNestedCompanyInfoChange('auditor', 'name', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Auditor Firm PAN</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.auditor?.pan || ''}
                    onChange={(e) => handleNestedCompanyInfoChange('auditor', 'pan', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Firm Registration Number (FRN)</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.auditor?.frn || ''}
                    onChange={(e) => handleNestedCompanyInfoChange('auditor', 'frn', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>Signing Partner / Auditor Name</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.auditor?.auditorName || ''}
                    onChange={(e) => handleNestedCompanyInfoChange('auditor', 'auditorName', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8' }}>ICAI Membership Number</label>
                  <input
                    type="text"
                    value={activeTemplate?.mappingState?.companyInfo?.auditor?.membershipNo || ''}
                    onChange={(e) => handleNestedCompanyInfoChange('auditor', 'membershipNo', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                  />
                </div>
              </div>
            </div>

            {/* Panel 4: Signatory Directors */}
            <div style={{ padding: '18px', background: '#090d16', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
                <Sparkles size={16} color="#38bdf8" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                  4. Signatory Directors (Form AOC-4 Part A Line 17)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                {/* Director 1 */}
                <div style={{ padding: '12px', background: '#020617', borderRadius: '6px', border: '1px solid #334155' }}>
                  <div style={{ fontWeight: 600, color: '#38bdf8', fontSize: '13px', marginBottom: '8px' }}>
                    Signatory 1 (Director / MD)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>DIN / PAN</label>
                      <input
                        type="text"
                        value={activeTemplate?.mappingState?.companyInfo?.director1?.din || ''}
                        onChange={(e) => handleNestedCompanyInfoChange('director1', 'din', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#090d16', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Full Name</label>
                      <input
                        type="text"
                        value={activeTemplate?.mappingState?.companyInfo?.director1?.name || ''}
                        onChange={(e) => handleNestedCompanyInfoChange('director1', 'name', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#090d16', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Designation</label>
                      <input
                        type="text"
                        value={activeTemplate?.mappingState?.companyInfo?.director1?.designation || 'Director'}
                        onChange={(e) => handleNestedCompanyInfoChange('director1', 'designation', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#090d16', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Director 2 */}
                <div style={{ padding: '12px', background: '#020617', borderRadius: '6px', border: '1px solid #334155' }}>
                  <div style={{ fontWeight: 600, color: '#a78bfa', fontSize: '13px', marginBottom: '8px' }}>
                    Signatory 2 (Director / Manager)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>DIN / PAN</label>
                      <input
                        type="text"
                        value={activeTemplate?.mappingState?.companyInfo?.director2?.din || ''}
                        onChange={(e) => handleNestedCompanyInfoChange('director2', 'din', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#090d16', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Full Name</label>
                      <input
                        type="text"
                        value={activeTemplate?.mappingState?.companyInfo?.director2?.name || ''}
                        onChange={(e) => handleNestedCompanyInfoChange('director2', 'name', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#090d16', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8' }}>Designation</label>
                      <input
                        type="text"
                        value={activeTemplate?.mappingState?.companyInfo?.director2?.designation || 'Director'}
                        onChange={(e) => handleNestedCompanyInfoChange('director2', 'designation', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', background: '#090d16', border: '1px solid #334155', color: '#fff', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Professional Feedback Modal ─────────────────────────────── */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', padding: '24px', background: '#0f172a', border: '1px solid #38bdf8' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} /> 💬 Professional Feedback &amp; Background Auto-Adaptation
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: '1.4' }}>
              Provide natural language instructions for this template (e.g. "Trade payables current 2248", "Short-term provisions previous 346137", "Swap columns"). The system updates this template and background state automatically.
            </p>
            <textarea
              rows={4}
              value={feedbackInput}
              onChange={(e) => setFeedbackInput(e.target.value)}
              placeholder="Type your adjustment or feedback here..."
              style={{ width: '100%', padding: '12px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', fontSize: '13px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setShowFeedbackModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleQuickFeedbackSubmit}
                disabled={isSubmittingFeedback || !feedbackInput.trim()}
                style={{ background: 'linear-gradient(135deg, #0284c7, #3b82f6)' }}
              >
                {isSubmittingFeedback ? 'Adapting...' : 'Submit & Auto-Adapt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Save As New Template Modal ────────────────────────────────────── */}
      {showSaveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '24px', background: '#0f172a', border: '1px solid #38bdf8' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', marginTop: 0, marginBottom: '14px' }}>
              💾 Save As Reusable Statutory Template
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '18px' }}>
              Store this verified statutory mapping configuration containing all Schedule III fields under a custom name to automate filings for any entity in future financial years.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>Template Name *</label>
                <input
                  type="text"
                  placeholder="e.g. AOC-4 Manufacturing Entities Template"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>Applicable To</label>
                <input
                  type="text"
                  placeholder="e.g. Private Limited / Section 8 / One Person Company"
                  value={newTemplateAppliesTo}
                  onChange={(e) => setNewTemplateAppliesTo(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600 }}>Description / Statutory Notes</label>
                <textarea
                  rows={3}
                  placeholder="Add notes about accounting standards, specific schedule treatments, or exemptions..."
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', background: '#020617', border: '1px solid #334155', color: '#fff', marginTop: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setShowSaveModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveAsNewTemplate}
                disabled={!newTemplateName.trim()}
                style={{ background: '#10b981', borderColor: '#34d399' }}
              >
                Confirm &amp; Store Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatutoryTemplateStudio;
