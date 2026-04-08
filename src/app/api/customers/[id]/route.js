import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Customer from '@/models/Customer';
import Invoice from '@/models/Invoice';
import { Types } from 'mongoose';

export async function GET(req, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const id = resolvedParams?.id?.toString()?.trim();

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get customer invoices
    const invoices = await Invoice.find({ customerId: id })
      .sort({ createdAt: -1 })
      .limit(10);

    return NextResponse.json({
      customer,
      recentInvoices: invoices,
    });
  } catch (error) {
    console.error('Get customer error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const id = resolvedParams?.id?.toString()?.trim();
    const updateData = await req.json();

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    // Check if mobile number is being changed
    if (updateData.mobileNumber) {
      const existingCustomer = await Customer.findOne({
        mobileNumber: updateData.mobileNumber,
        _id: { $ne: id },
      });

      if (existingCustomer) {
        return NextResponse.json(
          { message: 'Customer with this mobile number already exists' },
          { status: 400 }
        );
      }
    }

    const customer = await Customer.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!customer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Customer updated successfully',
      customer,
    });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update customer' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const id = resolvedParams?.id?.toString()?.trim();

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: 'Invalid customer ID' },
        { status: 400 }
      );
    }

    // Check if customer has any invoices
    const invoiceCount = await Invoice.countDocuments({ customerId: id });

    if (invoiceCount > 0) {
      return NextResponse.json(
        { message: `Cannot delete customer with ${invoiceCount} associated invoice(s)` },
        { status: 400 }
      );
    }

    const customer = await Customer.findByIdAndDelete(id);

    if (!customer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Customer deleted successfully',
      customer,
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json(
      { message: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
