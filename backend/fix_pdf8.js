const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  /function getOptionsLayoutType\(doc, q, colWidth\) \{/,
  "function getOptionsLayoutType(doc, q, colWidth, fontSize = 11) {"
);

content = content.replace(
  /const layoutType = getOptionsLayoutType\(doc, q, colWidth\);/g,
  "const layoutType = getOptionsLayoutType(doc, q, colWidth, fontSize);"
);

// fix drawSolutions
content = content.replace(
  /function drawSolutions\(doc, questions, pageWidth\) \{([\s\S]*?)doc\.font\(FONT_BOLD\)\.fontSize\(fontSize\);/m,
  "function drawSolutions(doc, questions, pageWidth) {$1doc.font(FONT_BOLD).fontSize(11);"
);

fs.writeFileSync(file, content, "utf8");
