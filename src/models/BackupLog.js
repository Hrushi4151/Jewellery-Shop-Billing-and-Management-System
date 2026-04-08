import mongoose from 'mongoose';

const backupLogSchema = new mongoose.Schema(
  {
    backupName: {
      type: String,
      required: true,
      unique: true,
    },
    backupType: {
      type: String,
      enum: ['Full', 'Incremental', 'Differential'],
      default: 'Full',
    },
    status: {
      type: String,
      enum: ['Pending', 'InProgress', 'Completed', 'Failed'],
      default: 'Pending',
    },
    startTime: Date,
    endTime: Date,
    duration: {
      type: Number,
      description: 'Duration in milliseconds',
    },
    size: {
      type: Number,
      description: 'Backup size in bytes',
    },
    location: {
      type: String,
      description: 'Storage location or path',
    },
    collections: [String],
    recordCount: Number,
    checksum: String,
    recoverable: {
      type: Boolean,
      default: true,
    },
    errorMessage: String,
    createdBy: mongoose.Schema.Types.ObjectId,
    notes: String,
  },
  { timestamps: true }
);

backupLogSchema.index({ status: 1, createdAt: -1 });
backupLogSchema.index({ backupType: 1 });

export default mongoose.models.BackupLog || mongoose.model('BackupLog', backupLogSchema);
