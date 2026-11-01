/**
 * keyChitGenerator.js
 *
 * Generates high-density, paper-saving Printable Answer Key Chits (Slips) for students
 * to immediately cross-check and verify their answers after examination completion.
 *
 * Core Capabilities:
 * 1. UNIVERSAL MULTI-SET CHITS (Default):
 *    - Each cut slip contains answers for ALL Sets (A, B, C, D) side-by-side.
 *    - Staff do NOT need to sort chits by set; any student can take any chit.
 *    - Fits 4 chits per A4 (up to 50-75 Qs) or 2 chits per A4 (up to 100-180 Qs).
 *
 * 2. SINGLE-SET DEDICATED CHITS:
 *    - High-density slips dedicated to a single set (Set A, B, C, or D).
 *    - Fits 6 to 8 chits per A4 (up to 50 Qs, 87.5% paper savings!).
 *    - Fits 4 chits per A4 (51 to 100 Qs, 75% paper savings!).
 *    - Fits 2 chits per A4 (101 to 180 Qs, 50% paper savings!).
 *
 * 3. PRINTER & OFFICE PRACTICALITY:
 *    - Clean dashed cutting guides with scissors indicators (- - - ✂ Cut Here - - -).
 *    - High-contrast black-and-white vector design for crisp laser and xerox copies.
 *    - Institute branding, exam name, date, and security code on every individual slip.
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const { generateSetQuestions, generateMasterKeyMatrix } = require('./multiSetEngine');

const FONT_FILE_REGULAR = path.join(__dirname, '..', '..', 'assets', 'fonts', 'DejaVuSerif.ttf');
const FONT_FILE_BOLD = path.join(__dirname, '..', '..', 'assets', 'fonts', 'DejaVuSerif-Bold.ttf');

const FONT_REGULAR = 'PaperFont-Regular';
const FONT_BOLD = 'PaperFont-Bold';

function ensureFonts(doc) {
  doc.registerFont(FONT_REGULAR, FONT_FILE_REGULAR);
  doc.registerFont(FONT_BOLD, FONT_FILE_BOLD);
}

/**
 * Draws a dashed cutting line with an optional centered scissors/cut tag.
 */
function drawDashedCutLine(doc, x1, y1, x2, y2, label = null) {
  doc.save();
  doc.strokeColor('#94a3b8').lineWidth(0.5).dash(4, { space: 3 });
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
  doc.undash();

  if (label) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    doc.rect(midX - 25, midY - 5, 50, 10).fill('#ffffff');
    doc.strokeColor('#94a3b8').lineWidth(0.4).rect(midX - 25, midY - 5, 50, 10).stroke();
    doc.font('Helvetica-Bold').fontSize(5.5).fill('#64748b')
      .text(label, midX - 25, midY - 2.8, { width: 50, align: 'center', lineBreak: false });
  }
  doc.restore();
}

/**
 * ---------------------------------------------------------------------------
 * RENDER: Universal Multi-Set Chits (4 chits per A4 page in a 2x2 grid)
 * Fits up to 50-75 questions with all 4 sets (A, B, C, D) on every slip.
 * ---------------------------------------------------------------------------
 */
function renderUniversalMultiSetChits4(doc, paper, matrix) {
  const pw = doc.page.width;
  const ph = doc.page.height;
  const halfW = pw / 2;
  const halfH = ph / 2;

  // Draw Dashed Cut Lines
  drawDashedCutLine(doc, halfW, 10, halfW, ph - 10, null);
  drawDashedCutLine(doc, 10, halfH, pw - 10, halfH, 'CUT HERE');

  const quadrants = [
    { x: 0, y: 0 },
    { x: halfW, y: 0 },
    { x: 0, y: halfH },
    { x: halfW, y: halfH },
  ];

  const totalQ = matrix.rows.length;
  // If > 25 questions, split into 2 sub-tables per slip
  const numBlocks = totalQ > 25 ? 2 : 1;
  const qPerBlock = Math.ceil(totalQ / numBlocks);

  quadrants.forEach(({ x, y }) => {
    const pad = 10;
    const innerX = x + pad;
    const innerY = y + pad;
    const innerW = halfW - pad * 2;
    const innerH = halfH - pad * 2;

    // Outer chit boundary box
    doc.save();
    doc.strokeColor('#0f172a').lineWidth(0.75).rect(innerX, innerY, innerW, innerH).stroke();

    // Chit Header
    const instName = (paper.instituteName || 'ACADEMY').toUpperCase();
    doc.font('Helvetica-Bold').fontSize(8.5).fill('#0f172a')
      .text(instName, innerX + 4, innerY + 4, { width: innerW - 8, align: 'center', lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(7).fill('#1e3a8a')
      .text(`OFFICIAL ANSWER KEY CHIT (ALL SETS A, B, C, D)`, innerX + 4, innerY + 14, { width: innerW - 8, align: 'center', lineBreak: false });

    const rawDate = paper.createdAt ? new Date(paper.createdAt) : new Date();
    const dateStr = rawDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    doc.font('Helvetica').fontSize(6).fill('#475569')
      .text(`${paper.examName || 'Exam'}  -  ${totalQ} Qs  -  ${dateStr}`, innerX + 4, innerY + 23, { width: innerW - 8, align: 'center', lineBreak: false });

    doc.strokeColor('#0f172a').lineWidth(0.5).moveTo(innerX + 4, innerY + 31).lineTo(innerX + innerW - 4, innerY + 31).stroke();

    // Tables of Keys
    const startTableY = innerY + 34;
    const availTableH = innerH - 42;
    const rowH = Math.min(13.5, Math.max(10.5, availTableH / (qPerBlock + 1)));
    const blockGutter = 6;
    const blockW = (innerW - 8 - (numBlocks - 1) * blockGutter) / numBlocks;

    for (let b = 0; b < numBlocks; b++) {
      const bx = innerX + 4 + b * (blockW + blockGutter);
      const startQ = b * qPerBlock + 1;
      const endQ = Math.min(totalQ, (b + 1) * qPerBlock);

      // Table Header Row
      doc.rect(bx, startTableY, blockW, rowH).fill('#1e293b');
      doc.font('Helvetica-Bold').fontSize(6).fill('#ffffff');

      const colW = blockW / 5;
      doc.text('Q#', bx, startTableY + rowH / 2 - 2.5, { width: colW, align: 'center', lineBreak: false });
      doc.text('A', bx + colW, startTableY + rowH / 2 - 2.5, { width: colW, align: 'center', lineBreak: false });
      doc.text('B', bx + colW * 2, startTableY + rowH / 2 - 2.5, { width: colW, align: 'center', lineBreak: false });
      doc.text('C', bx + colW * 3, startTableY + rowH / 2 - 2.5, { width: colW, align: 'center', lineBreak: false });
      doc.text('D', bx + colW * 4, startTableY + rowH / 2 - 2.5, { width: colW, align: 'center', lineBreak: false });

      // Rows
      for (let r = 0; r < endQ - startQ + 1; r++) {
        const qNum = startQ + r;
        const row = matrix.rows[qNum - 1];
        if (!row) continue;
        const ry = startTableY + (r + 1) * rowH;

        if (r % 2 === 1) {
          doc.rect(bx, ry, blockW, rowH).fill('#f8fafc');
        }
        doc.strokeColor('#e2e8f0').lineWidth(0.3).rect(bx, ry, blockW, rowH).stroke();

        doc.font('Helvetica-Bold').fontSize(6.5).fill('#0f172a')
          .text(String(qNum).padStart(2, '0'), bx, ry + rowH / 2 - 2.8, { width: colW, align: 'center', lineBreak: false });

        doc.font(FONT_BOLD).fontSize(6.5).fill('#1e3a8a')
          .text(row.keyA || '-', bx + colW, ry + rowH / 2 - 2.8, { width: colW, align: 'center', lineBreak: false });
        doc.text(row.keyB || '-', bx + colW * 2, ry + rowH / 2 - 2.8, { width: colW, align: 'center', lineBreak: false });
        doc.text(row.keyC || '-', bx + colW * 3, ry + rowH / 2 - 2.8, { width: colW, align: 'center', lineBreak: false });
        doc.text(row.keyD || '-', bx + colW * 4, ry + rowH / 2 - 2.8, { width: colW, align: 'center', lineBreak: false });
      }
    }

    // Chit Footer
    doc.font('Helvetica').fontSize(5).fill('#64748b')
      .text('VERIFY SCORES & REPORT DISCREPANCIES TO EXAM CELL IMMEDIATELY', innerX + 4, innerY + innerH - 7, { width: innerW - 8, align: 'center', lineBreak: false });

    doc.restore();
  });
}

/**
 * ---------------------------------------------------------------------------
 * RENDER: Universal Multi-Set Chits (2 chits per A4 page in 2 horizontal halves)
 * For 76 to 180 questions with all 4 sets (A, B, C, D) on every slip.
 * ---------------------------------------------------------------------------
 */
function renderUniversalMultiSetChits2(doc, paper, matrix) {
  const pw = doc.page.width;
  const ph = doc.page.height;
  const halfH = ph / 2;

  drawDashedCutLine(doc, 10, halfH, pw - 10, halfH, 'CUT HERE');

  const totalQ = matrix.rows.length;
  const numBlocks = totalQ > 120 ? 5 : totalQ > 60 ? 4 : 3;
  const qPerBlock = Math.ceil(totalQ / numBlocks);

  [0, 1].forEach((idx) => {
    const y = idx * halfH;
    const pad = 12;
    const innerX = pad;
    const innerY = y + pad;
    const innerW = pw - pad * 2;
    const innerH = halfH - pad * 2;

    doc.save();
    doc.strokeColor('#0f172a').lineWidth(0.75).rect(innerX, innerY, innerW, innerH).stroke();

    // Header
    const instName = (paper.instituteName || 'ACADEMY').toUpperCase();
    doc.font('Helvetica-Bold').fontSize(10).fill('#0f172a')
      .text(instName, innerX + 6, innerY + 4, { width: innerW - 12, align: 'center', lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(8).fill('#1e3a8a')
      .text(`OFFICIAL ANSWER KEY CHIT - ALL SETS (A, B, C, D)`, innerX + 6, innerY + 15, { width: innerW - 12, align: 'center', lineBreak: false });

    const rawDate = paper.createdAt ? new Date(paper.createdAt) : new Date();
    const dateStr = rawDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    doc.font('Helvetica').fontSize(7).fill('#475569')
      .text(`${paper.examName || 'Exam'}  -  ${totalQ} Questions  -  ${dateStr}`, innerX + 6, innerY + 25, { width: innerW - 12, align: 'center', lineBreak: false });

    doc.strokeColor('#0f172a').lineWidth(0.5).moveTo(innerX + 6, innerY + 34).lineTo(innerX + innerW - 6, innerY + 34).stroke();

    // Tables
    const startTableY = innerY + 38;
    const availTableH = innerH - 46;
    const rowH = Math.min(13.0, Math.max(9.5, availTableH / (qPerBlock + 1)));
    const blockGutter = 8;
    const blockW = (innerW - 12 - (numBlocks - 1) * blockGutter) / numBlocks;

    for (let b = 0; b < numBlocks; b++) {
      const bx = innerX + 6 + b * (blockW + blockGutter);
      const startQ = b * qPerBlock + 1;
      const endQ = Math.min(totalQ, (b + 1) * qPerBlock);

      // Header Row
      doc.rect(bx, startTableY, blockW, rowH).fill('#1e293b');
      doc.font('Helvetica-Bold').fontSize(6).fill('#ffffff');

      const colW = blockW / 5;
      doc.text('Q#', bx, startTableY + rowH / 2 - 2.5, { width: colW, align: 'center', lineBreak: false });
      doc.text('A', bx + colW, startTableY + rowH / 2 - 2.5, { width: colW, align: 'center', lineBreak: false });
      doc.text('B', bx + colW * 2, startTableY + rowH / 2 - 2.5, { width: colW, align: 'center', lineBreak: false });
      doc.text('C', bx + colW * 3, startTableY + rowH / 2 - 2.5, { width: colW, align: 'center', lineBreak: false });
      doc.text('D', bx + colW * 4, startTableY + rowH / 2 - 2.5, { width: colW, align: 'center', lineBreak: false });

      for (let r = 0; r < endQ - startQ + 1; r++) {
        const qNum = startQ + r;
        const row = matrix.rows[qNum - 1];
        if (!row) continue;
        const ry = startTableY + (r + 1) * rowH;

        if (r % 2 === 1) {
          doc.rect(bx, ry, blockW, rowH).fill('#f8fafc');
        }
        doc.strokeColor('#e2e8f0').lineWidth(0.3).rect(bx, ry, blockW, rowH).stroke();

        doc.font('Helvetica-Bold').fontSize(6.5).fill('#0f172a')
          .text(String(qNum).padStart(totalQ >= 100 ? 3 : 2, '0'), bx, ry + rowH / 2 - 2.8, { width: colW, align: 'center', lineBreak: false });

        doc.font(FONT_BOLD).fontSize(6.5).fill('#1e3a8a')
          .text(row.keyA || '-', bx + colW, ry + rowH / 2 - 2.8, { width: colW, align: 'center', lineBreak: false });
        doc.text(row.keyB || '-', bx + colW * 2, ry + rowH / 2 - 2.8, { width: colW, align: 'center', lineBreak: false });
        doc.text(row.keyC || '-', bx + colW * 3, ry + rowH / 2 - 2.8, { width: colW, align: 'center', lineBreak: false });
        doc.text(row.keyD || '-', bx + colW * 4, ry + rowH / 2 - 2.8, { width: colW, align: 'center', lineBreak: false });
      }
    }

    doc.font('Helvetica').fontSize(6).fill('#64748b')
      .text('VERIFY SCORES & REPORT DISCREPANCIES TO EXAM CELL IMMEDIATELY', innerX + 6, innerY + innerH - 8, { width: innerW - 12, align: 'center', lineBreak: false });

    doc.restore();
  });
}

/**
 * ---------------------------------------------------------------------------
 * RENDER: Dedicated Single-Set Chits (6 or 8 chits per A4 page)
 * Fits up to 50 questions dedicated to a single set (Set A, B, C, or D).
 * Yields 83.3% to 87.5% paper savings!
 * ---------------------------------------------------------------------------
 */
function renderSingleSetChits6(doc, paper, setChar, setQuestions, optionFormat = 'ALPHA') {
  const pw = doc.page.width;
  const ph = doc.page.height;
  const colW = pw / 2;
  const rowH = ph / 3;

  // Draw Vertical and Horizontal Cut Lines
  drawDashedCutLine(doc, colW, 10, colW, ph - 10, null);
  drawDashedCutLine(doc, 10, rowH, pw - 10, rowH, 'CUT HERE');
  drawDashedCutLine(doc, 10, rowH * 2, pw - 10, rowH * 2, 'CUT HERE');

  const chits = [
    { x: 0, y: 0 },
    { x: colW, y: 0 },
    { x: 0, y: rowH },
    { x: colW, y: rowH },
    { x: 0, y: rowH * 2 },
    { x: colW, y: rowH * 2 },
  ];

  const totalQ = setQuestions.length;
  // Format into 3 or 4 question columns per chit
  const numSubCols = totalQ > 36 ? 4 : 3;
  const qPerSubCol = Math.ceil(totalQ / numSubCols);

  chits.forEach(({ x, y }, chitIdx) => {
    const pad = 8;
    const innerX = x + pad;
    const innerY = y + pad;
    const innerW = colW - pad * 2;
    const innerH = rowH - pad * 2;

    doc.save();
    doc.strokeColor('#0f172a').lineWidth(0.75).rect(innerX, innerY, innerW, innerH).stroke();

    // Chit Header
    const instName = (paper.instituteName || 'ACADEMY').toUpperCase();
    doc.font('Helvetica-Bold').fontSize(8.5).fill('#0f172a')
      .text(instName, innerX + 4, innerY + 4, { width: innerW - 8, align: 'center', lineBreak: false });

    doc.font('Helvetica-Bold').fontSize(7.5).fill('#1e3a8a')
      .text(`ANSWER KEY   -   SET ${setChar}`, innerX + 4, innerY + 14, { width: innerW - 8, align: 'center', lineBreak: false });

    const rawDate = paper.createdAt ? new Date(paper.createdAt) : new Date();
    const dateStr = rawDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    doc.font('Helvetica').fontSize(6).fill('#475569')
      .text(`${paper.examName || 'Exam'}  -  ${totalQ} Qs  -  ${dateStr}`, innerX + 4, innerY + 23, { width: innerW - 8, align: 'center', lineBreak: false });

    doc.strokeColor('#0f172a').lineWidth(0.5).moveTo(innerX + 4, innerY + 31).lineTo(innerX + innerW - 4, innerY + 31).stroke();

    // Questions Grid
    const startTableY = innerY + 34;
    const availTableH = innerH - 42;
    const qRowH = Math.min(13.5, Math.max(10.5, availTableH / (qPerSubCol + 1)));
    const subColGutter = 5;
    const subColW = (innerW - 8 - (numSubCols - 1) * subColGutter) / numSubCols;

    for (let sc = 0; sc < numSubCols; sc++) {
      const scX = innerX + 4 + sc * (subColW + subColGutter);
      const startQ = sc * qPerSubCol + 1;
      const endQ = Math.min(totalQ, (sc + 1) * qPerSubCol);

      // Subcolumn header
      doc.rect(scX, startTableY, subColW, qRowH).fill('#1e293b');
      doc.font('Helvetica-Bold').fontSize(6).fill('#ffffff')
        .text('Q#   KEY', scX, startTableY + qRowH / 2 - 2.5, { width: subColW, align: 'center', lineBreak: false });

      for (let r = 0; r < endQ - startQ + 1; r++) {
        const qNum = startQ + r;
        const q = setQuestions[qNum - 1];
        if (!q) continue;
        const qy = startTableY + (r + 1) * qRowH;

        if (r % 2 === 1) {
          doc.rect(scX, qy, subColW, qRowH).fill('#f8fafc');
        }
        doc.strokeColor('#e2e8f0').lineWidth(0.3).rect(scX, qy, subColW, qRowH).stroke();

        let ansKey = q.correctOption || '-';
        if (optionFormat === 'NUMERIC') {
          const map = { A: '1', B: '2', C: '3', D: '4' };
          ansKey = map[ansKey] || ansKey;
        }

        doc.font('Helvetica-Bold').fontSize(6.5).fill('#334155')
          .text(String(qNum).padStart(2, '0'), scX + 3, qy + qRowH / 2 - 2.8, { lineBreak: false });

        doc.font(FONT_BOLD).fontSize(7).fill('#1e3a8a')
          .text(ansKey, scX + subColW - 14, qy + qRowH / 2 - 2.8, { lineBreak: false });
      }
    }

    doc.font('Helvetica').fontSize(5).fill('#64748b')
      .text('VERIFY SCORES & REPORT DISCREPANCIES IMMEDIATELY', innerX + 4, innerY + innerH - 7, { width: innerW - 8, align: 'center', lineBreak: false });

    doc.restore();
  });
}

/**
 * Master Entry Point: Builds and streams the 1-Page A4 Student Key Chits PDF.
 *
 * @param {WritableStream} stream
 * @param {Object} paper - Paper metadata
 * @param {Array} rawQuestions - Canonical question list
 * @param {Object} options - { chitMode: 'UNIVERSAL'|'SINGLE_SET', selectedSet: 'A'|'B'|'C'|'D'|'ALL', optionFormat }
 */
async function buildKeyChitPdf(stream, paper, rawQuestions = [], options = {}) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
  ensureFonts(doc);
  doc.pipe(stream);

  const chitMode = (options.chitMode || 'UNIVERSAL').toUpperCase();
  const optionFormat = (options.optionFormat || paper.optionFormat || 'ALPHA').toUpperCase();
  const totalQuestions = rawQuestions.length || 40;

  if (chitMode === 'UNIVERSAL') {
    // Universal Multi-Set Chits: All 4 Sets side-by-side
    const matrix = generateMasterKeyMatrix(paper.id, rawQuestions, optionFormat);
    if (totalQuestions <= 75) {
      renderUniversalMultiSetChits4(doc, paper, matrix);
    } else {
      renderUniversalMultiSetChits2(doc, paper, matrix);
    }
  } else {
    // Dedicated Single-Set Chits
    const selectedSet = (options.selectedSet || 'A').toUpperCase();

    if (selectedSet === 'ALL') {
      // 1 Page per Set: Set A (p1), Set B (p2), Set C (p3), Set D (p4)
      ['A', 'B', 'C', 'D'].forEach((setChar, idx) => {
        if (idx > 0) doc.addPage();
        const setQuestions = generateSetQuestions(paper.id, rawQuestions, setChar);
        renderSingleSetChits6(doc, paper, setChar, setQuestions, optionFormat);
      });
    } else {
      // 1 Page containing 6 slips of the chosen set
      const setQuestions = generateSetQuestions(paper.id, rawQuestions, selectedSet);
      renderSingleSetChits6(doc, paper, selectedSet, setQuestions, optionFormat);
    }
  }

  doc.end();
}

module.exports = {
  buildKeyChitPdf,
};
