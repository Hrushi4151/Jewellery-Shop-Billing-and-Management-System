import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      default: 'Laxmi Alankar',
    },
    shopAddress: String,
    shopState: {
      type: String,
      default: 'Maharashtra',
      description: 'State for GST calculation (CGST+SGST vs IGST)',
    },
    shopPhone: String,
    shopEmail: String,
    shopGSTIN: String,
    shopLogo: String,

    // Metal rates by purity
    metalRates: {
      gold: {
        purity22K: { type: Number, default: 0 },
        purity18K: { type: Number, default: 0 },
        purity14K: { type: Number, default: 0 },
        purity10K: { type: Number, default: 0 },
      },
      silver: {
        purity999: { type: Number, default: 0 },
        purity925: { type: Number, default: 0 },
      },
      platinum: {
        purity950: { type: Number, default: 0 },
        purity900: { type: Number, default: 0 },
      },
    },

    // Legacy fields (kept for backward compatibility)
    currentGoldRate: {
      type: Number,
      required: [true, 'Please provide current gold rate'],
    },
    goldRateLastUpdated: Date,
    silverRate: Number,
    platinumRate: Number,

    // API-based rate fetching
    rateApiConfig: {
      enabled: { type: Boolean, default: false },
      apiProvider: { type: String, enum: ['manual', 'goldapi', 'metals.live', 'custom'], default: 'manual' },
      apiKey: String,
      apiEndpoint: String,
      lastFetchedAt: Date,
      autoUpdateInterval: { type: Number, default: 0, description: 'Minutes (0 = disabled)' },
    },

    // Rate conversion factors for different purities
    purityFactors: {
      gold: {
        purity22K: { type: Number, default: 0.9167 }, // 22/24
        purity18K: { type: Number, default: 0.75 },    // 18/24
        purity14K: { type: Number, default: 0.5833 },  // 14/24
        purity10K: { type: Number, default: 0.4167 },  // 10/24
      },
      silver: {
        purity999: { type: Number, default: 0.999 },
        purity925: { type: Number, default: 0.925 },
      },
      platinum: {
        purity950: { type: Number, default: 0.95 },
        purity900: { type: Number, default: 0.9 },
      },
    },

    gstRate: {
      cgst: {
        type: Number,
        default: 1.5,
      },
      sgst: {
        type: Number,
        default: 1.5,
      },
      igst: {
        type: Number,
        default: 3,
      },
    },
    invoiceNumberFormat: {
      type: String,
      default: 'INV/YYYY/NNNN',
      description: 'Format: YYYY = Year, NNNN = Auto-increment number',
    },
    lastInvoiceNumber: {
      type: Number,
      default: 0,
    },
    invoiceNumberCounter: {
      currentYear: Number,
      counter: Number,
    },
    emailNotifications: {
      enabled: Boolean,
      fromEmail: String,
    },
    smsNotifications: {
      enabled: Boolean,
      apiKey: String,
    },
    companyDetails: {
      cin: String,
      pan: String,
      bankName: String,
      bankAccount: String,
      ifscCode: String,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
