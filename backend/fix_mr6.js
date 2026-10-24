const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "mathRenderer.js");
let content = fs.readFileSync(file, "utf8");
content = content.replace(
  /\/^\[\\\\s=><\+\\\\-\*\/:,×xX\]\+\$\//,
  '/^[\\\\s=><+\\\\-*/:,×xyzXYZtT]+$/'
);
fs.writeFileSync(file, content, "utf8");
