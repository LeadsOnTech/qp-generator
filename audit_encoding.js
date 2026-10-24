const fs = require("fs");
const path = require("path");

const badStrings = ["â€", "â˜", "Ã", ""];

function scanDir(dir) {
  let issues = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      issues += scanDir(fullPath);
    } else if (fullPath.endsWith(".jsx") || fullPath.endsWith(".js") || fullPath.endsWith(".css")) {
      const content = fs.readFileSync(fullPath, "utf8");
      let found = false;
      for (const bad of badStrings) {
        if (content.includes(bad)) {
          console.log(`Found potential encoding issue in ${fullPath}: contains ${bad}`);
          
          // Let's auto-fix  to apostrophe or dash if we can guess, or just flag it
          let newContent = content.replace(/â€”/g, "—")
                                  .replace(/â€“/g, "–")
                                  .replace(/â€™/g, "'")
                                  .replace(/â€œ/g, '"')
                                  .replace(/â€/g, '"');
                                  
          if (content !== newContent) {
            fs.writeFileSync(fullPath, newContent, "utf8");
            console.log(` -> Auto-fixed known artifacts in ${fullPath}`);
          }
          found = true;
          issues++;
        }
      }
    }
  }
  return issues;
}

const frontendIssues = scanDir("frontend/src");
const backendIssues = scanDir("backend/src");

console.log(`Audit complete. Found ${frontendIssues + backendIssues} files with potential encoding issues.`);
