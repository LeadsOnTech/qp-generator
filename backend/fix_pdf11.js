const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  /function richMeasure\(doc, text, width, fontSize\) \{/g,
  "function richMeasure(doc, text, width, fontSize, align = 'justify') {"
);
content = content.replace(
  /function richWidth\(doc, text, fontSize\) \{/g,
  "function richWidth(doc, text, fontSize, align = 'left') {"
);
content = content.replace(
  /function richDraw\(doc, text, x, y, width, fontSize, color\) \{/g,
  "function richDraw(doc, text, x, y, width, fontSize, color, align = 'justify') {"
);

// update doc.text inside them
content = content.replace(
  /\.text\(formatChemicalFormulas\(value\), \{ width, lineGap: 0 \}\);/g,
  ".text(formatChemicalFormulas(value), { width, lineGap: 0, align });"
);
content = content.replace(
  /\.text\(formatChemicalFormulas\(value\), x, y, \{ width, lineGap: 0 \}\);/g,
  ".text(formatChemicalFormulas(value), x, y, { width, lineGap: 0, align });"
);

// layoutRichText calls
content = content.replace(
  /font: FONT_REGULAR,\n\s*lineGap: 1,\n\s*textTransform: formatChemicalFormulas,/g,
  "font: FONT_REGULAR,\n      lineGap: 1,\n      align,\n      textTransform: formatChemicalFormulas,"
);

// drawQuestion calls
content = content.replace(
  /lineGap: 0, align: 'justify'/g,
  "lineGap: 0, align: 'justify'"
);

fs.writeFileSync(file, content, "utf8");
