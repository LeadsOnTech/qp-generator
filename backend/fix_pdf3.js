const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "src", "lib", "pdfBuilder.js");
let content = fs.readFileSync(file, "utf8");

const newFunc = `function layoutQuestionsTwoColumn(doc, questions, pageWidth, pageHeight, firstColumnStartY) {
  const margin = 36;
  const gutter = 36; // 0.5 inch gap between columns
  const colWidth = (pageWidth - margin * 2 - gutter) / 2;
  const bottomLimit = pageHeight - 36;
  const subsequentPageStartY = 54; // Starts questions below running header line (at 42)

  const startPageIndex = doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1;

  let colX = [margin, margin + colWidth + gutter];

  // Pre-process questions to inject section headers
  const renderItems = [];
  let currentType = null;
  let qNumber = 1;
  questions.forEach((q) => {
    const isNVQ = q.questionType === "NVQ" || q.questionType === "NUMERICAL" || q.questionType === "DECIMAL";
    const typeLabel = isNVQ ? "Numerical Value Questions" : "Multiple Choice Questions";
    if (currentType !== typeLabel) {
       currentType = typeLabel;
       renderItems.push({ isHeader: true, text: "Section: " + typeLabel });
    }
    q._renderIndex = qNumber++;
    renderItems.push(q);
  });

  function simulate(fontSize, gap) {
    let colY = [firstColumnStartY, firstColumnStartY];
    let col = 0;
    let pages = 1;
    let pageItems = [[]]; // Array of arrays of item indices

    for (let i = 0; i < renderItems.length; i++) {
      const q = renderItems[i];
      const h = measureQuestionHeight(doc, q, q._renderIndex, colWidth, fontSize, gap);
      
      if (colY[col] + h > bottomLimit) {
        if (col === 0) {
          col = 1;
          if (colY[1] + h > bottomLimit) {
            pages++;
            colY = [subsequentPageStartY, subsequentPageStartY];
            col = 0;
            pageItems.push([]);
          }
        } else {
          pages++;
          colY = [subsequentPageStartY, subsequentPageStartY];
          col = 0;
          pageItems.push([]);
        }
      }
      colY[col] += h;
      pageItems[pages - 1].push({ i, h });
    }
    
    // Calculate last page fill ratio (approx)
    const lastPageItems = pageItems[pageItems.length - 1];
    const totalLastPageH = lastPageItems.reduce((sum, item) => sum + item.h, 0);
    const capacity = 2 * (bottomLimit - (pages === 1 ? firstColumnStartY : subsequentPageStartY));
    const fillRatio = totalLastPageH / capacity;
    
    return { pages, fillRatio, pageItems, fontSize, gap };
  }

  // 1. Try default
  let best = simulate(11, 6);
  
  // 2. If it spans multiple pages and last page is very empty (< 30%), try squeezing
  if (best.pages > 1 && best.fillRatio < 0.35) {
    const targetPages = best.pages - 1;
    
    const candidates = [
      simulate(11, 4),
      simulate(10.8, 5),
      simulate(10.8, 4),
      simulate(10.5, 5),
      simulate(10.5, 3)
    ];
    
    for (const cand of candidates) {
      if (cand.pages <= targetPages) {
        best = cand;
        break; // found the gentlest squeeze that fits!
      }
    }
  }

  // Now we do the REAL layout using best.fontSize and best.gap
  let colY = [firstColumnStartY, firstColumnStartY];
  let col = 0;
  let currentPageIndex = 0; // index into best.pageItems
  let currentActiveBottomLimit = bottomLimit;

  // Function to calculate balanced bottom limit for the last page
  function updateBottomLimitForPage() {
    if (currentPageIndex === best.pageItems.length - 1) {
      // Last page! Let's balance columns.
      const items = best.pageItems[currentPageIndex];
      const totalH = items.reduce((sum, it) => sum + it.h, 0);
      const startY = currentPageIndex === 0 ? firstColumnStartY : subsequentPageStartY;
      
      // If the total height is less than one full column, we can balance it.
      // E.g., if totalH is 600, and full column is 700, balancing gives ~300 per column.
      // Add a safety margin (e.g. 1.05 multiplier + 20) to ensure the right column doesn't overflow
      // due to discrete block heights.
      const idealHalf = totalH / 2;
      const balancedLimit = startY + (idealHalf * 1.05) + 30;
      
      currentActiveBottomLimit = Math.min(bottomLimit, balancedLimit);
    } else {
      currentActiveBottomLimit = bottomLimit;
    }
  }

  updateBottomLimitForPage();

  renderItems.forEach((q, i) => {
    const index = q._renderIndex;
    const h = measureQuestionHeight(doc, q, index, colWidth, best.fontSize, best.gap);

    if (colY[col] + h > currentActiveBottomLimit) {
      if (col === 0) {
        col = 1;
        // If it STILL doesn't fit in the right column on the last page due to bad balancing estimation,
        // we MUST let it overflow the balanced limit (up to the true bottomLimit).
        if (colY[1] + h > bottomLimit) {
          doc.addPage();
          colY = [subsequentPageStartY, subsequentPageStartY];
          col = 0;
          currentPageIndex++;
          updateBottomLimitForPage();
        }
      } else {
        doc.addPage();
        colY = [subsequentPageStartY, subsequentPageStartY];
        col = 0;
        currentPageIndex++;
        updateBottomLimitForPage();
      }
    }

    const bottomY = q.isHeader ? 
      drawSectionHeader(doc, q.text, colX[col], colY[col], colWidth) : 
      drawQuestion(doc, q, index, colX[col], colY[col], colWidth, best.fontSize, best.gap);
      
    colY[col] = bottomY;
  });

  // Draw vertical column divider line on each page containing questions
  const endPageIndex = doc.bufferedPageRange().start + doc.bufferedPageRange().count - 1;
  for (let i = startPageIndex; i <= endPageIndex; i++) {
    doc.switchToPage(i);
    const startY = (i === startPageIndex) ? firstColumnStartY - 6 : subsequentPageStartY - 6;
    const endY = bottomLimit - 14;
    doc.strokeColor('#000000').lineWidth(0.5);
    doc.moveTo(pageWidth / 2, startY)
       .lineTo(pageWidth / 2, endY)
       .stroke();
  }
  
  // Restore document focus to the last page so answer key starts at the correct page
  doc.switchToPage(endPageIndex);
}`;

const startIndex = content.indexOf("function layoutQuestionsTwoColumn(");
const endIndex = content.indexOf("function layoutQuestionsSolution(", startIndex);

content = content.slice(0, startIndex) + newFunc + "\n  " + content.slice(endIndex);
fs.writeFileSync(file, content, "utf8");
