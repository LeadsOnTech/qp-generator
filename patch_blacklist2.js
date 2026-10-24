const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

content = content.replace(
  "const blacklist = new Set([\n  'for',",
  "const blacklist = new Set([\n  'for', 'in',"
);

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");
