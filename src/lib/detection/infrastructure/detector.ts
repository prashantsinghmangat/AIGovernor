/**
 * Infrastructure security detector.
 * Scans Dockerfiles, GitHub Actions, Kubernetes manifests, and Terraform configs.
 */

import type { InfraResult, InfraFinding, InfraFileType } from './types';
import { DOCKERFILE_RULES } from './rules/dockerfile-rules';
import { GITHUB_ACTIONS_RULES } from './rules/github-actions-rules';
import { KUBERNETES_RULES } from './rules/kubernetes-rules';
import { TERRAFORM_RULES } from './rules/terraform-rules';

const ALL_RULES = [...DOCKERFILE_RULES, ...GITHUB_ACTIONS_RULES, ...KUBERNETES_RULES, ...TERRAFORM_RULES];

/**
 * Detect the infrastructure file type from the file path.
 */
export function getInfraFileType(filePath: string): InfraFileType | null {
  const lower = filePath.toLowerCase();
  const fileName = lower.split('/').pop() ?? '';

  if (fileName === 'dockerfile' || fileName.startsWith('dockerfile.')) return 'dockerfile';
  if (lower.includes('.github/workflows/') && (lower.endsWith('.yml') || lower.endsWith('.yaml'))) return 'github-actions';
  if (fileName.startsWith('docker-compose') && (lower.endsWith('.yml') || lower.endsWith('.yaml'))) return 'docker-compose';

  // Terraform: .tf files
  if (lower.endsWith('.tf') || lower.endsWith('.tf.json')) return 'terraform';

  // Kubernetes: YAML files with k8s-like paths or names
  if (lower.endsWith('.yml') || lower.endsWith('.yaml')) {
    if (
      lower.includes('/k8s/') || lower.includes('/kubernetes/') ||
      lower.includes('/manifests/') || lower.includes('/helm/') ||
      lower.includes('/kustomize/') || lower.includes('/deploy/') ||
      fileName.includes('deployment') || fileName.includes('service') ||
      fileName.includes('configmap') || fileName.includes('rbac') ||
      fileName.includes('ingress') || fileName.includes('statefulset') ||
      fileName.includes('daemonset') || fileName.includes('namespace')
    ) return 'kubernetes';
  }

  return null;
}

/**
 * Scan infrastructure file content for security issues.
 */
export function detectInfraIssues(
  content: string,
  filePath: string,
  fileType?: InfraFileType,
): InfraResult {
  const type = fileType ?? getInfraFileType(filePath);
  if (!type) return emptyResult();

  const findings: InfraFinding[] = [];
  const lines = content.split('\n');

  // Docker-compose inherits dockerfile rules; Kubernetes and Terraform are standalone
  const applicableTypes: InfraFileType[] = type === 'docker-compose'
    ? ['docker-compose', 'dockerfile']
    : [type];

  for (const rule of ALL_RULES) {
    if (!applicableTypes.includes(rule.fileType)) continue;

    if (rule.negativeMatch) {
      // Negative match: trigger if pattern is NOT found anywhere in the file
      if (!rule.pattern.test(content)) {
        findings.push({
          id: rule.id,
          severity: rule.severity,
          fileType: rule.fileType,
          title: rule.title,
          description: rule.description,
          remediation: rule.remediation,
          file_path: filePath,
        });
      }
    } else {
      // Positive match: check each line
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(rule.pattern);
        if (match) {
          findings.push({
            id: rule.id,
            severity: rule.severity,
            fileType: rule.fileType,
            title: rule.title,
            description: rule.description,
            remediation: rule.remediation,
            file_path: filePath,
            line: i + 1,
            matchedText: match[0].substring(0, 100),
          });
          break; // One match per rule per file is enough
        }
      }
    }
  }

  return {
    total_findings: findings.length,
    critical_count: findings.filter((f) => f.severity === 'critical').length,
    high_count: findings.filter((f) => f.severity === 'high').length,
    medium_count: findings.filter((f) => f.severity === 'medium').length,
    low_count: findings.filter((f) => f.severity === 'low').length,
    findings,
    scanned: true,
  };
}

function emptyResult(): InfraResult {
  return {
    total_findings: 0,
    critical_count: 0,
    high_count: 0,
    medium_count: 0,
    low_count: 0,
    findings: [],
    scanned: false,
  };
}
