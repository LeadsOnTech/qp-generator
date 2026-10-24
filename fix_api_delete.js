const fs = require("fs");
let content = fs.readFileSync("frontend/src/lib/api.js", "utf8");

content = content.replace(
  "finalizePaper: (id) => request(`/papers/${id}/finalize`, { method: 'POST', body: JSON.stringify({}) }),",
  "finalizePaper: (id) => request(`/papers/${id}/finalize`, { method: 'POST', body: JSON.stringify({}) }),\n  deletePaper: (id) => request(`/papers/${id}`, { method: 'DELETE' }),"
);

fs.writeFileSync("frontend/src/lib/api.js", content, "utf8");
