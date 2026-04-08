// Utility functions for billing calculations

/**
 * Calculate metal price based on weight and gold rate
 */
export const calculateMetalPrice = (weight, goldRate) => {
  return weight * goldRate;
};

/**
 * Calculate total item price including making charges and stone price
 */
export const calculateItemPrice = (weight, goldRate, makingCharges, makingChargeType, stonePrice = 0) => {
  const metalPrice = calculateMetalPrice(weight, goldRate);
  
  let charges = makingCharges;
  if (makingChargeType === 'Percentage') {
    charges = (metalPrice * makingCharges) / 100;
  } else if (makingChargeType === 'PerGram') {
    charges = weight * makingCharges;
  }
  
  return {
    metalPrice: parseFloat(metalPrice.toFixed(2)),
    making: parseFloat(charges.toFixed(2)),
    stone: parseFloat(stonePrice.toFixed(2)),
    subtotal: parseFloat((metalPrice + charges + stonePrice).toFixed(2)),
  };
};

/**
 * Calculate GST based on customer location
 */
export const calculateGST = (subtotal, customerState, shopState, { cgstRate = 1.5, sgstRate = 1.5, igstRate = 3 } = {}) => {
  const sameState = customerState?.toLowerCase() === shopState?.toLowerCase();
  
  if (sameState) {
    const cgst = (subtotal * cgstRate) / 100;
    const sgst = (subtotal * sgstRate) / 100;
    return {
      gstType: 'CGST/SGST',
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      igst: 0,
      totalGST: parseFloat((cgst + sgst).toFixed(2)),
    };
  } else {
    const igst = (subtotal * igstRate) / 100;
    return {
      gstType: 'IGST',
      cgst: 0,
      sgst: 0,
      igst: parseFloat(igst.toFixed(2)),
      totalGST: parseFloat(igst.toFixed(2)),
    };
  }
};

/**
 * Calculate discount
 */
export const calculateDiscount = (subtotal, discountValue, discountType = 'Fixed') => {
  // Ensure discountValue is a number
  const discount = typeof discountValue === 'string' ? parseFloat(discountValue) : discountValue;
  
  if (typeof discount !== 'number' || isNaN(discount)) {
    return 0;
  }
  
  if (discountType === 'Percentage') {
    return parseFloat(((subtotal * discount) / 100).toFixed(2));
  }
  return parseFloat(discount.toFixed(2));
};

/**
 * Calculate final invoice amount
 */
export const calculateFinalAmount = (subtotal, gst, discount = 0) => {
  return parseFloat((subtotal + gst - discount).toFixed(2));
};

/**
 * Generate invoice number in format INV/YYYY/NNNN
 */
export const generateInvoiceNumber = (lastCounter) => {
  const year = new Date().getFullYear();
  const nextCounter = (lastCounter % 9999) + 1;
  const invoiceNumber = `INV/${year}/${String(nextCounter).padStart(4, '0')}`;
  return {
    invoiceNumber,
    counter: nextCounter,
  };
};

/**
 * Format currency
 */
export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Format date
 */
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Validate mobile number
 */
export const isValidMobileNumber = (mobile) => {
  const mobileRegex = /^[0-9]{10}$/;
  return mobileRegex.test(mobile?.replace(/[^0-9]/g, ''));
};

/**
 * Validate email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
