// backend/src/lib/whatsapp.js
// Abstract provider for WhatsApp Business API & Automated Student Notifications

const crypto = require('crypto');

/**
 * Normalizes phone numbers to standard Indian WhatsApp format (91XXXXXXXXXX)
 */
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/\D/g, '');
  if (!digits) return null;

  // 10-digit Indian mobile number
  if (digits.length === 10) {
    return `91${digits}`;
  }
  // 12-digit number starting with 91
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

class WhatsAppService {
  constructor() {
    this.providerKey = process.env.WHATSAPP_PROVIDER_API_KEY || null;
    this.providerUrl = process.env.WHATSAPP_PROVIDER_URL || null;
  }

  generateOtp() {
    // Generate a secure 6-digit OTP
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Sends any general or transactional WhatsApp message
   */
  async sendRawMessage(phone, messageText) {
    const normPhone = normalizePhoneNumber(phone);
    if (!normPhone) return false;

    console.log(`\n[WHATSAPP SERVICE] [${this.providerKey ? 'LIVE API' : 'SIMULATION'}] Notification to ${normPhone}:\n${messageText}\n`);

    if (this.providerKey && this.providerUrl) {
      try {
        await fetch(this.providerUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.providerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: normPhone,
            text: messageText,
            message: messageText,
          }),
        });
      } catch (err) {
        console.warn('[WHATSAPP SERVICE] Provider API error sending message:', err.message);
      }
    }
    return true;
  }

  async sendOtp(phone, otp) {
    const normPhone = normalizePhoneNumber(phone);
    console.log(`\n[WHATSAPP SERVICE] Sending OTP to ${normPhone || phone}: ${otp}\n`);
    
    if (this.providerKey && this.providerUrl) {
      try {
        await fetch(this.providerUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.providerKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: normPhone,
            type: 'template',
            template: {
              name: 'verification_code',
              language: { code: 'en' },
              components: [{ type: 'body', parameters: [{ type: 'text', text: otp }] }]
            }
          })
        });
      } catch (err) {
        console.warn('[WHATSAPP SERVICE] Provider API error sending OTP:', err.message);
      }
    }
    return true;
  }

  async sendWelcomeMessage(phone, credits, loginUrl) {
    const normPhone = normalizePhoneNumber(phone);
    const message = `Welcome to QuestionStudio!

Your account has been created successfully.

🎁 Welcome Credits: ${credits} Credits

Your QuestionStudio account is now ready.

Login:
${loginUrl}

You can use your credits to generate exam questions for:
• NEET
• JEE Main
• EAMCET / EAPCET

1 Question = 1 Credit
1 Solution = 1 Credit
PDF Generation = FREE
Credits Never Expire

Welcome to smarter question-paper generation.
— Team QuestionStudio`;

    console.log(`\n[WHATSAPP SERVICE] Sending Welcome Message to ${normPhone || phone}:\n${message}\n`);
    
    if (this.providerKey && this.providerUrl) {
      try {
        await fetch(this.providerUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.providerKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: normPhone,
            text: message,
            message: message
          })
        });
      } catch (err) {
        console.warn('[WHATSAPP SERVICE] Provider API error sending Welcome Message:', err.message);
      }
    }
    return true;
  }

  /**
   * Automatically dispatches WhatsApp Order Confirmation & Secure DRM Download link to Student
   */
  async sendMarketplaceOrderConfirmation({
    phone,
    studentName,
    bookTitle,
    orderNumber,
    amountRupees,
    downloadUrl,
    isPhysical = false,
    collegeName = 'QuestionStudio Bookstore',
  }) {
    const normPhone = normalizePhoneNumber(phone);
    if (!normPhone) return false;

    let messageBody = `📚 *Order Confirmed — QuestionStudio*\n\n` +
      `Dear ${studentName || 'Student'},\n\n` +
      `Thank you for your purchase from *${collegeName}*!\n\n` +
      `📋 *ORDER SUMMARY:*\n` +
      `• Order ID: *${orderNumber}*\n` +
      `• Publication: *${bookTitle}*\n` +
      `• Amount Paid: ₹${amountRupees}\n` +
      `• Edition: ${isPhysical ? '📦 Physical Book (Print)' : '📄 Digital Study Material (PDF)'}\n\n`;

    if (!isPhysical && downloadUrl) {
      messageBody += `📥 *DOWNLOAD YOUR LICENSED COPY:*\n${downloadUrl}\n\n` +
        `🛡️ *Anti-Piracy Notice:* Your PDF is personalized and watermarked with your Name & Mobile Number across all pages for individual educational use.\n\n`;
    } else {
      messageBody += `📦 *DELIVERY STATUS:*\n` +
        `Your physical order is being packed for shipment. You will receive courier tracking updates via WhatsApp as soon as it is dispatched.\n\n`;
    }

    messageBody += `Happy Learning!\n*— ${collegeName} & Team QuestionStudio*`;

    console.log(`\n[WHATSAPP SERVICE] [${this.providerKey ? 'LIVE API' : 'SIMULATION'}] Order Confirmation to ${normPhone}:\n${messageBody}\n`);

    if (this.providerKey && this.providerUrl) {
      try {
        await fetch(this.providerUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.providerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: normPhone,
            text: messageBody,
            message: messageBody,
          }),
        });
      } catch (err) {
        console.warn('[WHATSAPP SERVICE] Could not dispatch WhatsApp order confirmation:', err.message);
      }
    }

    return true;
  }

  /**
   * Automatically dispatches WhatsApp Courier Dispatch Notification & Tracking URL to Student
   */
  async sendMarketplaceShippingUpdate({
    phone,
    studentName,
    bookTitle,
    orderNumber,
    carrierName,
    trackingNumber,
    trackingUrl,
    collegeName = 'QuestionStudio Bookstore',
  }) {
    const normPhone = normalizePhoneNumber(phone);
    if (!normPhone) return false;

    let messageBody = `🚚 *Your Study Material Has Been Dispatched!*\n\n` +
      `Dear ${studentName || 'Student'},\n\n` +
      `Great news! Your physical study material from *${collegeName}* is on its way.\n\n` +
      `📦 *SHIPMENT DETAILS:*\n` +
      `• Order ID: *${orderNumber}*\n` +
      `• Item: *${bookTitle}*\n` +
      `• Courier Partner: *${carrierName}*\n` +
      `• Tracking / AWB No: *${trackingNumber}*\n\n`;

    if (trackingUrl) {
      messageBody += `📍 *TRACK YOUR PARCEL:*\n${trackingUrl}\n\n`;
    } else {
      messageBody += `📍 Tracking status will reflect with ${carrierName} within 24 hours.\n\n`;
    }

    messageBody += `Please keep your phone accessible during delivery.\n\n` +
      `Best regards,\n*— ${collegeName} Logistics Team*`;

    console.log(`\n[WHATSAPP SERVICE] [${this.providerKey ? 'LIVE API' : 'SIMULATION'}] Shipping Update to ${normPhone}:\n${messageBody}\n`);

    if (this.providerKey && this.providerUrl) {
      try {
        await fetch(this.providerUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.providerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: normPhone,
            text: messageBody,
            message: messageBody,
          }),
        });
      } catch (err) {
        console.warn('[WHATSAPP SERVICE] Could not dispatch WhatsApp shipping update:', err.message);
      }
    }

    return true;
  }

  /**
   * Automatically notifies the College Admin / Seller whenever a student purchases their book or exam material!
   */
  async sendSellerSaleAlert({
    sellerPhone,
    collegeName,
    studentName,
    studentPhone,
    bookTitle,
    orderNumber,
    amountRupees,
    collegeShareRupees,
    isPhysical = false,
  }) {
    const normPhone = normalizePhoneNumber(sellerPhone);
    if (!normPhone) return false;

    let messageBody = `🎉 *New Sale Alert — QuestionStudio Marketplace*\n\n` +
      `Dear *${collegeName || 'College Partner'}* Team,\n\n` +
      `A student has just purchased your publication!\n\n` +
      `📋 *TRANSACTION DETAILS:*\n` +
      `• Publication: *${bookTitle}*\n` +
      `• Student: ${studentName || 'Student'} (${studentPhone || 'Verified'})\n` +
      `• Order ID: *${orderNumber}*\n` +
      `• Edition: ${isPhysical ? '📦 Physical Print (Fulfillment Needed)' : '📄 Digital PDF (Auto-Delivered)'}\n` +
      `• Total Paid: ₹${amountRupees}\n` +
      `• *Your Accrued Earning: ₹${collegeShareRupees}*\n\n`;

    if (isPhysical) {
      messageBody += `⚠️ *ACTION REQUIRED:* Please log in to your College Admin Seller Studio to view shipping address and enter tracking details.\n\n`;
    } else {
      messageBody += `✅ Delivered automatically to student with DRM anti-piracy watermark.\n\n`;
    }

    messageBody += `Dashboard: https://questionstudio.in/#/bookstore\n\n` +
      `Keep growing!\n*— QuestionStudio Partner Desk*`;

    console.log(`\n[WHATSAPP SERVICE] [${this.providerKey ? 'LIVE API' : 'SIMULATION'}] Seller Sale Alert to ${normPhone}:\n${messageBody}\n`);

    if (this.providerKey && this.providerUrl) {
      try {
        await fetch(this.providerUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.providerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: normPhone,
            text: messageBody,
            message: messageBody,
          }),
        });
      } catch (err) {
        console.warn('[WHATSAPP SERVICE] Could not dispatch WhatsApp seller sale alert:', err.message);
      }
    }

    return true;
  }

  /**
   * Automatically notifies College Admin when their subscription plan is activated/renewed
   */
  async sendSubscriptionActivationNotification({
    collegePhone,
    collegeName,
    moduleKey,
    billingCycle,
    totalAmountRupees,
    invoiceNumber,
    validUntil,
  }) {
    const normPhone = normalizePhoneNumber(collegePhone);
    if (!normPhone) return false;

    const moduleLabels = {
      OMR: 'OMR Sheet Scanning & Instant Grading Engine',
      CBT: 'CBT Online Examination & Test Series Module',
      COLLEGE_WEBSITE: 'Dynamic White-Label College Website & Bookstore',
      WHATSAPP: 'Bulk WhatsApp Parent Notification & Results Add-on',
      COMPLETE_BUNDLE: 'Complete All-in-One Institutional Bundle',
    };
    const moduleName = moduleLabels[moduleKey] || moduleKey;
    const formattedDate = validUntil ? new Date(validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '1 Year';

    const messageBody = `🎉 *Subscription Activated — QuestionStudio*\n\n` +
      `Dear *${collegeName}* Team,\n\n` +
      `Thank you for subscribing to the *${moduleName}*!\n\n` +
      `📋 *SUBSCRIPTION DETAILS:*\n` +
      `• Plan: *${moduleName}*\n` +
      `• Billing Cycle: *${billingCycle === 'ANNUAL' ? 'Annual (365 Days)' : 'Monthly (30 Days)'}*\n` +
      `• Amount Paid: ₹${totalAmountRupees} (Inclusive of GST)\n` +
      `• Status: 🟢 ACTIVE\n` +
      `• GST Invoice No: *${invoiceNumber}*\n` +
      `• Valid Until: *${formattedDate}*\n\n` +
      `🚀 *Your module features are now fully unlocked on your dashboard.*\n\n` +
      `View GST Invoice & Access Tools:\nhttps://questionstudio.in/#/security\n\n` +
      `Happy Teaching!\n*— QuestionStudio Academic Directorate*`;

    console.log(`\n[WHATSAPP SERVICE] [${this.providerKey ? 'LIVE API' : 'SIMULATION'}] Subscription Activation to ${normPhone}:\n${messageBody}\n`);

    if (this.providerKey && this.providerUrl) {
      try {
        await fetch(this.providerUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.providerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: normPhone,
            text: messageBody,
            message: messageBody,
          }),
        });
      } catch (err) {
        console.warn('[WHATSAPP SERVICE] Could not dispatch WhatsApp subscription notification:', err.message);
      }
    }

    return true;
  }

  /**
   * Automatically alerts Super Admin (Platform Owner) when a college purchases a subscription plan
   */
  async sendAdminSubscriptionAlert({
    adminPhone,
    collegeName,
    moduleKey,
    billingCycle,
    totalAmountRupees,
    invoiceNumber,
  }) {
    const normPhone = normalizePhoneNumber(adminPhone);
    if (!normPhone) return false;

    const moduleLabels = {
      OMR: 'OMR Sheet Scanning Engine',
      CBT: 'CBT Online Examination Module',
      COLLEGE_WEBSITE: 'College Website & Bookstore Plan',
      WHATSAPP: 'Bulk WhatsApp Messaging Add-on',
      COMPLETE_BUNDLE: 'Complete All-in-One Bundle',
    };
    const moduleName = moduleLabels[moduleKey] || moduleKey;

    const messageBody = `💰 *New Subscription Sale Alert — QuestionStudio*\n\n` +
      `Congratulations! A college has just purchased a subscription plan.\n\n` +
      `🏛️ College: *${collegeName}*\n` +
      `📦 Module: *${moduleName}*\n` +
      `💳 Total Paid: ₹${totalAmountRupees}\n` +
      `🔄 Cycle: *${billingCycle}*\n` +
      `🧾 Tax Invoice: *${invoiceNumber}*\n\n` +
      `Platform Financial Reconciliation:\nhttps://questionstudio.in/#/admin/reconciliation\n\n` +
      `*— QuestionStudio Automated Revenue Watcher*`;

    console.log(`\n[WHATSAPP SERVICE] [${this.providerKey ? 'LIVE API' : 'SIMULATION'}] Super Admin Revenue Alert to ${normPhone}:\n${messageBody}\n`);

    if (this.providerKey && this.providerUrl) {
      try {
        await fetch(this.providerUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.providerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: normPhone,
            text: messageBody,
            message: messageBody,
          }),
        });
      } catch (err) {
        console.warn('[WHATSAPP SERVICE] Could not dispatch WhatsApp admin alert:', err.message);
      }
    }

    return true;
  }
}

module.exports = new WhatsAppService();
