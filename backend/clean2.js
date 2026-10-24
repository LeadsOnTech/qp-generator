const fs = require("fs");
let content = fs.readFileSync("src/lib/pdfBuilder.js", "utf8");
content = content.substring(content.indexOf("const PDFDocument"));
fs.writeFileSync("src/lib/pdfBuilder.js", content);
