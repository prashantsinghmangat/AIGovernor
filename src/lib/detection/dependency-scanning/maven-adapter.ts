/**
 * Maven / Gradle dependency adapter.
 *
 * Handles pom.xml (Maven) and build.gradle (Gradle) manifest files,
 * mapping dependencies to known Java/JVM advisories.
 */

import type { Advisory, DependencyAdapter } from './types';

// ---------------------------------------------------------------------------
// Manifest parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parse a Maven pom.xml string.
 *
 * Extracts <dependency> blocks and pulls groupId, artifactId and version from
 * each one.  Returns a Map keyed by "groupId:artifactId".
 */
function parsePomXml(content: string): Map<string, string> {
  const deps = new Map<string, string>();

  // Match each <dependency>...</dependency> block (non-greedy, dotAll)
  const depBlockRegex = /<dependency>([\s\S]*?)<\/dependency>/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = depBlockRegex.exec(content)) !== null) {
    const block = blockMatch[1];

    const groupId = block.match(/<groupId>\s*(.*?)\s*<\/groupId>/)?.[1];
    const artifactId = block.match(/<artifactId>\s*(.*?)\s*<\/artifactId>/)?.[1];
    const version = block.match(/<version>\s*(.*?)\s*<\/version>/)?.[1];

    if (groupId && artifactId && version) {
      deps.set(`${groupId}:${artifactId}`, version);
    }
  }

  return deps;
}

/**
 * Parse a Gradle build.gradle string.
 *
 * Recognises `implementation`, `compile`, `api`, `compileOnly`, `runtimeOnly`,
 * `testImplementation` and `testCompile` configurations with the common
 * single-string notation: `configuration 'group:artifact:version'`.
 */
function parseBuildGradle(content: string): Map<string, string> {
  const deps = new Map<string, string>();

  // Match lines like: implementation 'org.example:lib:1.0.0'
  // Also handles double-quoted strings.
  const gradleRegex =
    /(?:implementation|compile|api|compileOnly|runtimeOnly|testImplementation|testCompile)\s+['"]([^:'"]+):([^:'"]+):([^'"]+)['"]/g;

  let m: RegExpExecArray | null;

  while ((m = gradleRegex.exec(content)) !== null) {
    const group = m[1].trim();
    const artifact = m[2].trim();
    const version = m[3].trim();
    deps.set(`${group}:${artifact}`, version);
  }

  return deps;
}

// ---------------------------------------------------------------------------
// Advisory database
// ---------------------------------------------------------------------------

function buildAdvisories(): Record<string, Advisory[]> {
  return {
    'org.apache.logging.log4j:log4j-core': [
      {
        id: 'MAVEN-001',
        severity: 'critical',
        title: 'Log4Shell Remote Code Execution',
        description:
          'Apache Log4j2 JNDI features used in configuration, log messages, and parameters do not protect against attacker-controlled LDAP and other JNDI endpoints. An attacker who can control log messages or log message parameters can execute arbitrary code loaded from LDAP servers.',
        vulnerable_range: '<2.17.1',
        patched_version: '2.17.1',
        cve: 'CVE-2021-44228',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2021-44228',
      },
      {
        id: 'MAVEN-002',
        severity: 'high',
        title: 'Log4j2 Denial of Service via uncontrolled recursion',
        description:
          'Apache Log4j2 does not always protect from infinite recursion in lookup evaluation, allowing attackers with control over Thread Context Map data to cause a denial of service when a crafted string is interpreted.',
        vulnerable_range: '<2.17.0',
        patched_version: '2.17.0',
        cve: 'CVE-2021-45105',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2021-45105',
      },
    ],

    'org.springframework:spring-core': [
      {
        id: 'MAVEN-003',
        severity: 'critical',
        title: 'Spring4Shell Remote Code Execution',
        description:
          'A Spring MVC or Spring WebFlux application running on JDK 9+ may be vulnerable to remote code execution via data binding. The vulnerability requires specific deployment conditions (WAR deployment on Apache Tomcat).',
        vulnerable_range: '<6.0.0',
        patched_version: '6.0.0',
        cve: 'CVE-2022-22965',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-22965',
      },
    ],

    'org.springframework:spring-web': [
      {
        id: 'MAVEN-004',
        severity: 'critical',
        title: 'Spring4Shell Remote Code Execution (spring-web)',
        description:
          'Spring Framework RCE via data binding on JDK 9+. The spring-web module is affected when used with a vulnerable spring-core version.',
        vulnerable_range: '<6.0.0',
        patched_version: '6.0.0',
        cve: 'CVE-2022-22965',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-22965',
      },
    ],

    'com.fasterxml.jackson.core:jackson-databind': [
      {
        id: 'MAVEN-005',
        severity: 'high',
        title: 'Jackson Databind Denial of Service',
        description:
          'In FasterXML jackson-databind, resource exhaustion can occur because of a lack of a check in primitive value deserializers to avoid deep wrapper array nesting when the UNWRAP_SINGLE_VALUE_ARRAYS feature is enabled.',
        vulnerable_range: '<2.14.0',
        patched_version: '2.14.0',
        cve: 'CVE-2022-42003',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-42003',
      },
    ],

    'com.google.code.gson:gson': [
      {
        id: 'MAVEN-006',
        severity: 'high',
        title: 'Gson Denial of Service via deserialization',
        description:
          'The package com.google.code.gson before 2.8.9 is vulnerable to Deserialization of Untrusted Data via the writeReplace() method in internal classes, which may lead to DoS attacks.',
        vulnerable_range: '<2.8.9',
        patched_version: '2.8.9',
        cve: 'CVE-2022-25647',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-25647',
      },
    ],

    'org.apache.commons:commons-text': [
      {
        id: 'MAVEN-007',
        severity: 'critical',
        title: 'Apache Commons Text RCE via StringSubstitutor (Text4Shell)',
        description:
          'Apache Commons Text performs variable interpolation, allowing properties to be dynamically evaluated and expanded. The standard format for interpolation is "${prefix:name}", where "prefix" is used to locate an instance of StringLookup that performs the interpolation. Starting with version 1.5 and continuing through 1.9, the set of default Lookup instances included interpolators that could result in arbitrary code execution or contact with remote servers.',
        vulnerable_range: '<1.10.0',
        patched_version: '1.10.0',
        cve: 'CVE-2022-42889',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-42889',
      },
    ],

    'org.apache.commons:commons-collections4': [
      {
        id: 'MAVEN-008',
        severity: 'critical',
        title: 'Apache Commons Collections Deserialization RCE',
        description:
          'The Apache Commons Collections library contains various classes that, when deserialized, can be exploited to execute arbitrary code. This was widely exploited in application servers and other Java-based middleware.',
        vulnerable_range: '<4.1',
        patched_version: '4.1',
        cve: 'CVE-2015-4852',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2015-4852',
      },
    ],

    'com.h2database:h2': [
      {
        id: 'MAVEN-009',
        severity: 'critical',
        title: 'H2 Database Remote Code Execution via JNDI',
        description:
          'H2 Database Console allows loading of custom classes from remote servers through JNDI. By creating an aliased column with a malicious JNDI URL an attacker can trigger remote class loading and execute arbitrary code.',
        vulnerable_range: '<2.1.214',
        patched_version: '2.1.214',
        cve: 'CVE-2022-23221',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-23221',
      },
    ],

    'io.netty:netty-codec-http': [
      {
        id: 'MAVEN-010',
        severity: 'medium',
        title: 'Netty HTTP/2 Denial of Service via HAProxyMessageDecoder',
        description:
          'Netty project is an event-driven asynchronous network application framework. A StackOverflowError can be raised when parsing a malformed HAProxy message, leading to denial of service.',
        vulnerable_range: '<4.1.86',
        patched_version: '4.1.86.Final',
        cve: 'CVE-2022-41881',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-41881',
      },
    ],

    'org.apache.struts:struts2-core': [
      {
        id: 'MAVEN-011',
        severity: 'critical',
        title: 'Apache Struts Path Traversal to RCE',
        description:
          'An attacker can manipulate file upload params to enable paths traversal and under some circumstances this can lead to uploading a malicious file which can be used to perform Remote Code Execution.',
        vulnerable_range: '<6.3.0',
        patched_version: '6.3.0.1',
        cve: 'CVE-2023-50164',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2023-50164',
      },
    ],

    'org.hibernate:hibernate-core': [
      {
        id: 'MAVEN-012',
        severity: 'high',
        title: 'Hibernate ORM SQL Injection',
        description:
          'A flaw was found in Hibernate ORM. A SQL injection attack can be launched when using the DISTINCT keyword in combination with the ORDER BY clause. An attacker can construct a malicious query that affects the database.',
        vulnerable_range: '<5.6.0',
        patched_version: '5.6.0.Final',
        cve: 'CVE-2020-25638',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2020-25638',
      },
    ],

    'org.yaml:snakeyaml': [
      {
        id: 'MAVEN-013',
        severity: 'critical',
        title: 'SnakeYAML Constructor Code Execution',
        description:
          'SnakeYAML\'s Constructor class, which inherits from SafeConstructor, allows any type to be deserialized by default, which is unsafe. An attacker can provide a malicious YAML document to achieve remote code execution.',
        vulnerable_range: '<2.0',
        patched_version: '2.0',
        cve: 'CVE-2022-1471',
        url: 'https://nvd.nist.gov/vuln/detail/CVE-2022-1471',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const mavenAdapter: DependencyAdapter = {
  ecosystem: 'maven',
  manifestFiles: ['pom.xml', 'build.gradle'],

  parseManifest(content: string): Map<string, string> {
    // Heuristic: pom.xml files will contain an XML declaration or <project> root.
    // Gradle files typically contain `apply plugin` or `dependencies {`.
    const isPom =
      content.includes('<project') || content.includes('<dependency>');

    if (isPom) {
      return parsePomXml(content);
    }

    return parseBuildGradle(content);
  },

  getAdvisories(): Record<string, Advisory[]> {
    return buildAdvisories();
  },
};
