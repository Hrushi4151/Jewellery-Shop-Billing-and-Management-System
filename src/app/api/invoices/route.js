import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import Invoice from '@/models/Invoice';
import Customer from '@/models/Customer';
import Product from '@/models/Product';
import Settings from '@/models/Settings';
import Payment from '@/models/Payment';
import Inventory from '@/models/Inventory';
import StockAdjustment from '@/models/StockAdjustment';
import StockAlert from '@/models/StockAlert';
import {
  calculateMetalPrice,
  calculateItemPrice,
  calculateGST,
  calculateDiscount,
  calculateFinalAmount,
  generateInvoiceNumber,
} from '@/lib/calculations';
import { sendSMSNotification, generateInvoiceSMS } from '@/lib/smsService';
import { sendCallNotification, generateInvoiceCall } from '@/lib/whatsappService';

const normalizeMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const normalizeMetal = (metal) => String(metal || 'gold').toLowerCase();

const normalizePurity = (purity, metal) => {
  const parsed = Number(String(purity ?? '').replace(/[^\d.]/g, ''));
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  if (metal === 'silver') return 999;
  if (metal === 'platinum') return 950;
  return 22;
};

const getRateKey = (metal, purity) => {
  if (metal === 'gold') return `purity${purity}K`;
  return `purity${purity}`;
};

const getLiveRateForItem = (settings, metal, purity) => {
  const key = getRateKey(metal, purity);
  const rateFromMetalRates = Number(settings?.metalRates?.[metal]?.[key]) || 0;
  if (rateFromMetalRates > 0) return rateFromMetalRates;

  if (metal === 'gold') return Number(settings?.currentGoldRate) || 0;
  if (metal === 'silver') return Number(settings?.silverRate) || 0;
  if (metal === 'platinum') return Number(settings?.platinumRate) || 0;
  return 0;
};

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const search = (searchParams.get('search') || '').trim();
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    let query = {};

    if (customerId) {
      query.customerId = customerId;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { invoiceNumber: searchRegex },
        { customerName: searchRegex },
        { customerMobile: searchRegex },
        { customerEmail: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;
    const invoices = await Invoice.find(query)
      .populate('customerId', 'name mobileNumber email')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await Invoice.countDocuments(query);

    return NextResponse.json({
      invoices,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();

    let {
      customerId,
      items,
      discount = 0,
      discountType = 'Fixed',
      gstType = 'CGST/SGST',
      invoiceType = 'Invoice',
      notes = '',
      exchange = null,
      payment = null,
    } = await req.json();

    // Support both legacy and new discount payload formats
    let normalizedDiscountType = discountType;
    if (typeof discount === 'object' && discount !== null) {
      normalizedDiscountType = discount.type || discountType;
      discount = discount.value;
    }

    // Convert discount to number
    discount = typeof discount === 'string' ? parseFloat(discount) : discount;
    if (isNaN(discount)) discount = 0;

    // Validate input
    if (!customerId || !items || items.length === 0) {
      return NextResponse.json(
        { message: 'Customer and items are required' },
        { status: 400 }
      );
    }

    // Get customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json(
        { message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get settings
    const settings = await Settings.findOne({});
    if (!settings) {
      return NextResponse.json(
        { message: 'Settings not configured' },
        { status: 500 }
      );
    }

    // Calculate invoice items
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      // Convert numeric values to numbers
      const itemWeight = parseFloat(item.weight) || 0;
      const itemQuantity = parseInt(item.quantity) || 1;
      const makingCharges = parseFloat(item.makingCharges) || 0;
      const stonePrice = parseFloat(item.stonePrice || item.stone || 0) || 0;

      // Handle manual items vs product items
      if (item.isManual) {
        const itemMetal = normalizeMetal(item.metal);
        const itemPurity = normalizePurity(item.purity, itemMetal);
        const liveRate = getLiveRateForItem(settings, itemMetal, itemPurity);

        if (liveRate <= 0) {
          return NextResponse.json(
            { message: `Live rate is missing for ${itemMetal.toUpperCase()} ${itemPurity}. Update rates in Admin Settings.` },
            { status: 400 }
          );
        }

        // Manual entry item - use provided data directly
        const itemPrice = calculateItemPrice(
          itemWeight,
          liveRate,
          makingCharges,
          item.makingChargeType || 'Fixed',
          stonePrice
        );

        subtotal += itemPrice.subtotal * itemQuantity;

        processedItems.push({
          isManual: true,
          itemName: item.itemName,
          metal: itemMetal,
          weight: itemWeight,
          purity: itemPurity,
          goldRate: liveRate,
          metalPrice: itemPrice.metalPrice,
          stonePrice: itemPrice.stone,
          makingCharges: itemPrice.making,
          makingChargeType: item.makingChargeType || 'Fixed',
          subtotal: itemPrice.subtotal,
          quantity: itemQuantity,
        });
      } else {
        // Product-based item - fetch from database
        const product = await Product.findById(item.productId);
        if (!product) {
          return NextResponse.json(
            { message: `Product ${item.productId} not found` },
            { status: 404 }
          );
        }

        const itemMetal = normalizeMetal(item.metal || product.metal);
        const itemPurity = normalizePurity(item.purity || product.purity, itemMetal);
        const liveRate = getLiveRateForItem(settings, itemMetal, itemPurity);

        if (liveRate <= 0) {
          return NextResponse.json(
            { message: `Live rate is missing for ${itemMetal.toUpperCase()} ${itemPurity}. Update rates in Admin Settings.` },
            { status: 400 }
          );
        }

        const itemPrice = calculateItemPrice(
          itemWeight || product.weight,
          liveRate,
          makingCharges || product.makingCharges,
          item.makingChargeType || product.makingChargeType,
          stonePrice || product.stoneDetails?.stonePrice || 0
        );

        subtotal += itemPrice.subtotal * itemQuantity;

        processedItems.push({
          productId: product._id,
          productName: product.name,
          metal: itemMetal,
          weight: itemWeight || product.weight,
          purity: itemPurity,
          goldRate: liveRate,
          stoneDetails: item.stoneDetails || product.stoneDetails,
          metalPrice: itemPrice.metalPrice,
          stonePrice: itemPrice.stone,
          makingCharges: itemPrice.making,
          makingChargeType: item.makingChargeType || product.makingChargeType,
          subtotal: itemPrice.subtotal,
          quantity: itemQuantity,
        });
      }
    }

    // Calculate discount
    const discountedAmount = calculateDiscount(
      subtotal,
      discount,
      normalizedDiscountType
    );
    const discountedSubtotal = subtotal - discountedAmount;

    // Calculate GST
    const gstCalculation = calculateGST(
      discountedSubtotal,
      customer.address?.state,
      settings.shopState || 'Maharashtra',
      settings.gstRate || { cgst: 1.5, sgst: 1.5, igst: 3 }
    );

    // Calculate final amount
    const totalAmount = calculateFinalAmount(
      discountedSubtotal,
      gstCalculation.totalGST,
      0
    );

    // Calculate exchange deduction if provided
    let exchangeDeduction = 0;
    if (exchange && exchange.items && exchange.items.length > 0) {
      exchangeDeduction = parseFloat(exchange.totalDeduction) || 0;
    }

    // Final amount after exchange deduction
    const finalAmount = normalizeMoney(totalAmount - exchangeDeduction);

    // Initial payment handling at invoice creation
    let amountPaid = 0;
    const paymentEntries = [];

    if (payment) {
      if (payment.mode === 'Split') {
        const breakdown = Array.isArray(payment.breakdown) ? payment.breakdown : [];
        for (const split of breakdown) {
          const splitAmount = normalizeMoney(split.amount);
          if (splitAmount > 0) {
            amountPaid += splitAmount;
            paymentEntries.push({
              paymentMode: split.mode || 'Cash',
              amount: splitAmount,
              referenceNumber: split.referenceNumber || '',
            });
          }
        }
      } else {
        const directAmount = normalizeMoney(payment.amount);
        if (directAmount > 0) {
          amountPaid = directAmount;
          paymentEntries.push({
            paymentMode: payment.mode || 'Cash',
            amount: directAmount,
            referenceNumber: payment.referenceNumber || '',
          });
        }
      }
    }

    amountPaid = normalizeMoney(amountPaid);

    if (amountPaid > finalAmount + 0.01) {
      return NextResponse.json(
        { message: 'Paid amount cannot exceed total invoice amount' },
        { status: 400 }
      );
    }

    const amountPending = Math.max(0, normalizeMoney(finalAmount - amountPaid));
    let paymentStatus = 'Pending';
    if (amountPending <= 0.01 && finalAmount > 0) {
      amountPaid = finalAmount;
      paymentStatus = 'Paid';
    } else if (amountPaid > 0) {
      paymentStatus = 'PartialPaid';
    }

    // Generate invoice number
    const { invoiceNumber, counter } = generateInvoiceNumber(
      settings.lastInvoiceNumber
    );

    // Create invoice
    const invoice = new Invoice({
      invoiceNumber,
      customerId,
      customerName: customer.name,
      customerMobile: customer.mobileNumber,
      customerEmail: customer.email,
      customerAddress: customer.address,
      invoiceType,
      items: processedItems,
      exchange: exchange && exchange.items ? {
        items: exchange.items,
        totalDeduction: exchangeDeduction,
      } : null,
      goldRate: settings.currentGoldRate,
      subtotal,
      discount: discountedAmount,
      discountType: normalizedDiscountType,
      discountedAmount: discountedSubtotal,
      gstType: gstCalculation.gstType,
      cgst: gstCalculation.cgst,
      sgst: gstCalculation.sgst,
      igst: gstCalculation.igst,
      totalGST: gstCalculation.totalGST,
      totalAmount: finalAmount,
      amountPaid,
      amountPending,
      paymentStatus,
      status: invoiceType === 'Invoice' ? 'Finalized' : 'Draft',
      notes,
    });

    await invoice.save();

    // Auto-deduct stock for product-based items
    if (invoice.status === 'Finalized') {
      for (const item of processedItems) {
        if (item.productId) {
          try {
            const inventory = await Inventory.findOne({ productId: item.productId });
            
            if (inventory) {
              const previousQuantity = inventory.quantity;
              const newQuantity = Math.max(0, previousQuantity - item.quantity);

              // Create stock adjustment record
              await StockAdjustment.create({
                productId: item.productId,
                adjustmentType: 'Sale',
                quantity: -item.quantity,
                reason: 'Invoice Sale',
                previousQuantity,
                newQuantity,
                invoiceId: invoice._id,
                adjustedBy: null, // System adjustment
                notes: `Sale via Invoice #${invoiceNumber}`,
              });

              // Update inventory status
              let newStatus = 'InStock';
              if (newQuantity === 0) {
                newStatus = 'OutOfStock';
              } else if (newQuantity <= inventory.minStockLevel) {
                newStatus = 'LowStock';
              }

              await Inventory.updateOne(
                { productId: item.productId },
                {
                  quantity: newQuantity,
                  status: newStatus,
                  lastUpdated: new Date(),
                }
              );

              // Create alert if stock is low or out
              if (newStatus === 'LowStock' || newStatus === 'OutOfStock') {
                const existingAlert = await StockAlert.findOne({
                  productId: item.productId,
                  status: 'Active',
                });

                if (!existingAlert) {
                  await StockAlert.create({
                    productId: item.productId,
                    alertType: newStatus,
                    currentLevel: newQuantity,
                    threshold: inventory.minStockLevel,
                    message: `Stock ${newStatus === 'OutOfStock' ? 'out of stock' : 'running low'} for product`,
                    status: 'Active',
                    notificationChannels: ['Email', 'Dashboard'],
                  });
                }
              }
            }
          } catch (stockError) {
            console.error(`Stock deduction error for product ${item.productId}:`, stockError);
            // Continue with invoice even if stock deduction fails
          }
        }
      }
    }
    if (paymentEntries.length > 0) {
      await Payment.insertMany(
        paymentEntries.map((entry) => ({
          invoiceId: invoice._id,
          customerId,
          amount: entry.amount,
          paymentMode: entry.paymentMode,
          referenceNumber: entry.referenceNumber,
          status: 'Confirmed',
          notes: 'Initial payment at invoice creation',
        }))
      );
    }

    // Update customer summary
    await Customer.updateOne(
      { _id: customerId },
      {
        $inc: {
          totalPurchase: finalAmount,
          totalPaid: amountPaid,
          totalPending: amountPending,
        },
      }
    );

    // Update settings with new invoice counter
    await Settings.updateOne({}, { lastInvoiceNumber: counter });

    // Send notifications asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        const notificationResults = [];

        // Send SMS notification with invoice link
        if (customer.mobileNumber) {
          const smsMessage = generateInvoiceSMS(invoice, customer);
          const smsResult = await sendSMSNotification(customer.mobileNumber, smsMessage);
          notificationResults.push({ channel: 'sms', ...smsResult });
        }

        // Send Call notification to inform about invoice
        if (customer.mobileNumber && process.env.PINGRAM_API_KEY) {
          const callMessage = generateInvoiceCall(invoice, customer);
          const callResult = await sendCallNotification(customer.mobileNumber, callMessage);
          notificationResults.push({ channel: 'call', ...callResult });
        }

        const failedChannels = notificationResults.filter((item) => item.success === false);
        if (failedChannels.length > 0) {
          console.warn('Notification failures for invoice:', invoiceNumber, failedChannels);
        } else {
          console.log('SMS and call notifications accepted for invoice:', invoiceNumber);
        }
      } catch (notificationError) {
        console.error('Notification sending error:', notificationError);
        // Don't fail the invoice creation if notification fails
      }
    });

    return NextResponse.json(
      {
        message: 'Invoice created successfully',
        invoice,
        notification: 'Notification sent to customer',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
