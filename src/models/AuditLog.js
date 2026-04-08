import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'invoice.created',
        'invoice.updated',
        'invoice.deleted',
        'invoice.finalized',
        'payment.added',
        'payment.updated',
        'customer.created',
        'customer.updated',
        'product.created',
        'product.updated',
        'settings.updated',
        'user.login',
        'user.logout',
      ],
    },
    resourceType: {
      type: String,
      enum: ['Invoice', 'Payment', 'Customer', 'Product', 'Settings', 'User'],
      required: true,
    },
    resourceId: mongoose.Schema.Types.ObjectId,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    performedByName: String,
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    reason: String,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

// Index for efficient queries
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
