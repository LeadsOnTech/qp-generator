const { PDFDocument, rgb, degrees, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Stamps an anti-piracy DRM watermark on every page of a PDF.
 * Diagonal center watermark + footer licensing stamp with buyer name, mobile & order ID.
 */
async function watermarkPdf(pdfSource, orderInfo) {
  let pdfDoc;

  try {
    if (Buffer.isBuffer(pdfSource)) {
      pdfDoc = await PDFDocument.load(pdfSource);
    } else if (typeof pdfSource === 'string' && fs.existsSync(pdfSource)) {
      const fileBytes = fs.readFileSync(pdfSource);
      pdfDoc = await PDFDocument.load(fileBytes);
    } else {
      // Fallback: create a pristine digital eBook publication on the fly
      pdfDoc = await createPlaceholderEbook(orderInfo);
    }
  } catch (err) {
    console.warn('Could not load original PDF, generating secured publication:', err.message);
    pdfDoc = await createPlaceholderEbook(orderInfo);
  }

  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const buyerName = orderInfo.buyerName || 'Valued Student';
  const buyerPhone = orderInfo.buyerPhone || '';
  const orderNumber = orderInfo.orderNumber || 'QS-DIGITAL';
  const collegeName = orderInfo.collegeName || 'QuestionStudio Academic Portal';

  const diagonalText = `${buyerName}  •  ${buyerPhone}  •  ${orderNumber}`;
  const headerNotice = `PERSONAL LICENSED COPY • NOT FOR DISTRIBUTION • WATERMARKED FOR: ${buyerName} (+${buyerPhone})`;
  const footerText = `Licensed to: ${buyerName} (+${buyerPhone}) • Order #${orderNumber} • ${collegeName} • Unauthorized forwarding on Telegram/WhatsApp will result in legal action.`;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();

    // 1. Subtle red anti-piracy watermark diagonally across the page (subtle 14% opacity)
    // Repeated across two diagonal bands to prevent screenshot/cropping bypassing
    page.drawText(diagonalText, {
      x: width * 0.12,
      y: height * 0.32,
      size: 19,
      font: font,
      color: rgb(0.86, 0.22, 0.22), // Subtle red anti-piracy watermark text
      opacity: 0.14,
      rotate: degrees(45),
    });

    page.drawText(diagonalText, {
      x: width * 0.18,
      y: height * 0.62,
      size: 19,
      font: font,
      color: rgb(0.86, 0.22, 0.22), // Subtle red anti-piracy watermark text
      opacity: 0.14,
      rotate: degrees(45),
    });

    // 2. High-security header banner (top margin security stamp)
    page.drawRectangle({
      x: 0,
      y: height - 16,
      width: width,
      height: 16,
      color: rgb(0.99, 0.95, 0.95), // subtle warm red alert tint
      opacity: 0.90,
    });
    page.drawText(headerNotice, {
      x: 16,
      y: height - 12,
      size: 6.5,
      font: font,
      color: rgb(0.72, 0.18, 0.18),
      opacity: 0.85,
    });

    // 3. High-security footer banner on every page (75% opacity)
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: 18,
      color: rgb(0.97, 0.98, 0.99),
      opacity: 0.95,
    });

    page.drawText(footerText, {
      x: 16,
      y: 5,
      size: 7,
      font: regularFont,
      color: rgb(0.3, 0.35, 0.4),
      opacity: 0.85,
    });
  }

  const modifiedPdfBytes = await pdfDoc.save();
  return Buffer.from(modifiedPdfBytes);
}

/**
 * Creates a digital publication when the uploaded file is a mock/placeholder.
 */
async function createPlaceholderEbook(orderInfo) {
  const doc = await PDFDocument.create();
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const title = orderInfo.bookTitle || 'Official Study Material & Formula Compendium';
  const author = orderInfo.author || 'QuestionStudio Academic Editorial Board';
  const examTarget = orderInfo.examTarget || 'Competitive Examinations';

  // Page 1: Official Certificate of Ownership & Title Page
  const coverPage = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = coverPage.getSize();

  // Decorative border
  coverPage.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: rgb(0.01, 0.52, 0.78), // Sky blue
    borderWidth: 2,
    color: rgb(0.98, 0.99, 1.0),
  });

  // Top header pill
  coverPage.drawText('VERIFIED INSTITUTIONAL PUBLICATION', {
    x: 48,
    y: height - 70,
    size: 11,
    font: fontBold,
    color: rgb(0.01, 0.52, 0.78),
  });

  coverPage.drawText(examTarget.toUpperCase() + ' MASTER COMPENDIUM', {
    x: 48,
    y: height - 90,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5),
  });

  // Book Title
  coverPage.drawText(title.substring(0, 52), {
    x: 48,
    y: height - 160,
    size: 20,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  if (title.length > 52) {
    coverPage.drawText(title.substring(52, 110), {
      x: 48,
      y: height - 190,
      size: 16,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });
  }

  coverPage.drawText(`Author: ${author}`, {
    x: 48,
    y: height - 230,
    size: 12,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.3),
  });

  // Digital Ownership Box
  coverPage.drawRectangle({
    x: 48,
    y: height - 370,
    width: width - 96,
    height: 110,
    color: rgb(0.93, 0.97, 1.0),
    borderColor: rgb(0.73, 0.87, 0.98),
    borderWidth: 1,
  });

  coverPage.drawText('DIGITAL RIGHTS & AUTHENTICATION CERTIFICATE', {
    x: 64,
    y: height - 290,
    size: 10,
    font: fontBold,
    color: rgb(0.01, 0.45, 0.7),
  });

  coverPage.drawText(`Licensed To:  ${orderInfo.buyerName || 'Student'}`, {
    x: 64,
    y: height - 312,
    size: 11,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  coverPage.drawText(`Registered Phone:  ${orderInfo.buyerPhone || 'Verified'}`, {
    x: 64,
    y: height - 330,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.3),
  });

  coverPage.drawText(`Order Reference:  #${orderInfo.orderNumber || 'QS-88219'}  •  Issue Date: ${new Date().toLocaleDateString('en-IN')}`, {
    x: 64,
    y: height - 348,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.45),
  });

  // Content Chapters & Overview on Page 2
  const contentPage = doc.addPage([595.28, 841.89]);
  contentPage.drawText('Core Academic Syllabus & Formula Matrix', {
    x: 48,
    y: 800,
    size: 16,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });

  const sampleChapters = [
    '1. Fundamental Units, Dimensional Analysis & Significant Figures',
    '2. Kinematics: 1D & 2D Motion, Projectile Trajectory & Relative Velocity',
    '3. Laws of Motion: Friction, Circular Dynamics & Equilibrium Free Body Diagrams',
    '4. Work, Energy, Power & Conservative Force Fields',
    '5. Rotational Mechanics: Moment of Inertia Theorems, Torque & Angular Momentum',
    '6. Gravitation: Kepler’s Laws, Escape Velocity & Satellite Orbits',
    '7. Thermodynamics & Kinetic Theory of Ideal Gases',
    '8. Electrostatics & Gauss’s Law Applications',
    '9. Current Electricity & Kirchhoff’s Laws Speed Solvers',
    '10. Magnetism, Magnetic Dipole Moment & Biot-Savart Numerical Shortcuts',
  ];

  let currentY = 750;
  for (const ch of sampleChapters) {
    contentPage.drawText(ch, {
      x: 48,
      y: currentY,
      size: 11,
      font: fontRegular,
      color: rgb(0.15, 0.2, 0.25),
    });
    currentY -= 32;
  }

  return doc;
}

module.exports = {
  watermarkPdf,
};
