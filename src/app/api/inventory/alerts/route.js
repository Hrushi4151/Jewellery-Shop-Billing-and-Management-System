import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import StockAlert from '@/models/StockAlert';
import mongoose from 'mongoose';

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'Active';
    const alertType = searchParams.get('type');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    let query = { status };
    if (alertType) query.alertType = alertType;

    const alerts = await StockAlert.find(query)
      .populate('productId', 'itemName metal purity weight')
      .populate('acknowledgedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await StockAlert.countDocuments(query);

    const summary = await StockAlert.aggregate([
      { $match: { status } },
      {
        $group: {
          _id: '$alertType',
          count: { $sum: 1 },
        },
      },
    ]);

    return NextResponse.json({
      alerts,
      summary,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get stock alerts error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const { productId, alertType, currentLevel, threshold, notificationChannels } = await req.json();

    const alert = await StockAlert.findOneAndUpdate(
      { productId, alertType, status: 'Active' },
      {
        currentLevel,
        threshold,
        notificationChannels,
      },
      { new: true, upsert: true }
    ).populate('productId');

    return NextResponse.json({ alert, message: 'Alert created/updated' });
  } catch (error) {
    console.error('Create stock alert error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
