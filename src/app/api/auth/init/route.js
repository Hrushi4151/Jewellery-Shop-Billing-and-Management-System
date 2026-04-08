import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Admin from '@/models/Admin';
import Settings from '@/models/Settings';

export async function POST(req) {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });

    if (existingAdmin) {
      return NextResponse.json(
        { message: 'Admin user already exists' },
        { status: 400 }
      );
    }

    // Create default admin
    const adminData = {
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@laxmialankar.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'Admin',
      permissions: [
        'invoice.create',
        'invoice.view',
        'invoice.edit',
        'invoice.delete',
        'customer.create',
        'customer.view',
        'customer.edit',
        'customer.delete',
        'product.create',
        'product.view',
        'product.edit',
        'product.delete',
        'reports.view',
        'settings.manage',
        'users.manage',
      ],
    };

    const admin = new Admin(adminData);
    await admin.save();

    // Create default settings
    const settings = new Settings({
      shopName: 'Laxmi Alankar',
      currentGoldRate: 6800, // Default gold rate per gram
      goldRateLastUpdated: new Date(),
      silverRate: 75,
      platinumRate: 4500,
    });
    await settings.save();

    return NextResponse.json(
      {
        message: 'System initialized successfully',
        admin: {
          email: admin.email,
          name: admin.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json(
      { message: error.message || 'Initialization failed' },
      { status: 500 }
    );
  }
}
