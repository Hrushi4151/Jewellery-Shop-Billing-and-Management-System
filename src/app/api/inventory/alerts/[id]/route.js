import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import StockAlert from '@/models/StockAlert';
import mongoose from 'mongoose';

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const resolvedParams = await params;
    const alertId = resolvedParams?.id;

    if (!alertId || !mongoose.Types.ObjectId.isValid(alertId)) {
      return NextResponse.json({ message: 'Invalid alert ID' }, { status: 400 });
    }

    const { action } = await req.json();

    if (action === 'acknowledge') {
      const alert = await StockAlert.findByIdAndUpdate(
        alertId,
        {
          status: 'Acknowledged',
          acknowledgedAt: new Date(),
        },
        { new: true }
      );

      return NextResponse.json({ alert, message: 'Alert acknowledged' });
    }

    if (action === 'resolve') {
      const alert = await StockAlert.findByIdAndUpdate(
        alertId,
        { status: 'Resolved' },
        { new: true }
      );

      return NextResponse.json({ alert, message: 'Alert resolved' });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Update alert error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
