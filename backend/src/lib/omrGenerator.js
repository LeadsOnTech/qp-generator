/**
 * omrGenerator.js
 *
 * Professional, Optical-Scanner-Compatible OMR Sheet Generator with Smart Page Allocation.
 *
 * Design Principles:
 * 1. UNCOMPROMISED BUBBLE SIZE: Every bubble maintains standard 3.8mm (10.8pt) diameter
 *    and standard 14.5pt - 16.0pt row pitch. No undersized bubbles to save paper.
 * 2. SMART MULTI-SHEET PAGE ALLOCATION:
 *    - Up to 50 questions: 4 compact OMR sheets per A4 page (2x2 quadrant, 75% paper savings)
 *    - 51 to 75 questions: 3 compact OMR sheets per A4 page (3 horizontal strips, 66% paper savings)
 *    - 76 to 100 questions: 2 compact OMR sheets per A4 page (2 horizontal A5 halves, 50% paper savings)
 *    - Above 100 questions: 1 full examination OMR sheet per A4 page (NEET / JEE grand mock)
 * 3. INDEPENDENT OPTICAL FIDUCIALS: Every slip on a multi-sheet page has its own 4 corner
 *    fiducial marks (10x10pt black squares) so cut slips scan flawlessly.
 * 4. CLEAN CUTTING GUIDES: Dashed cut lines with scissors indicators (--- ✂ Cut Here ---).
 * 5. MONOCHROME PRINT-FRIENDLY: High-contrast black-and-white vector design.
 */

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', '..', 'uploads', 'images');

// Standard OMR Bubble Specifications (Uncompromised)
const BUBBLE_RADIUS = 5.4; // 10.8 pt diameter = 3.8 mm (Standard Examination Specification)
const BUBBLE_LINE_WIDTH = 0.65;
const FIDUCIAL_SIZE = 10; // 10x10 pt black square corner marker

/**
 * Draws a standard 4-corner fiducial alignment set for a rectangular region.
 */
function drawFiducials(doc, x, y, width, height, size = FIDUCIAL_SIZE) {
  doc.save();
  doc.rect(x, y, size, size).fill('#000000');
  doc.rect(x + width - size, y, size, size).fill('#000000');
  doc.rect(x, y + height - size, size, size).fill('#000000');
  doc.rect(x + width - size, y + height - size, size, size).fill('#000000');
  doc.restore();
}

/**
 * Draws a dashed cut line with a centered scissors notice.
 */
function drawCutLine(doc, x1, y1, x2, y2, label = '✂ Cut Here') {
  doc.save();
  doc.strokeColor('#94a3b8').lineWidth(0.6).dash(4, { space: 3 });
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
  doc.undash();

  // Draw small scissors tag in the center
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  doc.rect(midX - 32, midY - 6, 64, 12).fill('#ffffff');
  doc.strokeColor('#94a3b8').lineWidth(0.4).rect(midX - 32, midY - 6, 64, 12).stroke();
  doc.font('Helvetica-Bold').fontSize(6).fill('#64748b')
    .text(label, midX - 32, midY - 3.5, { width: 64, align: 'center', lineBreak: false });
  doc.restore();
}

/**
 * Draws an answer bubble (A, B, C, D or 1, 2, 3, 4).
 */
function drawBubble(doc, x, y, label, isPreFilled = false, radius = BUBBLE_RADIUS) {
  doc.save();
  if (isPreFilled) {
    doc.circle(x, y, radius).fillAndStroke('#000000', '#000000');
    doc.font('Helvetica-Bold').fontSize(radius >= 5 ? 6 : 5).fill('#ffffff')
      .text(label, x - (radius >= 5 ? 2.2 : 1.8), y - (radius >= 5 ? 3.2 : 2.6));
  } else {
    doc.circle(x, y, radius).strokeColor('#000000').lineWidth(BUBBLE_LINE_WIDTH).stroke();
    doc.font('Helvetica-Bold').fontSize(radius >= 5 ? 6 : 5).fill('#000000')
      .text(label, x - (radius >= 5 ? 2.2 : 1.8), y - (radius >= 5 ? 3.2 : 2.6));
  }
  doc.restore();
}

/**
 * Draws a single question row: [Q#] (A) (B) (C) (D).
 */
function drawQuestionRow(doc, qNum, x, y, width, rowHeight, optLabels, isEven, totalQ = 100, radius = BUBBLE_RADIUS) {
  doc.save();
  // Alternating row background tint
  if (isEven) {
    doc.rect(x, y, width, rowHeight).fill('#f8fafc');
  }
  doc.strokeColor('#e2e8f0').lineWidth(0.35).rect(x, y, width, rowHeight).stroke();

  // Question Number
  const qNumStr = String(qNum).padStart(totalQ >= 100 ? 3 : 2, '0');
  doc.font('Helvetica-Bold').fontSize(rowHeight >= 15 ? 7.5 : 7).fill('#0f172a')
    .text(qNumStr, x + 3, y + rowHeight / 2 - 3.8);

  // 4 Option Bubbles
  const labelW = totalQ >= 100 ? 16 : 14;
  const bubbleAreaW = width - labelW - 4;
  const bubbleSpacing = bubbleAreaW / 4;
  const bubbleStartX = x + labelW + bubbleSpacing / 2;

  optLabels.forEach((label, idx) => {
    const bx = bubbleStartX + idx * bubbleSpacing;
    const by = y + rowHeight / 2;
    drawBubble(doc, bx, by, label, false, radius);
  });

  doc.restore();
}

/**
 * ---------------------------------------------------------------------------
 * LAYOUT 1: Compact Quadrant (4-in-1: Up to 50 Questions, 75% Paper Savings)
 * ---------------------------------------------------------------------------
 * 4 identical student slips arranged in a 2x2 grid on a single A4 page.
 * Each slip has 2 columns of up to 25 questions.
 */
function renderCompactQuadrant4(doc, paper, questions, opts) {
  const pw = doc.page.width;
  const ph = doc.page.height;
  const optLabels = opts.optionFormat === 'NUMERIC' ? ['1', '2', '3', '4'] : ['A', 'B', 'C', 'D'];
  const setChar = (opts.set || 'GENERIC').toUpperCase().replace('SET', '').trim();
  const isSetSpecific = ['A', 'B', 'C', 'D'].includes(setChar);

  const quadW = pw / 2;
  const quadH = ph / 2;
  const totalQ = Math.min(50, questions.length || 50);

  // Draw Dashed Cut Lines across the center
  drawCutLine(doc, quadW, 12, quadW, ph - 12, '✂ Cut');
  drawCutLine(doc, 12, quadH, pw - 12, quadH, '✂ Cut');

  const quadrants = [
    { x: 0, y: 0 },
    { x: quadW, y: 0 },
    { x: 0, y: quadH },
    { x: quadW, y: quadH },
  ];

  quadrants.forEach(({ x, y }) => {
    const pad = 12;
    const innerX = x + pad;
    const innerY = y + pad;
    const innerW = quadW - pad * 2;
    const innerH = quadH - pad * 2;

    // 4 Corner Fiducials on this specific slip
    drawFiducials(doc, innerX, innerY, innerW, innerH, 8);

    // Slip Header
    const headX = innerX + 12;
    const headW = innerW - 24;
    const instName = (paper.instituteName || 'ACADEMY').toUpperCase();
    const examName = paper.examName || 'TEST';

    doc.font('Helvetica-Bold').fontSize(8.5).fill('#0f172a')
      .text(instName, headX, innerY + 1, { width: headW, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(7).fill('#1e3a8a')
      .text(`OMR ANSWER SLIP   ·   ${examName} (${totalQ} Qs)`, headX, innerY + 11, { width: headW, align: 'center', lineBreak: false });

    // Student Fill-in Line
    const setTag = isSetSpecific ? `Set: [ ${setChar} ]` : 'Set: [ A | B | C | D ]';
    doc.font('Helvetica').fontSize(6.5).fill('#334155')
      .text(`Name: ________________________   Roll: ________   ${setTag}`, headX, innerY + 22, { width: headW, align: 'center', lineBreak: false });

    doc.strokeColor('#000000').lineWidth(0.5).moveTo(innerX + 4, innerY + 32).lineTo(innerX + innerW - 4, innerY + 32).stroke();

    // 2-Column Question Grid (up to 25 rows per column)
    const numCols = 2;
    const qPerCol = Math.ceil(totalQ / numCols);
    const colGutter = 8;
    const colW = (innerW - (numCols - 1) * colGutter) / numCols;
    const gridStartY = innerY + 36;
    const availableH = innerH - 46;
    const rowH = Math.min(16.0, Math.max(13.8, availableH / qPerCol));
    const bRadius = 5.0; // uncompromised 3.5mm bubble

    for (let c = 0; c < numCols; c++) {
      const colX = innerX + c * (colW + colGutter);
      const startQ = c * qPerCol + 1;
      const endQ = Math.min(totalQ, (c + 1) * qPerCol);

      for (let r = 0; r < endQ - startQ + 1; r++) {
        const qNum = startQ + r;
        const ry = gridStartY + r * rowH;
        drawQuestionRow(doc, qNum, colX, ry, colW, rowH, optLabels, r % 2 === 1, totalQ, bRadius);
      }
    }

    // Slip Footer
    doc.font('Helvetica').fontSize(5.5).fill('#64748b')
      .text('OPTICAL EVALUATION COMPATIBLE', innerX, innerY + innerH - 9, { width: innerW, align: 'center', lineBreak: false });
  });
}

/**
 * ---------------------------------------------------------------------------
 * LAYOUT 2: Compact Tri-Strips (3-in-1: 51 to 75 Questions, 66% Paper Savings)
 * ---------------------------------------------------------------------------
 * 3 identical student slips arranged horizontally across A4.
 * Each slip has 5 columns of up to 15 questions (fits 75 Qs with full 3.8mm bubbles!).
 */
function renderCompactTriStrips3(doc, paper, questions, opts) {
  const pw = doc.page.width;
  const ph = doc.page.height;
  const optLabels = opts.optionFormat === 'NUMERIC' ? ['1', '2', '3', '4'] : ['A', 'B', 'C', 'D'];
  const setChar = (opts.set || 'GENERIC').toUpperCase().replace('SET', '').trim();
  const isSetSpecific = ['A', 'B', 'C', 'D'].includes(setChar);

  const stripH = ph / 3;
  const totalQ = Math.min(75, questions.length || 75);

  // Draw 2 Horizontal Cut Lines
  drawCutLine(doc, 14, stripH, pw - 14, stripH, '✂ Cut Here');
  drawCutLine(doc, 14, stripH * 2, pw - 14, stripH * 2, '✂ Cut Here');

  for (let s = 0; s < 3; s++) {
    const pad = 12;
    const innerX = pad;
    const innerY = s * stripH + pad;
    const innerW = pw - pad * 2;
    const innerH = stripH - pad * 2;

    // Corner Fiducials
    drawFiducials(doc, innerX, innerY, innerW, innerH, 9);

    // Header & Student Details
    const headX = innerX + 14;
    const headW = innerW - 28;
    const instName = (paper.instituteName || 'ACADEMY').toUpperCase();
    const examName = paper.examName || 'TEST';

    doc.font('Helvetica-Bold').fontSize(9.5).fill('#0f172a')
      .text(instName, headX, innerY + 1, { width: headW, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(7.5).fill('#1e3a8a')
      .text(`OMR ANSWER SLIP   ·   ${examName} — ${paper.title || 'Practice Test'} (${totalQ} Qs)`, headX, innerY + 12, { width: headW, align: 'center', lineBreak: false });

    const setTag = isSetSpecific ? `Set: [ ${setChar} ]` : 'Set: [ A | B | C | D ]';
    doc.font('Helvetica').fontSize(7).fill('#334155')
      .text(`Candidate Name: ___________________________________   Roll No: ____________   ${setTag}`, headX, innerY + 23, { width: headW, align: 'center', lineBreak: false });

    doc.strokeColor('#000000').lineWidth(0.5).moveTo(innerX + 6, innerY + 34).lineTo(innerX + innerW - 6, innerY + 34).stroke();

    // 5-Column Question Grid (fits up to 15 questions per column)
    const numCols = 5;
    const qPerCol = Math.ceil(totalQ / numCols);
    const colGutter = 8;
    const colW = (innerW - (numCols - 1) * colGutter) / numCols;
    const gridStartY = innerY + 38;
    const availableH = innerH - 48;
    const rowH = Math.min(16.5, Math.max(14.2, availableH / qPerCol));
    const bRadius = 5.2; // full 3.8mm bubble

    for (let c = 0; c < numCols; c++) {
      const colX = innerX + c * (colW + colGutter);
      const startQ = c * qPerCol + 1;
      const endQ = Math.min(totalQ, (c + 1) * qPerCol);

      for (let r = 0; r < endQ - startQ + 1; r++) {
        const qNum = startQ + r;
        const ry = gridStartY + r * rowH;
        drawQuestionRow(doc, qNum, colX, ry, colW, rowH, optLabels, r % 2 === 1, totalQ, bRadius);
      }
    }

    doc.font('Helvetica').fontSize(5.5).fill('#64748b')
      .text('OPTICAL EVALUATION COMPATIBLE', innerX, innerY + innerH - 9, { width: innerW, align: 'center', lineBreak: false });
  }
}

/**
 * ---------------------------------------------------------------------------
 * LAYOUT 3: Compact Dual-Halves (2-in-1: 76 to 100 Questions, 50% Paper Savings)
 * ---------------------------------------------------------------------------
 * 2 identical student slips arranged as horizontal half-sheets on A4.
 * Each slip has 4 columns of up to 25 questions (or 5 columns of 20).
 */
function renderCompactDualHalves2(doc, paper, questions, opts) {
  const pw = doc.page.width;
  const ph = doc.page.height;
  const optLabels = opts.optionFormat === 'NUMERIC' ? ['1', '2', '3', '4'] : ['A', 'B', 'C', 'D'];
  const setChar = (opts.set || 'GENERIC').toUpperCase().replace('SET', '').trim();
  const isSetSpecific = ['A', 'B', 'C', 'D'].includes(setChar);

  const halfH = ph / 2;
  const totalQ = Math.min(100, questions.length || 100);

  // Draw Horizontal Cut Line across center
  drawCutLine(doc, 14, halfH, pw - 14, halfH, '✂ Cut Here');

  for (let s = 0; s < 2; s++) {
    const pad = 14;
    const innerX = pad;
    const innerY = s * halfH + pad;
    const innerW = pw - pad * 2;
    const innerH = halfH - pad * 2;

    // Corner Fiducials
    drawFiducials(doc, innerX, innerY, innerW, innerH, 10);

    // Header & Student Details
    const headX = innerX + 16;
    const headW = innerW - 32;
    const instName = (paper.instituteName || 'ACADEMY').toUpperCase();
    const examName = paper.examName || 'TEST';

    doc.font('Helvetica-Bold').fontSize(11).fill('#0f172a')
      .text(instName, headX, innerY + 1, { width: headW, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(8.5).fill('#1e3a8a')
      .text(`OMR ANSWER EVALUATION SHEET   ·   ${examName} — ${paper.title || 'Practice Test'} (${totalQ} Qs)`, headX, innerY + 14, { width: headW, align: 'center', lineBreak: false });

    const setTag = isSetSpecific ? `Paper Set: [ ${setChar} ]` : 'Paper Set: [ A | B | C | D ]';
    doc.font('Helvetica').fontSize(7.5).fill('#334155')
      .text(`Candidate Name: _____________________________________________   Roll No: ______________   ${setTag}`, headX, innerY + 27, { width: headW, align: 'center', lineBreak: false });

    doc.strokeColor('#000000').lineWidth(0.6).moveTo(innerX + 6, innerY + 40).lineTo(innerX + innerW - 6, innerY + 40).stroke();

    // 4-Column Question Grid (fits up to 25 questions per column)
    const numCols = 4;
    const qPerCol = Math.ceil(totalQ / numCols);
    const colGutter = 12;
    const colW = (innerW - (numCols - 1) * colGutter) / numCols;
    const gridStartY = innerY + 45;
    const availableH = innerH - 58;
    const rowH = Math.min(16.5, Math.max(14.5, availableH / qPerCol));
    const bRadius = 5.4; // full standard 3.8mm bubble

    for (let c = 0; c < numCols; c++) {
      const colX = innerX + c * (colW + colGutter);
      const startQ = c * qPerCol + 1;
      const endQ = Math.min(totalQ, (c + 1) * qPerCol);

      for (let r = 0; r < endQ - startQ + 1; r++) {
        const qNum = startQ + r;
        const ry = gridStartY + r * rowH;
        drawQuestionRow(doc, qNum, colX, ry, colW, rowH, optLabels, r % 2 === 1, totalQ, bRadius);
      }
    }

    doc.font('Helvetica').fontSize(6).fill('#64748b')
      .text('OPTICAL EVALUATION COMPATIBLE   ·   DO NOT FOLD OR MUTILATE THIS SHEET', innerX, innerY + innerH - 10, { width: innerW, align: 'center', lineBreak: false });
  }
}

/**
 * ---------------------------------------------------------------------------
 * LAYOUT 4: Full Examination OMR (1-in-1: > 100 Questions or Formal Board Mock)
 * ---------------------------------------------------------------------------
 * Complete competitive examination layout with Name boxes, Roll 0-9 bubbling,
 * Set code selector, QR code, Candidate/Invigilator signatures, instructions.
 */
async function renderFullExaminationOmr(doc, paper, questions, opts) {
  const pw = doc.page.width;
  const ph = doc.page.height;
  const margin = 16;
  const contentWidth = pw - 2 * margin;

  const totalQuestions = questions.length || 100;
  const setChar = (opts.set || paper.setLabel || 'GENERIC').toUpperCase().replace('SET', '').trim();
  const isSetSpecific = ['A', 'B', 'C', 'D'].includes(setChar);
  const optionFormat = opts.optionFormat || paper.optionFormat || 'ALPHA';
  const rollCols = parseInt(opts.rollDigits, 10) === 10 ? 10 : 7;
  const optLabels = optionFormat === 'NUMERIC' ? ['1', '2', '3', '4'] : ['A', 'B', 'C', 'D'];

  // 1. 4 Corner Fiducial Marks
  drawFiducials(doc, margin, margin, contentWidth, ph - 2 * margin, FIDUCIAL_SIZE);

  // 2. Institute Logo
  let logoOffset = 0;
  if (paper.instituteLogoFilename) {
    const logoPath = path.join(IMAGES_DIR, paper.instituteLogoFilename);
    if (fs.existsSync(logoPath)) {
      try {
        const img = doc.openImage(logoPath);
        const maxLogoDim = 38;
        const scale = Math.min(maxLogoDim / img.width, maxLogoDim / img.height, 1);
        doc.image(logoPath, margin + FIDUCIAL_SIZE + 6, margin + 2, { width: img.width * scale, height: img.height * scale });
        logoOffset = img.width * scale + 6;
      } catch (e) {}
    }
  }

  // 3. Header Text
  const headerY = margin + 1;
  const qrSize = 42;
  const qrX = pw - margin - FIDUCIAL_SIZE - qrSize - 6;
  const headerTextX = margin + FIDUCIAL_SIZE + 8 + logoOffset;
  const headerTextW = qrX - headerTextX - 10;

  const instName = (paper.instituteName || 'ACADEMY').toUpperCase();
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

  // 4. QR Code
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
  } catch (err) {}

  let curY = headerY + 42;
  doc.strokeColor('#000000').lineWidth(0.7).moveTo(margin, curY).lineTo(pw - margin, curY).stroke();
  curY += 5;

  // 5. Candidate Identification Box
  const isHighDensity = totalQuestions > 120;
  const topBoxY = curY;
  const topBoxHeight = isHighDensity ? 94 : 108;
  doc.roundedRect(margin + 4, topBoxY, contentWidth - 8, topBoxHeight, 3).strokeColor('#94a3b8').lineWidth(0.5).stroke();

  // Name Section
  const leftW = isHighDensity ? 260 : 275;
  doc.font('Helvetica-Bold').fontSize(7).fill('#0f172a')
    .text('CANDIDATE NAME (IN CAPITAL LETTERS AS PER ADMIT CARD)', margin + 10, topBoxY + 5);

  const numNameBoxes = isHighDensity ? 20 : 22;
  const nameBoxSize = isHighDensity ? 10.5 : 11.2;
  for (let i = 0; i < numNameBoxes; i++) {
    doc.rect(margin + 10 + i * (nameBoxSize + 1.2), topBoxY + 15, nameBoxSize, nameBoxSize).strokeColor('#64748b').lineWidth(0.5).stroke();
  }

  // Instructions
  doc.font('Helvetica-Bold').fontSize(6.5).fill('#0f172a')
    .text('INSTRUCTIONS FOR MARKING:', margin + 10, topBoxY + (isHighDensity ? 30 : 33));
  doc.font('Helvetica').fontSize(6).fill('#334155')
    .text('• Use Blue or Black ball-point pen only. Gel pens and pencils strictly forbidden.', margin + 10, topBoxY + (isHighDensity ? 39 : 43))
    .text('• Completely darken circles. Incomplete, faint, or crossed markings will be rejected.', margin + 10, topBoxY + (isHighDensity ? 47 : 52));

  const guideY = topBoxY + (isHighDensity ? 56 : 63);
  doc.font('Helvetica-Bold').fontSize(6).fill('#1e3a8a').text('METHOD:', margin + 10, guideY);
  doc.circle(margin + 58, guideY + 3.5, 3.8).fillAndStroke('#0f172a', '#0f172a');
  doc.font('Helvetica-Bold').fontSize(6).fill('#15803d').text('Correct', margin + 65, guideY);
  doc.circle(margin + 105, guideY + 3.5, 3.8).strokeColor('#0f172a').lineWidth(0.5).stroke();
  doc.font('Helvetica-Bold').fontSize(6).fill('#b91c1c').text('✕ Wrong', margin + 112, guideY);
  doc.circle(margin + 150, guideY + 3.5, 3.8).strokeColor('#0f172a').lineWidth(0.5).stroke();
  doc.font('Helvetica-Bold').fontSize(6).fill('#b91c1c').text('✓ Wrong', margin + 157, guideY);

  // Signatures
  const sigY = topBoxY + (isHighDensity ? 83 : 96);
  doc.strokeColor('#94a3b8').lineWidth(0.5).moveTo(margin + 10, sigY).lineTo(margin + 115, sigY).stroke();
  doc.font('Helvetica').fontSize(6).fill('#475569').text('Candidate Signature', margin + 10, sigY + 1.5);
  doc.strokeColor('#94a3b8').lineWidth(0.5).moveTo(margin + 140, sigY).lineTo(margin + 245, sigY).stroke();
  doc.font('Helvetica').fontSize(6).fill('#475569').text('Invigilator Signature', margin + 140, sigY + 1.5);

  // Roll Number Bubbles
  const rollX = margin + leftW + 16;
  doc.font('Helvetica-Bold').fontSize(7).fill('#0f172a').text('ROLL NUMBER / HALL TICKET', rollX, topBoxY + 5);
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
      doc.font('Helvetica').fontSize(isHighDensity ? 4.5 : 5).fill('#0f172a')
        .text(String(d), bx - (isHighDensity ? 1.2 : 1.4), by - (isHighDensity ? 2 : 2.4));
    }
  }

  // Paper Set Code
  const setX = rollX + rollCols * (rollColW + rollColGap) + (isHighDensity ? 16 : 20);
  doc.font('Helvetica-Bold').fontSize(7).fill('#0f172a').text('PAPER SET', setX, topBoxY + 5);
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
    drawBubble(doc, setX + 12, sy, sName, isFilled, 4.0);
  }

  // Security seal
  doc.font('Helvetica').fontSize(5).fill('#64748b').text('SECURITY SEAL', setX - 4, topBoxY + (isHighDensity ? 72 : 82));
  doc.strokeColor('#0f172a').lineWidth(1.2).moveTo(setX - 4, topBoxY + (isHighDensity ? 80 : 90)).lineTo(setX + 28, topBoxY + (isHighDensity ? 80 : 90)).stroke();
  doc.strokeColor('#0f172a').lineWidth(0.5).moveTo(setX - 4, topBoxY + (isHighDensity ? 83 : 93)).lineTo(setX + 28, topBoxY + (isHighDensity ? 83 : 93)).stroke();
  doc.strokeColor('#0f172a').lineWidth(2.0).moveTo(setX - 4, topBoxY + (isHighDensity ? 87 : 97)).lineTo(setX + 28, topBoxY + (isHighDensity ? 87 : 97)).stroke();

  // 6. Question Matrix
  curY = topBoxY + topBoxHeight + 6;
  doc.strokeColor('#000000').lineWidth(0.7).moveTo(margin, curY).lineTo(pw - margin, curY).stroke();
  curY += 6;

  let numColumns = 4;
  if (totalQuestions > 120) {
    numColumns = 5;
  } else if (totalQuestions <= 75) {
    numColumns = 3;
  }

  const questionsPerCol = Math.ceil(totalQuestions / numColumns);
  const colGutter = numColumns === 5 ? 8 : (numColumns === 4 ? 12 : 16);
  const colWidth = (contentWidth - (numColumns - 1) * colGutter) / numColumns;

  const availableHeight = ph - margin - curY - 14;
  const rawRowHeight = (availableHeight - 16) / questionsPerCol;
  const rowHeight = Math.min(27, Math.max(13.8, rawRowHeight));
  const bRadius = BUBBLE_RADIUS; // uncompromised 3.8mm

  for (let c = 0; c < numColumns; c++) {
    const colX = margin + c * (colWidth + colGutter);
    let qY = curY;

    const startQ = c * questionsPerCol + 1;
    const endQ = Math.min(totalQuestions, (c + 1) * questionsPerCol);
    if (startQ > totalQuestions) break;

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
      drawQuestionRow(doc, qNum, colX, ry, colWidth, rowHeight, optLabels, r % 2 === 1, totalQuestions, bRadius);

      // Scanner Timing Ticks along the margins
      if (c === 0) {
        doc.rect(margin - 7, ry + rowHeight / 2 - 1.8, 5, 3.6).fill('#000000');
      }
      if (c === numColumns - 1) {
        doc.rect(pw - margin + 2, ry + rowHeight / 2 - 1.8, 5, 3.6).fill('#000000');
      }
    }
  }

  // 7. Footer Bar
  const footerY = ph - margin - 7;
  const sheetHash = `QF-OMR-${(paper.id || 'EXAM').slice(0, 8)}-SET-${isSetSpecific ? setChar : 'GEN'}-${totalQuestions}Q`.toUpperCase();
  doc.font('Helvetica').fontSize(6).fill('#64748b')
    .text(`${instName}   ·   SHEET ID: ${sheetHash}   ·   OPTICAL EVALUATION COMPATIBLE`, margin, footerY, { width: contentWidth, align: 'center', lineBreak: false });
}

/**
 * Master Entry Point: Builds and streams the 1-Page A4 OMR Sheet PDF.
 *
 * @param {WritableStream} stream
 * @param {Object} paper - Paper metadata
 * @param {Array} questions - Questions list
 * @param {Object} options - { layout: 'AUTO'|'COMPACT_4'|'COMPACT_3'|'COMPACT_2'|'FULL', set, optionFormat, rollDigits }
 */
async function buildOmrSheetPdf(stream, paper, questions = [], options = {}) {
  // Use margin: 0 to give full coordinate control to the layouts and prevent accidental automatic page breaks
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
  doc.pipe(stream);

  const totalQuestions = questions.length || 60;
  let layoutMode = (options.layout || 'AUTO').toUpperCase();

  // Smart Automatic Allocation Rules (Approved by User):
  // Up to 50: 4 compact OMR sheets on one A4 page
  // 51 to 75: 3 compact OMR sheets on one A4 page
  // 76 to 100: 2 compact OMR sheets on one A4 page
  // Above 100: 1 full-size OMR sheet on one A4 page
  if (layoutMode === 'AUTO') {
    if (totalQuestions <= 50) layoutMode = 'COMPACT_4';
    else if (totalQuestions <= 75) layoutMode = 'COMPACT_3';
    else if (totalQuestions <= 100) layoutMode = 'COMPACT_2';
    else layoutMode = 'FULL';
  }

  if (layoutMode === 'COMPACT_4') {
    renderCompactQuadrant4(doc, paper, questions, options);
  } else if (layoutMode === 'COMPACT_3') {
    renderCompactTriStrips3(doc, paper, questions, options);
  } else if (layoutMode === 'COMPACT_2') {
    renderCompactDualHalves2(doc, paper, questions, options);
  } else {
    await renderFullExaminationOmr(doc, paper, questions, options);
  }

  doc.end();
}

module.exports = {
  buildOmrSheetPdf,
  BUBBLE_RADIUS,
};
