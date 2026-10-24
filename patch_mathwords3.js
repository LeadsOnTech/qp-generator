const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/mathRenderer.js", "utf8");

content = content.replace(/dI,\|I,/g, "d\\\\theta|\\\\theta|d\\\\phi|\\\\phi");

fs.writeFileSync("backend/src/lib/mathRenderer.js", content, "utf8");
