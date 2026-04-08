import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Customer from '@/models/Customer';
import SMSVerification from '@/models/SMSVerification';
import Invoice from '@/models/Invoice';

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const mobile = searchParams.get('mobile');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    let query = {};

    // Search by mobile number
    if (mobile) {
      query.mobileNumber = new RegExp(mobile, 'i');
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { mobileNumber: new RegExp(search, 'i') },
      ];
    }

    const skip = (page - 1) * limit;
    const customers = await Customer.find(query)
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Customer.countDocuments(query);

    return NextResponse.json({
      customers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const { name, mobileNumber, email, address } = await req.json();

    // Validate required fields
    if (!name || !mobileNumber) {
      return NextResponse.json(
        { message: 'Name and mobile number are required' },
        { status: 400 }
      );
    }

    // Clean and format mobile number
    const cleanedNumber = mobileNumber.replace(/\D/g, '').slice(-10);
    const formattedNumber = '+91' + cleanedNumber;

    // Check if mobile was verified via SMS
    const verification = await SMSVerification.findOne({
      mobileNumber: formattedNumber,
      isVerified: true,
    });

    if (!verification) {
      return NextResponse.json(
        {
          message: 'Mobile number must be verified first. Please complete SMS verification.',
          requiresVerification: true,
          mobileNumber: formattedNumber,
        },
        { status: 400 }
      );
    }

    // Check if customer with same mobile already exists
    const existingCustomer = await Customer.findOne({
      mobileNumber: formattedNumber,
    });
    if (existingCustomer) {
      return NextResponse.json(
        { message: 'Customer with this mobile number already exists' },
        { status: 400 }
      );
    }

    // Create new customer
    const customer = new Customer({
      name,
      mobileNumber: formattedNumber,
      email,
      address,
    });

    await customer.save();

    // Clean up verification record after successful customer creation
    await SMSVerification.deleteOne({ _id: verification._id });

    return NextResponse.json(
      {
        message: 'Customer created successfully',
        customer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create customer' },
      { status: 500 }
    );
  }
}
