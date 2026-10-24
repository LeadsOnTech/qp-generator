const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "mathRenderer.js");
let content = fs.readFileSync(file, "utf8");
content = content.substring(0, content.indexOf("module.exports = { renderMath, parseSegments, containsMath };") + "module.exports = { renderMath, parseSegments, containsMath };\n".length);
fs.writeFileSync(file, content, "utf8");
