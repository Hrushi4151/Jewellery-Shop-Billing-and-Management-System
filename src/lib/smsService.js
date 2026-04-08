// SMS Notification Service using Pingram SDK
import { Pingram } from 'pingram';

let pingramClient = null;

// Initialize Pingram client
export const initPingram = () => {
  if (!process.env.PINGRAM_API_KEY) {
    console.warn('Pingram API key not configured - SMS notifications disabled');
    return null;
  }

  try {
    pingramClient = new Pingram({
      apiKey: process.env.PINGRAM_API_KEY,
      baseUrl: process.env.PINGRAM_BASE_URL || 'https://api.pingram.io',
    });
    console.log('Pingram SMS service initialized');
    return pingramClient;
  } catch (error) {
    console.error('Failed to initialize Pingram:', error);
    return null;
  }
};

// Send SMS notification using Pingram
export const sendSMSNotification = async (phoneNumber, message) => {
  try {
    const client = initPingram();
    if (!client) {
      console.log('SMS service not available - Skipping SMS to:', phoneNumber);
      return { success: false, message: 'SMS service not configured' };
    }

    // Format phone number to international format if needed
    let formattedNumber = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      // Assume India if no country code
      formattedNumber = '+91' + phoneNumber.replace(/\D/g, '').slice(-10);
    }

    const response = await client.send({
      type: 'alert',
      to: {
        number: formattedNumber,
      },
      sms: {
        message,
      },
    });

    const messageId = response?.id || response?.messageId || response?.data?.id || null;
    if (messageId) {
      console.log('SMS queued via Pingram:', messageId);
      return { success: true, messageId, providerResponse: response };
    }

    // SDK calls can still be accepted without an explicit id.
    console.log('SMS accepted by Pingram (no message id returned):', response);
    return { success: true, messageId: null, providerResponse: response };
  } catch (error) {
    const apiMessage = error?.response?.data?.message || error?.response?.data || error?.message;
    console.error('SMS sending failed:', apiMessage);
    return { success: false, error: apiMessage };
  }
};

// Invoice SMS template with link to view purchases
export const generateInvoiceSMS = (invoice, customer) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://billing.laxmialankar.com';
  const invoiceLink = `${baseUrl}/customer-invoice/${invoice.customerId}/${invoice._id}`;
  
  return `Invoice ${invoice.invoiceNumber} created! Amount: ₹${(
    invoice.totalAmount || 0
  ).toLocaleString('en-IN')}. View your purchases: ${invoiceLink}`;
};

// Payment SMS template
export const generatePaymentSMS = (payment, invoice) => {
  const remaining = Math.max(0, (invoice.totalAmount || 0) - ((invoice.amountPaid || 0) + payment.amount));
  return `Payment received: ₹${payment.amount.toLocaleString(
    'en-IN'
  )} via ${payment.paymentMode}. Remaining: ₹${remaining.toLocaleString(
    'en-IN'
  )}. Thank you for your business!`;
};

// Reminder SMS for pending invoice
export const generateReminderSMS = (invoice) => {
  return `Hi, reminding you about pending invoice ${invoice.invoiceNumber}. Outstanding amount: ₹${(
    invoice.amountPending || 0
  ).toLocaleString('en-IN')}. Please settle at your earliest convenience.`;
};
