import fs from 'fs';
import path from 'path';
import { SourceDocument, SourceField, ValidationReport } from '../../shared/types.js';

export class FileParserAgent {
  public async parseFile(filePath: string, originalName?: string): Promise<SourceDocument> {
    const fileName = originalName || path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const rawContent = fs.readFileSync(filePath, 'utf-8');

    let parsedData: Record<string, any> = {};
    let fileType: 'json' | 'csv' | 'kv' | 'yaml' = 'json';

    if (ext === '.json') {
      fileType = 'json';
      try {
        parsedData = JSON.parse(rawContent);
      } catch (err: any) {
        throw new Error(`JSON parsing error in ${fileName}: ${err.message}`);
      }
    } else if (ext === '.csv') {
      fileType = 'csv';
      parsedData = this.parseCsv(rawContent);
    } else {
      fileType = 'kv';
      parsedData = this.parseKeyValue(rawContent);
    }

    // Flatten nested structures if any
    const flattened = this.flattenObject(parsedData);
    const fields: Record<string, SourceField> = {};
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    for (const [key, value] of Object.entries(flattened)) {
      const field = this.analyzeField(key, value);
      fields[key] = field;

      if (!field.isValid && field.validationError) {
        errors.push({ field: key, message: field.validationError });
      }
      if (field.validationWarning) {
        warnings.push({ field: key, message: field.validationWarning });
      }
    }

    const totalFields = Object.keys(fields).length;
    const validFields = Object.values(fields).filter((f) => f.isValid).length;

    const validationReport: ValidationReport = {
      isValid: errors.length === 0,
      totalFields,
      validFields,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors,
      warnings,
    };

    return {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fileName,
      fileType,
      uploadedAt: new Date().toISOString(),
      rawContent,
      fields,
      canonicalData: flattened,
      validationReport,
    };
  }

  public parseRawText(content: string, fileName: string = 'pasted_data.json'): SourceDocument {
    let parsedData: Record<string, any> = {};
    let fileType: 'json' | 'csv' | 'kv' = 'json';

    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        parsedData = JSON.parse(trimmed);
        fileType = 'json';
      } catch {
        parsedData = this.parseKeyValue(trimmed);
        fileType = 'kv';
      }
    } else if (trimmed.includes(',') && trimmed.includes('\n')) {
      parsedData = this.parseCsv(trimmed);
      fileType = 'csv';
    } else {
      parsedData = this.parseKeyValue(trimmed);
      fileType = 'kv';
    }

    const flattened = this.flattenObject(parsedData);
    const fields: Record<string, SourceField> = {};
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    for (const [key, value] of Object.entries(flattened)) {
      const field = this.analyzeField(key, value);
      fields[key] = field;

      if (!field.isValid && field.validationError) {
        errors.push({ field: key, message: field.validationError });
      }
      if (field.validationWarning) {
        warnings.push({ field: key, message: field.validationWarning });
      }
    }

    const totalFields = Object.keys(fields).length;
    const validFields = Object.values(fields).filter((f) => f.isValid).length;

    return {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fileName,
      fileType,
      uploadedAt: new Date().toISOString(),
      rawContent: content,
      fields,
      canonicalData: flattened,
      validationReport: {
        isValid: errors.length === 0,
        totalFields,
        validFields,
        errorCount: errors.length,
        warningCount: warnings.length,
        errors,
        warnings,
      },
    };
  }

  private analyzeField(rawKey: string, value: any): SourceField {
    const key = rawKey;
    const label = this.generateHumanLabel(rawKey);
    let inferredType: SourceField['inferredType'] = 'string';
    let isValid = true;
    let validationError: string | undefined;
    let validationWarning: string | undefined;

    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      return {
        key,
        rawKey,
        value: '',
        inferredType: 'string',
        label,
        isValid: true,
        validationWarning: 'Field is empty or null',
      };
    }

    if (typeof value === 'boolean') {
      inferredType = 'boolean';
    } else if (typeof value === 'number') {
      inferredType = 'number';
    } else if (Array.isArray(value)) {
      inferredType = 'array';
    } else if (typeof value === 'object') {
      inferredType = 'object';
    } else {
      const strVal = String(value).trim();

      // Email check
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (rawKey.toLowerCase().includes('email') || emailRegex.test(strVal)) {
        inferredType = 'email';
        if (!emailRegex.test(strVal)) {
          isValid = false;
          validationError = `Invalid email format: "${strVal}"`;
        }
      }
      // Phone check
      else if (
        rawKey.toLowerCase().includes('phone') ||
        rawKey.toLowerCase().includes('mobile') ||
        rawKey.toLowerCase().includes('tel') ||
        /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/.test(strVal)
      ) {
        inferredType = 'phone';
        const cleaned = strVal.replace(/[^\d+]/g, '');
        if (cleaned.length < 7) {
          isValid = false;
          validationError = `Phone number "${strVal}" appears too short (< 7 digits)`;
        }
      }
      // Date check
      else if (
        rawKey.toLowerCase().includes('date') ||
        rawKey.toLowerCase().includes('birth') ||
        /^\d{4}-\d{2}-\d{2}$/.test(strVal) ||
        /^\d{2}\/\d{2}\/\d{4}$/.test(strVal)
      ) {
        inferredType = 'date';
        const parsedTimestamp = Date.parse(strVal);
        if (isNaN(parsedTimestamp)) {
          isValid = false;
          validationError = `Invalid date value: "${strVal}"`;
        }
      }
      // URL check
      else if (strVal.startsWith('http://') || strVal.startsWith('https://')) {
        inferredType = 'string';
        try {
          new URL(strVal);
        } catch {
          isValid = false;
          validationError = `Malformed URL: "${strVal}"`;
        }
      }
      // Numerical check
      else if (!isNaN(Number(strVal)) && strVal !== '') {
        inferredType = 'number';
      }
    }

    return {
      key,
      rawKey,
      value,
      inferredType,
      label,
      isValid,
      validationError,
      validationWarning,
    };
  }

  private generateHumanLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/\./g, ' › ')
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  }

  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};
    if (obj === null || typeof obj !== 'object') {
      return result;
    }

    for (const key of Object.keys(obj)) {
      const propName = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        Object.keys(value).length > 0
      ) {
        Object.assign(result, this.flattenObject(value, propName));
      } else {
        result[propName] = value;
      }
    }
    return result;
  }

  private parseCsv(csvText: string): Record<string, any> {
    const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return {};

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let inQuotes = false;
      let current = '';
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    const headers = parseLine(lines[0]);
    if (lines.length === 1) {
      const single: Record<string, any> = {};
      headers.forEach((h) => (single[h] = ''));
      return single;
    }

    const firstDataRow = parseLine(lines[1]);
    const obj: Record<string, any> = {};
    headers.forEach((header, idx) => {
      obj[header] = firstDataRow[idx] !== undefined ? firstDataRow[idx] : '';
    });
    return obj;
  }

  private parseKeyValue(text: string): Record<string, any> {
    const lines = text.trim().split(/\r?\n/);
    const result: Record<string, any> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

      const colonIdx = trimmed.indexOf(':');
      const equalIdx = trimmed.indexOf('=');

      let delimiterIdx = -1;
      if (colonIdx >= 0 && equalIdx >= 0) {
        delimiterIdx = Math.min(colonIdx, equalIdx);
      } else {
        delimiterIdx = Math.max(colonIdx, equalIdx);
      }

      if (delimiterIdx > 0) {
        const key = trimmed.substring(0, delimiterIdx).trim();
        let val = trimmed.substring(delimiterIdx + 1).trim();
        val = val.replace(/^["']|["']$/g, '');
        result[key] = val;
      }
    }
    return result;
  }
}

export const fileParserAgent = new FileParserAgent();
