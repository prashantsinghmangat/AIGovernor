import type { EnhancementRule } from '../types';

/**
 * Security hardening enhancement rules.
 *
 * These rules detect common security anti-patterns, insecure defaults, and
 * missing protective measures, then recommend hardening steps that reduce
 * the attack surface and improve the overall security posture of the codebase.
 *
 * Rules are grouped by impact level: HIGH → MEDIUM → LOW.
 */

// ---------------------------------------------------------------------------
// HIGH IMPACT
// ---------------------------------------------------------------------------

const highImpactRules: EnhancementRule[] = [
  {
    id: 'ENH-040',
    category: 'security-hardening',
    impact: 'high',
    title: 'Express server missing rate limiting',
    description:
      'An Express server that starts listening without rate-limiting middleware is vulnerable to brute-force attacks, credential stuffing, and denial-of-service. Without rate limiting, a single client can exhaust server resources by sending an unbounded number of requests.',
    recommendation:
      'Install express-rate-limit and apply it as early middleware (e.g., app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }))). For production, back the store with Redis via rate-limit-redis for multi-instance consistency.',
    link: 'https://www.npmjs.com/package/express-rate-limit',
    pattern: /app\.listen\s*\(/,
    languages: ['javascript', 'typescript'],
  },
  {
    id: 'ENH-041',
    category: 'security-hardening',
    impact: 'high',
    title: 'Non-localhost HTTP URL should use HTTPS',
    description:
      'Plain HTTP connections transmit data in cleartext, exposing sensitive information such as tokens, cookies, and user data to man-in-the-middle attacks. Any URL pointing to a non-localhost host should use HTTPS to guarantee encryption in transit.',
    recommendation:
      'Replace http:// with https:// for all non-localhost URLs. If the target service does not support HTTPS, consider routing through a TLS-terminating proxy or raising the issue with the service provider.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/TLS',
    pattern: /['"]http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/,
    languages: '*',
  },
];

// ---------------------------------------------------------------------------
// MEDIUM IMPACT
// ---------------------------------------------------------------------------

const mediumImpactRules: EnhancementRule[] = [
  {
    id: 'ENH-042',
    category: 'security-hardening',
    impact: 'medium',
    title: 'Sensitive data written to logs',
    description:
      'Logging values such as passwords, secrets, tokens, or API keys causes sensitive credentials to persist in log files, monitoring systems, and error-tracking services. This dramatically increases the blast radius of any log-access breach and may violate compliance requirements (PCI-DSS, SOC 2).',
    recommendation:
      'Remove sensitive values from log statements or replace them with redacted placeholders (e.g., "token=****"). Use a structured logger with a built-in redaction plugin (such as pino-redact or winston custom format) to catch accidental leaks automatically.',
    link: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/04-Review_Old_Backup_and_Unreferenced_Files_for_Sensitive_Information',
    pattern: /(?:console\.log|logger?\.\w+|print)\s*\(.*(?:password|secret|token|apiKey|api_key|credit_card)/i,
    languages: '*',
  },
  {
    id: 'ENH-043',
    category: 'security-hardening',
    impact: 'medium',
    title: 'Django SECURE_SSL_REDIRECT is disabled',
    description:
      'Setting SECURE_SSL_REDIRECT = False allows users to access the application over unencrypted HTTP. In production, this means authentication cookies, session tokens, and form data can be intercepted by network-level attackers.',
    recommendation:
      'Set SECURE_SSL_REDIRECT = True in production settings and ensure your reverse proxy or load balancer terminates TLS correctly. Use a separate settings file or environment variable to keep it disabled only in local development.',
    link: 'https://docs.djangoproject.com/en/5.0/ref/settings/#secure-ssl-redirect',
    pattern: /SECURE_SSL_REDIRECT\s*=\s*False/,
    languages: ['python'],
  },
  {
    id: 'ENH-044',
    category: 'security-hardening',
    impact: 'medium',
    title: 'Cookie set without secure or httpOnly flags',
    description:
      'Setting a cookie without the Secure and HttpOnly flags leaves it vulnerable to interception over HTTP and to exfiltration via cross-site scripting (XSS). The Secure flag ensures the cookie is only sent over HTTPS, while HttpOnly prevents JavaScript access.',
    recommendation:
      'Add { secure: true, httpOnly: true, sameSite: "strict" } to all cookie options. For session cookies, also set a reasonable maxAge or expires value to limit the window of token misuse.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#security',
    pattern: /\.cookie\s*\(\s*['"]/,
    languages: ['javascript', 'typescript'],
  },
  {
    id: 'ENH-046',
    category: 'security-hardening',
    impact: 'medium',
    title: 'Wildcard CORS origin allows any domain',
    description:
      'Setting Access-Control-Allow-Origin to "*" permits any website to make credentialed cross-origin requests to your API. This effectively disables the same-origin policy and can be exploited for data theft if the API returns user-specific data.',
    recommendation:
      'Replace the wildcard "*" with an explicit allowlist of trusted origins. Use a dynamic check that compares the request Origin header against the allowlist and reflects only permitted values.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS',
    pattern: /(?:cors|Access-Control-Allow-Origin)\s*[:(=]\s*['"][*]['"]/i,
    languages: '*',
  },
];

// ---------------------------------------------------------------------------
// LOW IMPACT
// ---------------------------------------------------------------------------

const lowImpactRules: EnhancementRule[] = [
  {
    id: 'ENH-045',
    category: 'security-hardening',
    impact: 'low',
    title: 'Request body accessed without input validation',
    description:
      'Directly accessing properties from the request body without validation allows malformed, oversized, or malicious input to flow into business logic. This can lead to injection attacks, type-confusion bugs, and unexpected application behavior.',
    recommendation:
      'Validate and sanitize all incoming data with a schema validation library (e.g., Zod, Joi, or marshmallow) before use. Define explicit schemas for each endpoint and reject requests that do not conform.',
    link: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/README',
    pattern: /(?:req\.body|request\.body|request\.form|request\.POST)\s*(?:\[|\.)/,
    languages: '*',
  },
  {
    id: 'ENH-047',
    category: 'security-hardening',
    impact: 'low',
    title: 'Thrown errors may lack a global error boundary',
    description:
      'Code that throws errors or rejects Promises without a surrounding global error handler risks exposing raw stack traces to end users and can cause unhandled-rejection crashes in Node.js or blank screens in React applications.',
    recommendation:
      'Add a top-level error boundary in React (ErrorBoundary component), a global express error-handling middleware (app.use((err, req, res, next) => ...)), or a process-level handler (process.on("unhandledRejection")) to catch and gracefully handle unexpected errors.',
    link: 'https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary',
    pattern: /(?:throw\s+new\s+Error|Promise\.reject)\s*\(/,
    languages: ['javascript', 'typescript'],
  },
];

// ---------------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------------

export const SECURITY_HARDENING_RULES: EnhancementRule[] = [
  ...highImpactRules,
  ...mediumImpactRules,
  ...lowImpactRules,
];
