const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/ExamHub.jsx", "utf8");

content = content.replace(
  "const isAdmin = req?.user?.role === 'ADMIN' || true; // We'll just show it. Wait, ExamHub.jsx uses useAuth()\n",
  ""
);

if (!content.includes("useAuth")) {
  content = content.replace("import { api } from '../lib/api';", "import { api } from '../lib/api';\nimport { useAuth } from '../context/AuthContext';");
  content = content.replace("export default function ExamHub() {", "export default function ExamHub() {\n  const { user } = useAuth();\n  const isAdmin = user?.role === 'ADMIN';");
}

fs.writeFileSync("frontend/src/pages/ExamHub.jsx", content, "utf8");
