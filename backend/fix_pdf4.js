const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  /if \(colY\[col\] \+ h > currentActiveBottomLimit\) \{/,
  "if (colY[col] + h > (col === 0 ? currentActiveBottomLimit : bottomLimit)) {"
);

fs.writeFileSync(file, content, "utf8");
