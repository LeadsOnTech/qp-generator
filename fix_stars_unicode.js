const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/LandingPage.jsx", "utf8");
content = content.replace(/<span className="stars">.*?<\/span>/, '<span className="stars">{"\\u2605\\u2605\\u2605\\u2605\\u2605"}</span>');
fs.writeFileSync("frontend/src/pages/LandingPage.jsx", content, "utf8");
