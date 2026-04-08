import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Invoice from '@/models/Invoice';
import { generateInvoiceNumber } from '@/lib/calculations';
import Settings from '@/models/Settings';

export async function POST(req) {
  try {
    await connectDB();

    const { estimateId } = await req.json();

    if (!estimateId) {
      return NextResponse.json(
        { message: 'Estimate ID is required' },
        { status: 400 }
      );
    }

    // Get the estimate
    const estimate = await Invoice.findById(estimateId);
    if (!estimate) {
      return NextResponse.json(
        { message: 'Estimate not found' },
        { status: 404 }
      );
    }

    if (estimate.invoiceType !== 'Estimate') {
      return NextResponse.json(
        { message: 'Only estimates can be converted to invoices' },
        { status: 400 }
      );
    }

    // Get settings for new invoice number
    const settings = await Settings.findOne({});
    if (!settings) {
      return NextResponse.json(
        { message: 'Settings not configured' },
        { status: 500 }
      );
    }

    // Generate new invoice number
    const { invoiceNumber, counter } = generateInvoiceNumber(
      settings.lastInvoiceNumber
    );

    // Create new invoice from estimate
    const newInvoice = new Invoice({
      ...estimate.toObject(),
      _id: undefined, // Remove the old ID
      invoiceNumber, // New invoice number
      invoiceType: 'Invoice',
      status: 'Finalized',
      paymentStatus: 'Pending',
      amountPaid: 0,
      amountPending: estimate.totalAmount,
      estimateConvertedFrom: estimateId,
      isLocked: false,
      lockedAt: null,
      lockedBy: null,
    });

    await newInvoice.save();

    // Update settings
    await Settings.updateOne({}, { lastInvoiceNumber: counter });

    // Mark estimate as converted
    estimate.status = 'Converted';
    estimate.relatedInvoices = [...(estimate.relatedInvoices || []), newInvoice._id];
    await estimate.save();

    return NextResponse.json(
      {
        message: 'Estimate converted to invoice successfully',
        invoice: newInvoice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Convert estimate error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to convert estimate' },
      { status: 500 }
    );
  }
}
