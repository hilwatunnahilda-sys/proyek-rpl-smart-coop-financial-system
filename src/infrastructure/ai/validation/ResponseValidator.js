/**
 * Response Validator & Anti-Hallucination Guardrail
 * Smart Co-op Financial System - STMIK IKMI Cirebon
 * 
 * Responsibilities:
 * 1. Cross-check numeric facts and metrics against actual dataContext.
 * 2. Detect intent drift / irrelevant boilerplate (e.g., explaining features when asked for counts).
 * 3. Enforce ZERO RAW JSON or schema leakage.
 * 4. Seamlessly substitute hallucinated responses with deterministic, factual answers from IntelligentAnswerFormatter.
 */
import { IntelligentAnswerFormatter } from '../nlu/IntelligentAnswerFormatter.js';

export class ResponseValidator {
  /**
   * Validate model generated response against ground-truth dataContext and expected intent.
   * @param {string} text - Generated response
   * @param {string} intent - Detected intent
   * @param {object} dataContext - Factual database results
   * @param {object} [userContext] - User role, session, member info
   * @returns {{ isValid: boolean, text: string, reason?: string, substituted: boolean }}
   */
  static validateAndSanitize(text, intent, dataContext, userContext = {}) {
    // 1. If text is empty or missing, fallback to formatted answer
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        isValid: false,
        text: IntelligentAnswerFormatter.formatAnswer(intent, dataContext, userContext),
        reason: 'Empty model output',
        substituted: true
      };
    }

    let sanitized = text.trim();

    // 2. Reject Raw JSON leaks
    if (sanitized.startsWith('{') && sanitized.endsWith('}')) {
      try {
        JSON.parse(sanitized);
        return {
          isValid: false,
          text: IntelligentAnswerFormatter.formatAnswer(intent, dataContext, userContext),
          reason: 'Raw JSON leakage detected',
          substituted: true
        };
      } catch (e) {
        // Not pure JSON, proceed
      }
    }

    // 3. Check for specific Intent Mismatch / Evasion
    const isDataIntent = [
      'MEMBER_TOTAL', 'MEMBER_ACTIVE', 'MEMBER_INACTIVE', 'MEMBER_LIST',
      'REGISTRATION_THIS_MONTH', 'REGISTRATION_LAST_MONTH', 'REGISTRATION_TODAY',
      'REGISTRATION_COMPARE', 'EXPLAIN_DIFFERENCE',
      'SAVINGS_TOTAL', 'SAVINGS_POKOK', 'SAVINGS_WAJIB', 'SAVINGS_SUKARELA', 'SAVINGS_TOP_SAVER', 'SAVINGS_DETAIL',
      'LOAN_ACTIVE', 'LOAN_OUTSTANDING', 'LOAN_UNPAID', 'LOAN_PENDING', 'LOAN_LIST',
      'INSTALLMENT_OVERDUE', 'INSTALLMENT_UNPAID_MEMBERS',
      'FINANCIAL_CASH_BOOK', 'FINANCIAL_INCOME', 'FINANCIAL_EXPENSE', 'FINANCIAL_TREND',
      'COOP_SUMMARY'
    ].includes(intent);

    if (isDataIntent && dataContext) {
      // If user was unauthorized, verify that the response clearly states access denied
      if (dataContext.authorized === false) {
        const lower = sanitized.toLowerCase();
        const hasDenialSignal =
          lower.includes('akses ditolak') ||
          lower.includes('wewenang') ||
          lower.includes('hak akses') ||
          lower.includes('tidak memiliki akses') ||
          lower.includes('least privilege') ||
          lower.includes('hanya dapat') ||
          lower.includes('hanya memiliki');

        if (!hasDenialSignal) {
          return {
            isValid: false,
            text: IntelligentAnswerFormatter.formatAnswer(intent, dataContext, userContext),
            reason: 'Failed to communicate RBAC restriction',
            substituted: true
          };
        }
      } else {
        // Verify that the answer does not deviate to application overview boilerplate
        const lower = sanitized.toLowerCase();
        const containsAppOverviewBoilerplate = 
          lower.includes('smart co-op financial system adalah') ||
          lower.includes('memiliki 9 modul utama') ||
          (lower.includes('sistem ini dirancang untuk') && !lower.includes('total') && !lower.includes('jumlah'));

        if (containsAppOverviewBoilerplate) {
          return {
            isValid: false,
            text: IntelligentAnswerFormatter.formatAnswer(intent, dataContext, userContext),
            reason: 'App overview boilerplate on data query',
            substituted: true
          };
        }

        // Check key numeric facts
        const facts = this.extractNumericFacts(dataContext, intent);
        if (facts.primaryCount !== undefined && facts.primaryCount !== null) {
          const countStr = String(facts.primaryCount);
          const countRegex = new RegExp(`\\b${countStr}\\b`);
          if (!countRegex.test(sanitized)) {
            return {
              isValid: false,
              text: IntelligentAnswerFormatter.formatAnswer(intent, dataContext, userContext),
              reason: `Primary metric mismatch: expected ${facts.primaryCount}`,
              substituted: true
            };
          }
        }
      }
    }

    return {
      isValid: true,
      text: sanitized,
      substituted: false
    };
  }

  /**
   * Helper: extract primary numeric ground truth facts
   */
  static extractNumericFacts(dataContext, intent) {
    if (!dataContext) return {};
    const facts = {};

    if (intent === 'MEMBER_TOTAL' && dataContext.summary) {
      facts.primaryCount = dataContext.summary.totalTerdaftar;
    } else if (intent === 'MEMBER_ACTIVE' && dataContext.summary) {
      facts.primaryCount = dataContext.summary.totalAktif;
    } else if (intent === 'MEMBER_INACTIVE' && dataContext.summary) {
      facts.primaryCount = dataContext.summary.totalNonaktif;
    } else if (intent === 'REGISTRATION_THIS_MONTH') {
      facts.primaryCount = dataContext.bulanIni;
    } else if (intent === 'REGISTRATION_LAST_MONTH') {
      facts.primaryCount = dataContext.bulanLalu;
    } else if (intent === 'REGISTRATION_TODAY') {
      facts.primaryCount = dataContext.hariIni;
    } else if (intent === 'LOAN_ACTIVE' && dataContext.summary) {
      facts.primaryCount = dataContext.summary.totalPinjamanAktif;
    } else if (intent === 'LOAN_PENDING' && dataContext.summary) {
      facts.primaryCount = dataContext.summary.menungguPersetujuan;
    }

    return facts;
  }
}

