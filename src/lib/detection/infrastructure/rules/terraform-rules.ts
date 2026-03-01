/**
 * Terraform (.tf) security rules.
 * Covers: open security groups, public resources, unencrypted storage,
 * wildcard IAM, missing logging, and public buckets.
 */
import type { InfraRule } from '../types';

export const TERRAFORM_RULES: InfraRule[] = [
  // ─── Critical ───────────────────────────────────────────────────────────────
  {
    id: 'TF-001',
    severity: 'critical',
    fileType: 'terraform',
    title: 'S3 Bucket with Public ACL',
    description:
      'Setting bucket ACL to "public-read" or "public-read-write" makes all objects publicly accessible. This is a leading cause of data breaches.',
    remediation:
      'Remove the public ACL. Use aws_s3_bucket_public_access_block to block all public access. Use pre-signed URLs for controlled sharing.',
    pattern: /acl\s*=\s*["']public-read(?:-write)?["']/,
  },
  {
    id: 'TF-002',
    severity: 'critical',
    fileType: 'terraform',
    title: 'Wildcard IAM Action ("*")',
    description:
      'An IAM policy grants all actions ("*"), giving principals full control over the account. This violates the principle of least privilege.',
    remediation:
      'Replace Action = ["*"] with specific actions required by the role (e.g., ["s3:GetObject", "s3:PutObject"]).',
    pattern: /"Action"\s*:\s*\[?\s*"\*"\s*\]?/,
  },
  {
    id: 'TF-003',
    severity: 'critical',
    fileType: 'terraform',
    title: 'Security Group Open to All IPs (0.0.0.0/0 ingress)',
    description:
      'A security group allows inbound traffic from any IP address (0.0.0.0/0). This exposes the resource to the entire internet.',
    remediation:
      'Restrict cidr_blocks to specific known IP ranges. Use security group references for internal traffic.',
    pattern: /cidr_blocks\s*=\s*\[?\s*["']0\.0\.0\.0\/0["']/,
  },
  {
    id: 'TF-004',
    severity: 'critical',
    fileType: 'terraform',
    title: 'Hardcoded Credentials in Terraform',
    description:
      'Access keys, secrets, or passwords are hardcoded in Terraform configuration. These will be committed to version control.',
    remediation:
      'Use variables, AWS IAM roles, environment variables, or a secrets manager. Never hardcode credentials.',
    pattern: /(?:access_key|secret_key|password|token)\s*=\s*["'][A-Za-z0-9+/=]{8,}["']/,
  },
  // ─── High ───────────────────────────────────────────────────────────────────
  {
    id: 'TF-005',
    severity: 'high',
    fileType: 'terraform',
    title: 'RDS Database Publicly Accessible',
    description:
      'Setting publicly_accessible = true on an RDS instance exposes the database endpoint to the internet.',
    remediation:
      'Set publicly_accessible = false. Access databases through a VPC, bastion host, or VPN.',
    pattern: /publicly_accessible\s*=\s*true/,
  },
  {
    id: 'TF-006',
    severity: 'high',
    fileType: 'terraform',
    title: 'Unencrypted EBS Volume or RDS Storage',
    description:
      'Storage without encryption at rest means data is readable if physical media is compromised or accessed inappropriately.',
    remediation:
      'Set encrypted = true on aws_ebs_volume, aws_db_instance, and aws_rds_cluster resources.',
    pattern: /encrypted\s*=\s*false/,
  },
  {
    id: 'TF-007',
    severity: 'high',
    fileType: 'terraform',
    title: 'S3 Bucket Versioning Disabled',
    description:
      'Without versioning, accidental or malicious deletions and overwrites cannot be recovered.',
    remediation:
      'Enable versioning: add a versioning block with enabled = true in the aws_s3_bucket resource.',
    pattern: /versioning\s*\{[^}]*enabled\s*=\s*false/,
  },
  {
    id: 'TF-008',
    severity: 'high',
    fileType: 'terraform',
    title: 'EC2 Instance with IMDSv1 Enabled',
    description:
      'IMDSv1 is vulnerable to SSRF-based credential theft. IMDSv2 adds a required token step that prevents SSRF attacks.',
    remediation:
      'Set http_tokens = "required" in the metadata_options block of aws_instance resources.',
    pattern: /http_tokens\s*=\s*["']optional["']/,
  },
  {
    id: 'TF-009',
    severity: 'high',
    fileType: 'terraform',
    title: 'CloudTrail or S3 Access Logging Disabled',
    description:
      'Without access logging, there is no audit trail for API calls or object access. This hinders incident response and compliance.',
    remediation:
      'Enable CloudTrail for API auditing. Enable S3 access logging with a dedicated log bucket.',
    pattern: /enable_log_file_validation\s*=\s*false/,
  },
  {
    id: 'TF-010',
    severity: 'high',
    fileType: 'terraform',
    title: 'Security Group Allows All Outbound Traffic',
    description:
      'Allowing all outbound traffic (::/0 or 0.0.0.0/0 egress) enables data exfiltration from compromised instances.',
    remediation:
      'Restrict outbound rules to specific destinations and ports required by the application.',
    pattern: /egress\s*\{[\s\S]*?cidr_blocks\s*=\s*\[?\s*["']0\.0\.0\.0\/0["']/,
  },
  // ─── Medium ──────────────────────────────────────────────────────────────────
  {
    id: 'TF-011',
    severity: 'medium',
    fileType: 'terraform',
    title: 'Missing Deletion Protection',
    description:
      'Databases and load balancers without deletion protection can be accidentally destroyed by a terraform destroy command.',
    remediation:
      'Set deletion_protection = true on production databases (aws_db_instance, aws_rds_cluster) and load balancers.',
    pattern: /deletion_protection\s*=\s*false/,
  },
  {
    id: 'TF-012',
    severity: 'medium',
    fileType: 'terraform',
    title: 'EKS Cluster with Public API Server Endpoint',
    description:
      'Exposing the Kubernetes API server publicly increases the attack surface and risk of credential theft.',
    remediation:
      'Set endpoint_public_access = false and endpoint_private_access = true, or restrict endpoint_public_access_cidrs.',
    pattern: /endpoint_public_access\s*=\s*true/,
  },
  {
    id: 'TF-013',
    severity: 'medium',
    fileType: 'terraform',
    title: 'Lambda Function Without VPC Configuration',
    description:
      'Lambda functions without VPC configuration cannot access VPC resources securely and may expose data to the public internet.',
    remediation:
      'If the Lambda needs to access RDS, ElastiCache, or other VPC resources, configure vpc_config with subnet_ids and security_group_ids.',
    pattern: /resource\s*["']aws_lambda_function["'][^{]*\{(?:(?!vpc_config)[\s\S])*\}/,
  },
  {
    id: 'TF-014',
    severity: 'medium',
    fileType: 'terraform',
    title: 'Unencrypted Secrets Manager or SSM Parameter',
    description:
      'Sensitive parameters stored without a custom KMS key rely on the AWS default key, reducing control over access and rotation.',
    remediation:
      'Specify a kms_key_id on aws_secretsmanager_secret and aws_ssm_parameter resources for customer-managed encryption.',
    pattern: /resource\s*["']aws_ssm_parameter["'][^{]*\{(?:(?!kms_key_id)[\s\S])*\}/,
  },
  // ─── Low ─────────────────────────────────────────────────────────────────────
  {
    id: 'TF-015',
    severity: 'low',
    fileType: 'terraform',
    title: 'Resource Missing Required Tags',
    description:
      'Resources without tags (e.g. Environment, Owner, CostCenter) make cost attribution, access control, and incident response harder.',
    remediation:
      'Add a tags block to every resource with at minimum: Name, Environment, and Owner.',
    pattern: /resource\s*["'][^"']+["']\s*["'][^"']+["']\s*\{(?:(?!tags)[\s\S])*\}/,
  },
];
