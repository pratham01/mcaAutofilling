import React, { useState, useEffect } from 'react';
import {
  Layers,
  Zap,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import AOC4FilingDashboard from './components/AOC4FilingDashboard';
import StatutoryTemplateStudio from './components/StatutoryTemplateStudio';
import ProfessionalFeedbackScreen from './components/ProfessionalFeedbackScreen';
import { AgentStep } from '../shared/types';

export default function App() {
  const [activeNav, setActiveNav] = useState<'aoc4' | 'templates' | 'feedback'>('aoc4');
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  // Setup WebSocket stream for live agent events
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      ws = new WebSocket(`${protocol}//${host}/ws`);

      ws.onopen = () => {
        setIsWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'agent_step' && parsed.data) {
            setAgentSteps((prev) => [...prev, parsed.data]);
          }
        } catch (e) {
          console.error('WS Parse Error:', e);
        }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary, #070b14)' }}>
      {/* Top Professional Navbar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle, #1e293b)',
          background: 'rgba(7, 11, 20, 0.92)',
          backdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '12px 32px',
        }}
      >
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Logo & Corporate Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(2, 132, 199, 0.4)',
              }}
            >
              <Building2 size={22} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
                  FormMind <span style={{ color: 'var(--accent-cyan, #38bdf8)' }}>Corporate Filing</span>
                </h1>
                <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '2px 8px' }}>MCA Statutory Suite</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted, #94a3b8)', margin: '2px 0 0' }}>
                MCA e-Form Automation • Two-Column Period Mapping • Reusable Template Engine
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav style={{ display: 'flex', gap: '6px', background: 'var(--bg-input, #090d16)', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <button
              onClick={() => setActiveNav('aoc4')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: activeNav === 'aoc4' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                color: activeNav === 'aoc4' ? '#f59e0b' : 'var(--text-secondary, #94a3b8)',
                transition: 'all 0.15s ease',
              }}
            >
              🏛️ 1. Form AOC-4 Filing
            </button>

            <button
              onClick={() => setActiveNav('templates')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: activeNav === 'templates' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: activeNav === 'templates' ? '#38bdf8' : 'var(--text-secondary, #94a3b8)',
                transition: 'all 0.15s ease',
              }}
            >
              <FileSpreadsheet size={15} /> 2. Template &amp; Mapping Studio
            </button>

            <button
              onClick={() => setActiveNav('feedback')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: activeNav === 'feedback' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                color: activeNav === 'feedback' ? '#c084fc' : 'var(--text-secondary, #94a3b8)',
                transition: 'all 0.15s ease',
              }}
            >
              💬 3. Professional Feedback &amp; Auto-Adaptation
            </button>
          </nav>

          {/* Status Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted, #94a3b8)' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isWsConnected ? '#10b981' : '#f43f5e',
                  boxShadow: isWsConnected ? '0 0 8px #10b981' : 'none',
                  display: 'inline-block'
                }}
              />
              {isWsConnected ? 'Filing Engine Online' : 'Connecting Engine...'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '28px 32px' }}>
        {activeNav === 'aoc4' && <AOC4FilingDashboard />}
        {activeNav === 'templates' && <StatutoryTemplateStudio />}
        {activeNav === 'feedback' && <ProfessionalFeedbackScreen />}
      </main>
    </div>
  );
}
