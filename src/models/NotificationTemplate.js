import mongoose from 'mongoose';

const notificationTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['SMS', 'Email', 'Both'],
      default: 'SMS',
    },
    category: {
      type: String,
      enum: [
        'LowStockAlert',
        'OrderConfirmation',
        'PaymentReminder',
        'InvoiceNotification',
        'CustomerUpdate',
        'SystemAlert',
      ],
      required: true,
    },
    smsContent: {
      type: String,
      description: 'SMS template with placeholders like {productName}, {quantity}',
    },
    emailSubject: String,
    emailContent: String,
    emailHtml: String,
    placeholders: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: mongoose.Schema.Types.ObjectId,
    lastModifiedBy: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
);

export default mongoose.models.NotificationTemplate ||
  mongoose.model('NotificationTemplate', notificationTemplateSchema);
