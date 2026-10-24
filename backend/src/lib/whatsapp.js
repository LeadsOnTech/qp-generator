// backend/src/lib/whatsapp.js
// Abstract provider for WhatsApp Business API

const crypto = require('crypto');

class WhatsAppService {
  constructor() {
    this.providerKey = process.env.WHATSAPP_PROVIDER_API_KEY;
    this.providerUrl = process.env.WHATSAPP_PROVIDER_URL;
  }

  generateOtp() {
    // Generate a secure 6-digit OTP
    return crypto.randomInt(100000, 999999).toString();
  }

  async sendOtp(phone, otp) {
    console.log(`\n[WHATSAPP SERVICE] Sending OTP to ${phone}: ${otp}\n`);
    
    if (this.providerKey && this.providerUrl) {
      // Example real integration
      /*
      await fetch(this.providerUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.providerKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: phone,
          type: 'template',
          template: {
            name: 'verification_code',
            language: { code: 'en' },
            components: [{ type: 'body', parameters: [{ type: 'text', text: otp }] }]
          }
        })
      });
      */
    }
    return true;
  }

  async sendWelcomeMessage(phone, credits, loginUrl) {
    const message = `Welcome to QuestionForge!

Your account has been created successfully.

🎁 Welcome Credits: ${credits} Credits

Your QuestionForge account is now ready.

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
— Team QuestionForge`;

    console.log(`\n[WHATSAPP SERVICE] Sending Welcome Message to ${phone}:\n${message}\n`);
    
    if (this.providerKey && this.providerUrl) {
      // Implement actual provider API call here
    }
    return true;
  }
}

module.exports = new WhatsAppService();
