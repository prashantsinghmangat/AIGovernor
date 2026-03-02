/**
 * CodeGuard AI — PDF Report Generator
 * Generates a comprehensive governance report using jsPDF + jspdf-autotable.
 */

// Libraries loaded lazily on first call (avoids SSR + bundler issues)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let jsPDF: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let autoTable: ((doc: any, options: any) => void) | null = null;

async function loadLibs() {
  if (!jsPDF) {
    const m = await import('jspdf');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jsPDF = (m as any).jsPDF ?? m.default;
  }
  if (!autoTable) {
    const m = await import('jspdf-autotable');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autoTable = (m as any).default ?? m;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RepoReportData {
  name: string;
  full_name: string;
  language: string;
  score: number;
  risk_zone: string;
  last_scan_at: string | null;
  total_files: number;
  total_loc: number;
  ai_loc_pct: number;
  vulnerabilities: { critical: number; high: number; medium: number; low: number; total: number };
  dependencies: { total: number; critical: number; high: number; medium: number; low: number; total_findings: number; ecosystems: string[] };
  code_quality: { grade: string; total_errors: number; total_warnings: number; total_findings: number };
  enhancements: { total: number; high_impact: number };
  pii: { total: number; critical: number; categories: string[] };
  sensitive_files: { total: number; critical: number };
  infrastructure: { total: number; critical: number; high: number };
  license: { total_packages: number; strong_copyleft: number; weak_copyleft: number };
}

export interface FullReportData {
  company_name: string;
  generated_at: string;
  last_scan_at: string | null;
  overall_score: number;
  overall_risk_zone: string;
  repositories: RepoReportData[];
  totals: {
    vuln_critical: number; vuln_high: number; vuln_medium: number; vuln_low: number;
    dep_critical: number; dep_high: number; dep_findings: number;
    quality_errors: number; quality_warnings: number;
    pii_total: number; sensitive_total: number; infra_total: number;
  };
  alerts: Array<{ severity: string; category: string; title: string; description: string; created_at: string; repo_name: string | null }>;
  top_contributors: Array<{ name: string; ai_loc: number; governance_score: number; risk_index: number }>;
}

// ─── Palette ─────────────────────────────────────────────────────────────────

const C = {
  bg: [10, 18, 40] as [number, number, number],
  card: [19, 27, 46] as [number, number, number],
  border: [30, 42, 74] as [number, number, number],
  text: [232, 234, 240] as [number, number, number],
  muted: [90, 100, 128] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
  green: [52, 211, 153] as [number, number, number],
  amber: [251, 191, 36] as [number, number, number],
  orange: [251, 146, 60] as [number, number, number],
  red: [248, 113, 113] as [number, number, number],
  purple: [167, 139, 250] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

type RGB = [number, number, number];

function riskColor(zone: string): RGB {
  if (zone === 'healthy') return C.green;
  if (zone === 'caution') return C.amber;
  if (zone === 'critical' || zone === 'high') return C.red;
  return C.muted;
}

function severityColor(sev: string): RGB {
  if (sev === 'critical') return C.red;
  if (sev === 'high') return C.orange;
  if (sev === 'medium') return C.amber;
  return C.blue;
}

function gradeColor(grade: string): RGB {
  if (grade === 'A') return C.green;
  if (grade === 'B') return C.blue;
  if (grade === 'C') return C.amber;
  if (grade === 'D') return C.orange;
  if (grade === 'F') return C.red;
  return C.muted;
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Healthy';
  if (score >= 60) return 'Caution';
  return 'Critical';
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;

function setFill(doc: Doc, color: RGB) { doc.setFillColor(...color); }
function setDraw(doc: Doc, color: RGB) { doc.setDrawColor(...color); }
function setTextColor(doc: Doc, color: RGB) { doc.setTextColor(...color); }

function rect(doc: Doc, x: number, y: number, w: number, h: number, color: RGB, style: 'F' | 'S' | 'FD' = 'F') {
  setFill(doc, color);
  if (style === 'S') { setDraw(doc, color); }
  doc.rect(x, y, w, h, style);
}

function badge(doc: Doc, x: number, y: number, label: string, color: RGB) {
  const w = doc.getTextWidth(label) + 6;
  setFill(doc, color);
  doc.roundedRect(x, y - 3.5, w, 5.5, 1.5, 1.5, 'F');
  setTextColor(doc, C.white);
  doc.setFontSize(7);
  doc.text(label.toUpperCase(), x + 3, y + 0.5);
}

function sectionHeader(doc: Doc, y: number, title: string, icon?: string): number {
  rect(doc, 15, y, 180, 8, C.card);
  setTextColor(doc, C.blue);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text((icon ? icon + '  ' : '') + title, 19, y + 5.5);
  doc.setFont('helvetica', 'normal');
  return y + 12;
}

function addPageIfNeeded(doc: Doc, y: number, needed = 20): number {
  if (y + needed > 275) {
    doc.addPage();
    addPageBg(doc);
    return 20;
  }
  return y;
}

function addPageBg(doc: Doc) {
  setFill(doc, C.bg);
  doc.rect(0, 0, 210, 297, 'F');
}

function addPageNumber(doc: Doc, pageNum: number, total: number) {
  setTextColor(doc, C.muted);
  doc.setFontSize(7);
  doc.text(`CodeGuard AI  |  Page ${pageNum} of ${total}`, 105, 291, { align: 'center' });
  setDraw(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(15, 288, 195, 288);
}

function miniBar(doc: Doc, x: number, y: number, w: number, value: number, max: number, color: RGB) {
  setFill(doc, C.border);
  doc.roundedRect(x, y, w, 3, 1, 1, 'F');
  if (max > 0) {
    setFill(doc, color);
    doc.roundedRect(x, y, Math.max(2, (value / max) * w), 3, 1, 1, 'F');
  }
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

function drawCoverPage(doc: Doc, data: FullReportData) {
  addPageBg(doc);

  // Top accent bar
  setFill(doc, C.blue);
  doc.rect(0, 0, 210, 4, 'F');

  // Brand block
  setFill(doc, C.card);
  doc.roundedRect(60, 40, 90, 30, 4, 4, 'F');
  setTextColor(doc, C.blue);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CodeGuard AI', 105, 58, { align: 'center' });
  setTextColor(doc, C.muted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('AI Code Governance Platform', 105, 65, { align: 'center' });

  // Title
  setTextColor(doc, C.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Governance Report', 105, 98, { align: 'center' });

  setTextColor(doc, C.muted);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.company_name, 105, 108, { align: 'center' });

  // Score card
  const sc = data.overall_score;
  const rz = data.overall_risk_zone;
  const scoreCol = riskColor(rz);
  setFill(doc, C.card);
  doc.roundedRect(55, 118, 100, 50, 4, 4, 'F');
  setFill(doc, scoreCol);
  doc.roundedRect(55, 118, 100, 2, 2, 2, 'F');

  setTextColor(doc, scoreCol);
  doc.setFontSize(42);
  doc.setFont('helvetica', 'bold');
  doc.text(String(sc), 105, 148, { align: 'center' });
  setTextColor(doc, C.muted);
  doc.setFontSize(8);
  doc.text('Overall AI Debt Score', 105, 155, { align: 'center' });
  badge(doc, 87, 160, scoreLabel(sc), scoreCol);

  // Meta info
  const metaItems = [
    ['Generated', fmtDate(data.generated_at)],
    ['Last Scan', fmtDate(data.last_scan_at)],
    ['Repositories', String(data.repositories.length)],
    ['Active Alerts', String(data.alerts.length)],
  ];
  let mx = 25;
  setFill(doc, C.card);
  doc.roundedRect(15, 182, 180, 30, 4, 4, 'F');
  for (const [label, value] of metaItems) {
    setTextColor(doc, C.muted);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(label, mx, 192);
    setTextColor(doc, C.white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(value, mx, 200);
    mx += 46;
  }

  // Threat summary row
  const threats = [
    { label: 'Vuln Critical', value: data.totals.vuln_critical, color: C.red },
    { label: 'Dep Critical', value: data.totals.dep_critical, color: C.orange },
    { label: 'PII Found', value: data.totals.pii_total, color: C.purple },
    { label: 'Infra Issues', value: data.totals.infra_total, color: C.amber },
  ];
  setFill(doc, C.card);
  doc.roundedRect(15, 220, 180, 28, 4, 4, 'F');
  setTextColor(doc, C.muted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('KEY RISK INDICATORS', 20, 228);
  let tx = 20;
  for (const t of threats) {
    setTextColor(doc, t.color);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(String(t.value), tx, 241);
    setTextColor(doc, C.muted);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text(t.label, tx, 246);
    tx += 46;
  }

  // Bottom note
  setTextColor(doc, C.muted);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Confidential — For internal use only', 105, 265, { align: 'center' });

  addPageNumber(doc, 1, 99); // placeholder, will be fixed
}

// ─── Repository Overview Table ────────────────────────────────────────────────

function drawRepoOverview(doc: Doc, data: FullReportData, startPage: number): number {
  doc.addPage();
  addPageBg(doc);
  let y = 15;

  // Section title
  setTextColor(doc, C.white);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Repository Overview', 15, y + 7);
  setTextColor(doc, C.muted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.repositories.length} active repositories`, 15, y + 13);
  y += 22;

  const head = [['Repository', 'Lang', 'Score', 'Risk', 'Vulns C/H', 'Dep C/H', 'Quality', 'AI %', 'Last Scan']];
  const rows = data.repositories.map((r) => [
    r.name.length > 22 ? r.name.slice(0, 20) + '…' : r.name,
    r.language.slice(0, 8),
    String(r.score || '-'),
    (r.risk_zone || 'unknown').charAt(0).toUpperCase() + (r.risk_zone || 'unknown').slice(1),
    `${r.vulnerabilities.critical} / ${r.vulnerabilities.high}`,
    `${r.dependencies.critical} / ${r.dependencies.high}`,
    r.code_quality.grade,
    r.ai_loc_pct > 0 ? `${r.ai_loc_pct}%` : '-',
    fmtDate(r.last_scan_at),
  ]);

  autoTable!(doc, {
    startY: y,
    head,
    body: rows,
    theme: 'plain',
    styles: {
      fillColor: C.card,
      textColor: C.text,
      fontSize: 7.5,
      cellPadding: 3,
      lineColor: C.border,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: C.border,
      textColor: C.blue,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [15, 22, 38] },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 14 },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 12, halign: 'center' },
      8: { cellWidth: 28 },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body') {
        const col = hookData.column.index;
        const val = hookData.cell.raw as string;
        if (col === 3) {
          const lv = val.toLowerCase();
          if (lv === 'critical' || lv === 'high') hookData.cell.styles.textColor = C.red;
          else if (lv === 'caution') hookData.cell.styles.textColor = C.amber;
          else if (lv === 'healthy') hookData.cell.styles.textColor = C.green;
        }
        if (col === 6) {
          hookData.cell.styles.textColor = gradeColor(val);
          hookData.cell.styles.fontStyle = 'bold';
        }
        if (col === 4 || col === 5) {
          if (val.startsWith('0') === false && val !== '0 / 0') {
            hookData.cell.styles.textColor = C.orange;
          }
        }
      }
    },
    margin: { left: 15, right: 15 },
  });

  addPageNumber(doc, startPage, 99);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (doc as any).lastAutoTable.finalY + 10;
}

// ─── Security Findings ────────────────────────────────────────────────────────

function drawSecurityFindings(doc: Doc, data: FullReportData, startPage: number) {
  doc.addPage();
  addPageBg(doc);
  let y = 15;

  setTextColor(doc, C.white);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Security Findings', 15, y + 7);
  y += 20;

  // ── Vulnerability breakdown ──────────────────────────────────────────────
  y = sectionHeader(doc, y, 'Code Vulnerability Summary');

  const vulnData = [
    ['Critical', data.totals.vuln_critical, C.red],
    ['High', data.totals.vuln_high, C.orange],
    ['Medium', data.totals.vuln_medium, C.amber],
    ['Low', data.totals.vuln_low, C.blue],
  ] as [string, number, RGB][];

  const maxVuln = Math.max(1, ...vulnData.map(([, v]) => v));
  for (const [label, count, color] of vulnData) {
    setTextColor(doc, C.muted);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 20, y + 3.5);
    miniBar(doc, 48, y, 100, count, maxVuln, color);
    setTextColor(doc, color);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(String(count), 154, y + 3.5);
    y += 9;
  }
  y += 5;

  // ── Dependency vulnerability table ────────────────────────────────────────
  y = addPageIfNeeded(doc, y, 60);
  y = sectionHeader(doc, y, 'Dependency Vulnerabilities By Repository');

  const depRows = data.repositories
    .filter((r) => r.dependencies.total_findings > 0)
    .map((r) => [
      r.name.length > 24 ? r.name.slice(0, 22) + '…' : r.name,
      String(r.dependencies.total),
      String(r.dependencies.critical),
      String(r.dependencies.high),
      String(r.dependencies.medium),
      String(r.dependencies.total_findings),
      r.dependencies.ecosystems.join(', ') || '-',
    ]);

  if (depRows.length === 0) {
    setTextColor(doc, C.green);
    doc.setFontSize(8);
    doc.text('No dependency vulnerabilities detected across all repositories.', 20, y + 4);
    y += 12;
  } else {
    autoTable!(doc, {
      startY: y,
      head: [['Repository', 'Total Deps', 'Critical', 'High', 'Medium', 'Findings', 'Ecosystems']],
      body: depRows,
      theme: 'plain',
      styles: { fillColor: C.card, textColor: C.text, fontSize: 7.5, cellPadding: 2.5, lineColor: C.border, lineWidth: 0.2 },
      headStyles: { fillColor: C.border, textColor: C.blue, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [15, 22, 38] },
      columnStyles: {
        0: { cellWidth: 44 }, 1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' }, 3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' }, 5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 40 },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body') {
          if (hookData.column.index === 2 && hookData.cell.raw !== '0') hookData.cell.styles.textColor = C.red;
          if (hookData.column.index === 3 && hookData.cell.raw !== '0') hookData.cell.styles.textColor = C.orange;
        }
      },
      margin: { left: 15, right: 15 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  addPageNumber(doc, startPage, 99);
  return y;
}

// ─── Code Quality & Compliance Page ──────────────────────────────────────────

function drawQualityCompliance(doc: Doc, data: FullReportData, startPage: number) {
  doc.addPage();
  addPageBg(doc);
  let y = 15;

  setTextColor(doc, C.white);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Code Quality & Compliance', 15, y + 7);
  y += 20;

  // ── Code Quality per repo ─────────────────────────────────────────────────
  y = sectionHeader(doc, y, 'Code Quality By Repository');
  const qualRows = data.repositories.map((r) => [
    r.name.length > 28 ? r.name.slice(0, 26) + '…' : r.name,
    r.code_quality.grade,
    String(r.code_quality.total_errors),
    String(r.code_quality.total_warnings),
    String(r.code_quality.total_findings),
    r.enhancements.total > 0 ? String(r.enhancements.total) : '-',
    r.enhancements.high_impact > 0 ? String(r.enhancements.high_impact) : '-',
  ]);

  autoTable!(doc, {
    startY: y,
    head: [['Repository', 'Grade', 'Errors', 'Warnings', 'Total Findings', 'Suggestions', 'High Impact']],
    body: qualRows,
    theme: 'plain',
    styles: { fillColor: C.card, textColor: C.text, fontSize: 7.5, cellPadding: 2.5, lineColor: C.border, lineWidth: 0.2 },
    headStyles: { fillColor: C.border, textColor: C.blue, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [15, 22, 38] },
    columnStyles: {
      0: { cellWidth: 50 }, 1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' }, 3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' }, 5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 24, halign: 'center' },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body' && hookData.column.index === 1) {
        hookData.cell.styles.textColor = gradeColor(hookData.cell.raw as string);
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 15, right: 15 },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 12;

  // ── PII Findings ──────────────────────────────────────────────────────────
  y = addPageIfNeeded(doc, y, 60);
  y = sectionHeader(doc, y, 'PII / Sensitive Data Findings');
  const piiRepos = data.repositories.filter((r) => r.pii.total > 0);

  if (piiRepos.length === 0) {
    setTextColor(doc, C.green);
    doc.setFontSize(8);
    doc.text('No PII detected in any scanned repositories.', 20, y + 4);
    y += 14;
  } else {
    const piiRows = piiRepos.map((r) => [
      r.name,
      String(r.pii.total),
      String(r.pii.critical),
      r.pii.categories.join(', ') || '-',
    ]);
    autoTable!(doc, {
      startY: y,
      head: [['Repository', 'Total', 'Critical', 'Categories Detected']],
      body: piiRows,
      theme: 'plain',
      styles: { fillColor: C.card, textColor: C.text, fontSize: 7.5, cellPadding: 2.5, lineColor: C.border, lineWidth: 0.2 },
      headStyles: { fillColor: C.border, textColor: C.purple, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [15, 22, 38] },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 90 } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.column.index === 2 && hookData.cell.raw !== '0') {
          hookData.cell.styles.textColor = C.red;
        }
      },
      margin: { left: 15, right: 15 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Infrastructure issues ──────────────────────────────────────────────────
  y = addPageIfNeeded(doc, y, 60);
  y = sectionHeader(doc, y, 'Infrastructure Security (Dockerfile / GitHub Actions / K8s / Terraform)');
  const infraRepos = data.repositories.filter((r) => r.infrastructure.total > 0);

  if (infraRepos.length === 0) {
    setTextColor(doc, C.green);
    doc.setFontSize(8);
    doc.text('No infrastructure security issues detected.', 20, y + 4);
    y += 14;
  } else {
    const infraRows = infraRepos.map((r) => [
      r.name,
      String(r.infrastructure.total),
      String(r.infrastructure.critical),
      String(r.infrastructure.high),
    ]);
    autoTable!(doc, {
      startY: y,
      head: [['Repository', 'Total', 'Critical', 'High']],
      body: infraRows,
      theme: 'plain',
      styles: { fillColor: C.card, textColor: C.text, fontSize: 7.5, cellPadding: 2.5, lineColor: C.border, lineWidth: 0.2 },
      headStyles: { fillColor: C.border, textColor: C.amber, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [15, 22, 38] },
      columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 20, halign: 'center' } },
      margin: { left: 15, right: 15 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── License compliance ─────────────────────────────────────────────────────
  y = addPageIfNeeded(doc, y, 50);
  y = sectionHeader(doc, y, 'License Compliance');
  const licenseRepos = data.repositories.filter((r) => r.license.total_packages > 0);

  if (licenseRepos.length === 0) {
    setTextColor(doc, C.muted);
    doc.setFontSize(8);
    doc.text('No dependency license data available.', 20, y + 4);
    y += 14;
  } else {
    const licenseRows = licenseRepos.map((r) => [
      r.name,
      String(r.license.total_packages),
      r.license.strong_copyleft > 0 ? String(r.license.strong_copyleft) : '-',
      r.license.weak_copyleft > 0 ? String(r.license.weak_copyleft) : '-',
      r.license.strong_copyleft > 0 ? 'Review Required' : r.license.weak_copyleft > 0 ? 'Monitor' : 'OK',
    ]);
    autoTable!(doc, {
      startY: y,
      head: [['Repository', 'Packages', 'Strong Copyleft', 'Weak Copyleft', 'Status']],
      body: licenseRows,
      theme: 'plain',
      styles: { fillColor: C.card, textColor: C.text, fontSize: 7.5, cellPadding: 2.5, lineColor: C.border, lineWidth: 0.2 },
      headStyles: { fillColor: C.border, textColor: C.purple, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [15, 22, 38] },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 24, halign: 'center' }, 2: { cellWidth: 32, halign: 'center' }, 3: { cellWidth: 30, halign: 'center' }, 4: { cellWidth: 44 } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body' && hookData.column.index === 4) {
          const val = hookData.cell.raw as string;
          if (val === 'Review Required') hookData.cell.styles.textColor = C.red;
          else if (val === 'Monitor') hookData.cell.styles.textColor = C.amber;
          else hookData.cell.styles.textColor = C.green;
        }
      },
      margin: { left: 15, right: 15 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  addPageNumber(doc, startPage, 99);
}

// ─── Active Alerts Page ───────────────────────────────────────────────────────

function drawAlerts(doc: Doc, data: FullReportData, startPage: number) {
  if (data.alerts.length === 0) return;

  doc.addPage();
  addPageBg(doc);
  let y = 15;

  setTextColor(doc, C.white);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Active Alerts', 15, y + 7);
  setTextColor(doc, C.muted);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.alerts.length} active alerts require attention`, 15, y + 14);
  y += 24;

  // Severity summary badges
  const severities = ['high', 'medium', 'low'];
  let bx = 20;
  for (const sev of severities) {
    const count = data.alerts.filter((a) => a.severity === sev).length;
    setFill(doc, severityColor(sev));
    doc.roundedRect(bx, y - 1, 40, 12, 2, 2, 'F');
    setTextColor(doc, C.white);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(String(count), bx + 8, y + 7);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(sev.charAt(0).toUpperCase() + sev.slice(1), bx + 18, y + 7);
    bx += 48;
  }
  y += 18;

  const alertRows = data.alerts.slice(0, 40).map((a) => [
    a.severity.toUpperCase(),
    a.category.replace(/_/g, ' '),
    a.title.length > 55 ? a.title.slice(0, 53) + '…' : a.title,
    a.repo_name ?? 'Company-wide',
    fmtDate(a.created_at),
  ]);

  autoTable!(doc, {
    startY: y,
    head: [['Severity', 'Category', 'Alert', 'Repository', 'Date']],
    body: alertRows,
    theme: 'plain',
    styles: { fillColor: C.card, textColor: C.text, fontSize: 7.5, cellPadding: 2.5, lineColor: C.border, lineWidth: 0.2 },
    headStyles: { fillColor: C.border, textColor: C.blue, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [15, 22, 38] },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' }, 1: { cellWidth: 26 },
      2: { cellWidth: 80 }, 3: { cellWidth: 36 }, 4: { cellWidth: 24 },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body' && hookData.column.index === 0) {
        hookData.cell.styles.textColor = severityColor(hookData.cell.raw?.toString()?.toLowerCase() ?? '');
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 15, right: 15 },
  });

  addPageNumber(doc, startPage, 99);
}

// ─── Remediation Priorities ───────────────────────────────────────────────────

function drawRemediation(doc: Doc, data: FullReportData, startPage: number) {
  doc.addPage();
  addPageBg(doc);
  let y = 15;

  setTextColor(doc, C.white);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Remediation Priorities', 15, y + 7);
  y += 22;

  const priorities: Array<{ icon: string; title: string; description: string; urgency: string }> = [];

  // Generate recommendations from data
  if (data.totals.vuln_critical > 0) {
    priorities.push({
      icon: '!', title: `Fix ${data.totals.vuln_critical} critical code vulnerabilities`,
      description: 'Hardcoded secrets, code injection, and other critical issues need immediate remediation. Run a detailed scan to see per-file findings.',
      urgency: 'Fix Now',
    });
  }
  if (data.totals.dep_critical > 0) {
    priorities.push({
      icon: '!', title: `Update ${data.totals.dep_critical} critically vulnerable dependencies`,
      description: 'Run npm audit fix or update affected packages to patched versions listed in the Dependency Scan section.',
      urgency: 'Fix Now',
    });
  }
  if (data.totals.pii_total > 0) {
    priorities.push({
      icon: '⚑', title: `Remove ${data.totals.pii_total} PII finding${data.totals.pii_total > 1 ? 's' : ''} from source code`,
      description: 'Credit cards, SSNs, or other personal data detected in code. Remove immediately — GDPR, HIPAA, PCI-DSS compliance risk.',
      urgency: 'Fix Now',
    });
  }
  if (data.totals.sensitive_total > 0) {
    priorities.push({
      icon: '⚑', title: `Remove ${data.totals.sensitive_total} sensitive file${data.totals.sensitive_total > 1 ? 's' : ''} from repository`,
      description: '.env files, private keys, or credential files committed to the repo. Remove and rotate secrets immediately.',
      urgency: 'Fix Now',
    });
  }
  if (data.totals.vuln_high > 0) {
    priorities.push({
      icon: '▲', title: `Remediate ${data.totals.vuln_high} high-severity code vulnerabilities`,
      description: 'XSS, command injection, SSRF and similar findings. Review flagged files and apply fixes before next release.',
      urgency: 'This Sprint',
    });
  }
  if (data.totals.dep_high > 0) {
    priorities.push({
      icon: '▲', title: `Update ${data.totals.dep_high} high-severity vulnerable packages`,
      description: 'Schedule dependency updates as part of the current sprint. Use npm update or yarn upgrade for affected packages.',
      urgency: 'This Sprint',
    });
  }
  if (data.totals.infra_total > 0) {
    priorities.push({
      icon: '▲', title: `Fix ${data.totals.infra_total} infrastructure security issue${data.totals.infra_total > 1 ? 's' : ''}`,
      description: 'Dockerfile, GitHub Actions, Kubernetes, or Terraform misconfigurations detected. Review IaC files for hardening opportunities.',
      urgency: 'This Sprint',
    });
  }
  if (data.totals.quality_errors > 0) {
    priorities.push({
      icon: '○', title: `Address ${data.totals.quality_errors} code quality errors`,
      description: 'Empty catch blocks, unreachable code, and other quality issues reduce maintainability. Address systematically.',
      urgency: 'Backlog',
    });
  }

  const urgencyGroups = ['Fix Now', 'This Sprint', 'Backlog'];
  const urgencyColors: Record<string, RGB> = { 'Fix Now': C.red, 'This Sprint': C.amber, 'Backlog': C.blue };

  for (const group of urgencyGroups) {
    const items = priorities.filter((p) => p.urgency === group);
    if (items.length === 0) continue;

    y = addPageIfNeeded(doc, y, 20 + items.length * 22);

    // Group header
    setFill(doc, urgencyColors[group]);
    doc.roundedRect(15, y, 180, 7, 2, 2, 'F');
    setTextColor(doc, C.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(group.toUpperCase(), 20, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${items.length} item${items.length > 1 ? 's' : ''}`, 185, y + 5, { align: 'right' });
    y += 11;

    for (const item of items) {
      y = addPageIfNeeded(doc, y, 20);
      setFill(doc, C.card);
      doc.roundedRect(15, y, 180, 16, 2, 2, 'F');
      setFill(doc, urgencyColors[group]);
      doc.roundedRect(15, y, 3, 16, 1, 1, 'F');

      setTextColor(doc, C.white);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(item.title, 22, y + 5.5);
      setTextColor(doc, C.muted);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const wrapped = doc.splitTextToSize(item.description, 166);
      doc.text(wrapped[0], 22, y + 11.5);
      y += 19;
    }
    y += 4;
  }

  if (priorities.length === 0) {
    setTextColor(doc, C.green);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Excellent! No critical remediation items found.', 105, y + 20, { align: 'center' });
    setTextColor(doc, C.muted);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Continue monitoring and scanning regularly to maintain this status.', 105, y + 30, { align: 'center' });
  }

  addPageNumber(doc, startPage, 99);
}

// ─── Main Generator ───────────────────────────────────────────────────────────

export async function generatePdfReport(data: FullReportData, filename?: string): Promise<void> {
  await loadLibs();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  drawCoverPage(doc, data);
  drawRepoOverview(doc, data, 2);
  drawSecurityFindings(doc, data, 3);
  drawQualityCompliance(doc, data, 4);
  drawAlerts(doc, data, 5);
  drawRemediation(doc, data, 6);

  // Fix page numbers now that we know total count
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    // Repaint the footer area
    setFill(doc, C.bg);
    doc.rect(0, 285, 210, 12, 'F');
    setTextColor(doc, C.muted);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`CodeGuard AI  |  ${data.company_name}  |  Page ${i} of ${total}`, 105, 291, { align: 'center' });
    setDraw(doc, C.border);
    doc.setLineWidth(0.3);
    doc.line(15, 288, 195, 288);
  }

  const name = filename ?? `codeguard-report-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(name);
}
