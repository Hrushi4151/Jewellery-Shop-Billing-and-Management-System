import connectDB from '../src/lib/mongoose.js';
import Invoice from '../src/models/Invoice.js';
import Payment from '../src/models/Payment.js';
import Customer from '../src/models/Customer.js';
import mongoose from 'mongoose';

async function reconcile() {
  await connectDB();

  const invoices = await Invoice.find({}).select('_id customerId totalAmount').lean();

  for (const invoice of invoices) {
    const agg = await Payment.aggregate([
      {
        $match: {
          invoiceId: new mongoose.Types.ObjectId(invoice._id.toString()),
          status: 'Confirmed',
        },
      },
      {
        $group: {
          _id: null,
          paid: { $sum: '$amount' },
        },
      },
    ]);

    const paid = Math.min(agg[0]?.paid || 0, invoice.totalAmount || 0);
    const pending = Math.max(0, (invoice.totalAmount || 0) - paid);

    let paymentStatus = 'Pending';
    if (pending === 0) paymentStatus = 'Paid';
    else if (paid > 0) paymentStatus = 'PartialPaid';

    await Invoice.updateOne(
      { _id: invoice._id },
      {
        amountPaid: parseFloat(paid.toFixed(2)),
        amountPending: parseFloat(pending.toFixed(2)),
        paymentStatus,
      }
    );
  }

  const customers = await Customer.find({}).select('_id').lean();

  for (const customer of customers) {
    const totals = await Invoice.aggregate([
      {
        $match: {
          customerId: new mongoose.Types.ObjectId(customer._id.toString()),
        },
      },
      {
        $group: {
          _id: null,
          totalPurchase: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$amountPaid' },
          totalPending: { $sum: '$amountPending' },
        },
      },
    ]);

    const row = totals[0] || { totalPurchase: 0, totalPaid: 0, totalPending: 0 };

    await Customer.updateOne(
      { _id: customer._id },
      {
        totalPurchase: parseFloat((row.totalPurchase || 0).toFixed(2)),
        totalPaid: parseFloat((row.totalPaid || 0).toFixed(2)),
        totalPending: parseFloat((row.totalPending || 0).toFixed(2)),
      }
    );
  }

  console.log('Payment reconciliation complete');
  process.exit(0);
}

reconcile().catch((error) => {
  console.error('Reconciliation failed:', error);
  process.exit(1);
});
