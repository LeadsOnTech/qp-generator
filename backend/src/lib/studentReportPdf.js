// backend/src/lib/studentReportPdf.js
// Generates publication-grade A4 Student Performance Report PDFs.
// Uses PDFKit with bundled DejaVu Serif fonts for cross-platform Unicode fidelity.

const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const FONT_REGULAR_PATH = path.join(__dirname, '..', '..', 'assets', 'fonts', 'DejaVuSerif.ttf');
const FONT_BOLD_PATH = path.join(__dirname, '..', '..', 'assets', 'fonts', 'DejaVuSerif-Bold.ttf');

function ensureFonts(doc) {
  doc.registerFont('DejaVu-Regular', FONT_REGULAR_PATH);
  doc.registerFont('DejaVu-Bold', FONT_BOLD_PATH);
}

/**
 * Builds the PDF buffer for a student's performance report.
 * 
 * @param {Object} data
 * @param {Object} data.result - ExamResult record with subjectResults and chapterResults.
 * @param {Object} data.institute - Institute details (name, logoFilename, tagline, address).
 * @param {string} data.publicReportUrl - Full URL to public scorecard web viewer.
 * @returns {Promise<Buffer>}
 */
async function buildStudentPerformancePdf({ result, institute = {}, publicReportUrl = '' }) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36, // 0.5 inch margins (left 36, right 559.28)
        info: {
          Title: `${result.studentName} - ${result.examName} Report`,
          Author: institute.name || 'Academic Institute',
          Subject: 'Student Examination Performance Report',
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

      // ---------------------------------------------------------
      // 1. Top Decorative Brand Banner
      // ---------------------------------------------------------
      doc.rect(0, 0, pageWidth, 8).fill('#1e3a8a'); // Deep navy bar

      let currentY = 24;

      // Institute Logo (if exists)
      let logoDrawn = false;
      if (institute.logoFilename) {
        const logoPath = path.join(__dirname, '..', '..', 'uploads', 'logos', institute.logoFilename);
        if (fs.existsSync(logoPath)) {
          try {
            doc.image(logoPath, left, currentY, { width: 48, height: 48, fit: [48, 48] });
            logoDrawn = true;
          } catch (e) {
            console.warn('Could not render logo in PDF:', e.message);
          }
        }
      }

      const headerTextX = logoDrawn ? left + 58 : left;
      const headerTextWidth = logoDrawn ? contentWidth - 58 : contentWidth;

      doc
        .font('DejaVu-Bold')
        .fontSize(16)
        .fillColor('#0f172a')
        .text(institute.name || 'EXCELLENCE ACADEMY & JUNIOR COLLEGE', headerTextX, currentY, {
          width: headerTextWidth,
        });

      currentY = doc.y + 2;

      if (institute.tagline || institute.address) {
        const subText = [institute.tagline, institute.address].filter(Boolean).join(' • ');
        doc
          .font('DejaVu-Regular')
          .fontSize(8.5)
          .fillColor('#64748b')
          .text(subText, headerTextX, currentY, { width: headerTextWidth });
        currentY = doc.y + 4;
      } else {
        currentY += 4;
      }

      // Title Badge
      doc
        .roundedRect(left, currentY + 4, contentWidth, 24, 4)
        .fill('#f1f5f9');

      doc
        .font('DejaVu-Bold')
        .fontSize(10)
        .fillColor('#1e293b')
        .text('OFFICIAL STUDENT EXAMINATION PERFORMANCE REPORT', left, currentY + 11, {
          width: contentWidth,
          align: 'center',
        });

      currentY += 36;

      // ---------------------------------------------------------
      // 2. Student & Exam Meta Info Box (2 Columns)
      // ---------------------------------------------------------
      const metaBoxY = currentY;
      const metaBoxHeight = 54;
      doc
        .roundedRect(left, metaBoxY, contentWidth, metaBoxHeight, 4)
        .lineWidth(1)
        .strokeColor('#cbd5e1')
        .fillColor('#ffffff')
        .fillAndStroke();

      const col1X = left + 12;
      const col2X = left + contentWidth / 2 + 12;
      const labelW = 80;
      const valueW = contentWidth / 2 - 96;

      // Left Column: Student Details
      let lineY = metaBoxY + 8;
      drawMetaRow(doc, col1X, lineY, 'Student Name:', result.studentName, labelW, valueW);
      lineY += 14;
      drawMetaRow(doc, col1X, lineY, 'Roll Number:', result.rollNumber, labelW, valueW);
      lineY += 14;
      drawMetaRow(doc, col1X, lineY, 'Batch / Section:', `${result.batchName || 'General'}${result.section ? ` (${result.section})` : ''}`, labelW, valueW);

      // Right Column: Exam Details
      lineY = metaBoxY + 8;
      drawMetaRow(doc, col2X, lineY, 'Examination:', result.examName, labelW, valueW);
      lineY += 14;
      const dateStr = result.examDate ? new Date(result.examDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent';
      drawMetaRow(doc, col2X, lineY, 'Exam Date:', dateStr, labelW, valueW);
      lineY += 14;
      drawMetaRow(doc, col2X, lineY, 'Exam Mode:', result.examType === 'CBT' ? 'Computer Based Test (Online)' : 'OMR / Offline Examination', labelW, valueW);

      currentY = metaBoxY + metaBoxHeight + 12;

      // ---------------------------------------------------------
      // 3. Performance Summary KPI Cards (4 Tiles)
      // ---------------------------------------------------------
      const cardGap = 8;
      const cardWidth = (contentWidth - (cardGap * 3)) / 4;
      const cardHeight = 52;

      // Tile 1: Marks Obtained
      drawKpiCard(
        doc,
        left,
        currentY,
        cardWidth,
        cardHeight,
        'MARKS OBTAINED',
        `${result.marksObtained} / ${result.maxMarks}`,
        '#059669', // Emerald
        '#ecfdf5'  // Emerald-50
      );

      // Tile 2: Score Percentage
      drawKpiCard(
        doc,
        left + cardWidth + cardGap,
        currentY,
        cardWidth,
        cardHeight,
        'EXAM SCORE %',
        `${result.percentage}%`,
        '#2563eb', // Blue
        '#eff6ff'  // Blue-50
      );

      // Tile 3: Accuracy %
      drawKpiCard(
        doc,
        left + (cardWidth + cardGap) * 2,
        currentY,
        cardWidth,
        cardHeight,
        'ACCURACY %',
        `${result.accuracyPercentage}%`,
        '#0d9488', // Teal
        '#f0fdfa'  // Teal-50
      );

      // Tile 4: Cohort Rank
      drawKpiCard(
        doc,
        left + (cardWidth + cardGap) * 3,
        currentY,
        cardWidth,
        cardHeight,
        'COLLEGE RANK',
        `${result.rank} of ${result.totalStudents}`,
        '#d97706', // Amber
        '#fffbeb'  // Amber-50
      );

      currentY += cardHeight + 12;

      // ---------------------------------------------------------
      // 4. Question Breakdown Bar (Attempt Analysis)
      // ---------------------------------------------------------
      const barBoxHeight = 32;
      doc
        .roundedRect(left, currentY, contentWidth, barBoxHeight, 4)
        .fill('#f8fafc');

      const colW = contentWidth / 4;
      drawBreakdownPill(doc, left + colW * 0, currentY + 7, colW, 'Correct Answers', `${result.correctAnswers}`, '#16a34a');
      drawBreakdownPill(doc, left + colW * 1, currentY + 7, colW, 'Incorrect (Negative)', `${result.incorrectAnswers}`, '#dc2626');
      drawBreakdownPill(doc, left + colW * 2, currentY + 7, colW, 'Unattempted (0 Mark)', `${result.unattemptedQuestions}`, '#64748b');
      drawBreakdownPill(doc, left + colW * 3, currentY + 7, colW, 'Negative Marks Lost', `-${result.negativeMarksDeducted}`, '#b91c1c');

      currentY += barBoxHeight + 14;

      // ---------------------------------------------------------
      // 5. Subject-Wise Performance Table
      // ---------------------------------------------------------
      doc
        .font('DejaVu-Bold')
        .fontSize(10)
        .fillColor('#0f172a')
        .text('SUBJECT-WISE DIAGNOSTIC PERFORMANCE', left, currentY);

      currentY = doc.y + 6;

      const subCols = [
        { label: 'Subject', width: 140, align: 'left' },
        { label: 'Total Qs', width: 55, align: 'center' },
        { label: 'Attempt', width: 55, align: 'center' },
        { label: 'Correct', width: 50, align: 'center' },
        { label: 'Wrong', width: 50, align: 'center' },
        { label: 'Accuracy', width: 75, align: 'center' },
        { label: 'Score / Max', width: 98, align: 'right' },
      ];

      // Table Header Row
      const tableHeaderHeight = 20;
      doc
        .rect(left, currentY, contentWidth, tableHeaderHeight)
        .fill('#1e293b');

      let colX = left + 8;
      subCols.forEach((col) => {
        doc
          .font('DejaVu-Bold')
          .fontSize(8)
          .fillColor('#ffffff')
          .text(col.label, colX, currentY + 5, { width: col.width - 12, align: col.align });
        colX += col.width;
      });

      currentY += tableHeaderHeight;

      // Table Data Rows
      const subjects = result.subjectResults || [];
      subjects.forEach((sub, idx) => {
        const rowHeight = 20;
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(left, currentY, contentWidth, rowHeight).fill(bg);

        // Thin bottom border
        doc.moveTo(left, currentY + rowHeight).lineTo(right, currentY + rowHeight).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

        let cx = left + 8;
        // Subject name
        doc.font('DejaVu-Bold').fontSize(8.5).fillColor('#1e293b').text(sub.subjectName, cx, currentY + 5, { width: subCols[0].width - 12, align: 'left' });
        cx += subCols[0].width;

        // Total Qs
        doc.font('DejaVu-Regular').fontSize(8.5).fillColor('#475569').text(String(sub.totalQuestions), cx, currentY + 5, { width: subCols[1].width - 12, align: 'center' });
        cx += subCols[1].width;

        // Attempted
        doc.font('DejaVu-Regular').fontSize(8.5).fillColor('#475569').text(String(sub.attemptedQuestions), cx, currentY + 5, { width: subCols[2].width - 12, align: 'center' });
        cx += subCols[2].width;

        // Correct
        doc.font('DejaVu-Bold').fontSize(8.5).fillColor('#16a34a').text(String(sub.correctCount), cx, currentY + 5, { width: subCols[3].width - 12, align: 'center' });
        cx += subCols[3].width;

        // Wrong
        doc.font('DejaVu-Bold').fontSize(8.5).fillColor('#dc2626').text(String(sub.incorrectCount), cx, currentY + 5, { width: subCols[4].width - 12, align: 'center' });
        cx += subCols[4].width;

        // Accuracy
        doc.font('DejaVu-Bold').fontSize(8.5).fillColor(sub.accuracyPercentage >= 75 ? '#0d9488' : sub.accuracyPercentage >= 50 ? '#d97706' : '#dc2626').text(`${sub.accuracyPercentage}%`, cx, currentY + 5, { width: subCols[5].width - 12, align: 'center' });
        cx += subCols[5].width;

        // Score / Max
        doc.font('DejaVu-Bold').fontSize(8.5).fillColor('#0f172a').text(`${sub.marksObtained} / ${sub.maxMarks} (${sub.percentage}%)`, cx, currentY + 5, { width: subCols[6].width - 12, align: 'right' });

        currentY += rowHeight;
      });

      currentY += 12;

      // ---------------------------------------------------------
      // 6. Chapter-Wise Performance Analysis (Top Highlights)
      // ---------------------------------------------------------
      const chapters = result.chapterResults || [];
      if (chapters.length > 0) {
        doc
          .font('DejaVu-Bold')
          .fontSize(10)
          .fillColor('#0f172a')
          .text('CHAPTER ACCURACY & MASTERY BREAKDOWN', left, currentY);

        currentY = doc.y + 6;

        const maxChapsToShow = 8;
        const displayChaps = chapters.slice(0, maxChapsToShow);
        const chapColWidth = (contentWidth - 10) / 2;

        displayChaps.forEach((chap, idx) => {
          const isLeft = idx % 2 === 0;
          const boxX = isLeft ? left : left + chapColWidth + 10;
          const boxY = currentY + Math.floor(idx / 2) * 22;

          let statusBg = '#f1f5f9';
          let statusText = '#475569';
          let statusLabel = 'AVERAGE';

          if (chap.status === 'STRONG') {
            statusBg = '#dcfce7';
            statusText = '#15803d';
            statusLabel = 'STRONG';
          } else if (chap.status === 'WEAK') {
            statusBg = '#fee2e2';
            statusText = '#b91c1c';
            statusLabel = 'WEAK';
          }

          doc.roundedRect(boxX, boxY, chapColWidth, 19, 3).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

          // Chapter Name truncated
          const chapNameClean = chap.chapterName.length > 28 ? chap.chapterName.substring(0, 26) + '...' : chap.chapterName;
          doc.font('DejaVu-Regular').fontSize(7.5).fillColor('#1e293b').text(chapNameClean, boxX + 6, boxY + 5, { width: chapColWidth - 85 });

          // Accuracy
          doc.font('DejaVu-Bold').fontSize(7.5).fillColor('#334155').text(`${chap.accuracyPercentage}% (${chap.correctCount}/${chap.attemptedQuestions})`, boxX + chapColWidth - 80, boxY + 5, { width: 45, align: 'right' });

          // Status Badge
          doc.roundedRect(boxX + chapColWidth - 32, boxY + 4, 28, 11, 2).fill(statusBg);
          doc.font('DejaVu-Bold').fontSize(6).fillColor(statusText).text(statusLabel, boxX + chapColWidth - 32, boxY + 6, { width: 28, align: 'center' });
        });

        currentY += Math.ceil(displayChaps.length / 2) * 22 + 10;
      }

      // ---------------------------------------------------------
      // 7. Academic Feedback & Recommendation
      // ---------------------------------------------------------
      const feedbackBoxY = currentY;
      const feedbackBoxHeight = 44;

      doc
        .roundedRect(left, feedbackBoxY, contentWidth, feedbackBoxHeight, 4)
        .fillAndStroke('#f0f9ff', '#bae6fd');

      doc
        .font('DejaVu-Bold')
        .fontSize(8.5)
        .fillColor('#0369a1')
        .text('💡 ACADEMIC ADVISORY & RECOMMENDATION', left + 10, feedbackBoxY + 6);

      doc
        .font('DejaVu-Regular')
        .fontSize(8)
        .fillColor('#0c4a6e')
        .text(result.academicInsight || 'Maintain disciplined daily revision and focus on accuracy.', left + 10, feedbackBoxY + 19, {
          width: contentWidth - 20,
          lineGap: 1.5,
        });

      currentY = feedbackBoxY + feedbackBoxHeight + 10;

      // ---------------------------------------------------------
      // 8. Footer with Online Verification QR Code
      // ---------------------------------------------------------
      const footerY = pageHeight - 64;

      // Divider line
      doc.moveTo(left, footerY).lineTo(right, footerY).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

      // Generate QR Code if public URL provided
      if (publicReportUrl) {
        try {
          const qrDataUrl = await QRCode.toDataURL(publicReportUrl, { margin: 1, width: 44 });
          const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
          const qrBuf = Buffer.from(qrBase64, 'base64');
          doc.image(qrBuf, left, footerY + 6, { width: 44, height: 44 });
        } catch (e) {
          console.warn('QR Code generation skipped:', e.message);
        }
      }

      const footerTextX = publicReportUrl ? left + 52 : left;
      const footerTextW = publicReportUrl ? contentWidth - 52 : contentWidth;

      doc
        .font('DejaVu-Bold')
        .fontSize(7.5)
        .fillColor('#475569')
        .text('Official Examination Result Verification', footerTextX, footerY + 8);

      doc
        .font('DejaVu-Regular')
        .fontSize(7)
        .fillColor('#64748b')
        .text(
          `Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN')} • Scan QR code to view live scorecard and subject breakdowns.`,
          footerTextX,
          footerY + 18,
          { width: footerTextW }
        );

      doc
        .font('DejaVu-Regular')
        .fontSize(6.5)
        .fillColor('#94a3b8')
        .text(
          'This is a digitally generated report from QuestionStudio Academic Examination System. Signatures are verified electronically.',
          footerTextX,
          footerY + 30,
          { width: footerTextW }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

function drawMetaRow(doc, x, y, label, value, labelW, valW) {
  doc.font('DejaVu-Bold').fontSize(8).fillColor('#64748b').text(label, x, y, { width: labelW });
  doc.font('DejaVu-Bold').fontSize(8.5).fillColor('#0f172a').text(String(value || '—'), x + labelW, y, { width: valW });
}

function drawKpiCard(doc, x, y, w, h, label, value, textColor, bgColor) {
  doc.roundedRect(x, y, w, h, 4).fillAndStroke(bgColor, '#cbd5e1');
  doc.font('DejaVu-Bold').fontSize(7).fillColor('#475569').text(label, x + 6, y + 8, { width: w - 12, align: 'center' });
  doc.font('DejaVu-Bold').fontSize(12).fillColor(textColor).text(value, x + 6, y + 23, { width: w - 12, align: 'center' });
}

function drawBreakdownPill(doc, x, y, w, label, value, color) {
  doc.font('DejaVu-Bold').fontSize(11).fillColor(color).text(value, x, y, { width: w, align: 'center' });
  doc.font('DejaVu-Regular').fontSize(7).fillColor('#64748b').text(label, x, y + 13, { width: w, align: 'center' });
}

module.exports = {
  buildStudentPerformancePdf,
};
