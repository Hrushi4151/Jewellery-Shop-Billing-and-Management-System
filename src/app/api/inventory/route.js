import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Inventory from '@/models/Inventory';
import Product from '@/models/Product';
import mongoose from 'mongoose';

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;

    const inventory = await Inventory.find(query)
      .populate('productId', 'itemName metal purity weight')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Inventory.countDocuments(query);

    const summary = await Inventory.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$valuationCost' },
        },
      },
    ]);

    return NextResponse.json({
      inventory,
      summary,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();

    const { productId, quantity, minStockLevel, maxStockLevel, reorderQuantity, location } =
      await req.json();

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ message: 'Invalid product ID' }, { status: 400 });
    }

    const status = quantity === 0 ? 'OutOfStock' : quantity <= minStockLevel ? 'LowStock' : 'InStock';

    const inventory = await Inventory.findOneAndUpdate(
      { productId },
      {
        quantity,
        minStockLevel: minStockLevel || 5,
        maxStockLevel: maxStockLevel || 100,
        reorderQuantity: reorderQuantity || 20,
        location,
        status,
      },
      { new: true, upsert: true }
    ).populate('productId');

    return NextResponse.json({ inventory, message: 'Inventory updated successfully' });
  } catch (error) {
    console.error('Update inventory error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const {
      productId,
      quantity,
      minStockLevel = 5,
      maxStockLevel = 100,
      reorderQuantity = 20,
      location = 'Main Store',
    } = await req.json();

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ message: 'Invalid product ID' }, { status: 400 });
    }

    if (quantity === undefined) {
      return NextResponse.json({ message: 'Quantity is required' }, { status: 400 });
    }

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    // Check if inventory exists
    let inventory = await Inventory.findOne({ productId });

    const status = quantity === 0 ? 'OutOfStock' : quantity <= minStockLevel ? 'LowStock' : 'InStock';

    if (inventory) {
      // Update existing
      inventory.quantity = quantity;
      inventory.minStockLevel = minStockLevel;
      inventory.maxStockLevel = maxStockLevel;
      inventory.reorderQuantity = reorderQuantity;
      inventory.location = location;
      inventory.status = status;
      await inventory.save();
    } else {
      // Create new
      inventory = new Inventory({
        productId,
        quantity,
        minStockLevel,
        maxStockLevel,
        reorderQuantity,
        location,
        status,
      });
      await inventory.save();
    }

    await inventory.populate('productId', 'itemName metal purity weight');

    return NextResponse.json({
      inventory,
      message: 'Inventory record created/updated successfully',
    });
  } catch (error) {
    console.error('Create inventory error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
