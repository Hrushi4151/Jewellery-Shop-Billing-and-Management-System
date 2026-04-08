// Call Notification Service using Pingram SDK
import { Pingram } from 'pingram';

let pingramClient = null;

// Initialize Pingram client for calls
export const initPingramCall = () => {
  if (!process.env.PINGRAM_API_KEY) {
    console.warn('Pingram API key not configured - Call notifications disabled');
    return null;
  }
  return new Pingram({
    apiKey: process.env.PINGRAM_API_KEY,
    baseUrl: process.env.PINGRAM_BASE_URL || 'https://api.pingram.io',
  });
};

// Send IVR/Voice Call notification using Pingram
export const sendCallNotification = async (phoneNumber, message) => {
  try {
    const client = initPingramCall();
    if (!client) {
      console.log('Call service not available - Skipping call to:', phoneNumber);
      return { success: false, message: 'Call service not configured' };
    }

    // Format phone number to international format
    let formattedNumber = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedNumber = '+91' + phoneNumber.replace(/\D/g, '').slice(-10);
    }

    const response = await client.send({
      type: 'alert',
      to: {
        number: formattedNumber,
      },
      call: {
        message,
      },
    });

    const messageId = response?.id || response?.messageId || response?.data?.id || null;
    if (messageId) {
      console.log('Call queued via Pingram:', messageId);
      return { success: true, messageId, providerResponse: response };
    }

    // SDK calls can still be accepted without an explicit id.
    console.log('Call accepted by Pingram (no message id returned):', response);
    return { success: true, messageId: null, providerResponse: response };
  } catch (error) {
    const apiMessage = error?.response?.data?.message || error?.response?.data || error?.message;
    console.error('Call sending failed:', apiMessage);
    return { success: false, error: apiMessage };
  }
};

// Alias for backward compatibility (WhatsApp -> Call)
export const sendWhatsAppNotification = sendCallNotification;

// Alias for backward compatibility (Twilio WhatsApp -> Pingram Call)
export const sendTwilioWhatsApp = sendCallNotification;

// Invoice WhatsApp template
export const generateInvoiceWhatsApp = (invoice, customer) => {
  return `Hello ${customer.name},

Your invoice has been created successfully! 💎

📄 Invoice: ${invoice.invoiceNumber}
💰 Total Amount: ₹${(invoice.totalAmount || 0).toLocaleString('en-IN')}
💸 Amount Paid: ₹${(invoice.amountPaid || 0).toLocaleString('en-IN')}
⏳ Amount Pending: ₹${(invoice.amountPending || 0).toLocaleString('en-IN')}

Thank you for shopping with us!
For details, please contact us.`;
};

// Invoice Call template - IVR message
export const generateInvoiceCall = (invoice, customer) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://billing.laxmialankar.com';
  return `Hello ${customer.name}. Your invoice number ${invoice.invoiceNumber} has been created with a total amount of rupees ${Math.round(
    invoice.totalAmount || 0
  )}. You can view all your purchases at ${baseUrl} forwarding slash customer dash invoice forwarding slash. Thank you for shopping with us.`;
};

// Payment WhatsApp template
export const generatePaymentWhatsApp = (payment, invoice, customer) => {
  return `Hello ${customer.name},

Your payment has been received successfully! ✅

💳 Payment Amount: ₹${payment.amount.toLocaleString('en-IN')}
📋 Invoice: ${invoice.invoiceNumber}
🏦 Payment Mode: ${payment.paymentMode}
📅 Date: ${new Date(payment.createdAt).toLocaleDateString('en-IN')}
⏳ Remaining: ₹${(invoice.amountPending || 0).toLocaleString('en-IN')}

Thank you for your business!`;
};

// Payment Call template - IVR message
export const generatePaymentCall = (payment, invoice, customer) => {
  const remaining = Math.max(0, (invoice.amountPending || 0));
  return `Hello ${customer.name}. We have received your payment of rupees ${Math.round(
    payment.amount || 0
  )} for invoice ${invoice.invoiceNumber}. Remaining pending amount is rupees ${Math.round(
    remaining
  )}. Thank you for your business.`;
};

// Reminder WhatsApp template
export const generateReminderWhatsApp = (invoice, customer) => {
  return `Hi ${customer.name},

Quick reminder about your pending invoice 📋

📄 Invoice: ${invoice.invoiceNumber}
⏳ Outstanding Amount: ₹${(invoice.amountPending || 0).toLocaleString('en-IN')}
📅 Since: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}

Please settle at your earliest convenience.
Thank you!`;
};

// Estimate WhatsApp template
export const generateEstimateWhatsApp = (invoice, customer) => {
  return `Hello ${customer.name},

Your jewellery estimate from Laxmi Alankar is ready! 💎

📄 Estimate: ${invoice.invoiceNumber}
💰 Estimated Amount: ₹${(invoice.totalAmount || 0).toLocaleString('en-IN')}
📅 Valid Until: ${new Date(new Date(invoice.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}

Once you confirm, we'll convert this to an invoice.
Looking forward to your confirmation!`;
};

// Return/Exchange WhatsApp template
export const generateReturnWhatsApp = (returnInvoice, customer, originalInvoice) => {
  const isExchange = returnInvoice.invoiceType === 'ExchangeInvoice';
  const refundAmount = Math.abs(returnInvoice.totalAmount);
  
  return `Hello ${customer.name},

Your ${isExchange ? 'exchange' : 'return'} request has been recorded! 💎

📄 Reference: ${returnInvoice.invoiceNumber}
📋 Original Invoice: ${originalInvoice.invoiceNumber}
💰 ${isExchange ? 'Exchange' : 'Refund'} Amount: ₹${refundAmount.toLocaleString('en-IN')}
🔄 Refund Mode: ${returnInvoice.refundMode}
${
  returnInvoice.refundMode === 'CreditNote'
    ? '\n✅ Credit note issued - Use for future purchases!'
    : '\n⏳ Refund will be processed within 3-5 business days.'
}

Thank you for your business!`;
};
