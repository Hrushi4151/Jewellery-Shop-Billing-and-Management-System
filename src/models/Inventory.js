import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStockLevel: {
      type: Number,
      default: 5,
      description: 'Quantity threshold for low stock alerts',
    },
    maxStockLevel: {
      type: Number,
      default: 100,
      description: 'Maximum recommended stock level',
    },
    reorderQuantity: {
      type: Number,
      default: 20,
      description: 'Recommended quantity to reorder',
    },
    lastRestocked: Date,
    valuationCost: {
      type: Number,
      default: 0,
      description: 'Total value of current stock',
    },
    status: {
      type: String,
      enum: ['InStock', 'LowStock', 'OutOfStock'],
      default: 'InStock',
    },
    location: {
      type: String,
      description: 'Physical location/shelf in warehouse',
    },
  },
  { timestamps: true }
);

inventorySchema.index({ productId: 1 });
inventorySchema.index({ status: 1 });

export default mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);
