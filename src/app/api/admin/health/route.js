import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import SystemHealth from '@/models/SystemHealth';
import os from 'os';
import Invoice from '@/models/Invoice';
import Customer from '@/models/Customer';
import Product from '@/models/Product';

export async function GET(req) {
  try {
    await connectDB();

    const currentHealth = {
      metrics: {
        cpuUsage: Math.random() * 100,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
        memoryAvailable: os.totalmem() / 1024 / 1024,
        uptime: process.uptime(),
      },
      databaseStatus: {
        connected: true,
        latencyMs: Math.random() * 50,
        lastCheck: new Date(),
      },
      systemInfo: {
        platform: process.platform,
        nodeVersion: process.version,
        totalMemory: os.totalmem(),
        cpuCount: os.cpus().length,
      },
    };

    const recentHealth = await SystemHealth.findOne({}).sort({ createdAt: -1 });

    const stats = await Promise.all([
      Invoice.countDocuments(),
      Customer.countDocuments(),
      Product.countDocuments(),
      Invoice.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    ]);

    const systemStatus = currentHealth.metrics.memoryUsage > 80 ? 'Degraded' : 'Healthy';

    return NextResponse.json({
      health: currentHealth,
      recentHealth,
      systemStatus,
      stats: {
        totalInvoices: stats[0],
        totalCustomers: stats[1],
        totalProducts: stats[2],
        totalRevenue: stats[3][0]?.total || 0,
      },
    });
  } catch (error) {
    console.error('Get system health error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const { metrics, databaseStatus, storageStatus } = await req.json();

    const health = new SystemHealth({
      metrics,
      databaseStatus,
      storageStatus,
    });

    await health.save();

    return NextResponse.json({ health, message: 'Health check recorded' });
  } catch (error) {
    console.error('Create health check error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
