const fs = require("fs");
const path = require("path");

const builderPath = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(builderPath, "utf8");

content = content.replace(
  /function richWidth\(doc, text, fontSize\) \{/g,
  "function richWidth(doc, text, fontSize, align = 'left') {"
);

fs.writeFileSync(builderPath, content, "utf8");
