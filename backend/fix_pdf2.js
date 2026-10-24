const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

// We can't just globally replace 11. We need to be careful.
// Let's replace specific known lines.

const replacements = [
  ["doc.font(FONT_REGULAR).fontSize(11);", "doc.font(FONT_REGULAR).fontSize(fontSize);"],
  ["doc.font(FONT_BOLD).fontSize(11);", "doc.font(FONT_BOLD).fontSize(fontSize);"],
  ["measureFractionGlyph(doc, leadingFraction.numerator, leadingFraction.denominator, 11);", "measureFractionGlyph(doc, leadingFraction.numerator, leadingFraction.denominator, fontSize);"],
  ["richMeasure(doc, formattedText, colWidth - numWidth, 11);", "richMeasure(doc, formattedText, colWidth - numWidth, fontSize);"],
  ["richMeasure(doc, q.options[k], qw, 11)", "richMeasure(doc, q.options[k], qw, fontSize)"],
  ["richMeasure(doc, q.options[k], hw, 11)", "richMeasure(doc, q.options[k], hw, fontSize)"],
  ["richMeasure(doc, `${label} ${q.options[k]}`, colWidth - numWidth - 4, 11)", "richMeasure(doc, `${label} ${q.options[k]}`, colWidth - numWidth - 4, fontSize)"],
  ["return textHeight + imageHeight + optionsHeight + 6;", "return textHeight + imageHeight + optionsHeight + questionGap;"],
  
  ["drawFractionGlyph(doc, leadingFraction.numerator, leadingFraction.denominator, x + numWidth, y, 11, INK);", "drawFractionGlyph(doc, leadingFraction.numerator, leadingFraction.denominator, x + numWidth, y, fontSize, INK);"],
  ["doc.font(FONT_REGULAR).fontSize(11).fill(INK)", "doc.font(FONT_REGULAR).fontSize(fontSize).fill(INK)"],
  ["const glyphBottom = y + 11 * 1.9;", "const glyphBottom = y + fontSize * 1.9;"],
  ["richDraw(doc, formattedText, x + numWidth, y, colWidth - numWidth, 11, INK);", "richDraw(doc, formattedText, x + numWidth, y, colWidth - numWidth, fontSize, INK);"],
  ["richDraw(doc, `${label} ${q.options[k]}`, x + numWidth + quarterWidth * j, cursorY, quarterWidth, 11, SOFT);", "richDraw(doc, `${label} ${q.options[k]}`, x + numWidth + quarterWidth * j, cursorY, quarterWidth, fontSize, SOFT);"],
  ["richDraw(doc, `${labelA} ${q.options.A}`, x + numWidth, cursorY, halfWidth, 11, SOFT);", "richDraw(doc, `${labelA} ${q.options.A}`, x + numWidth, cursorY, halfWidth, fontSize, SOFT);"],
  ["richDraw(doc, `${labelB} ${q.options.B}`, x + numWidth + halfWidth, cursorY, halfWidth, 11, SOFT);", "richDraw(doc, `${labelB} ${q.options.B}`, x + numWidth + halfWidth, cursorY, halfWidth, fontSize, SOFT);"],
  ["richDraw(doc, `${labelC} ${q.options.C}`, x + numWidth, cursorY, halfWidth, 11, SOFT);", "richDraw(doc, `${labelC} ${q.options.C}`, x + numWidth, cursorY, halfWidth, fontSize, SOFT);"],
  ["richDraw(doc, `${labelD} ${q.options.D}`, x + numWidth + halfWidth, cursorY, halfWidth, 11, SOFT);", "richDraw(doc, `${labelD} ${q.options.D}`, x + numWidth + halfWidth, cursorY, halfWidth, fontSize, SOFT);"],
  ["richDraw(doc, `${label} ${q.options[key]}`, x + numWidth, cursorY, colWidth - numWidth - 4, 11, SOFT)", "richDraw(doc, `${label} ${q.options[key]}`, x + numWidth, cursorY, colWidth - numWidth - 4, fontSize, SOFT)"],
  ["return cursorY + 6;", "return cursorY + questionGap;"],
];

for (const [find, rep] of replacements) {
  content = content.split(find).join(rep);
}

fs.writeFileSync(file, content, "utf8");
