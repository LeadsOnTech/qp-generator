const fs = require("fs");
let content = fs.readFileSync("frontend/src/lib/api.js", "utf8");
if (!content.includes("deleteExam:")) {
  content = content.replace("listExams: () => request('/exams'),", "listExams: () => request('/exams'),\n  deleteExam: (id) => request(`/exams/${id}`, { method: 'DELETE' }),");
}
fs.writeFileSync("frontend/src/lib/api.js", content, "utf8");
