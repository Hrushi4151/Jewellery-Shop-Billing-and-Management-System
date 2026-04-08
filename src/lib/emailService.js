// Email Notification Service using Pingram API
import axios from 'axios';

let pingramClient = null;

// Initialize Pingram client for emails
export const initEmailService = () => {
  if (!process.env.PINGRAM_API_KEY) {
    console.warn('Pingram API key not configured - Email notifications disabled');
    return null;
  }

  try {
    pingramClient = {
      apiKey: process.env.PINGRAM_API_KEY,
      baseUrl: process.env.PINGRAM_BASE_URL || 'https://api.pingram.io',
    };
    console.log('Email service initialized with Pingram API');
    return pingramClient;
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    return null;
  }
};

// Send email notification using Pingram
export const sendEmailNotification = async (email, subject, html) => {
  try {
    const emailService = initEmailService();
    if (!emailService) {
      console.log('Email service not available - Skipping email to:', email);
      return { success: false, message: 'Email service not configured' };
    }

    // Send email via Pingram API
    const response = await axios.post(
      `${emailService.baseUrl}/send`,
      {
        type: 'email',
        to: {
          email: email,
        },
        email: {
          subject: subject,
          body: html,
          isHtml: true,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${emailService.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Email sent successfully via Pingram:', response.data?.id);
    return { success: true, messageId: response.data?.id };
  } catch (error) {
    const apiMessage = error?.response?.data?.message || error?.response?.data || error.message;
    console.error('Email sending failed:', apiMessage);
    return { success: false, error: apiMessage };
  }
};

// Invoice email template
export const generateInvoiceEmail = (invoice, customer) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #d4af37 0%, #c99f27 100%); color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .section { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .item-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
          .item-row:last-child { border-bottom: none; }
          .amount { font-weight: bold; color: #d4af37; }
          .pending { color: #f57f17; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Invoice Receipt</h1>
            <p>Laxmi Alankar</p>
          </div>

          <div class="section">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}</p>
            <p><strong>Customer:</strong> ${customer.name}</p>
          </div>

          <div class="section">
            <h3>Bill Summary</h3>
            <div class="item-row">
              <span>Subtotal</span>
              <span>₹${(invoice.subtotal || 0).toLocaleString('en-IN')}</span>
            </div>
            ${invoice.discount ? `
              <div class="item-row">
                <span>Discount</span>
                <span>-₹${(invoice.discount || 0).toLocaleString('en-IN')}</span>
              </div>
            ` : ''}
            <div class="item-row">
              <span>GST</span>
              <span>₹${(invoice.totalGST || 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="item-row" style="font-weight: bold; font-size: 16px; border-top: 2px solid #d4af37; padding-top: 10px; margin-top: 10px;">
              <span>Total Amount</span>
              <span class="amount">₹${(invoice.totalAmount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div class="section">
            <h3>Payment Status</h3>
            <div class="item-row">
              <span>Amount Paid</span>
              <span style="color: #2e7d32; font-weight: bold;">₹${(invoice.amountPaid || 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="item-row">
              <span>Amount Pending</span>
              <span class="pending">₹${(invoice.amountPending || 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="item-row">
              <span>Status</span>
              <span><strong>${invoice.paymentStatus}</strong></span>
            </div>
          </div>

          <div class="section" style="text-align: center; background: #e8f5e9; color: #2e7d32;">
            <p>Thank you for your business!</p>
            <p>For any queries, please contact us.</p>
          </div>

          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; 2026 Laxmi Alankar. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Payment confirmation email template
export const generatePaymentEmail = (payment, invoice, customer) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2e7d32; color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .section { background: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .amount { font-weight: bold; color: #2e7d32; font-size: 18px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Received</h1>
            <p>Thank you for your payment</p>
          </div>

          <div class="section">
            <h3>Payment Details</h3>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Amount Paid:</strong> <span class="amount">₹${payment.amount.toLocaleString('en-IN')}</span></p>
            <p><strong>Payment Mode:</strong> ${payment.paymentMode}</p>
            <p><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleDateString('en-IN')}</p>
            ${payment.referenceNumber ? `<p><strong>Reference Number:</strong> ${payment.referenceNumber}</p>` : ''}
          </div>

          <div class="section">
            <h3>Updated Invoice Status</h3>
            <p><strong>Total Amount:</strong> ₹${(invoice.totalAmount || 0).toLocaleString('en-IN')}</p>
            <p><strong>Total Paid:</strong> ₹${(invoice.amountPaid || 0).toLocaleString('en-IN')}</p>
            <p><strong>Remaining:</strong> ₹${(invoice.amountPending || 0).toLocaleString('en-IN')}</p>
            <p><strong>Status:</strong> <strong>${invoice.paymentStatus}</strong></p>
          </div>

          <div class="section" style="text-align: center; background: #e8f5e9; color: #2e7d32;">
            <p>Your payment has been successfully recorded.</p>
            <p>Thank you for your transaction!</p>
          </div>

          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; 2026 Laxmi Alankar. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Invoice reminder email
export const generateReminderEmail = (invoice, customer) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f57f17; color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .section { background: #fff3e0; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 3px solid #f57f17; }
          .amount { font-weight: bold; color: #f57f17; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Reminder</h1>
            <p>Invoice Pending Payment</p>
          </div>

          <div class="section">
            <h3>Outstanding Amount</h3>
            <p>Dear ${customer.name},</p>
            <p>This is a friendly reminder about your pending invoice.</p>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Outstanding Amount:</strong> <span class="amount">₹${(invoice.amountPending || 0).toLocaleString('en-IN')}</span></p>
            <p><strong>Invoice Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}</p>
          </div>

          <div class="section">
            <p>Please settle the pending amount at your earliest convenience.</p>
            <p>If you have already made the payment, please ignore this reminder.</p>
          </div>

          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; 2026 Laxmi Alankar. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Return/Exchange Email template
export const generateReturnEmail = (returnInvoice, customer, originalInvoice) => {
  const isExchange = returnInvoice.invoiceType === 'ExchangeInvoice';
  const refundAmount = Math.abs(returnInvoice.totalAmount);
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #d32f2f; color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .section { background: #ffebee; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 3px solid #d32f2f; }
          .amount { font-weight: bold; color: #d32f2f; font-size: 18px; }
          .item-row { padding: 8px 0; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isExchange ? 'Exchange' : 'Return'} Confirmation</h1>
            <p>Reference: ${returnInvoice.invoiceNumber}</p>
          </div>

          <div class="section">
            <h3>Request Details</h3>
            <p>Dear ${customer.name},</p>
            <p>Your ${isExchange ? 'exchange' : 'return'} request has been recorded successfully.</p>
            <p><strong>Original Invoice:</strong> ${originalInvoice.invoiceNumber}</p>
            <p><strong>Return Reference:</strong> ${returnInvoice.invoiceNumber}</p>
            <p><strong>Reason:</strong> ${returnInvoice.returnReason || 'Not specified'}</p>
          </div>

          <div class="section">
            <h3>Return Items</h3>
            ${(returnInvoice.items || [])
              .map(
                (item) => `
              <div class="item-row">
                <span>${item.productName} (${item.quantity} pcs) - ${item.weight}g</span>
                <span>₹${(item.itemAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            `
              )
              .join('')}
            <div class="item-row" style="font-weight: bold; border-top: 2px solid #d32f2f;">
              <span>Total ${isExchange ? 'Exchange' : 'Return'} Amount</span>
              <span class="amount">₹${refundAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div class="section">
            <h3>Refund Information</h3>
            <p><strong>Refund Mode:</strong> ${returnInvoice.refundMode}</p>
            ${
              returnInvoice.refundMode === 'CreditNote'
                ? `<p>A credit note for ₹${refundAmount.toLocaleString('en-IN')} has been issued. You can use it for future purchases.</p>`
                : `<p>We will process your refund within 3-5 business days.</p>`
            }
          </div>

          <div class="footer">
            <p>If you have any questions, please contact us.</p>
            <p>&copy; 2026 Laxmi Alankar. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};
