const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  /function measureQuestionHeight\(doc, q, index, colWidth, fontSize = 11, questionGap = 6\) \{/,
  "function measureQuestionHeight(doc, q, index, colWidth, fontSize = 11, questionGap = 6) {\n  if (q.isHeader) return 34;"
);

fs.writeFileSync(file, content, "utf8");
