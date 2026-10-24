const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/LandingPage.jsx", "utf8");

content = content.replace(
  "background: 'var(--premium-yellow)'",
  "background: 'var(--premium-blue)'"
);

content = content.replace(
  "stroke=\"var(--premium-yellow)\"",
  "stroke=\"var(--premium-blue)\""
);

fs.writeFileSync("frontend/src/pages/LandingPage.jsx", content, "utf8");
