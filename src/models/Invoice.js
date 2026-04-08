import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  isManual: {
    type: Boolean,
    default: false,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  itemName: String,
  productName: String,
  metal: {
    type: String,
    default: 'gold',
  },
  weight: Number,
  purity: String,
  goldRate: Number,
  stoneDetails: mongoose.Schema.Types.Mixed,
  metalPrice: Number,
  stonePrice: Number,
  makingCharges: Number,
  makingChargeType: {
    type: String,
    default: 'Fixed',
  },
  subtotal: Number,
  quantity: {
    type: Number,
    default: 1,
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    customerName: String,
    customerMobile: String,
    customerEmail: String,
    customerAddress: mongoose.Schema.Types.Mixed,
    invoiceType: {
      type: String,
      enum: ['Invoice', 'Estimate', 'ReturnInvoice', 'ExchangeInvoice'],
      default: 'Invoice',
    },
    items: [invoiceItemSchema],
    exchange: {
      items: [
        {
          description: String,
          metal: String,
          weight: Number,
          purity: String,
          deductionPercent: Number,
          exchangeValue: Number,
        },
      ],
      totalDeduction: {
        type: Number,
        default: 0,
      },
    },
    goldRate: {
      type: Number,
      required: true,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ['Fixed', 'Percentage'],
      default: 'Fixed',
    },
    discountedAmount: {
      type: Number,
      default: 0,
    },
    gstType: {
      type: String,
      enum: ['CGST/SGST', 'IGST'],
      default: 'CGST/SGST',
    },
    cgst: {
      type: Number,
      default: 0,
    },
    sgst: {
      type: Number,
      default: 0,
    },
    igst: {
      type: Number,
      default: 0,
    },
    totalGST: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    amountPending: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'PartialPaid', 'Paid'],
      default: 'Pending',
    },
    status: {
      type: String,
      enum: ['Draft', 'Finalized', 'Cancelled', 'Returned'],
      default: 'Draft',
    },
    notes: String,
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedBy: mongoose.Schema.Types.ObjectId,
    lockedAt: Date,
    estimateConvertedFrom: mongoose.Schema.Types.ObjectId,
    relatedInvoices: [mongoose.Schema.Types.ObjectId],
  },
  { timestamps: true }
);

// Create compound index for efficient querying
invoiceSchema.index({ customerId: 1, createdAt: -1 });

export default mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
