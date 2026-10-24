const { PrismaClient } = require('@prisma/client');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

async function run() {
  const prisma = new PrismaClient();
  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
  
  const paper = await prisma.paper.findFirst({
    include: {
      questions: {
        include: { question: true },
        orderBy: { order: 'asc' }
      }
    }
  });

  if (!paper) {
    console.log('No paper found');
    return;
  }

  const questions = paper.questions.map(pq => pq.question);
  const IMAGES_DIR = path.join(__dirname, '..', 'uploads', 'images');
  const MAX_IMAGE_HEIGHT = 130;
  
  function resolveImage(q, maxWidth) {
    if (!q.imageFilename) return null;
    const imagePath = path.join(IMAGES_DIR, q.imageFilename);
    if (!fs.existsSync(imagePath)) return null;
    try {
      const img = doc.openImage(imagePath);
      const scale = Math.min(maxWidth / img.width, MAX_IMAGE_HEIGHT / img.height, 1);
      return {
        path: imagePath,
        width: img.width * scale,
        height: img.height * scale,
      };
    } catch (err) {
      return null;
    }
  }

  const colWidth = (doc.page.width - 40 * 2 - 24) / 2;
  
  function measure(q, index) {
    doc.font('Helvetica-Bold').fontSize(10.5);
    const numWidth = doc.widthOfString(index + '. ');
    doc.font('Helvetica').fontSize(10.5);
    const textHeight = doc.heightOfString(q.questionText, { width: colWidth - numWidth, lineGap: 1 });
    const image = resolveImage(q, colWidth - 16);
    const imageHeight = image ? image.height + 8 : 0;
    
    let optionsHeight = 0;
    const SHORT = 22; const VSHORT = 8;
    let opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
    const isVComp = ['A','B','C','D'].every(k => (opts[k]||'').length <= VSHORT);
    const isComp = ['A','B','C','D'].every(k => (opts[k]||'').length <= SHORT);
    
    if (isVComp) optionsHeight = 15;
    else if (isComp) optionsHeight = 30;
    else {
      doc.font('Helvetica').fontSize(10);
      optionsHeight = ['A', 'B', 'C', 'D'].reduce((sum, k) => {
        return sum + doc.heightOfString('(1) ' + opts[k], { width: colWidth - 14, lineGap: 0.5 });
      }, 0);
    }
    
    return { textHeight, imageHeight, optionsHeight, total: textHeight + imageHeight + optionsHeight + 10 };
  }

  for (let i = 0; i < questions.length; i++) {
    console.log('Q' + (i+1) + ': ', measure(questions[i], i+1));
  }
}
run();
