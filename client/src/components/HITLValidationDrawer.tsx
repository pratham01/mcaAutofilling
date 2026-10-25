import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit3,
  Send,
  RotateCcw,
  Sparkles,
  Check
} from 'lucide-react';
import { DualValidationResult, FieldMapping } from '../../shared/types';

interface HITLValidationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  validationResult: DualValidationResult | null;
  mappings: FieldMapping[];
  targetUrl: string;
  onApproveAndSubmit: (overrides: Record<string, any>) => void;
}

export const HITLValidationDrawer: React.FC<HITLValidationDrawerProps> = ({
  isOpen,
  onClose,
  validationResult,
  mappings,
  targetUrl,
  onApproveAndSubmit,
}) => {
  const [overrides, setOverrides] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);

  if (!isOpen || !validationResult) return null;

  const handleOverrideChange = (selector: string, value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [selector]: value,
    }));
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await fetch('/api/hitl-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'approved',
          mappings,
          domain: targetUrl,
          overrides,
        }),
      });

      onApproveAndSubmit(overrides);
      setSubmissionSuccess(true);
      setTimeout(() => {
        setSubmissionSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to submit HITL approval:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        className="glass-panel fade-in-up"
        style={{
          width: '100%',
          maxWidth: '860px',
          height: '100%',
          borderRadius: 0,
          borderLeft: '1px solid var(--accent-cyan-glow)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-20px 0 50px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.95)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid var(--accent-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={24} color="var(--accent-emerald)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                  Human-in-the-Loop Validation Review
                </h2>
                <span className={`badge ${validationResult.passed ? 'badge-emerald' : 'badge-amber'}`}>
                  Score: {validationResult.overallScore}%
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Side-by-side verification of local source data versus filled form DOM state.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Validation Score Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            padding: '16px 24px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fields Checked</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{validationResult.totalFieldsChecked}</div>
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Exact Matches</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#34d399' }}>{validationResult.matchCount}</div>
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Warnings / Partial</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fbbf24' }}>{validationResult.warningCount}</div>
          </div>

          <div style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Discrepancies</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f87171' }}>{validationResult.mismatchCount}</div>
          </div>
        </div>

        {/* Diff Comparison Table */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {validationResult.diffs.map((diff, idx) => {
              const currentVal = overrides[diff.targetSelector] !== undefined
                ? overrides[diff.targetSelector]
                : diff.actualFilledValue;

              return (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border:
                      diff.status === 'match'
                        ? '1px solid rgba(16, 185, 129, 0.2)'
                        : diff.status === 'warning'
                        ? '1px solid rgba(245, 158, 11, 0.3)'
                        : '1px solid rgba(244, 63, 94, 0.4)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{diff.targetFieldName}</span>
                      <span className="mono-text" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginLeft: '8px' }}>
                        {diff.targetSelector}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {diff.status === 'match' && (
                        <span className="badge badge-emerald"><CheckCircle2 size={12} /> Match</span>
                      )}
                      {diff.status === 'warning' && (
                        <span className="badge badge-amber"><AlertTriangle size={12} /> Notice</span>
                      )}
                      {diff.status === 'mismatch' && (
                        <span className="badge badge-rose"><XCircle size={12} /> Discrepancy</span>
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{diff.matchScore}%</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Source File Value */}
                    <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #1e293b' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Expected (Source: {diff.sourceLabel})
                      </div>
                      <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500 }}>
                        {Array.isArray(diff.expectedValue) ? diff.expectedValue.join(', ') : String(diff.expectedValue)}
                      </div>
                    </div>

                    {/* Filled Form Value / Editable Override */}
                    <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>Actual Filled in Form:</div>
                        <Edit3 size={12} color="var(--text-muted)" />
                      </div>
                      <input
                        type="text"
                        value={String(currentVal)}
                        onChange={(e) => handleOverrideChange(diff.targetSelector, e.target.value)}
                        className="form-input"
                        style={{ fontSize: '13px', padding: '4px 8px', background: 'transparent' }}
                      />
                    </div>
                  </div>

                  {diff.message && (
                    <div style={{ fontSize: '11px', color: diff.status === 'match' ? '#34d399' : 'var(--text-muted)', marginTop: '8px' }}>
                      Agent QA Note: {diff.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '20px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.95)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            <Sparkles size={14} color="var(--accent-cyan)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Approving reinforces memory weights for domain <strong>{targetUrl}</strong>.
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel Review
            </button>
            <button className="btn btn-primary" onClick={handleApprove} disabled={isSubmitting}>
              {submissionSuccess ? (
                <>
                  <Check size={16} /> Approved & Submitted!
                </>
              ) : (
                <>
                  <Send size={16} /> Approve & Finalize Submission
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
