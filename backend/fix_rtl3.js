const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "src", "lib", "richTextLayout.js");
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  /\/\/\s*Put a strict cap on how much a space can stretch[\s\S]*?current\.width = width;\n\s*\}/m,
  `const addPerSpace = extraSpace / spaces.length;
            if (addPerSpace <= 6) {
              spaces.forEach(space => space.width += addPerSpace);
              current.width = width;
            }`
);

fs.writeFileSync(file, content, "utf8");
