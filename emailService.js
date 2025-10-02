const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send an email using SendGrid
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content
 */
async function sendEmail(to, subject, text, html, templateId = null, dynamicTemplateData = {}) {
  try {
    const msg = {
      to,
      from: process.env.SENDER_EMAIL,
      subject,
      text,
      html,
      templateId,
      dynamic_template_data: dynamicTemplateData,
    };
    const response = await sgMail.send(msg);
    console.log('Email sent', response);
  } catch (error) {
    console.error('Error sending email', error);
  }
}

/**
 * Track email analytics
 * @param {object} eventData - Event data from email service
 */
function trackEmailAnalytics(eventData) {
  // Log event or send to analytics service
  console.log('Email event:', eventData);
}

module.exports = {
  sendEmail,
  trackEmailAnalytics,
};
