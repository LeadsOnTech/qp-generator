const fs = require("fs");
const path = require("path");

const auditorPath = path.join(__dirname, "src", "lib", "autoQCAuditor.js");
let content = fs.readFileSync(auditorPath, "utf8");
content = content.replace(
  /if \(data\.candidates && data\.candidates\[0\]\.content\.parts\[0\]\.text\) \{/,
  `if (data.error) throw new Error(data.error.message);
        if (data.candidates && data.candidates[0].content.parts[0].text) {`
);
fs.writeFileSync(auditorPath, content, "utf8");

const scriptPath = path.join(__dirname, "ai_qc_bot.js");
if (fs.existsSync(scriptPath)) {
  let scriptContent = fs.readFileSync(scriptPath, "utf8");
  scriptContent = scriptContent.replace(
    /if \(data\.candidates && data\.candidates\[0\]\.content\.parts\[0\]\.text\) \{/,
    `if (data.error) throw new Error(data.error.message);
        if (data.candidates && data.candidates[0].content.parts[0].text) {`
  );
  fs.writeFileSync(scriptPath, scriptContent, "utf8");
}
