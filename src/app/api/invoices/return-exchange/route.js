import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Invoice from '@/models/Invoice';
import { generateInvoiceNumber } from '@/lib/calculations';
import Settings from '@/models/Settings';
import { sendSMSNotification } from '@/lib/smsService';
import { sendEmailNotification, generateReturnEmail } from '@/lib/emailService';
import { sendTwilioWhatsApp, generateReturnWhatsApp } from '@/lib/whatsappService';

export async function POST(req) {
  try {
    await connectDB();

    const {
      originalInvoiceId,
      returnType, // 'Return' or 'Exchange'
      returnReason,
      returnItems, // Array of {productName, weight, quantity, itemAmount}
      returnAmount,
      refundMode, // 'Cash', 'CreditNote', 'Online'
      customerId,
    } = await req.json();

    // Validation
    if (!originalInvoiceId || !returnType) {
      return NextResponse.json(
        { message: 'Original invoice ID and return type are required' },
        { status: 400 }
      );
    }

    // Get original invoice
    const originalInvoice = await Invoice.findById(originalInvoiceId);
    if (!originalInvoice) {
      return NextResponse.json(
        { message: 'Original invoice not found' },
        { status: 404 }
      );
    }

    // Get settings for invoice number
    const settings = await Settings.findOne({});
    if (!settings) {
      return NextResponse.json(
        { message: 'Settings not configured' },
        { status: 500 }
      );
    }

    // Generate return invoice number
    const { invoiceNumber, counter } = generateInvoiceNumber(
      settings.lastInvoiceNumber
    );

    // Create return invoice
    const returnInvoice = new Invoice({
      invoiceNumber,
      customerId,
      invoiceType: returnType === 'Exchange' ? 'ExchangeInvoice' : 'ReturnInvoice',
      items: returnItems || [],
      totalAmount: -Math.abs(returnAmount), // Negative for returns
      amountPaid: refundMode === 'CreditNote' ? -Math.abs(returnAmount) : 0,
      amountPending: refundMode === 'CreditNote' ? 0 : -Math.abs(returnAmount),
      paymentStatus:
        refundMode === 'CreditNote' ? 'Paid' : refundMode === 'Online' ? 'Pending' : 'Pending',
      gstOn: originalInvoice.gstOn || 0,
      gstType: originalInvoice.gstType,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalGST: 0,
      status: 'Finalized',
      returnReason,
      refundMode,
      relatedInvoices: [originalInvoiceId],
      isLocked: false,
      notes: `${returnType} of invoice #${originalInvoice.invoiceNumber}`,
    });

    await returnInvoice.save();

    // Update settings
    await Settings.updateOne({}, { lastInvoiceNumber: counter });

    // Link original invoice to return invoice
    originalInvoice.relatedInvoices = [
      ...(originalInvoice.relatedInvoices || []),
      returnInvoice._id,
    ];
    if (returnType === 'Return') {
      originalInvoice.status = 'Returned';
    }
    await originalInvoice.save();

    // Get customer for notifications
    const Customer = require('@/models/Customer').default;
    const customer = await Customer.findById(customerId);

    // Send async notifications
    if (customer) {
      setImmediate(async () => {
        try {
          const notificationText = `Your ${returnType.toLowerCase()} request for Rs. ${Math.abs(returnAmount)} has been recorded. Reference: ${returnInvoice.invoiceNumber}`;

          if (customer.mobileNumber) {
            await sendSMSNotification(customer.mobileNumber, notificationText);
            if (refundMode === 'CreditNote') {
              await sendSMSNotification(
                customer.mobileNumber,
                `Credit note issued for Rs. ${Math.abs(returnAmount)}`
              );
            }
          }

          if (customer.email) {
            const emailContent = generateReturnEmail(
              returnInvoice,
              customer,
              originalInvoice
            );
            await sendEmailNotification(
              customer.email,
              `${returnType} Confirmation - ${returnInvoice.invoiceNumber}`,
              emailContent
            );
          }

          if (customer.mobileNumber) {
            const whatsappMsg = generateReturnWhatsApp(returnInvoice, customer, originalInvoice);
            await sendTwilioWhatsApp(customer.mobileNumber, whatsappMsg);
          }
        } catch (notifError) {
          console.error('Notification error:', notifError);
        }
      });
    }

    return NextResponse.json(
      {
        message: `${returnType} invoice created successfully`,
        returnInvoice,
        originalInvoiceLinked: originalInvoice._id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Return/Exchange error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create return/exchange invoice' },
      { status: 500 }
    );
  }
}

// GET - Fetch return invoices for a specific original invoice
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const originalInvoiceId = searchParams.get('originalInvoiceId');

    if (!originalInvoiceId) {
      return NextResponse.json(
        { message: 'Original invoice ID is required' },
        { status: 400 }
      );
    }

    const returns = await Invoice.find({
      relatedInvoices: originalInvoiceId,
      invoiceType: { $in: ['ReturnInvoice', 'ExchangeInvoice'] },
    });

    return NextResponse.json(returns, { status: 200 });
  } catch (error) {
    console.error('Fetch returns error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch returns' },
      { status: 500 }
    );
  }
}
