import mongoose from 'mongoose';

const metalRateHistorySchema = new mongoose.Schema(
  {
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    source: {
      type: String,
      enum: ['manual', 'api'],
      default: 'manual',
    },
    rates: {
      gold: { type: Number, default: 0 },
      silver: { type: Number, default: 0 },
      platinum: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

metalRateHistorySchema.index({ recordedAt: -1 });

export default mongoose.models.MetalRateHistory ||
  mongoose.model('MetalRateHistory', metalRateHistorySchema);
