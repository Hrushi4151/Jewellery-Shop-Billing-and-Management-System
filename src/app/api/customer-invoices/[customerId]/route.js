import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Invoice from '@/models/Invoice';
import Customer from '@/models/Customer';
import mongoose from 'mongoose';

/**
 * GET /api/customer-invoices/[customerId]
 * Public endpoint - Fetch all invoices for a customer
 * Returns all purchases/invoices for a specific customer
 * Used by customer to view their order history and invoice details
 */
export async function GET(req, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const customerId = resolvedParams?.customerId?.toString()?.trim();

    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      return NextResponse.json(
        { message: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    const customerObjectId = new mongoose.Types.ObjectId(customerId);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const status = searchParams.get('status'); // Optional: filter by status (Finalized, Draft, etc)
    const type = searchParams.get('type'); // Optional: filter by type (Invoice, Estimate, etc)

    // Validate customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Build query
    let query = { customerId: customerObjectId };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.invoiceType = type;
    }

    // Only show finalized invoices in public view for security
    // Admin can see all via /api/invoices
    query.status = 'Finalized';

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch invoices
    const invoices = await Invoice.find(query)
      .select(
        'invoiceNumber invoiceType totalAmount amountPaid amountPending status createdAt items customerId'
      )
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    // Get total count
    const total = await Invoice.countDocuments(query);

    // Calculate summary
    const summaryData = await Invoice.aggregate([
        {
          $match: {
            customerId: customerObjectId,
            status: query.status,
            ...(query.invoiceType ? { invoiceType: query.invoiceType } : {}),
          },
        },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$amountPaid' },
          totalPending: { $sum: '$amountPending' },
        },
      },
    ]);

    const summary = summaryData[0] || {
      totalInvoices: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalPending: 0,
    };

    // Format response
    const formattedInvoices = invoices.map((invoice) => ({
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.invoiceType,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      amountPending: invoice.amountPending,
      status: invoice.status,
      date: invoice.createdAt,
      itemCount: invoice.items?.length || 0,
      // Unique invoice link for viewing details
      invoiceLink: `/customer-invoice/${customerId}/${invoice._id}`,
    }));

    return NextResponse.json({
      customer: {
        id: customer._id,
        name: customer.name,
        mobileNumber: customer.mobileNumber,
        email: customer.email,
      },
      invoices: formattedInvoices,
      summary,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get customer invoices error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch customer invoices' },
      { status: 500 }
    );
  }
}
