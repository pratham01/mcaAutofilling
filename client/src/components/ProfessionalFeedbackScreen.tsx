import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  RefreshCw,
  Scale,
  Building2,
  Calendar,
  AlertTriangle,
  Sparkles,
  ArrowRightLeft,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
  Activity,
  FolderOpen,
  Plus,
  Lock
} from 'lucide-react';

interface ClientSummary {
  cin: string;
  companyName: string;
  financialYear: string;
  updatedAt: string;
  isActive: boolean;
  fieldCount: number;
  status: string;
}

interface FeedbackItem {
  id: string;
  timestamp: string;
  cin?: string;
  professionalText: string;
  category: string;
  status: 'applied' | 'reconciled' | 'noted';
  actionSummary: string;
  affectedFields: string[];
  reconciliationDiff?: {
    totalAssets: number;
    totalLiabilities: number;
    variance: number;
  };
}

export const ProfessionalFeedbackScreen: React.FC = () => {
  const [feedbackText, setFeedbackText] = useState('');
  const [category, setCategory] = useState<'Figure Correction' | 'Statutory Disclosure' | 'Compliance Date' | 'Column Reversal' | 'Selector Adjustment' | 'General'>('Figure Correction');
  const [history, setHistory] = useState<FeedbackItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mappingState, setMappingState] = useState<any>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'composer' | 'fieldViewer' | 'history'>('composer');

  // Client Isolation Workspaces
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedCin, setSelectedCin] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newCin, setNewCin] = useState<string>('');
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [isCreatingClient, setIsCreatingClient] = useState<boolean>(false);

  // Stream telemetry
  const [telemetry, setTelemetry] = useState<{ fps: number; activeUrl: string; streamActive: boolean }>({
    fps: 30,
    activeUrl: 'https://www.mca.gov.in',
    streamActive: true,
  });

  useEffect(() => {
    fetchClients();
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
        const active = data.activeCin || (data.clients && data.clients[0]?.cin) || '';
        setSelectedCin(active);
        if (active) {
          fetchHistory(active);
          fetchMappingState(active);
        }
      } else if (selectedCin) {
        fetchHistory(selectedCin);
        fetchMappingState(selectedCin);
      }
    } catch (_) {
      if (selectedCin) {
        fetchHistory(selectedCin);
        fetchMappingState(selectedCin);
      }
    }
  };

  const handleSelectClient = async (cin: string) => {
    setSelectedCin(cin);
    try {
      await fetch('/api/clients/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cin }),
      });
    } catch (_) {}
    fetchMappingState(cin);
    fetchHistory(cin);
  };

  const handleCreateClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCin.trim()) return;
    setIsCreatingClient(true);
    try {
      const res = await fetch('/api/clients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cin: newCin.trim().toUpperCase(), companyName: newCompanyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create client');
      setShowCreateModal(false);
      setNewCin('');
      setNewCompanyName('');
      await fetchClients();
      setStatusMsg({ type: 'success', text: `Created isolated client workspace for ${data.cin} (${newCompanyName || data.cin})` });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsCreatingClient(false);
    }
  };

  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/aoc4/live-telemetry');
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (_) {}
  };

  const fetchHistory = async (cin = selectedCin) => {
    try {
      const res = await fetch(`/api/aoc4/feedback?cin=${encodeURIComponent(cin)}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (_) {}
  };

  const fetchMappingState = async (cin = selectedCin) => {
    try {
      const res = await fetch(`/api/aoc4/mapping-state?cin=${encodeURIComponent(cin)}`);
      if (res.ok) {
        const data = await res.json();
        setMappingState(data);
      }
    } catch (_) {}
  };

  const handleSubmit = async (overrideText?: string, overrideCategory?: string) => {
    const textToSend = (overrideText || feedbackText).trim();
    if (!textToSend) return;

    setIsSubmitting(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/aoc4/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackText: textToSend,
          category: overrideCategory || category,
          cin: selectedCin,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit feedback');

      setStatusMsg({
        type: 'success',
        text: `✅ Background engine adapted for ${selectedCin}: ${data.message}`,
      });
      if (!overrideText) setFeedbackText('');
      await fetchHistory(selectedCin);
      await fetchMappingState(selectedCin);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `❌ Error adapting system: ${err.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Preset Directives for CAs/CSs
  const quickDirectives = [
    {
      label: '⚖️ Rebalance Short-Term Provisions',
      text: 'Short-term provisions current year should be 429462 and previous year 346137',
      cat: 'Figure Correction' as const,
    },
    {
      label: '🔄 Swap Current ⮂ Previous Figures',
      text: 'Swap current and previous reporting period columns across all balance sheet and P&L schedules',
      cat: 'Column Reversal' as const,
    },
    {
      label: '💼 Set Trade Payables (Others)',
      text: 'Trade payables (others) current period is 2248 and previous period is 337',
      cat: 'Figure Correction' as const,
    },
    {
      label: '📅 Set AGM & Board Dates',
      text: 'Board Meeting Date is 05/09/2026 and Actual AGM Date is 20/09/2026',
      cat: 'Compliance Date' as const,
    },
    {
      label: '🏢 Verify Auditor Details',
      text: 'Auditor firm Sarda Mantri and Company, PAN AABFS4512K, FRN 138258W, Member 151073',
      cat: 'Statutory Disclosure' as const,
    },
    {
      label: '📊 Set Other Current Liabilities',
      text: 'Other current liabilities current period should be 1700000 and previous period 0',
      cat: 'Figure Correction' as const,
    },
  ];

  // Calculate dynamic Schedule III balance equilibrium
  const calculateEquilibrium = () => {
    if (!mappingState?.partB_balanceSheet) return null;
    let curL = 0;
    let curA = 0;
    let prevL = 0;
    let prevA = 0;

    mappingState.partB_balanceSheet.forEach((r: any) => {
      const c = Number(r.currentReportingPeriod) || 0;
      const p = Number(r.previousReportingPeriod) || 0;
      if (r.category && r.category.includes('Asset')) {
        curA += c;
        prevA += p;
      } else {
        curL += c;
        prevL += p;
      }
    });

    return {
      curL,
      curA,
      curDiff: curA - curL,
      prevL,
      prevA,
      prevDiff: prevA - prevL,
    };
  };

  const eq = calculateEquilibrium();

  // Filtered field list for direct inspection
  const getAllFields = () => {
    const list: Array<{ section: string; schedule: string; label: string; current: string; previous?: string; id: string }> = [];
    if (mappingState?.partB_balanceSheet) {
      mappingState.partB_balanceSheet.forEach((r: any) => {
        list.push({
          section: 'Part B (Balance Sheet)',
          schedule: r.schedule || '',
          label: r.label,
          current: r.currentReportingPeriod,
          previous: r.previousReportingPeriod,
          id: r.id,
        });
      });
    }
    if (mappingState?.partC_profitAndLoss) {
      mappingState.partC_profitAndLoss.forEach((r: any) => {
        list.push({
          section: 'Part C (Profit & Loss)',
          schedule: r.schedule || '',
          label: r.label,
          current: r.currentReportingPeriod,
          previous: r.previousReportingPeriod,
          id: r.id,
        });
      });
    }
    if (mappingState?.companyInfo) {
      Object.entries(mappingState.companyInfo).forEach(([k, v]: [string, any]) => {
        if (typeof v === 'string') {
          list.push({
            section: 'Part A (Company Master)',
            schedule: 'Info',
            label: k,
            current: v,
            id: k,
          });
        }
      });
    }
    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase();
    return list.filter((item) => item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q) || item.section.toLowerCase().includes(q));
  };

  const filteredFields = getAllFields();

  return (
    <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* ── Header Banner ─────────────────────────────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 8px 32px rgba(2, 6, 23, 0.6)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="badge badge-cyan" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={12} /> Autonomous Background Adaptation Engine
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Activity size={12} /> Live Observability ({telemetry.fps} FPS)
              </span>
              <span className="badge badge-purple" style={{ fontSize: '11px' }}>
                Companies Act 2013 • Schedule III
              </span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', margin: '4px 0', letterSpacing: '-0.02em' }}>
              Professional Feedback &amp; Continuous Background Adaptation
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', margin: 0, maxWidth: '850px', lineHeight: '1.5' }}>
              Provide natural language statutory corrections, schedule re-allocations, or filing directives. The system autonomously adapts the Form AOC-4 mapping state and active templates in the background with zero filing interruption.
            </p>
          </div>

          {/* Active Company Status Box */}
          <div
            style={{
              padding: '12px 18px',
              background: 'rgba(2, 6, 23, 0.7)',
              borderRadius: '8px',
              border: '1px solid #1e293b',
              minWidth: '280px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Building2 size={16} color="#38bdf8" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                {mappingState?.companyInfo?.companyName || 'GURPREET SALUJA FINANCIAL SERVICES'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
              CIN: {mappingState?.companyInfo?.cin || selectedCin}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '6px', borderTop: '1px solid #1e293b', paddingTop: '4px' }}>
              <span>Period: 2025-26</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>● Background Engine Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Client Workspace Isolation Bar ────────────────────────────── */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          background: 'rgba(2, 6, 23, 0.75)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpen size={18} color="#38bdf8" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
              Client Workspace:
            </span>
          </div>

          <select
            value={selectedCin}
            onChange={(e) => handleSelectClient(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#0f172a',
              color: '#38bdf8',
              border: '1px solid #38bdf8',
              fontSize: '13px',
              fontWeight: 700,
              minWidth: '320px',
            }}
          >
            {clients.map((c) => (
              <option key={c.cin} value={c.cin}>
                {c.companyName} ({c.cin}) {c.isActive ? '★ [Active]' : ''}
              </option>
            ))}
            {clients.length === 0 && (
              <option value={selectedCin}>
                {mappingState?.companyInfo?.companyName || 'Gurpreet Saluja Financial Services'} ({selectedCin})
              </option>
            )}
          </select>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', borderColor: '#059669' }}
          >
            <Plus size={14} /> + New Client Workspace
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-cyan" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ShieldCheck size={13} /> Strict Client Sandboxing Active
          </span>
          <span className="badge badge-purple" style={{ fontSize: '11px' }}>
            {mappingState?.companyInfo?.cin || selectedCin}
          </span>
        </div>
      </div>

      {/* ── Schedule III Equilibrium Cards ─────────────────────────────────── */}
      {eq && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Current Period Balance */}
          <div
            className="glass-panel"
            style={{
              padding: '18px',
              borderLeft: eq.curDiff === 0 ? '4px solid #10b981' : '4px solid #f59e0b',
              background: 'rgba(15, 23, 42, 0.65)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                Current Reporting Period Balance (FY 2025-26)
              </span>
              <span className={`badge ${eq.curDiff === 0 ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                {eq.curDiff === 0 ? '✓ Balanced' : '⚠️ Reconciling Diff'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '6px' }}>
              <span style={{ color: '#cbd5e1' }}>Total Equity &amp; Liabilities:</span>
              <span style={{ fontWeight: 700, color: '#38bdf8' }}>₹ {eq.curL.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
              <span style={{ color: '#cbd5e1' }}>Total Assets:</span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>₹ {eq.curA.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ borderTop: '1px solid #1e293b', marginTop: '8px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Reconciliation Variance:</span>
              <span style={{ fontWeight: 700, color: eq.curDiff === 0 ? '#10b981' : '#fbbf24' }}>
                {eq.curDiff === 0 ? '₹ 0 (Exact Match)' : `₹ ${Math.abs(eq.curDiff).toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>

          {/* Previous Period Balance */}
          <div
            className="glass-panel"
            style={{
              padding: '18px',
              borderLeft: eq.prevDiff === 0 ? '4px solid #10b981' : '4px solid #f59e0b',
              background: 'rgba(15, 23, 42, 0.65)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                Previous Reporting Period Balance (FY 2024-25)
              </span>
              <span className={`badge ${eq.prevDiff === 0 ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '10px' }}>
                {eq.prevDiff === 0 ? '✓ Balanced' : '⚠️ Reconciling Diff'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '6px' }}>
              <span style={{ color: '#cbd5e1' }}>Total Equity &amp; Liabilities:</span>
              <span style={{ fontWeight: 700, color: '#a78bfa' }}>₹ {eq.prevL.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px' }}>
              <span style={{ color: '#cbd5e1' }}>Total Assets:</span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>₹ {eq.prevA.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ borderTop: '1px solid #1e293b', marginTop: '8px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748b' }}>Reconciliation Variance:</span>
              <span style={{ fontWeight: 700, color: eq.prevDiff === 0 ? '#10b981' : '#fbbf24' }}>
                {eq.prevDiff === 0 ? '₹ 0 (Exact Match)' : `₹ ${Math.abs(eq.prevDiff).toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>

          {/* Continuous Observability Mini PiP */}
          <div
            className="glass-panel"
            style={{
              padding: '14px',
              borderLeft: '4px solid #38bdf8',
              background: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Live Portal View
                </span>
                <span className="badge badge-cyan" style={{ fontSize: '9px' }}>{telemetry.fps} FPS</span>
              </div>
              <div style={{ position: 'relative', borderRadius: '4px', overflow: 'hidden', height: '88px', background: '#000', border: '1px solid #1e293b' }}>
                <img
                  src="http://localhost:3001/api/aoc4/live-stream"
                  alt="Live Portal Stream"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Zero-snapshot CDP stream</span>
              <span style={{ color: '#94a3b8' }}>Target: MCA Form AOC-4</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Tabbed View ───────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '18px' }}>
          <button
            onClick={() => setActiveTab('composer')}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'composer' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: activeTab === 'composer' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <MessageSquare size={16} /> 💬 Professional Feedback Composer
          </button>

          <button
            onClick={() => setActiveTab('fieldViewer')}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'fieldViewer' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: activeTab === 'fieldViewer' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Scale size={16} /> 📋 Full Form AOC-4 Statutory Mapping State ({filteredFields.length} Fields)
          </button>

          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'history' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: activeTab === 'history' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <RefreshCw size={16} /> 📜 Background Adaptation History ({history.length})
          </button>
        </div>

        {/* ── TAB 1: FEEDBACK COMPOSER ────────────────────────────────────── */}
        {activeTab === 'composer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Category Selector Pills */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                Select Statutory Directive Category:
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'Figure Correction', label: '⚖️ Figure Correction' },
                  { id: 'Statutory Disclosure', label: '🏢 Statutory Disclosure' },
                  { id: 'Compliance Date', label: '📅 Compliance Date' },
                  { id: 'Column Reversal', label: '🔄 Column Reversal' },
                  { id: 'Selector Adjustment', label: '🔌 Selector Adjustment' },
                  { id: 'General', label: '📝 General Filing' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id as any)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: category === cat.id ? '1px solid #38bdf8' : '1px solid #334155',
                      background: category === cat.id ? 'rgba(56, 189, 248, 0.25)' : '#0f172a',
                      color: category === cat.id ? '#38bdf8' : '#cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Preset Directives */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '8px' }}>
                ⚡ Quick Preset Directives (1-Click Insertion):
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {quickDirectives.map((qd, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(qd.text, qd.cat)}
                    disabled={isSubmitting}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #1e293b',
                      background: 'rgba(2, 6, 23, 0.6)',
                      color: '#cbd5e1',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'border 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
                  >
                    {qd.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Input Textarea */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', display: 'block', marginBottom: '6px' }}>
                Professional Statutory Instruction / Adjustment Text:
              </label>
              <textarea
                rows={4}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="e.g. Previous reporting period figures for Trade Payables (Others) should be 337 and Short-Term Provisions should be 346137. Also set actual AGM date to 20/09/2026."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: '#090d16',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Status Message Notification */}
            {statusMsg && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: statusMsg.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
                  color: statusMsg.type === 'success' ? '#6ee7b7' : '#fca5a5',
                }}
              >
                {statusMsg.text}
              </div>
            )}

            {/* Submit & Quick Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '12px' }}>
                <ShieldCheck size={14} color="#10b981" />
                <span>Automatically syncs mapping state, default template, and Chrome extension in background.</span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleSubmit('Swap current and previous columns', 'Column Reversal')}
                  disabled={isSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', borderColor: '#7e22ce' }}
                >
                  <ArrowRightLeft size={14} /> Swap Current ⮂ Previous
                </button>

                <button
                  className="btn btn-primary"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting || !feedbackText.trim()}
                  style={{
                    padding: '10px 22px',
                    background: 'linear-gradient(135deg, #0284c7, #3b82f6)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="spin" /> Updating System in Background...
                    </>
                  ) : (
                    <>
                      <Send size={14} /> 🚀 Submit Feedback &amp; Auto-Adapt
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: FULL STATUTORY FIELD VIEWER ────────────────────────────── */}
        {activeTab === 'fieldViewer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Search any Schedule III field (e.g. trade payables, provisions, revenue, auditor)..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '460px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#090d16',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '13px',
                  }}
                />
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Showing <b>{filteredFields.length}</b> statutory fields
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#090d16', borderBottom: '2px solid #1e293b', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', width: '22%' }}>Statutory Section</th>
                    <th style={{ padding: '10px 12px', width: '38%' }}>Line Item / Disclosure Field</th>
                    <th style={{ padding: '10px 12px', width: '20%', color: '#38bdf8' }}>Current Period (₹)</th>
                    <th style={{ padding: '10px 12px', width: '20%', color: '#a78bfa' }}>Previous Period (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFields.map((f, i) => (
                    <tr key={f.id + i} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px 12px', color: '#94a3b8', fontSize: '12px' }}>
                        <span className="badge badge-purple" style={{ fontSize: '10px' }}>{f.section}</span>
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 500, color: '#e2e8f0' }}>
                        <div>{f.label}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>{f.id}</div>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#38bdf8', fontWeight: 600, fontFamily: 'monospace' }}>
                        {f.current || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#a78bfa', fontWeight: 600, fontFamily: 'monospace' }}>
                        {f.previous !== undefined ? f.previous : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: BACKGROUND ADAPTATION HISTORY ──────────────────────────── */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>
                Complete Audit Trail of Background System Adaptations
              </span>
              <button
                className="btn btn-secondary"
                onClick={fetchHistory}
                style={{ fontSize: '12px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <RefreshCw size={12} /> Refresh Log
              </button>
            </div>

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '13px' }}>
                No professional feedback recorded yet. Type instructions above or click a preset directive to begin.
              </div>
            ) : (
              history.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '8px',
                    background: '#090d16',
                    border: '1px solid #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                        {item.status === 'applied' ? '✓ APPLIED IN BACKGROUND' : 'NOTED'}
                      </span>
                      <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                        {item.category}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', marginTop: '4px' }}>
                    "{item.professionalText}"
                  </div>

                  <div style={{ fontSize: '12px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 10px', borderRadius: '4px', marginTop: '4px' }}>
                    ⚡ <b>Autonomous Background Action:</b> {item.actionSummary}
                  </div>

                  {item.reconciliationDiff && (
                    <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      <span>Resulting Assets: ₹ {item.reconciliationDiff.totalAssets.toLocaleString('en-IN')}</span>
                      <span>Resulting Liabilities: ₹ {item.reconciliationDiff.totalLiabilities.toLocaleString('en-IN')}</span>
                      <span style={{ color: item.reconciliationDiff.variance === 0 ? '#10b981' : '#fbbf24', fontWeight: 600 }}>
                        Variance: ₹ {item.reconciliationDiff.variance.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Create New Client Workspace Modal ──────────────────────────────── */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '28px',
              background: '#0b1329',
              border: '1px solid #38bdf8',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="#38bdf8" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Create Isolated Client Workspace
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '18px', lineHeight: '1.5' }}>
              Each client receives a dedicated, sandboxed workspace directory. Data, mapping states, and statutory feedback are strictly isolated to prevent any cross-client data contamination.
            </p>

            <form onSubmit={handleCreateClientSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Corporate Identity Number (CIN) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. U72900DL2023PTC123456"
                  value={newCin}
                  onChange={(e) => setNewCin(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: '#070b14',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Company Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ACME TECH PRIVATE LIMITED"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: '#070b14',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClient}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '8px 18px', background: '#0284c7' }}
                >
                  {isCreatingClient ? 'Initializing Workspace...' : 'Create & Switch Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalFeedbackScreen;
