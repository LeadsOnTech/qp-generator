const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/PricingPage.jsx", "utf8");

const oldCtaText = `<p style={{ fontSize: 20, color: 'rgba(255,255,255,0.8)', maxWidth: 600, margin: '0 auto 40px' }}>
          Create your account and get 200 free credits to experience QuestionForge today.
        </p>`;

const newCtaText = `<p style={{ fontSize: 20, color: 'rgba(255,255,255,0.8)', maxWidth: 600, margin: '0 auto 40px' }}>
          Create your account and get <span style={{ color: '#FDE047', fontWeight: 800 }}>200 free credits</span> to experience QuestionForge today.
        </p>`;

content = content.replace(oldCtaText, newCtaText);

fs.writeFileSync("frontend/src/pages/PricingPage.jsx", content, "utf8");
