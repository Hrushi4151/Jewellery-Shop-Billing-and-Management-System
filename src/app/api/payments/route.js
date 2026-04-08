import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';
import Customer from '@/models/Customer';
import mongoose from 'mongoose';
import { sendSMSNotification, generatePaymentSMS } from '@/lib/smsService';
import { sendCallNotification, generatePaymentCall } from '@/lib/whatsappService';

const normalizeMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const recalculateInvoiceAndCustomer = async (invoiceId, customerId) => {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    return null;
  }

  const paymentAgg = await Payment.aggregate([
    {
      $match: {
        invoiceId: new mongoose.Types.ObjectId(invoiceId.toString()),
        status: 'Confirmed',
      },
    },
    {
      $group: {
        _id: null,
        totalConfirmedPaid: { $sum: '$amount' },
      },
    },
  ]);

  const totalConfirmedPaid = paymentAgg[0]?.totalConfirmedPaid || 0;
  const normalizedTotal = normalizeMoney(invoice.totalAmount);
  const normalizedPaid = normalizeMoney(Math.min(totalConfirmedPaid, normalizedTotal));
  const normalizedPending = Math.max(0, normalizeMoney(normalizedTotal - normalizedPaid));

  invoice.amountPaid = normalizedPaid;
  invoice.amountPending = normalizedPending;

  if (normalizedPending <= 0.01) {
    invoice.amountPaid = normalizedTotal;
    invoice.amountPending = 0;
    invoice.paymentStatus = 'Paid';
  } else if (normalizedPaid > 0) {
    invoice.paymentStatus = 'PartialPaid';
  } else {
    invoice.paymentStatus = 'Pending';
  }

  await invoice.save();

  if (customerId) {
    const invoiceTotals = await Invoice.aggregate([
      {
        $match: {
          customerId: new mongoose.Types.ObjectId(customerId.toString()),
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

    const totals = invoiceTotals[0] || {
      totalPurchase: 0,
      totalPaid: 0,
      totalPending: 0,
    };

    await Customer.findByIdAndUpdate(customerId, {
      totalPurchase: normalizeMoney(totals.totalPurchase),
      totalPaid: normalizeMoney(totals.totalPaid),
      totalPending: normalizeMoney(totals.totalPending),
    });
  }

  return invoice;
};

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get('invoiceId');
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const paymentMode = searchParams.get('paymentMode');
    const search = searchParams.get('search')?.trim();
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    let query = {};

    if (invoiceId) {
      query.invoiceId = invoiceId;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (paymentMode && paymentMode !== 'All') {
      query.paymentMode = paymentMode;
    }

    if (search) {
      const regex = new RegExp(search, 'i');

      const matchingInvoices = await Invoice.find(
        {
          $or: [
            { invoiceNumber: regex },
            { customerName: regex },
            { customerMobile: regex },
          ],
        },
        '_id'
      ).lean();

      const matchingCustomers = await Customer.find(
        {
          $or: [{ name: regex }, { mobileNumber: regex }],
        },
        '_id'
      ).lean();

      const invoiceIds = matchingInvoices.map((doc) => doc._id);
      const customerIds = matchingCustomers.map((doc) => doc._id);

      query.$or = [{ invoiceId: { $in: invoiceIds } }, { customerId: { $in: customerIds } }];
    }

    const skip = (page - 1) * limit;
    const payments = await Payment.find(query)
      .populate('invoiceId', 'invoiceNumber totalAmount')
      .populate('customerId', 'name mobileNumber')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments(query);

    return NextResponse.json({
      payments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    await connectDB();

    const { paymentId, status } = await req.json();

    if (!paymentId || !status) {
      return NextResponse.json(
        { message: 'Payment ID and status are required' },
        { status: 400 }
      );
    }

    const allowedStatuses = ['Pending', 'Confirmed', 'Failed', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { message: 'Invalid payment status' },
        { status: 400 }
      );
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return NextResponse.json({ message: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === status) {
      return NextResponse.json({ message: 'No status change', payment });
    }

    const invoice = await Invoice.findById(payment.invoiceId);
    if (!invoice) {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
    }

    if (status === 'Confirmed' && payment.status !== 'Confirmed') {
      const agg = await Payment.aggregate([
        {
          $match: {
            invoiceId: new mongoose.Types.ObjectId(payment.invoiceId.toString()),
            status: 'Confirmed',
            _id: { $ne: new mongoose.Types.ObjectId(payment._id.toString()) },
          },
        },
        {
          $group: {
            _id: null,
            sum: { $sum: '$amount' },
          },
        },
      ]);

      const alreadyConfirmed = agg[0]?.sum || 0;
      if (
        normalizeMoney(alreadyConfirmed + (payment.amount || 0)) >
        normalizeMoney(invoice.totalAmount) + 0.01
      ) {
        return NextResponse.json(
          { message: 'Cannot confirm this payment because invoice would be overpaid' },
          { status: 400 }
        );
      }
    }

    payment.status = status;
    await payment.save();

    const updatedInvoice = await recalculateInvoiceAndCustomer(
      payment.invoiceId,
      payment.customerId
    );

    const updatedPayment = await Payment.findById(payment._id)
      .populate('invoiceId', 'invoiceNumber totalAmount paymentStatus amountPaid amountPending')
      .populate('customerId', 'name mobileNumber');

    return NextResponse.json({
      message: 'Payment status updated successfully',
      payment: updatedPayment,
      invoice: {
        invoiceNumber: updatedInvoice?.invoiceNumber,
        paymentStatus: updatedInvoice?.paymentStatus,
        amountPaid: updatedInvoice?.amountPaid,
        amountPending: updatedInvoice?.amountPending,
      },
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to update payment status' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const { invoiceId, amount, paymentMode, referenceNumber = '', notes = '' } =
      await req.json();

    const paymentAmount = normalizeMoney(amount);

    if (!invoiceId || !paymentAmount || !paymentMode) {
      return NextResponse.json(
        { message: 'Invoice ID, amount, and payment mode are required' },
        { status: 400 }
      );
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return NextResponse.json(
        { message: 'Invoice not found' },
        { status: 404 }
      );
    }

    const freshInvoice = await recalculateInvoiceAndCustomer(
      invoice._id,
      invoice.customerId
    );

    if (!freshInvoice) {
      return NextResponse.json(
        { message: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (paymentAmount <= 0 || paymentAmount > normalizeMoney(freshInvoice.amountPending)) {
      return NextResponse.json(
        { message: `Payment amount must be between 1 and ${freshInvoice.amountPending}` },
        { status: 400 }
      );
    }

    let payment = await Payment.findOne({
      invoiceId,
      status: 'Pending',
      amount: {
        $gte: paymentAmount - 0.01,
        $lte: paymentAmount + 0.01,
      },
    }).sort({ createdAt: 1 });

    if (payment) {
      payment.status = 'Confirmed';
      payment.paymentMode = paymentMode;
      payment.referenceNumber = referenceNumber || payment.referenceNumber;
      payment.notes = notes || payment.notes;
      await payment.save();
    } else {
      payment = new Payment({
        invoiceId,
        customerId: invoice.customerId,
        amount: paymentAmount,
        paymentMode,
        referenceNumber,
        status: 'Confirmed',
        notes,
      });
      await payment.save();
    }

    const updatedInvoice = await recalculateInvoiceAndCustomer(
      freshInvoice._id,
      freshInvoice.customerId
    );

    const customer = await Customer.findById(freshInvoice.customerId);

    setImmediate(async () => {
      try {
        const notificationResults = [];

        if (customer?.mobileNumber) {
          const smsMessage = generatePaymentSMS(payment, invoice);
          const smsResult = await sendSMSNotification(customer.mobileNumber, smsMessage);
          notificationResults.push({ channel: 'sms', ...smsResult });
        }

        if (customer?.mobileNumber && process.env.PINGRAM_API_KEY) {
          const callMessage = generatePaymentCall(payment, invoice, customer);
          const callResult = await sendCallNotification(customer.mobileNumber, callMessage);
          notificationResults.push({ channel: 'call', ...callResult });
        }

        const failedChannels = notificationResults.filter((item) => item.success === false);
        if (failedChannels.length > 0) {
          console.warn('Payment notification failures for invoice:', freshInvoice.invoiceNumber, failedChannels);
        } else {
          console.log('Payment SMS and call notifications accepted for invoice:', freshInvoice.invoiceNumber);
        }
      } catch (notificationError) {
        console.error('Payment notification error:', notificationError);
      }
    });

    return NextResponse.json(
      {
        message: 'Payment recorded successfully',
        payment,
        invoice: {
          invoiceNumber: updatedInvoice?.invoiceNumber,
          amountPaid: updatedInvoice?.amountPaid,
          amountPending: updatedInvoice?.amountPending,
          paymentStatus: updatedInvoice?.paymentStatus,
        },
        notification: 'Confirmation sent to customer',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to record payment' },
      { status: 500 }
    );
  }
}
