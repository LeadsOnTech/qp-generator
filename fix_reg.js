const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/RegistrationApprovals.jsx", "utf8");
content = content.replace(
  "import { API_BASE } from '../lib/api';",
  "const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';"
);
fs.writeFileSync("frontend/src/pages/RegistrationApprovals.jsx", content, "utf8");
