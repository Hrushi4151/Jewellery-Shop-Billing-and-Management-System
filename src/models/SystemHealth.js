import mongoose from 'mongoose';

const systemHealthSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metrics: {
      cpuUsage: {
        type: Number,
        description: 'CPU usage percentage',
      },
      memoryUsage: {
        type: Number,
        description: 'Memory usage in MB',
      },
      memoryAvailable: {
        type: Number,
        description: 'Available memory in MB',
      },
      uptime: {
        type: Number,
        description: 'Server uptime in seconds',
      },
      activeConnections: {
        type: Number,
        description: 'Active database connections',
      },
      requestsPerSecond: {
        type: Number,
        description: 'Average requests per second',
      },
      responseTimeMs: {
        type: Number,
        description: 'Average response time in ms',
      },
    },
    databaseStatus: {
      connected: Boolean,
      latencyMs: Number,
      lastCheck: Date,
    },
    storageStatus: {
      totalSize: Number,
      usedSize: Number,
      percentageUsed: Number,
    },
    alerts: [
      {
        level: {
          type: String,
          enum: ['Info', 'Warning', 'Critical'],
        },
        message: String,
        timestamp: Date,
      },
    ],
    status: {
      type: String,
      enum: ['Healthy', 'Degraded', 'Critical'],
      default: 'Healthy',
    },
  },
  { timestamps: true }
);

systemHealthSchema.index({ timestamp: -1 });

export default mongoose.models.SystemHealth ||
  mongoose.model('SystemHealth', systemHealthSchema);
