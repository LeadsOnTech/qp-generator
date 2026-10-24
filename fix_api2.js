const fs = require("fs");
let content = fs.readFileSync("frontend/src/lib/api.js", "utf8");

if (!content.includes("deleteUploadBatch:")) {
  content = content.replace(
    "uploadBatches: () => request('/upload/batches'),",
    "uploadBatches: () => request('/upload/batches'),\n  deleteUploadBatch: (id) => request(`/upload/batches/${id}`, { method: 'DELETE' }),"
  );
}

fs.writeFileSync("frontend/src/lib/api.js", content, "utf8");
