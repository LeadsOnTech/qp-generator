const fs = require("fs");
const path = require("path");

const builderPath = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(builderPath, "utf8");

content = content.replace(
  /function richMeasure\(doc, text, width, fontSize\) \{/g,
  "function richMeasure(doc, text, width, fontSize, align = 'justify') {"
);

content = content.replace(
  /return doc\.heightOfString\(formatChemicalFormulas\(value\), \{ width, lineGap: 0 \}\);/g,
  "return doc.heightOfString(formatChemicalFormulas(value), { width, lineGap: 0, align });"
);

content = content.replace(
  /const \{ totalHeight \} = layoutRichText\(doc, value, \{ width, fontSize, font: FONT_REGULAR, fontBold: FONT_BOLD, lineGap: 0, textTransform: formatChemicalFormulas \}\);/g,
  "const { totalHeight } = layoutRichText(doc, value, { width, fontSize, font: FONT_REGULAR, fontBold: FONT_BOLD, lineGap: 0, textTransform: formatChemicalFormulas, align });"
);

content = content.replace(
  /function richDraw\(doc, text, x, y, width, fontSize, color\) \{/g,
  "function richDraw(doc, text, x, y, width, fontSize, color, align = 'justify') {"
);

content = content.replace(
  /\.text\(formatChemicalFormulas\(value\), x, y, \{ width, lineGap: 0 \}\);/g,
  ".text(formatChemicalFormulas(value), x, y, { width, lineGap: 0, align });"
);

content = content.replace(
  /textTransform: formatChemicalFormulas/g,
  "textTransform: formatChemicalFormulas, align"
);

fs.writeFileSync(builderPath, content, "utf8");
