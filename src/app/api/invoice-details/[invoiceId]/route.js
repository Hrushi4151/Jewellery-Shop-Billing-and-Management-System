import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Invoice from '@/models/Invoice';
import '@/models/Customer';
import mongoose from 'mongoose';

/**
 * GET /api/invoice-details/[invoiceId]
 * Public endpoint - Fetch detailed invoice information
 * Shows complete invoice details including items breakdown
 */
export async function GET(req, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const invoiceId = resolvedParams?.invoiceId?.toString()?.trim();
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId')?.toString()?.trim();

    // Validate invoice ID format
    if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
      return NextResponse.json(
        { message: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    if (customerId && !mongoose.Types.ObjectId.isValid(customerId)) {
      return NextResponse.json(
        { message: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    // Fetch invoice with all details
    const invoice = await Invoice.findById(invoiceId)
      .populate('customerId', 'name mobileNumber email')
      .lean();

    if (!invoice) {
      return NextResponse.json(
        { message: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (customerId && invoice.customerId?._id?.toString() !== customerId) {
      return NextResponse.json(
        { message: 'Invoice does not belong to this customer' },
        { status: 403 }
      );
    }

    // Only show finalized invoices
    if (invoice.status !== 'Finalized') {
      return NextResponse.json(
        { message: 'Access denied - Invoice not finalized' },
        { status: 403 }
      );
    }

    // Format response with detailed breakdown
    return NextResponse.json({
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.invoiceType,
        status: invoice.status,
        paymentStatus: invoice.paymentStatus,

        // Customer Details
        customer: {
          id: invoice.customerId?._id,
          name: invoice.customerName,
          mobileNumber: invoice.customerMobile,
          email: invoice.customerEmail,
          address: invoice.customerAddress,
        },

        // Items Details
        items: invoice.items?.map((item) => ({
          productName: item.productName,
          weight: item.weight,
          purity: item.purity,
          quantity: item.quantity,
          metalPrice: item.metalPrice,
          stonePrice: item.stonePrice,
          makingCharges: item.makingCharges,
          subtotal: item.subtotal,
          stoneDetails: item.stoneDetails,
        })),

        // Amount Breakdown
        amounts: {
          subtotal: invoice.subtotal,
          discount: invoice.discount,
          discountType: invoice.discountType,
          discountedAmount: invoice.discountedAmount,
          gstType: invoice.gstType,
          cgst: invoice.cgst,
          sgst: invoice.sgst,
          igst: invoice.igst,
          totalGST: invoice.totalGST,
          totalAmount: invoice.totalAmount,
          amountPaid: invoice.amountPaid,
          amountPending: invoice.amountPending,
        },

        // Additional Info
        goldRate: invoice.goldRate,
        notes: invoice.notes,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get invoice details error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch invoice details' },
      { status: 500 }
    );
  }
}
