const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/pdfBuilder.js", "utf8");

const replacement = `const headingRegex = /(Statement I\\s*[:\\.]|Statement II\\s*[:\\.]|Statement 1\\s*[:\\.]|Statement 2\\s*[:\\.]|Assertion\\s*(?:\\(A\\))?\\s*[:\\.]|Reason\\s*(?:\\(R\\))?\\s*[:\\.]|Statement-1\\s*[:\\.]|Statement-2\\s*[:\\.]|Statement - 1\\s*[:\\.]|Statement - 2\\s*[:\\.])/i;

function richMeasure(doc, text, width, fontSize) {
  const value = text == null ? '' : String(text);
  if (!containsMath(value) && !headingRegex.test(value)) {
    doc.font(FONT_REGULAR).fontSize(fontSize);
    return doc.heightOfString(formatChemicalFormulas(value), { width, lineGap: 0 });
  }
  const { totalHeight } = layoutRichText(doc, value, {
    width,
    fontSize,
    font: FONT_REGULAR,
    fontBold: FONT_BOLD,
    lineGap: 1,
    textTransform: formatChemicalFormulas,
  });
  return totalHeight;
}`;

content = content.replace(
  /function richMeasure\(doc, text, width, fontSize\) \{[\s\S]*?return totalHeight;\n\}/,
  replacement
);

const drawReplacement = `function richDraw(doc, text, x, y, width, fontSize, color) {
  const value = text == null ? "" : String(text);
  if (!containsMath(value) && !headingRegex.test(value)) {
    doc.font(FONT_REGULAR).fontSize(fontSize).fill(color)
      .text(formatChemicalFormulas(value), x, y, { width, lineGap: 0 });
    return doc.y;
  }
  const { lines } = layoutRichText(doc, value, {
    width,
    fontSize,
    font: FONT_REGULAR,
    fontBold: FONT_BOLD,
    lineGap: 1,
    textTransform: formatChemicalFormulas,
  });
  return drawRichText(doc, lines, x, y, { fontSize, font: FONT_REGULAR, fontBold: FONT_BOLD, lineGap: 1, color });
}`;

content = content.replace(
  /function richDraw\(doc, text, x, y, width, fontSize, color\) \{[\s\S]*?return drawRichText[^\n]*\n\}/,
  drawReplacement
);

fs.writeFileSync("backend/src/lib/pdfBuilder.js", content, "utf8");
