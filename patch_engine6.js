const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/paperEngine.js", "utf8");
content = content.replace(
  "const pool = [];",
  "const pool = []; console.log('rawPool length:', rawPool.length);"
);
fs.writeFileSync("backend/src/lib/paperEngine.js", content, "utf8");
