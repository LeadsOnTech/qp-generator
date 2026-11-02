const PDFDocument = require('pdfkit');
const { layoutRichText, drawRichText, containsMath } = require('./richTextLayout');
const { generateSetQuestions, generateMasterKeyMatrix } = require('./multiSetEngine');
const fs = require('fs');
const path = require('path');

// Diagram images are looked up here (same location the upload route saves to)
const IMAGES_DIR = path.join(__dirname, '..', '..', 'uploads', 'images');

// ---------------------------------------------------------------------------
// Font — bundled directly in the project (assets/fonts/), NOT a Windows
// system font path. This was previously registering a hardcoded
// "C:/Windows/Fonts/times.ttf" path, which only exists on the original
// developer's Windows machine — on any other system (a Linux/Coolify
// deployment, another developer's machine, CI) it silently fell back to
// PDFKit's built-in Times-Roman, a base-14 standard font with extremely
// limited Unicode support. Real rendering tests confirmed this fallback
// font could NOT display most math/science notation at all: superscripts
// and subscripts (beyond ² ³), square roots, Greek letters (π θ α β Δ Σ),
// integrals, arrows, and inequality signs all rendered as garbled, wrong
// characters — a silent, serious deployment risk.
//
// DejaVu Serif (open-source, bundled as a real file in this repo) has
// comprehensive Unicode coverage and was verified, by rendering real test
// PDFs, to correctly display every one of those symbols. Because the font
// ships as a file WITH the code instead of depending on what happens to be
// installed on whichever machine runs it, rendering is now identical on
// the original Windows dev machine, any other developer's machine, and
// the Linux production server alike.
// ---------------------------------------------------------------------------
const FONT_FILE_REGULAR = path.join(__dirname, '..', '..', 'assets', 'fonts', 'DejaVuSerif.ttf');
const FONT_FILE_BOLD = path.join(__dirname, '..', '..', 'assets', 'fonts', 'DejaVuSerif-Bold.ttf');

const FONT_REGULAR = 'PaperFont-Regular';
const FONT_BOLD = 'PaperFont-Bold';
const fontsRegisteredOnDoc = new WeakSet();

/** Registers the bundled fonts on a specific PDFDocument instance (PDFKit
 * requires font registration per-document, not globally). Safe to call
 * multiple times on the same doc — only registers once. */
function ensureFontsRegistered(doc) {
  if (fontsRegisteredOnDoc.has(doc)) return;
  doc.registerFont(FONT_REGULAR, FONT_FILE_REGULAR);
  doc.registerFont(FONT_BOLD, FONT_FILE_BOLD);
  fontsRegisteredOnDoc.add(doc);
}

// ---------------------------------------------------------------------------
// PDF builder. Two-column exam-paper layout matching the standard printed
// EAMCET/EAPCET/NEET style: questions flow down the left column then the
// right column, then wrap to a new page. Options are packed two-per-line
// when short (e.g. "b/a and c/a") and fall back to one-per-line when any
// option is long (e.g. a full sentence), so nothing wraps awkwardly.
// ---------------------------------------------------------------------------

const NAVY = '#000000';
const GOLD = '#000000';
const INK = '#000000';
const SOFT = '#000000';
const LINE = '#000000';

const TEST_TYPE_LABELS = {
  DPP: 'Daily Practice Problems (DPP)',
  WEEKLY_TEST: 'Weekly Test',
  GRAND_TEST: 'Grand Test',
  MOCK_TEST: 'Mock Test',
  MODEL_PAPER: 'Model Paper',
};

// ---------------------------------------------------------------------------
// Option format resolver:
// - AP EAPCET / TG EAPCET / TS EAPCET / KCET and state CETs use (A), (B), (C), (D)
// - NEET and JEE use (1), (2), (3), (4)
// - Can also be overridden explicitly via paper.optionFormat ('ALPHA' | 'NUMERIC')
// ---------------------------------------------------------------------------
function resolveOptionFormat(paper) {
  if (paper && paper.optionFormat) {
    const fmt = String(paper.optionFormat).toUpperCase();
    if (fmt.includes('NUM') || fmt === '1234' || fmt === '1') return 'NUMERIC';
    if (fmt.includes('ALPHA') || fmt.includes('LETTER') || fmt === 'ABCD' || fmt === 'A') return 'ALPHA';
  }
  const exam = String(paper?.examName || '').toUpperCase();
  if (exam.includes('EAPCET') || exam.includes('EAMCET') || exam.includes('KCET') || exam.includes('CET')) {
    return 'ALPHA';
  }
  if (exam.includes('NEET') || exam.includes('JEE')) {
    return 'NUMERIC';
  }
  return 'ALPHA';
}

function resolveAnswerFormat(paper) {
  if (paper && paper.answerFormat) {
    const fmt = String(paper.answerFormat).toUpperCase();
    if (fmt.includes('STUDENT') || fmt.includes('BOX') || fmt.includes('BRACKET')) return 'STUDENT_ANSWER';
    if (fmt.includes('STANDARD') || fmt.includes('NONE')) return 'STANDARD';
  }
  return 'STANDARD';
}

function getOptionLabel(key, format = 'ALPHA') {
  const upper = String(key != null ? key : '').trim().toUpperCase();
  const alphaMap = { A: 'A', B: 'B', C: 'C', D: 'D', '0': 'A', '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
  const numericMap = { A: '1', B: '2', C: '3', D: '4', '0': '1', '1': '1', '2': '2', '3': '3', '4': '4' };
  if (format === 'NUMERIC') {
    return numericMap[upper] || upper;
  }
  return alphaMap[upper] || upper;
}

function formatAnswerKeyOption(correctOption, format = 'ALPHA') {
  if (!correctOption) return '-';
  const str = String(correctOption).trim();
  const upper = str.toUpperCase();
  if (['A', 'B', 'C', 'D', '1', '2', '3', '4'].includes(upper)) {
    return getOptionLabel(upper, format);
  }
  return str;
}

// ---------------------------------------------------------------------------
// Derivative notation ("d/dx", "dy/dx", "dv/dt", etc.) at the START of a
// question reads as flat, casual text when printed as a plain slash — real
// textbooks always show this as a proper stacked fraction (numerator over
// a horizontal bar over the denominator). This detects that specific,
// well-defined pattern and draws it as a small hand-drawn fraction glyph
// instead of plain text. Deliberately scoped to ONLY this leading pattern
// (not arbitrary mid-sentence fractions like probability answers "1/2",
// which already read fine as plain text) to keep this a safe, additive
// change with no risk to any other question's layout.
// ---------------------------------------------------------------------------
// Covers: d/dx, dy/dx, dv/dt (ordinary derivatives), ∂y/∂x (partial
// derivatives), Δy/Δx (average rate of change / delta notation) — the
// handful of leading-fraction patterns that appear constantly across
// Physics, Chemistry, and Maths calculus questions. Deliberately still
// scoped to the START of the text only (never mid-sentence), so this
// stays a safe, additive change — everywhere else (probability answers
// like "1/2", ratios inside a sentence) renders exactly as before.
const LEADING_DERIVATIVE_PATTERN = /^([d∂Δ]\^?\d*[a-zA-Z]?)\/([d∂Δ][a-zA-Z]+\^?\d*)\s*/;

function detectLeadingFraction(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(LEADING_DERIVATIVE_PATTERN);
  if (!match) return null;
  return {
    numerator: match[1],
    denominator: match[2],
    remainder: text.slice(match[0].length),
  };
}

const FRACTION_GAP_AFTER = 6; // px gap between the fraction glyph and the text that follows it

/** Measures a fraction glyph's rendered size without drawing anything. */
function measureFractionGlyph(doc, numerator, denominator, fontSize) {
  doc.font(FONT_REGULAR).fontSize(fontSize * 0.92);
  const numW = doc.widthOfString(numerator);
  const denW = doc.widthOfString(denominator);
  const width = Math.max(numW, denW) + 4;
  const height = fontSize * 1.9; // numerator + bar + denominator, with small gaps
  return { width, height };
}

/** Draws a fraction glyph (numerator / bar / denominator) at (x, y); returns its width. */
function drawFractionGlyph(doc, numerator, denominator, x, y, fontSize, color) {
  const barY = y + fontSize * 0.95;
  doc.font(FONT_REGULAR).fontSize(fontSize * 0.92).fill(color);
  const numW = doc.widthOfString(numerator);
  const denW = doc.widthOfString(denominator);
  const width = Math.max(numW, denW) + 4;

  doc.text(numerator, x + (width - numW) / 2, y, { lineBreak: false });
  doc.moveTo(x, barY).lineTo(x + width, barY).lineWidth(0.6).strokeColor(color).stroke();
  doc.text(denominator, x + (width - denW) / 2, barY + 2, { lineBreak: false });

  return width;
}

function formatExamTypography(text) {
  if (typeof text !== 'string') return text;
  let cleaned = text;

  // 1. Prevent awkward breaks on axis and coordinate notations (e.g. x-axis, y-axis, z-axis):
  cleaned = cleaned.replace(/\b([xyzXYZ0-9])\s*-\s*([aA]xis|[pP]lane|[rR]ay|[rR]ays|[jJ]unction|[gG]raph|[cC]urve)\b/g, '$1\u2011$2');

  // 2. Prevent breaks on 1- or 2-letter scientific prefixes with hyphens (e.g. p-n, v-t, s-t, P-V, V-I, 1-D, 2-D):
  cleaned = cleaned.replace(/\b([a-zA-Z0-9]{1,2})-([a-zA-Z0-9]+)\b/g, '$1\u2011$2');

  // 3. Prevent orphan opening parentheses/brackets/braces (e.g. "about ( " or "is [ "):
  cleaned = cleaned.replace(/([\(\[\{])\s+/g, '$1\u00A0');

  // 4. Ensure space before opening bracket if attached to preceding word: e.g. "about(" -> "about ("
  cleaned = cleaned.replace(/([a-zA-Z0-9])\(/g, '$1 (');

  // 5. Prevent space before closing punctuation marks: e.g. " )" -> ")", " ]" -> "]"
  cleaned = cleaned.replace(/\s+([\)\]\},;:\.\?!])/g, '$1');

  // 6. Clean up duplicate spaces
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

  // 6. Bind common units to preceding number using non-breaking space (\u00A0)
  // so numbers never get separated from their units (e.g. "10 m/s", "50 kg", "20 cm", "5 eV")
  cleaned = cleaned.replace(
    /\b(\d+(?:\.\d+)?)\s+(m\/s²?|km\/h|cm|mm|nm|μm|km|kg|mg|μg|ms|ns|μs|mV|kV|mA|μA|kW|MW|kJ|eV|keV|MeV|kHz|MHz|kN|kPa|MPa|kΩ|MΩ|μF|pF|nF|°C|K|mol|cal|kcal|bar|atm|rad|m|s|g|V|A|W|J|N|T|F|H|Ω|Pa)\b/g,
    '$1\u00A0$2'
  );

  // 7. Bind compound units (e.g. "m s^-1", "kg m/s", "J s")
  cleaned = cleaned.replace(/\b(m|kg|J|N|V|W|A)\s+(s⁻¹|s⁻²|m⁻¹|m⁻²|m⁻³|kg⁻¹|mol⁻¹)\b/g, '$1\u00A0$2');

  // 8. Bind relational and equality operators to avoid trailing "= " at end of line (e.g. "E = 10" -> "E\u00A0=\u00A010")
  cleaned = cleaned.replace(/([a-zA-Z0-9])\s*(=|≈|≠|≤|≥)\s*([a-zA-Z0-9])/g, '$1\u00A0$2\u00A0$3');

  // 9. Prevent orphan single word at the end of the question text (e.g. "... (x-axis) is" -> "... (x-axis)\u00A0is")
  cleaned = cleaned.replace(/\s+([a-zA-Z]{1,4}[.:?!]?)$/, '\u00A0$1');

  return cleaned;
}

function formatChemicalFormulas(text) {
  if (typeof text !== 'string') return text;
  // Unicode subscript digits (₀-₉) are now safe to use unconditionally —
  // verified by direct rendering test — because the bundled DejaVu font
  // (assets/fonts/) supports them correctly on every platform, unlike the
  // old Windows-system-font-or-broken-fallback setup this replaced.
  const subscriptMap = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
  };
  const withSubscripts = text.replace(/([A-Z][a-z]?|\))([0-9]+)/g, (match, element, digits) => {
    const subs = digits.split('').map(d => subscriptMap[d] || d).join('');
    return element + subs;
  });
  // Chained here (rather than requiring every call site to remember to
  // call both functions) so every question/option automatically gets
  // chemical-subscripts, caret-exponents, and non-breaking scientific typography.
  return formatExamTypography(formatExponents(withSubscripts));
}

// Only these exponent characters have a verified-safe Unicode superscript
// form with the bundled font — confirmed by direct rendering test. Any
// exponent using a character NOT in this table is left exactly as typed
// (with its caret), rather than risk a partial or garbled conversion.
const SUPERSCRIPT_MAP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
  '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺',
  'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ', 'i': 'ⁱ',
};

/**
 * Converts common "x^2", "x^-1", "e^x" caret-exponent notation (a natural
 * way to type exponents in Excel) into real Unicode superscripts — but
 * ONLY when every character of the exponent has a verified-safe
 * superscript form. Something like "x^k" (no safe superscript "k" exists)
 * is left as "x^k" untouched, rather than guessing.
 */
function formatExponents(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/\^\{?(-?[0-9a-zA-Z]+)\}?/g, (match, exponent) => {
    const converted = exponent.split('').map((ch) => SUPERSCRIPT_MAP[ch]).join('');
    const allSafe = exponent.split('').every((ch) => ch in SUPERSCRIPT_MAP);
    return allSafe ? converted : match;
  });
}

function getOptionsLayoutType(doc, q, colWidth, fontSize = 11, optionFormat = 'ALPHA') {
  if (!q.options) return 'NORMAL';
  doc.font(FONT_REGULAR).fontSize(fontSize);
  
  let fitsQuarter = true;
  let fitsHalf = true;
  
  const numWidth = 22;
  const quarterWidth = (colWidth - numWidth - 4) / 4;
  const halfWidth = (colWidth - numWidth - 4) / 2;
  const keys = ['A', 'B', 'C', 'D'];
  
  for (let i = 0; i < 4; i++) {
    // For math options the LaTeX SOURCE is far longer than the rendered
    // equation, so measuring the raw string would wrongly conclude nothing
    // fits and push every option onto its own line. Measure the RENDERED
    // width instead.
    const raw = `(${getOptionLabel(keys[i], optionFormat)}) ` + (q.options[keys[i]] || '');
    const w = richWidth(doc, raw, fontSize);
    if (w > quarterWidth - 4) fitsQuarter = false; // 4 points padding safety
    if (w > halfWidth - 4) fitsHalf = false;
  }
  
  if (fitsQuarter) return 'VERY_COMPACT';
  if (fitsHalf) return 'COMPACT';
  return 'NORMAL';
}

const MAX_IMAGE_HEIGHT = 110; // cap so one diagram can't swallow a whole column

/**
 * Resolves a question's image to a safe, on-disk path and its scaled
 * render dimensions (preserving aspect ratio, capped to the column width
 * and MAX_IMAGE_HEIGHT). Returns null if there's no image, the file is
 * missing, or it can't be read as an image — a missing/broken image never
 * crashes PDF generation, it's just silently skipped.
 */
function resolveImage(doc, q, maxWidth) {
  if (!q.imageFilename) return null;
  const imagePath = path.join(IMAGES_DIR, q.imageFilename);
  if (!fs.existsSync(imagePath)) return null;

  try {
    const img = doc.openImage(imagePath);
    const scale = Math.min(maxWidth / img.width, MAX_IMAGE_HEIGHT / img.height, 1);
    return {
      path: imagePath,
      width: img.width * scale,
      height: img.height * scale,
    };
  } catch (err) {
    return null; // corrupt/unsupported file — skip rather than fail the whole paper
  }
}

function resolveOptionImage(doc, filename, maxWidth = 92, maxHeight = 46) {
  if (!filename) return null;
  const imagePath = path.join(IMAGES_DIR, filename);
  if (!fs.existsSync(imagePath)) return null;

  try {
    const img = doc.openImage(imagePath);
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
    return {
      path: imagePath,
      width: img.width * scale,
      height: img.height * scale,
    };
  } catch (err) {
    return null;
  }
}

function drawHeader(doc, paper, pageWidth, questionCount, isCompact = false, margin = 36) {
  const hasContact = Boolean(paper.institutePhone || paper.instituteAddress);
  const setLabel = paper.setLabel ? String(paper.setLabel).trim().toUpperCase() : null;
  const instName = paper.instituteName || 'Question Paper';

  // 1. Logo, top-left corner
  if (paper.instituteLogoFilename) {
    const logoPath = path.join(IMAGES_DIR, paper.instituteLogoFilename);
    if (fs.existsSync(logoPath)) {
      try {
        const img = doc.openImage(logoPath);
        const maxDim = isCompact ? 34 : 40;
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        doc.image(logoPath, margin, isCompact ? 10 : 14, { width: img.width * scale, height: img.height * scale });
      } catch (err) {}
    }
  }

  // 2. Set Badge (top-right corner)
  if (setLabel) {
    const badgeW = isCompact ? 64 : 72;
    const badgeH = isCompact ? 19 : 22;
    const badgeX = pageWidth - margin - badgeW;
    const badgeY = isCompact ? 11 : 15;
    doc.save();
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4).fillAndStroke('#f8fafc', '#0f172a');
    doc.fill('#0f172a').font(FONT_BOLD).fontSize(isCompact ? 9 : 10)
      .text(setLabel.startsWith('SET') ? setLabel : `SET ${setLabel}`, badgeX, badgeY + (isCompact ? 4.5 : 5.5), {
        width: badgeW,
        align: 'center',
        lineBreak: false,
      });
    doc.restore();
  }

  // 3. Institute Name (Prominently centered with reserved margins so it never touches Logo or Set Badge)
  const reservedSide = isCompact ? 72 : 84;
  const centerWidth = pageWidth - (reservedSide * 2);
  doc.fill('#000000').font(FONT_BOLD).fontSize(isCompact ? 15 : 17)
    .text(instName, reservedSide, isCompact ? 11 : 15, { width: centerWidth, align: 'center' });

  let y = doc.y + (isCompact ? 2 : 4);

  // 4. Contact info / tagline (if present)
  if (hasContact && !isCompact) {
    const parts = [];
    if (paper.institutePhone) parts.push(`Ph: ${paper.institutePhone}`);
    if (paper.instituteAddress) parts.push(paper.instituteAddress);
    doc.fill('#334155').font(FONT_REGULAR).fontSize(8)
      .text(parts.join('   ·   '), margin, y, { width: pageWidth - margin * 2, align: 'center', lineBreak: false });
    y += 12;
  }

  // 5. Exam Name & Paper Type
  const examText = `${paper.examName || 'Exam'} — ${TEST_TYPE_LABELS[paper.paperType] || paper.paperType || 'Test'}`;
  doc.fill('#000000').font(FONT_BOLD).fontSize(isCompact ? 10 : 11)
    .text(examText, margin, y, { width: pageWidth - margin * 2, align: 'center', lineBreak: false });
  y += isCompact ? 13 : 15;

  // 6. Paper Topic / Title
  doc.fill('#0f172a').font(FONT_BOLD).fontSize(isCompact ? 9.5 : 10)
    .text(paper.title || 'Question Paper', margin, y, { width: pageWidth - margin * 2, align: 'center', lineBreak: false });
  y += isCompact ? 13 : 15;

  // 7. Exam Metadata Strip (Time Allowed | Total Questions & Date | Max Marks)
  const rawDate = paper.createdAt ? new Date(paper.createdAt) : new Date();
  const validDate = !isNaN(rawDate.getTime()) ? rawDate : new Date();
  const dateFormatted = validDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const durationMins = paper.timeAllowedMinutes || (questionCount <= 30 ? 45 : questionCount <= 60 ? 60 : 180);
  const maxMarks = paper.maxMarks || (questionCount * 4);

  // Top border line
  doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(margin, y).lineTo(pageWidth - margin, y).stroke();
  y += isCompact ? 3 : 4;

  const contentW = pageWidth - margin * 2;
  doc.font(FONT_REGULAR).fontSize(isCompact ? 8 : 8.5).fill('#334155');
  doc.text(`Time Allowed: ${durationMins} Mins`, margin + 4, y, { width: 140, align: 'left', lineBreak: false });
  doc.text(`Total Questions: ${questionCount}   ·   Date: ${dateFormatted}`, margin + 140, y, { width: contentW - 280, align: 'center', lineBreak: false });
  doc.text(`Max Marks: ${maxMarks}`, pageWidth - margin - 104, y, { width: 100, align: 'right', lineBreak: false });
  y += isCompact ? 10 : 12;

  // Bottom border line
  doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(margin, y).lineTo(pageWidth - margin, y).stroke();
  y += isCompact ? 4 : 6;

  return y; // bottom edge of the header block, for the instructions box to start below
}

function drawInstructions(doc, questionCount, pageWidth, topY, optionFormat = 'ALPHA', answerFormat = 'STANDARD', setLabel = null, isCompact = false, margin = 36) {
  const boxH = isCompact ? 28 : 50;
  const bottomGap = isCompact ? 6 : 14;
  doc.roundedRect(margin, topY, pageWidth - margin * 2, boxH, isCompact ? 4 : 6).stroke(LINE);

  if (isCompact) {
    doc.fill(INK).font(FONT_BOLD).fontSize(8.5).text('Instructions:', margin + 10, topY + 8, { lineBreak: false });
    const optionsRange = optionFormat === 'ALPHA' ? '(A-D)' : '(1-4)';
    const setMention = setLabel ? ` (${setLabel.startsWith('SET') ? setLabel : 'SET ' + setLabel})` : '';
    const text = `1. ${questionCount} questions${setMention}, all compulsory.   2. Four options ${optionsRange}, one correct.   3. Mark answers clearly.`;
    doc.fill(SOFT).font(FONT_REGULAR).fontSize(7.5)
      .text(text, margin + 74, topY + 8.5, { width: pageWidth - margin * 2 - 82, lineBreak: false });
  } else {
    doc.fill(INK).font(FONT_BOLD).fontSize(9.5).text('Instructions', 48, topY + 8);
    const optionsRange = optionFormat === 'ALPHA' ? '(A-D)' : '(1-4)';
    const instruction3 = answerFormat === 'STUDENT_ANSWER'
      ? `3. Write your selected option ${optionsRange} in the brackets [   ] provided next to each question.`
      : `3. Mark your answers clearly.`;
    const setMention = setLabel ? ` (${setLabel.startsWith('SET') ? setLabel : 'SET ' + setLabel})` : '';
    doc.fill(SOFT).font(FONT_REGULAR).fontSize(8.5)
      .text(
        `1. This paper contains ${questionCount} questions${setMention}, all compulsory.   ` +
        `2. Each question has four options ${optionsRange} with exactly one correct answer.   ` +
        instruction3,
        48, topY + 21, { width: pageWidth - 96, lineGap: 1.5 }
      );
  }
  return topY + boxH + bottomGap;
}

function drawStudentDetails(doc, pageWidth, topY, isCompact = false, margin = 36) {
  doc.fill('#000000').font(FONT_BOLD).fontSize(isCompact ? 9.5 : 11);
  doc.text('Student Name: _________________________________________      Roll No: ______________________', margin, topY);
  return topY + (isCompact ? 18 : 30); // gives sufficient gap below
}

/**
 * Measures the vertical height a question will occupy in a column of the
 * given width, WITHOUT drawing anything (pdfkit lets you probe text height).
 */
// ---------------------------------------------------------------------------
// Rich (text + LaTeX math) measuring and drawing.
//
// Questions written with $...$ contain real equations that must be
// typeset as images, which plain doc.text() cannot do. These two helpers
// route such content through the math layout engine, and fall back to the
// ORIGINAL plain-text code path (byte for byte) whenever no math is
// present — so every existing question bank keeps rendering exactly as it
// did before, and only questions that actually use $...$ take the new path.
// ---------------------------------------------------------------------------
function richMeasure(doc, text, width, fontSize, align = 'justify') {
  const value = text == null ? '' : String(text);
  if (!containsMath(value)) {
    doc.font(FONT_REGULAR).fontSize(fontSize);
    return doc.heightOfString(formatChemicalFormulas(value), { width, lineGap: 0 });
  }
  const { totalHeight } = layoutRichText(doc, value, {
    width,
    fontSize,
    font: FONT_REGULAR,
      lineGap: 1,
      align,
      textTransform: formatChemicalFormulas,
  });
  return totalHeight;
}

function richWidth(doc, text, fontSize, align = 'left') {
  const value = text == null ? '' : String(text);
  if (!containsMath(value)) {
    doc.font(FONT_REGULAR).fontSize(fontSize);
    return doc.widthOfString(formatChemicalFormulas(value));
  }
  // Lay out with effectively unlimited width so everything lands on one
  // line, then read that line's true rendered width.
  const { lines } = layoutRichText(doc, value, {
    width: 100000,
    fontSize,
    font: FONT_REGULAR,
      lineGap: 1,
      align,
      textTransform: formatChemicalFormulas,
  });
  return lines.length ? lines[0].width : 0;
}

function richDraw(doc, text, x, y, width, fontSize, color, align = 'justify') {
  const value = text == null ? '' : String(text);
  if (!containsMath(value)) {
    doc.font(FONT_REGULAR).fontSize(fontSize).fill(color)
      .text(formatChemicalFormulas(value), x, y, { width, lineGap: 0, align });
    return doc.y;
  }
  const { lines } = layoutRichText(doc, value, {
    width,
    fontSize,
    font: FONT_REGULAR,
      lineGap: 1,
      align,
      textTransform: formatChemicalFormulas,
  });
  return drawRichText(doc, lines, x, y, { fontSize, font: FONT_REGULAR, lineGap: 1, color, align });
}


function drawSectionHeader(doc, text, x, y, colWidth) {
  doc.font(FONT_BOLD).fontSize(12).fill('#1e293b');
  doc.text(text, x, y + 4, { width: colWidth, align: 'center' });
  // draw a line under it
  doc.moveTo(x + 10, y + 20).lineTo(x + colWidth - 10, y + 20).strokeColor('#94a3b8').lineWidth(0.5).stroke();
  return y + 34;
}


function formatQuestionTextForLayout(text) {
  if (!text) return "";
  const headingRegex = /(Statement ?[-:] ?\d+|Assertion ?[A-Z]? ?[-:]|Reason ?[A-Z]? ?[-:])/gi;
  return text.replace(headingRegex, '\n$1').trim();
}

function measureQuestionHeight(doc, q, index, colWidth, fontSize = 10, questionGap = 5, optionFormat = 'ALPHA', answerFormat = 'STANDARD') {
  if (q.isHeader) return 34;
  const numWidth = 22;
  const showAnswerBox = (answerFormat === 'STUDENT_ANSWER' && !q.isHeader);
  const bracketWidth = 24;
  const bracketGap = 6;
  const textRightReserve = showAnswerBox ? (bracketWidth + bracketGap) : 0;
  const availTextWidth = colWidth - numWidth - textRightReserve;

  doc.font(FONT_REGULAR).fontSize(fontSize);

  const leadingFraction = detectLeadingFraction(formatQuestionTextForLayout(q.questionText));
  let textHeight;
  if (leadingFraction) {
    const glyph = measureFractionGlyph(doc, leadingFraction.numerator, leadingFraction.denominator, fontSize);
    const remainderWidth = availTextWidth - glyph.width - FRACTION_GAP_AFTER;
    const remainderHeight = doc.heightOfString(formatChemicalFormulas(leadingFraction.remainder), { width: Math.max(remainderWidth, 40), lineGap: 0 });
    textHeight = Math.max(glyph.height, remainderHeight);
  } else {
    textHeight = richMeasure(doc, formatQuestionTextForLayout(q.questionText), availTextWidth, fontSize);
  }

  if (showAnswerBox) {
    textHeight = Math.max(textHeight, 14);
  }

  const image = resolveImage(doc, q, colWidth - 16);
  const imageHeight = image ? image.height + 4 : 0;

  const optImgA = resolveOptionImage(doc, q.optionAImage || q.optionImages?.A);
  const optImgB = resolveOptionImage(doc, q.optionBImage || q.optionImages?.B);
  const optImgC = resolveOptionImage(doc, q.optionCImage || q.optionImages?.C);
  const optImgD = resolveOptionImage(doc, q.optionDImage || q.optionImages?.D);
  const hasOptionImages = Boolean(optImgA || optImgB || optImgC || optImgD);

  const isNVQ = !q.options || !Object.keys(q.options).length;
  let optionsHeight = 0;

  if (!isNVQ) {
    const layoutType = getOptionsLayoutType(doc, q, colWidth, fontSize, optionFormat);
    const labelA = getOptionLabel('A', optionFormat);
    const labelB = getOptionLabel('B', optionFormat);
    const labelC = getOptionLabel('C', optionFormat);
    const labelD = getOptionLabel('D', optionFormat);

    if (hasOptionImages) {
      const rowAB = Math.max(optImgA?.height || 0, optImgB?.height || 0) + 26; // diagram + 4pt + 14pt text + 8pt gap
      const rowCD = Math.max(optImgC?.height || 0, optImgD?.height || 0) + 22; // diagram + 4pt + 14pt text + 4pt gap
      optionsHeight = rowAB + rowCD + 6;
    } else if (layoutType === 'VERY_COMPACT') {
      const qw = (colWidth - numWidth - 4) / 4;
      optionsHeight = Math.max(14, ...['A','B','C','D'].map((k) =>
        richMeasure(doc, `(${getOptionLabel(k, optionFormat)}) ${q.options[k] || ''}`, qw, fontSize, 'left')
      ));
    } else if (layoutType === 'COMPACT') {
      const hw = (colWidth - numWidth - 4) / 2;
      const rowAB = Math.max(
        richMeasure(doc, `(${labelA}) ${q.options.A || ''}`, hw, fontSize, 'left'),
        richMeasure(doc, `(${labelB}) ${q.options.B || ''}`, hw, fontSize, 'left')
      );
      const rowCD = Math.max(
        richMeasure(doc, `(${labelC}) ${q.options.C || ''}`, hw, fontSize, 'left'),
        richMeasure(doc, `(${labelD}) ${q.options.D || ''}`, hw, fontSize, 'left')
      );
      optionsHeight = Math.max(14, rowAB) + Math.max(14, rowCD);
    } else {
      const optFontSize = Math.min(fontSize, 9.5);
      doc.font(FONT_REGULAR).fontSize(optFontSize);
      const avail = colWidth - numWidth - 4;
      optionsHeight = ['A', 'B', 'C', 'D'].reduce((sum, k) => {
        const raw = `(${getOptionLabel(k, optionFormat)}) ${q.options[k] || ''}`;
        const h = richMeasure(doc, raw, avail, optFontSize, 'left');
        return sum + h + 1;
      }, 0);
    }
  }

  return textHeight + imageHeight + optionsHeight + questionGap; // spacing after the question
}

function drawQuestion(doc, q, index, x, y, colWidth, fontSize = 10, questionGap = 5, optionFormat = 'ALPHA', answerFormat = 'STANDARD') {
  const numWidth = 22;
  const showAnswerBox = (answerFormat === 'STUDENT_ANSWER' && !q.isHeader);
  const bracketWidth = 24;
  const bracketHeight = 13.5;
  const bracketArm = 3.5;
  const bracketGap = 6;
  const textRightReserve = showAnswerBox ? (bracketWidth + bracketGap) : 0;
  const availTextWidth = colWidth - numWidth - textRightReserve;

  if (showAnswerBox) {
    const bx = x + colWidth - bracketWidth;
    const by = y;
    doc.save();
    doc.lineWidth(0.85).strokeColor('#000000');
    
    // Left square bracket [
    doc.moveTo(bx + bracketArm, by)
       .lineTo(bx, by)
       .lineTo(bx, by + bracketHeight)
       .lineTo(bx + bracketArm, by + bracketHeight)
       .stroke();

    // Right square bracket ]
    doc.moveTo(bx + bracketWidth - bracketArm, by)
       .lineTo(bx + bracketWidth, by)
       .lineTo(bx + bracketWidth, by + bracketHeight)
       .lineTo(bx + bracketWidth - bracketArm, by + bracketHeight)
       .stroke();

    doc.restore();
  }

  doc.font(FONT_BOLD).fontSize(fontSize);
  const prefix = `${index}. `;

  doc.fill(INK).text(prefix, x, y, { width: numWidth, lineBreak: false });

  const leadingFraction = detectLeadingFraction(formatQuestionTextForLayout(q.questionText));
  let textBottomY;
  if (leadingFraction) {
    doc.font(FONT_REGULAR).fontSize(fontSize);
    const glyphWidth = drawFractionGlyph(doc, leadingFraction.numerator, leadingFraction.denominator, x + numWidth, y, fontSize, INK);
    const remainderX = x + numWidth + glyphWidth + FRACTION_GAP_AFTER;
    const remainderWidth = availTextWidth - glyphWidth - FRACTION_GAP_AFTER;
    doc.font(FONT_REGULAR).fontSize(fontSize).fill(INK)
      .text(formatChemicalFormulas(leadingFraction.remainder), remainderX, y, { width: Math.max(remainderWidth, 40), lineGap: 0, align: 'justify' });
    const glyphBottom = y + fontSize * 1.9;
    textBottomY = Math.max(doc.y, glyphBottom);
  } else {
    textBottomY = richDraw(doc, formatQuestionTextForLayout(q.questionText), x + numWidth, y, availTextWidth, fontSize, INK);
  }

  if (showAnswerBox) {
    textBottomY = Math.max(textBottomY, y + bracketHeight);
  }

  let cursorY = textBottomY + 1;

  const image = resolveImage(doc, q, colWidth - 16);
  if (image) {
    doc.image(image.path, x + 8, cursorY, { width: image.width, height: image.height });
    cursorY += image.height + 4;
  }

  const labelA = getOptionLabel('A', optionFormat);
  const labelB = getOptionLabel('B', optionFormat);
  const labelC = getOptionLabel('C', optionFormat);
  const labelD = getOptionLabel('D', optionFormat);

  const optImgA = resolveOptionImage(doc, q.optionAImage || q.optionImages?.A);
  const optImgB = resolveOptionImage(doc, q.optionBImage || q.optionImages?.B);
  const optImgC = resolveOptionImage(doc, q.optionCImage || q.optionImages?.C);
  const optImgD = resolveOptionImage(doc, q.optionDImage || q.optionImages?.D);
  const hasOptionImages = Boolean(optImgA || optImgB || optImgC || optImgD);

  if (hasOptionImages) {
    const optionGutter = 16;
    const halfWidth = (colWidth - numWidth - optionGutter) / 2;
    cursorY += 6; // breathing space below question text or question diagram

    const maxImgH1 = Math.max(optImgA?.height || 0, optImgB?.height || 0);

    // Row 1 (A & B) — Diagrams on top
    if (optImgA) {
      const offsetX = Math.max(0, (halfWidth - optImgA.width) / 2);
      doc.image(optImgA.path, x + numWidth + offsetX, cursorY, { width: optImgA.width, height: optImgA.height });
    }
    if (optImgB) {
      const offsetX = Math.max(0, (halfWidth - optImgB.width) / 2);
      doc.image(optImgB.path, x + numWidth + halfWidth + optionGutter + offsetX, cursorY, { width: optImgB.width, height: optImgB.height });
    }

    // Row 1 (A & B) — Option text below diagrams
    const textY1 = cursorY + maxImgH1 + 4;
    doc.font(FONT_REGULAR).fontSize(fontSize).fill(SOFT);
    doc.text(`(${labelA}) ${q.options.A || ''}`, x + numWidth, textY1, { width: halfWidth, align: 'center' });
    doc.text(`(${labelB}) ${q.options.B || ''}`, x + numWidth + halfWidth + optionGutter, textY1, { width: halfWidth, align: 'center' });

    cursorY = textY1 + 18; // clear vertical gap between Row 1 and Row 2

    // Row 2 (C & D) — Diagrams on top
    const maxImgH2 = Math.max(optImgC?.height || 0, optImgD?.height || 0);
    if (optImgC) {
      const offsetX = Math.max(0, (halfWidth - optImgC.width) / 2);
      doc.image(optImgC.path, x + numWidth + offsetX, cursorY, { width: optImgC.width, height: optImgC.height });
    }
    if (optImgD) {
      const offsetX = Math.max(0, (halfWidth - optImgD.width) / 2);
      doc.image(optImgD.path, x + numWidth + halfWidth + optionGutter + offsetX, cursorY, { width: optImgD.width, height: optImgD.height });
    }

    // Row 2 (C & D) — Option text below diagrams
    const textY2 = cursorY + maxImgH2 + 4;
    doc.font(FONT_REGULAR).fontSize(fontSize).fill(SOFT);
    doc.text(`(${labelC}) ${q.options.C || ''}`, x + numWidth, textY2, { width: halfWidth, align: 'center' });
    doc.text(`(${labelD}) ${q.options.D || ''}`, x + numWidth + halfWidth + optionGutter, textY2, { width: halfWidth, align: 'center' });

    cursorY = textY2 + 16;
  } else if (q.options && Object.keys(q.options).length) {
    const layoutType = getOptionsLayoutType(doc, q, colWidth, fontSize, optionFormat);
    if (layoutType === 'VERY_COMPACT') {
      const quarterWidth = (colWidth - numWidth - 4) / 4;
      let vcBottom = cursorY;
      ['A','B','C','D'].forEach((k) => {
        const b = richDraw(doc, `(${getOptionLabel(k, optionFormat)}) ${q.options[k] || ''}`, x + numWidth + quarterWidth * ['A','B','C','D'].indexOf(k), cursorY, quarterWidth, fontSize, SOFT, 'left');
        vcBottom = Math.max(vcBottom, b);
      });
      cursorY = Math.max(cursorY + 14, vcBottom);
    } else if (layoutType === 'COMPACT') {
      const halfWidth = (colWidth - numWidth - 4) / 2;
      const bA = richDraw(doc, `(${labelA}) ${q.options.A || ''}`, x + numWidth, cursorY, halfWidth, fontSize, SOFT, 'left');
      const bB = richDraw(doc, `(${labelB}) ${q.options.B || ''}`, x + numWidth + halfWidth, cursorY, halfWidth, fontSize, SOFT, 'left');
      cursorY = Math.max(cursorY + 14, bA, bB);
      const bC = richDraw(doc, `(${labelC}) ${q.options.C || ''}`, x + numWidth, cursorY, halfWidth, fontSize, SOFT, 'left');
      const bD = richDraw(doc, `(${labelD}) ${q.options.D || ''}`, x + numWidth + halfWidth, cursorY, halfWidth, fontSize, SOFT, 'left');
      cursorY = Math.max(cursorY + 14, bC, bD);
    } else {
      const optFontSize = Math.min(fontSize, 9.5);
      for (const key of ['A', 'B', 'C', 'D']) {
        const raw = `(${getOptionLabel(key, optionFormat)}) ${q.options[key] || ''}`;
        const avail = colWidth - numWidth - 4;
        cursorY = richDraw(doc, raw, x + numWidth, cursorY, avail, optFontSize, SOFT, 'left') + 1;
      }
    }
  }
  
  return cursorY + questionGap; // bottom y after this question, with spacing before the next
}

/**
 * Lays out all questions in a two-column flow across as many pages as
 * needed. Fills the left column top-to-bottom, then the right column,
 * then wraps to a fresh page (both columns reset) — the standard printed
 * exam-paper reading order.
 */
/**
 * Lays out all questions in a two-column flow across as many pages as
 * needed. Fills the left column top-to-bottom, then the right column,
 * then wraps to a fresh page (both columns reset) — the standard printed
 * exam-paper reading order.
 *
 * Supports Eco-Print Optimization (AUTO, TARGET_2, TARGET_4, COMPACT)
 * to eliminate trailing blank pages and fit exactly into physical sheets.
 */
function layoutQuestionsTwoColumn(doc, questions, pageWidth, pageHeight, firstColumnStartY, optionFormat = 'ALPHA', answerFormat = 'STANDARD', ecoMode = 'AUTO', layoutParams = {}) {
  const defaultMargin = layoutParams.margin || 36;
  const defaultGutter = layoutParams.gutter || 34;

  const startPageIndex = doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1;

  const renderItems = [];
  let currentType = null;
  let qNumber = 1;
  questions.forEach((q) => {
    const isNVQ = q.questionType === "NVQ" || q.questionType === "NUMERICAL" || q.questionType === "DECIMAL";
    const typeLabel = isNVQ ? "Numerical Value Questions" : "Multiple Choice Questions";
    if (currentType !== typeLabel) {
       currentType = typeLabel;
       renderItems.push({ isHeader: true, text: "Section: " + typeLabel });
    }
    q._renderIndex = qNumber++;
    renderItems.push(q);
  });

  function simulate(cfg) {
    const fs = cfg.fontSize || 10;
    const gap = cfg.gap || 5;
    const m = cfg.margin || defaultMargin;
    const g = cfg.gutter || defaultGutter;
    const cw = (pageWidth - m * 2 - g) / 2;
    const bLimit = pageHeight - Math.max(34, m + 8);
    const startY1 = firstColumnStartY != null ? Math.min(firstColumnStartY, cfg.firstColumnStartY || firstColumnStartY) : (cfg.firstColumnStartY || 180);
    const startYSub = cfg.subsequentPageStartY || 52;

    let colY = [startY1, startY1];
    let col = 0;
    let pages = 1;
    let pageItems = [[]];

    for (let i = 0; i < renderItems.length; i++) {
      const q = renderItems[i];
      const h = measureQuestionHeight(doc, q, q._renderIndex, cw, fs, gap, optionFormat, answerFormat);
      
      if (colY[col] + h > bLimit) {
        if (col === 0) {
          col = 1;
          if (colY[1] + h > bLimit) {
            pages++;
            colY = [startYSub, startYSub];
            col = 0;
            pageItems.push([]);
          }
        } else {
          pages++;
          colY = [startYSub, startYSub];
          col = 0;
          pageItems.push([]);
        }
      }
      colY[col] += h;
      pageItems[pages - 1].push({ i, h });
    }

    const lastPageItems = pageItems[pageItems.length - 1];
    const totalLastPageH = lastPageItems.reduce((sum, item) => sum + item.h, 0);
    const capacity = 2 * (bLimit - (pages === 1 ? startY1 : startYSub));
    const fillRatio = totalLastPageH / capacity;

    return {
      pages,
      fillRatio,
      lastPageItemsCount: lastPageItems.length,
      pageItems,
      fontSize: fs,
      gap,
      margin: m,
      gutter: g,
      colWidth: cw,
      bottomLimit: bLimit,
      firstColumnStartY: startY1,
      subsequentPageStartY: startYSub,
    };
  }

  const std = simulate({
    fontSize: 10,
    gap: 5,
    margin: defaultMargin,
    gutter: defaultGutter,
    firstColumnStartY,
    subsequentPageStartY: 52,
  });

  let best = std;

  const candidates = [
    { fontSize: 9.8, gap: 4.5, margin: Math.min(defaultMargin, 32), gutter: 30, subsequentPageStartY: 50 },
    { fontSize: 9.5, gap: 4.0, margin: Math.min(defaultMargin, 28), gutter: 26, subsequentPageStartY: 50 },
    { fontSize: 9.2, gap: 3.5, margin: Math.min(defaultMargin, 26), gutter: 24, subsequentPageStartY: 50 },
    { fontSize: 9.0, gap: 3.0, margin: Math.min(defaultMargin, 24), gutter: 22, subsequentPageStartY: 50 },
    { fontSize: 8.7, gap: 2.8, margin: Math.min(defaultMargin, 22), gutter: 20, subsequentPageStartY: 50 },
    { fontSize: 8.5, gap: 2.5, margin: Math.min(defaultMargin, 22), gutter: 20, subsequentPageStartY: 50 },
  ];

  if (ecoMode === 'TARGET_2') {
    if (std.pages > 2) {
      for (const cand of candidates) {
        const res = simulate(cand);
        if (res.pages <= 2) {
          best = res;
          break;
        }
      }
      if (best.pages > 2) {
        best = simulate(candidates[candidates.length - 1]);
      }
    }
  } else if (ecoMode === 'TARGET_4') {
    if (std.pages > 4) {
      for (const cand of candidates) {
        const res = simulate(cand);
        if (res.pages <= 4) {
          best = res;
          break;
        }
      }
      if (best.pages > 4) {
        best = simulate(candidates[candidates.length - 1]);
      }
    }
  } else {
    // AUTO mode: pull back if spillover on last page is small (< 35% fill)
    if (std.pages > 1 && std.fillRatio < 0.35) {
      const target = std.pages - 1;
      for (const cand of candidates) {
        const res = simulate(cand);
        if (res.pages <= target) {
          best = res;
          break;
        }
      }
    }
  }

  const colWidth = best.colWidth;
  const margin = best.margin;
  const gutter = best.gutter;
  const bottomLimit = best.bottomLimit;
  const subsequentPageStartY = best.subsequentPageStartY;
  const colX = [margin, margin + colWidth + gutter];

  let colY = [firstColumnStartY, firstColumnStartY];
  let col = 0;
  let currentPageIndex = 0;
  let currentActiveBottomLimit = bottomLimit;

  function updateBottomLimitForPage() {
    if (currentPageIndex === best.pageItems.length - 1) {
      const items = best.pageItems[currentPageIndex];
      const totalH = items.reduce((sum, it) => sum + it.h, 0);
      const startY = currentPageIndex === 0 ? firstColumnStartY : subsequentPageStartY;
      const idealHalf = totalH / 2;
      const balancedLimit = startY + (idealHalf * 1.05) + 30;
      currentActiveBottomLimit = Math.min(bottomLimit, balancedLimit);
    } else {
      currentActiveBottomLimit = bottomLimit;
    }
  }

  updateBottomLimitForPage();

  renderItems.forEach((q, i) => {
    const index = q._renderIndex;
    const h = measureQuestionHeight(doc, q, index, colWidth, best.fontSize, best.gap, optionFormat, answerFormat);

    if (colY[col] + h > (col === 0 ? currentActiveBottomLimit : bottomLimit)) {
      if (col === 0) {
        col = 1;
        if (colY[1] + h > bottomLimit) {
          doc.addPage();
          colY = [subsequentPageStartY, subsequentPageStartY];
          col = 0;
          currentPageIndex++;
          updateBottomLimitForPage();
        }
      } else {
        doc.addPage();
        colY = [subsequentPageStartY, subsequentPageStartY];
        col = 0;
        currentPageIndex++;
        updateBottomLimitForPage();
      }
    }

    const bottomY = q.isHeader ? 
      drawSectionHeader(doc, q.text, colX[col], colY[col], colWidth) : 
      drawQuestion(doc, q, index, colX[col], colY[col], colWidth, best.fontSize, best.gap, optionFormat, answerFormat);
      
    colY[col] = bottomY;
  });

  const endPageIndex = doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1;
  for (let i = startPageIndex; i <= endPageIndex; i++) {
    doc.switchToPage(i);
    const startY = (i === startPageIndex) ? firstColumnStartY - 6 : subsequentPageStartY - 6;
    const endY = bottomLimit - 14;
    doc.strokeColor('#000000').lineWidth(0.5);
    doc.moveTo(pageWidth / 2, startY).lineTo(pageWidth / 2, endY).stroke();
  }
  
  doc.switchToPage(endPageIndex);
}

function drawAnswerKey(doc, questions, pageWidth, optionFormat = 'ALPHA', setLabel = null) {
  doc.addPage();
  doc.y = 54;
  const heading = setLabel ? `Answer Key — ${setLabel.startsWith('SET') ? setLabel : 'SET ' + setLabel}` : 'Answer Key';
  doc.fill(NAVY).font(FONT_BOLD).fontSize(15)
    .text(heading, 36, doc.y, { width: pageWidth - 72, align: 'center' });
  doc.moveDown(1);

  const cols = 5;
  const colWidth = (pageWidth - 72) / cols;
  const rowHeight = 20;
  let x = 36;
  let y = doc.y;

  questions.forEach((q, i) => {
    if (y + rowHeight > doc.page.height - 60) {
      doc.addPage();
      y = 54;
    }
    const ansKey = formatAnswerKeyOption(q.correctOption, optionFormat);
    doc.fill(INK).font(FONT_REGULAR).fontSize(11).text(`${i + 1}.`, x, y, { width: 30 });
    doc.fill(GOLD).font(FONT_BOLD).text(ansKey, x + 30, y);
    x += colWidth;
    if ((i + 1) % cols === 0) {
      x = 36;
      y += rowHeight;
    }
  });
}

function drawSolutions(doc, questions, pageWidth, pageHeight, optionFormat = 'ALPHA', setLabel = null, ecoMode = 'AUTO') {
  const isCompact = ecoMode === 'TARGET_2' || ecoMode === 'TARGET_4' || ecoMode === 'COMPACT';
  const margin = isCompact ? 28 : 34;
  const gutter = isCompact ? 22 : 28;
  const colWidth = (pageWidth - margin * 2 - gutter) / 2;
  const colX = [margin, margin + colWidth + gutter];
  const bottomLimit = pageHeight - Math.max(34, margin + 8);
  const subsequentPageStartY = 50;

  const fontSize = isCompact ? 8.7 : 9.5;
  const gap = isCompact ? 6 : 8;
  const headerHeight = Math.round(fontSize * 1.35);

  const titleY = 52;
  const lineY = titleY + 15;
  const firstPageStartY = lineY + 8;

  // 1. Measure each solution block
  const measuredItems = questions.map((q, i) => {
    const hasSolution = q.solutionText && String(q.solutionText).trim();
    const bodyText = hasSolution ? String(q.solutionText).trim() : 'Solution not provided for this question.';
    const rawAns = formatAnswerKeyOption(q.correctOption, optionFormat);
    const ansKey = rawAns ? String(rawAns).trim() : '';
    const ansDisplay = (['A', 'B', 'C', 'D', '(A)', '(B)', '(C)', '(D)', '1', '2', '3', '4'].includes(ansKey))
      ? `(${ansKey.replace(/[()]/g, '')})`
      : ansKey;

    const bodyHeight = richMeasure(doc, bodyText, colWidth, fontSize, 'justify');
    const totalHeight = headerHeight + bodyHeight + gap;

    return {
      index: i,
      hasSolution,
      bodyText,
      ansDisplay,
      headerHeight,
      bodyHeight,
      totalHeight,
    };
  });

  // 2. Simulate pagination to find page grouping
  const pages = [[]];
  let curColY = [firstPageStartY, firstPageStartY];
  let curCol = 0;
  let curPageIndex = 0;

  for (const item of measuredItems) {
    const isFirstP = (curPageIndex === 0);
    const topLimit = isFirstP ? firstPageStartY : subsequentPageStartY;
    const isAtTop = curColY[curCol] === topLimit;

    if (!isAtTop && (curColY[curCol] + item.totalHeight > bottomLimit)) {
      if (curCol === 0) {
        curCol = 1;
        if (curColY[1] + item.totalHeight > bottomLimit && curColY[1] > topLimit) {
          curPageIndex++;
          pages.push([]);
          curColY = [subsequentPageStartY, subsequentPageStartY];
          curCol = 0;
        }
      } else {
        curPageIndex++;
        pages.push([]);
        curColY = [subsequentPageStartY, subsequentPageStartY];
        curCol = 0;
      }
    }

    curColY[curCol] += item.totalHeight;
    pages[curPageIndex].push(item);
  }

  // 3. Render page by page with column balancing on the final page
  doc.addPage();
  const startPageIndex = doc.bufferedPageRange().count - 1;
  const totalSolPages = pages.length;
  const setSuffix = setLabel ? ` (${setLabel.startsWith('SET') ? setLabel : 'SET ' + setLabel})` : '';

  const pageBottomYs = [];

  for (let p = 0; p < totalSolPages; p++) {
    if (p > 0) doc.addPage();
    const isFirstP = (p === 0);
    const isLastP = (p === totalSolPages - 1);
    const pageItems = pages[p];

    if (isFirstP) {
      // Title Header on Page 1 of solutions
      doc.fill(NAVY).font(FONT_BOLD).fontSize(12)
        .text(`SOLUTIONS & DETAILED EXPLANATIONS${setSuffix}`, margin, titleY, {
          width: pageWidth - margin * 2,
          align: 'center',
          characterSpacing: 0.5,
        });

      // Dividing line under header
      doc.strokeColor('#000000').lineWidth(0.5)
        .moveTo(margin, lineY)
        .lineTo(pageWidth - margin, lineY)
        .stroke();
    }

    const startY = isFirstP ? firstPageStartY : subsequentPageStartY;
    let colY = [startY, startY];
    let col = 0;

    // Balance columns if it's the last page
    let activeLimitCol0 = bottomLimit;
    if (isLastP) {
      const totalPageHeight = pageItems.reduce((acc, it) => acc + it.totalHeight, 0);
      const halfHeight = totalPageHeight / 2;
      // Allow small headroom so column 0 takes roughly half the questions
      activeLimitCol0 = Math.min(bottomLimit, startY + halfHeight + 15);
    }

    for (const item of pageItems) {
      const limit = (col === 0) ? activeLimitCol0 : bottomLimit;
      const isAtTop = colY[col] === startY;

      if (!isAtTop && (colY[col] + item.totalHeight > limit)) {
        if (col === 0) {
          col = 1;
        }
      }

      const curX = colX[col];
      const topY = colY[col];

      // Header line: Question number + Answer key
      const qPrefix = `Q. ${item.index + 1}   `;
      doc.font(FONT_BOLD).fontSize(fontSize).fill(INK);
      const qPrefixWidth = doc.widthOfString(qPrefix);
      doc.text(qPrefix, curX, topY, { lineBreak: false });
      doc.fill(GOLD).text(`[Ans: ${item.ansDisplay || '?'}]`, curX + qPrefixWidth, topY, { lineBreak: false });

      // Solution body text
      const bodyY = topY + item.headerHeight;
      const endY = richDraw(doc, item.bodyText, curX, bodyY, colWidth, fontSize, item.hasSolution ? INK : SOFT, 'justify');

      colY[col] = endY + gap;
    }

    pageBottomYs.push(Math.max(colY[0], colY[1]));
  }

  // 4. Vertical Center Divider line across all solution pages
  for (let p = 0; p < totalSolPages; p++) {
    doc.switchToPage(startPageIndex + p);
    const startY = (p === 0) ? firstPageStartY - 4 : subsequentPageStartY - 6;
    const maxContentY = pageBottomYs[p] || bottomLimit;
    const endY = Math.min(bottomLimit - 12, Math.max(startY + 40, maxContentY + 8));
    doc.strokeColor('#000000').lineWidth(0.5);
    doc.moveTo(pageWidth / 2, startY).lineTo(pageWidth / 2, endY).stroke();
  }

  doc.switchToPage(startPageIndex + totalSolPages - 1);
}

/**
 * Draws an anti-piracy watermark across the page.
 * Supports:
 * - Large diagonal Institute Name (or custom text) at -35.3°
 * - Secondary security notice (e.g. CONFIDENTIAL · NOT FOR SALE)
 * - Scaled Institute Logo (if uploaded)
 * - Calibrated opacity (faint 0.045, standard 0.075, prominent 0.11)
 */
function drawWatermark(doc, paper, pageWidth, pageHeight, isEvaluationPage = false) {
  const isEnabled = paper.watermark !== false && (
    paper.watermark === true ||
    paper.watermarkText ||
    paper.instituteName
  );
  if (!isEnabled) return;

  const rawText = String(paper.watermarkText || paper.instituteName || '').trim();
  if (!rawText && !paper.instituteLogoFilename) return;

  // Resolve opacity
  let opacity = 0.075; // standard default (7.5%)
  const opSetting = String(paper.watermarkOpacity || 'standard').toLowerCase();
  if (opSetting === 'faint') opacity = 0.045;
  else if (opSetting === 'prominent' || opSetting === 'dark') opacity = 0.11;
  else if (typeof paper.watermarkOpacity === 'number') {
    opacity = Math.max(0.02, Math.min(0.25, paper.watermarkOpacity));
  }

  // If this is an evaluation master key page, soften opacity slightly to avoid obscuring tables
  if (isEvaluationPage) {
    opacity = Math.min(opacity, 0.045);
  }

  const cx = pageWidth / 2;
  const cy = pageHeight / 2;
  const wmType = String(paper.watermarkType || 'TEXT').toUpperCase();

  doc.save();

  // 1. Draw Logo Watermark if requested (or BOTH)
  if ((wmType === 'LOGO' || wmType === 'BOTH') && paper.instituteLogoFilename) {
    const logoPath = path.join(IMAGES_DIR, paper.instituteLogoFilename);
    if (fs.existsSync(logoPath)) {
      try {
        const img = doc.openImage(logoPath);
        const maxDim = 240;
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const lw = img.width * scale;
        const lh = img.height * scale;
        doc.opacity(wmType === 'BOTH' ? opacity * 0.75 : opacity);
        doc.image(logoPath, cx - lw / 2, cy - lh / 2, { width: lw, height: lh });
      } catch (err) {
        // Fall back gracefully if logo file cannot be parsed
      }
    }
  }

  // 2. Draw Text Watermark if requested (or BOTH, or fallback if LOGO had no valid file)
  if (wmType === 'TEXT' || wmType === 'BOTH' || (wmType === 'LOGO' && !paper.instituteLogoFilename)) {
    if (rawText) {
      const textUpper = rawText.toUpperCase();
      const len = textUpper.length;
      let fontSize = 34;
      if (len <= 15) fontSize = 42;
      else if (len <= 25) fontSize = 36;
      else if (len <= 40) fontSize = 28;
      else fontSize = 23;

      doc.opacity(opacity);
      doc.rotate(-35.3, { origin: [cx, cy] });
      doc.font('Helvetica-Bold').fontSize(fontSize).fill('#0f172a');

      const boxWidth = 700;
      const primaryY = cy - fontSize / 2 - 8;
      doc.text(textUpper, cx - boxWidth / 2, primaryY, {
        width: boxWidth,
        align: 'center',
        lineBreak: false,
      });

      // Optional security micro-tagline
      const tagline = String(paper.watermarkTagline || paper.instituteTagline || 'CONFIDENTIAL · DO NOT COPY OR DISTRIBUTE').trim().toUpperCase();
      if (tagline && fontSize >= 28) {
        doc.font('Helvetica-Bold').fontSize(Math.max(12, Math.round(fontSize * 0.44))).fill('#334155');
        doc.text(tagline, cx - boxWidth / 2, primaryY + fontSize + 8, {
          width: boxWidth,
          align: 'center',
          lineBreak: false,
        });
      }
    }
  }

  doc.restore();
}

function fitTextToWidth(doc, text, maxWidth) {
  if (!text) return '';
  if (doc.widthOfString(text) <= maxWidth) return text;
  let str = text;
  while (str.length > 3 && doc.widthOfString(str + '...') > maxWidth) {
    str = str.slice(0, -1);
  }
  return str + '...';
}

function drawHeadersAndFooters(doc, paper) {
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  const savedBottomMargin = doc.page.margins.bottom;
  const savedTopMargin = doc.page.margins.top;
  const setLabel = paper.setLabel ? String(paper.setLabel).trim().toUpperCase() : null;
  const isEval = setLabel === 'MASTER KEY';

  for (let i = range.start; i < range.start + totalPages; i++) {
    doc.switchToPage(i);
    
    // 0. Anti-Piracy Watermark across page
    drawWatermark(doc, paper, doc.page.width, doc.page.height, isEval);

    // 1. Footer
    doc.page.margins.bottom = 0; // writing inside the margin area — prevent pdfkit auto-adding a page
    const isCompact = paper.ecoMode && paper.ecoMode !== 'AUTO';
    const runMargin = isCompact ? 28 : 36;
    const setFooter = setLabel ? `   ·   ${setLabel.startsWith('SET') ? setLabel : 'SET ' + setLabel}` : '';
    doc.fill(SOFT).font(FONT_REGULAR).fontSize(8)
      .text(
        `${paper.instituteName || ''}${setFooter}   ·   Page ${i + 1} of ${totalPages}`,
        runMargin, doc.page.height - 24,
        { width: doc.page.width - runMargin * 2, align: 'center', lineBreak: false }
      );
    doc.page.margins.bottom = savedBottomMargin;

    // 2. Running Header (Page 2 onwards)
    if (i > range.start) {
      doc.page.margins.top = 0;
      doc.fill('#000000').font(FONT_BOLD).fontSize(8.5);
      
      const setRun = setLabel ? ` (${setLabel.startsWith('SET') ? setLabel : 'SET ' + setLabel})` : '';
      const examLabel = `${paper.examName || ''} — ${TEST_TYPE_LABELS[paper.paperType] || paper.paperType || ''}${setRun}`;
      const availWidth = doc.page.width / 2 - runMargin - 10;
      // Left text: Exam Name
      doc.text(fitTextToWidth(doc, examLabel, availWidth), runMargin, 30, { width: availWidth, align: 'left', lineBreak: false });
      // Right text: Institute Name
      doc.text(fitTextToWidth(doc, paper.instituteName || '', availWidth), doc.page.width / 2 + 10, 30, { width: availWidth, align: 'right', lineBreak: false });
      
      // Horizontal Line
      doc.strokeColor('#000000').lineWidth(0.5)
         .moveTo(runMargin, 42)
         .lineTo(doc.page.width - runMargin, 42)
         .stroke();
         
      doc.page.margins.top = savedTopMargin;
    }
  }
}

/**
 * Draws section-aware headers and footers for a multi-set bundle PDF.
 * Ensures:
 * 1. Running header is NEVER drawn on the first page of any set (avoids collision with main title header).
 * 2. Running header is NEVER drawn on the Master Key page.
 * 3. Running header on continuation pages accurately identifies the specific set (e.g. SET B).
 * 4. Footers display set-specific page numbers (e.g. Page 1 of 3) plus overall bundle reference.
 */
function drawBundleHeadersAndFooters(doc, paper, sections) {
  const totalBundlePages = doc.bufferedPageRange().count;
  const savedBottomMargin = doc.page.margins.bottom;
  const savedTopMargin = doc.page.margins.top;

  sections.forEach((sec) => {
    const isMasterKey = sec.type === 'MASTER_KEY';
    const secTotalPages = sec.endPage - sec.startPage + 1;

    for (let p = sec.startPage; p <= sec.endPage; p++) {
      doc.switchToPage(p);

      // 0. Anti-Piracy Watermark across page
      drawWatermark(doc, sec.setPaper, doc.page.width, doc.page.height, isMasterKey);

      // 1. Footer (Clean, section-specific + bundle reference)
      doc.page.margins.bottom = 0;
      doc.fill(SOFT).font(FONT_REGULAR).fontSize(8);
      const isCompact = paper.ecoMode && paper.ecoMode !== 'AUTO';
      const runMargin = isCompact ? 28 : 36;
      const pageInSec = p - sec.startPage + 1;
      const footerText = isMasterKey
        ? `${paper.instituteName || ''}   ·   SYNCED MASTER ANSWER KEY   ·   Page ${p + 1} of ${totalBundlePages}`
        : `${paper.instituteName || ''}   ·   SET ${sec.setChar}   ·   Page ${pageInSec} of ${secTotalPages}   (Bundle Sheet ${p + 1} of ${totalBundlePages})`;

      doc.text(footerText, runMargin, doc.page.height - 24, {
        width: doc.page.width - runMargin * 2,
        align: 'center',
        lineBreak: false,
      });
      doc.page.margins.bottom = savedBottomMargin;

      // 2. Running Header (ONLY on continuation pages of a question set!)
      // - NEVER on the first page of a set (p === sec.startPage) because that page has the full main title header!
      // - NEVER on the Master Key page!
      if (!isMasterKey && p > sec.startPage) {
        doc.page.margins.top = 0;
        doc.fill('#000000').font(FONT_BOLD).fontSize(8.5);

        const examLabel = `${paper.examName || ''} — ${TEST_TYPE_LABELS[paper.paperType] || paper.paperType || ''} (SET ${sec.setChar})`;
        const availWidth = doc.page.width / 2 - runMargin - 10;
        doc.text(fitTextToWidth(doc, examLabel, availWidth), runMargin, 30, { width: availWidth, align: 'left', lineBreak: false });
        doc.text(fitTextToWidth(doc, paper.instituteName || '', availWidth), doc.page.width / 2 + 10, 30, { width: availWidth, align: 'right', lineBreak: false });

        doc.strokeColor('#000000').lineWidth(0.5)
           .moveTo(runMargin, 42)
           .lineTo(doc.page.width - runMargin, 42)
           .stroke();

        doc.page.margins.top = savedTopMargin;
      }
    }
  });
}

function drawMasterKeyTable(doc, matrix, paper, pageWidth, pageHeight) {
  doc.addPage();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  // Header
  doc.fill('#0f172a').font(FONT_BOLD).fontSize(15)
    .text(paper.instituteName || 'LEADSON ACADEMY', margin, 36, { width: contentWidth, align: 'center' });

  doc.fill(NAVY).font(FONT_BOLD).fontSize(11)
    .text(`${paper.title || 'Question Paper'} — Synced Master Answer Key (Sets A, B, C, D)`, margin, 56, { width: contentWidth, align: 'center' });

  doc.fill(SOFT).font(FONT_REGULAR).fontSize(8.5)
    .text(`Evaluation & Grading Matrix   ·   ${matrix.questionCount} Questions   ·   Generated: ${new Date().toLocaleDateString('en-IN')}`, margin, 72, { width: contentWidth, align: 'center' });

  // Divider line
  doc.strokeColor('#cbd5e1').lineWidth(0.75)
    .moveTo(margin, 88)
    .lineTo(pageWidth - margin, 88)
    .stroke();

  // Grid Layout
  const totalQ = matrix.rows.length;
  const numBlocks = 3;
  const blockWidth = 160;
  const gutter = (contentWidth - blockWidth * numBlocks) / (numBlocks - 1);
  const rowHeight = 15;
  const headerHeight = 18;
  const startY = 100;
  const maxRowsPerPage = Math.floor((pageHeight - startY - 50) / rowHeight);
  // Balance questions evenly across blocks on the page
  const rowsPerBlock = Math.min(maxRowsPerPage, Math.max(15, Math.ceil(totalQ / numBlocks)));
  const colSubWidth = blockWidth / 5; // Q#, A, B, C, D

  function drawBlockHeader(bx, by) {
    doc.save();
    doc.rect(bx, by, blockWidth, headerHeight).fill('#1e293b');
    doc.fill('#ffffff').font(FONT_BOLD).fontSize(8);

    const headers = ['Q#', 'SET A', 'SET B', 'SET C', 'SET D'];
    headers.forEach((h, idx) => {
      doc.text(h, bx + idx * colSubWidth, by + 4.5, { width: colSubWidth, align: 'center', lineBreak: false });
    });
    doc.restore();
  }

  // Draw initial headers
  for (let b = 0; b < numBlocks; b++) {
    const bx = margin + b * (blockWidth + gutter);
    drawBlockHeader(bx, startY);
  }

  matrix.rows.forEach((row, i) => {
    const itemOnPage = i % (rowsPerBlock * numBlocks);
    const block = Math.floor(itemOnPage / rowsPerBlock);
    const rowInBlock = itemOnPage % rowsPerBlock;

    if (i > 0 && itemOnPage === 0) {
      doc.addPage();
      for (let b = 0; b < numBlocks; b++) {
        const bx = margin + b * (blockWidth + gutter);
        drawBlockHeader(bx, startY);
      }
    }

    const bx = margin + block * (blockWidth + gutter);
    const ry = startY + headerHeight + rowInBlock * rowHeight;

    doc.save();
    // Alternating row background
    if (rowInBlock % 2 === 1) {
      doc.rect(bx, ry, blockWidth, rowHeight).fill('#f8fafc');
    }

    // Border
    doc.strokeColor('#e2e8f0').lineWidth(0.5).rect(bx, ry, blockWidth, rowHeight).stroke();

    // Text
    doc.fill('#0f172a').font(FONT_BOLD).fontSize(8.5)
      .text(String(row.qNumber), bx, ry + 3, { width: colSubWidth, align: 'center', lineBreak: false });

    const keys = [row.keyA, row.keyB, row.keyC, row.keyD];
    keys.forEach((k, kIdx) => {
      doc.fill(GOLD).font(FONT_BOLD).fontSize(8.5)
        .text(k || '-', bx + (kIdx + 1) * colSubWidth, ry + 3, { width: colSubWidth, align: 'center', lineBreak: false });
    });

    doc.restore();
  });
}

/**
 * Writes the paper PDF into the given writable stream.
 * @param paper  { title, instituteName, examName, paperType, createdAt, optionFormat, setLabel }
 * @param questions  ordered [{ questionText, options: {A,B,C,D}, correctOption }]
 * @param withAnswers  include the answer-key page
 */
function buildPaperPdf(stream, paper, questions, withAnswers) {
  const ecoMode = (paper.ecoMode || 'AUTO').toUpperCase();
  const isCompactHeader = ecoMode === 'TARGET_2' || ecoMode === 'TARGET_4' || ecoMode === 'COMPACT';
  const margin = isCompactHeader ? 28 : 36;
  const gutter = isCompactHeader ? 26 : 34;

  const doc = new PDFDocument({ size: 'A4', margin, bufferPages: true });
  ensureFontsRegistered(doc);
  doc.pipe(stream);

  const optionFormat = resolveOptionFormat(paper);
  const answerFormat = resolveAnswerFormat(paper);
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  const headerBottomY = drawHeader(doc, paper, pageWidth, questions.length, isCompactHeader, margin);
  const instructionsBottomY = drawInstructions(doc, questions.length, pageWidth, headerBottomY + 4, optionFormat, answerFormat, paper.setLabel, isCompactHeader, margin);
  const columnsStartY = drawStudentDetails(doc, pageWidth, instructionsBottomY, isCompactHeader, margin);

  layoutQuestionsTwoColumn(doc, questions, pageWidth, pageHeight, columnsStartY, optionFormat, answerFormat, ecoMode, { margin, gutter });

  if (withAnswers) drawAnswerKey(doc, questions, pageWidth, optionFormat, paper.setLabel);

  // Solutions section, only when this paper was generated with solutions
  // included (charged 1 credit each at finalize). The answer key above is
  // always free; this is the paid add-on.
  if (paper.includeSolutions) {
    drawSolutions(doc, questions, pageWidth, pageHeight, optionFormat, paper.setLabel, ecoMode);
  }

  drawHeadersAndFooters(doc, paper);
  doc.end();
}

/**
 * Writes the Synced Master Answer Key PDF (Sets A, B, C, D) into stream.
 */
function buildMasterKeyPdf(stream, paper, baseQuestions, optionFormat = 'ALPHA') {
  const doc = new PDFDocument({ size: 'A4', margin: 36, autoFirstPage: false, bufferPages: true });
  ensureFontsRegistered(doc);
  doc.pipe(stream);

  const resolvedOptionFormat = optionFormat || resolveOptionFormat(paper);
  const matrix = generateMasterKeyMatrix(paper.id, baseQuestions, resolvedOptionFormat);
  drawMasterKeyTable(doc, matrix, paper, 595.28, 841.89);

  drawHeadersAndFooters(doc, { ...paper, setLabel: 'MASTER KEY' });
  doc.end();
}

/**
 * Writes a multi-set printable bundle (Set A, B, C, D + Synced Master Key) into stream.
 */
function buildPaperBundlePdf(stream, paper, baseQuestions, withAnswers) {
  const ecoMode = (paper.ecoMode || 'AUTO').toUpperCase();
  const isCompactHeader = ecoMode === 'TARGET_2' || ecoMode === 'TARGET_4' || ecoMode === 'COMPACT';
  const margin = isCompactHeader ? 28 : 36;
  const gutter = isCompactHeader ? 26 : 34;

  const doc = new PDFDocument({ size: 'A4', margin, bufferPages: true });
  ensureFontsRegistered(doc);
  doc.pipe(stream);

  const optionFormat = resolveOptionFormat(paper);
  const answerFormat = resolveAnswerFormat(paper);
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  const sets = ['A', 'B', 'C', 'D'];
  const sections = [];

  sets.forEach((setChar, setIdx) => {
    if (setIdx > 0) doc.addPage();
    const startPageIndex = doc.bufferedPageRange().count - 1;
    const setQuestions = generateSetQuestions(paper.id, baseQuestions, setChar);
    const setPaper = { ...paper, setLabel: `SET ${setChar}` };

    const headerBottomY = drawHeader(doc, setPaper, pageWidth, setQuestions.length, isCompactHeader, margin);
    const instructionsBottomY = drawInstructions(doc, setQuestions.length, pageWidth, headerBottomY + 4, optionFormat, answerFormat, setPaper.setLabel, isCompactHeader, margin);
    const columnsStartY = drawStudentDetails(doc, pageWidth, instructionsBottomY, isCompactHeader, margin);

    layoutQuestionsTwoColumn(doc, setQuestions, pageWidth, pageHeight, columnsStartY, optionFormat, answerFormat, ecoMode, { margin, gutter });

    if (withAnswers) {
      drawAnswerKey(doc, setQuestions, pageWidth, optionFormat, setPaper.setLabel);
    }

    if (paper.includeSolutions) {
      drawSolutions(doc, setQuestions, pageWidth, pageHeight, optionFormat, setPaper.setLabel, ecoMode);
    }

    const endPageIndex = doc.bufferedPageRange().count - 1;
    sections.push({
      type: 'SET',
      setChar,
      setPaper,
      startPage: startPageIndex,
      endPage: endPageIndex,
    });
  });

  // Append Synced Master Answer Key at the end
  const matrix = generateMasterKeyMatrix(paper.id, baseQuestions, optionFormat);
  const masterKeyStartPage = doc.bufferedPageRange().count;
  drawMasterKeyTable(doc, matrix, paper, pageWidth, pageHeight);
  const masterKeyEndPage = doc.bufferedPageRange().count - 1;
  sections.push({
    type: 'MASTER_KEY',
    setPaper: { ...paper, setLabel: 'MASTER KEY' },
    startPage: masterKeyStartPage,
    endPage: masterKeyEndPage,
  });

  drawBundleHeadersAndFooters(doc, paper, sections);
  doc.end();
}

/**
 * Estimates page count, sheet consumption, and spillover status across AUTO, TARGET_2, and TARGET_4 modes.
 *
 * @param {Object} paper
 * @param {Array} questions
 * @param {Object} options - { optionFormat, answerFormat }
 * @returns {Object} { totalQuestions, standard, target2, target4, recommendedMode }
 */
function estimatePaperPages(paper, questions = [], options = {}) {
  const dummyDoc = new PDFDocument({ size: 'A4', margin: 0 });
  ensureFontsRegistered(dummyDoc);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const optionFormat = options.optionFormat || resolveOptionFormat(paper);
  const answerFormat = options.answerFormat || resolveAnswerFormat(paper);

  const renderItems = [];
  let currentType = null;
  let qNumber = 1;
  questions.forEach((q) => {
    const isNVQ = q.questionType === "NVQ" || q.questionType === "NUMERICAL" || q.questionType === "DECIMAL";
    const typeLabel = isNVQ ? "Numerical Value Questions" : "Multiple Choice Questions";
    if (currentType !== typeLabel) {
       currentType = typeLabel;
       renderItems.push({ isHeader: true, text: "Section: " + typeLabel });
    }
    q._renderIndex = qNumber++;
    renderItems.push(q);
  });

  function simulateConfig(cfg) {
    const fs = cfg.fontSize || 10;
    const gap = cfg.gap || 5;
    const m = cfg.margin || 36;
    const g = cfg.gutter || 34;
    const cw = (pageWidth - m * 2 - g) / 2;
    const bLimit = pageHeight - Math.max(34, m + 8);
    const startY1 = cfg.firstColumnStartY || 215;
    const startYSub = cfg.subsequentPageStartY || 52;

    let colY = [startY1, startY1];
    let col = 0;
    let pages = 1;
    let pageItems = [[]];

    for (let i = 0; i < renderItems.length; i++) {
      const q = renderItems[i];
      const h = measureQuestionHeight(dummyDoc, q, q._renderIndex, cw, fs, gap, optionFormat, answerFormat);
      
      if (colY[col] + h > bLimit) {
        if (col === 0) {
          col = 1;
          if (colY[1] + h > bLimit) {
            pages++;
            colY = [startYSub, startYSub];
            col = 0;
            pageItems.push([]);
          }
        } else {
          pages++;
          colY = [startYSub, startYSub];
          col = 0;
          pageItems.push([]);
        }
      }
      colY[col] += h;
      pageItems[pages - 1].push({ i, h });
    }

    const lastPageItems = pageItems[pageItems.length - 1];
    const totalLastPageH = lastPageItems.reduce((sum, item) => sum + item.h, 0);
    const capacity = 2 * (bLimit - (pages === 1 ? startY1 : startYSub));
    const fillRatio = totalLastPageH / capacity;

    return {
      pages,
      fillRatio: Number(fillRatio.toFixed(2)),
      lastPageItemsCount: lastPageItems.length,
      fontSize: fs,
      gap,
      margin: m,
      gutter: g,
    };
  }

  // 1. Standard Simulation
  const std = simulateConfig({ fontSize: 10, gap: 5, margin: 36, gutter: 34, firstColumnStartY: 215, subsequentPageStartY: 52 });

  // 2. Candidates for Eco-Fit
  const candidates = [
    { fontSize: 9.8, gap: 4.5, margin: 32, gutter: 30, firstColumnStartY: 170, subsequentPageStartY: 50 },
    { fontSize: 9.5, gap: 4.0, margin: 28, gutter: 26, firstColumnStartY: 145, subsequentPageStartY: 50 },
    { fontSize: 9.2, gap: 3.5, margin: 26, gutter: 24, firstColumnStartY: 135, subsequentPageStartY: 50 },
    { fontSize: 9.0, gap: 3.0, margin: 24, gutter: 22, firstColumnStartY: 125, subsequentPageStartY: 50 },
    { fontSize: 8.7, gap: 2.8, margin: 22, gutter: 20, firstColumnStartY: 120, subsequentPageStartY: 50 },
    { fontSize: 8.5, gap: 2.5, margin: 22, gutter: 20, firstColumnStartY: 120, subsequentPageStartY: 50 },
  ];

  let t2 = std;
  if (std.pages > 2) {
    for (const cand of candidates) {
      const res = simulateConfig(cand);
      if (res.pages <= 2) {
        t2 = res;
        break;
      }
    }
    if (t2.pages > 2) t2 = simulateConfig(candidates[candidates.length - 1]);
  }

  let t4 = std;
  if (std.pages > 4) {
    for (const cand of candidates) {
      const res = simulateConfig(cand);
      if (res.pages <= 4) {
        t4 = res;
        break;
      }
    }
    if (t4.pages > 4) t4 = simulateConfig(candidates[candidates.length - 1]);
  }

  const stdSheets = Math.ceil(std.pages / 2);
  const t2Sheets = Math.ceil(t2.pages / 2);
  const t4Sheets = Math.ceil(t4.pages / 2);

  const spillover = std.pages > 1 && (std.pages % 2 !== 0 || std.fillRatio < 0.35);

  let recommendedMode = 'AUTO';
  if (questions.length <= 48 && std.pages > 2 && t2.pages <= 2) {
    recommendedMode = 'TARGET_2';
  } else if (questions.length > 48 && std.pages > 4 && t4.pages <= 4) {
    recommendedMode = 'TARGET_4';
  } else if (spillover) {
    recommendedMode = std.pages <= 3 ? 'TARGET_2' : 'TARGET_4';
  }

  return {
    totalQuestions: questions.length,
    standard: {
      pages: std.pages,
      sheets: stdSheets,
      fillRatio: std.fillRatio,
      spillover,
      lastPageQuestions: std.lastPageItemsCount,
    },
    target2: {
      pages: t2.pages,
      sheets: t2Sheets,
      canFit: t2.pages <= 2,
      fillRatio: t2.fillRatio,
      sheetsSaved: Math.max(0, stdSheets - t2Sheets),
      paperSavingsPercent: stdSheets > 0 ? Math.round(((stdSheets - t2Sheets) / stdSheets) * 100) : 0,
      fontSize: t2.fontSize,
    },
    target4: {
      pages: t4.pages,
      sheets: t4Sheets,
      canFit: t4.pages <= 4,
      fillRatio: t4.fillRatio,
      sheetsSaved: Math.max(0, stdSheets - t4Sheets),
      paperSavingsPercent: stdSheets > 0 ? Math.round(((stdSheets - t4Sheets) / stdSheets) * 100) : 0,
      fontSize: t4.fontSize,
    },
    recommendedMode,
  };
}

module.exports = {
  buildPaperPdf,
  buildMasterKeyPdf,
  buildPaperBundlePdf,
  estimatePaperPages,
};


