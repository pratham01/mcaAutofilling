import React, { useState, useEffect } from 'react';
import {
  Globe,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Sliders,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Map,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import {
  SourceDocument,
  TargetFormAnalysis,
  FieldMapping,
  AgentStep,
  DualValidationResult
} from '../../shared/types';

interface OrchestratorStudioProps {
  sourceDoc: SourceDocument | null;
  onOpenFallbackMap: () => void;
  onOpenHITL: () => void;
  targetAnalysis: TargetFormAnalysis | null;
  setTargetAnalysis: (a: TargetFormAnalysis | null) => void;
  mappings: FieldMapping[];
  setMappings: (m: FieldMapping[]) => void;
  validationResult: DualValidationResult | null;
  setValidationResult: (v: DualValidationResult | null) => void;
  agentSteps: AgentStep[];
  setAgentSteps: React.Dispatch<React.SetStateAction<AgentStep[]>>;
  targetUrl: string;
  setTargetUrl: (u: string) => void;
}

export const OrchestratorStudio: React.FC<OrchestratorStudioProps> = ({
  sourceDoc,
  onOpenFallbackMap,
  onOpenHITL,
  targetAnalysis,
  setTargetAnalysis,
  mappings,
  setMappings,
  validationResult,
  setValidationResult,
  agentSteps,
  setAgentSteps,
  targetUrl,
  setTargetUrl,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'matrix' | 'logs' | 'browser'>('matrix');
  const [latestScreenshot, setLatestScreenshot] = useState<string | null>(null);
  const [filterUnmapped, setFilterUnmapped] = useState<boolean>(false);

  // Quick URL target preset switcher
  const handleQuickUrl = (url: string) => {
    setTargetUrl(url);
    setTargetAnalysis(null);
    setMappings([]);
    setValidationResult(null);
  };

  const addLocalStep = (
    agentName: AgentStep['agentName'],
    stepName: string,
    status: AgentStep['status'],
    message: string,
    screenshot?: string
  ) => {
    setAgentSteps((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        timestamp: new Date().toISOString(),
        agentName,
        stepName,
        status,
        message,
        screenshot,
      },
    ]);
  };

  // Run the complete automated agent pipeline
  const runFullPipeline = async () => {
    if (!sourceDoc) {
      alert('Please load or upload a source document in Step 1 first!');
      return;
    }

    setIsRunning(true);
    setAgentSteps([]);
    setValidationResult(null);

    try {
      // Step A: DOM Inspection Agent
      addLocalStep('DOM Inspector Agent', 'Inspecting Target DOM', 'running', `Connecting to ${targetUrl}...`);
      const inspectRes = await fetch('/api/inspect-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
      if (!inspectRes.ok) throw new Error('DOM inspection failed');
      const inspectData = await inspectRes.json();
      setTargetAnalysis(inspectData.analysis);
      if (inspectData.screenshotBase64) setLatestScreenshot(inspectData.screenshotBase64);

      // Step B: Semantic Mapper Agent
      addLocalStep('Semantic Mapper Agent', 'Computing Semantic Alignment', 'running', 'Matching source attributes to form selectors...');
      const mapRes = await fetch('/api/generate-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceDoc,
          formFields: inspectData.analysis.fields,
          targetUrl,
        }),
      });
      if (!mapRes.ok) throw new Error('Semantic mapping synthesis failed');
      const mapData = await mapRes.json();
      const generatedMappings: FieldMapping[] = mapData.mappings;
      setMappings(generatedMappings);

      // If site is restricted or has bot challenge
      if (inspectData.analysis.isRestricted) {
        addLocalStep(
          'Execution & Driver Agent',
          'Bot Restriction Detected',
          'warning',
          'Site employs bot mitigation. Prepared Complete Interactive Fallback Map and 1-Click Bookmarklet payload.'
        );
        setIsRunning(false);
        onOpenFallbackMap();
        return;
      }

      // Step C: Automated Execution Agent
      addLocalStep('Execution & Driver Agent', 'Automating Form Fill', 'running', 'Injecting validated values into browser context...');
      const execRes = await fetch('/api/execute-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl,
          mappings: generatedMappings,
          sourceDoc,
        }),
      });
      if (!execRes.ok) throw new Error('Form filling execution failed');
      const execData = await execRes.json();

      if (execData.execution.screenshotBase64) {
        setLatestScreenshot(execData.execution.screenshotBase64);
      }
      setValidationResult(execData.validation);

      // Step D: Validation & HITL
      addLocalStep(
        'Validation & QA Agent',
        'Dual Validation Complete',
        execData.validation.passed ? 'completed' : 'warning',
        `Validation Score: ${execData.validation.overallScore}%. Mismatches: ${execData.validation.mismatchCount}. Opening HITL Review.`
      );

      // Automatically open HITL verification drawer
      onOpenHITL();
    } catch (err: any) {
      addLocalStep('Execution & Driver Agent', 'Pipeline Error', 'failed', err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleManualMappingChange = (targetSelector: string, newSourceKey: string) => {
    if (!sourceDoc) return;
    setMappings(
      mappings.map((m) => {
        if (m.targetSelector === targetSelector) {
          if (!newSourceKey) {
            return {
              ...m,
              sourceKey: '',
              sourceLabel: 'Unmapped',
              sourceValue: '',
              confidence: 0,
              matchReason: 'Manually unmapped by user',
              isManualOverride: true,
            };
          }
          const sField = sourceDoc.fields[newSourceKey];
          return {
            ...m,
            sourceKey: newSourceKey,
            sourceLabel: sField ? sField.label : newSourceKey,
            sourceValue: sField ? sField.value : '',
            confidence: 1.0,
            matchReason: 'Manually assigned by user',
            isManualOverride: true,
          };
        }
        return m;
      })
    );
  };

  const highConfCount = mappings.filter((m) => m.confidence >= 0.85 && m.sourceKey).length;
  const mediumConfCount = mappings.filter((m) => m.confidence < 0.85 && m.confidence >= 0.5 && m.sourceKey).length;
  const unmappedCount = mappings.filter((m) => !m.sourceKey || m.confidence === 0).length;

  const displayedMappings = filterUnmapped
    ? mappings.filter((m) => !m.sourceKey || m.confidence < 0.5)
    : mappings;

  return (
    <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Target URL & Launch Control Panel */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="badge badge-cyan">Step 2 • Orchestrator Studio</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Multi-Agent Browser Driver & Semantic Mapper</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>Target Web Form & Automation Pipeline</h2>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {targetAnalysis?.isRestricted && (
              <button className="btn btn-secondary" onClick={onOpenFallbackMap} style={{ border: '1px solid var(--accent-amber)', color: '#fbbf24' }}>
                <Map size={16} /> View Interactive Map
              </button>
            )}

            {validationResult && (
              <button className="btn btn-secondary" onClick={onOpenHITL} style={{ border: '1px solid var(--accent-emerald)', color: '#34d399' }}>
                <ShieldCheck size={16} /> HITL Review ({validationResult.overallScore}%)
              </button>
            )}

            <button
              className="btn btn-primary"
              onClick={runFullPipeline}
              disabled={isRunning || !sourceDoc}
              style={{ padding: '10px 24px', opacity: isRunning ? 0.7 : 1 }}
            >
              {isRunning ? (
                <>
                  <RefreshCw size={16} className="pulse-indicator" style={{ animation: 'spin 1s linear infinite' }} />
                  Agents Running...
                </>
              ) : (
                <>
                  <Play size={16} fill="#fff" />
                  Launch Autonomous Pipeline
                </>
              )}
            </button>
          </div>
        </div>

        {/* URL Input Bar with Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Globe size={18} color="var(--accent-cyan)" style={{ position: 'absolute', left: '14px', top: '12px' }} />
              <input
                type="text"
                className="form-input"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="Enter target form URL (e.g. http://localhost:3001/mock-target/standard)"
                style={{ paddingLeft: '42px', fontSize: '14px', fontWeight: 500 }}
              />
            </div>
          </div>

          {/* Quick Target Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Quick Targets:</span>
            <button
              onClick={() => handleQuickUrl('http://localhost:3001/mock-target/standard')}
              className={`badge ${targetUrl.includes('standard') ? 'badge-cyan' : 'badge-purple'}`}
              style={{ cursor: 'pointer' }}
            >
              Standard Job Form (Local Mock)
            </button>
            <button
              onClick={() => handleQuickUrl('http://localhost:3001/mock-target/restricted')}
              className={`badge ${targetUrl.includes('restricted') ? 'badge-rose' : 'badge-amber'}`}
              style={{ cursor: 'pointer' }}
            >
              🛡️ Bot-Protected / Gated Form (Test Interactive Map)
            </button>
          </div>
        </div>
      </div>

      {/* Target Analysis Header & Stats */}
      {targetAnalysis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Target Title</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {targetAnalysis.title || 'Form Document'}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Detected Fields</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
              {targetAnalysis.fields.length} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({targetAnalysis.sections.length} sections)</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Mapping Confidence</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="badge badge-emerald">{highConfCount} High</span>
              <span className="badge badge-amber">{mediumConfCount} Med</span>
              {unmappedCount > 0 && <span className="badge badge-rose">{unmappedCount} Unmapped</span>}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Security Status</div>
            {targetAnalysis.isRestricted ? (
              <span className="badge badge-rose"><ShieldAlert size={12} /> Restricted / Bot-Shielded</span>
            ) : (
              <span className="badge badge-emerald"><CheckCircle2 size={12} /> Direct Auto-Fill Ready</span>
            )}
          </div>
        </div>
      )}

      {/* Main Studio View: Tabs (Matrix, Live Agent Stream, Live Browser) */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setActiveTab('matrix')}
              className="btn btn-secondary"
              style={{
                fontSize: '13px',
                padding: '8px 16px',
                background: activeTab === 'matrix' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                borderColor: activeTab === 'matrix' ? 'var(--accent-cyan)' : 'transparent',
                color: activeTab === 'matrix' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              }}
            >
              <Sliders size={15} /> Field Mapping Matrix ({mappings.length})
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className="btn btn-secondary"
              style={{
                fontSize: '13px',
                padding: '8px 16px',
                background: activeTab === 'logs' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                borderColor: activeTab === 'logs' ? 'var(--accent-cyan)' : 'transparent',
                color: activeTab === 'logs' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              }}
            >
              <Sparkles size={15} /> Live Agent Step Stream ({agentSteps.length})
            </button>

            <button
              onClick={() => setActiveTab('browser')}
              className="btn btn-secondary"
              style={{
                fontSize: '13px',
                padding: '8px 16px',
                background: activeTab === 'browser' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                borderColor: activeTab === 'browser' ? 'var(--accent-cyan)' : 'transparent',
                color: activeTab === 'browser' ? 'var(--accent-cyan)' : 'var(--text-muted)',
              }}
            >
              <Eye size={15} /> Live Browser Capture {latestScreenshot && '• Ready'}
            </button>
          </div>

          {activeTab === 'matrix' && mappings.length > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filterUnmapped}
                onChange={(e) => setFilterUnmapped(e.target.checked)}
                style={{ accentColor: 'var(--accent-cyan)' }}
              />
              Show Only Unmapped / Low Confidence
            </label>
          )}
        </div>

        {/* Tab 1: Field Mapping Matrix */}
        {activeTab === 'matrix' && (
          <div>
            {mappings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Sliders size={36} color="var(--border-active)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#cbd5e1' }}>No Form Mappings Generated Yet</div>
                <div style={{ fontSize: '13px', marginTop: '6px' }}>Click "Launch Autonomous Pipeline" to inspect the target URL and synthesize field mappings.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '10px 12px' }}>Target Form Field</th>
                      <th style={{ padding: '10px 12px' }}>Type</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center' }}></th>
                      <th style={{ padding: '10px 12px' }}>Mapped Source Attribute</th>
                      <th style={{ padding: '10px 12px' }}>Confidence & Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedMappings.map((mapping, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          background: mapping.confidence >= 0.85 ? 'transparent' : 'rgba(245, 158, 11, 0.02)',
                        }}
                      >
                        {/* Target Field Column */}
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{mapping.targetFieldName}</div>
                          <div className="mono-text" style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>{mapping.targetSelector}</div>
                        </td>

                        {/* Input Type */}
                        <td style={{ padding: '12px' }}>
                          <span className="badge badge-purple">{mapping.targetType}</span>
                        </td>

                        {/* Arrow Link */}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <ArrowRight size={14} color="var(--text-muted)" />
                        </td>

                        {/* Mapped Source Attribute Dropdown */}
                        <td style={{ padding: '12px' }}>
                          <select
                            className="form-input"
                            value={mapping.sourceKey}
                            onChange={(e) => handleManualMappingChange(mapping.targetSelector, e.target.value)}
                            style={{
                              fontSize: '12px',
                              padding: '6px 10px',
                              background: mapping.sourceKey ? 'var(--bg-input)' : 'rgba(244, 63, 94, 0.1)',
                              borderColor: mapping.sourceKey ? '#334155' : 'rgba(244, 63, 94, 0.4)',
                            }}
                          >
                            <option value="">-- Select Source Field (Unmapped) --</option>
                            {sourceDoc &&
                              Object.values(sourceDoc.fields).map((sf) => (
                                <option key={sf.key} value={sf.key} style={{ background: '#0f172a' }}>
                                  {sf.label} ({sf.key}) ➔ "{String(sf.value).substring(0, 25)}"
                                </option>
                              ))}
                          </select>
                          {mapping.sourceValue !== undefined && mapping.sourceValue !== '' && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Value: <span style={{ color: '#e2e8f0' }}>{Array.isArray(mapping.sourceValue) ? mapping.sourceValue.join(', ') : String(mapping.sourceValue)}</span>
                            </div>
                          )}
                        </td>

                        {/* Confidence & Reasoning */}
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <div style={{ width: '80px', height: '6px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.round(mapping.confidence * 100)}%`,
                                  height: '100%',
                                  background: mapping.confidence >= 0.85 ? 'var(--accent-emerald)' : mapping.confidence >= 0.5 ? 'var(--accent-amber)' : 'var(--accent-rose)',
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: mapping.confidence >= 0.85 ? '#34d399' : mapping.confidence >= 0.5 ? '#fbbf24' : '#f87171' }}>
                              {Math.round(mapping.confidence * 100)}%
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {mapping.matchReason}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Live Agent Step Stream */}
        {activeTab === 'logs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {agentSteps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                No active execution steps. Launch the pipeline to watch autonomous agents collaborate in real-time.
              </div>
            ) : (
              agentSteps.map((step) => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ marginTop: '2px' }}>
                    {step.status === 'completed' && <CheckCircle2 size={16} color="var(--accent-emerald)" />}
                    {step.status === 'running' && <div className="pulse-indicator" />}
                    {step.status === 'warning' && <AlertCircle size={16} color="var(--accent-amber)" />}
                    {step.status === 'failed' && <AlertCircle size={16} color="var(--accent-rose)" />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '10px' }}>{step.agentName}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(step.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{step.stepName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{step.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Live Browser Capture */}
        {activeTab === 'browser' && (
          <div style={{ textAlign: 'center' }}>
            {latestScreenshot ? (
              <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', display: 'inline-block', maxWidth: '100%' }}>
                <img src={latestScreenshot} alt="Live Browser View" style={{ width: '100%', maxHeight: '600px', objectFit: 'contain', display: 'block' }} />
              </div>
            ) : (
              <div style={{ padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Eye size={36} color="var(--border-active)" style={{ margin: '0 auto 12px' }} />
                <div>No browser screenshot captured yet. Run the pipeline to capture live DOM state.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
