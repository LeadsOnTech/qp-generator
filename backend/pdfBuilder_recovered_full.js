Created At: 2026-08-26T12:56:21+05:30
Completed At: 2026-08-26T12:56:21+05:30
File Path: `file:///d:/Antigravity/QP%20Generator/qpgen-Phase-11-auth-stage1/backend/src/lib/pdfBuilder.js`
Total Lines: 672
Total Bytes: 28566
Showing lines 1 to 672
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: const PDFDocument = require('pdfkit');
2: const { layoutRichText, drawRichText, containsMath } = require('./richTextLayout');
3: const fs = require('fs');
4: const path = require('path');
5: 
6: // Diagram images are looked up here (same location the upload route saves to)
7: const IMAGES_DIR = path.join(__dirname, '..', '..', 'uploads', 'images');
8: 
9: // ---------------------------------------------------------------------------
10: // Font — bundled directly in the project (assets/fonts/), NOT a Windows
11: // system font path. This was previously registering a hardcoded
12: // "C:/Windows/Fonts/times.ttf" path, which only exists on the original
13: // developer's Windows machine — on any other system (a Linux/Coolify
14: // deployment, another developer's machine, CI) it silently fell back to
15: // PDFKit's built-in Times-Roman, a base-14 standard font with extremely
16: // limited Unicode support. Real rendering tests confirmed this fallback
17: // font could NOT display most math/science notation at all: superscripts
18: // and subscripts (beyond ² ³), square roots, Greek letters (π θ α β Δ Σ),
19: // integrals, arrows, and inequality signs all rendered as garbled, wrong
20: // characters — a silent, serious deployment risk.
21: //
22: // DejaVu Serif (open-source, bundled as a real file in this repo) has
23: // comprehensive Unicode coverage and was verified, by rendering real test
24: // PDFs, to correctly display every one of those symbols. Because the font
25: // ships as a file WITH the code instead of depending on what happens to be
26: // installed on whichever machine runs it, rendering is now identical on
27: // the original Windows dev machine, any other developer's machine, and
28: // the Linux production server alike.
29: // ---------------------------------------------------------------------------
30: const FONT_FILE_REGULAR = path.join(__dirname, '..', '..', 'assets', 'fonts', 'DejaVuSerif.ttf');
31: const FONT_FILE_BOLD = path.join(__dirname, '..', '..', 'assets', 'fonts', 'DejaVuSerif-Bold.ttf');
32: 
33: const FONT_REGULAR = 'PaperFont-Regular';
34: const FONT_BOLD = 'PaperFont-Bold';
35: const fontsRegisteredOnDoc = new WeakSet();
36: 
37: /** Registers the bundled fonts on a specific PDFDocument instance (PDFKit
38:  * requires font registration per-document, not globally). Safe to call
39:  * multiple times on the same doc — only registers once. */
40: function ensureFontsRegistered(doc) {
41:   if (fontsRegisteredOnDoc.has(doc)) return;
42:   doc.registerFont(FONT_REGULAR, FONT_FILE_REGULAR);
43:   doc.registerFont(FONT_BOLD, FONT_FILE_BOLD);
44:   fontsRegisteredOnDoc.add(doc);
45: }
46: 
47: // ---------------------------------------------------------------------------
48: // PDF builder. Two-column exam-paper layout matching the standard printed
49: // EAMCET/EAPCET/NEET style: questions flow down the left column then the
50: // right column, then wrap to a new page. Options are packed two-per-line
51: // when short (e.g. "b/a and c/a") and fall back to one-per-line when any
52: // option is long (e.g. a full sentence), so nothing wraps awkwardly.
53: // ---------------------------------------------------------------------------
54: 
55: const NAVY = '#000000';
56: const GOLD = '#000000';
57: const INK = '#000000';
58: const SOFT = '#000000';
59: const LINE = '#000000';
60: 
61: const TEST_TYPE_LABELS = {
62:   DPP: 'Daily Practice Problems (DPP)',
63:   WEEKLY_TEST: 'Weekly Test',
64:   GRAND_TEST: 'Grand Test',
65:   MOCK_TEST: 'Mock Test',
66:   MODEL_PAPER: 'Model Paper',
67: };
68: 
69: // ---------------------------------------------------------------------------
70: // Derivative notation ("d/dx", "dy/dx", "dv/dt", etc.) at the START of a
71: // question reads as flat, casual text when printed as a plain slash — real
72: // textbooks always show this as a proper stacked fraction (numerator over
73: // a horizontal bar over the denominator). This detects that specific,
74: // well-defined pattern and draws it as a small hand-drawn fraction glyph
75: // instead of plain text. Deliberately scoped to ONLY this leading pattern
76: // (not arbitrary mid-sentence fractions like probability answers "1/2",
77: // which already read fine as plain text) to keep this a safe, additive
78: // change with no risk to any other question's layout.
79: // ---------------------------------------------------------------------------
80: // Covers: d/dx, dy/dx, dv/dt (ordinary derivatives), ∂y/∂x (partial
81: // derivatives), Δy/Δx (average rate of change / delta notation) — the
82: // handful of leading-fraction patterns that appear constantly across
83: // Physics, Chemistry, and Maths calculus questions. Deliberately still
84: // scoped to the START of the text only (never mid-sentence), so this
85: // stays a safe, additive change — everywhere else (probability answers
86: // like "1/2", ratios inside a sentence) renders exactly as before.
87: const LEADING_DERIVATIVE_PATTERN = /^([d∂Δ]\^?\d*[a-zA-Z]?)\/([d∂Δ][a-zA-Z]+\^?\d*)\s*/;
88: 
89: function detectLeadingFraction(text) {
90:   if (typeof text !== 'string') return null;
91:   const match = text.match(LEADING_DERIVATIVE_PATTERN);
92:   if (!match) return null;
93:   return {
94:     numerator: match[1],
95:     denominator: match[2],
96:     remainder: text.slice(match[0].length),
97:   };
98: }
99: 
100: const FRACTION_GAP_AFTER = 6; // px gap between the fraction glyph and the text that follows it
101: 
102: /** Measures a fraction glyph's rendered size without drawing anything. */
103: function measureFractionGlyph(doc, numerator, denominator, fontSize) {
104:   doc.font(FONT_REGULAR).fontSize(fontSize * 0.92);
105:   const numW = doc.widthOfString(numerator);
106:   const denW = doc.widthOfString(denominator);
107:   const width = Math.max(numW, denW) + 4;
108:   const height = fontSize * 1.9; // numerator + bar + denominator, with small gaps
109:   return { width, height };
110: }
111: 
112: /** Draws a fraction glyph (numerator / bar / denominator) at (x, y); returns its width. */
113: function drawFractionGlyph(doc, numerator, denominator, x, y, fontSize, color) {
114:   const barY = y + fontSize * 0.95;
115:   doc.font(FONT_REGULAR).fontSize(fontSize * 0.92).fill(color);
116:   const numW = doc.widthOfString(numerator);
117:   const denW = doc.widthOfString(denominator);
118:   const width = Math.max(numW, denW) + 4;
119: 
120:   doc.text(numerator, x + (width - numW) / 2, y, { lineBreak: false });
121:   doc.moveTo(x, barY).lineTo(x + width, barY).lineWidth(0.6).strokeColor(color).stroke();
122:   doc.text(denominator, x + (width - denW) / 2, barY + 2, { lineBreak: false });
123: 
124:   return width;
125: }
126: 
127: function formatChemicalFormulas(text) {
128:   if (typeof text !== 'string') return text;
129:   // Unicode subscript digits (₀-₉) are now safe to use unconditionally —
130:   // verified by direct rendering test — because the bundled DejaVu font
131:   // (assets/fonts/) supports them correctly on every platform, unlike the
132:   // old Windows-system-font-or-broken-fallback setup this replaced.
133:   const subscriptMap = {
134:     '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
135:     '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
136:   };
137:   const withSubscripts = text.replace(/([A-Z][a-z]?)([0-9]+)/g, (match, element, digits) => {
138:     const subs = digits.split('').map(d => subscriptMap[d] || d).join('');
139:     return element + subs;
140:   });
141:   // Chained here (rather than requiring every call site to remember to
142:   // call both functions) so every question/option automatically gets
143:   // both chemical-subscript AND caret-exponent formatting, with no risk
144:   // of a call site accidentally applying only one of the two.
145:   return formatExponents(withSubscripts);
146: }
147: 
148: // Only these exponent characters have a verified-safe Unicode superscript
149: // form with the bundled font — confirmed by direct rendering test. Any
150: // exponent using a character NOT in this table is left exactly as typed
151: // (with its caret), rather than risk a partial or garbled conversion.
152: const SUPERSCRIPT_MAP = {
153:   '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
154:   '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺',
155:   'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ', 'i': 'ⁱ',
156: };
157: 
158: /**
159:  * Converts common "x^2", "x^-1", "e^x" caret-exponent notation (a natural
160:  * way to type exponents in Excel) into real Unicode superscripts — but
161:  * ONLY when every character of the exponent has a verified-safe
162:  * superscript form. Something like "x^k" (no safe superscript "k" exists)
163:  * is left as "x^k" untouched, rather than guessing.
164:  */
165: function formatExponents(text) {
166:   if (typeof text !== 'string') return text;
167:   return text.replace(/\^(-?[0-9a-zA-Z]+)/g, (match, exponent) => {
168:     const converted = exponent.split('').map((ch) => SUPERSCRIPT_MAP[ch]).join('');
169:     const allSafe = exponent.split('').every((ch) => ch in SUPERSCRIPT_MAP);
170:     return allSafe ? converted : match;
171:   });
172: }
173: 
174: function getOptionsLayoutType(doc, q, colWidth) {
175:   doc.font(FONT_REGULAR).fontSize(11);
176:   
177:   let fitsQuarter = true;
178:   let fitsHalf = true;
179:   
180:   const numWidth = 22;
181:   const quarterWidth = (colWidth - numWidth - 4) / 4;
182:   const halfWidth = (colWidth - numWidth - 4) / 2;
183:   const keys = ['A', 'B', 'C', 'D'];
184:   
185:   for (let i = 0; i < 4; i++) {
186:     // For math options the LaTeX SOURCE is far longer than the rendered
187:     // equation, so measuring the raw string would wrongly conclude nothing
188:     // fits and push every option onto its own line. Measure the RENDERED
189:     // width instead.
190:     const raw = `(${i + 1}) ` + (q.options[keys[i]] || '');
191:     const w = richWidth(doc, raw, 11);
192:     if (w > quarterWidth - 4) fitsQuarter = false; // 4 points padding safety
193:     if (w > halfWidth - 4) fitsHalf = false;
194:   }
195:   
196:   if (fitsQuarter) return 'VERY_COMPACT';
197:   if (fitsHalf) return 'COMPACT';
198:   return 'NORMAL';
199: }
200: 
201: const MAX_IMAGE_HEIGHT = 110; // cap so one diagram can't swallow a whole column
202: 
203: /**
204:  * Resolves a question's image to a safe, on-disk path and its scaled
205:  * render dimensions (preserving aspect ratio, capped to the column width
206:  * and MAX_IMAGE_HEIGHT). Returns null if there's no image, the file is
207:  * missing, or it can't be read as an image — a missing/broken image never
208:  * crashes PDF generation, it's just silently skipped.
209:  */
210: function resolveImage(doc, q, maxWidth) {
211:   if (!q.imageFilename) return null;
212:   const imagePath = path.join(IMAGES_DIR, q.imageFilename);
213:   if (!fs.existsSync(imagePath)) return null;
214: 
215:   try {
216:     const img = doc.openImage(imagePath);
217:     const scale = Math.min(maxWidth / img.width, MAX_IMAGE_HEIGHT / img.height, 1);
218:     return {
219:       path: imagePath,
220:       width: img.width * scale,
221:       height: img.height * scale,
222:     };
223:   } catch (err) {
224:     return null; // corrupt/unsupported file — skip rather than fail the whole paper
225:   }
226: }
227: 
228: function drawHeader(doc, paper, pageWidth, questionCount) {
229:   const hasContact = Boolean(paper.institutePhone || paper.instituteAddress);
230: 
231:   // Logo, top-left corner — never shifts the centered text, matches how
232:   // most institute letterheads place a badge/crest.
233:   if (paper.instituteLogoFilename) {
234:     const logoPath = path.join(IMAGES_DIR, paper.instituteLogoFilename);
235:     if (fs.existsSync(logoPath)) {
236:       try {
237:         const img = doc.openImage(logoPath);
238:         const maxDim = 42;
239:         const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
240:         doc.image(logoPath, 36, 14, { width: img.width * scale, height: img.height * scale });
241:       } catch (err) {
242:         // corrupt/unsupported logo file — skip silently, never break the paper
243:       }
244:     }
245:   }
246: 
247:   doc.fill('#000000')
248:     .font(FONT_BOLD).fontSize(18)
249:     .text(paper.instituteName || 'Question Paper', 36, 18, { width: pageWidth - 72, align: 'center' });
250: 
251:   let y = 44;
252: 
253:   if (hasContact) {
254:     const parts = [];
255:     if (paper.institutePhone) parts.push(`Ph: ${paper.institutePhone}`);
256:     if (paper.instituteAddress) parts.push(paper.instituteAddress);
257:     doc.fill('#000000').font(FONT_REGULAR).fontSize(8.5)
258:       .text(parts.join('   ·   '), 36, y, { width: pageWidth - 72, align: 'center' });
259:     y += 14;
260:   }
261: 
262:   doc.fill(GOLD)
263:     .font(FONT_BOLD).fontSize(11)
264:     .text(`${paper.examName} — ${TEST_TYPE_LABELS[paper.paperType] || paper.paperType}`, 36, y, { width: pageWidth - 72, align: 'center' });
265:   y += 18;
266: 
267:   doc.fill('#000000')
268:     .font(FONT_REGULAR).fontSize(10)
269:     .text(`${paper.title} — ${questionCount} Questions`, 36, y, { width: pageWidth - 72, align: 'center' });
270:   y += 18;
271: 
272:   doc.fill('#000000').fontSize(8)
273:     .text(new Date(paper.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
274:       36, y, { width: pageWidth - 72, align: 'center' });
275:   y += 13;
276: 
277:   return y; // bottom edge of the header block, for the instructions box to start below
278: }
279: 
280: function drawInstructions(doc, questionCount, pageWidth, topY) {
281:   doc.roundedRect(36, topY, pageWidth - 72, 50, 6).stroke(LINE);
282:   doc.fill(INK).font(FONT_BOLD).fontSize(9.5).text('Instructions', 48, topY + 8);
283:   doc.fill(SOFT).font(FONT_REGULAR).fontSize(8.5)
284:     .text(
285:       `1. This paper contains ${questionCount} questions, all compulsory.   ` +
286:       `2. Each question has four options (1-4) with exactly one correct answer.   ` +
287:       `3. Mark your answers clearly.`,
288:       48, topY + 21, { width: pageWidth - 96, lineGap: 1.5 }
289:     );
290:   return topY + 50 + 14;
291: }
292: 
293: function drawStudentDetails(doc, pageWidth, topY) {
294:   doc.fill('#000000').font(FONT_BOLD).fontSize(11);
295:   doc.text('Student Name: _________________________________________      Roll No: ______________________', 36, topY);
296:   return topY + 30; // gives sufficient gap below
297: }
298: 
299: /**
300:  * Measures the vertical height a question will occupy in a column of the
301:  * given width, WITHOUT drawing anything (pdfkit lets you probe text height).
302:  */
303: // ---------------------------------------------------------------------------
304: // Rich (text + LaTeX math) measuring and drawing.
305: //
306: // Questions written with $...$ contain real equations that must be
307: // typeset as images, which plain doc.text() cannot do. These two helpers
308: // route such content through the math layout engine, and fall back to the
309: // ORIGINAL plain-text code path (byte for byte) whenever no math is
310: // present — so every existing question bank keeps rendering exactly as it
311: // did before, and only questions that actually use $...$ take the new path.
312: // ---------------------------------------------------------------------------
313: function richMeasure(doc, text, width, fontSize) {
314:   const value = text == null ? '' : String(text);
315:   if (!containsMath(value)) {
316:     doc.font(FONT_REGULAR).fontSize(fontSize);
317:     return doc.heightOfString(formatChemicalFormulas(value), { width, lineGap: 0 });
318:   }
319:   const { totalHeight } = layoutRichText(doc, value, {
320:     width,
321:     fontSize,
322:     font: FONT_REGULAR,
323:     lineGap: 1,
324:     textTransform: formatChemicalFormulas,
325:   });
326:   return totalHeight;
327: }
328: 
329: function richWidth(doc, text, fontSize) {
330:   const value = text == null ? '' : String(text);
331:   if (!containsMath(value)) {
332:     doc.font(FONT_REGULAR).fontSize(fontSize);
333:     return doc.widthOfString(formatChemicalFormulas(value));
334:   }
335:   // Lay out with effectively unlimited width so everything lands on one
336:   // line, then read that line's true rendered width.
337:   const { lines } = layoutRichText(doc, value, {
338:     width: 100000,
339:     fontSize,
340:     font: FONT_REGULAR,
341:     lineGap: 1,
342:     textTransform: formatChemicalFormulas,
343:   });
344:   return lines.length ? lines[0].width : 0;
345: }
346: 
347: function richDraw(doc, text, x, y, width, fontSize, color) {
348:   const value = text == null ? '' : String(text);
349:   if (!containsMath(value)) {
350:     doc.font(FONT_REGULAR).fontSize(fontSize).fill(color)
351:       .text(formatChemicalFormulas(value), x, y, { width, lineGap: 0 });
352:     return doc.y;
353:   }
354:   const { lines } = layoutRichText(doc, value, {
355:     width,
356:     fontSize,
357:     font: FONT_REGULAR,
358:     lineGap: 1,
359:     textTransform: formatChemicalFormulas,
360:   });
361:   return drawRichText(doc, lines, x, y, { fontSize, font: FONT_REGULAR, lineGap: 1, color });
362: }
363: 
364: function measureQuestionHeight(doc, q, index, colWidth) {
365:   const numWidth = 22;
366:   doc.font(FONT_REGULAR).fontSize(11);
367: 
368:   const leadingFraction = detectLeadingFraction(q.questionText);
369:   let textHeight;
370:   if (leadingFraction) {
371:     const glyph = measureFractionGlyph(doc, leadingFraction.numerator, leadingFraction.denominator, 11);
372:     const remainderWidth = colWidth - numWidth - glyph.width - FRACTION_GAP_AFTER;
373:     const remainderHeight = doc.heightOfString(formatChemicalFormulas(leadingFraction.remainder), { width: Math.max(remainderWidth, 40), lineGap: 0 });
374:     textHeight = Math.max(glyph.height, remainderHeight);
375:   } else {
376:     textHeight = richMeasure(doc, q.questionText, colWidth - numWidth, 11);
377:   }
378: 
379:   const image = resolveImage(doc, q, colWidth - 16);
380:   const imageHeight = image ? image.height + 4 : 0;
381: 
382:   const layoutType = getOptionsLayoutType(doc, q, colWidth);
383:   let optionsHeight;
384:   if (layoutType === 'VERY_COMPACT') {
385:     // Math options render taller than a plain text line, so measure them
386:     // rather than assuming a fixed 14pt row.
387:     const qw = (colWidth - numWidth - 4) / 4;
388:     optionsHeight = Math.max(14, ...['A','B','C','D'].map((k) => richMeasure(doc, q.options[k], qw, 11)));
389:   } else if (layoutType === 'COMPACT') {
390:     const hw = (colWidth - numWidth - 4) / 2;
391:     const rowAB = Math.max(...['A','B'].map((k) => richMeasure(doc, q.options[k], hw, 11)));
392:     const rowCD = Math.max(...['C','D'].map((k) => richMeasure(doc, q.options[k], hw, 11)));
393:     optionsHeight = Math.max(14, rowAB) + Math.max(14, rowCD);
394:   } else {
395:     doc.font(FONT_REGULAR).fontSize(11);
396:     optionsHeight = ['A', 'B', 'C', 'D'].reduce((sum, k) => {
397:       const numeral = { A: '1', B: '2', C: '3', D: '4' }[k];
398:       const h = richMeasure(doc, `(${numeral}) ${q.options[k]}`, colWidth - numWidth - 4, 11);
399:       return sum + h + 1;
400:     }, 0);
401:   }
402: 
403:   return textHeight + imageHeight + optionsHeight + 6; // spacing after the question
404: }
405: 
406: function drawQuestion(doc, q, index, x, y, colWidth) {
407:   const numWidth = 22;
408:   doc.font(FONT_BOLD).fontSize(11);
409:   const prefix = `${index}. `;
410: 
411:   doc.fill(INK).text(prefix, x, y, { width: numWidth, lineBreak: false });
412: 
413:   const leadingFraction = detectLeadingFraction(q.questionText);
414:   let textBottomY;
415:   if (leadingFraction) {
416:     doc.font(FONT_REGULAR).fontSize(11);
417:     const glyphWidth = drawFractionGlyph(doc, leadingFraction.numerator, leadingFraction.denominator, x + numWidth, y, 11, INK);
418:     const remainderX = x + numWidth + glyphWidth + FRACTION_GAP_AFTER;
419:     const remainderWidth = colWidth - numWidth - glyphWidth - FRACTION_GAP_AFTER;
420:     doc.font(FONT_REGULAR).fontSize(11).fill(INK)
421:       .text(formatChemicalFormulas(leadingFraction.remainder), remainderX, y, { width: Math.max(remainderWidth, 40), lineGap: 0, align: 'justify' });
422:     const glyphBottom = y + 11 * 1.9;
423:     textBottomY = Math.max(doc.y, glyphBottom);
424:   } else {
425:     textBottomY = richDraw(doc, q.questionText, x + numWidth, y, colWidth - numWidth, 11, INK);
426:   }
427: 
428:   let cursorY = textBottomY + 1;
429: 
430:   const image = resolveImage(doc, q, colWidth - 16);
431:   if (image) {
432:     doc.image(image.path, x + 8, cursorY, { width: image.width, height: image.height });
433:     cursorY += image.height + 4;
434:   }
435: 
436:   const numeralFor = { A: '1', B: '2', C: '3', D: '4' };
437:   const layoutType = getOptionsLayoutType(doc, q, colWidth);
438: 
439:   if (layoutType === 'VERY_COMPACT') {
440:     const quarterWidth = (colWidth - numWidth - 4) / 4;
441:     let vcBottom = cursorY;
442:     ['A','B','C','D'].forEach((k, j) => {
443:       const b = richDraw(doc, `(${j + 1}) ${q.options[k]}`, x + numWidth + quarterWidth * j, cursorY, quarterWidth, 11, SOFT);
444:       vcBottom = Math.max(vcBottom, b);
445:     });
446:     cursorY = Math.max(cursorY + 14, vcBottom);
447:   } else if (layoutType === 'COMPACT') {
448:     const halfWidth = (colWidth - numWidth - 4) / 2;
449:     const bA = richDraw(doc, `(1) ${q.options.A}`, x + numWidth, cursorY, halfWidth, 11, SOFT);
450:     const bB = richDraw(doc, `(2) ${q.options.B}`, x + numWidth + halfWidth, cursorY, halfWidth, 11, SOFT);
451:     cursorY = Math.max(cursorY + 14, bA, bB);
452:     const bC = richDraw(doc, `(3) ${q.options.C}`, x + numWidth, cursorY, halfWidth, 11, SOFT);
453:     const bD = richDraw(doc, `(4) ${q.options.D}`, x + numWidth + halfWidth, cursorY, halfWidth, 11, SOFT);
454:     cursorY = Math.max(cursorY + 14, bC, bD);
455:   } else {
456:     for (const key of ['A', 'B', 'C', 'D']) {
457:       cursorY = richDraw(doc, `(${numeralFor[key]}) ${q.options[key]}`, x + numWidth, cursorY, colWidth - numWidth - 4, 11, SOFT) + 1;
458:     }
459:   }
460: 
461:   return cursorY + 6; // bottom y after this question, with spacing before the next
462: }
463: 
464: /**
465:  * Lays out all questions in a two-column flow across as many pages as
466:  * needed. Fills the left column top-to-bottom, then the right column,
467:  * then wraps to a fresh page (both columns reset) — the standard printed
468:  * exam-paper reading order.
469:  */
470: function layoutQuestionsTwoColumn(doc, questions, pageWidth, pageHeight, firstColumnStartY) {
471:   const margin = 36;
472:   const gutter = 36; // 0.5 inch gap between columns
473:   const colWidth = (pageWidth - margin * 2 - gutter) / 2;
474:   const bottomLimit = pageHeight - 36;
475:   const subsequentPageStartY = 54; // Starts questions below running header line (at 42)
476: 
477:   const startPageIndex = doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1;
478: 
479:   let colX = [margin, margin + colWidth + gutter];
480:   let colY = [firstColumnStartY, firstColumnStartY];
481:   let col = 0;
482: 
483:   questions.forEach((q, i) => {
484:     const index = i + 1;
485:     const estimatedHeight = measureQuestionHeight(doc, q, index, colWidth);
486: 
487:     if (colY[col] + estimatedHeight > bottomLimit) {
488:       if (col === 0) {
489:         // Left column full. Switch to right.
490:         col = 1;
491:         if (colY[1] + estimatedHeight > bottomLimit) {
492:           // It doesn't even fit in an empty right column? Add page.
493:           doc.addPage();
494:           colY = [subsequentPageStartY, subsequentPageStartY];
495:           col = 0;
496:         }
497:       } else {
498:         // Right column full. Add page.
499:         doc.addPage();
500:         colY = [subsequentPageStartY, subsequentPageStartY];
501:         col = 0;
502:       }
503:     }
504: 
505:     const bottomY = drawQuestion(doc, q, index, colX[col], colY[col], colWidth);
506:     colY[col] = bottomY;
507:   });
508: 
509:   // Draw vertical column divider line on each page containing questions
510:   const endPageIndex = doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1;
511:   for (let i = startPageIndex; i <= endPageIndex; i++) {
512:     doc.switchToPage(i);
513:     const startY = (i === startPageIndex) ? firstColumnStartY - 6 : subsequentPageStartY - 6;
514:     const endY = bottomLimit - 14;
515:     doc.strokeColor('#000000').lineWidth(0.5);
516:     doc.moveTo(pageWidth / 2, startY)
517:        .lineTo(pageWidth / 2, endY)
518:        .stroke();
519:   }
520:   
521:   // Restore document focus to the last page so answer key starts at the correct page
522:   doc.switchToPage(endPageIndex);
523: }
524: 
525: function drawAnswerKey(doc, questions, pageWidth) {
526:   doc.addPage();
527:   doc.y = 54;
528:   doc.fill(NAVY).font(FONT_BOLD).fontSize(15)
529:     .text('Answer Key', 36, doc.y, { width: pageWidth - 72, align: 'center' });
530:   doc.moveDown(1);
531: 
532:   const numeralFor = { A: '1', B: '2', C: '3', D: '4' };
533:   const cols = 5;
534:   const colWidth = (pageWidth - 72) / cols;
535:   const rowHeight = 20;
536:   let x = 36;
537:   let y = doc.y;
538: 
539:   questions.forEach((q, i) => {
540:     if (y + rowHeight > doc.page.height - 60) {
541:       doc.addPage();
542:       y = 54;
543:     }
544:     doc.fill(INK).font(FONT_REGULAR).fontSize(11).text(`${i + 1}.`, x, y, { width: 30 });
545:     doc.fill(GOLD).font(FONT_BOLD).text(numeralFor[q.correctOption], x + 30, y);
546:     x += colWidth;
547:     if ((i + 1) % cols === 0) {
548:       x = 36;
549:       y += rowHeight;
550:     }
551:   });
552: }
553: 
554: function drawSolutions(doc, questions, pageWidth) {
555:   const contentWidth = pageWidth - 72;
556:   doc.addPage();
557:   doc.y = 54;
558:   doc.fill(NAVY).font(FONT_BOLD).fontSize(15)
559:     .text('Solutions', 36, doc.y, { width: contentWidth, align: 'center' });
560:   doc.moveDown(1);
561: 
562:   const numeralFor = { A: '1', B: '2', C: '3', D: '4' };
563:   const bottomLimit = doc.page.height - 60;
564: 
565:   questions.forEach((q, i) => {
566:     const hasSolution = q.solutionText && String(q.solutionText).trim();
567: 
568:     // Measure the whole block first so a solution never gets split awkwardly
569:     // right at a page break — if it won't fit, start it on a fresh page.
570:     doc.font(FONT_BOLD).fontSize(11);
571:     const numberWidth = 26;
572:     const headingHeight = 16;
573:     const bodyText = hasSolution ? String(q.solutionText).trim() : 'Solution not provided for this question.';
574:     const bodyHeight = richMeasure(doc, bodyText, contentWidth - numberWidth, 10.5);
575:     const answerLineHeight = 14;
576:     const blockHeight = headingHeight + answerLineHeight + bodyHeight + 12;
577: 
578:     if (doc.y + blockHeight > bottomLimit) {
579:       doc.addPage();
580:       doc.y = 54;
581:     }
582: 
583:     const top = doc.y;
584:     doc.fill(INK).font(FONT_BOLD).fontSize(11).text(`${i + 1}.`, 36, top, { width: numberWidth, lineBreak: false });
585: 
586:     // Correct answer line (free — part of the answer key, shown here for context)
587:     doc.fill(GOLD).font(FONT_BOLD).fontSize(10.5)
588:       .text(`Correct answer: (${numeralFor[q.correctOption] || '?'})`, 36 + numberWidth, top, { width: contentWidth - numberWidth });
589: 
590:     // Worked solution body, rendered math-aware so LaTeX ($...$) typesets.
591:     const bodyY = doc.y + 2;
592:     const endY = richDraw(doc, bodyText, 36 + numberWidth, bodyY, contentWidth - numberWidth, 10.5, hasSolution ? INK : SOFT);
593: 
594:     doc.y = endY + 10;
595:   });
596: }
597: 
598: function drawHeadersAndFooters(doc, paper) {
599:   const range = doc.bufferedPageRange();
600:   const totalPages = range.count;
601:   const savedBottomMargin = doc.page.margins.bottom;
602:   const savedTopMargin = doc.page.margins.top;
603: 
604:   for (let i = range.start; i < range.start + totalPages; i++) {
605:     doc.switchToPage(i);
606:     
607:     // 1. Footer
608:     doc.page.margins.bottom = 0; // writing inside the margin area — prevent pdfkit auto-adding a page
609:     doc.fill(SOFT).font(FONT_REGULAR).fontSize(8)
610:       .text(
611:         `${paper.instituteName || ''}   ·   Page ${i + 1} of ${totalPages}`,
612:         36, doc.page.height - 36,
613:         { width: doc.page.width - 72, align: 'center', lineBreak: false }
614:       );
615:     doc.page.margins.bottom = savedBottomMargin;
616: 
617:     // 2. Running Header (Page 2 onwards)
618:     if (i > range.start) {
619:       doc.page.margins.top = 0;
620:       doc.fill('#000000').font(FONT_BOLD).fontSize(8.5);
621:       
622:       const examLabel = `${paper.examName || ''} — ${TEST_TYPE_LABELS[paper.paperType] || paper.paperType || ''}`;
623:       // Left text: Exam Name
624:       doc.text(examLabel, 36, 30, { width: doc.page.width / 2 - 36, align: 'left', lineBreak: false });
625:       // Right text: Institute Name
626:       doc.text(paper.instituteName || '', doc.page.width / 2, 30, { width: doc.page.width / 2 - 36, align: 'right', lineBreak: false });
627:       
628:       // Horizontal Line
629:       doc.strokeColor('#000000').lineWidth(0.5)
630:          .moveTo(36, 42)
631:          .lineTo(doc.page.width - 36, 42)
632:          .stroke();
633:          
634:       doc.page.margins.top = savedTopMargin;
635:     }
636:   }
637: }
638: 
639: /**
640:  * Writes the paper PDF into the given writable stream.
641:  * @param paper  { title, instituteName, examName, paperType, createdAt }
642:  * @param questions  ordered [{ questionText, options: {A,B,C,D}, correctOption }]
643:  * @param withAnswers  include the answer-key page
644:  */
645: function buildPaperPdf(stream, paper, questions, withAnswers) {
646:   const doc = new PDFDocument({ size: 'A4', margin: 36, bufferPages: true });
647:   ensureFontsRegistered(doc);
648:   doc.pipe(stream);
649: 
650:   const pageWidth = doc.page.width;
651:   const pageHeight = doc.page.height;
652: 
653:   const headerBottomY = drawHeader(doc, paper, pageWidth, questions.length);
654:   const instructionsBottomY = drawInstructions(doc, questions.length, pageWidth, headerBottomY + 4);
655:   const columnsStartY = drawStudentDetails(doc, pageWidth, instructionsBottomY);
656: 
657:   layoutQuestionsTwoColumn(doc, questions, pageWidth, pageHeight, columnsStartY);
658: 
659:   if (withAnswers) drawAnswerKey(doc, questions, pageWidth);
660: 
661:   // Solutions section, only when this paper was generated with solutions
662:   // included (charged 1 credit each at finalize). The answer key above is
663:   // always free; this is the paid add-on.
664:   if (paper.includeSolutions) drawSolutions(doc, questions, pageWidth);
665: 
666:   drawHeadersAndFooters(doc, paper);
667:   doc.end();
668: }
669: 
670: module.exports = { buildPaperPdf };
671: 
672: 
The above content shows the entire, complete file contents of the requested file.
