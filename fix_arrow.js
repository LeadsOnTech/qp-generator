const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/LandingPage.jsx", "utf8");
content = content.replace(/Â»/g, "»");
fs.writeFileSync("frontend/src/pages/LandingPage.jsx", content, "utf8");
