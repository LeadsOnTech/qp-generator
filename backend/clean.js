const fs = require("fs");
let content = fs.readFileSync("pdfBuilder_recovered_full.js", "utf8");
const lines = content.split("\n");
const cleaned = [];
for (let line of lines) {
  const match = line.match(/^\s*\d+:\s?(.*)/);
  if (match) {
    cleaned.push(match[1]);
  } else if (!line.includes("The above content shows the entire")) {
    cleaned.push(line);
  }
}
fs.writeFileSync("src/lib/pdfBuilder.js", cleaned.join("\n"));
