import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Settings from '@/models/Settings';

export async function GET() {
  try {
    await connectDB();

    const settings = await Settings.findOne({});

    if (!settings) {
      return NextResponse.json(
        { message: 'Settings not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    await connectDB();

    const payload = await req.json();
    const updateData = {};

    if (typeof payload.shopName === 'string') updateData.shopName = payload.shopName.trim();
    if (typeof payload.shopAddress === 'string') updateData.shopAddress = payload.shopAddress.trim();
    if (typeof payload.shopPhone === 'string') updateData.shopPhone = payload.shopPhone.trim();
    if (typeof payload.shopEmail === 'string') updateData.shopEmail = payload.shopEmail.trim();
    if (typeof payload.shopGSTIN === 'string') updateData.shopGSTIN = payload.shopGSTIN.trim();
    if (typeof payload.shopLogo === 'string') updateData.shopLogo = payload.shopLogo.trim();

    if (payload.companyDetails && typeof payload.companyDetails === 'object') {
      updateData.companyDetails = {
        cin: payload.companyDetails.cin?.trim?.() || '',
        pan: payload.companyDetails.pan?.trim?.() || '',
        bankName: payload.companyDetails.bankName?.trim?.() || '',
        bankAccount: payload.companyDetails.bankAccount?.trim?.() || '',
        ifscCode: payload.companyDetails.ifscCode?.trim?.() || '',
      };
    }

    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
