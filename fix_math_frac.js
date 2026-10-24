const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

content = content.replace(
  /\[0-9a-zA-Z\\\\pi\\theta\]\+/g,
  "[0-9a-zA-Z\\\\pi\\\\theta^_{}]+"
);

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");
