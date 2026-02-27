import type { EnhancementRule } from '../types';

/**
 * Framework best-practice enhancement rules.
 *
 * These rules detect missing framework-level safeguards and recommend
 * idiomatic patterns for Next.js, React, Angular, Express, Django, Flask,
 * and Go. Following these practices leads to more robust, secure, and
 * maintainable applications.
 *
 * Rules are grouped by impact level: HIGH → MEDIUM → LOW.
 */

// ---------------------------------------------------------------------------
// HIGH IMPACT
// ---------------------------------------------------------------------------

const highImpactRules: EnhancementRule[] = [
  {
    id: 'ENH-060',
    category: 'framework',
    impact: 'high',
    title: 'Next.js page component missing metadata export',
    description:
      'Next.js App Router pages that lack a metadata export or a generateMetadata function will fall back to the root layout metadata, resulting in duplicate or missing page titles in browser tabs, search-engine results, and social-media previews. Proper metadata is essential for SEO and accessibility.',
    recommendation:
      'Export a metadata object or an async generateMetadata function from every page.tsx file. At minimum, include title and description fields. Use the Next.js Metadata API for dynamic values based on route params.',
    link: 'https://nextjs.org/docs/app/building-your-application/optimizing/metadata',
    pattern: /export\s+default\s+function\s+\w+Page/,
    languages: ['javascript', 'typescript'],
  },
];

// ---------------------------------------------------------------------------
// MEDIUM IMPACT
// ---------------------------------------------------------------------------

const mediumImpactRules: EnhancementRule[] = [
  {
    id: 'ENH-061',
    category: 'framework',
    impact: 'medium',
    title: 'React root render without ErrorBoundary wrapper',
    description:
      'Rendering the React component tree without a top-level ErrorBoundary means any uncaught rendering error will unmount the entire application, leaving users with a blank screen and no recovery path. Error boundaries gracefully catch and display fallback UI.',
    recommendation:
      'Wrap the root component with an ErrorBoundary (e.g., react-error-boundary) that renders a user-friendly fallback. Log caught errors to an error-tracking service such as Sentry to ensure visibility.',
    link: 'https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary',
    pattern: /ReactDOM\.render\s*\(|createRoot\s*\(/,
    languages: ['javascript', 'typescript'],
  },
  {
    id: 'ENH-062',
    category: 'framework',
    impact: 'medium',
    title: 'Subscription without cleanup may cause memory leaks',
    description:
      'Calling subscribe() or addEventListener() without a corresponding unsubscribe or removeEventListener in a cleanup phase (e.g., ngOnDestroy, useEffect return, componentWillUnmount) creates memory leaks. In Angular, implementing OnDestroy is the standard pattern for teardown logic.',
    recommendation:
      'Store the subscription reference and call unsubscribe() in ngOnDestroy (Angular), or return a cleanup function from useEffect (React). Alternatively, use operators like takeUntil with a destroy$ subject to automate teardown.',
    link: 'https://angular.io/api/core/OnDestroy',
    pattern: /(?:subscribe|addEventListener)\s*\(/,
    languages: ['typescript'],
  },
  {
    id: 'ENH-063',
    category: 'framework',
    impact: 'medium',
    title: 'Django view function missing authentication check',
    description:
      'A Django view function that directly accepts a request parameter without a @login_required decorator or explicit permission check allows unauthenticated users to access the endpoint. This is a common source of authorization bypass vulnerabilities.',
    recommendation:
      'Add the @login_required decorator for views that require authentication, or use @permission_required for role-based access. For Django REST Framework, set appropriate permission_classes on the view.',
    link: 'https://docs.djangoproject.com/en/5.0/topics/auth/default/#the-login-required-decorator',
    pattern: /def\s+\w+\s*\(\s*request\b/,
    languages: ['python'],
  },
  {
    id: 'ENH-064',
    category: 'framework',
    impact: 'medium',
    title: 'Express app initialized without helmet middleware',
    description:
      'Creating an Express application without the helmet middleware leaves the app without important HTTP security headers such as X-Content-Type-Options, Strict-Transport-Security, and X-Frame-Options. These headers provide defense-in-depth against common web vulnerabilities.',
    recommendation:
      'Install helmet and add app.use(helmet()) as one of the first middleware calls. Customize individual headers as needed for your application (e.g., helmet.contentSecurityPolicy with custom directives).',
    link: 'https://helmetjs.github.io/',
    pattern: /express\s*\(\s*\)/,
    languages: ['javascript', 'typescript'],
  },
  {
    id: 'ENH-065',
    category: 'framework',
    impact: 'medium',
    title: 'Go HTTP server without timeout configuration',
    description:
      'Using http.ListenAndServe directly starts a server with no read, write, or idle timeouts. A slow or malicious client can hold connections open indefinitely, exhausting file descriptors and causing denial-of-service.',
    recommendation:
      'Create an explicit http.Server with ReadTimeout, WriteTimeout, and IdleTimeout configured (e.g., 10s, 15s, and 60s respectively). Use server.ListenAndServe() instead of the package-level convenience function.',
    link: 'https://pkg.go.dev/net/http#Server',
    pattern: /http\.ListenAndServe\s*\(/,
    languages: ['go'],
  },
  {
    id: 'ENH-069',
    category: 'framework',
    impact: 'medium',
    title: 'Environment variable accessed without validation',
    description:
      'Reading environment variables directly (process.env, os.environ, os.getenv) without validation means missing or malformed values will surface as hard-to-debug runtime errors deep in the application. Early validation catches configuration problems at startup.',
    recommendation:
      'Validate all required environment variables at application startup using a schema library (e.g., envalid or zod for Node.js, pydantic-settings for Python). Fail fast with a clear error message if any required variable is missing or invalid.',
    link: 'https://www.npmjs.com/package/envalid',
    pattern: /process\.env\.\w+|os\.environ\.\w+|os\.getenv\s*\(/,
    languages: '*',
  },
];

// ---------------------------------------------------------------------------
// LOW IMPACT
// ---------------------------------------------------------------------------

const lowImpactRules: EnhancementRule[] = [
  {
    id: 'ENH-066',
    category: 'framework',
    impact: 'low',
    title: 'Loading state without skeleton or placeholder UI',
    description:
      'Using a boolean loading flag with a simple spinner or text fallback causes layout shifts when content appears and provides a poor perceived-performance experience. Skeleton screens preserve the layout shape and give users a visual cue about incoming content.',
    recommendation:
      'Replace generic spinners with skeleton placeholder components that mirror the shape of the expected content. Libraries such as react-loading-skeleton or shadcn Skeleton make this straightforward. Use Suspense boundaries in React 18+ for automatic fallback rendering.',
    link: 'https://ui.shadcn.com/docs/components/skeleton',
    pattern: /isLoading|loading\s*[?:=]|useState.*loading/,
    languages: ['javascript', 'typescript'],
  },
  {
    id: 'ENH-067',
    category: 'framework',
    impact: 'low',
    title: 'Flask application missing CSRF protection',
    description:
      'Initializing a Flask application without CSRF protection leaves all state-changing endpoints vulnerable to cross-site request forgery attacks, where a malicious site can trick an authenticated user into submitting unwanted actions.',
    recommendation:
      'Install Flask-WTF and initialize CSRF protection with CSRFProtect(app). Ensure all HTML forms include {{ csrf_token() }} and that AJAX requests send the X-CSRFToken header.',
    link: 'https://flask-wtf.readthedocs.io/en/stable/csrf.html',
    pattern: /Flask\s*\(\s*__name__/,
    languages: ['python'],
  },
  {
    id: 'ENH-068',
    category: 'framework',
    impact: 'low',
    title: 'Click handler missing accessibility attributes',
    description:
      'Adding an onClick handler to a non-interactive element (such as a div or span) without corresponding keyboard event handlers and ARIA attributes makes the element inaccessible to keyboard and screen-reader users. This violates WCAG 2.1 success criteria 2.1.1 and 4.1.2.',
    recommendation:
      'Use a semantic interactive element (button, a) whenever possible. If a non-interactive element must be clickable, add role="button", tabIndex={0}, and an onKeyDown handler that triggers on Enter and Space keys.',
    link: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/button_role',
    pattern: /onClick\s*=\s*\{/,
    languages: ['javascript', 'typescript'],
  },
];

// ---------------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------------

export const FRAMEWORK_RULES: EnhancementRule[] = [
  ...highImpactRules,
  ...mediumImpactRules,
  ...lowImpactRules,
];
