import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Admin from '@/models/Admin';
import Settings from '@/models/Settings';

/**
 * POST /api/setup
 * Initialize admin user and default settings
 * 
 * Security: This endpoint should only be called once during initial setup
 * For production: Protect this with an API key or remove after first use
 */
export async function POST(req) {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({});
    
    if (existingAdmin) {
      return NextResponse.json(
        {
          message: 'System already initialized. Admin user exists.',
          email: existingAdmin.email,
          note: 'If you need to reset, use login credentials or contact support.',
        },
        { status: 400 }
      );
    }

    // Create default admin from environment variables
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
      isActive: true,
    };

    // Create and save admin (password will be hashed by schema)
    const admin = new Admin(adminData);
    await admin.save();

    // Create default settings
    const settings = new Settings({
      shopName: 'Laxmi Alankar',
      currentGoldRate: 6800,
      goldRateLastUpdated: new Date(),
      silverRate: 75,
      platinumRate: 4500,
    });
    await settings.save();

    return NextResponse.json(
      {
        message: 'System initialized successfully!',
        admin: {
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
        settings: {
          shopName: settings.shopName,
          currentGoldRate: settings.currentGoldRate,
        },
        instructions: [
          '1. Login with provided credentials',
          '2. Change password after first login',
          '3. Update settings with your shop details',
          '4. Start adding customers and products',
        ],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Setup error:', error);

    // Handle duplicate email error
    if (error.code === 11000) {
      return NextResponse.json(
        {
          message: 'Email already exists. Admin user may already be created.',
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: 'Setup failed',
        error: error.message,
        details: 'Check that MongoDB is connected and environment variables are set',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/setup
 * Check if system is initialized
 */
export async function GET(req) {
  try {
    await connectDB();

    const adminExists = await Admin.findOne({});
    const settingsExist = await Settings.findOne({});

    return NextResponse.json(
      {
        initialized: !!(adminExists && settingsExist),
        adminExists: !!adminExists,
        settingsExist: !!settingsExist,
        status: adminExists && settingsExist ? 'Ready' : 'Setup Required',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        initialized: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
