import mongoose from 'mongoose';

const stockAlertSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    alertType: {
      type: String,
      enum: ['LowStock', 'OutOfStock', 'OverStock'],
      required: true,
    },
    currentLevel: Number,
    threshold: Number,
    status: {
      type: String,
      enum: ['Active', 'Acknowledged', 'Resolved'],
      default: 'Active',
    },
    acknowledgedBy: mongoose.Schema.Types.ObjectId,
    acknowledgedAt: Date,
    notificationSent: {
      type: Boolean,
      default: false,
    },
    notificationChannels: [
      {
        type: String,
        enum: ['SMS', 'Email', 'Dashboard'],
      },
    ],
  },
  { timestamps: true }
);

stockAlertSchema.index({ productId: 1, status: 1 });
stockAlertSchema.index({ alertType: 1, createdAt: -1 });

export default mongoose.models.StockAlert || mongoose.model('StockAlert', stockAlertSchema);
