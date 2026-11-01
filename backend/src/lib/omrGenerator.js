/**
 * omrGenerator.js
 *
 * Generates official-standard, optical-scanner-compatible 1-page A4 OMR answer sheets
 * for competitive and college examinations (NEET, JEE, EAPCET, KCET, State Boards).
 *
 * Key Capabilities:
 * 1. Single A4 Guarantee: Mathematically auto-scales 20 to 200 questions to fit exactly on 1 page.
 * 2. Optical Fidelity: 4 solid black corner fiducial markers + perimeter timing ticks for scanner alignment.
 * 3. Candidate ID: Name block, Roll Number 0-9 bubbling columns, Candidate/Invigilator signatures.
 * 4. Multi-Set Support: Pre-assigned sets (A, B, C, D) with pre-filled bubbles or generic open set selection.
 * 5. Format Matching: Supports both (A, B, C, D) and (1, 2, 3, 4) option labels.
 * 6. Quick Scan QR Code: Embedded verification payload for camera-based and flatbed evaluation systems.
 */

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', '..', 'uploads', 'images');

/**
 * Builds and streams the 1-page printable OMR Answer Sheet.
 *
 * @param {WritableStream} stream
 * @param {Object} paper - Paper metadata
 * @param {Array} questions - Ordered array of questions
 * @param {Object} options - { set: 'A'|'B'|'C'|'D'|'GENERIC', optionFormat: 'ALPHA'|'NUMERIC', rollDigits: 7|10, watermark: boolean }
 */
async function buildOmrSheetPdf(stream, paper, questions = [], options = {}) {
  const doc = new PDFDocument({ size: 'A4', margin: 16, bufferPages: true });
  doc.pipe(stream);

  const pw = doc.page.width;
  const ph = doc.page.height;
  const margin = 16;
  const contentWidth = pw - 2 * margin;

  const totalQuestions = questions.length || 60;
  const setChar = (options.set || paper.setLabel || 'GENERIC').toUpperCase().replace('SET', '').trim();
  const isSetSpecific = ['A', 'B', 'C', 'D'].includes(setChar);
  const optionFormat = options.optionFormat || paper.optionFormat || 'ALPHA';
  const rollCols = parseInt(options.rollDigits, 10) === 10 ? 10 : 7;

  // 1. Fiducial Corner Alignment Marks (12x12 solid black boxes for scanner deskewing)
  const fSize = 12;
  doc.rect(margin, margin, fSize, fSize).fill('#000000');
  doc.rect(pw - margin - fSize, margin, fSize, fSize).fill('#000000');
  doc.rect(margin, ph - margin - fSize, fSize, fSize).fill('#000000');
  doc.rect(pw - margin - fSize, ph - margin - fSize, fSize, fSize).fill('#000000');

  // 2. Institute Logo (Top-Left Badge, if available)
  let logoOffset = 0;
  if (paper.instituteLogoFilename) {
    const logoPath = path.join(IMAGES_DIR, paper.instituteLogoFilename);
    if (fs.existsSync(logoPath)) {
      try {
        const img = doc.openImage(logoPath);
        const maxLogoDim = 38;
        const scale = Math.min(maxLogoDim / img.width, maxLogoDim / img.height, 1);
        doc.image(logoPath, margin + fSize + 6, margin + 2, { width: img.width * scale, height: img.height * scale });
        logoOffset = img.width * scale + 6;
      } catch (e) {}
    }
  }

  // 3. Header Text & Details
  const headerY = margin + 1;
  const qrSize = 42;
  const qrX = pw - margin - fSize - qrSize - 6;
  const headerTextX = margin + fSize + 8 + logoOffset;
  const headerTextW = qrX - headerTextX - 10;

  const instName = (paper.instituteName || 'LEADSON ACADEMY').toUpperCase();
  const examName = paper.examName || 'EXAMINATION';
  const paperTitle = paper.title || 'Question Paper';
  const maxMarks = paper.maxMarks || totalQuestions * 4;
  const timeMins = paper.timeAllowedMinutes || 180;

  doc.font('Helvetica-Bold').fontSize(instName.length > 35 ? 11 : 12.5).fill('#0f172a')
    .text(instName, headerTextX, headerY, { width: headerTextW, align: 'center', lineBreak: false });

  const setHeaderTag = isSetSpecific ? ` (SET - ${setChar})` : '';
  doc.font('Helvetica-Bold').fontSize(9.5).fill('#1e3a8a')
    .text(`OMR ANSWER EVALUATION SHEET${setHeaderTag}`, headerTextX, headerY + 15, { width: headerTextW, align: 'center', lineBreak: false });

  doc.font('Helvetica').fontSize(7.5).fill('#475569')
    .text(`${examName} — ${paperTitle}   ·   ${totalQuestions} Questions   ·   Max Marks: ${maxMarks}   ·   ${timeMins} Mins`, headerTextX, headerY + 27, { width: headerTextW, align: 'center', lineBreak: false });

  // 4. Optical QR Code Payload
  try {
    const qrPayload = JSON.stringify({
      id: paper.id ? String(paper.id).slice(0, 8) : 'PAPER',
      set: isSetSpecific ? setChar : 'GEN',
      qCount: totalQuestions,
      exam: examName.slice(0, 16),
    });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 0, width: 44 });
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    doc.image(qrBuffer, qrX, headerY, { width: qrSize, height: qrSize });
  } catch (err) {
    // If QR code generation fails, skip gracefully
  }

  // Header Divider Rule
  let curY = headerY + 42;
  doc.strokeColor('#000000').lineWidth(0.7).moveTo(margin, curY).lineTo(pw - margin, curY).stroke();
  curY += 5;

  // 5. Candidate Information Block (Top Box)
  const isHighDensity = totalQuestions > 120;
  const topBoxY = curY;
  const topBoxHeight = isHighDensity ? 94 : 108;
  doc.roundedRect(margin + 4, topBoxY, contentWidth - 8, topBoxHeight, 3).strokeColor('#94a3b8').lineWidth(0.5).stroke();

  // 5A. Candidate Name Section
  const leftW = isHighDensity ? 260 : 275;
  doc.font('Helvetica-Bold').fontSize(7).fill('#0f172a')
    .text('CANDIDATE NAME (IN CAPITAL LETTERS AS PER ADMIT CARD)', margin + 10, topBoxY + 5);

  const numNameBoxes = isHighDensity ? 20 : 22;
  const nameBoxSize = isHighDensity ? 10.5 : 11.2;
  for (let i = 0; i < numNameBoxes; i++) {
    doc.rect(margin + 10 + i * (nameBoxSize + 1.2), topBoxY + 15, nameBoxSize, nameBoxSize).strokeColor('#64748b').lineWidth(0.5).stroke();
  }

  // 5B. Filling Instructions & Visual Marking Guide
  doc.font('Helvetica-Bold').fontSize(6.5).fill('#0f172a')
    .text('INSTRUCTIONS FOR MARKING:', margin + 10, topBoxY + (isHighDensity ? 30 : 33));
  doc.font('Helvetica').fontSize(6).fill('#334155')
    .text('• Use Blue or Black ball-point pen only. Gel pens and pencils are strictly forbidden.', margin + 10, topBoxY + (isHighDensity ? 39 : 43))
    .text('• Completely darken circles. Incomplete, faint, or crossed markings will be rejected.', margin + 10, topBoxY + (isHighDensity ? 47 : 52));

  const guideY = topBoxY + (isHighDensity ? 56 : 63);
  doc.font('Helvetica-Bold').fontSize(6).fill('#1e3a8a').text('METHOD:', margin + 10, guideY);
  // Correct circle
  doc.circle(margin + 58, guideY + 3.5, 3.8).fillAndStroke('#0f172a', '#0f172a');
  doc.font('Helvetica-Bold').fontSize(6).fill('#15803d').text('Correct', margin + 65, guideY);
  // Wrong circle 1
  doc.circle(margin + 105, guideY + 3.5, 3.8).strokeColor('#0f172a').lineWidth(0.5).stroke();
  doc.font('Helvetica-Bold').fontSize(6).fill('#b91c1c').text('✕ Wrong', margin + 112, guideY);
  // Wrong circle 2
  doc.circle(margin + 150, guideY + 3.5, 3.8).strokeColor('#0f172a').lineWidth(0.5).stroke();
  doc.font('Helvetica-Bold').fontSize(6).fill('#b91c1c').text('✓ Wrong', margin + 157, guideY);

  // 5C. Signature Boxes
  const sigY = topBoxY + (isHighDensity ? 83 : 96);
  doc.strokeColor('#94a3b8').lineWidth(0.5).moveTo(margin + 10, sigY).lineTo(margin + 115, sigY).stroke();
  doc.font('Helvetica').fontSize(6).fill('#475569').text('Candidate Signature', margin + 10, sigY + 1.5);

  doc.strokeColor('#94a3b8').lineWidth(0.5).moveTo(margin + 140, sigY).lineTo(margin + 245, sigY).stroke();
  doc.font('Helvetica').fontSize(6).fill('#475569').text('Invigilator Signature', margin + 140, sigY + 1.5);

  // 5D. Roll Number Column Bubbles
  const rollX = margin + leftW + 16;
  doc.font('Helvetica-Bold').fontSize(7).fill('#0f172a')
    .text('ROLL NUMBER / HALL TICKET', rollX, topBoxY + 5);

  const rollColW = rollCols === 10 ? 10.5 : 12.5;
  const rollColGap = 1.5;

  for (let c = 0; c < rollCols; c++) {
    doc.rect(rollX + c * (rollColW + rollColGap), topBoxY + 14, rollColW, 9.5).strokeColor('#334155').lineWidth(0.5).stroke();
  }

  const rollRowSpacing = isHighDensity ? 6.4 : 7.4;
  for (let d = 0; d < 10; d++) {
    const by = topBoxY + (isHighDensity ? 28 : 31) + d * rollRowSpacing;
    for (let c = 0; c < rollCols; c++) {
      const bx = rollX + c * (rollColW + rollColGap) + rollColW / 2;
      doc.circle(bx, by, isHighDensity ? 2.7 : 3.1).strokeColor('#0f172a').lineWidth(0.4).stroke();
      doc.font('Helvetica').fontSize(isHighDensity ? 4.5 : 5).fill('#0f172a').text(String(d), bx - (isHighDensity ? 1.2 : 1.4), by - (isHighDensity ? 2 : 2.4));
    }
  }

  // 5E. Question Paper Set Code Section
  const setX = rollX + rollCols * (rollColW + rollColGap) + (isHighDensity ? 16 : 20);
  doc.font('Helvetica-Bold').fontSize(7).fill('#0f172a')
    .text('PAPER SET', setX, topBoxY + 5);

  // Set box
  doc.rect(setX, topBoxY + 14, 24, 9.5).strokeColor('#334155').lineWidth(0.5).stroke();
  if (isSetSpecific) {
    doc.font('Helvetica-Bold').fontSize(7).fill('#0f172a').text(setChar, setX + 9, topBoxY + 15.5);
  }

  const setsList = ['A', 'B', 'C', 'D'];
  const setSpacing = isHighDensity ? 9.5 : 11;
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const sName = setsList[sIdx];
    const sy = topBoxY + (isHighDensity ? 29 : 33) + sIdx * setSpacing;
    const isFilled = isSetSpecific && sName === setChar;

    if (isFilled) {
      doc.circle(setX + 12, sy, 4.0).fillAndStroke('#0f172a', '#0f172a');
      doc.font('Helvetica-Bold').fontSize(5.5).fill('#ffffff').text(sName, setX + 9.5, sy - 3);
    } else {
      doc.circle(setX + 12, sy, 4.0).strokeColor('#0f172a').lineWidth(0.5).stroke();
      doc.font('Helvetica-Bold').fontSize(5.5).fill('#0f172a').text(sName, setX + 9.5, sy - 3);
    }
  }

  // Security hash seal bar
  doc.font('Helvetica').fontSize(5).fill('#64748b').text('SECURITY SEAL', setX - 4, topBoxY + (isHighDensity ? 72 : 82));
  doc.strokeColor('#0f172a').lineWidth(1.2).moveTo(setX - 4, topBoxY + (isHighDensity ? 80 : 90)).lineTo(setX + 28, topBoxY + (isHighDensity ? 80 : 90)).stroke();
  doc.strokeColor('#0f172a').lineWidth(0.5).moveTo(setX - 4, topBoxY + (isHighDensity ? 83 : 93)).lineTo(setX + 28, topBoxY + (isHighDensity ? 83 : 93)).stroke();
  doc.strokeColor('#0f172a').lineWidth(2.0).moveTo(setX - 4, topBoxY + (isHighDensity ? 87 : 97)).lineTo(setX + 28, topBoxY + (isHighDensity ? 87 : 97)).stroke();

  // 6. Answer Bubbles Matrix
  curY = topBoxY + topBoxHeight + 6;
  doc.strokeColor('#000000').lineWidth(0.7).moveTo(margin, curY).lineTo(pw - margin, curY).stroke();
  curY += 6;

  // Compute adaptive grid geometry
  let numColumns = 3;
  if (totalQuestions > 120) {
    numColumns = 5;
  } else if (totalQuestions > 45) {
    numColumns = 4;
  }

  const questionsPerCol = Math.ceil(totalQuestions / numColumns);
  const colGutter = numColumns === 5 ? 8 : (numColumns === 4 ? 12 : 16);
  const colWidth = (contentWidth - (numColumns - 1) * colGutter) / numColumns;

  const availableHeight = ph - margin - curY - 14;
  const rawRowHeight = (availableHeight - 16) / questionsPerCol;
  const rowHeight = Math.min(27, Math.max(13.5, rawRowHeight));
  const bRadius = Math.min(5.4, Math.max(3.8, rowHeight * 0.31));

  // Determine subject per column or chunk
  const subjects = [];
  let lastSub = null;
  questions.forEach((q) => {
    if (q.subject && q.subject !== lastSub) {
      subjects.push({ subject: q.subject, order: q.order || 1 });
      lastSub = q.subject;
    }
  });

  const optLabels = optionFormat === 'NUMERIC' ? ['1', '2', '3', '4'] : ['A', 'B', 'C', 'D'];

  for (let c = 0; c < numColumns; c++) {
    const colX = margin + c * (colWidth + colGutter);
    let qY = curY;

    const startQ = c * questionsPerCol + 1;
    const endQ = Math.min(totalQuestions, (c + 1) * questionsPerCol);

    if (startQ > totalQuestions) break;

    // Find predominant subject for this column
    const colFirstQuestion = questions[startQ - 1];
    const subTitle = colFirstQuestion?.subject ? colFirstQuestion.subject.toUpperCase() : 'QUESTIONS';

    // Section Column Banner
    doc.save();
    doc.rect(colX, qY, colWidth, 13).fill('#1e293b');
    doc.font('Helvetica-Bold').fontSize(numColumns === 5 ? 6.5 : 7.5).fill('#ffffff')
      .text(`${subTitle} (Q ${startQ} - ${endQ})`, colX, qY + 3, { width: colWidth, align: 'center', lineBreak: false });
    doc.restore();

    qY += 15;

    const countInThisCol = endQ - startQ + 1;
    for (let r = 0; r < countInThisCol; r++) {
      const qNum = startQ + r;
      const ry = qY + r * rowHeight;

      // Alternating row background tint
      if (r % 2 === 1) {
        doc.rect(colX, ry, colWidth, rowHeight).fill('#f8fafc');
      }
      doc.strokeColor('#e2e8f0').lineWidth(0.35).rect(colX, ry, colWidth, rowHeight).stroke();

      // Question Number
      const qNumStr = String(qNum).padStart(totalQuestions >= 100 ? 3 : 2, '0');
      doc.font('Helvetica-Bold').fontSize(numColumns === 5 ? 7 : 8).fill('#0f172a')
        .text(qNumStr, colX + 3, ry + rowHeight / 2 - (numColumns === 5 ? 3.5 : 4));

      // 4 Option Bubbles
      const numOpts = 4;
      const labelW = totalQuestions >= 100 ? 16 : 14;
      const bubbleAreaWidth = colWidth - labelW - 6;
      const bubbleSpacing = bubbleAreaWidth / numOpts;
      const bubbleStartX = colX + labelW + bubbleSpacing / 2;

      optLabels.forEach((label, optIdx) => {
        const bx = bubbleStartX + optIdx * bubbleSpacing;
        const by = ry + rowHeight / 2;

        doc.circle(bx, by, bRadius).strokeColor('#0f172a').lineWidth(0.55).stroke();
        doc.font('Helvetica-Bold').fontSize(bRadius > 4.5 ? 6 : 5).fill('#0f172a')
          .text(label, bx - (bRadius > 4.5 ? 2.2 : 1.8), by - (bRadius > 4.5 ? 3.2 : 2.5));
      });

      // Left timing mark (for scanner deskewing) on leftmost column
      if (c === 0) {
        doc.rect(margin - 7, ry + rowHeight / 2 - 1.8, 5, 3.6).fill('#000000');
      }
      // Right timing mark on rightmost column
      if (c === numColumns - 1) {
        doc.rect(pw - margin + 2, ry + rowHeight / 2 - 1.8, 5, 3.6).fill('#000000');
      }
    }
  }

  // 7. Anti-Piracy Watermark (Subtle background seal if enabled)
  if (paper.watermark !== false) {
    const wmText = String(paper.watermarkText || paper.instituteName || 'EXAMINATION').toUpperCase();
    doc.save();
    doc.opacity(0.038); // extra faint to guarantee zero optical scan interference
    doc.rotate(-35.3, { origin: [pw / 2, ph / 2] });
    doc.font('Helvetica-Bold').fontSize(32).fill('#0f172a');
    doc.text(wmText, pw / 2 - 350, ph / 2 - 16, { width: 700, align: 'center', lineBreak: false });
    doc.restore();
  }

  // 8. Security Footer Bar
  const footerY = ph - margin - 7;
  const sheetHash = `QF-OMR-${(paper.id || 'EXAM').slice(0, 8)}-SET-${isSetSpecific ? setChar : 'GEN'}-${totalQuestions}Q`.toUpperCase();
  doc.font('Helvetica').fontSize(6).fill('#64748b')
    .text(`${instName}   ·   SHEET ID: ${sheetHash}   ·   OPTICAL EVALUATION COMPATIBLE`, margin, footerY, { width: contentWidth, align: 'center' });

  doc.end();
}

module.exports = {
  buildOmrSheetPdf,
};
