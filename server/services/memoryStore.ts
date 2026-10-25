import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MemoryRule } from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEMORY_FILE_PATH = path.resolve(__dirname, '../../data/memory.json');

export class MemoryStore {
  private rules: MemoryRule[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(MEMORY_FILE_PATH)) {
        const raw = fs.readFileSync(MEMORY_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        this.rules = parsed.rules || [];
      } else {
        this.rules = [];
        this.save();
      }
    } catch (err) {
      console.error('Failed to load memory store:', err);
      this.rules = [];
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(MEMORY_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify({ rules: this.rules }, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save memory store:', err);
    }
  }

  public getAllRules(): MemoryRule[] {
    return [...this.rules];
  }

  public getRule(domain: string, sourceKey: string): MemoryRule | undefined {
    const cleanDomain = this.normalizeDomain(domain);
    return this.rules.find(
      (r) =>
        (r.domain === cleanDomain || r.domain === '*' || cleanDomain.includes(r.domain)) &&
        r.sourceKey.toLowerCase() === sourceKey.toLowerCase()
    );
  }

  public recordLearnedMapping(
    domain: string,
    sourceKey: string,
    targetSelector: string,
    targetName: string,
    isManualCorrection: boolean = false
  ): MemoryRule {
    const cleanDomain = this.normalizeDomain(domain);
    const existingIndex = this.rules.findIndex(
      (r) =>
        r.domain === cleanDomain &&
        r.sourceKey.toLowerCase() === sourceKey.toLowerCase()
    );

    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = this.rules[existingIndex];
      const newConfidence = isManualCorrection
        ? 1.0
        : Math.min(1.0, existing.confidence + 0.05);

      this.rules[existingIndex] = {
        ...existing,
        targetSelector,
        targetName,
        frequency: existing.frequency + 1,
        confidence: Number(newConfidence.toFixed(2)),
        lastUsed: now,
      };
      this.save();
      return this.rules[existingIndex];
    } else {
      const newRule: MemoryRule = {
        domain: cleanDomain,
        sourceKey,
        targetSelector,
        targetName,
        frequency: 1,
        confidence: isManualCorrection ? 1.0 : 0.9,
        lastUsed: now,
      };
      this.rules.push(newRule);
      this.save();
      return newRule;
    }
  }

  public deleteRule(domain: string, sourceKey: string): boolean {
    const cleanDomain = this.normalizeDomain(domain);
    const prevLen = this.rules.length;
    this.rules = this.rules.filter(
      (r) => !(r.domain === cleanDomain && r.sourceKey.toLowerCase() === sourceKey.toLowerCase())
    );
    if (this.rules.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  public resetMemory(): void {
    this.rules = [];
    this.save();
  }

  private normalizeDomain(domain: string): string {
    try {
      if (domain.startsWith('http://') || domain.startsWith('https://')) {
        const parsed = new URL(domain);
        return parsed.hostname;
      }
      return domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    } catch {
      return domain;
    }
  }
}

export const memoryStore = new MemoryStore();
