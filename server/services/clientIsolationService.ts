import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENTS_BASE_DIR = path.resolve(__dirname, '../../data/clients');
const DEFAULT_GLOBAL_STATE = path.resolve(__dirname, '../../data/aoc4_mapping_state.json');
const DEFAULT_TEMPLATE_PATH = path.resolve(__dirname, '../../data/templates/aoc4_standard_pvt_ltd.json');

export interface ClientMetadata {
  cin: string;
  companyName: string;
  financialYear: string;
  createdAt: string;
  updatedAt: string;
  fieldCount: number;
  status: 'initialized' | 'mapping_ready' | 'draft_saved' | 'filed';
  lastSectionFilled?: string;
  lastRunTimestamp?: string;
}

export interface ClientSummary {
  cin: string;
  companyName: string;
  financialYear: string;
  updatedAt: string;
  isActive: boolean;
  fieldCount: number;
  status: string;
}

class ClientIsolationService {
  private activeCin: string = '';

  constructor() {
    this.ensureBaseDir();
    this.initActiveClient();
  }

  private ensureBaseDir() {
    if (!fs.existsSync(CLIENTS_BASE_DIR)) {
      fs.mkdirSync(CLIENTS_BASE_DIR, { recursive: true });
    }
  }

  private initActiveClient() {
    try {
      const dirs = fs.readdirSync(CLIENTS_BASE_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      if (dirs.length > 0) {
        this.activeCin = dirs[0];
      }
    } catch (err) {
      console.warn('[ClientIsolationService] Error initializing active client:', err);
    }
  }

  private sanitizeCin(cin: string): string {
    if (!cin) return '';
    return cin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  public getClientDir(cin: string): string {
    const safeCin = this.sanitizeCin(cin) || 'DEFAULT_CLIENT';
    return path.join(CLIENTS_BASE_DIR, safeCin);
  }

  public getActiveCin(): string {
    return this.activeCin;
  }

  public setActiveCin(cin: string): void {
    const safeCin = this.sanitizeCin(cin);
    this.activeCin = safeCin;
    this.ensureClientWorkspace(safeCin);
  }

  /**
   * Ensure a dedicated, completely isolated directory and state file exists for a client
   */
  public ensureClientWorkspace(cin: string, companyName?: string, seedData?: any): string {
    const safeCin = this.sanitizeCin(cin);
    const clientDir = this.getClientDir(safeCin);

    if (!fs.existsSync(clientDir)) {
      fs.mkdirSync(clientDir, { recursive: true });
    }

    const stateFile = path.join(clientDir, 'aoc4_mapping_state.json');
    if (!fs.existsSync(stateFile)) {
      let initialState: any = null;
      if (seedData) {
        initialState = JSON.parse(JSON.stringify(seedData));
      } else if (fs.existsSync(DEFAULT_TEMPLATE_PATH)) {
        const tpl = JSON.parse(fs.readFileSync(DEFAULT_TEMPLATE_PATH, 'utf-8'));
        initialState = JSON.parse(JSON.stringify(tpl.mappingState || {}));
      } else {
        initialState = {
          companyInfo: { cin: safeCin, companyName: companyName || 'Entity ' + safeCin },
          partB_balanceSheet: [],
          partC_profitAndLoss: [],
        };
      }

      if (!initialState.companyInfo) initialState.companyInfo = {};
      initialState.companyInfo.cin = safeCin;
      if (companyName) initialState.companyInfo.companyName = companyName;

      fs.writeFileSync(stateFile, JSON.stringify(initialState, null, 2), 'utf-8');
    }

    const metaFile = path.join(clientDir, 'client_metadata.json');
    if (!fs.existsSync(metaFile)) {
      const meta: ClientMetadata = {
        cin: safeCin,
        companyName: companyName || 'Entity ' + safeCin,
        financialYear: '2025-26',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fieldCount: 68,
        status: 'initialized',
      };
      fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2), 'utf-8');
    }

    return clientDir;
  }

  /**
   * Get client mapping state from the isolated workspace ONLY
   */
  public getClientMappingState(cin?: string): any {
    const targetCin = this.sanitizeCin(cin || this.activeCin);
    const clientDir = this.getClientDir(targetCin);
    const stateFile = path.join(clientDir, 'aoc4_mapping_state.json');

    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    }

    // If client workspace doesn't exist yet, initialize it safely
    this.ensureClientWorkspace(targetCin);
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    }

    // Fallback to global only if brand new initialization
    if (fs.existsSync(DEFAULT_GLOBAL_STATE)) {
      return JSON.parse(fs.readFileSync(DEFAULT_GLOBAL_STATE, 'utf-8'));
    }

    return null;
  }

  /**
   * Save client mapping state strictly into that client's isolated directory
   */
  public saveClientMappingState(cin: string, state: any): boolean {
    const safeCin = this.sanitizeCin(cin || state?.companyInfo?.cin || this.activeCin);
    const clientDir = this.getClientDir(safeCin);
    this.ensureClientWorkspace(safeCin);

    const stateFile = path.join(clientDir, 'aoc4_mapping_state.json');
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');

    // Update client metadata
    const metaFile = path.join(clientDir, 'client_metadata.json');
    const existingMeta: ClientMetadata = fs.existsSync(metaFile)
      ? JSON.parse(fs.readFileSync(metaFile, 'utf-8'))
      : {
          cin: safeCin,
          companyName: state.companyInfo?.companyName || safeCin,
          financialYear: '2025-26',
          createdAt: new Date().toISOString(),
          status: 'mapping_ready',
        };

    existingMeta.updatedAt = new Date().toISOString();
    existingMeta.companyName = state.companyInfo?.companyName || existingMeta.companyName;
    existingMeta.fieldCount = (state.partB_balanceSheet?.length || 0) + (state.partC_profitAndLoss?.length || 0);
    fs.writeFileSync(metaFile, JSON.stringify(existingMeta, null, 2), 'utf-8');

    // If this is the active client, also keep the active pointer sync for legacy code
    if (safeCin === this.activeCin) {
      fs.writeFileSync(DEFAULT_GLOBAL_STATE, JSON.stringify(state, null, 2), 'utf-8');
      const extFile = path.resolve(__dirname, '../../extension/aoc4_mapping_state.json');
      if (fs.existsSync(path.dirname(extFile))) {
        fs.writeFileSync(extFile, JSON.stringify(state, null, 2), 'utf-8');
      }
    }

    return true;
  }

  /**
   * List all isolated clients available in the system
   */
  public listClients(): ClientSummary[] {
    this.ensureBaseDir();
    const dirs = fs.readdirSync(CLIENTS_BASE_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const list: ClientSummary[] = [];

    for (const dirName of dirs) {
      const clientDir = path.join(CLIENTS_BASE_DIR, dirName);
      const metaFile = path.join(clientDir, 'client_metadata.json');
      const stateFile = path.join(clientDir, 'aoc4_mapping_state.json');

      let meta: any = null;
      if (fs.existsSync(metaFile)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
        } catch (_) {}
      }

      let state: any = null;
      if (fs.existsSync(stateFile)) {
        try {
          state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        } catch (_) {}
      }

      list.push({
        cin: dirName,
        companyName: meta?.companyName || state?.companyInfo?.companyName || `Company ${dirName}`,
        financialYear: meta?.financialYear || '2025-26',
        updatedAt: meta?.updatedAt || new Date().toISOString(),
        isActive: dirName === this.activeCin,
        fieldCount: meta?.fieldCount || (state?.partB_balanceSheet?.length || 0) + (state?.partC_profitAndLoss?.length || 0),
        status: meta?.status || 'ready',
      });
    }

    return list;
  }

  /**
   * Cross-Client Safety Interlock:
   * Verify that the active portal page CIN matches the client file CIN.
   * If there is a mismatch, returns false to prevent filling wrong company data!
   */
  public verifyCrossClientSafety(portalDetectedCin: string, requestedClientCin?: string): {
    allowed: boolean;
    reason?: string;
  } {
    const clientCin = this.sanitizeCin(requestedClientCin || this.activeCin);
    const portalCin = this.sanitizeCin(portalDetectedCin);

    if (!portalCin) {
      // Portal page hasn't loaded CIN or is on pre-form page; allow navigation
      return { allowed: true };
    }

    if (portalCin !== clientCin) {
      return {
        allowed: false,
        reason: `CRITICAL CROSS-CLIENT ISOLATION INTERLOCK: The active MCA portal tab is for CIN '${portalCin}', but the active client workspace is for CIN '${clientCin}'. Auto-fill has been blocked to prevent cross-client data contamination.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Append audit event isolated to this client
   */
  public appendClientAudit(cin: string, event: any): void {
    const safeCin = this.sanitizeCin(cin || this.activeCin);
    const clientDir = this.getClientDir(safeCin);
    const auditFile = path.join(clientDir, 'audit_trail.json');
    let auditList: any[] = [];
    if (fs.existsSync(auditFile)) {
      try {
        auditList = JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
      } catch (_) {}
    }
    auditList.unshift({
      timestamp: new Date().toISOString(),
      ...event,
    });
    fs.writeFileSync(auditFile, JSON.stringify(auditList.slice(0, 100), null, 2), 'utf-8');
  }

  /**
   * Get feedback history isolated to this client
   */
  public getClientFeedback(cin: string): any[] {
    const safeCin = this.sanitizeCin(cin || this.activeCin);
    const clientDir = this.getClientDir(safeCin);
    const feedbackFile = path.join(clientDir, 'feedback_history.json');
    if (fs.existsSync(feedbackFile)) {
      try {
        return JSON.parse(fs.readFileSync(feedbackFile, 'utf-8'));
      } catch (_) {}
    }
    return [];
  }

  /**
   * Append feedback isolated to this client
   */
  public appendClientFeedback(cin: string, item: any): void {
    const safeCin = this.sanitizeCin(cin || this.activeCin);
    const clientDir = this.getClientDir(safeCin);
    const feedbackFile = path.join(clientDir, 'feedback_history.json');
    let list: any[] = [];
    if (fs.existsSync(feedbackFile)) {
      try {
        list = JSON.parse(fs.readFileSync(feedbackFile, 'utf-8'));
      } catch (_) {}
    }
    list.unshift(item);
    fs.writeFileSync(feedbackFile, JSON.stringify(list, null, 2), 'utf-8');
  }
}

export const clientIsolationService = new ClientIsolationService();
