const fs = require("fs");
const path = require("path");

const uploadJsPath = path.join(__dirname, "src", "routes", "upload.js");
let content = fs.readFileSync(uploadJsPath, "utf8");

if (!content.includes("runAIBackgroundAudit")) {
  content = `const { runAIBackgroundAudit } = require('../lib/autoQCAuditor');\n` + content;
  
  const target = `  res.json({
    batchId: batch.id,`;
    
  const replacer = `  // TRIGGER AI QC IN BACKGROUND
  runAIBackgroundAudit(batch.id).catch(err => console.error("Background QC error:", err));
  
  res.json({
    batchId: batch.id,`;
    
  content = content.replace(target, replacer);
  fs.writeFileSync(uploadJsPath, content, "utf8");
}
