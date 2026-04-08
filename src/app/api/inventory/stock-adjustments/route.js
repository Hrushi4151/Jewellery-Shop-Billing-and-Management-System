import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import StockAdjustment from '@/models/StockAdjustment';
import Inventory from '@/models/Inventory';
import mongoose from 'mongoose';

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const adjustmentType = searchParams.get('type');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    let query = {};
    if (productId && mongoose.Types.ObjectId.isValid(productId)) query.productId = productId;
    if (adjustmentType) query.adjustmentType = adjustmentType;

    const adjustments = await StockAdjustment.find(query)
      .populate('productId', 'itemName metal purity')
      .populate('adjustedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await StockAdjustment.countDocuments(query);

    return NextResponse.json({
      adjustments,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get stock adjustments error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const { productId, adjustmentType, quantity, reason, notes, invoiceId } = await req.json();

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ message: 'Invalid product ID' }, { status: 400 });
    }

    const inventory = await Inventory.findOne({ productId });
    if (!inventory) {
      return NextResponse.json({ message: 'Product inventory not found' }, { status: 404 });
    }

    const previousQuantity = inventory.quantity;
    let newQuantity = previousQuantity;

    if (adjustmentType === 'Sale' || adjustmentType === 'Damage') {
      newQuantity -= quantity;
    } else if (adjustmentType === 'Restock' || adjustmentType === 'Return') {
      newQuantity += quantity;
    } else {
      newQuantity = quantity;
    }

    newQuantity = Math.max(0, newQuantity);

    const adjustment = new StockAdjustment({
      productId,
      adjustmentType,
      quantity: adjustmentType === 'Sale' || adjustmentType === 'Damage' ? -quantity : quantity,
      reason,
      previousQuantity,
      newQuantity,
      notes,
      invoiceId,
    });

    await adjustment.save();

    const status = newQuantity === 0 ? 'OutOfStock' : newQuantity <= inventory.minStockLevel ? 'LowStock' : 'InStock';

    await Inventory.updateOne({ productId }, { quantity: newQuantity, status, lastRestocked: new Date() });

    return NextResponse.json({
      adjustment: await adjustment.populate('productId'),
      message: 'Stock adjusted successfully',
    });
  } catch (error) {
    console.error('Create stock adjustment error:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
