import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Invoice from '@/models/Invoice';
import { Types } from 'mongoose';

export async function GET(req, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    const invoice = await Invoice.findById(id)
      .populate('customerId', 'name mobileNumber email address');

    if (!invoice) {
      return NextResponse.json(
        { message: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const id = resolvedParams?.id;
    const updateData = await req.json();

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return NextResponse.json(
        { message: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice is locked (finalized)
    if (invoice.isLocked && invoice.status === 'Finalized') {
      return NextResponse.json(
        { message: 'Cannot edit finalized invoice' },
        { status: 400 }
      );
    }

    // Update allowed fields only
    const allowedUpdates = ['notes', 'discount', 'discountType', 'status'];
    allowedUpdates.forEach((field) => {
      if (field in updateData) {
        invoice[field] = updateData[field];
      }
    });

    await invoice.save();

    return NextResponse.json({
      message: 'Invoice updated successfully',
      invoice,
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    return NextResponse.json(
      { message: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid invoice ID' },
        { status: 400 }
      );
    }

    const invoice = await Invoice.findByIdAndUpdate(
      id,
      { status: 'Cancelled', isLocked: true },
      { new: true }
    );

    if (!invoice) {
      return NextResponse.json(
        { message: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Invoice cancelled successfully',
      invoice,
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return NextResponse.json(
      { message: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
