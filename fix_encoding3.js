const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/TrialAccounts.jsx", "utf8");
content = content.replace("free ?\" generate", "free — generate");
content = content.replace(/â€”/g, "—");
content = content.replace(/â€“/g, "–");
fs.writeFileSync("frontend/src/pages/TrialAccounts.jsx", content, "utf8");
