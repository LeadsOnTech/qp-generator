const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  /\{ fontSize, font: FONT_REGULAR, lineGap: 1, color \}\);/g,
  "{ fontSize, font: FONT_REGULAR, lineGap: 1, color, align });"
);

fs.writeFileSync(file, content, "utf8");
