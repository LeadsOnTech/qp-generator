const fs = require('fs');
const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');
const { mathjax } = require('mathjax-full/js/mathjax.js');
const { AsciiMath } = require('mathjax-full/js/input/asciimath.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { SVG } = require('mathjax-full/js/output/svg.js');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const inputJax = new AsciiMath(); // Or TeX
const outputJax = new SVG({ fontCache: 'local' });
const html = mathjax.document('', { InputJax: inputJax, OutputJax: outputJax });

const node = html.convert('lim_(x->0) (sin x)/x', { display: true });
const svgString = adaptor.innerHTML(node);

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test.pdf'));
doc.text('Here is a math equation:');
SVGtoPDF(doc, `<svg>${svgString}</svg>`, 100, 100);
doc.end();
console.log('PDF generated.');
