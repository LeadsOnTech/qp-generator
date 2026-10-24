const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/pdfBuilder.js", "utf8");

content = content.replace(
  /function richMeasure\([\s\S]*?return totalHeight;\s*\}/,
  `const headingRegex = /(Statement I\\s*[:\\.]|Statement II\\s*[:\\.]|Statement 1\\s*[:\\.]|Statement 2\\s*[:\\.]|Assertion\\s*(?:\\(A\\))?\\s*[:\\.]|Reason\\s*(?:\\(R\\))?\\s*[:\\.]|Statement-1\\s*[:\\.]|Statement-2\\s*[:\\.]|Statement - 1\\s*[:\\.]|Statement - 2\\s*[:\\.])/i;

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
}`
);

fs.writeFileSync("backend/src/lib/pdfBuilder.js", content, "utf8");
