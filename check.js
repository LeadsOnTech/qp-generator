const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/PricingPage.jsx", "utf8");
console.log(content.includes("{isAmountValid ? ("));
console.log(content.substring(content.indexOf("{isAmountValid ? ("), content.indexOf("{isAmountValid ? (") + 200));
