const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/PricingPage.jsx", "utf8");

content = content.replace(
  "fontSize: 56, fontWeight: 800, marginBottom: 24, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1.1",
  "fontSize: 56, fontWeight: 800, marginBottom: 24, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1.1, color: '#ffffff'"
);

fs.writeFileSync("frontend/src/pages/PricingPage.jsx", content, "utf8");
