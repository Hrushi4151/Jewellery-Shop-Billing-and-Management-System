import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide payment amount'],
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'NetBanking', 'Cheque', 'Other'],
      required: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    description: String,
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Failed', 'Cancelled'],
      default: 'Confirmed',
    },
    notes: String,
  },
  { timestamps: true }
);

// Index for efficient queries
paymentSchema.index({ invoiceId: 1, createdAt: -1 });
paymentSchema.index({ customerId: 1 });

export default mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
