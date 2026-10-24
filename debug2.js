const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/LandingPage.jsx", "utf8");
let index = content.indexOf('cta-avatars');
console.log(content.substring(index, index + 500));
