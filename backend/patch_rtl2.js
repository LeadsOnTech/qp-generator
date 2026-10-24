const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "src", "lib", "richTextLayout.js");
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  "if (spaces.length > 0) {",
  `if (spaces.length > 0) {
          const addPerSpace = extraSpace / spaces.length;
          // Put a strict cap on how much a space can stretch. 
          // If it needs to stretch more than 5 points, the gap is too ugly and unnatural, so we skip justification for this line.
          if (addPerSpace > 5) return;`
);

content = content.replace(
  "const addPerSpace = extraSpace / spaces.length;\n          // Put a strict cap",
  "// Put a strict cap"
);

fs.writeFileSync(file, content, "utf8");
