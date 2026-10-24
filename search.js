const fs = require("fs");
const code = fs.readFileSync("backend/src/lib/pdfBuilder.js", "utf8");
let lineNo = 1;
for (const line of code.split("\n")) {
  if (line.includes("fontSize")) {
    console.log(lineNo + ": " + line);
  }
  lineNo++;
}
