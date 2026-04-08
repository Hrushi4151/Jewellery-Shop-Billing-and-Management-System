import mongoose from 'mongoose';

const stockAdjustmentSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    adjustmentType: {
      type: String,
      enum: ['Restock', 'Sale', 'Damage', 'Return', 'Adjustment', 'Inventory_Check'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    reason: String,
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    previousQuantity: Number,
    newQuantity: Number,
    notes: String,
    referenceNumber: String,
    invoiceId: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);

stockAdjustmentSchema.index({ productId: 1, createdAt: -1 });
stockAdjustmentSchema.index({ adjustmentType: 1, createdAt: -1 });

export default mongoose.models.StockAdjustment ||
  mongoose.model('StockAdjustment', stockAdjustmentSchema);
