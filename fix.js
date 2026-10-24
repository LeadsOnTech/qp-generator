const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/PricingPage.jsx", "utf8");
content = content.replace(/costs \?1/g, "costs ₹1");
content = content.replace(/is \?5,000/g, "is ₹5,000");
content = content.replace(/body: '\?1 =/g, "body: '₹1 =");
content = content.replace(/>\?</g, ">₹<");
content = content.replace(/>\?1</g, ">₹1<");
fs.writeFileSync("frontend/src/pages/PricingPage.jsx", content, "utf8");
