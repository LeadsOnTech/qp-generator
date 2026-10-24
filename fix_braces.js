const fs = require("fs");
let content = fs.readFileSync("backend/src/lib/richTextLayout.js", "utf8");

content = content.replace(
  /        \}\r?\n      \}\r?\n    \}\r?\n\r?\n\r?\n  doc\.font\(font\)/,
  `        }
      }
    }
  }

  doc.font(font)`
);

fs.writeFileSync("backend/src/lib/richTextLayout.js", content, "utf8");
