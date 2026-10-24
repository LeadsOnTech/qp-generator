const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/LandingPage.jsx", "utf8");

// Fix stars
content = content.replace(/<span className="stars">.*?<\/span>/, '<span className="stars">★★★★★</span>');

// Replace pravatar with indian randomuser photos
content = content.replace(/https:\/\/i\.pravatar\.cc\/100\?img=11/g, 'https://randomuser.me/api/portraits/men/43.jpg');
content = content.replace(/https:\/\/i\.pravatar\.cc\/100\?img=12/g, 'https://randomuser.me/api/portraits/women/44.jpg');
content = content.replace(/https:\/\/i\.pravatar\.cc\/100\?img=33/g, 'https://randomuser.me/api/portraits/men/22.jpg');
content = content.replace(/https:\/\/i\.pravatar\.cc\/100\?img=44/g, 'https://randomuser.me/api/portraits/women/34.jpg');

fs.writeFileSync("frontend/src/pages/LandingPage.jsx", content, "utf8");
