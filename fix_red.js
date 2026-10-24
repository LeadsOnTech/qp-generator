const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/PapersList.jsx", "utf8");
content = content.replace("color: 'var(--red-600)'", "color: '#DC2626'");
fs.writeFileSync("frontend/src/pages/PapersList.jsx", content, "utf8");
