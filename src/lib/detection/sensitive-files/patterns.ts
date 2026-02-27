import type { SensitiveFileSeverity } from './types';

export interface SensitiveFilePattern {
  /** Regex matched against the full file path */
  pattern: RegExp;
  severity: SensitiveFileSeverity;
  category: string;
  title: string;
  description: string;
  remediation: string;
}

export const SENSITIVE_FILE_PATTERNS: SensitiveFilePattern[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // Environment files — critical (likely contain secrets)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /(?:^|\/)\.env$/i,
    severity: 'critical',
    category: 'env-file',
    title: 'Environment file (.env)',
    description: '.env files typically contain database URLs, API keys, and secrets that should never be committed.',
    remediation: 'Add .env to .gitignore. Store secrets in your deployment platform\'s environment variable settings.',
  },
  {
    pattern: /(?:^|\/)\.env\.[a-z]+$/i,
    severity: 'critical',
    category: 'env-file',
    title: 'Environment file (.env.*)',
    description: 'Environment-specific files (.env.local, .env.production, etc.) often contain real credentials.',
    remediation: 'Add .env.* to .gitignore (keep .env.example with placeholder values for documentation).',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Private keys — critical
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /(?:^|\/)id_rsa(?:\.pub)?$/,
    severity: 'critical',
    category: 'private-key',
    title: 'SSH private key (id_rsa)',
    description: 'SSH private key files allow authentication to remote servers. If committed, attackers gain server access.',
    remediation: 'Remove this file from the repository immediately. Rotate the SSH key pair and add id_rsa to .gitignore.',
  },
  {
    pattern: /(?:^|\/)id_ed25519$/,
    severity: 'critical',
    category: 'private-key',
    title: 'SSH private key (id_ed25519)',
    description: 'Ed25519 SSH private key. If committed, attackers gain server access.',
    remediation: 'Remove from repository, rotate the key pair, and add to .gitignore.',
  },
  {
    pattern: /\.pem$/i,
    severity: 'high',
    category: 'private-key',
    title: 'PEM certificate/key file',
    description: '.pem files may contain private keys or certificates. Private keys must never be committed.',
    remediation: 'Verify this file does not contain a private key. Store certificates securely outside the repository.',
  },
  {
    pattern: /\.key$/i,
    severity: 'critical',
    category: 'private-key',
    title: 'Private key file (.key)',
    description: '.key files typically contain private keys for TLS/SSL or code signing.',
    remediation: 'Remove from repository and store in a secrets manager or secure key vault.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Credential files — critical/high
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /(?:^|\/)credentials\.json$/i,
    severity: 'critical',
    category: 'credentials',
    title: 'Credentials file (credentials.json)',
    description: 'Cloud provider credential files (GCP, AWS) contain service account keys.',
    remediation: 'Use workload identity or environment-based authentication instead of credential files.',
  },
  {
    pattern: /(?:^|\/)secrets\.json$/i,
    severity: 'critical',
    category: 'credentials',
    title: 'Secrets file (secrets.json)',
    description: 'Files named secrets.json typically contain application secrets and API keys.',
    remediation: 'Move secrets to environment variables or a secrets manager (e.g., AWS Secrets Manager, Vault).',
  },
  {
    pattern: /service[_-]?account.*\.json$/i,
    severity: 'critical',
    category: 'credentials',
    title: 'Service account key file',
    description: 'Service account key files grant cloud API access. Leaked keys can be used to access cloud resources.',
    remediation: 'Use workload identity federation instead. Delete the key from GCP console and rotate.',
  },
  {
    pattern: /(?:^|\/)\.aws\/credentials$/,
    severity: 'critical',
    category: 'credentials',
    title: 'AWS credentials file',
    description: 'The AWS credentials file contains access key IDs and secret keys for AWS services.',
    remediation: 'Never commit AWS credentials. Use IAM roles, environment variables, or AWS SSO.',
  },
  {
    pattern: /(?:^|\/)\.npmrc$/,
    severity: 'high',
    category: 'credentials',
    title: 'npm configuration file (.npmrc)',
    description: '.npmrc files may contain authentication tokens for private npm registries.',
    remediation: 'Remove auth tokens from .npmrc. Use environment variables (NPM_TOKEN) for CI/CD authentication.',
  },
  {
    pattern: /(?:^|\/)\.pypirc$/,
    severity: 'high',
    category: 'credentials',
    title: 'PyPI configuration file (.pypirc)',
    description: '.pypirc files may contain authentication credentials for Python package registries.',
    remediation: 'Remove credentials. Use environment variables or keyring for PyPI authentication.',
  },
  {
    pattern: /(?:^|\/)\.htpasswd$/,
    severity: 'high',
    category: 'credentials',
    title: 'Apache password file (.htpasswd)',
    description: '.htpasswd files contain hashed passwords for HTTP basic authentication.',
    remediation: 'Remove from repository. Generate .htpasswd on the server and add to .gitignore.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Certificate/keystore files — high
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /\.pfx$/i,
    severity: 'high',
    category: 'certificate',
    title: 'PKCS#12 certificate bundle (.pfx)',
    description: '.pfx files contain certificates and private keys bundled together.',
    remediation: 'Store in a secure key vault. Never commit certificate bundles with private keys.',
  },
  {
    pattern: /\.p12$/i,
    severity: 'high',
    category: 'certificate',
    title: 'PKCS#12 certificate bundle (.p12)',
    description: '.p12 files contain certificates and private keys.',
    remediation: 'Store in a secure key vault or secrets manager.',
  },
  {
    pattern: /\.jks$/i,
    severity: 'high',
    category: 'certificate',
    title: 'Java KeyStore file (.jks)',
    description: 'Java KeyStore files may contain private keys and certificates for TLS/SSL.',
    remediation: 'Store in a secure location outside the repository. Use environment variables for keystore paths.',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Config files with potential secrets — medium
  // ═══════════════════════════════════════════════════════════════════════════
  {
    pattern: /(?:^|\/)wp-config\.php$/i,
    severity: 'high',
    category: 'config-secret',
    title: 'WordPress configuration (wp-config.php)',
    description: 'wp-config.php contains database credentials, authentication keys, and salts.',
    remediation: 'Use environment variables for database credentials and auth keys in wp-config.php.',
  },
  {
    pattern: /(?:^|\/)database\.yml$/i,
    severity: 'high',
    category: 'config-secret',
    title: 'Database configuration (database.yml)',
    description: 'Rails database.yml may contain production database credentials.',
    remediation: 'Use environment variables (DATABASE_URL) instead of hardcoded credentials.',
  },
  {
    pattern: /(?:^|\/)appsettings\.(?:Production|Staging|Development)\.json$/i,
    severity: 'medium',
    category: 'config-secret',
    title: '.NET environment-specific configuration',
    description: 'Environment-specific appsettings files may contain connection strings and secrets.',
    remediation: 'Use User Secrets for development, Key Vault for production. Never commit real secrets.',
  },
  {
    pattern: /(?:^|\/)\.docker\/config\.json$/,
    severity: 'high',
    category: 'credentials',
    title: 'Docker registry credentials',
    description: 'Docker config.json may contain authentication tokens for container registries.',
    remediation: 'Use credential helpers for Docker authentication. Never commit registry tokens.',
  },
];
