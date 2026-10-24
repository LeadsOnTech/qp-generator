const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/LandingPage.jsx", "utf8");
content = content.replace('<span className="stars">?????</span>', '<span className="stars">★★★★★</span>');
// Just in case it has literal question marks
content = content.replace('<span className="stars"></span>', '<span className="stars">★★★★★</span>');
fs.writeFileSync("frontend/src/pages/LandingPage.jsx", content, "utf8");
