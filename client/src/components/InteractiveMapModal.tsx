import React, { useState, useEffect } from 'react';
import {
  X,
  Map,
  Code2,
  Copy,
  Check,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Layers,
  MousePointerClick,
  CheckCircle2
} from 'lucide-react';
import { FieldMapping, TargetFormAnalysis } from '../../shared/types';

interface InteractiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUrl: string;
  mappings: FieldMapping[];
  targetAnalysis: TargetFormAnalysis | null;
}

export const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({
  isOpen,
  onClose,
  targetUrl,
  mappings,
  targetAnalysis,
}) => {
  const [mapPayload, setMapPayload] = useState<{
    bookmarkletCode: string;
    consoleInjectionScript: string;
    interactiveFieldList: Array<{
      selector: string;
      label: string;
      value: any;
      type: string;
      copySnippet: string;
    }>;
  } | null>(null);

  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedBookmarklet, setCopiedBookmarklet] = useState<boolean>(false);
  const [copiedFieldIndex, setCopiedFieldIndex] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'visual' | 'script' | 'manual'>('visual');

  useEffect(() => {
    if (isOpen && mappings.length > 0) {
      fetch('/api/generate-fallback-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl, mappings }),
      })
        .then((res) => res.json())
        .then((data) => setMapPayload(data))
        .catch((err) => console.error('Failed to generate fallback map:', err));
    }
  }, [isOpen, targetUrl, mappings]);

  if (!isOpen) return null;

  const handleCopyScript = () => {
    if (mapPayload?.consoleInjectionScript) {
      navigator.clipboard.writeText(mapPayload.consoleInjectionScript);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  const handleCopyBookmarklet = () => {
    if (mapPayload?.bookmarkletCode) {
      navigator.clipboard.writeText(mapPayload.bookmarkletCode);
      setCopiedBookmarklet(true);
      setTimeout(() => setCopiedBookmarklet(false), 2000);
    }
  };

  const handleCopyFieldValue = (value: string, index: number) => {
    navigator.clipboard.writeText(value);
    setCopiedFieldIndex(index);
    setTimeout(() => setCopiedFieldIndex(null), 1500);
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        className="glass-panel fade-in-up"
        style={{
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--accent-cyan-glow)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.2)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
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
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Map size={22} color="var(--accent-cyan)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
                  Complete Interactive Form Map & Bypass Assist
                </h2>
                <span className="badge badge-amber">Anti-Bot Fallback Hub</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Full visual mapping matrix and 1-click client-side injection for restricted or bot-gated websites.
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

        {/* Anti-bot notice banner */}
        <div
          style={{
            padding: '12px 28px',
            background: 'rgba(245, 158, 11, 0.08)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <ShieldAlert size={18} color="#fbbf24" />
          <div style={{ fontSize: '12px', color: '#fde68a' }}>
            <strong>Bot Restriction Resilience:</strong> When websites restrict headless browser drivers (via Cloudflare, Captchas, or auth walls), you can use this interactive map, copy fields in 1-click, or run the universal injection snippet directly in your browser tab!
          </div>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            padding: '14px 28px 0',
            background: 'rgba(15, 23, 42, 0.6)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setActiveSubTab('visual')}
            className="btn btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              background: activeSubTab === 'visual' ? 'var(--bg-card)' : 'transparent',
              borderColor: activeSubTab === 'visual' ? 'var(--accent-cyan)' : 'transparent',
              color: activeSubTab === 'visual' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            }}
          >
            <Layers size={14} /> Interactive Visual Map
          </button>
          <button
            onClick={() => setActiveSubTab('script')}
            className="btn btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              background: activeSubTab === 'script' ? 'var(--bg-card)' : 'transparent',
              borderColor: activeSubTab === 'script' ? 'var(--accent-cyan)' : 'transparent',
              color: activeSubTab === 'script' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            }}
          >
            <Code2 size={14} /> 1-Click Client Injection & Bookmarklet
          </button>
          <button
            onClick={() => setActiveSubTab('manual')}
            className="btn btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              background: activeSubTab === 'manual' ? 'var(--bg-card)' : 'transparent',
              borderColor: activeSubTab === 'manual' ? 'var(--accent-cyan)' : 'transparent',
              color: activeSubTab === 'manual' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            }}
          >
            <MousePointerClick size={14} /> Step-by-Step Clipboard Assist
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {/* SubTab 1: Visual Map */}
          {activeSubTab === 'visual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {mappings
                  .filter((m) => m.sourceKey)
                  .map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className="badge badge-cyan">{m.targetType}</span>
                        <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 600 }}>
                          {Math.round(m.confidence * 100)}% Confidence
                        </span>
                      </div>

                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                        {m.targetFieldName}
                      </div>

                      <div className="mono-text" style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginBottom: '10px' }}>
                        Selector: {m.targetSelector}
                      </div>

                      <div style={{ background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #1e293b' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                          Source: <strong>{m.sourceLabel}</strong>
                        </div>
                        <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {Array.isArray(m.sourceValue) ? m.sourceValue.join(', ') : String(m.sourceValue)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* SubTab 2: Client Injection Script & Bookmarklet */}
          {activeSubTab === 'script' && mapPayload && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Option A: Bookmarklet */}
              <div style={{ padding: '18px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    Option 1: Browser Bookmarklet (1-Click Fill)
                  </h4>
                  <button className="btn btn-secondary" onClick={handleCopyBookmarklet} style={{ padding: '6px 12px', fontSize: '12px' }}>
                    {copiedBookmarklet ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    {copiedBookmarklet ? 'Copied URL' : 'Copy Bookmarklet'}
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Drag this link to your bookmarks bar, or click to copy. Open the target website tab in your browser and click the bookmark to instantly fill all mapped fields with verified values.
                </p>
                <a
                  href={mapPayload.bookmarkletCode}
                  onClick={(e) => { e.preventDefault(); handleCopyBookmarklet(); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    background: 'linear-gradient(135deg, #0284c7, #6366f1)',
                    color: '#fff',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                    cursor: 'grab',
                  }}
                >
                  <Sparkles size={16} /> ⚡ FormMind QuickFill ({mappings.filter((m) => m.sourceKey).length} fields)
                </a>
              </div>

              {/* Option B: Console Script */}
              <div style={{ padding: '18px', background: 'var(--bg-input)', border: '1px solid #1e293b', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                    Option 2: DevTools Console Injection Script
                  </h4>
                  <button className="btn btn-primary" onClick={handleCopyScript} style={{ padding: '6px 14px', fontSize: '12px' }}>
                    {copiedScript ? <Check size={14} /> : <Copy size={14} />}
                    {copiedScript ? 'Copied Script!' : 'Copy JavaScript Snippet'}
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  Press <kbd style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#fff' }}>F12</kbd> on the target web page, switch to the <strong>Console</strong> tab, paste this script, and hit Enter:
                </p>
                <textarea
                  readOnly
                  className="form-input mono-text"
                  rows={8}
                  value={mapPayload.consoleInjectionScript}
                  style={{ fontSize: '12px', color: '#38bdf8' }}
                />
              </div>
            </div>
          )}

          {/* SubTab 3: Step-by-Step Clipboard Assist */}
          {activeSubTab === 'manual' && mapPayload && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Click any copy button to immediately copy the exact transformed value to your clipboard.
              </div>

              {mapPayload.interactiveFieldList.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>{item.label}</div>
                    <div className="mono-text" style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>{item.selector}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '13px', color: '#cbd5e1', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.copySnippet}
                    </div>

                    <button
                      className="btn btn-secondary"
                      onClick={() => handleCopyFieldValue(item.copySnippet, idx)}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      {copiedFieldIndex === idx ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                      {copiedFieldIndex === idx ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(15, 23, 42, 0.95)',
          }}
        >
          <button className="btn btn-primary" onClick={onClose}>
            Done & Return to Studio
          </button>
        </div>
      </div>
    </div>
  );
};
