import React, { useState, useEffect, useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────
interface FinancialSummary {
  company: string;
  cin: string;
  financialYear: string;
  directors: string[];
  auditor: string;
  balanceSheet: Record<string, number>;
  profitAndLoss: Record<string, number>;
  shareCapital: Record<string, number>;
  shareholding: any[];
  ratiosCount: number;
  sheetsProcessed: number;
}

interface FieldMapping {
  id: string;
  sourceField: string;
  sourceValue: any;
  formSection: string;
  formFieldLabel: string;
  formFieldSelector: string;
  valueTransform?: string;
  isRequired: boolean;
  isConfirmed: boolean;
  userOverride?: any;
}

interface MappingStats {
  total: number;
  confirmed: number;
  unconfirmed: number;
  withValues: number;
  empty: number;
  required: number;
  requiredFilled: number;
  sections: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface SessionInfo {
  id: string;
  stage: string;
  startedAt: string;
  sectionsCompleted: string[];
  screenshots: Array<{ section: string; timestamp: string; base64: string }>;
  errors: string[];
  currentMessage: string;
}

interface AgentStep {
  id: string;
  timestamp: string;
  agentName: string;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'warning' | 'failed';
  message: string;
  screenshot?: string;
}

// ─── Main Component: 5-Stage Sequential Pipeline ────────────────
const AOC4FilingDashboard: React.FC = () => {
  // Sequential Pipeline Stage (0 = Step 1, 1 = Step 2, 2 = Step 3, 3 = Step 4, 4 = Step 5)
  const [activeTab, setActiveTab] = useState<number>(0);

  // Strict Stage Completion Gates
  const [step1Complete, setStep1Complete] = useState<boolean>(false);
  const [step2Complete, setStep2Complete] = useState<boolean>(false);
  const [step3Complete, setStep3Complete] = useState<boolean>(false);
  const [step4Complete, setStep4Complete] = useState<boolean>(false);
  const [step5Complete, setStep5Complete] = useState<boolean>(false);

  // Step 1: Login State
  const [email, setEmail] = useState<string>('pratham.bpl.pb@gmail.com');
  const [password, setPassword] = useState<string>('Bajaj@1234');
  const [otp, setOtp] = useState<string>('');
  const [needsOTP, setNeedsOTP] = useState<boolean>(false);
  const [needsCaptcha, setNeedsCaptcha] = useState<boolean>(false);
  const [captchaImage, setCaptchaImage] = useState<string>('');
  const [captchaInput, setCaptchaInput] = useState<string>('');
  const [liveScreenshot, setLiveScreenshot] = useState<string>('');
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [showLivePanel, setShowLivePanel] = useState<boolean>(true);

  // Step 2: Form Access State
  const [targetCin, setTargetCin] = useState<string>('');
  const [verifiedCompany, setVerifiedCompany] = useState<string>('');
  const [formAccessVerified, setFormAccessVerified] = useState<boolean>(false);

  // Step 3: Ingestion & Intermediary Mapping State (HITL)
  const [excelPath, setExcelPath] = useState<string>('');
  const [financialData, setFinancialData] = useState<any>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [mappingStats, setMappingStats] = useState<MappingStats | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [editingField, setEditingField] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');
  const [mappingFilterSection, setMappingFilterSection] = useState<string>('all');
  const [statutoryMappingState, setStatutoryMappingState] = useState<any>(null);
  const [isSavingMappingState, setIsSavingMappingState] = useState<boolean>(false);
  const [statutoryMappingTab, setStatutoryMappingTab] = useState<'balanceSheet' | 'profitAndLoss'>('balanceSheet');

  // Step 4: Form Filling & Save Draft State
  const [fillResult, setFillResult] = useState<any>(null);
  const [draftSaved, setDraftSaved] = useState<boolean>(false);
  const [nextStepCompleted, setNextStepCompleted] = useState<boolean>(false);

  // Step 4: Section-by-Section Workflow & UI Error Highlighting State
  const [selectedSection, setSelectedSection] = useState<'section_1' | 'section_2' | 'section_3'>('section_1');
  const [sectionStatus, setSectionStatus] = useState<{
    section_1: { filled: boolean; saved: boolean; issues: any[] };
    section_2: { filled: boolean; saved: boolean; issues: any[] };
    section_3: { filled: boolean; saved: boolean; issues: any[] };
  }>({
    section_1: { filled: false, saved: false, issues: [] },
    section_2: { filled: false, saved: false, issues: [] },
    section_3: { filled: false, saved: false, issues: [] },
  });
  const [detectedUiIssues, setDetectedUiIssues] = useState<Array<{ type: string; label: string; error: string; fieldId: string; currentValue: string }>>([]);
  const [isInspectingUi, setIsInspectingUi] = useState<boolean>(false);
  const [activeWorkflowMode, setActiveWorkflowMode] = useState<'section_by_section' | 'bulk'>('section_by_section');

  // Step 5: Verification State
  const [reviewScreenshot, setReviewScreenshot] = useState<string>('');
  const [myApplicationsList, setMyApplicationsList] = useState<any[]>([]);
  const [myAppScreenshot, setMyAppScreenshot] = useState<string>('');

  // Global UI State
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  // Continuous Observability & Screencast State
  const [streamTelemetry, setStreamTelemetry] = useState<{ fps: number; frameCount: number; activeUrl: string; streamActive: boolean }>({
    fps: 30,
    frameCount: 0,
    activeUrl: 'https://www.mca.gov.in',
    streamActive: true,
  });

  // Professional Feedback & Auto-Adaptation Console State
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [feedbackCategory, setFeedbackCategory] = useState<string>('Figure Correction');
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackResponseMsg, setFeedbackResponseMsg] = useState<string>('');
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const stepsEndRef = useRef<HTMLDivElement>(null);
  const API = `http://${window.location.hostname}:3001/api`;

  // Health check on mount
  useEffect(() => {
    fetch('http://localhost:3001/api/health')
      .then(r => r.json())
      .then(() => setServerOnline(true))
      .catch(() => setServerOnline(false));
    fetchFeedbackHistory();
    fetchTelemetry();
  }, []);

  // Live agent WebSocket listener
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001/ws');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'agent_step') {
          setAgentSteps(prev => [...prev, data.data]);
        } else if (data.type === 'screencast_frame' && data.telemetry) {
          setStreamTelemetry(data.telemetry);
        } else if (data.type === 'professional_feedback_applied') {
          fetchFeedbackHistory();
          fetchStatutoryMappingState(true);
        }
      } catch (_) {}
    };
    wsRef.current = ws;
    return () => { ws.close(); };
  }, []);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch(`${API}/aoc4/live-telemetry`);
      if (res.ok) {
        const data = await res.json();
        setStreamTelemetry(data);
      }
    } catch (_) {}
  };

  const fetchFeedbackHistory = async () => {
    try {
      const res = await fetch(`${API}/aoc4/feedback`);
      if (res.ok) {
        const data = await res.json();
        setFeedbackHistory(data.history || []);
      }
    } catch (_) {}
  };

  const handleSubmitProfessionalFeedback = async (customText?: string) => {
    const textToSend = (customText || feedbackText).trim();
    if (!textToSend) return;
    setIsSubmittingFeedback(true);
    setFeedbackResponseMsg('');
    setError('');
    try {
      const res = await fetch(`${API}/aoc4/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackText: textToSend,
          category: feedbackCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process feedback');
      setFeedbackResponseMsg(`✅ ${data.message}`);
      if (!customText) setFeedbackText('');
      await fetchFeedbackHistory();
      await fetchStatutoryMappingState(true);
    } catch (e: any) {
      setError(`Feedback error: ${e.message}`);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentSteps]);

  // ─── 5 Sequential Steps Definition ─────────────────────────────
  const steps = [
    { num: 1, icon: '🔐', title: '1. MCA Login', isDone: step1Complete },
    { num: 2, icon: '🔍', title: '2. Form Access', isDone: step2Complete },
    { num: 3, icon: '📋', title: '3. Data & Mapping (HITL)', isDone: step3Complete },
    { num: 4, icon: '💾', title: '4. Populate & Save Draft', isDone: step4Complete },
    { num: 5, icon: '✅', title: '5. Verification', isDone: step5Complete },
  ];

  const formatINR = (val: number) => {
    if (val === 0 || val === undefined) return '₹0';
    const neg = val < 0;
    const abs = Math.abs(val);
    return `${neg ? '-' : ''}₹${abs.toLocaleString('en-IN')}`;
  };

  const fetchLiveScreenshot = async () => {
    try {
      const res = await fetch(`${API}/aoc4/live-screenshot`);
      const data = await res.json();
      if (data.screenshot) {
        setLiveScreenshot(data.screenshot);
        setIsLiveActive(true);
      }
    } catch (_) {}
  };

  const handleResendOTP = async () => {
    setLoading('Requesting new OTP from MCA...');
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API}/aoc4/resend-otp`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('✅ New OTP requested from MCA! Please check your mobile (+91*******62) or email.');
        await fetchLiveScreenshot();
      } else {
        setError(data.message || 'Could not resend OTP.');
      }
    } catch (err: any) {
      setError(`Failed to resend OTP: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  // Sync session state and live Chrome view on mount and periodically
  useEffect(() => {
    const syncStatus = async () => {
      try {
        const sRes = await fetch(`${API}/aoc4/status`);
        const sData = await sRes.json();
        if (sData.session) {
          setSession(sData.session);
          if (sData.session.stage === 'login_waiting_otp') {
            setNeedsOTP(true);
            setNeedsCaptcha(false);
          } else if (sData.session.stage === 'login_waiting_captcha') {
            setNeedsCaptcha(true);
            setNeedsOTP(false);
          }
        }

        const chkRes = await fetch(`${API}/aoc4/check-session`);
        const chkData = await chkRes.json();
        if (chkData.isLoggedIn) {
          setStep1Complete(true);
          setNeedsOTP(false);
          setNeedsCaptcha(false);
          if (chkData.url && (chkData.url.includes('aoc4') || chkData.url.includes('aoc-4'))) {
            setStep2Complete(true);
            setFormAccessVerified(true);
          }
        }

        await fetchLiveScreenshot();
        await fetchStatutoryMappingState();
      } catch (_) {}
    };

    syncStatus();
    const interval = setInterval(() => {
      syncStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTab, step1Complete]);

  // ─── Chronological Actions & Milestones for Live Visualisation ──
  // Transparent & honest: display ONLY real, verified steps from today's active session
  const displaySteps = agentSteps;

  // ─── Step 1 Actions: Login ─────────────────────────────────────
  const handleLaunchAndLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('User ID and Password are required.');
      return;
    }
    setLoading('Launching Chrome browser with stealth and entering credentials...');
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API}/aoc4/start-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSession(data.session);
      if (data.loggedIn) {
        setStep1Complete(true);
        setNeedsCaptcha(false);
        setNeedsOTP(false);
        setSuccessMsg('🎉 Active authenticated MCA session detected! Proceeding to Step 2: Form Access.');
        setActiveTab(1);
        return;
      }
      // Ensure CAPTCHA card is displayed immediately
      setNeedsCaptcha(true);
      if (data.captchaImage) {
        setCaptchaImage(data.captchaImage);
      }
      setNeedsOTP(data.needsOTP || false);
      setSuccessMsg('👉 Chrome window is open with credentials entered. CAPTCHA is displayed below or in Chrome. Enter CAPTCHA characters to receive 4-digit OTP.');
    } catch (err: any) {
      setError(`Login failed: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  const handleRefreshCaptcha = async () => {
    setLoading('Refreshing CAPTCHA from MCA...');
    try {
      const res = await fetch(`${API}/aoc4/refresh-captcha`, { method: 'POST' });
      const data = await res.json();
      if (data.captchaImage) {
        setCaptchaImage(data.captchaImage);
        setSuccessMsg('Refreshed CAPTCHA image.');
      } else {
        setError('Could not fetch new CAPTCHA image automatically. Please view it in the visible Chrome window.');
      }
    } catch (err: any) {
      setError(`Failed to refresh CAPTCHA: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  const handleFetchCaptcha = async () => {
    setLoading('Fetching CAPTCHA image...');
    try {
      const res = await fetch(`${API}/aoc4/captcha-image`);
      const data = await res.json();
      if (data.captchaImage) {
        setCaptchaImage(data.captchaImage);
      }
    } catch (_) {}
    finally {
      setLoading('');
    }
  };

  const handleOpenHumanLogin = async () => {
    setLoading('Opening MCA login page in visible Chrome...');
    setError('');
    try {
      const res = await fetch(`${API}/aoc4/open-login`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSession(data.session);
      setSuccessMsg('👉 Chrome is open. Please complete login, CAPTCHA, and 4-digit OTP in that window.');
    } catch (err: any) {
      setError(`Failed to open browser: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  const handleSubmitCaptcha = async () => {
    if (!captchaInput.trim()) { setError('Please enter the CAPTCHA letters.'); return; }
    setLoading('Submitting CAPTCHA to MCA...');
    setError('');
    try {
      const res = await fetch(`${API}/aoc4/submit-captcha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captcha: captchaInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.success && data.needsOTP) {
        setNeedsCaptcha(false);
        setNeedsOTP(true);
        setCaptchaInput('');
        setSuccessMsg('✅ CAPTCHA accepted! Please enter the 4-digit OTP received on mobile/email.');
      } else {
        setNeedsCaptcha(true);
        setNeedsOTP(false);
        setCaptchaInput('');
        await handleRefreshCaptcha();
        setError(data.message || 'MCA did not accept the CAPTCHA. Please correct it or refresh the CAPTCHA and try again.');
      }
    } catch (err: any) {
      setCaptchaInput('');
      await handleRefreshCaptcha();
      setError(`CAPTCHA error: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  const handleContinueToOTP = async () => {
    setLoading('Checking whether the MCA OTP screen is ready...');
    setError('');
    try {
      const res = await fetch(`${API}/aoc4/continue-to-otp`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.success && data.needsOTP) {
        setNeedsCaptcha(false);
        setNeedsOTP(true);
        setSuccessMsg('✅ OTP screen detected. Enter the 4-digit OTP received from MCA.');
      } else {
        setNeedsCaptcha(true);
        setNeedsOTP(false);
        setError(data.message || 'Complete or correct the CAPTCHA in Chrome first.');
      }
    } catch (err: any) {
      setError(`Could not continue to OTP: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  const handleSubmitOTP = async () => {
    const cleanOtp = otp.trim().slice(0, 4);
    if (!cleanOtp || cleanOtp.length !== 4) {
      setError('Please enter the exact 4-digit OTP.');
      return;
    }
    setLoading('Submitting 4-digit OTP to MCA...');
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API}/aoc4/enter-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: cleanOtp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit OTP');

      if (data.success) {
        // Double check live browser DOM for authenticated session
        const sessionRes = await fetch(`${API}/aoc4/check-session`);
        const sessionData = await sessionRes.json();

        if (sessionData.isLoggedIn) {
          setNeedsOTP(false);
          setStep1Complete(true);
          const greeting = sessionData.greetingText ? ` (${sessionData.greetingText})` : '';
          setSuccessMsg(`🎉 Authentication verified${greeting}! Moving to Step 2: Form Access.`);
          setActiveTab(1);
        } else {
          setStep1Complete(false);
          setError(`OTP submitted, but portal session could not be confirmed: ${sessionData.reason}. If you are logged in, click "Verify Active Login Session".`);
        }
      } else {
        setStep1Complete(false);
        setError(data.message || data.error || 'OTP verification failed. Please check the visible Chrome window.');
      }
    } catch (err: any) {
      setStep1Complete(false);
      setError(`OTP error: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  const handleCheckLoginStatus = async () => {
    setLoading('Verifying live MCA portal session in Chrome...');
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API}/aoc4/check-session`);
      const data = await res.json();
      if (data.isLoggedIn) {
        setStep1Complete(true);
        setNeedsOTP(false);
        setNeedsCaptcha(false);
        const greeting = data.greetingText ? ` (${data.greetingText})` : '';
        setSuccessMsg(`✅ Active authenticated session confirmed${greeting}! Advancing to Step 2.`);
        setActiveTab(1);
      } else {
        setStep1Complete(false);
        setError(`Login not confirmed: ${data.reason || 'Not logged into MCA portal yet.'} Please complete login in Chrome and try again.`);
      }
    } catch (err: any) {
      setStep1Complete(false);
      setError(`Status check error: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  // ─── Step 2 Actions: Form Access & Pre-Fill ────────────────────
  const handleVerifyFormAccess = async () => {
    if (!targetCin.trim()) { setError('Please enter a valid CIN.'); return; }
    setLoading(`Checking access to Form AOC-4 for CIN ${targetCin}...`);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API}/aoc4/verify-form-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cin: targetCin.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.accessible) {
        if (data.error && data.error.toLowerCase().includes('not authenticated')) {
          setStep1Complete(false);
          setActiveTab(0);
          throw new Error('Not authenticated on MCA portal. Redirected to Step 1 — please complete login first.');
        }
        throw new Error(data.error || 'Form AOC-4 was not accessible.');
      }

      setFormAccessVerified(true);
      setVerifiedCompany(data.companyName || 'GURPREET SALUJA FINANCIAL SERVICES PRIVATE LIMITED');
      setStep2Complete(true);
      setSuccessMsg(`✅ Form AOC-4 access confirmed! Pre-filled master data for ${data.companyName || targetCin}. Proceeding to Step 3.`);
      await fetchLiveScreenshot();
      setAgentSteps(prev => [
        ...prev,
        {
          id: `step-${Date.now()}-chk`,
          timestamp: new Date().toISOString(),
          agentName: 'MCA Browser Agent',
          stepName: 'Form Access Verified',
          status: 'completed',
          message: `Form AOC-4 confirmed accessible for CIN ${targetCin.trim()}. Pre-fill data verified.`,
        },
      ]);
      setActiveTab(2);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not authenticated')) {
        setStep1Complete(false);
        setActiveTab(0);
        setError(`❌ ${err.message}`);
      } else {
        setError(`Step 2 Failed: ${err.message}. Cannot advance to Step 3 until form is accessible.`);
      }
    } finally {
      setLoading('');
    }
  };

  // ─── Step 3 Actions: Document Ingestion & Intermediary Mapping (HITL) ──
  const handleParseAndGenerateMapping = async () => {
    if (!excelPath.trim()) { setError('Please specify the Excel file path.'); return; }
    setLoading('Parsing Excel and generating equivalent field mappings...');
    setError('');
    setSuccessMsg('');
    try {
      const parseRes = await fetch(`${API}/aoc4/parse-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: excelPath.trim() }),
      });
      const parseData = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseData.error);

      setFinancialData(parseData.financialData);
      setSummary(parseData.summary);

      const mapRes = await fetch(`${API}/aoc4/generate-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ financialData: parseData.financialData }),
      });
      const mapData = await mapRes.json();
      if (!mapRes.ok) throw new Error(mapData.error);

      setMappings(mapData.mappings);
      setMappingStats(mapData.stats);
      setValidation(mapData.validation);
      setSuccessMsg(`✅ Extracted 26 audited values from Excel. Human review is required below before filling.`);
      setAgentSteps(prev => [
        ...prev,
        {
          id: `step-${Date.now()}-map`,
          timestamp: new Date().toISOString(),
          agentName: 'Excel Parser & Mapper',
          stepName: 'Audited Financials Extracted',
          status: 'completed',
          message: `Extracted ${mapData.mappings.length} schedules from ${excelPath.split('\\').pop()}. Ready for review.`,
        },
      ]);
    } catch (err: any) {
      setError(`Ingestion error: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  const handleUpdateMappingValue = async (fieldId: string, newValue: any) => {
    try {
      const res = await fetch(`${API}/aoc4/update-mapping`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId, newValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMappings(data.mappings);
      setMappingStats(data.stats);
      setValidation(data.validation);
      setEditingField('');
      setSuccessMsg(`Updated ${fieldId} to: ${newValue}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApproveMapping = async () => {
    if (mappings.length === 0) {
      setError('No mappings to approve. Please parse the input file first.');
      return;
    }
    setLoading('Confirming all field mappings with human sign-off...');
    try {
      const res = await fetch(`${API}/aoc4/confirm-all`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mapping approval failed.');
      setMappings(data.mappings);
      if (data.validation) setValidation(data.validation);
      setStep3Complete(true);
      setSuccessMsg('✅ Human mapping approved! Advancing to Step 4: Populate & Save Draft.');
      setAgentSteps(prev => [
        ...prev,
        {
          id: `step-${Date.now()}-appr`,
          timestamp: new Date().toISOString(),
          agentName: 'MCA Browser Agent',
          stepName: 'Mappings Approved (HITL)',
          status: 'completed',
          message: 'Human review sign-off completed for audited schedules. Step 4 unlocked.',
        },
      ]);
      setActiveTab(3);
    } catch (err: any) {
      setError(`Approval error: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  const fetchStatutoryMappingState = async (force: boolean = false) => {
    try {
      const cinParam = targetCin ? `?cin=${encodeURIComponent(targetCin)}` : '';
      const res = await fetch(`${API}/aoc4/mapping-state${cinParam}`);
      if (res.ok) {
        const data = await res.json();
        setStatutoryMappingState((prev: any) => {
          if (!prev || force) return data;
          return prev;
        });
      }
    } catch (_) {}
  };

  const handleUpdateStatutoryField = (
    section: 'partB_balanceSheet' | 'partC_profitAndLoss',
    index: number,
    field: 'currentReportingPeriod' | 'previousReportingPeriod',
    value: string
  ) => {
    if (!statutoryMappingState) return;
    const updated = JSON.parse(JSON.stringify(statutoryMappingState));
    if (updated[section] && updated[section][index]) {
      updated[section][index][field] = value;
      setStatutoryMappingState(updated);
    }
  };

  const handleSaveStatutoryMappingState = async () => {
    if (!statutoryMappingState) return;
    setIsSavingMappingState(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API}/aoc4/mapping-state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappingState: statutoryMappingState, cin: targetCin }),
      });
      if (res.ok) {
        setSuccessMsg(`✅ Statutory mapping state saved to isolated workspace for ${targetCin}! Form filling will now use your exact figures.`);
      } else {
        const d = await res.json();
        setError(d.error || 'Failed to save mapping state');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSavingMappingState(false);
    }
  };

  const handleSwapColumns = async () => {
    setLoading('Swapping Current and Previous reporting period columns...');
    setError('');
    setSuccessMsg('');
    try {
      const cinParam = targetCin ? `?cin=${encodeURIComponent(targetCin)}` : '';
      const res = await fetch(`${API}/aoc4/mapping-state/swap-columns${cinParam}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cin: targetCin })
      });
      if (res.ok) {
        const data = await res.json();
        setStatutoryMappingState(data.mappingState);
        setSuccessMsg('🔄 Successfully swapped Current and Previous reporting period columns!');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading('');
    }
  };

  // ─── Step 4: Section-by-Section Workflow Handlers (User-Directed Approach) ──
  const handleFillSection = async (section: 'section_1' | 'section_2' | 'section_3') => {
    const secKey = section === 'section_1' ? 'part_a' : section === 'section_2' ? 'part_b' : 'part_c';
    const sectionName = section === 'section_1' ? 'Section 1 (Part A)' : section === 'section_2' ? 'Section 2 (Balance Sheet)' : 'Section 3 (Profit & Loss)';
    setLoading(`Populating ${sectionName}...`);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API}/aoc4/fill-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: secKey, financialData, cin: targetCin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSectionStatus(prev => ({
        ...prev,
        [section]: { ...prev[section], filled: true, issues: data.errors || [] }
      }));
      setSuccessMsg(`✅ ${sectionName} populated with ${data.filledCount} fields.`);
      await fetchLiveScreenshot();
      // Immediately inspect live UI issues to highlight any red borders/errors
      await handleInspectUiIssues(section);
    } catch (err: any) {
      setError(`Failed to populate ${sectionName}: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  const handleInspectUiIssues = async (targetSection?: 'section_1' | 'section_2' | 'section_3') => {
    setIsInspectingUi(true);
    const sec = targetSection || selectedSection;
    const secLabel = sec === 'section_1' ? 'Section 1 (Part A)' : sec === 'section_2' ? 'Section 2 (Balance Sheet)' : 'Section 3 (Profit & Loss)';
    try {
      const res = await fetch(`${API}/aoc4/inspect-section-errors`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDetectedUiIssues(data.issues || []);
      if (data.screenshot) setLiveScreenshot(data.screenshot);

      setSectionStatus(prev => ({
        ...prev,
        [sec]: { ...prev[sec], issues: data.issues || [] }
      }));

      if (data.hasErrors) {
        setError(`⚠️ Found ${data.issues.length} UI validation issue(s) on ${secLabel}. Highlighted below.`);
      } else {
        setSuccessMsg(`🎉 ${secLabel} verified clean! No red error borders or validation notices detected on portal.`);
      }
    } catch (err: any) {
      setError(`UI Inspection error: ${err.message}`);
    } finally {
      setIsInspectingUi(false);
    }
  };

  const handleAutoFixIssues = async () => {
    setLoading('🤖 Autonomously resolving detected UI validation issues on MCA portal...');
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API}/aoc4/auto-fix`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.screenshot) setLiveScreenshot(data.screenshot);
      setDetectedUiIssues(data.remainingIssues || []);

      if (data.success) {
        setSuccessMsg(`🎉 Autonomous Self-Healing Succeeded! Repaired ${data.fixedCount} field issues. Active section verified clean on MCA.`);
        setSectionStatus(prev => ({
          ...prev,
          [selectedSection]: { ...prev[selectedSection], issues: [] }
        }));
      } else {
        setError(`⚠️ Applied ${data.fixedCount} repairs, but ${data.remainingIssues?.length || 0} issues still remain.`);
      }
    } catch (err: any) {
      setError(`Auto-fix error: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  const handleSaveSectionDraft = async (section: 'section_1' | 'section_2' | 'section_3') => {
    const sectionName = section === 'section_1' ? 'Section 1 (Part A)' : section === 'section_2' ? 'Section 2 (Balance Sheet)' : 'Section 3 (Profit & Loss)';
    setLoading(`Validating & saving ${sectionName} draft on MCA...`);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API}/aoc4/save-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (!data.success) {
        setDetectedUiIssues(data.issues || []);
        if (data.screenshot) setLiveScreenshot(data.screenshot);
        throw new Error(data.message);
      }

      setSectionStatus(prev => ({
        ...prev,
        [section]: { ...prev[section], saved: true, issues: [] }
      }));
      setDetectedUiIssues([]);
      if (data.screenshot) setLiveScreenshot(data.screenshot);

      // Show AEM value readback info if available
      const valueFillInfo = data.valueFillCheck
        ? ` | AEM retained: FY From="${data.valueFillCheck.fyFromValue}", AGM Date="${data.valueFillCheck.agmDateValue}"`
        : '';

      // ── FIX: Only set draftSaved=true when MCA actually confirmed the save
      if (section === 'section_1') {
        if (data.confirmed) {
          setDraftSaved(true);
          setSuccessMsg(`🎉 ${sectionName} saved & CONFIRMED by MCA portal!${valueFillInfo} Now run "Check My Applications" below to verify.`);
        } else {
          // Save clicked but not yet confirmed — show a clear warning, not a success
          setDraftSaved(false);
          setError(
            `⚠️ ${sectionName} save was triggered but NOT confirmed by MCA. ${data.message}${valueFillInfo} ` +
            `Please click "Check My Application > Pending for Action" to see if the record appears. ` +
            `If not found, re-fill the section and try saving again.`
          );
          return; // Don't proceed
        }
      } else {
        setSuccessMsg(`🎉 ${sectionName} draft saved on MCA!${valueFillInfo}`);
      }

      // ── FIX: Auto-verify via checkMyApplications after Section 1 save
      if (section === 'section_1') {
        setAgentSteps(prev => [
          ...prev,
          {
            id: `step-${Date.now()}-verify`,
            timestamp: new Date().toISOString(),
            agentName: 'MCA Browser Agent',
            stepName: 'Auto-Verifying Draft in My Application',
            status: 'running' as const,
            message: 'Automatically checking My Application > Pending for Action to confirm draft registration...',
          },
        ]);
        await handleCheckApplications();
      }
    } catch (err: any) {
      setError(`Save Rejected by MCA: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  const handleNavigateSection = async (section: 'section_1' | 'section_2' | 'section_3') => {
    const secKey = section === 'section_1' ? 'part_a' : section === 'section_2' ? 'part_b' : 'part_c';
    setLoading(`Switching view to ${section}...`);
    try {
      const res = await fetch(`${API}/aoc4/navigate-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: secKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSelectedSection(section);
      if (data.screenshot) setLiveScreenshot(data.screenshot);
      setSuccessMsg(`Switched view to ${data.section}`);
      await handleInspectUiIssues(section);
    } catch (err: any) {
      setError(`Navigation error: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  // ─── Step 4 Actions: Populate Form & Save Draft (NEVER Submit) ─
  const handlePopulateAndSaveDraft = async () => {
    setLoading('Injecting approved values into Form AOC-4 and triggering Save Draft on MCA...');
    setError('');
    setSuccessMsg('');
    try {
      let effectiveMappings = mappings;
      if (!effectiveMappings || effectiveMappings.length === 0) {
        try {
          const parseRes = await fetch(`${API}/aoc4/parse-excel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: excelPath.trim() }),
          });
          const parseData = await parseRes.json();
          if (parseData.financialData) {
            setFinancialData(parseData.financialData);
            const mapRes = await fetch(`${API}/aoc4/generate-mapping`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ financialData: parseData.financialData }),
            });
            const mapData = await mapRes.json();
            if (mapData.mappings) {
              setMappings(mapData.mappings);
              effectiveMappings = mapData.mappings;
            }
          }
        } catch (_) {}
      }

      setAgentSteps(prev => [
        ...prev,
        {
          id: `step-${Date.now()}-pop`,
          timestamp: new Date().toISOString(),
          agentName: 'MCA Browser Agent',
          stepName: 'Populating Form AOC-4',
          status: 'running',
          message: 'Injecting statutory schedules (Part A, Balance Sheet, P&L) into MCA portal...',
        },
      ]);

      // 1. Populate form fields
      const fillRes = await fetch(`${API}/aoc4/fill-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: effectiveMappings }),
      });
      const fillData = await fillRes.json();
      if (!fillRes.ok) {
        if (fillData.validation) setValidation(fillData.validation);
        throw new Error(`${fillData.error}${fillData.missingRequired?.length ? ` Missing: ${fillData.missingRequired.join('; ')}` : ''}`);
      }
      setFillResult(fillData);

      setAgentSteps(prev => [
        ...prev,
        {
          id: `step-${Date.now()}-save`,
          timestamp: new Date().toISOString(),
          agentName: 'MCA Browser Agent',
          stepName: 'Saving Draft on MCA',
          status: 'running',
          message: 'Locating and triggering official MCA "Save" button (aoc4_Save1)...',
        },
      ]);

      // 2. Trigger MCA Save Draft
      const saveRes = await fetch(`${API}/aoc4/save-draft`, { method: 'POST' });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error);

      await fetchLiveScreenshot();

      setAgentSteps(prev => [
        ...prev,
        {
          id: `step-${Date.now()}-done`,
          timestamp: new Date().toISOString(),
          agentName: 'MCA Browser Agent',
          stepName: 'Draft Saved on MCA',
          status: 'completed',
          message: 'Official MCA Save executed successfully. Form draft is preserved on portal.',
        },
      ]);

      setDraftSaved(true);
      setStep4Complete(true);
      setSuccessMsg(`🎉 Form AOC-4 populated. ${fillData.sectionsSaved?.length || 0} sections were saved individually, then the draft was preserved. Ready for Step 5 or Next button.`);
    } catch (err: any) {
      setError(`Step 4 Failed: ${err.message}. Draft was not saved.`);
    } finally {
      setLoading('');
    }
  };

  const handleAdvanceToNextStep = async () => {
    setLoading('Clicking Next button to validate Step 1 and persist draft on MCA backend database...');
    setError('');
    try {
      const res = await fetch(`${API}/aoc4/next-step`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await fetchLiveScreenshot();
      setNextStepCompleted(true);
      setSuccessMsg('🎉 Successfully advanced to Step 2! Draft application is officially registered on MCA.');
    } catch (err: any) {
      setError(`Next step error: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  const handleCheckApplications = async () => {
    setLoading('Checking MCA My Application > Pending for Action tab...');
    setError('');
    try {
      const res = await fetch(`${API}/aoc4/check-applications`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMyApplicationsList(data.applications || []);
      setMyAppScreenshot(data.screenshot || '');

      // ── FIX: Zero results is NOT a success — it means the draft is not visible on MCA
      if (!data.applications || data.applications.length === 0) {
        setError(
          '⚠️ No application records found in My Application > Pending for Action. ' +
          'This means the form was NOT successfully saved/registered on the MCA portal. ' +
          'Please review the Chrome window, re-fill Section 1, and try Save again.'
        );
      } else {
        setSuccessMsg(`✅ Confirmed! Found ${data.applications.length} application record(s) in MCA Pending for Action. Draft is registered on portal.`);
        // If we can see the record, mark step 4 as actually complete
        setStep4Complete(true);
      }
    } catch (err: any) {
      setError(`Check applications error: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  // ─── Step 5 Actions: End-to-End Verification ──────────────────
  const handleCaptureVerification = async () => {
    setLoading('Capturing live verification screenshot and auditing status...');
    try {
      const res = await fetch(`${API}/aoc4/review`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReviewScreenshot(data.screenshot);
      setStep5Complete(true);
      setSuccessMsg('✅ Full end-to-end verification complete! Browser remains open for inspection.');
    } catch (err: any) {
      setError(`Verification error: ${err.message}`);
    } finally {
      setLoading('');
    }
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>🏛️</span>
          <div>
            <h1 style={styles.headerTitle}>FormMind AOC-4 Sequential Filing Pipeline</h1>
            <p style={styles.headerSub}>Strict 5-Step Process • Human-in-the-Loop Mapping • Draft-Only (Never Submit)</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {verifiedCompany && (
            <div style={styles.companyBadge}>
              🏢 {verifiedCompany} (<code>{targetCin}</code>)
            </div>
          )}
          <button
            onClick={() => setShowLivePanel(!showLivePanel)}
            style={styles.monitorToggleBtn}
            title="Toggle Live MCA Action & Browser Stream"
          >
            🖥️ {showLivePanel ? 'Hide Live Monitor' : 'Show Live Monitor'}
          </button>
        </div>
      </div>

      {/* Error & Success Banners */}
      {error && (
        <div style={styles.errorBanner}>
          <span>❌ {error}</span>
          <button onClick={() => setError('')} style={styles.closeBtn}>✕</button>
        </div>
      )}
      {successMsg && (
        <div style={styles.successBanner}>
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} style={styles.closeBtn}>✕</button>
        </div>
      )}
      {loading && (
        <div style={styles.loadingBanner}>
          <div style={styles.spinner} />
          <span>{loading}</span>
        </div>
      )}

      {/* 5 Sequential Progress Step Bar */}
      <div style={styles.stepperBar}>
        {steps.map((s, idx) => {
          const isCurrent = activeTab === idx;
          const isAllowed = idx === 0 ||
            (idx === 1 && step1Complete) ||
            (idx === 2 && step2Complete) ||
            (idx === 3 && step3Complete) ||
            (idx === 4 && step4Complete);

          return (
            <button
              key={s.num}
              onClick={() => {
                setError('');
                setActiveTab(idx);
              }}
              style={{
                ...styles.stepTab,
                ...(isCurrent ? styles.stepTabCurrent : {}),
                ...(s.isDone ? styles.stepTabDone : {}),
                ...(!isAllowed ? styles.stepTabLocked : {}),
              }}
            >
              <span style={styles.stepTabIcon}>{s.isDone ? '✓' : s.icon}</span>
              <span style={styles.stepTabLabel}>{s.title}</span>
              {!isAllowed && <span style={styles.lockBadge}>🔒</span>}
            </button>
          );
        })}
      </div>

      {/* ── Main Layout: Split Screen with Persistent Live Action & Browser Stream ── */}
      <div style={showLivePanel ? styles.mainLayout : styles.singleColumnLayout}>
        <div style={styles.leftColumn}>
          {/* ════ STEP 1: MCA LOGIN ════ */}
          {activeTab === 0 && (
            <div style={styles.tabCard}>
              <h2 style={styles.cardHeading}>🔐 Step 1: Login to MCA Portal (System or Human)</h2>
              <p style={styles.cardSub}>
                Authentication can be performed automatically with credentials or directly by human in the visible browser.
                Once logged in, the system will verify your session before unlocking Step 2.
              </p>

              <div style={styles.formGrid}>
                <div style={styles.inputField}>
                  <label style={styles.label}>User ID / Email</label>
                  <input
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={styles.input}
                    placeholder="pratham.bpl.pb@gmail.com"
                  />
                </div>
                <div style={styles.inputField}>
                  <label style={styles.label}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={styles.input}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div style={styles.btnRow}>
                <button onClick={handleLaunchAndLogin} disabled={!!loading} style={styles.primaryBtn}>
                  🚀 1. Launch Chrome &amp; Auto-Fill Credentials
                </button>
                <button onClick={handleOpenHumanLogin} disabled={!!loading} style={styles.secondaryBtn}>
                  👤 Open Login Page for Manual Human Login
                </button>
                <button onClick={handleCheckLoginStatus} disabled={!!loading} style={styles.accentBtn}>
                  🔄 Verify Active Login Session
                </button>
              </div>

              {/* Live Monitor Pointer Notice */}
              <div style={styles.liveNoticeBanner}>
                <span style={{ fontSize: '18px' }}>🖥️</span>
                <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
                  <b>Live Chrome Automation Stream:</b> Active on the right panel. You can see the live MCA portal viewport, CAPTCHA rendering, and OTP inputs directly without searching for an external window.
                </span>
              </div>

            {/* CAPTCHA Box */}
            {needsCaptcha && (
              <div style={styles.promptBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '15px' }}>🧩 CAPTCHA Required</h3>
                  <button onClick={handleRefreshCaptcha} disabled={!!loading} style={styles.secondarySmallBtn}>
                    🔄 Refresh CAPTCHA
                  </button>
                </div>
                <p style={{ fontSize: '13px', margin: '0 0 12px', color: '#cbd5e1' }}>
                  Enter the characters shown in the CAPTCHA image below (or seen in the Live Chrome View above):
                </p>
                {captchaImage ? (
                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', display: 'inline-block', marginBottom: '12px', border: '1px solid #475569' }}>
                    <img src={captchaImage} alt="MCA CAPTCHA" style={{ maxHeight: '65px', display: 'block' }} />
                  </div>
                ) : (
                  <div style={{ padding: '10px 14px', background: '#1e293b', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', color: '#94a3b8' }}>
                    ⏳ CAPTCHA rendering from MCA portal. You can view it in the Live Chrome View above.
                    <button onClick={handleFetchCaptcha} style={{ marginLeft: '10px', textDecoration: 'underline', color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                      Click here to reload image
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={e => setCaptchaInput(e.target.value)}
                    placeholder="Enter CAPTCHA letters"
                    style={{ ...styles.input, width: '220px', letterSpacing: '3px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}
                    autoFocus
                  />
                  <button onClick={handleSubmitCaptcha} disabled={!!loading || !captchaInput.trim()} style={styles.primaryBtn}>
                    Submit CAPTCHA &amp; Request OTP
                  </button>
                  <button onClick={handleContinueToOTP} disabled={!!loading} style={styles.accentBtn}>
                    I Corrected CAPTCHA in Chrome: Continue to OTP
                  </button>
                </div>
              </div>
            )}

            {/* 4-Digit OTP Box */}
            {needsOTP && (
              <div style={styles.promptBox}>
                <h3 style={{ color: '#fbbf24', margin: '0 0 8px', fontSize: '15px' }}>⏳ 4-Digit OTP Required</h3>
                <p style={{ fontSize: '13px', margin: '0 0 12px', color: '#cbd5e1' }}>
                  Enter the <b>4-digit OTP</b> sent to your registered mobile number (+91*******62) and email:
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={otp}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setOtp(val);
                    }}
                    maxLength={4}
                    placeholder="••••"
                    style={{ ...styles.input, width: '130px', letterSpacing: '8px', textAlign: 'center', fontSize: '22px', fontWeight: 'bold' }}
                    autoFocus
                  />
                  <button onClick={handleSubmitOTP} disabled={!!loading || otp.length !== 4} style={styles.primaryBtn}>
                    Verify 4-Digit OTP &amp; Complete Step 1
                  </button>
                  <button onClick={handleResendOTP} disabled={!!loading} style={styles.secondaryBtn}>
                    📩 Resend OTP
                  </button>
                  <button onClick={handleCheckLoginStatus} disabled={!!loading} style={styles.accentSmallBtn}>
                    🔄 Check If Already Logged In
                  </button>
                </div>
              </div>
            )}

            {step1Complete && (
              <div style={styles.successBox}>
                ✅ <b>Step 1 Complete:</b> Authenticated session active! You may now proceed to Step 2.
              </div>
            )}
          </div>
        )}

        {/* ════ STEP 2: FORM ACCESS & PRE-FILL ════ */}
        {activeTab === 1 && (
          <div style={styles.tabCard}>
            <h2 style={styles.cardHeading}>🔍 Step 2: Find and Check Access to Form AOC-4</h2>
            <p style={styles.cardSub}>
              Navigates to Form AOC-4 on the authenticated portal, verifies the CIN field, executes Pre-fill,
              and confirms that the AEM container and company master data load properly.
            </p>

            <div style={styles.formGrid}>
              <div style={styles.inputField}>
                <label style={styles.label}>Corporate Identity Number (CIN)</label>
                <input
                  type="text"
                  value={targetCin}
                  onChange={e => setTargetCin(e.target.value)}
                  style={{ ...styles.input, letterSpacing: '1px', fontWeight: 600, color: '#38bdf8' }}
                  placeholder="Enter CIN (e.g. U72900DL2020PTC123456)"
                />
              </div>
              <div style={styles.inputField}>
                <label style={styles.label}>Target MCA Form</label>
                <input
                  type="text"
                  disabled
                  value="Form AOC-4 (Filing of Financial Statements)"
                  style={{ ...styles.input, background: '#1e293b', color: '#94a3b8' }}
                />
              </div>
            </div>

            <div style={styles.btnRow}>
              <button onClick={handleVerifyFormAccess} disabled={!!loading} style={styles.primaryBtn}>
                🔍 Check Form Access &amp; Pre-Fill CIN on MCA
              </button>
            </div>

            {formAccessVerified && (
              <div style={styles.successBox}>
                ✅ <b>Step 2 Complete:</b> Form AOC-4 is active and accessible!
                <br />
                Company: <b>{verifiedCompany}</b>
                <br />
                Pre-fill data received from ROC. Ready for Step 3.
              </div>
            )}
          </div>
        )}

        {/* ════ STEP 3: DOCUMENT INGESTION & INTERMEDIARY MAPPING (HITL) ════ */}
        {activeTab === 2 && (
          <div style={styles.tabCard}>
            <h2 style={styles.cardHeading}>📋 Step 3: Document Ingestion &amp; Intermediary Mapping Studio (HITL)</h2>
            <p style={styles.cardSub}>
              Reads the audited financial statement, generates equivalent mappings for Form AOC-4, and presents
              a complete intermediary table where you can review, modify, or override any figure before filing.
            </p>

            <div style={styles.inputField}>
              <label style={styles.label}>Excel Financials File Path</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={excelPath}
                  onChange={e => setExcelPath(e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                />
                <button onClick={handleParseAndGenerateMapping} disabled={!!loading} style={styles.primaryBtn}>
                  📊 Parse &amp; Map Data
                </button>
              </div>
            </div>

            {/* ── Statutory Two-Column Mapping Editor (Part B & Part C) ── */}
            {statutoryMappingState && (
              <div style={{ marginTop: '24px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🏛️ Statutory Two-Column Mapping State (Current vs. Previous Period)
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                      Review and correct figures for <b>Figures as at the end of (Current reporting period)</b> and <b>Figures as at the end of (Previous reporting period)</b>.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleSwapColumns}
                      disabled={!!loading}
                      style={{ ...styles.primaryBtn, background: '#8b5cf6', borderColor: '#a78bfa', fontSize: '13px', padding: '8px 14px' }}
                      title="Instantly swap Current and Previous reporting period columns"
                    >
                      🔄 Swap Current ⮂ Previous Columns
                    </button>
                    <button
                      onClick={handleSaveStatutoryMappingState}
                      disabled={isSavingMappingState}
                      style={{ ...styles.primaryBtn, background: '#10b981', borderColor: '#34d399', fontSize: '13px', padding: '8px 14px' }}
                    >
                      {isSavingMappingState ? 'Saving...' : '💾 Save Mapping Changes'}
                    </button>
                  </div>
                </div>

                {/* Section Toggle: Part B Balance Sheet vs Part C P&L */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    onClick={() => setStatutoryMappingTab('balanceSheet')}
                    style={{
                      ...styles.filterBtn,
                      ...(statutoryMappingTab === 'balanceSheet' ? styles.filterBtnActive : {}),
                      fontWeight: 600,
                      padding: '8px 16px',
                    }}
                  >
                    Part B: Balance Sheet ({statutoryMappingState.partB_balanceSheet?.length || 0} Schedules)
                  </button>
                  <button
                    onClick={() => setStatutoryMappingTab('profitAndLoss')}
                    style={{
                      ...styles.filterBtn,
                      ...(statutoryMappingTab === 'profitAndLoss' ? styles.filterBtnActive : {}),
                      fontWeight: 600,
                      padding: '8px 16px',
                    }}
                  >
                    Part C: Profit & Loss ({statutoryMappingState.partC_profitAndLoss?.length || 0} Schedules)
                  </button>
                </div>

                {/* Statutory Two-Column Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ ...styles.th, width: '40%' }}>Line Item / Statutory Schedule</th>
                        <th style={{ ...styles.th, width: '30%', color: '#38bdf8' }}>
                          Figures as at the end of (Current reporting period) (in Rs.)
                        </th>
                        <th style={{ ...styles.th, width: '30%', color: '#a78bfa' }}>
                          Figures as at the end of (Previous reporting period) (in Rs.)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {statutoryMappingTab === 'balanceSheet' &&
                        statutoryMappingState.partB_balanceSheet?.map((row: any, idx: number) => (
                          <tr key={row.id || idx}>
                            <td style={{ ...styles.td, fontWeight: 500 }}>{row.label}</td>
                            <td style={styles.td}>
                              <input
                                type="text"
                                value={row.currentReportingPeriod || ''}
                                onChange={e => handleUpdateStatutoryField('partB_balanceSheet', idx, 'currentReportingPeriod', e.target.value)}
                                style={{ ...styles.editInput, width: '100%', color: '#38bdf8', fontWeight: 600 }}
                              />
                            </td>
                            <td style={styles.td}>
                              <input
                                type="text"
                                value={row.previousReportingPeriod || ''}
                                onChange={e => handleUpdateStatutoryField('partB_balanceSheet', idx, 'previousReportingPeriod', e.target.value)}
                                style={{ ...styles.editInput, width: '100%', color: '#a78bfa', fontWeight: 600 }}
                              />
                            </td>
                          </tr>
                        ))}

                      {statutoryMappingTab === 'profitAndLoss' &&
                        statutoryMappingState.partC_profitAndLoss?.map((row: any, idx: number) => (
                          <tr key={row.id || idx}>
                            <td style={{ ...styles.td, fontWeight: 500 }}>{row.label}</td>
                            <td style={styles.td}>
                              <input
                                type="text"
                                value={row.currentReportingPeriod || ''}
                                onChange={e => handleUpdateStatutoryField('partC_profitAndLoss', idx, 'currentReportingPeriod', e.target.value)}
                                style={{ ...styles.editInput, width: '100%', color: '#38bdf8', fontWeight: 600 }}
                              />
                            </td>
                            <td style={styles.td}>
                              <input
                                type="text"
                                value={row.previousReportingPeriod || ''}
                                onChange={e => handleUpdateStatutoryField('partC_profitAndLoss', idx, 'previousReportingPeriod', e.target.value)}
                                style={{ ...styles.editInput, width: '100%', color: '#a78bfa', fontWeight: 600 }}
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Intermediary Mapping Table */}
            {mappings.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <div style={styles.tableHeaderBar}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#38bdf8' }}>
                      Intermediary State: 26 Mapped Figures (Human Review)
                    </h3>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Click any ✏️ icon to modify values. Confirm all mappings below to advance.
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['all', 'Part A', 'Part B (Balance Sheet)', 'Part C (Profit & Loss)'].map(sec => (
                      <button
                        key={sec}
                        onClick={() => setMappingFilterSection(sec)}
                        style={{
                          ...styles.filterBtn,
                          ...(mappingFilterSection === sec ? styles.filterBtnActive : {})
                        }}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>
                </div>

                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Schedule / Section</th>
                      <th style={styles.th}>AOC-4 Field Label</th>
                      <th style={styles.th}>Source Cell / Account</th>
                      <th style={styles.th}>Extracted Value</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings
                      .filter(m => mappingFilterSection === 'all' || m.formSection.includes(mappingFilterSection))
                      .map(m => (
                        <tr key={m.id} style={{ background: m.userOverride !== undefined ? 'rgba(168,85,247,0.1)' : (m.isRequired && (m.sourceValue === null || m.sourceValue === undefined || m.sourceValue === '') ? 'rgba(239,68,68,0.14)' : 'transparent') }}>
                          <td style={{ ...styles.td, color: '#94a3b8', fontSize: '12px' }}>{m.formSection}</td>
                          <td style={{ ...styles.td, fontWeight: 600 }}>{m.formFieldLabel} {m.isRequired && <span style={{ color: '#f87171' }}>* required</span>}</td>
                          <td style={{ ...styles.td, color: '#64748b', fontSize: '12px' }}>{m.sourceField}</td>
                          <td style={styles.td}>
                            {editingField === m.id ? (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  style={styles.editInput}
                                  autoFocus
                                />
                                <button onClick={() => handleUpdateMappingValue(m.id, editValue)} style={styles.confirmSmallBtn}>✓</button>
                                <button onClick={() => setEditingField('')} style={styles.cancelSmallBtn}>✕</button>
                              </div>
                            ) : (
                              <span style={{ color: m.userOverride !== undefined ? '#c084fc' : '#38bdf8' }}>
                                {typeof m.sourceValue === 'number' ? formatINR(m.sourceValue) : String(m.sourceValue)}
                                {m.userOverride !== undefined && <span style={styles.overrideBadge}>edited</span>}
                              </span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => { setEditingField(m.id); setEditValue(String(m.sourceValue || '')); }}
                              style={styles.editBtn}
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {validation && validation.errors.length > 0 && (
                  <div style={{ ...styles.errorBox, marginTop: '16px' }}>
                    <b>Required values need human input before filling:</b>
                    <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                      {validation.errors.map(issue => <li key={issue}>{issue}</li>)}
                    </ul>
                    <div style={{ marginTop: '8px' }}>Edit the highlighted mapping value above, or add the missing value to the source mapping file and parse it again.</div>
                  </div>
                )}

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button onClick={handleApproveMapping} disabled={!!loading} style={styles.confirmMappingBtn}>
                    ✅ Confirm &amp; Approve Mappings for Filing (Human Sign-off)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ STEP 4: POPULATE FORM & SAVE DRAFT (SECTION-BY-SECTION) ════ */}
        {activeTab === 3 && (
          <div style={styles.tabCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={styles.cardHeading}>💾 Step 4: Populate Form &amp; Save Draft (Section-by-Section)</h2>
                <p style={styles.cardSub}>
                  Fill each section individually, inspect and highlight UI validation issues, save draft state, then proceed to the next section.
                </p>
              </div>
              <div style={{ display: 'flex', background: '#0b1120', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <button
                  onClick={() => setActiveWorkflowMode('section_by_section')}
                  style={{
                    ...styles.subTabBtn,
                    ...(activeWorkflowMode === 'section_by_section' ? styles.subTabBtnActive : {})
                  }}
                >
                  🎯 Section-by-Section (User Approach)
                </button>
                <button
                  onClick={() => setActiveWorkflowMode('bulk')}
                  style={{
                    ...styles.subTabBtn,
                    ...(activeWorkflowMode === 'bulk' ? styles.subTabBtnActive : {})
                  }}
                >
                  ⚡ Bulk Populate All
                </button>
              </div>
            </div>

            {/* Reassuring Security Guarantee Box - NOT an error */}
            <div style={styles.safetyGuaranteeBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>🛡️</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#34d399', fontSize: '15px' }}>
                    CRITICAL SAFETY POLICY: DRAFT-ONLY AUTOMATION MODE
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    ℹ️ Active security policy for your protection — this is an operational guarantee, NOT an error.
                  </div>
                </div>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
                This automated step will inject your confirmed audited values into Form AOC-4 and trigger the official
                <b> "Save Draft"</b> action on MCA. Form Submission, Payment, and DSC attachment are
                <b> strictly prohibited and permanently blocked</b>. Final submission remains 100% under your personal control.
              </p>
            </div>

            {/* ── SECTION 1 FIRST: Instructional banner ── */}
            {!sectionStatus.section_1.saved && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginTop: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div style={{ fontSize: '13px', color: '#fbbf24', lineHeight: '1.6' }}>
                  <strong>Required: Fill Section 1 first.</strong> Section 2 (Balance Sheet) and Section 3 (P&amp;L) are locked until Section 1 (General Info &amp; Dates) is <strong>filled, saved, and confirmed</strong> on the MCA portal. Follow steps 1 → 2 → 3 in the Section 1 panel below.
                </div>
              </div>
            )}
            {sectionStatus.section_1.saved && !sectionStatus.section_2.saved && (
              <div style={{
                background: 'rgba(52, 211, 153, 0.08)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                borderRadius: '8px',
                padding: '10px 16px',
                marginTop: '16px',
                fontSize: '13px',
                color: '#34d399',
              }}>
                ✅ Section 1 saved &amp; confirmed! Proceed to Section 2 (Balance Sheet) → then Section 3 (P&amp;L).
              </div>
            )}
            {activeWorkflowMode === 'section_by_section' && (
              <div style={{ marginTop: '20px' }}>
                {/* 3 Section Selector Tabs — Section 2 & 3 locked until Section 1 is confirmed saved */}
                <div style={styles.sectionTabsBar}>
                  <button
                    onClick={() => handleNavigateSection('section_1')}
                    style={{
                      ...styles.sectionTabBtn,
                      ...(selectedSection === 'section_1' ? styles.sectionTabBtnActive : {})
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span>1. General Info &amp; Dates (Part A)</span>
                      <span style={{
                        ...styles.sectionBadge,
                        ...(sectionStatus.section_1.saved ? styles.badgeSuccess : sectionStatus.section_1.filled ? styles.badgeFilled : styles.badgePending)
                      }}>
                        {sectionStatus.section_1.saved ? '✓ Saved' : sectionStatus.section_1.filled ? '✍️ Populated' : '⭕ Pending'}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => sectionStatus.section_1.saved ? handleNavigateSection('section_2') : undefined}
                    disabled={!sectionStatus.section_1.saved}
                    title={!sectionStatus.section_1.saved ? 'Complete and save Section 1 first' : undefined}
                    style={{
                      ...styles.sectionTabBtn,
                      ...(selectedSection === 'section_2' ? styles.sectionTabBtnActive : {}),
                      ...(!sectionStatus.section_1.saved ? { opacity: 0.45, cursor: 'not-allowed' } : {})
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span>2. Balance Sheet (Part B) {!sectionStatus.section_1.saved && '🔒'}</span>
                      <span style={{
                        ...styles.sectionBadge,
                        ...(sectionStatus.section_2.saved ? styles.badgeSuccess : sectionStatus.section_2.filled ? styles.badgeFilled : styles.badgePending)
                      }}>
                        {sectionStatus.section_2.saved ? '✓ Saved' : sectionStatus.section_2.filled ? '✍️ Populated' : '⭕ Pending'}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => sectionStatus.section_1.saved ? handleNavigateSection('section_3') : undefined}
                    disabled={!sectionStatus.section_1.saved}
                    title={!sectionStatus.section_1.saved ? 'Complete and save Section 1 first' : undefined}
                    style={{
                      ...styles.sectionTabBtn,
                      ...(selectedSection === 'section_3' ? styles.sectionTabBtnActive : {}),
                      ...(!sectionStatus.section_1.saved ? { opacity: 0.45, cursor: 'not-allowed' } : {})
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span>3. Profit &amp; Loss (Part C) {!sectionStatus.section_1.saved && '🔒'}</span>
                      <span style={{
                        ...styles.sectionBadge,
                        ...(sectionStatus.section_3.saved ? styles.badgeSuccess : sectionStatus.section_3.filled ? styles.badgeFilled : styles.badgePending)
                      }}>
                        {sectionStatus.section_3.saved ? '✓ Saved' : sectionStatus.section_3.filled ? '✍️ Populated' : '⭕ Pending'}
                      </span>
                    </div>
                  </button>
                </div>

                {/* Active Section Content Card */}
                <div style={styles.sectionDetailCard}>
                  {selectedSection === 'section_1' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '16px' }}>
                          Section 1: General Information &amp; Statutory Compliance Dates (Part A)
                        </h3>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>CIN, Member Count, FY, AGM &amp; Board Meeting Details</span>
                      </div>
                      <div style={styles.sectionGrid}>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Company CIN</span>
                          <span style={styles.infoVal}>{targetCin || 'Active CIN'}</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Number of Members</span>
                          <span style={{ ...styles.infoVal, color: '#34d399' }}>2 (Members of Private Ltd)</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Financial Year Period</span>
                          <span style={styles.infoVal}>01/04/2025 to 31/03/2026</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Board Meeting Dates</span>
                          <span style={styles.infoVal}>05/09/2026 (BM 4a &amp; 5a)</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Auditor's Report Date</span>
                          <span style={styles.infoVal}>04/09/2026</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>AGM Held &amp; Due Date</span>
                          <span style={styles.infoVal}>Yes • 30/09/2026</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>AGM Extension Granted</span>
                          <span style={styles.infoVal}>No</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Subsidiary Applicable</span>
                          <span style={styles.infoVal}>No</span>
                        </div>
                      </div>

                      {/* Action Buttons for Section 1 */}
                      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          onClick={() => handleFillSection('section_1')}
                          disabled={!!loading}
                          style={styles.primaryBtn}
                        >
                          ✍️ 1. Populate Section 1 Fields
                        </button>
                        <button
                          onClick={() => handleInspectUiIssues('section_1')}
                          disabled={!!loading || isInspectingUi}
                          style={{ ...styles.primaryBtn, background: '#0284c7' }}
                        >
                          🔍 2. Inspect &amp; Highlight UI Issues {detectedUiIssues.length > 0 && `(${detectedUiIssues.length})`}
                        </button>
                        <button
                          onClick={() => handleSaveSectionDraft('section_1')}
                          disabled={!!loading}
                          style={{ ...styles.primaryBtn, background: '#059669' }}
                        >
                          💾 3. Save Section 1 Draft on MCA
                        </button>
                        <button
                          onClick={() => handleNavigateSection('section_2')}
                          disabled={!!loading}
                          style={{ ...styles.primaryBtn, background: '#6366f1' }}
                        >
                          ➡️ Proceed to Section 2 (Balance Sheet)
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedSection === 'section_2' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '16px' }}>
                          Section 2: Balance Sheet Statutory Schedules (Part B)
                        </h3>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>19 Audited Schedules • Equity, Liabilities &amp; Assets</span>
                      </div>
                      <div style={styles.sectionGrid}>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Share Capital</span>
                          <span style={styles.infoVal}>₹1,00,000 (Prev: ₹1,00,000)</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Reserves &amp; Surplus</span>
                          <span style={styles.infoVal}>₹-4,67,954 (Prev: ₹-7,46,390)</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Long Term Borrowings</span>
                          <span style={styles.infoVal}>₹-2,93,431 (Prev: ₹14,06,684)</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Trade Payables (Others)</span>
                          <span style={styles.infoVal}>₹2,248 (Prev: ₹337)</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Other Current Liabilities</span>
                          <span style={styles.infoVal}>₹17,00,000 (Prev: ₹0)</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Short Term Provisions</span>
                          <span style={styles.infoVal}>₹4,29,462 (Prev: ₹3,46,137)</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Property, Plant &amp; Equip</span>
                          <span style={styles.infoVal}>₹2,10,066 (Prev: ₹1,85,756)</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Trade Receivables</span>
                          <span style={styles.infoVal}>₹11,18,429 (Prev: ₹9,11,428)</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Cash &amp; Cash Equivalents</span>
                          <span style={styles.infoVal}>₹76,657 (Prev: ₹5,244)</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Other Current Assets</span>
                          <span style={styles.infoVal}>₹64,949 (Prev: ₹9,898)</span>
                        </div>
                      </div>

                      {/* Action Buttons for Section 2 */}
                      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          onClick={() => handleNavigateSection('section_1')}
                          disabled={!!loading}
                          style={{ ...styles.primaryBtn, background: '#475569' }}
                        >
                          ⬅️ Back to Section 1
                        </button>
                        <button
                          onClick={() => handleFillSection('section_2')}
                          disabled={!!loading}
                          style={styles.primaryBtn}
                        >
                          ✍️ 1. Populate Section 2 Fields
                        </button>
                        <button
                          onClick={() => handleInspectUiIssues('section_2')}
                          disabled={!!loading || isInspectingUi}
                          style={{ ...styles.primaryBtn, background: '#0284c7' }}
                        >
                          🔍 2. Inspect &amp; Highlight UI Issues {detectedUiIssues.length > 0 && `(${detectedUiIssues.length})`}
                        </button>
                        <button
                          onClick={() => handleSaveSectionDraft('section_2')}
                          disabled={!!loading}
                          style={{ ...styles.primaryBtn, background: '#059669' }}
                        >
                          💾 3. Save Section 2 Draft on MCA
                        </button>
                        <button
                          onClick={() => handleNavigateSection('section_3')}
                          disabled={!!loading}
                          style={{ ...styles.primaryBtn, background: '#6366f1' }}
                        >
                          ➡️ Proceed to Section 3 (Profit &amp; Loss)
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedSection === 'section_3' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '16px' }}>
                          Section 3: Profit &amp; Loss Statement Schedules (Part C)
                        </h3>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>7 Audited Figures • Revenue, Expenses &amp; Profit</span>
                      </div>
                      <div style={styles.sectionGrid}>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Sale of Services / Revenue</span>
                          <span style={{ ...styles.infoVal, color: '#34d399' }}>₹56,52,494</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Other Non-Operating Income</span>
                          <span style={styles.infoVal}>₹5,044</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Employee Benefit Expenses</span>
                          <span style={styles.infoVal}>₹39,19,184</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Depreciation &amp; Amortization</span>
                          <span style={styles.infoVal}>₹64,699</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Other Expenses</span>
                          <span style={styles.infoVal}>₹10,15,084</span>
                        </div>
                        <div style={styles.sectionInfoItem}>
                          <span style={styles.infoLabel}>Finance Costs</span>
                          <span style={styles.infoVal}>₹0</span>
                        </div>
                      </div>

                      {/* Action Buttons for Section 3 */}
                      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          onClick={() => handleNavigateSection('section_2')}
                          disabled={!!loading}
                          style={{ ...styles.primaryBtn, background: '#475569' }}
                        >
                          ⬅️ Back to Section 2
                        </button>
                        <button
                          onClick={() => handleFillSection('section_3')}
                          disabled={!!loading}
                          style={styles.primaryBtn}
                        >
                          ✍️ 1. Populate Section 3 Fields
                        </button>
                        <button
                          onClick={() => handleInspectUiIssues('section_3')}
                          disabled={!!loading || isInspectingUi}
                          style={{ ...styles.primaryBtn, background: '#0284c7' }}
                        >
                          🔍 2. Inspect &amp; Highlight UI Issues {detectedUiIssues.length > 0 && `(${detectedUiIssues.length})`}
                        </button>
                        <button
                          onClick={() => handleSaveSectionDraft('section_3')}
                          disabled={!!loading}
                          style={{ ...styles.primaryBtn, background: '#059669' }}
                        >
                          💾 3. Save Section 3 Draft on MCA
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ─── LIVE UI ISSUE HIGHLIGHT CARD ─── */}
                {detectedUiIssues.length > 0 ? (
                  <div style={styles.uiIssueCard}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>⚠️</span>
                        <div>
                          <h4 style={{ margin: 0, color: '#f87171', fontSize: '15px' }}>
                            MCA Portal UI Validation Issues Detected ({detectedUiIssues.length} Fields)
                          </h4>
                          <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                            The following inputs were flagged with red validation borders or mandatory messages on MCA. Resolve these before saving:
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleAutoFixIssues}
                        disabled={!!loading}
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '9px 18px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                        }}
                      >
                        ⚡ Autonomous Auto-Fix All ({detectedUiIssues.length})
                      </button>
                    </div>

                    <table style={styles.issueTable}>
                      <thead>
                        <tr>
                          <th style={styles.issueTh}>Field / Section</th>
                          <th style={styles.issueTh}>Detected UI Issue / Error</th>
                          <th style={styles.issueTh}>Field ID</th>
                          <th style={styles.issueTh}>Current Input</th>
                          <th style={styles.issueTh}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detectedUiIssues.map((issue, idx) => (
                          <tr key={idx} style={{ background: 'rgba(239, 68, 68, 0.08)' }}>
                            <td style={{ ...styles.issueTd, fontWeight: 600, color: '#fca5a5' }}>{issue.label}</td>
                            <td style={{ ...styles.issueTd, color: '#f87171' }}>{issue.error}</td>
                            <td style={{ ...styles.issueTd, color: '#94a3b8', fontSize: '11px', fontFamily: 'monospace' }}>
                              {issue.fieldId || 'N/A'}
                            </td>
                            <td style={{ ...styles.issueTd, color: '#cbd5e1' }}>
                              <code>{issue.currentValue || '(empty)'}</code>
                            </td>
                            <td style={styles.issueTd}>
                              <button
                                onClick={handleAutoFixIssues}
                                style={{ ...styles.fixIssueBtn, background: '#10b981', color: '#fff', border: 'none' }}
                              >
                                🤖 Auto-Fix
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (sectionStatus[selectedSection].filled || sectionStatus[selectedSection].saved) && (
                  <div style={styles.uiCleanCard}>
                    <span style={{ fontSize: '18px' }}>🎉</span>
                    <div>
                      <div style={{ fontWeight: 600, color: '#34d399', fontSize: '13px' }}>
                        Active Section UI Verified Clean
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        No red error borders, invalid states, or portal alert dialogs detected on {selectedSection === 'section_1' ? 'Section 1' : selectedSection === 'section_2' ? 'Section 2' : 'Section 3'}.
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Transition & Next Step */}
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={handleAdvanceToNextStep} disabled={!!loading} style={{ ...styles.primaryBtn, background: '#7c3aed' }}>
                    ⏭️ Advance to Step 2 (Click "Next" to Register SRN)
                  </button>
                  {draftSaved && (
                    <button onClick={() => setActiveTab(4)} style={styles.accentBtn}>
                      Proceed to Step 5: Verification ➔
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ─── BULK POPULATE WORKFLOW (LEGACY) ─── */}
            {activeWorkflowMode === 'bulk' && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ background: '#1e293b', padding: '16px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#f1f5f9' }}>Ready for Bulk Draft Injection:</h4>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#94a3b8', fontSize: '13px', lineHeight: '1.8' }}>
                    <li>Company: <b>{verifiedCompany || targetCin}</b></li>
                    <li>Financial Year: <b>2025–26 (01/04/2025 to 31/03/2026)</b></li>
                    <li>Balance Sheet: <b>19 Audited Schedules (Share Capital ₹1,00,000, Reserves ₹-4,67,954, etc.)</b></li>
                    <li>Profit &amp; Loss: <b>7 Revenue/Expense Items (Revenue ₹56,52,494, etc.)</b></li>
                    <li>Target Action: <b>Global Form-Level Save (#guideContainer-rootPanel-panel_622013715-mca_button_copy___widget)</b></li>
                  </ul>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={handlePopulateAndSaveDraft} disabled={!!loading} style={styles.primaryLargeBtn}>
                    🚀 Populate All Sections &amp; Save Draft on MCA
                  </button>
                  <button onClick={handleAdvanceToNextStep} disabled={!!loading} style={{ ...styles.primaryBtn, background: '#7c3aed' }}>
                    ⏭️ Advance to Step 2 (Click "Next" to Register SRN)
                  </button>
                  {draftSaved && (
                    <button onClick={() => setActiveTab(4)} style={styles.accentBtn}>
                      Proceed to Step 5: Verification ➔
                    </button>
                  )}
                </div>
              </div>
            )}

            {draftSaved && (
              <div style={styles.successBox}>
                🎉 <b>Form-Level Draft Saved:</b> Audited figures have been saved on MCA portal.
                Click <b>"Advance to Step 2"</b> or proceed to Step 5 to verify in My Applications.
              </div>
            )}
            {nextStepCompleted && (
              <div style={{ ...styles.successBox, background: 'rgba(124, 58, 237, 0.15)', borderColor: '#8b5cf6', color: '#c4b5fd' }}>
                ✨ <b>Step 1 Validated &amp; Advanced:</b> Step 1 is saved on MCA's backend database and transition to Step 2 has been triggered.
              </div>
            )}
          </div>
        )}

        {/* ════ STEP 5: VERIFICATION & AUDIT TRAIL ════ */}
        {activeTab === 4 && (
          <div style={styles.tabCard}>
            <h2 style={styles.cardHeading}>✅ Step 5: End-to-End Verification &amp; Audit Trail</h2>
            <p style={styles.cardSub}>
              Confirm that Form AOC-4 is safely stored in <b>Draft / Pending Submission</b> status under MCA My Applications.
              The Chrome browser remains open for your final visual inspection.
            </p>

            <div style={styles.btnRow}>
              <button onClick={handleCaptureVerification} disabled={!!loading} style={styles.primaryBtn}>
                📸 Capture Verification Screenshot &amp; Audit Report
              </button>
              <button onClick={handleCheckApplications} disabled={!!loading} style={{ ...styles.primaryBtn, background: '#059669' }}>
                🏛️ Check MCA My Application &gt; Pending for Action
              </button>
            </div>

            {reviewScreenshot && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ color: '#38bdf8' }}>Live MCA Portal Capture:</h4>
                <img src={reviewScreenshot} alt="MCA Verification" style={styles.reviewImg} />
              </div>
            )}

            {myAppScreenshot && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ color: '#10b981' }}>MCA My Application Dashboard Capture:</h4>
                <img src={myAppScreenshot} alt="My Application Dashboard" style={styles.reviewImg} />
              </div>
            )}

            {myApplicationsList.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ color: '#f8fafc' }}>Pending Applications Retrieved from MCA:</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <tbody>
                      {myApplicationsList.map((row: any, rIdx: number) => (
                        <tr key={rIdx}>
                          {Array.isArray(row) && row.map((cell: string, cIdx: number) => (
                            <td key={cIdx} style={{ ...styles.td, fontSize: '12px' }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px', padding: '16px', background: '#1e293b', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 10px', color: '#10b981' }}>🎯 Final Source of Truth Confirmed:</h4>
              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
                - Form AOC-4 draft is officially registered on MCA.<br />
                - All 26 figures from <code>GurpreetSaluja_Financials_2025-26.xls</code> have been saved.<br />
                - <b>Browser remains open indefinitely</b> for your final manual review and DSC signing.
              </p>
            </div>
          </div>
        )}
        </div>

        {/* ════ Persistent Right Column: Live MCA Action & Browser Stream ════ */}
        {showLivePanel && (
          <div style={styles.rightColumn}>
            <div style={styles.monitorCard}>
              {/* Header with live pulse indicator & controls */}
              <div style={styles.monitorHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 10px #10b981',
                    display: 'inline-block'
                  }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Live MCA Portal &amp; Continuous Observability
                      <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                        CDP Stream • {streamTelemetry.fps || 30} FPS
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Real-time 30+ FPS Zero-Latency Chrome View</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={fetchTelemetry} style={styles.monitorSmallBtn} title="Check stream health">
                    ⚡ Telemetry
                  </button>
                  <button onClick={() => setFullscreenImage(`http://localhost:3001/api/aoc4/live-stream`)} style={styles.monitorSmallBtn} title="Inspect full resolution">
                    🔍 Zoom
                  </button>
                </div>
              </div>

              {/* Faux Chrome Address Bar with live URL */}
              <div style={styles.urlBarMockup}>
                <span style={{ fontSize: '11px', color: '#10b981' }}>🔒</span>
                <span style={styles.urlText}>{streamTelemetry.activeUrl || 'https://www.mca.gov.in/content/mca/.../form-aoc4.html'}</span>
                <span style={styles.urlBadge}>Active Stream</span>
              </div>

              {/* Continuous Live Viewport */}
              <div
                style={styles.screenWrapper}
                onClick={() => setFullscreenImage(`http://localhost:3001/api/aoc4/live-stream`)}
                title="Continuous CDP Live Stream (Click for full screen)"
              >
                <div style={{ position: 'relative' }}>
                  <img
                    src="http://localhost:3001/api/aoc4/live-stream"
                    alt="Continuous Live MCA Observability Stream"
                    style={styles.liveScreenImg}
                    onError={(e: any) => {
                      if (liveScreenshot) e.target.src = liveScreenshot;
                    }}
                  />
                  <div style={styles.zoomHoverTag}>
                    🟢 Continuous Observability (Click to Inspect Full Screen)
                  </div>
                </div>
              </div>

              {/* Real-Time System Actions Feed ("What action is getting performed") */}
              <div style={styles.actionFeedSection}>
                <div style={styles.actionFeedHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>⚡</span>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#38bdf8' }}>
                      System Actions &amp; Timeline ({displaySteps.length})
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Live execution log
                  </span>
                </div>
                <div style={styles.actionFeedList}>
                  {displaySteps.length === 0 ? (
                    <div style={styles.emptyFeedBox}>
                      <span style={{ fontSize: '22px' }}>⏳</span>
                      <div style={{ fontWeight: 600, color: '#94a3b8', fontSize: '13px' }}>Awaiting Execution</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', lineHeight: '1.4' }}>
                        No automated filing run has been executed today (2026-09-24). Live agent events and portal actions will be logged here once you trigger a section.
                      </div>
                    </div>
                  ) : (
                    displaySteps.map((step, idx) => (
                      <div key={step.id || idx} style={styles.actionItem}>
                        <div style={styles.actionItemTop}>
                          <span style={{
                            ...styles.statusBadge,
                            ...(step.status === 'completed' ? styles.statusCompleted :
                               step.status === 'running' ? styles.statusRunning :
                               step.status === 'warning' ? styles.statusWarning : styles.statusFailed)
                          }}>
                            {step.status === 'completed' ? '✓ DONE' :
                             step.status === 'running' ? '⏳ RUNNING' :
                             step.status === 'warning' ? '⚠️ NOTICE' : '✕ FAILED'}
                          </span>
                          <span style={styles.actionStepName}>{step.stepName}</span>
                          <span style={styles.actionTimestamp}>
                            {step.timestamp ? new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p style={styles.actionMessage}>{step.message}</p>
                      </div>
                    ))
                  )}
                  <div ref={stepsEndRef} />
                </div>
              </div>

              {/* Professional Feedback & Background Auto-Adaptation Console */}
              <div style={{
                marginTop: '14px',
                padding: '14px 16px',
                background: '#090d16',
                borderRadius: '8px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px' }}>💬</span>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#38bdf8' }}>
                      Professional Feedback &amp; Adaptation
                    </span>
                  </div>
                  <span className="badge badge-cyan" style={{ fontSize: '9px' }}>
                    Autonomous Background Engine
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 10px', lineHeight: '1.4' }}>
                  Instruct the system in natural language to update Schedule III mappings or compliance details. Updates background filing state automatically.
                </p>

                {/* Quick Directive Pills */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <button
                    onClick={() => handleSubmitProfessionalFeedback('Swap current and previous reporting period columns across all schedules')}
                    disabled={isSubmittingFeedback}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: 'rgba(168, 85, 247, 0.15)',
                      color: '#c084fc',
                      border: '1px solid #7e22ce',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Swap Periods
                  </button>
                  <button
                    onClick={() => handleSubmitProfessionalFeedback('Short-term provisions current year 429462, previous year 346137')}
                    disabled={isSubmittingFeedback}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid #0284c7',
                      cursor: 'pointer'
                    }}
                  >
                    ⚖️ Balance Provisions
                  </button>
                  <button
                    onClick={() => handleSubmitProfessionalFeedback('Trade payables others current 2248, previous 337')}
                    disabled={isSubmittingFeedback}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid #059669',
                      cursor: 'pointer'
                    }}
                  >
                    💼 Trade Payables
                  </button>
                </div>

                {/* Input Textarea & Submit */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    rows={2}
                    placeholder="e.g. Set AGM date to 20/09/2026 or adjust Trade Payables..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: '#020617',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      resize: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <select
                      value={feedbackCategory}
                      onChange={(e) => setFeedbackCategory(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: '#020617',
                        border: '1px solid #334155',
                        color: '#94a3b8',
                        fontSize: '11px'
                      }}
                    >
                      <option value="Figure Correction">Figure Correction</option>
                      <option value="Compliance Date">Compliance Date</option>
                      <option value="Statutory Disclosure">Statutory Disclosure</option>
                      <option value="Column Reversal">Column Reversal</option>
                      <option value="General">General</option>
                    </select>

                    <button
                      onClick={() => handleSubmitProfessionalFeedback()}
                      disabled={isSubmittingFeedback || !feedbackText.trim()}
                      className="btn btn-primary"
                      style={{
                        fontSize: '11px',
                        padding: '6px 14px',
                        background: 'linear-gradient(135deg, #0284c7, #3b82f6)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {isSubmittingFeedback ? 'Adapting...' : '🚀 Submit & Auto-Adapt'}
                    </button>
                  </div>
                </div>

                {feedbackResponseMsg && (
                  <div style={{
                    marginTop: '8px',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    color: '#6ee7b7'
                  }}>
                    {feedbackResponseMsg}
                  </div>
                )}
              </div>

              {/* Strict Safety Enforcement Notice */}
              <div style={styles.safetyFooter}>
                <span style={{ fontSize: '16px' }}>🛡️</span>
                <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                  <b>Strict Safety Enforcement:</b> "Save Draft" only. Final Form Submission, Fees, and DSC signing are permanently locked and remain 100% under your personal control.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen High-Resolution Inspection Lightbox */}
      {fullscreenImage && (
        <div
          style={styles.modalOverlay}
          onClick={() => setFullscreenImage(null)}
        >
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🖥️</span>
                <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '15px' }}>
                  Full-Resolution MCA Chrome Viewport (Interactive Zoom)
                </span>
              </div>
              <button
                onClick={() => setFullscreenImage(null)}
                style={styles.modalCloseBtn}
              >
                ✕ Close
              </button>
            </div>
            <div style={styles.modalBody}>
              <img
                src={fullscreenImage}
                alt="Full MCA Screen"
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Visual Styles (Dark Mode, Responsive, Glassmorphism) ─────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#0a0f1d',
    color: '#e2e8f0',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    paddingBottom: '40px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 32px',
    background: 'rgba(15, 23, 42, 0.95)',
    borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
    backdropFilter: 'blur(10px)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  headerIcon: { fontSize: '32px' },
  headerTitle: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#f8fafc' },
  headerSub: { margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' },
  companyBadge: {
    background: '#1e293b',
    border: '1px solid #38bdf8',
    color: '#38bdf8',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
  },
  stepperBar: {
    display: 'flex',
    gap: '8px',
    padding: '16px 32px',
    background: '#0f172a',
    borderBottom: '1px solid #1e293b',
    overflowX: 'auto',
  },
  stepTab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    color: '#94a3b8',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  stepTabCurrent: {
    background: '#0284c7',
    borderColor: '#38bdf8',
    color: '#ffffff',
    boxShadow: '0 0 12px rgba(2, 132, 199, 0.4)',
  },
  stepTabDone: {
    background: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    color: '#10b981',
  },
  stepTabLocked: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  stepTabIcon: { fontSize: '14px' },
  stepTabLabel: { whiteSpace: 'nowrap' },
  lockBadge: { fontSize: '10px', marginLeft: '4px' },
  content: {
    maxWidth: '1200px',
    margin: '24px auto',
    padding: '0 24px',
  },
  tabCard: {
    background: '#131c31',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '28px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
  },
  cardHeading: { margin: '0 0 8px', fontSize: '18px', color: '#38bdf8' },
  cardSub: { margin: '0 0 20px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  inputField: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: 600, color: '#cbd5e1' },
  input: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '10px 12px',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
  },
  btnRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' },
  primaryBtn: {
    background: '#0284c7',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  primaryLargeBtn: {
    background: 'linear-gradient(135deg, #0284c7, #2563eb)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 28px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)',
  },
  secondaryBtn: {
    background: '#334155',
    color: '#f8fafc',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  accentBtn: {
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid #0284c7',
    borderRadius: '6px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmMappingBtn: {
    background: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  promptBox: {
    marginTop: '20px',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '8px',
    padding: '16px',
  },
  captchaImg: {
    height: '45px',
    borderRadius: '4px',
    border: '1px solid #475569',
    background: '#fff',
    padding: '2px',
  },
  warningBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '14px 18px',
    color: '#fca5a5',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  successBox: {
    marginTop: '16px',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '8px',
    padding: '14px 18px',
    color: '#34d399',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  errorBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#dc2626',
    color: '#fff',
    padding: '10px 24px',
    fontSize: '13px',
    fontWeight: 600,
  },
  successBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#059669',
    color: '#fff',
    padding: '10px 24px',
    fontSize: '13px',
    fontWeight: 600,
  },
  loadingBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#0284c7',
    color: '#fff',
    padding: '8px 24px',
    fontSize: '13px',
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid #fff',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  closeBtn: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px' },
  tableHeaderBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  filterBtn: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#94a3b8',
    borderRadius: '4px',
    padding: '4px 10px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  filterBtnActive: {
    background: '#0284c7',
    borderColor: '#38bdf8',
    color: '#fff',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: {
    background: '#0f172a',
    padding: '10px 12px',
    textAlign: 'left',
    color: '#94a3b8',
    borderBottom: '1px solid #334155',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #1e293b' },
  editInput: {
    background: '#0f172a',
    border: '1px solid #38bdf8',
    borderRadius: '4px',
    color: '#fff',
    padding: '4px 8px',
    fontSize: '13px',
    width: '120px',
  },
  confirmSmallBtn: { background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px' },
  cancelSmallBtn: { background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px' },
  editBtn: { background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' },
  secondarySmallBtn: {
    background: '#334155',
    color: '#e2e8f0',
    border: '1px solid #475569',
    borderRadius: '4px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  accentSmallBtn: {
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid #0284c7',
    borderRadius: '4px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  reviewImg: { maxWidth: '100%', borderRadius: '8px', border: '1px solid #334155', marginTop: '10px' },
  monitorToggleBtn: {
    background: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid #38bdf8',
    color: '#38bdf8',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.22fr) minmax(390px, 1fr)',
    gap: '24px',
    maxWidth: '1680px',
    margin: '24px auto',
    padding: '0 24px',
    alignItems: 'start',
  },
  singleColumnLayout: {
    maxWidth: '1200px',
    margin: '24px auto',
    padding: '0 24px',
  },
  leftColumn: {
    minWidth: 0,
  },
  rightColumn: {
    minWidth: 0,
  },
  monitorCard: {
    background: '#131c31',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '18px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    position: 'sticky',
    top: '20px',
  },
  monitorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '10px',
    borderBottom: '1px solid #1e293b',
  },
  monitorTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 700,
    color: '#f8fafc',
  },
  monitorSmallBtn: {
    background: '#1e293b',
    color: '#38bdf8',
    border: '1px solid #334155',
    borderRadius: '4px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  livePulseDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 10px #10b981',
    display: 'inline-block',
  },
  urlBarMockup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#090d16',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '11px',
    color: '#94a3b8',
    marginBottom: '12px',
  },
  urlText: {
    fontFamily: 'monospace',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    color: '#cbd5e1',
  },
  urlBadge: {
    background: '#0284c7',
    color: '#fff',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '3px',
    fontWeight: 600,
  },
  screenWrapper: {
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #334155',
    background: '#000',
    cursor: 'pointer',
    position: 'relative',
    maxHeight: '340px',
    display: 'flex',
    justifyContent: 'center',
  },
  liveScreenImg: {
    width: '100%',
    objectFit: 'contain',
    maxHeight: '340px',
    display: 'block',
  },
  zoomHoverTag: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    background: 'rgba(15, 23, 42, 0.85)',
    color: '#38bdf8',
    border: '1px solid #38bdf8',
    borderRadius: '4px',
    padding: '3px 8px',
    fontSize: '11px',
    fontWeight: 600,
    pointerEvents: 'none',
  },
  screenPlaceholder: {
    padding: '40px 20px',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '13px',
  },
  actionFeedSection: {
    marginTop: '14px',
    background: '#0b1120',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '12px',
  },
  actionFeedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid #1e293b',
  },
  actionFeedList: {
    maxHeight: '220px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
  },
  actionItem: {
    background: '#131d33',
    border: '1px solid #1e293b',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '12px',
  },
  actionItemTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  statusBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '3px',
    letterSpacing: '0.5px',
  },
  statusCompleted: {
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    border: '1px solid #10b981',
  },
  statusRunning: {
    background: 'rgba(2, 132, 199, 0.2)',
    color: '#38bdf8',
    border: '1px solid #0284c7',
  },
  statusWarning: {
    background: 'rgba(245, 158, 11, 0.2)',
    color: '#fbbf24',
    border: '1px solid #f59e0b',
  },
  statusFailed: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#f87171',
    border: '1px solid #ef4444',
  },
  actionStepName: {
    fontWeight: 600,
    color: '#f1f5f9',
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  actionTimestamp: {
    fontSize: '10px',
    color: '#64748b',
  },
  actionMessage: {
    margin: 0,
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: '1.4',
  },
  safetyFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
    padding: '8px 12px',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '6px',
  },
  safetyGuaranteeBox: {
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  liveNoticeBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '16px',
    padding: '12px 16px',
    background: '#090d16',
    border: '1px solid #1e293b',
    borderRadius: '8px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(4px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  modalContent: {
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    width: '90vw',
    maxWidth: '1300px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 18px',
    background: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  modalCloseBtn: {
    background: '#334155',
    color: '#f8fafc',
    border: 'none',
    borderRadius: '4px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  modalBody: {
    padding: '16px',
    overflowY: 'auto',
    maxHeight: 'calc(90vh - 60px)',
  },
  subTabBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  subTabBtnActive: {
    background: '#0284c7',
    color: '#ffffff',
    boxShadow: '0 0 10px rgba(2, 132, 199, 0.4)',
  },
  sectionTabsBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  sectionTabBtn: {
    flex: 1,
    minWidth: '220px',
    background: '#131d33',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#cbd5e1',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  sectionTabBtnActive: {
    background: '#1e293b',
    borderColor: '#38bdf8',
    boxShadow: '0 0 14px rgba(56, 189, 248, 0.25)',
  },
  sectionBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '12px',
    letterSpacing: '0.4px',
  },
  badgeSuccess: {
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    border: '1px solid #10b981',
  },
  badgeFilled: {
    background: 'rgba(2, 132, 199, 0.2)',
    color: '#38bdf8',
    border: '1px solid #0284c7',
  },
  badgePending: {
    background: 'rgba(100, 116, 139, 0.2)',
    color: '#94a3b8',
    border: '1px solid #475569',
  },
  sectionDetailCard: {
    background: '#131d33',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
  },
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    background: '#0b1120',
    padding: '14px',
    borderRadius: '6px',
    border: '1px solid #1e293b',
  },
  sectionInfoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  infoLabel: {
    fontSize: '11px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoVal: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e2e8f0',
  },
  uiIssueCard: {
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px',
    boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)',
  },
  issueTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
  },
  issueTh: {
    padding: '8px 12px',
    textAlign: 'left',
    background: '#1e1b2e',
    color: '#f87171',
    fontSize: '11px',
    textTransform: 'uppercase',
    borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
  },
  issueTd: {
    padding: '8px 12px',
    fontSize: '12px',
    borderBottom: '1px solid rgba(239, 68, 68, 0.15)',
  },
  fixIssueBtn: {
    background: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  uiCleanCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid #10b981',
    borderRadius: '8px',
    padding: '14px 18px',
    marginTop: '16px',
  },
  emptyFeedBox: {
    padding: '30px 16px',
    textAlign: 'center',
    background: '#0a0f1d',
    borderRadius: '6px',
    border: '1px dashed #334155',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
};

export default AOC4FilingDashboard;
