import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
    },
    sku: {
      type: String,
      unique: true,
      trim: true,
    },
    description: String,
    category: {
      type: String,
      enum: ['Ring', 'Necklace', 'Bracelet', 'Earring', 'Anklet', 'Pendant', 'Chain', 'Other'],
      default: 'Other',
    },
    purity: {
      type: String,
      enum: ['22K', '18K', '14K', '10K'],
      default: '22K',
    },
    weight: {
      type: Number,
      required: [true, 'Please provide weight in grams'],
    },
    metalType: {
      type: String,
      enum: ['Gold', 'Silver', 'Platinum', 'Mixed'],
      default: 'Gold',
    },
    stoneDetails: {
      hasStone: Boolean,
      stoneType: String,
      stoneWeight: Number,
      stonePrice: Number,
    },
    stock: {
      type: Number,
      default: 0,
    },
    goldRate: {
      type: Number,
      default: 0,
    },
    makingCharges: {
      type: Number,
      required: [true, 'Please provide making charges'],
    },
    makingChargeType: {
      type: String,
      enum: ['Fixed', 'Percentage', 'PerGram'],
      default: 'Fixed',
    },
    basePrice: {
      type: Number,
    },
    totalPrice: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Calculate total price before saving
productSchema.pre('save', function (next) {
  const metalPrice = this.weight * this.goldRate;
  const stonePrice = this.stoneDetails?.stonePrice || 0;
  
  let chargesToAdd = this.makingCharges;
  if (this.makingChargeType === 'Percentage') {
    chargesToAdd = (metalPrice * this.makingCharges) / 100;
  } else if (this.makingChargeType === 'PerGram') {
    chargesToAdd = this.weight * this.makingCharges;
  }
  
  this.basePrice = metalPrice + stonePrice;
  this.totalPrice = this.basePrice + chargesToAdd;
  next();
});

export default mongoose.models.Product || mongoose.model('Product', productSchema);
