const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/QuestionBank.jsx", "utf8");

content = content.replace(
  "if (!window.confirm('Remove this question from the bank? It will be soft-deleted (kept for audit, excluded from papers).')) return;",
  "if (!window.confirm('Are you sure you want to permanently delete this question?')) return;"
);
content = content.replace(
  "await api.deleteQuestion(id);",
  "try {\n      await api.deleteQuestion(id);\n    } catch (err) {\n      alert(err.message || 'Failed to delete question');\n      return;\n    }"
);

fs.writeFileSync("frontend/src/pages/QuestionBank.jsx", content, "utf8");
