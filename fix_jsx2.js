const fs = require("fs");
let content = fs.readFileSync("frontend/src/pages/QuestionBank.jsx", "utf8");

content = content.replace(
  "{isAdmin && (\n                          <button className=\"btn-secondary-ghost\" style={{marginRight: '8px'}} onClick={() => \nsetEditingQuestion(q)}>Edit</button>\n                          <button className=\"btn-danger-ghost\" onClick={() => removeQuestion(q.id)}>\n                            Remove\n                          </button>\n                        )}",
  "{isAdmin && (\n                          <>\n                            <button className=\"btn-secondary-ghost\" style={{marginRight: '8px'}} onClick={() => setEditingQuestion(q)}>Edit</button>\n                            <button className=\"btn-danger-ghost\" onClick={() => removeQuestion(q.id)}>\n                              Remove\n                            </button>\n                          </>\n                        )}"
);

fs.writeFileSync("frontend/src/pages/QuestionBank.jsx", content, "utf8");
