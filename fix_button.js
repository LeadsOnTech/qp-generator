const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/QuestionBank.jsx", "utf8");

content = content.replace(
  "          />\n        </div>\n      </div>",
  "          />\n          <button className=\"btn btn-secondary\" style={{ whiteSpace: 'nowrap' }} onClick={() => setShowSearchModal(true)}>📷 Search by Screenshot</button>\n          </div>\n        </div>"
);

fs.writeFileSync("frontend/src/pages/QuestionBank.jsx", content, "utf8");
