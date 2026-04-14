import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { sanitizeForPdf } from './quoteGenerator';

export interface UnderwritingPdfData {
  dealName: string;
  borrowerName: string;
  propertyAddress: string;
  loanAmount: number;
  loanType: string;
  programName: string;
  score: number;
  overallLikelihood: string;
  generatedAt: string;
  dealSummary: any;
  report: any;
}

function likelihoodColor(likelihood: string): { r: number; g: number; b: number } {
  switch (likelihood?.toLowerCase()) {
    case 'high':     return { r: 0.06, g: 0.60, b: 0.35 }; // emerald
    case 'medium':   return { r: 0.85, g: 0.50, b: 0.04 }; // amber
    case 'low':      return { r: 0.92, g: 0.35, b: 0.12 }; // orange
    case 'unlikely': return { r: 0.86, g: 0.15, b: 0.15 }; // red
    default:         return { r: 0.40, g: 0.40, b: 0.40 };
  }
}

function statusColor(status: string): { r: number; g: number; b: number } {
  switch (status?.toLowerCase()) {
    case 'pass':              return { r: 0.06, g: 0.60, b: 0.35 };
    case 'fail':              return { r: 0.86, g: 0.15, b: 0.15 };
    case 'warning':           return { r: 0.85, g: 0.50, b: 0.04 };
    case 'insufficient_data': return { r: 0.40, g: 0.40, b: 0.40 };
    default:                  return { r: 0.40, g: 0.40, b: 0.40 };
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const words = sanitizeForPdf(text).split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

export async function generateUnderwritingReportPdf(data: UnderwritingPdfData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  // ── Helper: add a new page ────────────────────────────────────────────────
  const addPage = () => {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    return { page, y: pageHeight - margin };
  };

  // ── Helper: draw text with auto-wrap, returns new y ──────────────────────
  const drawText = (
    page: ReturnType<typeof pdfDoc.addPage>,
    text: string,
    x: number,
    y: number,
    opts: { size?: number; font?: typeof helvetica; color?: { r: number; g: number; b: number }; maxWidth?: number } = {}
  ): number => {
    const { size = 9, font = helvetica, color = { r: 0.1, g: 0.1, b: 0.1 }, maxWidth = contentWidth } = opts;
    const charsPerLine = Math.floor(maxWidth / (size * 0.52));
    const lines = wrapText(String(text || ''), charsPerLine);
    for (const line of lines) {
      page.drawText(line, { x, y, size, font, color: rgb(color.r, color.g, color.b) });
      y -= size + 3;
    }
    return y;
  };

  // ── Helper: section header ────────────────────────────────────────────────
  const drawSectionHeader = (page: ReturnType<typeof pdfDoc.addPage>, label: string, y: number): number => {
    page.drawRectangle({ x: margin, y: y - 2, width: contentWidth, height: 16, color: rgb(0.94, 0.95, 0.97) });
    page.drawText(sanitizeForPdf(label.toUpperCase()), {
      x: margin + 4, y: y + 1, size: 8, font: helveticaBold, color: rgb(0.25, 0.30, 0.45),
    });
    return y - 20;
  };

  // ── Helper: check remaining space, add page if needed ────────────────────
  let currentPage = addPage();
  const ensureSpace = (needed: number): void => {
    if (currentPage.y - needed < margin + 20) {
      currentPage = addPage();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Cover
  // ═══════════════════════════════════════════════════════════════════════════
  let { page, y } = currentPage;

  // Header bar
  page.drawRectangle({ x: 0, y: pageHeight - 72, width: pageWidth, height: 72, color: rgb(0.10, 0.14, 0.28) });
  page.drawText('UNDERWRITING REPORT', { x: margin, y: pageHeight - 32, size: 18, font: helveticaBold, color: rgb(1, 1, 1) });
  page.drawText('Confidential — For Internal Use Only', { x: margin, y: pageHeight - 52, size: 9, font: helvetica, color: rgb(0.70, 0.75, 0.90) });
  page.drawText(sanitizeForPdf(data.generatedAt), { x: pageWidth - margin - 120, y: pageHeight - 52, size: 9, font: helvetica, color: rgb(0.70, 0.75, 0.90) });

  y = pageHeight - 100;

  // Deal meta block
  const metaItems = [
    { label: 'Deal', value: data.dealName },
    { label: 'Borrower', value: data.borrowerName },
    { label: 'Property', value: data.propertyAddress },
    { label: 'Loan Amount', value: `$${data.loanAmount?.toLocaleString?.() ?? data.loanAmount}` },
    { label: 'Loan Type', value: data.loanType },
    { label: 'Program', value: data.programName || 'N/A' },
  ];
  for (const item of metaItems) {
    page.drawText(sanitizeForPdf(item.label) + ':', { x: margin, y, size: 9, font: helveticaBold, color: rgb(0.40, 0.40, 0.40) });
    page.drawText(sanitizeForPdf(String(item.value || '')), { x: margin + 90, y, size: 9, font: helvetica, color: rgb(0.10, 0.10, 0.10) });
    y -= 14;
  }

  y -= 12;

  // Score banner
  const scoreColor = data.score >= 70 ? { r: 0.06, g: 0.60, b: 0.35 } : data.score >= 45 ? { r: 0.85, g: 0.50, b: 0.04 } : { r: 0.86, g: 0.15, b: 0.15 };
  const lhColor = likelihoodColor(data.overallLikelihood);
  page.drawRectangle({ x: margin, y: y - 44, width: contentWidth, height: 54, color: rgb(0.97, 0.97, 0.99) });
  page.drawRectangle({ x: margin, y: y - 44, width: 4, height: 54, color: rgb(lhColor.r, lhColor.g, lhColor.b) });
  page.drawText('UNDERWRITING SCORE', { x: margin + 12, y: y - 10, size: 8, font: helveticaBold, color: rgb(0.40, 0.40, 0.40) });
  page.drawText(`${data.score ?? '--'} / 100`, { x: margin + 12, y: y - 26, size: 20, font: helveticaBold, color: rgb(scoreColor.r, scoreColor.g, scoreColor.b) });
  page.drawText('LIKELIHOOD', { x: margin + 140, y: y - 10, size: 8, font: helveticaBold, color: rgb(0.40, 0.40, 0.40) });
  page.drawText(sanitizeForPdf((data.overallLikelihood || 'N/A').toUpperCase()), { x: margin + 140, y: y - 26, size: 14, font: helveticaBold, color: rgb(lhColor.r, lhColor.g, lhColor.b) });

  y -= 62;

  // ── Summary ───────────────────────────────────────────────────────────────
  const reportData = data.report?.underwritingReport || data.report || {};
  const summary = reportData.summary || reportData.recommendation || '';
  if (summary) {
    y -= 8;
    y = drawSectionHeader(page, 'Executive Summary', y);
    y = drawText(page, summary, margin, y, { size: 9, maxWidth: contentWidth });
    y -= 8;
  }

  // ── Policy Checks ─────────────────────────────────────────────────────────
  const checks: any[] = reportData.policyChecks || [];
  if (checks.length > 0) {
    ensureSpace(30);
    ({ page, y } = currentPage);
    y -= 4;
    y = drawSectionHeader(page, 'Policy Check Results', y);

    for (const check of checks) {
      ensureSpace(28);
      ({ page, y } = currentPage);

      const statusLabel = (check.status || 'unknown').toUpperCase().replace(/_/g, ' ');
      const sColor = statusColor(check.status || '');

      // Row background
      const rowHeight = 22;
      page.drawRectangle({ x: margin, y: y - rowHeight + 4, width: contentWidth, height: rowHeight, color: rgb(0.985, 0.985, 0.985) });

      // Status pill
      page.drawRectangle({ x: margin + contentWidth - 80, y: y - 14, width: 72, height: 14, color: rgb(sColor.r, sColor.g, sColor.b) });
      page.drawText(statusLabel, { x: margin + contentWidth - 76, y: y - 11, size: 7, font: helveticaBold, color: rgb(1, 1, 1) });

      page.drawText(sanitizeForPdf(String(check.rule || '')), { x: margin + 4, y, size: 8, font: helveticaBold, color: rgb(0.15, 0.15, 0.15) });
      if (check.detail) {
        y = drawText(page, check.detail, margin + 4, y - 11, { size: 7.5, color: { r: 0.35, g: 0.35, b: 0.35 }, maxWidth: contentWidth - 90 });
      } else {
        y -= 11;
      }
      y -= 8;
    }
  }

  // ── Strengths ─────────────────────────────────────────────────────────────
  const strengths: string[] = reportData.strengths || [];
  if (strengths.length > 0) {
    ensureSpace(30 + strengths.length * 14);
    ({ page, y } = currentPage);
    y = drawSectionHeader(page, 'Strengths', y);
    for (const s of strengths) {
      ensureSpace(16);
      ({ page, y } = currentPage);
      page.drawText('+', { x: margin + 2, y, size: 9, font: helveticaBold, color: rgb(0.06, 0.60, 0.35) });
      y = drawText(page, s, margin + 14, y, { size: 9, maxWidth: contentWidth - 14 });
      y -= 2;
    }
    y -= 6;
  }

  // ── Conditions ────────────────────────────────────────────────────────────
  const conditions: string[] = reportData.conditions || [];
  if (conditions.length > 0) {
    ensureSpace(30 + conditions.length * 14);
    ({ page, y } = currentPage);
    y = drawSectionHeader(page, 'Conditions', y);
    for (const c of conditions) {
      ensureSpace(16);
      ({ page, y } = currentPage);
      page.drawText('!', { x: margin + 2, y, size: 9, font: helveticaBold, color: rgb(0.85, 0.50, 0.04) });
      y = drawText(page, c, margin + 14, y, { size: 9, maxWidth: contentWidth - 14 });
      y -= 2;
    }
    y -= 6;
  }

  // ── Deal Breakers ─────────────────────────────────────────────────────────
  const dealBreakers: string[] = reportData.dealBreakers || [];
  if (dealBreakers.length > 0) {
    ensureSpace(30 + dealBreakers.length * 14);
    ({ page, y } = currentPage);
    y = drawSectionHeader(page, 'Deal Breakers', y);
    for (const d of dealBreakers) {
      ensureSpace(16);
      ({ page, y } = currentPage);
      page.drawText('x', { x: margin + 2, y, size: 9, font: helveticaBold, color: rgb(0.86, 0.15, 0.15) });
      y = drawText(page, d, margin + 14, y, { size: 9, maxWidth: contentWidth - 14 });
      y -= 2;
    }
    y -= 6;
  }

  // ── Missing Data ──────────────────────────────────────────────────────────
  const missingData: string[] = reportData.missingData || [];
  if (missingData.length > 0) {
    ensureSpace(30 + missingData.length * 14);
    ({ page, y } = currentPage);
    y = drawSectionHeader(page, 'Missing / Insufficient Data', y);
    for (const m of missingData) {
      ensureSpace(16);
      ({ page, y } = currentPage);
      page.drawText('-', { x: margin + 2, y, size: 9, font: helveticaBold, color: rgb(0.40, 0.40, 0.40) });
      y = drawText(page, m, margin + 14, y, { size: 9, maxWidth: contentWidth - 14 });
      y -= 2;
    }
    y -= 6;
  }

  // ── Next Steps ────────────────────────────────────────────────────────────
  const nextSteps: string[] = reportData.nextSteps || [];
  if (nextSteps.length > 0) {
    ensureSpace(30 + nextSteps.length * 14);
    ({ page, y } = currentPage);
    y = drawSectionHeader(page, 'Recommended Next Steps', y);
    nextSteps.forEach((step, i) => {
      ensureSpace(16);
      ({ page, y } = currentPage);
      page.drawText(`${i + 1}.`, { x: margin + 2, y, size: 9, font: helveticaBold, color: rgb(0.20, 0.30, 0.60) });
      y = drawText(page, step, margin + 18, y, { size: 9, maxWidth: contentWidth - 18 });
      y -= 2;
    });
    y -= 6;
  }

  // ── Recommendation ────────────────────────────────────────────────────────
  const recommendation = reportData.recommendation || '';
  if (recommendation) {
    ensureSpace(60);
    ({ page, y } = currentPage);
    y = drawSectionHeader(page, 'Underwriter Recommendation', y);
    page.drawRectangle({ x: margin, y: y - 8, width: contentWidth, height: (recommendation.length / 80 + 1) * 13 + 16, color: rgb(0.96, 0.97, 1.0) });
    y = drawText(page, recommendation, margin + 8, y, { size: 9, font: helveticaBold, maxWidth: contentWidth - 16 });
    y -= 12;
  }

  // ── Deal Summary (compact) ────────────────────────────────────────────────
  const summaryData = data.dealSummary?.dealSummary || data.dealSummary || {};
  const summaryKeys = ['borrower', 'loan', 'property', 'financials'];
  for (const key of summaryKeys) {
    const section = summaryData[key];
    if (!section || typeof section !== 'object') continue;
    ensureSpace(40);
    ({ page, y } = currentPage);
    y = drawSectionHeader(page, `Deal Summary — ${key.charAt(0).toUpperCase() + key.slice(1)}`, y);
    for (const [k, v] of Object.entries(section)) {
      if (!v) continue;
      ensureSpace(14);
      ({ page, y } = currentPage);
      page.drawText(sanitizeForPdf(k.replace(/_/g, ' ')) + ':', { x: margin + 4, y, size: 8, font: helveticaBold, color: rgb(0.30, 0.30, 0.30) });
      y = drawText(page, String(v), margin + 130, y, { size: 8, maxWidth: contentWidth - 134 });
      y -= 1;
    }
    y -= 6;
  }

  // ── Footer on each page ───────────────────────────────────────────────────
  const pages = pdfDoc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Lendry.AI Underwriting Report  |  Page ${i + 1} of ${pages.length}  |  Confidential`, {
      x: margin, y: 24, size: 7, font: helvetica, color: rgb(0.60, 0.60, 0.60),
    });
    p.drawLine({ start: { x: margin, y: 34 }, end: { x: pageWidth - margin, y: 34 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
