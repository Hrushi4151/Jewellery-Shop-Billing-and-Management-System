import mongoose from 'mongoose';

const smsVerificationSchema = new mongoose.Schema(
  {
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-delete expired verification codes
smsVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
smsVerificationSchema.index({ mobileNumber: 1 });

export default mongoose.models.SMSVerification ||
  mongoose.model('SMSVerification', smsVerificationSchema);
