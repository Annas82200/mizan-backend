/**
 * Skills Report Generation Service
 * Generates PDF and Excel reports for skills gap analysis
 */

import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

// Types for Skills Report Data
interface SkillGap {
  id: string;
  skillName: string;
  category: string;
  requiredLevel: string;
  currentLevel: string;
  gapSeverity: 'critical' | 'high' | 'medium' | 'low';
  affectedEmployees: number;
  recommendations: string[];
  estimatedTrainingTime?: string;
}

interface SkillsReportData {
  reportType: 'organization' | 'department';
  departmentName?: string;
  totalEmployees: number;
  assessedEmployees: number;
  criticalGaps: SkillGap[];
  allGaps: SkillGap[];
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  generatedAt: Date;
  generatedBy?: string;
}

/**
 * Generate PDF report for skills analysis
 */
export async function generateSkillsReportPDF(data: SkillsReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Skills Gap Analysis Report - ${data.reportType}`,
          Author: 'Mizan Platform',
          Subject: 'Skills Gap Analysis'
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // === PAGE 1: OVERVIEW ===

      // Header with Mizan branding
      doc.fontSize(24)
         .fillColor('#3F3D56')
         .text('Skills Gap Analysis Report', 50, 50);

      doc.fontSize(14)
         .fillColor('#545454')
         .text(data.reportType === 'organization' ? 'Organization-Wide Analysis' : `Department: ${data.departmentName}`, 50, 85);

      doc.fontSize(10)
         .fillColor('#A0A0A0')
         .text(`Generated: ${data.generatedAt.toLocaleDateString()} at ${data.generatedAt.toLocaleTimeString()}`, 50, 105);

      // Overview Statistics Box
      doc.moveDown(2);
      doc.fontSize(16)
         .fillColor('#3F3D56')
         .text('Overview Statistics', 50, 140);

      // Stats grid
      const statsY = 170;
      doc.fontSize(12)
         .fillColor('#545454');

      doc.text(`Total Employees: ${data.totalEmployees}`, 70, statsY);
      doc.text(`Assessed Employees: ${data.assessedEmployees}`, 70, statsY + 20);
      doc.text(`Assessment Coverage: ${Math.round((data.assessedEmployees / data.totalEmployees) * 100)}%`, 70, statsY + 40);
      doc.text(`Total Skills Gaps: ${data.allGaps.length}`, 70, statsY + 60);
      doc.text(`Critical Gaps: ${data.bySeverity.critical}`, 70, statsY + 80);

      // Severity Breakdown Visualization
      doc.moveDown(8);
      doc.fontSize(16)
         .fillColor('#3F3D56')
         .text('Gap Severity Breakdown', 50, 310);

      const severityY = 340;
      const severityData = [
        { label: 'Critical', count: data.bySeverity.critical, color: '#DC2626' },
        { label: 'High', count: data.bySeverity.high, color: '#EA580C' },
        { label: 'Medium', count: data.bySeverity.medium, color: '#CCA404' },
        { label: 'Low', count: data.bySeverity.low, color: '#4CB3A9' }
      ];

      severityData.forEach((item, index) => {
        const y = severityY + (index * 35);

        // Severity bar
        doc.rect(70, y, 200, 20)
           .fillAndStroke('#E2E8F0', '#E2E8F0');

        const maxCount = Math.max(...severityData.map(d => d.count));
        const barWidth = maxCount > 0 ? (item.count / maxCount) * 200 : 0;

        doc.rect(70, y, barWidth, 20)
           .fillAndStroke(item.color, item.color);

        // Label and count
        doc.fontSize(11)
           .fillColor('#545454')
           .text(item.label, 280, y + 5);

        doc.fontSize(11)
           .fillColor(item.color)
           .text(String(item.count), 350, y + 5);
      });

      // === PAGE 2: CRITICAL GAPS ===
      doc.addPage();

      doc.fontSize(20)
         .fillColor('#3F3D56')
         .text('Critical Skills Gaps', 50, 50);

      doc.fontSize(11)
         .fillColor('#A0A0A0')
         .text('These gaps require immediate attention and training intervention', 50, 78);

      if (data.criticalGaps && data.criticalGaps.length > 0) {
        let currentY = 110;
        const pageHeight = 750;

        data.criticalGaps.forEach((gap, index) => {
          // Check if we need a new page
          if (currentY > pageHeight - 150) {
            doc.addPage();
            currentY = 50;
          }

          // Gap card background
          doc.rect(50, currentY, 495, 100)
             .fillAndStroke('#FEF2F2', '#FEE2E2');

          // Severity badge
          doc.fontSize(9)
             .fillColor('#DC2626')
             .text(`${gap.gapSeverity.toUpperCase()}`, 460, currentY + 10);

          // Skill name
          doc.fontSize(13)
             .fillColor('#3F3D56')
             .text(gap.skillName, 60, currentY + 10);

          // Category
          doc.fontSize(10)
             .fillColor('#7C3AED')
             .text(`Category: ${gap.category}`, 60, currentY + 30);

          // Level gap
          doc.fontSize(10)
             .fillColor('#545454')
             .text(`Gap: ${gap.currentLevel} → ${gap.requiredLevel}`, 60, currentY + 48);

          // Affected employees
          doc.fontSize(10)
             .fillColor('#DC2626')
             .text(`${gap.affectedEmployees} employees affected`, 60, currentY + 66);

          // Training time estimate
          if (gap.estimatedTrainingTime) {
            doc.fontSize(9)
               .fillColor('#A0A0A0')
               .text(`Est. Training: ${gap.estimatedTrainingTime}`, 60, currentY + 82);
          }

          currentY += 115;
        });
      } else {
        doc.fontSize(12)
           .fillColor('#4CB3A9')
           .text('No critical gaps identified! Your team is well-aligned with required skills.', 50, 110);
      }

      // === PAGE 3: ALL GAPS SUMMARY ===
      if (data.allGaps && data.allGaps.length > 0) {
        doc.addPage();

        doc.fontSize(20)
           .fillColor('#3F3D56')
           .text('Complete Skills Gap Analysis', 50, 50);

        doc.fontSize(11)
           .fillColor('#A0A0A0')
           .text(`All identified skills gaps (${data.allGaps.length} total)`, 50, 78);

        // Table header
        let tableY = 110;
        doc.fontSize(10)
           .fillColor('#3F3D56')
           .text('Skill', 50, tableY)
           .text('Category', 200, tableY)
           .text('Gap', 310, tableY)
           .text('Severity', 400, tableY)
           .text('Affected', 480, tableY);

        doc.moveTo(50, tableY + 15)
           .lineTo(545, tableY + 15)
           .stroke('#E2E8F0');

        tableY += 25;

        const pageHeight = 750;
        doc.fontSize(9)
           .fillColor('#545454');

        data.allGaps.forEach((gap, index) => {
          // Check if we need a new page
          if (tableY > pageHeight - 50) {
            doc.addPage();
            tableY = 50;

            // Repeat header on new page
            doc.fontSize(10)
               .fillColor('#3F3D56')
               .text('Skill', 50, tableY)
               .text('Category', 200, tableY)
               .text('Gap', 310, tableY)
               .text('Severity', 400, tableY)
               .text('Affected', 480, tableY);

            doc.moveTo(50, tableY + 15)
               .lineTo(545, tableY + 15)
               .stroke('#E2E8F0');

            tableY += 25;
            doc.fontSize(9)
               .fillColor('#545454');
          }

          // Truncate long skill names
          const skillName = gap.skillName.length > 25 ? gap.skillName.substring(0, 22) + '...' : gap.skillName;
          const category = gap.category.length > 15 ? gap.category.substring(0, 12) + '...' : gap.category;

          doc.text(skillName, 50, tableY)
             .text(category, 200, tableY)
             .text(`${gap.currentLevel.substring(0, 3)}→${gap.requiredLevel.substring(0, 3)}`, 310, tableY)
             .text(gap.gapSeverity.toUpperCase(), 400, tableY)
             .text(String(gap.affectedEmployees), 480, tableY);

          tableY += 18;

          // Light separator line
          if (index < data.allGaps.length - 1) {
            doc.moveTo(50, tableY - 2)
               .lineTo(545, tableY - 2)
               .stroke('#F3F4F6');
          }
        });
      }

      // === PAGE 4: RECOMMENDATIONS ===
      doc.addPage();

      doc.fontSize(20)
         .fillColor('#3F3D56')
         .text('Recommended Actions', 50, 50);

      doc.fontSize(11)
         .fillColor('#A0A0A0')
         .text('Prioritized training and development recommendations', 50, 78);

      let recY = 110;
      const priorityGaps = [...data.allGaps].sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.gapSeverity] - severityOrder[b.gapSeverity];
      }).slice(0, 10); // Top 10 recommendations

      priorityGaps.forEach((gap, index) => {
        if (gap.recommendations && gap.recommendations.length > 0) {
          doc.fontSize(12)
             .fillColor('#3F3D56')
             .text(`${index + 1}. ${gap.skillName}`, 50, recY);

          recY += 20;

          gap.recommendations.forEach((rec) => {
            doc.fontSize(10)
               .fillColor('#545454')
               .text(`• ${rec}`, 70, recY, { width: 475 });
            recY += 18;
          });

          recY += 10; // Space between skills
        }
      });

      // Footer on last page
      doc.fontSize(10)
         .fillColor('#A0A0A0')
         .text('This report was generated by Mizan Platform', 50, 750, { align: 'center' })
         .text('© 2025 Mizan - Balancing People, Purpose & Performance', 50, 765, { align: 'center' });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Excel report for skills analysis
 */
export function generateSkillsReportExcel(data: SkillsReportData): Buffer {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // === SHEET 1: OVERVIEW ===
    const overviewData = [
      ['Skills Gap Analysis Report'],
      [`Type: ${data.reportType === 'organization' ? 'Organization-Wide' : 'Department: ' + data.departmentName}`],
      [`Generated: ${data.generatedAt.toLocaleString()}`],
      [],
      ['Overview Statistics'],
      ['Metric', 'Value'],
      ['Total Employees', data.totalEmployees],
      ['Assessed Employees', data.assessedEmployees],
      ['Assessment Coverage', `${Math.round((data.assessedEmployees / data.totalEmployees) * 100)}%`],
      ['Total Skills Gaps', data.allGaps.length],
      [],
      ['Gap Severity Breakdown'],
      ['Severity', 'Count'],
      ['Critical', data.bySeverity.critical],
      ['High', data.bySeverity.high],
      ['Medium', data.bySeverity.medium],
      ['Low', data.bySeverity.low]
    ];

    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // === SHEET 2: ALL GAPS ===
    const gapsData = [
      ['Skill Name', 'Category', 'Current Level', 'Required Level', 'Severity', 'Affected Employees', 'Est. Training Time']
    ];

    data.allGaps.forEach(gap => {
      gapsData.push([
        gap.skillName,
        gap.category,
        gap.currentLevel,
        gap.requiredLevel,
        gap.gapSeverity,
        String(gap.affectedEmployees),
        gap.estimatedTrainingTime || 'N/A'
      ]);
    });

    const gapsSheet = XLSX.utils.aoa_to_sheet(gapsData);
    XLSX.utils.book_append_sheet(workbook, gapsSheet, 'All Gaps');

    // === SHEET 3: CRITICAL GAPS ===
    const criticalData = [
      ['Skill Name', 'Category', 'Current Level', 'Required Level', 'Affected Employees', 'Recommendations']
    ];

    data.criticalGaps.forEach(gap => {
      criticalData.push([
        gap.skillName,
        gap.category,
        gap.currentLevel,
        gap.requiredLevel,
        String(gap.affectedEmployees),
        gap.recommendations.join('; ')
      ]);
    });

    const criticalSheet = XLSX.utils.aoa_to_sheet(criticalData);
    XLSX.utils.book_append_sheet(workbook, criticalSheet, 'Critical Gaps');

    // === SHEET 4: RECOMMENDATIONS ===
    const recommendationsData = [
      ['Skill Name', 'Severity', 'Recommendations']
    ];

    data.allGaps
      .filter(gap => gap.recommendations && gap.recommendations.length > 0)
      .forEach(gap => {
        recommendationsData.push([
          gap.skillName,
          gap.gapSeverity,
          gap.recommendations.join('\n')
        ]);
      });

    const recommendationsSheet = XLSX.utils.aoa_to_sheet(recommendationsData);
    XLSX.utils.book_append_sheet(workbook, recommendationsSheet, 'Recommendations');

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer as Buffer;

  } catch (error) {
    throw new Error(`Failed to generate Excel report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate CSV report for skills analysis (simple format)
 */
export function generateSkillsReportCSV(data: SkillsReportData): string {
  try {
    const headers = ['Skill Name', 'Category', 'Current Level', 'Required Level', 'Severity', 'Affected Employees', 'Est. Training Time'];
    const rows = data.allGaps.map(gap => [
      gap.skillName,
      gap.category,
      gap.currentLevel,
      gap.requiredLevel,
      gap.gapSeverity,
      String(gap.affectedEmployees),
      gap.estimatedTrainingTime || 'N/A'
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;

  } catch (error) {
    throw new Error(`Failed to generate CSV report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
