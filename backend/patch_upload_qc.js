const fs = require("fs");
const path = require("path");

const uploadJsPath = path.join(__dirname, "src", "routes", "upload.js");
let content = fs.readFileSync(uploadJsPath, "utf8");

if (!content.includes("runAIBackgroundAudit")) {
  // Import it at the top
  content = content.replace(
    /const extract = require\('\.\.\/lib\/extract'\);/,
    `const extract = require('../lib/extract');\nconst { runAIBackgroundAudit } = require('../lib/autoQCAuditor');`
  );

  // Trigger it right before returning success
  content = content.replace(
    /res\.json\(\{\s*message: `Successfully processed \$\{processedCount\} questions.*`,\s*uploadBatchId,\s*\}\);/,
    `// FIRE AND FORGET: Trigger the AI QC Auditor in the background
      runAIBackgroundAudit(uploadBatchId).catch(err => console.error("Background QC failed:", err));
      
      res.json({
        message: \`Successfully processed \${processedCount} questions. AI Quality Control is now running in the background!\`,
        uploadBatchId,
      });`
  );

  fs.writeFileSync(uploadJsPath, content, "utf8");
}
