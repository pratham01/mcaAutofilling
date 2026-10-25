import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  ChevronDown,
  Plus,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  X
} from 'lucide-react';

export interface ClientSummary {
  cin: string;
  companyName: string;
  financialYear: string;
  updatedAt: string;
  isActive: boolean;
  fieldCount: number;
  status: string;
}

interface ClientWorkspaceHeaderProps {
  activeCin: string;
  onClientChange: (newCin: string) => void;
}

export const ClientWorkspaceHeader: React.FC<ClientWorkspaceHeaderProps> = ({
  activeCin,
  onClientChange,
}) => {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // New Client Form state
  const [newCin, setNewCin] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newFY, setNewFY] = useState('2025-26');
  const [isCreating, setIsCreating] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
        if (data.activeCin && !activeCin) {
          onClientChange(data.activeCin);
        }
      }
    } catch (e: any) {
      console.error('Error fetching client list:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSelectClient = async (cin: string) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/clients/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cin }),
      });
      if (res.ok) {
        onClientChange(cin);
        setIsOpen(false);
        setSuccess(`Switched to isolated workspace: ${cin}`);
        setTimeout(() => setSuccess(''), 4000);
        await fetchClients();
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to switch client');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCin = newCin.trim().toUpperCase();
    if (!cleanCin || cleanCin.length < 8) {
      setError('Please provide a valid Corporate Identification Number (CIN).');
      return;
    }
    const cleanName = newCompanyName.trim() || `Company ${cleanCin}`;

    try {
      setIsCreating(true);
      setError('');
      const res = await fetch('/api/clients/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cin: cleanCin,
          companyName: cleanName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create workspace');

      setSuccess(`✅ Successfully created isolated client workspace for ${cleanCin}!`);
      setTimeout(() => setSuccess(''), 4000);
      setShowNewModal(false);
      setNewCin('');
      setNewCompanyName('');
      onClientChange(cleanCin);
      await fetchClients();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const currentClient = clients.find((c) => c.cin === activeCin) || {
    cin: activeCin || '',
    companyName: activeCin ? `Client (${activeCin})` : 'Select Client Workspace',
    financialYear: '2025-26',
    isActive: true,
    fieldCount: 0,
    status: 'ready',
    updatedAt: new Date().toISOString(),
  };

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.95), rgba(8, 14, 26, 0.95))',
        borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
        padding: '10px 32px',
        position: 'relative',
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Left: Active Workspace Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#34d399',
              letterSpacing: '0.03em',
            }}
          >
            <Lock size={13} color="#34d399" />
            ISOLATED CLIENT WORKSPACE
          </div>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(30, 41, 59, 0.75)',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                padding: '6px 14px',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.6)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.25)')}
            >
              <Building2 size={16} color="#38bdf8" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', lineHeight: 1.2 }}>
                  {currentClient.companyName}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '8px', marginTop: '2px' }}>
                  <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{currentClient.cin}</span>
                  <span>•</span>
                  <span>FY {currentClient.financialYear}</span>
                </div>
              </div>
              <ChevronDown size={14} color="#94a3b8" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '6px',
                  width: '420px',
                  background: '#0b1329',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                  zIndex: 200,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderBottom: '1px solid #1e293b',
                    background: 'rgba(15, 23, 42, 0.7)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>
                    SWITCH CLIENT FILING WORKSPACE
                  </span>
                  <button
                    onClick={() => fetchClients()}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                    }}
                  >
                    <RefreshCw size={11} /> Refresh
                  </button>
                </div>

                <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  {clients.map((c) => {
                    const isSelected = c.cin === currentClient.cin;
                    return (
                      <div
                        key={c.cin}
                        onClick={() => handleSelectClient(c.cin)}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid rgba(30, 41, 59, 0.5)',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                          transition: 'background 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#38bdf8' : '#e2e8f0' }}>
                            {c.companyName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '6px', marginTop: '2px' }}>
                            <span style={{ fontFamily: 'monospace' }}>{c.cin}</span>
                            <span>•</span>
                            <span>{c.fieldCount} Statutory Schedules</span>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 size={16} color="#38bdf8" />}
                      </div>
                    );
                  })}
                </div>

                {/* Dropdown Footer: New Client Button */}
                <div style={{ padding: '8px 12px', background: 'rgba(15, 23, 42, 0.95)', borderTop: '1px solid #1e293b' }}>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setShowNewModal(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '6px',
                      color: '#38bdf8',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Plus size={14} /> + New Client Filing Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Security Guarantee & Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#94a3b8',
              background: 'rgba(15, 23, 42, 0.5)',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(148, 163, 184, 0.15)',
            }}
          >
            <ShieldCheck size={14} color="#10b981" />
            <span>Cross-Client Protection: <b>Enforced &amp; Active</b></span>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: 'linear-gradient(135deg, #0284c7, #2563eb)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
            }}
          >
            <Plus size={14} /> New Client
          </button>
        </div>
      </div>

      {/* Success / Error notification */}
      {(success || error) && (
        <div
          style={{
            maxWidth: '1440px',
            margin: '8px auto 0',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            background: success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${success ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: success ? '#34d399' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          <span>{success || error}</span>
        </div>
      )}

      {/* New Client Workspace Modal */}
      {showNewModal && (
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
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#0b1329',
              border: '1px solid #1e293b',
              borderRadius: '14px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #1e293b',
                background: 'rgba(15, 23, 42, 0.85)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="#38bdf8" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Create Isolated Client Filing Workspace
                </h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateClient} style={{ padding: '20px' }}>
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#94a3b8',
                  marginBottom: '16px',
                  lineHeight: 1.5,
                }}
              >
                <b style={{ color: '#38bdf8' }}>Strict Client Isolation:</b> A dedicated workspace will be provisioned under{' '}
                <code style={{ color: '#f8fafc' }}>data/clients/&lt;CIN&gt;/</code>. No financials or disclosures from previous clients will ever leak or contaminate this workspace.
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Corporate Identification Number (CIN) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. U72900KA2020PTC123456"
                  value={newCin}
                  onChange={(e) => setNewCin(e.target.value.toUpperCase())}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#070b14',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Company Name (ROC Registered) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. APEX TECH SOLUTIONS PRIVATE LIMITED"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#070b14',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
                  Financial Year
                </label>
                <input
                  type="text"
                  value={newFY}
                  onChange={(e) => setNewFY(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#070b14',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#94a3b8',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  style={{
                    padding: '8px 18px',
                    background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: isCreating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Lock size={14} /> {isCreating ? 'Provisioning...' : 'Create Isolated Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientWorkspaceHeader;
