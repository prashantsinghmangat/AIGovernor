/**
 * Kubernetes manifest security rules.
 * Covers: privileged containers, host namespaces, missing resource limits,
 * wildcard RBAC, secrets in env vars, root users, and insecure image policies.
 */
import type { InfraRule } from '../types';

export const KUBERNETES_RULES: InfraRule[] = [
  // ─── Critical ───────────────────────────────────────────────────────────────
  {
    id: 'K8S-001',
    severity: 'critical',
    fileType: 'kubernetes',
    title: 'Privileged Container',
    description:
      'A container with privileged: true has full root access to the host node, equivalent to running as root on the host. This is a critical security risk.',
    remediation:
      'Remove "privileged: true". Use specific capabilities (securityContext.capabilities.add) only when absolutely required.',
    pattern: /privileged\s*:\s*true/,
  },
  {
    id: 'K8S-002',
    severity: 'critical',
    fileType: 'kubernetes',
    title: 'RBAC Wildcard Permissions',
    description:
      'A ClusterRole or Role grants wildcard (*) verb or resource permissions, effectively making it a cluster-admin. This violates least-privilege principles.',
    remediation:
      'Replace wildcard verbs/resources with explicit, minimal permissions needed for the workload.',
    pattern: /verbs\s*:\s*\[?\s*['"]\*['"]/,
  },
  {
    id: 'K8S-003',
    severity: 'critical',
    fileType: 'kubernetes',
    title: 'Hardcoded Secret in Environment Variable',
    description:
      'An environment variable uses a hardcoded value for a key that suggests it contains a password, token, or secret. This exposes credentials in the manifest.',
    remediation:
      'Use secretKeyRef to reference a Kubernetes Secret: valueFrom: { secretKeyRef: { name: my-secret, key: password } }',
    pattern: /(?:password|secret|token|key|api_key)\s*:\s*\n?\s*value\s*:\s*['"]?[^'"${\n]{4,}/i,
  },
  {
    id: 'K8S-004',
    severity: 'critical',
    fileType: 'kubernetes',
    title: 'Container Running as Root (UID 0)',
    description:
      'The container security context specifies runAsUser: 0 (root). Running containers as root amplifies any container escape vulnerability.',
    remediation:
      'Set runAsUser to a non-zero UID (e.g. 1000). Add runAsNonRoot: true to enforce this at the pod level.',
    pattern: /runAsUser\s*:\s*0\b/,
  },
  // ─── High ───────────────────────────────────────────────────────────────────
  {
    id: 'K8S-005',
    severity: 'high',
    fileType: 'kubernetes',
    title: 'hostNetwork: true',
    description:
      'The pod shares the host node\'s network namespace, allowing the container to listen on host ports and access other pods\' network traffic.',
    remediation:
      'Remove hostNetwork: true. Use Service resources for network exposure instead of sharing the host network.',
    pattern: /hostNetwork\s*:\s*true/,
  },
  {
    id: 'K8S-006',
    severity: 'high',
    fileType: 'kubernetes',
    title: 'hostPath Volume Mount',
    description:
      'A hostPath volume mounts a directory from the host filesystem into the container. This can expose sensitive host data and is a common container escape vector.',
    remediation:
      'Replace hostPath volumes with emptyDir, PersistentVolumeClaim, or ConfigMap mounts.',
    pattern: /hostPath\s*:/,
  },
  {
    id: 'K8S-007',
    severity: 'high',
    fileType: 'kubernetes',
    title: 'allowPrivilegeEscalation: true',
    description:
      'Allowing privilege escalation means a container process can gain more privileges than its parent process, enabling potential host compromise.',
    remediation:
      'Set allowPrivilegeEscalation: false in the container securityContext.',
    pattern: /allowPrivilegeEscalation\s*:\s*true/,
  },
  {
    id: 'K8S-008',
    severity: 'high',
    fileType: 'kubernetes',
    title: 'Container Using :latest Image Tag',
    description:
      'Using the :latest image tag makes deployments non-reproducible — the image can change silently on each pull, introducing untested changes.',
    remediation:
      'Pin images to a specific digest or immutable tag: image: nginx:1.25.3 or image: nginx@sha256:...',
    pattern: /image\s*:\s*\S+:latest/,
  },
  {
    id: 'K8S-009',
    severity: 'high',
    fileType: 'kubernetes',
    title: 'Dangerous Capability Added (ALL or SYS_ADMIN)',
    description:
      'Adding ALL or SYS_ADMIN Linux capabilities grants near-root access inside the container, enabling host attacks and escapes.',
    remediation:
      'Drop ALL capabilities first (capabilities.drop: ["ALL"]) then add only the minimal set needed.',
    pattern: /capabilities\s*:[\s\S]*?add\s*:[\s\S]*?\[?\s*['"]?(?:ALL|SYS_ADMIN)/,
  },
  {
    id: 'K8S-010',
    severity: 'high',
    fileType: 'kubernetes',
    title: 'Service Account Token Auto-Mounted',
    description:
      'By default, Kubernetes mounts service account tokens in every pod. If the application does not need API access, this unnecessarily exposes credentials.',
    remediation:
      'Set automountServiceAccountToken: false at the pod or service account level for workloads that do not call the Kubernetes API.',
    pattern: /automountServiceAccountToken\s*:\s*true/,
  },
  // ─── Medium ──────────────────────────────────────────────────────────────────
  {
    id: 'K8S-011',
    severity: 'medium',
    fileType: 'kubernetes',
    title: 'Missing Resource Limits',
    description:
      'Containers without CPU/memory limits can starve other containers of resources, causing node instability (noisy neighbor problem).',
    remediation:
      'Add resources.limits.cpu and resources.limits.memory to every container spec.',
    pattern: /containers\s*:/,
    negativeMatch: false,
    // Actually implemented as a check: containers section exists but limits section doesn't
  },
  {
    id: 'K8S-012',
    severity: 'medium',
    fileType: 'kubernetes',
    title: 'readOnlyRootFilesystem Not Set',
    description:
      'Without readOnlyRootFilesystem: true, attackers who gain code execution in a container can modify the filesystem to persist or escalate.',
    remediation:
      'Add readOnlyRootFilesystem: true to the container securityContext. Mount writable emptyDir volumes only where writes are needed.',
    pattern: /securityContext\s*:/,
    negativeMatch: false,
  },
  {
    id: 'K8S-013',
    severity: 'medium',
    fileType: 'kubernetes',
    title: 'imagePullPolicy: Never or Missing',
    description:
      'Without Always pull policy on non-pinned images, stale or tampered cached images may be used without pulling the latest layer.',
    remediation:
      'Set imagePullPolicy: Always for images that are not pinned to an immutable digest.',
    pattern: /imagePullPolicy\s*:\s*Never/,
  },
  // ─── Low ─────────────────────────────────────────────────────────────────────
  {
    id: 'K8S-014',
    severity: 'low',
    fileType: 'kubernetes',
    title: 'No Liveness or Readiness Probe',
    description:
      'Without health probes, Kubernetes cannot detect a crashed or hung application and will continue routing traffic to it.',
    remediation:
      'Add livenessProbe and readinessProbe to every container spec to enable automatic restart and traffic control.',
    pattern: /containers\s*:/,
    negativeMatch: false,
  },
  {
    id: 'K8S-015',
    severity: 'low',
    fileType: 'kubernetes',
    title: 'Default Namespace Used',
    description:
      'Deploying workloads into the "default" namespace makes it hard to apply RBAC and network policies consistently.',
    remediation:
      'Create dedicated namespaces for each team or application and configure RBAC and NetworkPolicy per namespace.',
    pattern: /namespace\s*:\s*default\s*$/m,
  },
];
