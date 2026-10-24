const fs = require('fs');
const PDFParser = require('pdf2json');

const pdfParser = new PDFParser();
pdfParser.on('pdfParser_dataReady', pdfData => {
    let firstPageTexts = pdfData.Pages[0].Texts;
    let max_x = 0;
    firstPageTexts.forEach(t => {
        if (t.x > max_x) max_x = t.x;
        // console.log('text:', decodeURIComponent(t.R[0].T), 'x:', t.x, 'y:', t.y);
    });
    console.log('Max X on page 1:', max_x);
    // Print out the texts that are on the right side (x > 15)
    firstPageTexts.filter(t => t.x > 15).forEach(t => {
        console.log('RIGHT COLUMN text:', decodeURIComponent(t.R[0].T), 'x:', t.x, 'y:', t.y);
    });
});
pdfParser.loadPDF('test.pdf');
