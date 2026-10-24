const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

content = content.replace("}) ${q.options[key]}`, x + numWidth, cursorY, colWidth - numWidth - 4, 11, SOFT) + 1;\n      }", "}");

fs.writeFileSync(file, content, "utf8");
