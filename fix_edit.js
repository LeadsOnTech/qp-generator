const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/QuestionBank.jsx", "utf8");

content = content.replace(
  "<button className=\"btn-danger-ghost\" onClick={() => removeQuestion(q.id)}>",
  "<button className=\"btn-secondary-ghost\" style={{marginRight: '8px'}} onClick={() => setEditingQuestion(q)}>Edit</button>\n                          <button className=\"btn-danger-ghost\" onClick={() => removeQuestion(q.id)}>"
);

fs.writeFileSync("frontend/src/pages/QuestionBank.jsx", content, "utf8");
