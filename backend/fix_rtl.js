const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "src", "lib", "richTextLayout.js");
let content = fs.readFileSync(file, "utf8");

content = content.replace(
  `          if (spaces.length > 0) {
            // Put a strict cap on how much a space can stretch. 
            // If it needs to stretch more than 5 points, the gap is too ugly and unnatural, so we skip justification for this line.
            if (addPerSpace > 5) return;
            const addPerSpace = extraSpace / spaces.length;
            spaces.forEach(space => space.width += addPerSpace);
            current.width = width;
          }`,
  `          if (spaces.length > 0) {
            const addPerSpace = extraSpace / spaces.length;
            if (addPerSpace <= 6) { // Strict cap: max 6 points stretch per space
              spaces.forEach(space => space.width += addPerSpace);
              current.width = width;
            }
          }`
);

fs.writeFileSync(file, content, "utf8");
