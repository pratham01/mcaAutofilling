import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, AlertTriangle, XCircle, Upload, Database, RefreshCw, Code, Check } from 'lucide-react';
import { SourceDocument, SourceField } from '../../shared/types';

interface FileIngestSectionProps {
  currentDocument: SourceDocument | null;
  onDocumentLoaded: (doc: SourceDocument) => void;
}

export const FileIngestSection: React.FC<FileIngestSectionProps> = ({
  currentDocument,
  onDocumentLoaded,
}) => {
  const [presets, setPresets] = useState<Array<{ name: string; displayName: string; ext: string }>>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('job_applicant.json');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isRawEditorOpen, setIsRawEditorOpen] = useState<boolean>(false);
  const [rawText, setRawText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load presets list on mount
  useEffect(() => {
    fetch('/api/presets')
      .then((res) => res.json())
      .then((data) => {
        setPresets(data);
        if (data.length > 0 && !currentDocument) {
          loadPreset(data[0].name);
        }
      })
      .catch((err) => console.error('Failed to load presets:', err));
  }, []);

  const loadPreset = async (presetName: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/presets/${presetName}`);
      if (!res.ok) throw new Error(`Failed to load preset ${presetName}`);
      const doc: SourceDocument = await res.json();
      setSelectedPreset(presetName);
      setRawText(doc.rawContent);
      onDocumentLoaded(doc);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to parse uploaded file');
      const doc: SourceDocument = await res.json();
      setRawText(doc.rawContent);
      onDocumentLoaded(doc);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRawSubmit = async () => {
    if (!rawText.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, fileName: 'custom_input.json' }),
      });
      if (!res.ok) throw new Error('Failed to parse raw content');
      const doc: SourceDocument = await res.json();
      onDocumentLoaded(doc);
      setIsRawEditorOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeBadgeClass = (type: SourceField['inferredType']) => {
    switch (type) {
      case 'email': return 'badge-cyan';
      case 'phone': return 'badge-emerald';
      case 'date': return 'badge-purple';
      case 'number': return 'badge-amber';
      case 'boolean': return 'badge-emerald';
      default: return 'badge-cyan';
    }
  };

  return (
    <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header & Source File Chooser Bar */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="badge badge-cyan">Step 1 • Ingestion Agent</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Local System File Parser & Validator</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>Local Source Document</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Presets dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-input)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid #1e293b' }}>
              <Database size={16} color="var(--accent-cyan)" />
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Preset:</label>
              <select
                value={selectedPreset}
                onChange={(e) => loadPreset(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                disabled={isLoading}
              >
                {presets.map((p) => (
                  <option key={p.name} value={p.name} style={{ background: '#0f172a' }}>
                    {p.displayName} ({p.ext.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => setIsRawEditorOpen(!isRawEditorOpen)}
              style={{ fontSize: '13px', padding: '8px 14px' }}
            >
              <Code size={16} />
              {isRawEditorOpen ? 'Hide Editor' : 'Edit Raw Content'}
            </button>
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          style={{
            marginTop: '20px',
            border: isDragging ? '2px dashed var(--accent-cyan)' : '2px dashed #1e293b',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            textAlign: 'center',
            background: isDragging ? 'rgba(56, 189, 248, 0.05)' : 'rgba(255, 255, 255, 0.01)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.csv,.txt,.yaml,.yml';
            input.onchange = (e: any) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            };
            input.click();
          }}
        >
          <Upload size={28} color="var(--accent-cyan)" style={{ margin: '0 auto 10px', opacity: 0.9 }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>
            Drag and drop custom JSON / CSV file, or <span style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>Browse from system</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Supports JSON objects, CSV tables, Key-Value text configurations, and nested arrays.
          </div>
        </div>

        {/* Raw text editor collapse */}
        {isRawEditorOpen && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)' }}>Live Raw File Editor</label>
              <button className="btn btn-primary" onClick={handleRawSubmit} style={{ padding: '6px 14px', fontSize: '12px' }}>
                <Check size={14} /> Re-parse & Validate Data
              </button>
            </div>
            <textarea
              className="form-input mono-text"
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste JSON or CSV data here..."
              style={{ fontSize: '13px', lineHeight: '1.4' }}
            />
          </div>
        )}

        {errorMessage && (
          <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <XCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Validation Quality Report & Fields Table */}
      {currentDocument && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
          {/* Quality Summary Card */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              Document Quality Report
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Status</span>
                {currentDocument.validationReport.isValid ? (
                  <span className="badge badge-emerald"><CheckCircle2 size={12} /> Valid Schema</span>
                ) : (
                  <span className="badge badge-rose"><XCircle size={12} /> Errors Found</span>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Attributes</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                  {currentDocument.validationReport.totalFields}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Valid Fields</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#34d399' }}>
                  {currentDocument.validationReport.validFields}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Warnings</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#fbbf24' }}>
                  {currentDocument.validationReport.warningCount}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Format</span>
                <span className="badge badge-purple">{currentDocument.fileType.toUpperCase()}</span>
              </div>
            </div>

            {/* Errors / Warnings List if any */}
            {currentDocument.validationReport.errors.length > 0 && (
              <div style={{ background: 'rgba(244, 63, 94, 0.08)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', marginBottom: '6px' }}>Schema Errors:</div>
                {currentDocument.validationReport.errors.map((err, i) => (
                  <div key={i} style={{ fontSize: '11px', color: '#fca5a5', marginBottom: '4px' }}>
                    • <strong>{err.field}</strong>: {err.message}
                  </div>
                ))}
              </div>
            )}

            {currentDocument.validationReport.warnings.length > 0 && (
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24', marginBottom: '6px' }}>Data Notices:</div>
                {currentDocument.validationReport.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: '11px', color: '#fde68a', marginBottom: '4px' }}>
                    • <strong>{w.field}</strong>: {w.message}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fields Table */}
          <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
              Normalized Canonical Fields ({Object.keys(currentDocument.fields).length})
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>Attribute Key</th>
                  <th style={{ padding: '10px 12px' }}>Inferred Type</th>
                  <th style={{ padding: '10px 12px' }}>Normalized Value</th>
                  <th style={{ padding: '10px 12px' }}>Validation</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(currentDocument.fields).map((field) => (
                  <tr
                    key={field.key}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{field.label}</div>
                      <div className="mono-text" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{field.key}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`badge ${getTypeBadgeClass(field.inferredType)}`}>
                        {field.inferredType}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: '300px' }}>
                      <div style={{ color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {Array.isArray(field.value) ? `[ ${field.value.join(', ')} ]` : String(field.value)}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {field.isValid ? (
                        <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <CheckCircle2 size={14} /> Valid
                        </span>
                      ) : (
                        <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <AlertTriangle size={14} /> {field.validationError || 'Invalid'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
