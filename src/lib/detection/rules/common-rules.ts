/**
 * Language-agnostic vulnerability rules — apply to all languages.
 * Secrets, credentials, universal patterns.
 */
import type { VulnerabilityRule, RuleMatchContext } from '../vulnerability-detector';

/**
 * Suppress hardcoded-password findings when the value looks like a
 * placeholder, example, or environment-variable reference.
 */
function validateHardcodedPassword(ctx: RuleMatchContext): boolean {
  const line = ctx.lines[ctx.lineIndex];
  // Common placeholder / example values
  if (/['"](?:test|example|demo|placeholder|changeme|change_me|dummy|TODO|xxx|your[_-]|REPLACE|<)/i.test(line)) {
    return false;
  }
  // Environment variable pattern: password = process.env.X or os.environ[X]
  if (/[:=]\s*(?:process\.env|os\.environ|System\.getenv|ENV\[)/i.test(line)) {
    return false;
  }
  return true;
}

/**
 * Suppress hardcoded-API-key findings for test/demo/public keys.
 */
function validateHardcodedApiKey(ctx: RuleMatchContext): boolean {
  const line = ctx.lines[ctx.lineIndex];
  if (/['"](?:test|example|demo|placeholder|public|dummy|TODO|xxx|your[_-]|REPLACE|<)/i.test(line)) {
    return false;
  }
  if (/[:=]\s*(?:process\.env|os\.environ|System\.getenv|ENV\[)/i.test(line)) {
    return false;
  }
  return true;
}

export const COMMON_RULES: VulnerabilityRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL — Hardcoded secrets & credentials
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-001', severity: 'critical', category: 'hardcoded-secret',
    title: 'Hardcoded AWS Access Key',
    description: 'AWS access key IDs should never be committed to source code. Use environment variables or a secrets manager.',
    pattern: /AKIA[0-9A-Z]{16}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-002', severity: 'critical', category: 'hardcoded-secret',
    title: 'Hardcoded Password',
    description: 'Passwords in source code can be extracted by anyone with repo access. Use environment variables or a vault.',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/i, languages: '*', cwe: 'CWE-798', truncateMatch: true,
    skipTestFiles: true, validate: validateHardcodedPassword,
  },
  {
    id: 'VULN-003', severity: 'critical', category: 'hardcoded-secret',
    title: 'Hardcoded API Key or Token',
    description: 'API keys and tokens should be stored in environment variables, not in code.',
    pattern: /(?:api[_-]?key|apikey|secret[_-]?key|auth[_-]?token|access[_-]?token)\s*[:=]\s*['"][^'"]{8,}['"]/i,
    languages: '*', cwe: 'CWE-798', truncateMatch: true,
    skipTestFiles: true, validate: validateHardcodedApiKey,
  },
  {
    id: 'VULN-004', severity: 'critical', category: 'hardcoded-secret',
    title: 'Hardcoded GitHub Token',
    description: 'GitHub personal access tokens or app tokens should never be committed. Rotate this token immediately.',
    pattern: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-007', severity: 'critical', category: 'hardcoded-secret',
    title: 'Private Key in Source Code',
    description: 'Private keys must never be stored in source code. Move to a secrets manager and rotate immediately.',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-008', severity: 'critical', category: 'hardcoded-secret',
    title: 'Hardcoded Stripe Secret Key',
    description: 'Stripe secret keys (sk_live_) in source code can be used to make charges, issue refunds, and access customer data.',
    pattern: /sk_live_[A-Za-z0-9]{20,}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-009', severity: 'critical', category: 'hardcoded-secret',
    title: 'Database Connection String with Credentials',
    description: 'Database URLs with embedded usernames and passwords should use environment variables.',
    pattern: /(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|mssql|redis):\/\/[^:]+:[^@]+@[^\s'"]+/i,
    languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-050', severity: 'critical', category: 'hardcoded-secret',
    title: 'Slack or Discord Webhook URL',
    description: 'Webhook URLs allow anyone to post messages to your channels. Store in environment variables.',
    pattern: /https:\/\/(?:hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+|discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+)/,
    languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-051', severity: 'critical', category: 'hardcoded-secret',
    title: 'Google / GCP API Key',
    description: 'Google API keys starting with AIza should be stored in environment variables.',
    pattern: /AIza[0-9A-Za-z_-]{35}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },

  // New universal secret rules
  {
    id: 'VULN-100', severity: 'critical', category: 'hardcoded-secret',
    title: 'Hardcoded SendGrid API Key',
    description: 'SendGrid API keys (SG.) in source code allow sending emails on your behalf. Use environment variables.',
    pattern: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-101', severity: 'critical', category: 'hardcoded-secret',
    title: 'Hardcoded Twilio Credentials',
    description: 'Twilio Account SID or Auth Token in source code allows making calls and sending SMS. Use environment variables.',
    pattern: /(?:AC[a-f0-9]{32}|SK[a-f0-9]{32})/i, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-102', severity: 'critical', category: 'hardcoded-secret',
    title: 'Hardcoded Azure Connection String',
    description: 'Azure connection strings contain access keys. Store in environment variables or Azure Key Vault.',
    pattern: /DefaultEndpointsProtocol=https?;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]+/,
    languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-103', severity: 'critical', category: 'hardcoded-secret',
    title: 'Hardcoded JWT Token',
    description: 'JWT tokens in source code may contain sensitive claims and signatures. Generate tokens at runtime.',
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-104', severity: 'critical', category: 'hardcoded-secret',
    title: 'Hardcoded Mailgun API Key',
    description: 'Mailgun API keys allow sending emails and managing domains. Use environment variables.',
    pattern: /key-[A-Za-z0-9]{32}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  // ─── Expanded secret patterns ───────────────────────────────────────────
  {
    id: 'VULN-105', severity: 'critical', category: 'hardcoded-secret',
    title: 'Slack Bot / User OAuth Token',
    description: 'Slack OAuth tokens (xoxb-, xoxp-, xoxa-) grant access to workspaces and channels. Rotate immediately.',
    pattern: /xox[bpas]-[0-9A-Za-z]{10,}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-106', severity: 'critical', category: 'hardcoded-secret',
    title: 'NPM Publish Token',
    description: 'npm automation/publish tokens (npm_) grant registry publish rights. Store in CI secrets.',
    pattern: /npm_[A-Za-z0-9]{36}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-107', severity: 'critical', category: 'hardcoded-secret',
    title: 'GitLab Personal Access Token',
    description: 'GitLab PATs (glpat-) provide broad API access. Use environment variables or CI/CD variables.',
    pattern: /glpat-[A-Za-z0-9_-]{20}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-108', severity: 'critical', category: 'hardcoded-secret',
    title: 'Shopify Access Token',
    description: 'Shopify private app tokens (shpat_, shpss_) provide store access. Store in environment variables.',
    pattern: /shp(?:at|ss|ca|pa)_[A-Za-z0-9]{32}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-109', severity: 'critical', category: 'hardcoded-secret',
    title: 'Cloudflare API Token or Key',
    description: 'Cloudflare API tokens grant DNS, firewall, and CDN management access. Use environment variables.',
    pattern: /(?:CF_API_TOKEN|CLOUDFLARE_API_TOKEN)\s*[:=]\s*['"][A-Za-z0-9_-]{40,}['"]/, languages: '*', cwe: 'CWE-798', truncateMatch: true, skipTestFiles: true, validate: validateHardcodedApiKey,
  },
  {
    id: 'VULN-110', severity: 'critical', category: 'hardcoded-secret',
    title: 'DigitalOcean Personal Access Token',
    description: 'DigitalOcean PATs grant full account access. Store in environment variables or secrets manager.',
    pattern: /dop_v1_[A-Za-z0-9]{64}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-111', severity: 'critical', category: 'hardcoded-secret',
    title: 'Heroku API Key',
    description: 'Heroku API keys allow deploying apps and accessing account resources. Use environment variables.',
    pattern: /(?:HEROKU_API_KEY)\s*[:=]\s*['"][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}['"]/, languages: '*', cwe: 'CWE-798', truncateMatch: true, skipTestFiles: true, validate: validateHardcodedApiKey,
  },
  {
    id: 'VULN-112', severity: 'critical', category: 'hardcoded-secret',
    title: 'Terraform Cloud Token',
    description: 'Terraform Cloud API tokens (atfc.) enable infrastructure provisioning. Store in CI/CD secrets.',
    pattern: /atfc\.[A-Za-z0-9]{14}\.atlasv1\.[A-Za-z0-9]{62}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-113', severity: 'critical', category: 'hardcoded-secret',
    title: 'AWS Temporary Session Token',
    description: 'AWS session tokens (FQoGZXIvYXdz prefix) are short-lived but must not appear in source code.',
    pattern: /FQoGZXIvYXdz[A-Za-z0-9+/=]{40,}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-114', severity: 'critical', category: 'hardcoded-secret',
    title: 'Discord Bot Token',
    description: 'Discord bot tokens allow full bot account control. Regenerate immediately if exposed.',
    pattern: /[MN][A-Za-z0-9]{23}\.[\w-]{6}\.[\w-]{27}/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-115', severity: 'critical', category: 'hardcoded-secret',
    title: 'Vercel API Token',
    description: 'Vercel tokens allow deploying projects and accessing team resources. Store in CI secrets.',
    pattern: /(?:VERCEL_TOKEN|vercel_token)\s*[:=]\s*['"][A-Za-z0-9]{24}['"]/, languages: '*', cwe: 'CWE-798', truncateMatch: true, skipTestFiles: true, validate: validateHardcodedApiKey,
  },
  {
    id: 'VULN-116', severity: 'high', category: 'hardcoded-secret',
    title: 'Hardcoded Private Key Block (PEM)',
    description: 'PEM private key blocks in code will be committed to version history. Move to a secrets manager.',
    pattern: /-----BEGIN (?:ENCRYPTED |OPENSSH |RSA |EC |DSA |PKCS8 )?PRIVATE KEY-----/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },
  {
    id: 'VULN-117', severity: 'high', category: 'hardcoded-secret',
    title: 'GCP Service Account JSON Key Detected',
    description: 'GCP service account JSON with private_key_id and private_key fields provides persistent GCP access.',
    pattern: /"private_key_id"\s*:\s*"[A-Za-z0-9]{40}"/, languages: '*', cwe: 'CWE-798', truncateMatch: true,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIUM — Universal patterns
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-028', severity: 'medium', category: 'weak-crypto',
    title: 'Insecure Cipher Mode (ECB)',
    description: 'ECB mode encrypts identical plaintext blocks to identical ciphertext, leaking patterns. Use CBC or GCM instead.',
    pattern: /(?:createCipher|createCipheriv|AES)\s*\(?\s*['"].*ECB/i,
    languages: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go'], cwe: 'CWE-327',
  },
  {
    id: 'VULN-060', severity: 'medium', category: 'xxe',
    title: 'XML External Entity (XXE) Risk',
    description: 'XML parsers with external entity processing enabled can read local files. Disable DTD/external entities.',
    pattern: /(?:parseString|parseXml|DOMParser|xml2js|DocumentBuilderFactory|SAXParser|XMLReader)\s*\(.*(?:<!DOCTYPE|<!ENTITY|SYSTEM)/i,
    languages: '*', cwe: 'CWE-611',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOW — Universal best practices
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'VULN-030', severity: 'low', category: 'todo-security',
    title: 'Security TODO/FIXME Comment',
    description: 'A security-related task has been deferred. Ensure it is tracked and addressed.',
    pattern: /(?:TODO|FIXME|HACK|XXX).*(?:security|auth|vuln|exploit|injection|xss|csrf)/i,
    languages: '*', commentOnly: true,
  },
  {
    id: 'VULN-035', severity: 'low', category: 'production-readiness',
    title: 'Hardcoded Localhost URL',
    description: 'Hardcoded localhost/127.0.0.1 URLs will fail in production. Use environment variables.',
    pattern: /['"`]https?:\/\/(?:localhost|127\.0\.0\.1):\d+/, languages: '*',
  },
  {
    id: 'VULN-036', severity: 'low', category: 'weak-crypto',
    title: 'Hardcoded Encryption Key / IV',
    description: 'Hardcoded encryption keys and IVs are easily extracted. Use a key management service.',
    pattern: /(?:encryption[_-]?key|secret[_-]?key|iv|initialization[_-]?vector)\s*[:=]\s*['"][A-Fa-f0-9]{16,}['"]/i,
    languages: '*', cwe: 'CWE-321', truncateMatch: true,
  },
  {
    id: 'VULN-105', severity: 'low', category: 'production-readiness',
    title: 'Hardcoded IP Address',
    description: 'Hardcoded IP addresses make deployments environment-specific. Use configuration or DNS names.',
    pattern: /['"`]\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?['"` ]/,
    languages: '*',
  },
];
