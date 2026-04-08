import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import BackupLog from '@/models/BackupLog';

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    const backups = await BackupLog.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await BackupLog.countDocuments();

    const completedBackups = await BackupLog.countDocuments({ status: 'Completed' });

    return NextResponse.json({
      backups,
      stats: {
        total,
        completed: completedBackups,
        pending: await BackupLog.countDocuments({ status: 'Pending' }),
        failed: await BackupLog.countDocuments({ status: 'Failed' }),
      },
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get backups error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const { backupType = 'Full', notes } = await req.json();

    const backupName = `backup_${backupType}_${new Date().toISOString().split('T')[0]}`;

    const backup = new BackupLog({
      backupName,
      backupType,
      status: 'Pending',
      collections: ['Invoice', 'Customer', 'Product', 'Payment', 'Settings'],
      notes,
    });

    await backup.save();

    return NextResponse.json(
      { backup, message: 'Backup initiated successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create backup error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
