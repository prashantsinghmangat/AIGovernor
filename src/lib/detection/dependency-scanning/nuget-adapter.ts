/**
 * NuGet (.NET) dependency adapter for the multi-ecosystem dependency scanner.
 * Parses packages.config and .csproj (PackageReference) manifests and provides
 * a built-in advisory database for known vulnerable NuGet packages.
 */

import type { DependencyAdapter, Advisory } from './types';

// ---------------------------------------------------------------------------
// Advisory database — known vulnerable NuGet packages
// ---------------------------------------------------------------------------

const ADVISORY_DB: Record<string, Advisory[]> = {
  'Newtonsoft.Json': [
    {
      id: 'NUGET-001',
      severity: 'high',
      title: 'Newtonsoft.Json Denial of Service via Deeply Nested JSON',
      description:
        'Versions before 13.0.1 are vulnerable to Denial of Service (DoS) when deserializing deeply nested JSON objects, causing stack overflow.',
      vulnerable_range: '<13.0.1',
      patched_version: '13.0.1',
      cve: 'CVE-2024-21907',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-21907',
    },
  ],
  'System.Text.Json': [
    {
      id: 'NUGET-002',
      severity: 'high',
      title: 'System.Text.Json Denial of Service via Crafted JSON',
      description:
        'Versions before 8.0.0 are vulnerable to Denial of Service (DoS) when processing specially crafted JSON payloads that exploit the parser.',
      vulnerable_range: '<8.0.0',
      patched_version: '8.0.0',
      cve: 'CVE-2024-21319',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-21319',
    },
  ],
  'Microsoft.Data.SqlClient': [
    {
      id: 'NUGET-003',
      severity: 'critical',
      title: 'Microsoft.Data.SqlClient SSRF in Connection String',
      description:
        'Versions before 5.1.2 are vulnerable to Server-Side Request Forgery (SSRF) via crafted connection strings that allow attackers to access internal network resources.',
      vulnerable_range: '<5.1.2',
      patched_version: '5.1.2',
      cve: 'CVE-2024-0056',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-0056',
    },
  ],
  'NuGet.Protocol': [
    {
      id: 'NUGET-004',
      severity: 'high',
      title: 'NuGet.Protocol Spoofed Package Signatures',
      description:
        'Versions before 6.6.0 do not properly validate package signatures, allowing attackers to publish packages with spoofed signatures that appear trusted.',
      vulnerable_range: '<6.6.0',
      patched_version: '6.6.0',
      url: 'https://github.com/NuGet/NuGet.Client/security',
    },
  ],
  'System.Drawing.Common': [
    {
      id: 'NUGET-005',
      severity: 'critical',
      title: 'System.Drawing.Common Remote Code Execution',
      description:
        'Versions before 6.0.0 are vulnerable to Remote Code Execution (RCE) via specially crafted image files processed by the GDI+ library.',
      vulnerable_range: '<6.0.0',
      patched_version: '6.0.0',
      cve: 'CVE-2021-24112',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2021-24112',
    },
  ],
  'System.Net.Http': [
    {
      id: 'NUGET-006',
      severity: 'high',
      title: 'System.Net.Http Credential Leak',
      description:
        'Versions before 4.3.4 are vulnerable to credential leakage where authentication headers are inadvertently sent to untrusted servers during redirects.',
      vulnerable_range: '<4.3.4',
      patched_version: '4.3.4',
      cve: 'CVE-2018-8292',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2018-8292',
    },
  ],
  'Swashbuckle.AspNetCore': [
    {
      id: 'NUGET-007',
      severity: 'medium',
      title: 'Swashbuckle.AspNetCore Reflected XSS',
      description:
        'Versions before 6.5.0 are vulnerable to reflected cross-site scripting (XSS) via crafted URLs in the Swagger UI interface.',
      vulnerable_range: '<6.5.0',
      patched_version: '6.5.0',
      cve: 'CVE-2024-21319',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-21319',
    },
  ],
  'Microsoft.AspNetCore.Http': [
    {
      id: 'NUGET-008',
      severity: 'high',
      title: 'Microsoft.AspNetCore.Http Authentication Bypass',
      description:
        'Versions before 8.0.0 are vulnerable to authentication bypass via crafted HTTP requests that circumvent middleware authorization checks.',
      vulnerable_range: '<8.0.0',
      patched_version: '8.0.0',
      cve: 'CVE-2023-36558',
      url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-36558',
    },
  ],
};

// ---------------------------------------------------------------------------
// Manifest parsers
// ---------------------------------------------------------------------------

/**
 * Parse a packages.config (XML) file.
 *
 * Expected format:
 * ```xml
 * <?xml version="1.0" encoding="utf-8"?>
 * <packages>
 *   <package id="Newtonsoft.Json" version="12.0.3" targetFramework="net48" />
 *   <package id="System.Net.Http" version="4.3.0" />
 * </packages>
 * ```
 */
function parsePackagesConfig(content: string): Map<string, string> {
  const deps = new Map<string, string>();

  // Match <package id="..." version="..." /> elements
  const packageRegex = /<package\s+[^>]*id=["']([^"']+)["'][^>]*version=["']([^"']+)["'][^>]*\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = packageRegex.exec(content)) !== null) {
    deps.set(match[1], match[2]);
  }

  // Also try the reverse attribute order: version before id
  const reverseRegex = /<package\s+[^>]*version=["']([^"']+)["'][^>]*id=["']([^"']+)["'][^>]*\/?>/gi;
  while ((match = reverseRegex.exec(content)) !== null) {
    if (!deps.has(match[2])) {
      deps.set(match[2], match[1]);
    }
  }

  return deps;
}

/**
 * Parse a .csproj file for PackageReference elements.
 *
 * Expected format:
 * ```xml
 * <ItemGroup>
 *   <PackageReference Include="Newtonsoft.Json" Version="13.0.1" />
 *   <PackageReference Include="System.Text.Json" Version="7.0.0" />
 * </ItemGroup>
 * ```
 */
function parseCsproj(content: string): Map<string, string> {
  const deps = new Map<string, string>();

  // Match <PackageReference Include="..." Version="..." /> elements
  const pkgRefRegex = /<PackageReference\s+[^>]*Include=["']([^"']+)["'][^>]*Version=["']([^"']+)["'][^>]*\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = pkgRefRegex.exec(content)) !== null) {
    deps.set(match[1], match[2]);
  }

  // Also try reverse attribute order: Version before Include
  const reverseRegex = /<PackageReference\s+[^>]*Version=["']([^"']+)["'][^>]*Include=["']([^"']+)["'][^>]*\/?>/gi;
  while ((match = reverseRegex.exec(content)) !== null) {
    if (!deps.has(match[2])) {
      deps.set(match[2], match[1]);
    }
  }

  return deps;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const nugetAdapter: DependencyAdapter = {
  ecosystem: 'nuget',
  manifestFiles: ['packages.config'],

  parseManifest(content: string): Map<string, string> {
    // Detect whether this is a packages.config or .csproj based on content
    if (content.includes('<packages') || content.includes('<package ')) {
      return parsePackagesConfig(content);
    }

    if (content.includes('<PackageReference') || content.includes('<Project')) {
      return parseCsproj(content);
    }

    // Fallback: try both parsers and merge results
    const fromConfig = parsePackagesConfig(content);
    const fromCsproj = parseCsproj(content);

    const merged = new Map<string, string>(fromConfig);
    for (const [name, version] of fromCsproj) {
      if (!merged.has(name)) {
        merged.set(name, version);
      }
    }

    return merged;
  },

  getAdvisories(): Record<string, Advisory[]> {
    return ADVISORY_DB;
  },
};
