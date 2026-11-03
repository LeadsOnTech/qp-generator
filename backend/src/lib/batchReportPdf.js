// backend/src/lib/batchReportPdf.js
// Executive A4 Batch Performance Summary PDF for College Management & Principals.
// Uses PDFKit with bundled DejaVu Serif fonts for cross-platform fidelity.

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const FONT_REGULAR_PATH = path.join(__dirname, '..', '..', 'assets', 'fonts', 'DejaVuSerif.ttf');
const FONT_BOLD_PATH = path.join(__dirname, '..', '..', 'assets', 'fonts', 'DejaVuSerif-Bold.ttf');

function ensureFonts(doc) {
  doc.registerFont('DejaVu-Regular', FONT_REGULAR_PATH);
  doc.registerFont('DejaVu-Bold', FONT_BOLD_PATH);
}

/**
 * Builds an Executive A4 Batch Performance Report PDF for management.
 */
async function buildBatchPerformancePdf({ paper, stats, distribution, subjectAverages, top10, bottom10, institute = {} }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `Batch Performance Summary - ${paper.title}`,
          Author: institute.name || 'Academic Institute',
          Subject: 'Executive Batch Performance & Analytics Report',
        },
      });

      ensureFonts(doc);

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const left = 36;
      const right = pageWidth - 36;
      const contentWidth = right - left;

      // Top Decorative Brand Banner
      doc.rect(0, 0, pageWidth, 8).fill('#1e3a8a');

      let currentY = 24;

      // Header Branding
      let logoDrawn = false;
      if (institute.logoFilename) {
        const logoPath = path.join(__dirname, '..', '..', 'uploads', 'logos', institute.logoFilename);
        if (fs.existsSync(logoPath)) {
          try {
            doc.image(logoPath, left, currentY, { width: 44, height: 44, fit: [44, 44] });
            logoDrawn = true;
          } catch (e) {
            console.warn('Could not draw logo in batch PDF:', e.message);
          }
        }
      }

      const headerTextX = logoDrawn ? left + 54 : left;
      const headerTextW = logoDrawn ? contentWidth - 54 : contentWidth;

      doc
        .font('DejaVu-Bold')
        .fontSize(15)
        .fillColor('#0f172a')
        .text(institute.name || 'ACADEMIC EXCELLENCE INSTITUTION', headerTextX, currentY, { width: headerTextW });

      currentY = doc.y + 2;

      doc
        .font('DejaVu-Regular')
        .fontSize(8.5)
        .fillColor('#64748b')
        .text('EXECUTIVE ACADEMIC PERFORMANCE & BATCH CONSOLIDATED AUDIT', headerTextX, currentY, { width: headerTextW });

      currentY = doc.y + 6;

      // Title Box
      doc
        .roundedRect(left, currentY, contentWidth, 38, 4)
        .fillAndStroke('#f8fafc', '#cbd5e1');

      doc
        .font('DejaVu-Bold')
        .fontSize(11)
        .fillColor('#1e293b')
        .text(`EXAMINATION: ${paper.title || paper.examName}`, left + 12, currentY + 8);

      const dateStr = paper.createdAt ? new Date(paper.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent';
      doc
        .font('DejaVu-Regular')
        .fontSize(8.5)
        .fillColor('#475569')
        .text(`Pattern: ${paper.examName} • Date: ${dateStr} • Reporting Scope: Consolidated Batch Audit`, left + 12, currentY + 22);

      currentY += 46;

      // ---------------------------------------------------------
      // 1. Executive Summary KPIs (5 Tiles)
      // ---------------------------------------------------------
      const gap = 8;
      const tileW = (contentWidth - gap * 4) / 5;
      const tileH = 48;

      drawKpiTile(doc, left + (tileW + gap) * 0, currentY, tileW, tileH, 'TOTAL STUDENTS', `${stats.totalStudents}`, '#0f172a', '#f1f5f9');
      drawKpiTile(doc, left + (tileW + gap) * 1, currentY, tileW, tileH, 'AVERAGE SCORE', `${stats.averageScore}`, '#2563eb', '#eff6ff');
      drawKpiTile(doc, left + (tileW + gap) * 2, currentY, tileW, tileH, 'HIGHEST SCORE', `${stats.topScore}`, '#059669', '#ecfdf5');
      drawKpiTile(doc, left + (tileW + gap) * 3, currentY, tileW, tileH, 'LOWEST SCORE', `${stats.lowestScore}`, '#dc2626', '#fef2f2');
      drawKpiTile(doc, left + (tileW + gap) * 4, currentY, tileW, tileH, 'PASS PERCENTAGE', `${stats.passPercentage}%`, '#0d9488', '#f0fdfa');

      currentY += tileH + 12;

      // ---------------------------------------------------------
      // 2. Score Distribution Histogram Bands
      // ---------------------------------------------------------
      doc
        .font('DejaVu-Bold')
        .fontSize(9.5)
        .fillColor('#0f172a')
        .text('COHORT SCORE DISTRIBUTION (BELL-CURVE BANDS)', left, currentY);

      currentY = doc.y + 6;

      const bandW = (contentWidth - gap * 4) / 5;
      const bandH = 34;

      const bands = [
        { label: '≥ 90% (Outstanding)', count: distribution.outstanding || 0, color: '#059669', bg: '#ecfdf5' },
        { label: '75 - 89% (Distinction)', count: distribution.distinction || 0, color: '#2563eb', bg: '#eff6ff' },
        { label: '60 - 74% (First Class)', count: distribution.firstClass || 0, color: '#0d9488', bg: '#f0fdfa' },
        { label: '40 - 59% (Second Class)', count: distribution.secondClass || 0, color: '#d97706', bg: '#fffbeb' },
        { label: '< 40% (Needs Remedial)', count: distribution.remedial || 0, color: '#dc2626', bg: '#fef2f2' },
      ];

      bands.forEach((b, i) => {
        const bx = left + (bandW + gap) * i;
        doc.roundedRect(bx, currentY, bandW, bandH, 3).fillAndStroke(b.bg, '#cbd5e1');
        doc.font('DejaVu-Bold').fontSize(12).fillColor(b.color).text(`${b.count} students`, bx, currentY + 6, { width: bandW, align: 'center' });
        doc.font('DejaVu-Regular').fontSize(6.5).fillColor('#475569').text(b.label, bx, currentY + 21, { width: bandW, align: 'center' });
      });

      currentY += bandH + 14;

      // ---------------------------------------------------------
      // 3. Subject-Wise Class Performance Table
      // ---------------------------------------------------------
      if (subjectAverages && subjectAverages.length > 0) {
        doc
          .font('DejaVu-Bold')
          .fontSize(9.5)
          .fillColor('#0f172a')
          .text('SUBJECT-WISE CLASS BENCHMARKS & ACCURACY', left, currentY);

        currentY = doc.y + 6;

        // Table Header
        doc.rect(left, currentY, contentWidth, 18).fill('#1e293b');
        doc.font('DejaVu-Bold').fontSize(7.5).fillColor('#ffffff');
        doc.text('Subject Name', left + 8, currentY + 5, { width: 140 });
        doc.text('Class Avg Marks', left + 150, currentY + 5, { width: 90, align: 'center' });
        doc.text('Class Avg Accuracy', left + 250, currentY + 5, { width: 90, align: 'center' });
        doc.text('Max Marks', left + 350, currentY + 5, { width: 70, align: 'center' });
        doc.text('Benchmark Performance', left + 430, currentY + 5, { width: 90, align: 'right' });

        currentY += 18;

        subjectAverages.forEach((sub, idx) => {
          const rowH = 18;
          doc.rect(left, currentY, contentWidth, rowH).fill(idx % 2 === 0 ? '#ffffff' : '#f8fafc');
          doc.moveTo(left, currentY + rowH).lineTo(right, currentY + rowH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

          doc.font('DejaVu-Bold').fontSize(8).fillColor('#1e293b').text(sub.subjectName, left + 8, currentY + 5, { width: 140 });
          doc.font('DejaVu-Regular').fontSize(8).fillColor('#0f172a').text(String(sub.averageMarks), left + 150, currentY + 5, { width: 90, align: 'center' });
          doc.font('DejaVu-Bold').fontSize(8).fillColor(sub.averageAccuracy >= 75 ? '#059669' : sub.averageAccuracy >= 50 ? '#d97706' : '#dc2626').text(`${sub.averageAccuracy}%`, left + 250, currentY + 5, { width: 90, align: 'center' });
          doc.font('DejaVu-Regular').fontSize(8).fillColor('#64748b').text(String(sub.maxMarks), left + 350, currentY + 5, { width: 70, align: 'center' });

          const status = sub.averageAccuracy >= 75 ? 'HIGH STRENGTH' : sub.averageAccuracy >= 55 ? 'ACCEPTABLE' : 'URGENT REVIEW';
          const statColor = sub.averageAccuracy >= 75 ? '#059669' : sub.averageAccuracy >= 55 ? '#d97706' : '#dc2626';
          doc.font('DejaVu-Bold').fontSize(7.5).fillColor(statColor).text(status, left + 430, currentY + 5, { width: 90, align: 'right' });

          currentY += rowH;
        });

        currentY += 12;
      }

      // ---------------------------------------------------------
      // 4. Side-by-Side: Top 10 Honor Roll vs Bottom 10 Watchlist
      // ---------------------------------------------------------
      const colW = (contentWidth - 12) / 2;
      const leftColX = left;
      const rightColX = left + colW + 12;

      doc
        .font('DejaVu-Bold')
        .fontSize(9.5)
        .fillColor('#059669')
        .text('🏆 TOP PERFORMERS (MERIT COHORT)', leftColX, currentY);

      doc
        .font('DejaVu-Bold')
        .fontSize(9.5)
        .fillColor('#dc2626')
        .text('⚠️ REMEDIAL WATCHLIST (URGENT FOCUS)', rightColX, currentY);

      currentY += 14;

      // Table Headers
      const subTableH = 16;
      doc.rect(leftColX, currentY, colW, subTableH).fill('#065f46');
      doc.font('DejaVu-Bold').fontSize(7).fillColor('#ffffff');
      doc.text('Rank', leftColX + 4, currentY + 4, { width: 28 });
      doc.text('Student / Roll', leftColX + 34, currentY + 4, { width: 140 });
      doc.text('Score', leftColX + colW - 55, currentY + 4, { width: 50, align: 'right' });

      doc.rect(rightColX, currentY, colW, subTableH).fill('#991b1b');
      doc.font('DejaVu-Bold').fontSize(7).fillColor('#ffffff');
      doc.text('Rank', rightColX + 4, currentY + 4, { width: 28 });
      doc.text('Student / Roll', rightColX + 34, currentY + 4, { width: 140 });
      doc.text('Score', rightColX + colW - 55, currentY + 4, { width: 50, align: 'right' });

      currentY += subTableH;

      const maxRows = Math.max(top10.length, bottom10.length);
      for (let r = 0; r < Math.min(maxRows, 8); r++) {
        const rowH = 15;
        const bg = r % 2 === 0 ? '#ffffff' : '#f8fafc';

        // Left Row (Top 10)
        doc.rect(leftColX, currentY, colW, rowH).fill(bg);
        doc.moveTo(leftColX, currentY + rowH).lineTo(leftColX + colW, currentY + rowH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        const tStudent = top10[r];
        if (tStudent) {
          doc.font('DejaVu-Bold').fontSize(7.5).fillColor('#065f46').text(`#${tStudent.rank}`, leftColX + 4, currentY + 3, { width: 28 });
          const nameClean = tStudent.studentName.length > 22 ? tStudent.studentName.substring(0, 20) + '..' : tStudent.studentName;
          doc.font('DejaVu-Regular').fontSize(7.5).fillColor('#0f172a').text(`${nameClean} (${tStudent.rollNumber})`, leftColX + 34, currentY + 3, { width: 140 });
          doc.font('DejaVu-Bold').fontSize(7.5).fillColor('#0f172a').text(`${tStudent.marksObtained} (${tStudent.percentage}%)`, leftColX + colW - 65, currentY + 3, { width: 60, align: 'right' });
        }

        // Right Row (Bottom 10)
        doc.rect(rightColX, currentY, colW, rowH).fill(bg);
        doc.moveTo(rightColX, currentY + rowH).lineTo(rightColX + colW, currentY + rowH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        const bStudent = bottom10[r];
        if (bStudent) {
          doc.font('DejaVu-Bold').fontSize(7.5).fillColor('#dc2626').text(`#${bStudent.rank}`, rightColX + 4, currentY + 3, { width: 28 });
          const nameClean = bStudent.studentName.length > 22 ? bStudent.studentName.substring(0, 20) + '..' : bStudent.studentName;
          doc.font('DejaVu-Regular').fontSize(7.5).fillColor('#0f172a').text(`${nameClean} (${bStudent.rollNumber})`, rightColX + 34, currentY + 3, { width: 140 });
          doc.font('DejaVu-Bold').fontSize(7.5).fillColor('#b91c1c').text(`${bStudent.marksObtained} (${bStudent.percentage}%)`, rightColX + colW - 65, currentY + 3, { width: 60, align: 'right' });
        }

        currentY += rowH;
      }

      currentY += 16;

      // ---------------------------------------------------------
      // 5. Verification & Signature Block
      // ---------------------------------------------------------
      const signY = pageHeight - 54;
      doc.moveTo(left, signY).lineTo(right, signY).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

      doc.font('DejaVu-Regular').fontSize(7).fillColor('#64748b').text('Audited by Examination Cell & Academic In-Charge', left, signY + 6);
      doc.font('DejaVu-Regular').fontSize(7).fillColor('#64748b').text('Approved by Principal / Academic Director', right - 180, signY + 6, { align: 'right' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function drawKpiTile(doc, x, y, w, h, label, value, valColor, bgColor) {
  doc.roundedRect(x, y, w, h, 3).fillAndStroke(bgColor, '#cbd5e1');
  doc.font('DejaVu-Bold').fontSize(6.5).fillColor('#64748b').text(label, x + 4, y + 6, { width: w - 8, align: 'center' });
  doc.font('DejaVu-Bold').fontSize(13).fillColor(valColor).text(value, x + 4, y + 20, { width: w - 8, align: 'center' });
}

module.exports = {
  buildBatchPerformancePdf,
};
