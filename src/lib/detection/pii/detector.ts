/**
 * PII / Sensitive Data Detector
 *
 * Scans source file content for Personal Identifiable Information (PII)
 * patterns that indicate hardcoded sensitive data — credit cards, SSNs,
 * phone numbers, emails, etc.
 *
 * This helps teams achieve GDPR, HIPAA, and PCI-DSS compliance by
 * catching accidental PII exposure in code, tests, and config files.
 */
import type { PiiCategory, PiiFinding, PiiResult, PiiSeverity } from './types';

interface PiiRule {
  id: string;
  category: PiiCategory;
  severity: PiiSeverity;
  title: string;
  description: string;
  remediation: string;
  pattern: RegExp;
  /** Return true to suppress this match (false positive filter) */
  validate?: (line: string, match: string) => boolean;
  /** Skip binary-like files (e.g. generated files) */
  skipBinary?: boolean;
}

// ─── Validators ──────────────────────────────────────────────────────────────

/** Reject obviously fake/test credit card numbers */
function isRealCreditCard(match: string): boolean {
  const digits = match.replace(/\D/g, '');
  // Reject all-same-digit test numbers (e.g. 4111111111111111 is a test Visa)
  if (/^(\d)\1+$/.test(digits)) return false;
  if (['4111111111111111', '5500005555555559', '340000000000009'].includes(digits)) return false;
  // Luhn algorithm
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

/** Reject placeholder SSNs like 000-00-0000, 123-45-6789 */
function isRealSsn(match: string): boolean {
  const digits = match.replace(/\D/g, '');
  const area = parseInt(digits.slice(0, 3), 10);
  // Invalid area codes
  if (area === 0 || area === 666 || area >= 900) return false;
  if (digits.slice(3, 5) === '00') return false;
  if (digits.slice(5) === '0000') return false;
  if (digits === '123456789') return false;
  return true;
}

/** Reject obviously fake emails (test, example, placeholder) */
function isRealEmail(match: string): boolean {
  const lower = match.toLowerCase();
  if (/(?:test|example|foo|bar|user|admin|noreply|placeholder)@/i.test(lower)) return false;
  if (/@(?:example|test|localhost|domain|yourdomain)\./i.test(lower)) return false;
  return true;
}

/** Skip lines that are comments, imports, or variable names */
function isDataLine(line: string): boolean {
  const trimmed = line.trimStart();
  // Skip pure comment lines
  if (/^(?:\/\/|\/\*|\*|#|<!--|--)\s*/.test(trimmed)) return false;
  // Skip import / require statements
  if (/^(?:import|from|require)\s/.test(trimmed)) return false;
  return true;
}

// ─── PII Rules ────────────────────────────────────────────────────────────────

const PII_RULES: PiiRule[] = [
  // ── Credit Cards ───────────────────────────────────────────────────────────
  {
    id: 'PII-001',
    category: 'credit-card',
    severity: 'critical',
    title: 'Credit Card Number in Code',
    description:
      'A credit card number pattern was detected in source code. Storing or logging card numbers violates PCI-DSS and creates massive breach risk.',
    remediation:
      'Remove the card number. Use a PCI-compliant payment vault (Stripe, Braintree) and never store raw PANs.',
    // Visa (4), Mastercard (5), Amex (3), Discover (6) with optional separators
    pattern: /\b(?:4[0-9]{3}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}|5[1-5][0-9]{2}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}|3[47][0-9]{2}[-\s]?[0-9]{6}[-\s]?[0-9]{5}|6(?:011|5[0-9]{2})[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4})\b/,
    validate: (line, match) => isDataLine(line) && isRealCreditCard(match),
  },
  // ── US Social Security Numbers ─────────────────────────────────────────────
  {
    id: 'PII-002',
    category: 'ssn',
    severity: 'critical',
    title: 'US Social Security Number (SSN)',
    description:
      'A pattern matching a US SSN was detected. SSNs in code or test fixtures violate GDPR, HIPAA, and US federal privacy laws.',
    remediation:
      'Remove the SSN. Use anonymized IDs in tests. Never store raw SSNs — use tokenized or encrypted representations.',
    pattern: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/,
    validate: (line, match) => isDataLine(line) && isRealSsn(match),
  },
  // ── IBAN (Bank Account Numbers) ─────────────────────────────────────────────
  {
    id: 'PII-003',
    category: 'iban',
    severity: 'critical',
    title: 'IBAN Bank Account Number',
    description:
      'International Bank Account Number (IBAN) detected in source code. Exposing IBANs risks financial fraud and violates PCI-DSS.',
    remediation:
      'Remove the IBAN from source code. Use masked or tokenized values in tests, and encrypted storage in production.',
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}(?:[A-Z0-9]?){0,16}\b/,
    validate: (line) => isDataLine(line),
  },
  // ── Email Addresses ────────────────────────────────────────────────────────
  {
    id: 'PII-004',
    category: 'email',
    severity: 'high',
    title: 'Real Email Address Hardcoded',
    description:
      'A real-looking email address is hardcoded in source code. This may expose user data or be used in logs, creating GDPR/CCPA issues.',
    remediation:
      'Use anonymous placeholder emails in tests (e.g. user@example.com). Remove real email addresses from code and config files.',
    pattern: /\b[A-Za-z0-9._%+'-]{2,}@(?!example\.|test\.|localhost)[A-Za-z0-9.-]{2,}\.[A-Za-z]{2,}\b/,
    validate: (line, match) => isDataLine(line) && isRealEmail(match),
  },
  // ── US Phone Numbers ───────────────────────────────────────────────────────
  {
    id: 'PII-005',
    category: 'phone',
    severity: 'high',
    title: 'US Phone Number Hardcoded',
    description:
      'A US phone number pattern was detected. Hardcoded phone numbers in code or test fixtures may expose real user data.',
    remediation:
      'Use reserved test numbers (e.g. 555-0100 to 555-0199) in tests. Remove real phone numbers from source code.',
    pattern: /\b(?:\+1[-.\s]?)?\(?([2-9][0-8][0-9])\)?[-.\s]?([2-9][0-9]{2})[-.\s]?([0-9]{4})\b/,
    validate: (line, match) => {
      if (!isDataLine(line)) return false;
      // Exclude 555-xxxx numbers (US test numbers)
      if (/(?:\(?)555/.test(match)) return false;
      // Exclude port numbers and other numeric patterns
      if (/:\d{10}/.test(line)) return false;
      return true;
    },
  },
  // ── Healthcare IDs ─────────────────────────────────────────────────────────
  {
    id: 'PII-006',
    category: 'health-id',
    severity: 'high',
    title: 'Healthcare Identifier (NPI / MBI)',
    description:
      'A US National Provider Identifier (NPI) or Medicare Beneficiary Identifier (MBI) pattern detected. These are protected under HIPAA.',
    remediation:
      'Remove health identifiers from source code. Use anonymized IDs in tests and encrypted storage in production.',
    // NPI is 10 digits; MBI is 11 chars with specific format
    pattern: /\b(?:NPI|npi)\s*[:=]\s*['"]?\d{10}['"]?\b/,
    validate: (line) => isDataLine(line),
  },
  // ── Passport Numbers ────────────────────────────────────────────────────────
  {
    id: 'PII-007',
    category: 'passport',
    severity: 'high',
    title: 'Passport Number Pattern',
    description:
      'A pattern matching a passport number was detected. Passport numbers are sensitive government identifiers protected under GDPR.',
    remediation:
      'Remove passport numbers from source code. Use anonymized identifiers in tests and encrypted vault storage.',
    pattern: /\b(?:passport|passport_no|passport_number)\s*[:=]\s*['"][A-Z]{1,2}\d{6,9}['"]?\b/i,
    validate: (line) => isDataLine(line),
  },
  // ── Date of Birth ──────────────────────────────────────────────────────────
  {
    id: 'PII-008',
    category: 'date-of-birth',
    severity: 'medium',
    title: 'Date of Birth Hardcoded',
    description:
      'A date of birth pattern linked to a variable name was detected. DOBs are sensitive personal data under GDPR and HIPAA.',
    remediation:
      'Do not hardcode dates of birth. Use anonymized or synthetic dates in tests.',
    pattern: /\b(?:dob|date_of_birth|dateofbirth|birth_date|birthdate)\s*[:=]\s*['"]?\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}['"]?\b/i,
    validate: (line) => isDataLine(line),
  },
  // ── IP Addresses ──────────────────────────────────────────────────────────
  {
    id: 'PII-009',
    category: 'ip-address',
    severity: 'medium',
    title: 'Hardcoded IP Address',
    description:
      'A non-private IP address was detected in source code. Hardcoded IPs can expose internal infrastructure and are a security risk.',
    remediation:
      'Move IP addresses to environment variables or configuration files. Use DNS names instead of IP addresses where possible.',
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/,
    validate: (line, match) => {
      if (!isDataLine(line)) return false;
      // Exclude private/local/loopback IPs — only flag public IPs
      if (/^(?:127\.|10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.)/.test(match)) return false;
      // Exclude broadcast/subnet masks
      if (match === '255.255.255.255' || match === '255.255.255.0') return false;
      // Exclude version-like patterns (e.g. "version: 1.2.3.4")
      const before = line.substring(0, line.indexOf(match));
      if (/(?:version|ver|v)\s*[:=]?\s*$/i.test(before)) return false;
      return true;
    },
  },
];

// ─── Detector ─────────────────────────────────────────────────────────────────

/**
 * Scan file content for PII patterns.
 * @param content - Raw source file content
 * @param filePath - File path (for reporting; not used in matching)
 * @param language - Language hint (not required)
 */
export function detectPii(
  content: string,
  filePath: string,
  _language?: string,
): PiiResult {
  const findings: PiiFinding[] = [];
  const categoriesFound = new Set<PiiCategory>();
  const lines = content.split('\n');

  for (const rule of PII_RULES) {
    // Track: only first match per rule per file to avoid noise
    let foundForRule = false;

    for (let i = 0; i < lines.length; i++) {
      if (foundForRule) break;
      const line = lines[i];
      const match = line.match(rule.pattern);
      if (!match) continue;

      const matchedText = match[0];

      // Run optional validator
      if (rule.validate && !rule.validate(line, matchedText)) continue;

      // Redact the match for storage — never store actual PII
      // Show first 4 alphanumeric chars, mask the rest
      let alphaCount = 0;
      const redacted = matchedText.replace(/[A-Za-z0-9]/g, (c) => {
        alphaCount++;
        return alphaCount <= 4 ? c : '*';
      });

      findings.push({
        category: rule.category,
        severity: rule.severity,
        title: rule.title,
        description: rule.description,
        remediation: rule.remediation,
        file_path: filePath,
        line: i + 1,
        sample: redacted,
      });

      categoriesFound.add(rule.category);
      foundForRule = true;
    }
  }

  return {
    total_findings: findings.length,
    critical_count: findings.filter((f) => f.severity === 'critical').length,
    high_count: findings.filter((f) => f.severity === 'high').length,
    medium_count: findings.filter((f) => f.severity === 'medium').length,
    findings,
    categories_detected: Array.from(categoriesFound),
  };
}
