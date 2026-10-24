const fs = require("fs");
const code = fs.readFileSync("backend/src/lib/pdfBuilder.js", "utf8");
let lineNo = 1;
for (const line of code.split("\n")) {
  if (line.match(/\bfontSize\b/) && !line.match(/function.*fontSize/) && !line.match(/\bfontSize\s*:/) && !line.match(/\bfontSize\s*=/)) {
    console.log(lineNo + ": " + line);
  }
  lineNo++;
}
