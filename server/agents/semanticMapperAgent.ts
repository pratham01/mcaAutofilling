import { SourceDocument, FormField, FieldMapping } from '../../shared/types.js';
import { memoryStore } from '../services/memoryStore.js';

export class SemanticMapperAgent {
  public generateMappings(
    sourceDoc: SourceDocument,
    formFields: FormField[],
    targetUrl: string
  ): FieldMapping[] {
    const domain = this.extractDomain(targetUrl);
    const mappings: FieldMapping[] = [];
    const usedSourceKeys = new Set<string>();

    for (const formField of formFields) {
      let bestMatch: {
        sourceKey: string;
        sourceLabel: string;
        sourceValue: any;
        confidence: number;
        reason: string;
      } | null = null;

      // 1. Check persistent memory rules for this domain
      for (const [sKey, sField] of Object.entries(sourceDoc.fields)) {
        const memoryRule = memoryStore.getRule(domain, sKey);
        if (
          memoryRule &&
          (memoryRule.targetSelector === formField.selector ||
            memoryRule.targetName?.toLowerCase() === formField.name?.toLowerCase() ||
            memoryRule.targetSelector === `#${formField.id}`)
        ) {
          bestMatch = {
            sourceKey: sKey,
            sourceLabel: sField.label,
            sourceValue: sField.value,
            confidence: Math.min(1.0, memoryRule.confidence),
            reason: `Learned Mapping Rule (reused ${memoryRule.frequency}x)`,
          };
          break;
        }
      }

      // 2. If no memory rule match, compute semantic similarity scores
      if (!bestMatch) {
        let highestScore = 0;
        let candidateKey = '';
        let matchExplanation = '';

        for (const [sKey, sField] of Object.entries(sourceDoc.fields)) {
          if (usedSourceKeys.has(sKey)) {
            // Deprioritize already mapped keys unless exact match
          }

          const { score, reason } = this.calculateSimilarity(sKey, sField, formField);
          if (score > highestScore && score >= 0.4) {
            highestScore = score;
            candidateKey = sKey;
            matchExplanation = reason;
          }
        }

        if (candidateKey && highestScore >= 0.4) {
          const sField = sourceDoc.fields[candidateKey];
          bestMatch = {
            sourceKey: candidateKey,
            sourceLabel: sField.label,
            sourceValue: sField.value,
            confidence: Number(highestScore.toFixed(2)),
            reason: matchExplanation,
          };
        }
      }

      if (bestMatch) {
        usedSourceKeys.add(bestMatch.sourceKey);
        mappings.push({
          sourceKey: bestMatch.sourceKey,
          sourceLabel: bestMatch.sourceLabel,
          sourceValue: bestMatch.sourceValue,
          targetSelector: formField.selector,
          targetFieldName: formField.label || formField.name || formField.selector,
          targetType: formField.type,
          confidence: bestMatch.confidence,
          matchReason: bestMatch.reason,
          isManualOverride: false,
          isConfirmed: bestMatch.confidence >= 0.85,
          optionsAvailable: formField.options,
        });
      } else {
        // Unmapped field
        mappings.push({
          sourceKey: '',
          sourceLabel: 'Unmapped',
          sourceValue: '',
          targetSelector: formField.selector,
          targetFieldName: formField.label || formField.name || formField.selector,
          targetType: formField.type,
          confidence: 0.0,
          matchReason: 'No matching attribute identified with sufficient confidence',
          isManualOverride: false,
          isConfirmed: false,
          optionsAvailable: formField.options,
        });
      }
    }

    return mappings;
  }

  private calculateSimilarity(
    sourceKey: string,
    sourceField: any,
    targetField: FormField
  ): { score: number; reason: string } {
    const sKeyNorm = this.normalizeString(sourceKey);
    const sLabelNorm = this.normalizeString(sourceField.label || '');
    const tIdNorm = this.normalizeString(targetField.id || '');
    const tNameNorm = this.normalizeString(targetField.name || '');
    const tLabelNorm = this.normalizeString(targetField.label || '');
    const tPlaceholderNorm = this.normalizeString(targetField.placeholder || '');
    const tAriaNorm = this.normalizeString(targetField.ariaLabel || '');

    // Exact name / id match
    if (sKeyNorm === tIdNorm || sKeyNorm === tNameNorm) {
      return { score: 0.98, reason: `Exact identifier match (${sourceKey} ↔ ${targetField.id || targetField.name})` };
    }

    // Exact label match
    if (sLabelNorm && (sLabelNorm === tLabelNorm || sLabelNorm === tIdNorm || sLabelNorm === tNameNorm)) {
      return { score: 0.95, reason: `Direct label alignment (${sourceField.label} ↔ ${targetField.label})` };
    }

    // Synonym dictionary lookup
    const synonymMatch = this.checkSynonyms(sKeyNorm, [tIdNorm, tNameNorm, tLabelNorm, tPlaceholderNorm, tAriaNorm]);
    if (synonymMatch.matched) {
      return { score: synonymMatch.score, reason: synonymMatch.reason };
    }

    // Substring containment
    if (
      (tLabelNorm.includes(sKeyNorm) && sKeyNorm.length > 3) ||
      (sKeyNorm.includes(tIdNorm) && tIdNorm.length > 3) ||
      (sKeyNorm.includes(tNameNorm) && tNameNorm.length > 3)
    ) {
      return { score: 0.82, reason: `Strong substring pattern match` };
    }

    // Type compatibility bonus
    let typeBonus = 0;
    if (
      (sourceField.inferredType === 'email' && targetField.type === 'email') ||
      (sourceField.inferredType === 'phone' && (targetField.type === 'tel' || tIdNorm.includes('phone'))) ||
      (sourceField.inferredType === 'date' && targetField.type === 'date')
    ) {
      typeBonus = 0.3;
    }

    // Fuzzy token overlap
    const sTokens = new Set([...sKeyNorm.split('_'), ...sLabelNorm.split(' ')]);
    const tTokens = new Set([...tLabelNorm.split(' '), ...tNameNorm.split('_'), ...tIdNorm.split('_')]);

    let common = 0;
    for (const token of sTokens) {
      if (token.length > 2 && tTokens.has(token)) common++;
    }

    if (common > 0) {
      const tokenScore = Math.min(0.85, 0.5 + common * 0.15 + typeBonus);
      return { score: tokenScore, reason: `Fuzzy token overlap (${common} matching terms)` };
    }

    if (typeBonus > 0) {
      return { score: 0.45, reason: `Compatible input type (${targetField.type})` };
    }

    return { score: 0.0, reason: 'No significant similarity' };
  }

  private checkSynonyms(source: string, targets: string[]): { matched: boolean; score: number; reason: string } {
    const synonymGroups: Record<string, string[]> = {
      firstname: ['first', 'fname', 'givenname', 'forename'],
      lastname: ['last', 'lname', 'surname', 'familyname'],
      fullname: ['name', 'applicantname', 'fullname', 'contactperson', 'yourname'],
      email: ['emailaddress', 'mail', 'useremail', 'contactemail'],
      phone: ['mobile', 'cell', 'telephone', 'phonenumber', 'contactphone', 'contactnumber'],
      streetaddress: ['address', 'street', 'addressline1', 'addr1', 'location'],
      city: ['town', 'municipality'],
      state: ['province', 'region', 'county'],
      zipcode: ['zip', 'postalcode', 'postcode', 'pincode'],
      country: ['nation', 'countrycode'],
      coverletter: ['coverletter', 'message', 'bio', 'description', 'notes', 'comments', 'additionalinfo'],
      yearsofexperience: ['experience', 'yearsofexp', 'exp', 'workexperience'],
      expectedsalary: ['salary', 'compensation', 'desiredsalary', 'payrate'],
      highesteducation: ['education', 'degree', 'qualification', 'academicdegree'],
      jobrole: ['position', 'role', 'title', 'jobtitle', 'applyingfor'],
      companyname: ['company', 'organization', 'businessname', 'orgname'],
      registrationnumber: ['regnumber', 'regno', 'businessid', 'cin'],
      taxid: ['taxnumber', 'ein', 'vat', 'gstin'],
      industrysector: ['industry', 'sector', 'businessdomain'],
      annualrevenue: ['revenue', 'turnover', 'annualincome'],
      employeecount: ['employees', 'staffcount', 'headcount', 'teamsize'],
    };

    for (const [canonical, aliases] of Object.entries(synonymGroups)) {
      const isSourceMatch = source.includes(canonical) || aliases.some((a) => source.includes(a));
      if (isSourceMatch) {
        for (const target of targets) {
          if (!target) continue;
          if (target.includes(canonical) || aliases.some((a) => target.includes(a))) {
            return {
              matched: true,
              score: 0.92,
              reason: `Semantic synonym match (${source} ↔ ${target})`,
            };
          }
        }
      }
    }

    return { matched: false, score: 0, reason: '' };
  }

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  private extractDomain(url: string): string {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return new URL(url).hostname;
      }
      return url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    } catch {
      return url;
    }
  }
}

export const semanticMapperAgent = new SemanticMapperAgent();
