const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/LandingPage.jsx", "utf8");
content = content.replace(/â€”/g, "—");
content = content.replace(/â€“/g, "–");
content = content.replace(/â€™/g, "'");
content = content.replace(/â€œ/g, '"');
content = content.replace(/â€/g, '"');
fs.writeFileSync("frontend/src/pages/LandingPage.jsx", content, "utf8");
