import PDFDocument from 'pdfkit';
import { reportingService } from './reporting.service';
import { logger } from '../utils/logger';
import { format } from 'date-fns';
import { DashboardMetrics, FinancialSummary } from '../types';

interface PDFReportOptions {
  tenantId: string;
  period?: string;
  startDate?: Date;
  endDate?: Date;
}

interface CompanyBranding {
  name: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
}

class PDFExportService {
  private readonly DEFAULT_BRANDING: CompanyBranding = {
    name: 'UBI-CMS Platform',
    primaryColor: '#1E40AF',
    secondaryColor: '#3B82F6'
  };

  private readonly PAGE_MARGINS = {
    top: 50,
    bottom: 50,
    left: 50,
    right: 50
  };

  async generateDashboardPDF(options: PDFReportOptions): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({
          size: 'A4',
          margin: this.PAGE_MARGINS.top,
          bufferPages: true
        });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const period = options.period || '30d';
        const branding = this.DEFAULT_BRANDING;

        // Fetch data
        const [metrics, financial] = await Promise.all([
          reportingService.getDashboardMetrics(options.tenantId),
          reportingService.getFinancialSummary(options.tenantId, period)
        ]);

        // Build PDF
        this.addHeader(doc, branding);
        this.addTitle(doc, 'Dashboard Report');
        this.addReportMetadata(doc, period);
        this.addMetricsSection(doc, metrics);
        this.addFinancialSection(doc, financial);
        this.addTreasurySection(doc, financial);
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        logger.error('Failed to generate dashboard PDF', { tenantId: options.tenantId, error });
        reject(error);
      }
    });
  }

  private addHeader(doc: PDFKit.PDFDocument, branding: CompanyBranding): void {
    const width = doc.page.width;

    // Header background
    doc
      .fillColor(branding.primaryColor)
      .rect(0, 0, width, 80)
      .fill();

    // Company name
    doc
      .fillColor('#FFFFFF')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(branding.name, this.PAGE_MARGINS.left, 30);

    // Tagline
    doc
      .fillColor('#E0E7FF')
      .fontSize(10)
      .font('Helvetica')
      .text('Sovereign Economic Management', this.PAGE_MARGINS.left, 55);

    doc.moveDown(4);
  }

  private addTitle(doc: PDFKit.PDFDocument, title: string): void {
    doc
      .fillColor('#1F2937')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(title, this.PAGE_MARGINS.left, 100);

    doc.moveDown(1);
  }

  private addReportMetadata(doc: PDFKit.PDFDocument, period: string): void {
    const generationDate = format(new Date(), 'MMMM d, yyyy \'at\' h:mm a');
    const periodLabel = this.getPeriodLabel(period);

    doc
      .fillColor('#6B7280')
      .fontSize(10)
      .font('Helvetica')
      .text(`Report Period: ${periodLabel}`, this.PAGE_MARGINS.left, 140)
      .text(`Generated: ${generationDate}`, this.PAGE_MARGINS.left)
      .text(`Document Type: Executive Summary`, this.PAGE_MARGINS.left);

    this.addDivider(doc, 170);
  }

  private addMetricsSection(doc: PDFKit.PDFDocument, metrics: DashboardMetrics): void {
    doc
      .fillColor(this.DEFAULT_BRANDING.primaryColor)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Key Performance Metrics', this.PAGE_MARGINS.left, 185);

    const startY = 215;
    const colWidth = 250;
    const rowHeight = 25;

    // Metric cards - 2 columns layout
    const metricsData = [
      { label: 'Total Users', value: metrics.total_users.toLocaleString(), icon: '👥' },
      { label: 'Active Users (30d)', value: metrics.active_users_30d.toLocaleString(), icon: '📈' },
      { label: 'Total UBI Distributed', value: `$${parseFloat(metrics.total_ubi_distributed).toLocaleString()}`, icon: '💰' },
      { label: 'UBI (30d)', value: `$${parseFloat(metrics.ubi_distributed_30d).toLocaleString()}`, icon: '📊' },
      { label: 'Tasks Completed', value: metrics.total_tasks_completed.toLocaleString(), icon: '✅' },
      { label: 'Tasks (30d)', value: metrics.tasks_completed_30d.toLocaleString(), icon: '🎯' },
      { label: 'Treasury Balance', value: `$${parseFloat(metrics.treasury_balance).toLocaleString()}`, icon: '🏦' },
      { label: 'Treasury APY', value: `${metrics.treasury_apy.toFixed(2)}%`, icon: '📈' },
      { label: 'Platform Revenue', value: `$${parseFloat(metrics.platform_revenue).toLocaleString()}`, icon: '💵' },
      { label: 'Total Rewards Issued', value: `$${parseFloat(metrics.total_rewards_issued).toLocaleString()}`, icon: '🎁' }
    ];

    metricsData.forEach((metric, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = this.PAGE_MARGINS.left + (col * colWidth);
      const y = startY + (row * rowHeight);

      // Metric card background
      doc
        .fillColor('#F9FAFB')
        .rect(x, y, colWidth - 10, rowHeight - 5)
        .fill();

      // Metric label
      doc
        .fillColor('#6B7280')
        .fontSize(9)
        .font('Helvetica')
        .text(metric.label, x + 10, y + 5, { width: colWidth - 20 });

      // Metric value
      doc
        .fillColor('#1F2937')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(metric.value, x + 10, y + 15, { width: colWidth - 20 });
    });
  }

  private addFinancialSection(doc: PDFKit.PDFDocument, financial: FinancialSummary): void {
    const startY = this.checkPageSpace(doc, 300);

    doc
      .fillColor(this.DEFAULT_BRANDING.primaryColor)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Financial Summary', this.PAGE_MARGINS.left, startY);

    // Summary cards
    const summaryY = startY + 30;

    // Revenue card
    this.addSummaryCard(doc, this.PAGE_MARGINS.left, summaryY, 'Total Revenue', `$${parseFloat(financial.total_revenue).toLocaleString()}`, '#059669');

    // Expenses card
    this.addSummaryCard(doc, this.PAGE_MARGINS.left + 170, summaryY, 'Total Expenses', `$${parseFloat(financial.total_expenses).toLocaleString()}`, '#DC2626');

    // Profit/Loss card
    const profitLoss = parseFloat(financial.profit_loss);
    const profitColor = profitLoss >= 0 ? '#059669' : '#DC2626';
    this.addSummaryCard(doc, this.PAGE_MARGINS.left + 340, summaryY, 'Profit/Loss', `$${profitLoss.toLocaleString()}`, profitColor);

    // Revenue by source table
    if (financial.revenue_by_source && financial.revenue_by_source.length > 0) {
      const tableY = summaryY + 70;

      doc
        .fillColor('#374151')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Revenue by Source', this.PAGE_MARGINS.left, tableY);

      this.addSimpleTable(doc, this.PAGE_MARGINS.left, tableY + 25, [
        ['Source', 'Amount', 'Transactions', '%'],
        ...financial.revenue_by_source.map(r => [
          r.source,
          `$${parseFloat(r.amount).toLocaleString()}`,
          r.transactions.toString(),
          `${r.percentage.toFixed(1)}%`
        ])
      ]);
    }

    // Expense by category table
    if (financial.expense_by_category && financial.expense_by_category.length > 0) {
      const tableY = this.checkPageSpace(doc, 100);

      doc
        .fillColor('#374151')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Expenses by Category', this.PAGE_MARGINS.left, tableY);

      this.addSimpleTable(doc, this.PAGE_MARGINS.left, tableY + 25, [
        ['Category', 'Amount', 'Transactions', '%'],
        ...financial.expense_by_category.map(e => [
          e.category,
          `$${parseFloat(e.amount).toLocaleString()}`,
          e.transactions.toString(),
          `${e.percentage.toFixed(1)}%`
        ])
      ]);
    }
  }

  private addTreasurySection(doc: PDFKit.PDFDocument, financial: FinancialSummary): void {
    const startY = this.checkPageSpace(doc, 200);
    const treasury = financial.treasury_performance;

    doc
      .fillColor(this.DEFAULT_BRANDING.primaryColor)
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Treasury Performance', this.PAGE_MARGINS.left, startY);

    const metricsY = startY + 30;

    // Treasury metrics row
    this.addMetricBox(doc, this.PAGE_MARGINS.left, metricsY, 'Total Value', `$${parseFloat(treasury.total_value).toLocaleString()}`);
    this.addMetricBox(doc, this.PAGE_MARGINS.left + 150, metricsY, 'APY', `${treasury.apy.toFixed(2)}%`);
    this.addMetricBox(doc, this.PAGE_MARGINS.left + 300, metricsY, '30d Yield', `$${parseFloat(treasury.yield_30d).toLocaleString()}`);

    // Allocations table
    if (treasury.allocations && treasury.allocations.length > 0) {
      const tableY = metricsY + 60;

      doc
        .fillColor('#374151')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text('Protocol Allocations', this.PAGE_MARGINS.left, tableY);

      this.addSimpleTable(doc, this.PAGE_MARGINS.left, tableY + 25, [
        ['Protocol', 'Amount', 'Allocation', 'APY', 'Risk'],
        ...treasury.allocations.map(a => [
          a.protocol,
          `$${parseFloat(a.amount).toLocaleString()}`,
          `${a.percentage.toFixed(1)}%`,
          `${a.apy.toFixed(2)}%`,
          a.risk_level
        ])
      ]);
    }
  }

  private addSummaryCard(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string, color: string): void {
    // Card background
    doc
      .fillColor('#F3F4F6')
      .rect(x, y, 160, 60)
      .fill();

    // Color accent bar
    doc
      .fillColor(color)
      .rect(x, y, 4, 60)
      .fill();

    // Label
    doc
      .fillColor('#6B7280')
      .fontSize(9)
      .font('Helvetica')
      .text(label, x + 12, y + 10);

    // Value
    doc
      .fillColor('#1F2937')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(value, x + 12, y + 28);
  }

  private addMetricBox(doc: PDFKit.PDFDocument, x: number, y: number, label: string, value: string): void {
    doc
      .fillColor('#EEF2FF')
      .rect(x, y, 140, 50)
      .fill();

    doc
      .fillColor('#6B7280')
      .fontSize(9)
      .font('Helvetica')
      .text(label, x + 10, y + 8);

    doc
      .fillColor(this.DEFAULT_BRANDING.primaryColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(value, x + 10, y + 22);
  }

  private addSimpleTable(doc: PDFKit.PDFDocument, x: number, y: number, rows: string[][]): void {
    const colWidths = [120, 100, 90, 70];
    const rowHeight = 22;
    const headerHeight = 28;

    // Draw header
    doc
      .fillColor(this.DEFAULT_BRANDING.primaryColor)
      .rect(x, y, colWidths.reduce((a, b) => a + b, 0), headerHeight)
      .fill();

    doc
      .fillColor('#FFFFFF')
      .fontSize(9)
      .font('Helvetica-Bold');

    let headerX = x + 8;
    rows[0].forEach((cell, i) => {
      doc.text(cell, headerX, y + 10, { width: colWidths[i] - 16 });
      headerX += colWidths[i];
    });

    // Draw data rows
    rows.slice(1).forEach((row, rowIndex) => {
      const rowY = y + headerHeight + (rowIndex * rowHeight);
      const bgColor = rowIndex % 2 === 0 ? '#FFFFFF' : '#F9FAFB';

      doc
        .fillColor(bgColor)
        .rect(x, rowY, colWidths.reduce((a, b) => a + b, 0), rowHeight)
        .fill();

      doc
        .fillColor('#374151')
        .fontSize(9)
        .font('Helvetica');

      let cellX = x + 8;
      row.forEach((cell, i) => {
        doc.text(cell, cellX, rowY + 7, { width: colWidths[i] - 16 });
        cellX += colWidths[i];
      });
    });

    // Border
    doc
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .rect(x, y, colWidths.reduce((a, b) => a + b, 0), headerHeight + (rowHeight * (rows.length - 1)))
      .stroke();
  }

  private addFooter(doc: PDFKit.PDFDocument): void {
    const range = doc.bufferedPageRange();
    const width = doc.page.width;

    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);

      // Footer line
      doc
        .strokeColor(this.DEFAULT_BRANDING.primaryColor)
        .lineWidth(2)
        .moveTo(this.PAGE_MARGINS.left, doc.page.height - 40)
        .lineTo(width - this.PAGE_MARGINS.right, doc.page.height - 40)
        .stroke();

      // Page number
      doc
        .fillColor('#6B7280')
        .fontSize(9)
        .font('Helvetica')
        .text(
          `Page ${i + 1} of ${range.count}`,
          this.PAGE_MARGINS.left,
          doc.page.height - 30,
          { align: 'center', width: width - this.PAGE_MARGINS.left - this.PAGE_MARGINS.right }
        );

      // Confidentiality notice
      doc
        .fillColor('#9CA3AF')
        .fontSize(8)
        .text(
          'CONFIDENTIAL - For internal use only',
          this.PAGE_MARGINS.left,
          doc.page.height - 20
        );
    }
  }

  private addDivider(doc: PDFKit.PDFDocument, y: number): void {
    doc
      .strokeColor('#E5E7EB')
      .lineWidth(1)
      .moveTo(this.PAGE_MARGINS.left, y)
      .lineTo(doc.page.width - this.PAGE_MARGINS.right, y)
      .stroke();
  }

  private getPeriodLabel(period: string): string {
    if (period.endsWith('d')) {
      const days = parseInt(period.slice(0, -1));
      return `Last ${days} day${days > 1 ? 's' : ''}`;
    } else if (period.endsWith('m')) {
      const months = parseInt(period.slice(0, -1));
      return `Last ${months} month${months > 1 ? 's' : ''}`;
    }
    return `Last ${period}`;
  }

  private checkPageSpace(doc: PDFKit.PDFDocument, requiredSpace: number): number {
    const currentY = doc.y;
    const pageHeight = doc.page.height - this.PAGE_MARGINS.bottom;

    if (currentY + requiredSpace > pageHeight) {
      doc.addPage();
      return this.PAGE_MARGINS.top;
    }

    return currentY + 20;
  }
}

export const pdfExportService = new PDFExportService();
