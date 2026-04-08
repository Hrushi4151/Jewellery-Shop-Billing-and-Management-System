'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CreateInvoice.module.css';

export default function CreateInvoice() {
  const router = useRouter();
  const normalizeMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
  const formatAmount = (value) =>
    normalizeMoney(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('Fixed');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [shopState, setShopState] = useState('Maharashtra');
  const [gstRates, setGstRates] = useState({ cgst: 1.5, sgst: 1.5, igst: 3 });
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentReference, setPaymentReference] = useState('');
  const [splitPayments, setSplitPayments] = useState([
    { mode: 'Cash', amount: 0, referenceNumber: '' },
  ]);
  const [metalRates, setMetalRates] = useState({
    gold: { purity22K: 0, purity18K: 0, purity14K: 0, purity10K: 0 },
    silver: { purity999: 0, purity925: 0 },
    platinum: { purity950: 0, purity900: 0 },
  });
  const [goldRate, setGoldRate] = useState(0); // Deprecated - kept for backward compatibility
  const [itemMode, setItemMode] = useState('product'); // 'product' or 'manual'
  const [productSearch, setProductSearch] = useState('');
  const [showProductResults, setShowProductResults] = useState(false);
  const [activeSection, setActiveSection] = useState('customer');
  
  // Manual entry form state
  const [manualItemForm, setManualItemForm] = useState({
    itemName: '',
    weight: 0,
    metal: 'gold', // Added: metal type
    purity: 22,
    makingCharges: 0,
    makingChargeType: 'Fixed',
    stonePrice: 0,
  });

  // Exchange items
  const [exchangeItems, setExchangeItems] = useState([]);
  const [manualExchangeForm, setManualExchangeForm] = useState({
    description: '',
    weight: 0,
    metal: 'gold', // Added: metal type
    purity: 22,
    deductionPercent: 0,
  });

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=1000');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      // Fetch from gold-rate endpoint with new metalRates structure
      const res = await fetch('/api/products/gold-rate');
      const data = await res.json();
      
      if (data.metalRates) {
        setMetalRates(data.metalRates);
      }
      
      // Fallback to old goldRate field for backward compatibility
      if (data.goldRate) {
        setGoldRate(data.goldRate);
      }
      
      if (data.gstRate) {
        setGstRates({
          cgst: data.gstRate.cgst || 1.5,
          sgst: data.gstRate.sgst || 1.5,
          igst: data.gstRate.igst || 3,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Fallback to /api/settings endpoint for backward compatibility
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.shopState) setShopState(data.shopState);
        if (data.goldRate) setGoldRate(data.goldRate);
        if (data.gstRate) {
          setGstRates({
            cgst: data.gstRate.cgst || 1.5,
            sgst: data.gstRate.sgst || 1.5,
            igst: data.gstRate.igst || 3,
          });
        }
      } catch (fallbackError) {
        console.error('Error fetching settings from fallback:', fallbackError);
      }
    }
  };

  const normalizeMetal = (metal) => String(metal || 'gold').toLowerCase();

  const normalizePurity = (purity, metal) => {
    const parsed = Number(String(purity ?? '').replace(/[^\d.]/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    if (metal === 'silver') return 999;
    if (metal === 'platinum') return 950;
    return 22;
  };

  // Helper function to get the correct rate based on metal and purity
  const getRateForPurity = (metal = 'gold', purity = 22) => {
    const normalizedMetal = normalizeMetal(metal);
    const normalizedPurity = normalizePurity(purity, normalizedMetal);
    const purityKey =
      normalizedMetal === 'gold'
        ? `purity${normalizedPurity}K`
        : `purity${normalizedPurity}`;

    const liveRate = Number(metalRates?.[normalizedMetal]?.[purityKey]) || 0;
    return liveRate;
  };

  // Product search and filter
  const filteredProducts = productSearch.trim()
    ? products.filter((product) =>
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (product.purity && product.purity.toString().includes(productSearch)) ||
        (product.weight && product.weight.toString().includes(productSearch))
      )
    : [];

  const handleProductSearch = (query) => {
    setProductSearch(query);
    setShowProductResults(query.trim().length > 0);
  };

  const searchCustomers = async (query) => {
    if (!query.trim()) {
      setCustomers([]);
      return;
    }

    try {
      const res = await fetch(
        `/api/customers?search=${encodeURIComponent(query)}&limit=10`
      );
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const handleCustomerSearch = (value) => {
    setCustomerSearch(value);
    searchCustomers(value);
    setShowCustomerDropdown(true);
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const addItem = (product) => {
    const existing = invoiceItems.find((item) => item.productId === product._id);
    const itemMetal = normalizeMetal(product.metal || 'gold');
    const itemPurity = normalizePurity(product.purity || 22, itemMetal);
    const itemRate = getRateForPurity(itemMetal, itemPurity);

    if (itemRate <= 0) {
      alert(`Live rate missing for ${itemMetal.toUpperCase()} ${itemPurity}. Update Admin Settings.`);
      return;
    }

    if (existing) {
      updateItemQuantity(product._id, existing.quantity + 1);
    } else {
      setInvoiceItems([
        ...invoiceItems,
        {
          productId: product._id,
          productName: product.name,
          metal: itemMetal,
          purity: itemPurity,
          weight: product.weight,
          goldRate: itemRate,
          makingCharges: product.makingCharges,
          makingChargeType: product.makingChargeType,
          stoneDetails: product.stoneDetails,
          quantity: 1,
        },
      ]);
    }
  };

  const updateItemQuantity = (productId, quantity) => {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }

    setInvoiceItems(
      invoiceItems.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeItem = (productId) => {
    setInvoiceItems(invoiceItems.filter((item) => item.productId !== productId));
  };

  // Manual entry functions
  const handleAddManualItem = () => {
    if (!manualItemForm.itemName || !manualItemForm.weight) {
      alert('Please enter item name and weight');
      return;
    }

    const itemMetal = normalizeMetal(manualItemForm.metal);
    const itemPurity = normalizePurity(parseFloat(manualItemForm.purity), itemMetal);
    const itemRate = getRateForPurity(itemMetal, itemPurity);

    if (itemRate <= 0) {
      alert(`Live rate missing for ${itemMetal.toUpperCase()} ${itemPurity}. Update Admin Settings.`);
      return;
    }

    setInvoiceItems([
      ...invoiceItems,
      {
        id: Date.now(),
        isManual: true,
        itemName: manualItemForm.itemName,
        weight: parseFloat(manualItemForm.weight),
        metal: itemMetal,
        purity: itemPurity,
        goldRate: itemRate,
        makingCharges: parseFloat(manualItemForm.makingCharges),
        makingChargeType: manualItemForm.makingChargeType,
        stonePrice: parseFloat(manualItemForm.stonePrice),
        quantity: 1,
      },
    ]);

    // Reset form
    setManualItemForm({
      itemName: '',
      weight: 0,
      metal: 'gold',
      purity: 22,
      makingCharges: 0,
      makingChargeType: 'Fixed',
      stonePrice: 0,
    });
  };

  const updateManualItem = (itemId, field, value) => {
    setInvoiceItems(
      invoiceItems.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const removeManualItem = (itemId) => {
    setInvoiceItems(invoiceItems.filter((item) => item.id !== itemId));
  };

  // Exchange functions
  const calculateExchangeValue = (weight, metal = 'gold', purity, deductionPercent) => {
    // Exchange value = Weight × Gold Rate × Purity Factor × (1 - Deduction%)
    const rate = getRateForPurity(metal, purity);
    const purityFactor = purity / 100;
    const deductionFactor = (100 - deductionPercent) / 100;
    return normalizeMoney(weight * rate * purityFactor * deductionFactor);
  };

  const handleAddExchange = () => {
    if (!manualExchangeForm.description || !manualExchangeForm.weight) {
      alert('Please enter description and weight');
      return;
    }

    const exchangeValue = calculateExchangeValue(
      parseFloat(manualExchangeForm.weight),
      manualExchangeForm.metal,
      parseFloat(manualExchangeForm.purity),
      parseFloat(manualExchangeForm.deductionPercent)
    );

    setExchangeItems([
      ...exchangeItems,
      {
        id: Date.now(),
        description: manualExchangeForm.description,
        weight: parseFloat(manualExchangeForm.weight),
        metal: manualExchangeForm.metal,
        purity: parseFloat(manualExchangeForm.purity),
        deductionPercent: parseFloat(manualExchangeForm.deductionPercent),
        exchangeValue: exchangeValue,
      },
    ]);

    // Reset form
    setManualExchangeForm({
      description: '',
      weight: 0,
      metal: 'gold',
      purity: 22,
      deductionPercent: 0,
    });
  };

  const removeExchange = (exchangeId) => {
    setExchangeItems(exchangeItems.filter((item) => item.id !== exchangeId));
  };

  const calculateExchangeDeduction = () => {
    return normalizeMoney(exchangeItems.reduce((sum, item) => sum + item.exchangeValue, 0));
  };

  const calculateItemPrice = (item) => {
    let totalPrice = 0;

    // Metal price
    const liveRate = getRateForPurity(item.metal, item.purity);
    const effectiveRate = liveRate > 0 ? liveRate : item.goldRate;
    const metalPrice = item.weight * effectiveRate;

    // Making charges
    let makingCharges = 0;
    if (item.makingChargeType === 'Fixed') {
      makingCharges = item.makingCharges;
    } else if (item.makingChargeType === 'Percentage') {
      makingCharges = (metalPrice * item.makingCharges) / 100;
    } else if (item.makingChargeType === 'PerGram') {
      makingCharges = item.weight * item.makingCharges;
    }

    // Stone price
    let stonePrice = 0;
    if (
      item.stoneDetails &&
      item.stoneDetails.hasStone &&
      item.stoneDetails.stonePrice
    ) {
      stonePrice = item.stoneDetails.stonePrice;
    }

    totalPrice = metalPrice + makingCharges + stonePrice;
    return normalizeMoney(totalPrice * item.quantity);
  };

  const calculateSubtotal = () => {
    return normalizeMoney(invoiceItems.reduce((sum, item) => sum + calculateItemPrice(item), 0));
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === 'Fixed') {
      return normalizeMoney(Math.min(discount, subtotal));
    } else {
      return normalizeMoney((subtotal * discount) / 100);
    }
  };

  const calculateGST = () => {
    const discountedSubtotal = calculateSubtotal() - calculateDiscountAmount();

    if (
      selectedCustomer &&
      selectedCustomer.address.state !== shopState
    ) {
      // IGST for different state
      return normalizeMoney((discountedSubtotal * gstRates.igst) / 100);
    } else {
      // CGST + SGST for same state
      return normalizeMoney((discountedSubtotal * (gstRates.cgst + gstRates.sgst)) / 100);
    }
  };

  const calculateTotal = () => {
    const subtotalWithDiscountAndGST = calculateSubtotal() - calculateDiscountAmount() + calculateGST();
    const exchangeDeduction = calculateExchangeDeduction();
    return normalizeMoney(subtotalWithDiscountAndGST - exchangeDeduction);
  };

  const subtotal = calculateSubtotal();
  const discountAmount = calculateDiscountAmount();
  const discountedSubtotal = subtotal - discountAmount;
  const gst = calculateGST();
  const total = calculateTotal();
  const hasCustomer = Boolean(selectedCustomer);
  const hasItems = invoiceItems.length > 0;
  const canProceed = hasCustomer && hasItems;
  const isActionFlow =
    activeSection === 'checkout' || activeSection === 'preview' || activeSection === 'create';
  const tabsClassName = `${styles.sectionTabs} ${isActionFlow ? styles.sectionTabsNarrow : styles.sectionTabsWide}`;

  const getTotalPaidAmount = () => {
    if (paymentMode === 'Split') {
      return normalizeMoney(
        splitPayments.reduce(
        (sum, payment) => sum + (parseFloat(payment.amount) || 0),
          0
        )
      );
    }
    return normalizeMoney(paidAmount);
  };

  const getPendingAmount = () => {
    const pending = normalizeMoney(total) - getTotalPaidAmount();
    return pending > 0 ? normalizeMoney(pending) : 0;
  };

  const getAutoPaymentStatus = () => {
    const totalPaid = getTotalPaidAmount();
    const normalizedTotal = normalizeMoney(total);

    if (totalPaid <= 0) return 'Pending';
    if (totalPaid >= normalizedTotal) return 'Paid';
    return 'PartialPaid';
  };

  const syncSplitRemainingAmount = useCallback((payments) => {
    if (!Array.isArray(payments) || payments.length === 0) {
      return [{ mode: 'Cash', amount: 0, referenceNumber: '' }];
    }

    const normalizedTotal = Math.max(normalizeMoney(total), 0);

    if (payments.length === 1) {
      return [{ ...payments[0], amount: normalizeMoney(normalizedTotal) }];
    }

    const lastIndex = payments.length - 1;
    const paidByOtherRows = payments
      .slice(0, lastIndex)
      .reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);

    const remaining = Math.max(normalizeMoney(normalizedTotal - paidByOtherRows), 0);

    return payments.map((entry, index) =>
      index === lastIndex
        ? { ...entry, amount: normalizeMoney(remaining) }
        : entry
    );
  }, [total]);

  const addSplitPaymentRow = () => {
    setSplitPayments(
      syncSplitRemainingAmount([
        ...splitPayments,
        { mode: 'Cash', amount: 0, referenceNumber: '' },
      ])
    );
  };

  const updateSplitPaymentRow = (index, field, value) => {
    const updated = splitPayments.map((payment, i) =>
      i === index ? { ...payment, [field]: value } : payment
    );
    setSplitPayments(syncSplitRemainingAmount(updated));
  };

  const removeSplitPaymentRow = (index) => {
    if (splitPayments.length === 1) return;
    setSplitPayments(
      syncSplitRemainingAmount(splitPayments.filter((_, i) => i !== index))
    );
  };

  useEffect(() => {
    if (paymentMode === 'Split') {
      setSplitPayments((prev) => syncSplitRemainingAmount(prev));
    }
  }, [paymentMode, syncSplitRemainingAmount]);

  useEffect(() => {
    const normalizedTotal = Math.max(normalizeMoney(total), 0);
    if (paymentMode === 'Split') {
      setSplitPayments((prev) => syncSplitRemainingAmount(prev));
      return;
    }

    setPaidAmount((prev) => Math.min(normalizeMoney(prev), normalizedTotal));
  }, [total, paymentMode, syncSplitRemainingAmount]);

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    if (invoiceItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const normalizedTotal = normalizeMoney(total);
    const totalPaidAmount = normalizeMoney(getTotalPaidAmount());
    if (totalPaidAmount < 0) {
      alert('Paid amount cannot be negative');
      return;
    }

    if (totalPaidAmount > normalizedTotal) {
      alert('Paid amount cannot be greater than total amount');
      return;
    }

    setLoading(true);

    try {
      // Prepare items - handle both product-based and manual items
      const items = invoiceItems.map((item) => {
        if (item.isManual) {
          const liveRate = getRateForPurity(item.metal, item.purity);
          return {
            isManual: true,
            itemName: item.itemName,
            weight: item.weight,
            metal: item.metal || 'gold',
            purity: item.purity,
            makingCharges: item.makingCharges,
            makingChargeType: item.makingChargeType,
            stonePrice: item.stonePrice,
            goldRate: liveRate > 0 ? liveRate : item.goldRate,
            quantity: item.quantity,
          };
        } else {
          return {
            productId: item.productId,
            quantity: item.quantity,
          };
        }
      });

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer._id,
          items,
          exchange:
            exchangeItems.length > 0
              ? {
                  items: exchangeItems,
                  totalDeduction: calculateExchangeDeduction(),
                }
              : null,
          discount,
          discountType,
          payment:
            paymentMode === 'Split'
              ? {
                  mode: 'Split',
                  breakdown: splitPayments
                    .filter((entry) => (parseFloat(entry.amount) || 0) > 0)
                    .map((entry) => ({
                      mode: entry.mode,
                      amount: parseFloat(entry.amount) || 0,
                      referenceNumber: entry.referenceNumber || '',
                    })),
                }
              : {
                  mode: paymentMode,
                  amount: parseFloat(paidAmount) || 0,
                  referenceNumber: paymentReference || '',
                },
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Error creating invoice');
        return;
      }

      alert('Invoice created successfully');

      const createdInvoiceId = data?.invoice?._id;
      const createdCustomerId = data?.invoice?.customerId || selectedCustomer?._id;

      if (createdInvoiceId && createdCustomerId) {
        router.push(`/customer-invoice/${createdCustomerId}/${createdInvoiceId}`);
        return;
      }

      // Reset form
      setSelectedCustomer(null);
      setInvoiceItems([]);
      setExchangeItems([]);
      setDiscount(0);
      setDiscountType('Fixed');
      setPaymentMode('Cash');
      setPaidAmount(0);
      setPaymentReference('');
      setSplitPayments([{ mode: 'Cash', amount: 0, referenceNumber: '' }]);
      setNotes('');
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Create Invoice</h1>

      <div className={tabsClassName}>
        <button
          type="button"
          className={`${styles.sectionTab} ${activeSection === 'customer' ? styles.sectionTabActive : ''}`}
          onClick={() => setActiveSection('customer')}
        >
          Customer Selection
        </button>
        <button
          type="button"
          className={`${styles.sectionTab} ${activeSection === 'items' ? styles.sectionTabActive : ''}`}
          onClick={() => setActiveSection('items')}
        >
          Items
        </button>
        <button
          type="button"
          className={`${styles.sectionTab} ${activeSection === 'exchange' ? styles.sectionTabActive : ''}`}
          onClick={() => setActiveSection('exchange')}
          disabled={!hasCustomer}
        >
          Exchange
        </button>
        <button
          type="button"
          className={`${styles.sectionTab} ${activeSection === 'checkout' ? styles.sectionTabActive : ''}`}
          onClick={() => setActiveSection('checkout')}
          disabled={!canProceed}
        >
          Checkout
        </button>
        <button
          type="button"
          className={`${styles.sectionTab} ${activeSection === 'preview' ? styles.sectionTabActive : ''}`}
          onClick={() => setActiveSection('preview')}
          disabled={!canProceed}
        >
          Final Invoice Preview
        </button>
        <button
          type="button"
          className={`${styles.sectionTab} ${activeSection === 'create' ? styles.sectionTabActive : ''}`}
          onClick={() => setActiveSection('create')}
          disabled={!canProceed}
        >
          Create Invoice
        </button>
      </div>

      <div className={`${styles.mainContent} ${styles.mainContentSingle}`}>
        {/* Left Column - Customer & Items */}
        {!isActionFlow && <div className={`${styles.leftColumn} ${styles.leftColumnWide}`}>
          {/* Customer Selection */}
          {activeSection === 'customer' && (
          <div className={styles.card}>
            <h2>Select Customer</h2>
            {selectedCustomer ? (
              <div className={styles.selectedCustomer}>
                <div className={styles.customerInfo}>
                  <p className={styles.customerInfoText}>{selectedCustomer.name}</p>
                  <p className={styles.customerInfoText}>📱 {selectedCustomer.mobileNumber}</p>
                  <p className={styles.customerInfoText}>📍 {selectedCustomer.address.city}, {selectedCustomer.address.state}</p>
                </div>
                <button
                  className={styles.changeBtn}
                  onClick={() => setSelectedCustomer(null)}
                >
                  Change Customer
                </button>
              </div>
            ) : (
              <div className={styles.searchBox}>
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search by name or mobile..."
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                />
                {showCustomerDropdown && customers.length > 0 && (
                  <div className={styles.dropdown}>
                    {customers.map((customer) => (
                      <div
                        key={customer._id}
                        className={styles.dropdownItem}
                        onClick={() => selectCustomer(customer)}
                      >
                        <div className={styles.customerName}>{customer.name}</div>
                        <div className={styles.customerDetail}>
                          {customer.mobileNumber}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Items Selection */}
          {activeSection === 'items' && (
          <div className={styles.card}>
            <h2>Add Items</h2>

            {/* Mode Toggle */}
            <div className={styles.modeToggle}>
              <button
                className={`${styles.modeBtn} ${itemMode === 'product' ? styles.active : ''}`}
                onClick={() => setItemMode('product')}
              >
                📦 Select from Inventory
              </button>
              <button
                className={`${styles.modeBtn} ${itemMode === 'manual' ? styles.active : ''}`}
                onClick={() => setItemMode('manual')}
              >
                ✍️ Manual Entry
              </button>
            </div>

            {/* Product Selection Mode */}
            {itemMode === 'product' && (
              <div>
                <div className={styles.searchBox}>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="🔍 Search by product name, weight, or purity..."
                    value={productSearch}
                    onChange={(e) => handleProductSearch(e.target.value)}
                    onFocus={() => productSearch && setShowProductResults(true)}
                    onBlur={() => setTimeout(() => setShowProductResults(false), 200)}
                  />
                  {productSearch && (
                    <button
                      className={styles.clearBtn}
                      onClick={() => {
                        setProductSearch('');
                        setShowProductResults(false);
                      }}
                    >
                      ✕
                    </button>
                  )}

                  {productSearch && showProductResults && (
                    <div className={styles.productsDropdown}>
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                          <div
                            key={product._id}
                            className={styles.productDropdownItem}
                            onClick={() => {
                              addItem(product);
                              setProductSearch('');
                              setShowProductResults(false);
                            }}
                          >
                            <div className={styles.productDropdownName}>{product.name}</div>
                            <div className={styles.productDropdownDetails}>
                              <span>{product.weight}gm</span>
                              <span>•</span>
                              <span>{product.purity}</span>
                              <span>•</span>
                              <span>Live rate at billing</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className={styles.noResults}>
                          No products found for &quot;{productSearch}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {productSearch === '' && (
                  <div className={styles.emptyState}>
                    <p>🔍 Start typing to search products from inventory</p>
                    <p style={{ fontSize: '0.9rem', color: '#999', marginTop: '0.5rem' }}>
                      Search by name, weight, or purity
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Entry Mode */}
            {itemMode === 'manual' && (
              <div className={styles.manualEntryForm}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Item Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="e.g., Gold Necklace, Custom Ring"
                    value={manualItemForm.itemName}
                    onChange={(e) =>
                      setManualItemForm({ ...manualItemForm, itemName: e.target.value })
                    }
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Metal</label>
                    <select
                      className={styles.formSelect}
                      value={manualItemForm.metal}
                      onChange={(e) =>
                        setManualItemForm({ ...manualItemForm, metal: e.target.value })
                      }
                    >
                      <option value="gold">Gold</option>
                      <option value="silver">Silver</option>
                      <option value="platinum">Platinum</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Purity</label>
                    <select
                      className={styles.formSelect}
                      value={manualItemForm.purity}
                      onChange={(e) =>
                        setManualItemForm({ ...manualItemForm, purity: e.target.value })
                      }
                    >
                      {manualItemForm.metal === 'gold' && (
                        <>
                          <option value="22">22K (91.67%)</option>
                          <option value="18">18K (75%)</option>
                          <option value="14">14K (58.33%)</option>
                          <option value="10">10K (41.67%)</option>
                        </>
                      )}
                      {manualItemForm.metal === 'silver' && (
                        <>
                          <option value="999">Silver 999 (99.9%)</option>
                          <option value="925">Silver 925 (92.5%)</option>
                        </>
                      )}
                      {manualItemForm.metal === 'platinum' && (
                        <>
                          <option value="950">Platinum 950 (95%)</option>
                          <option value="900">Platinum 900 (90%)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Weight (gm)</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      placeholder="0"
                      step="0.1"
                      value={manualItemForm.weight}
                      onChange={(e) =>
                        setManualItemForm({ ...manualItemForm, weight: e.target.value })
                      }
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Current Rate (₹/gm)</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      disabled
                      value={`₹${getRateForPurity(manualItemForm.metal, parseFloat(manualItemForm.purity)).toFixed(2)}`}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Making Charges</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      placeholder="0"
                      step="0.1"
                      value={manualItemForm.makingCharges}
                      onChange={(e) =>
                        setManualItemForm({ ...manualItemForm, makingCharges: e.target.value })
                      }
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Making Type</label>
                    <select
                      className={styles.formSelect}
                      value={manualItemForm.makingChargeType}
                      onChange={(e) =>
                        setManualItemForm({ ...manualItemForm, makingChargeType: e.target.value })
                      }
                    >
                      <option value="Fixed">Fixed (₹)</option>
                      <option value="Percentage">Percentage (%)</option>
                      <option value="PerGram">Per Gram (₹/gm)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Stone Price (Optional)</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    placeholder="0"
                    step="0.1"
                    value={manualItemForm.stonePrice}
                    onChange={(e) =>
                      setManualItemForm({ ...manualItemForm, stonePrice: e.target.value })
                    }
                  />
                </div>

                <button
                  className="btn-primary"
                  onClick={handleAddManualItem}
                  style={{ width: '100%' }}
                >
                  + Add Item
                </button>
              </div>
            )}
          </div>
          )}

          {/* Selected Items */}
          {activeSection === 'items' && invoiceItems.length > 0 && (
            <div className={styles.card}>
              <h2>Selected Items ({invoiceItems.length})</h2>
              <div className={styles.itemsList}>
                {invoiceItems.map((item) => (
                  <div
                    key={item.id || item.productId}
                    className={styles.itemRow}
                  >
                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>
                        {item.isManual ? item.itemName : item.productName}
                        {item.isManual && <span className={styles.badge}> Manual</span>}
                      </div>
                      <div className={styles.itemMeta}>
                        {item.weight}gm @ ₹{getRateForPurity(item.metal, item.purity) || item.goldRate}/gm ({item.purity})
                      </div>
                    </div>
                    <div className={styles.itemQuantity}>
                      <button
                        className={styles.quantityBtn}
                        onClick={() =>
                          item.isManual
                            ? updateManualItem(item.id, 'quantity', item.quantity - 1)
                            : updateItemQuantity(item.productId, item.quantity - 1)
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        className={styles.quantityInput}
                        value={item.quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1;
                          item.isManual
                            ? updateManualItem(item.id, 'quantity', newQty)
                            : updateItemQuantity(item.productId, newQty);
                        }}
                      />
                      <button
                        className={styles.quantityBtn}
                        onClick={() =>
                          item.isManual
                            ? updateManualItem(item.id, 'quantity', item.quantity + 1)
                            : updateItemQuantity(item.productId, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                    <div className={styles.itemPrice}>
                      ₹{formatAmount(calculateItemPrice(item))}
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() =>
                        item.isManual ? removeManualItem(item.id) : removeItem(item.productId)
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exchange Items */}
          {activeSection === 'exchange' && (
          <div className={styles.card}>
            <h2>Old Gold / Exchange Items (Optional)</h2>

            <div className={styles.manualEntryForm}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="e.g., Old Gold Ring, Broken Necklace"
                  value={manualExchangeForm.description}
                  onChange={(e) =>
                    setManualExchangeForm({ ...manualExchangeForm, description: e.target.value })
                  }
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Metal</label>
                  <select
                    className={styles.formSelect}
                    value={manualExchangeForm.metal}
                    onChange={(e) =>
                      setManualExchangeForm({ ...manualExchangeForm, metal: e.target.value })
                    }
                  >
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Purity</label>
                  <select
                    className={styles.formSelect}
                    value={manualExchangeForm.purity}
                    onChange={(e) =>
                      setManualExchangeForm({ ...manualExchangeForm, purity: e.target.value })
                    }
                  >
                    {manualExchangeForm.metal === 'gold' && (
                      <>
                        <option value="22">22K (91.67%)</option>
                        <option value="18">18K (75%)</option>
                        <option value="14">14K (58.33%)</option>
                        <option value="10">10K (41.67%)</option>
                      </>
                    )}
                    {manualExchangeForm.metal === 'silver' && (
                      <>
                        <option value="999">Silver 999 (99.9%)</option>
                        <option value="925">Silver 925 (92.5%)</option>
                      </>
                    )}
                    {manualExchangeForm.metal === 'platinum' && (
                      <>
                        <option value="950">Platinum 950 (95%)</option>
                        <option value="900">Platinum 900 (90%)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Weight (gm)</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    placeholder="0"
                    step="0.1"
                    value={manualExchangeForm.weight}
                    onChange={(e) =>
                      setManualExchangeForm({ ...manualExchangeForm, weight: e.target.value })
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Current Rate (₹/gm)</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    disabled
                    value={`₹${getRateForPurity(manualExchangeForm.metal, parseFloat(manualExchangeForm.purity)).toFixed(2)}`}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Deduction % ({manualExchangeForm.deductionPercent}%)
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="0"
                  step="0.1"
                  min="0"
                  max="100"
                  value={manualExchangeForm.deductionPercent}
                  onChange={(e) =>
                    setManualExchangeForm({ ...manualExchangeForm, deductionPercent: e.target.value })
                  }
                />
                <small style={{ color: '#666' }}>
                  Amount deducted from final bill calculation
                </small>
              </div>

              <button
                className="btn-primary"
                onClick={handleAddExchange}
                style={{ width: '100%' }}
              >
                + Add Exchange Item
              </button>
            </div>

            {/* Exchange Items List */}
            {exchangeItems.length > 0 && (
              <div className={styles.itemsList} style={{ marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.75rem' }}>Exchange Items List</h3>
                {exchangeItems.map((exchange) => (
                  <div key={exchange.id} className={styles.itemRow}>
                    <div className={styles.itemInfo}>
                      <div className={styles.itemName}>{exchange.description}</div>
                      <div className={styles.itemMeta}>
                        {exchange.weight}gm ({exchange.purity}) - {exchange.deductionPercent}% deduction
                      </div>
                    </div>
                    <div className={styles.itemPrice}>
                      ₹{formatAmount(exchange.exchangeValue)}
                    </div>
                    <button
                      className={styles.removeBtn}
                      onClick={() => removeExchange(exchange.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>}

        {/* Right Column - Calculations & Summary */}
        {isActionFlow && <div className={`${styles.rightColumn} ${styles.flowColumn}`}>
          {(activeSection === 'checkout' || activeSection === 'preview' || activeSection === 'create') && (
          <div className={styles.card}>
            <h2>Calculations</h2>

            {invoiceItems.length > 0 && selectedCustomer && (
              <div className={styles.calculations}>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Subtotal</span>
                  <span className={styles.calcValue}>₹{formatAmount(subtotal)}</span>
                </div>

                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Discount ({discountType})</span>
                  <span className={styles.calcValue}>-₹{formatAmount(discountAmount)}</span>
                </div>

                <div className={styles.calcRow} style={{ borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
                  <span className={styles.calcLabel}>Discounted Subtotal</span>
                  <span className={styles.calcValue}>₹{formatAmount(discountedSubtotal)}</span>
                </div>

                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>
                    {selectedCustomer.address.state !== shopState
                      ? 'IGST'
                      : 'CGST + SGST'}
                  </span>
                  <span className={styles.calcValue}>₹{formatAmount(gst)}</span>
                </div>

                {exchangeItems.length > 0 && (
                  <div className={styles.calcRow} style={{ color: '#d32f2f' }}>
                    <span className={styles.calcLabel}>Exchange Deduction</span>
                    <span className={styles.calcValue}>
                      -₹{formatAmount(calculateExchangeDeduction())}
                    </span>
                  </div>
                )}

                <div
                  className={styles.calcRow}
                  style={{
                    borderTop: '2px solid var(--gold)',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    marginTop: '1rem',
                    paddingTop: '1rem',
                  }}
                >
                  <span className={styles.calcLabel}>Total Amount</span>
                  <span className={styles.calcValue}>₹{formatAmount(total)}</span>
                </div>

                <div className={styles.stateInfo}>
                  <small>
                    Customer State: {selectedCustomer.address.state}
                    {selectedCustomer.address.state === shopState && (
                      <span className={styles.badge}> (CGST+SGST)</span>
                    )}
                    {selectedCustomer.address.state !== shopState && (
                      <span className={styles.badgeIgst}> (IGST)</span>
                    )}
                  </small>
                </div>
              </div>
            )}

            {(!invoiceItems.length || !selectedCustomer) && (
              <p className={styles.placeholder}>
                Select a customer and add items to see calculations
              </p>
            )}
          </div>
          )}

          {/* Discount Section */}
          {activeSection === 'checkout' && invoiceItems.length > 0 && (
            <div className={styles.card}>
              <h2>Discount</h2>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Discount Type</label>
                <select
                  className={styles.formSelect}
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                >
                  <option value="Fixed">Fixed Amount</option>
                  <option value="Percentage">Percentage</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Discount Value</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={discount}
                  onChange={(e) => setDiscount(normalizeMoney(parseFloat(e.target.value) || 0))}
                  step="0.01"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          {activeSection === 'checkout' && invoiceItems.length > 0 && (
            <div className={styles.card}>
              <h2>Payment Details</h2>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Payment Mode</label>
                <select
                  className={styles.formSelect}
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Split">Split Payment</option>
                </select>
              </div>

              {paymentMode !== 'Split' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Amount Paid Now</label>
                    <input
                      type="number"
                      className={styles.formInput}
                      value={paidAmount}
                      onChange={(e) =>
                        setPaidAmount(normalizeMoney(parseFloat(e.target.value) || 0))
                      }
                      step="0.01"
                      min="0"
                    />
                  </div>

                  {(paymentMode === 'UPI' || paymentMode === 'Card') && (
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Reference Number (Optional)</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="Transaction/approval reference"
                      />
                    </div>
                  )}
                </>
              )}

              {paymentMode === 'Split' && (
                <>
                  {splitPayments.map((entry, index) => (
                    <div
                      key={`split-${index}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr auto',
                        gap: '0.75rem',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <select
                        className={styles.formSelect}
                        value={entry.mode}
                        onChange={(e) =>
                          updateSplitPaymentRow(index, 'mode', e.target.value)
                        }
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                      </select>
                      <input
                        type="number"
                        className={styles.formInput}
                        value={entry.amount}
                        onChange={(e) =>
                          updateSplitPaymentRow(
                            index,
                            'amount',
                            normalizeMoney(parseFloat(e.target.value) || 0)
                          )
                        }
                        placeholder={
                          splitPayments.length > 1 && index === splitPayments.length - 1
                            ? 'Auto remaining'
                            : 'Amount'
                        }
                        step="0.01"
                        min="0"
                        disabled={
                          splitPayments.length > 1 && index === splitPayments.length - 1
                        }
                      />
                      <input
                        type="text"
                        className={styles.formInput}
                        value={entry.referenceNumber}
                        onChange={(e) =>
                          updateSplitPaymentRow(
                            index,
                            'referenceNumber',
                            e.target.value
                          )
                        }
                        placeholder="Reference (optional)"
                      />
                      <button
                        className={`${styles.actionButton} btn-secondary`}
                        type="button"
                        onClick={() => removeSplitPaymentRow(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <button
                    className={`${styles.actionButton} btn-secondary`}
                    type="button"
                    onClick={addSplitPaymentRow}
                  >
                    + Add Split Row
                  </button>
                </>
              )}

              <div className={styles.calculations} style={{ marginTop: '1rem' }}>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Auto Payment Status</span>
                  <span className={styles.calcValue}>{getAutoPaymentStatus()}</span>
                </div>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Amount Paid</span>
                  <span className={styles.calcValue}>
                    ₹{formatAmount(getTotalPaidAmount())}
                  </span>
                </div>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Amount Pending</span>
                  <span className={styles.calcValue}>
                    ₹{formatAmount(getPendingAmount())}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {activeSection === 'checkout' && invoiceItems.length > 0 && (
            <div className={styles.card}>
              <h2>Notes</h2>
              <textarea
                className={styles.formTextarea}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows="4"
              ></textarea>
            </div>
          )}

          {/* Action Buttons */}
          {activeSection === 'preview' && invoiceItems.length > 0 && selectedCustomer && (
            <div className={styles.card}>
              <h2>Final Invoice Preview</h2>
              <div className={styles.calculations}>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Customer</span>
                  <span className={styles.calcValue}>{selectedCustomer.name}</span>
                </div>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Items Count</span>
                  <span className={styles.calcValue}>{invoiceItems.length}</span>
                </div>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Exchange Items</span>
                  <span className={styles.calcValue}>{exchangeItems.length}</span>
                </div>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Payment Mode</span>
                  <span className={styles.calcValue}>{paymentMode}</span>
                </div>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Amount Paid</span>
                  <span className={styles.calcValue}>₹{formatAmount(getTotalPaidAmount())}</span>
                </div>
                <div className={styles.calcRow}>
                  <span className={styles.calcLabel}>Pending</span>
                  <span className={styles.calcValue}>₹{formatAmount(getPendingAmount())}</span>
                </div>
                <div className={styles.calcRow} style={{ borderTop: '1px solid #eee', paddingTop: '0.45rem' }}>
                  <span className={styles.calcLabel}>Final Total</span>
                  <span className={styles.calcValue}>₹{formatAmount(total)}</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'create' && invoiceItems.length > 0 && selectedCustomer && (
            <div className={styles.actionButtons}>
              <button
                className={`${styles.actionButton} btn-primary`}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Creating...' : '✓ Create Invoice'}
              </button>
              <button
                className={`${styles.actionButton} btn-secondary`}
                onClick={() => {
                  setInvoiceItems([]);
                  setDiscount(0);
                  setNotes('');
                }}
              >
                Reset Form
              </button>
            </div>
          )}
        </div>}
      </div>
    </div>
  );
}
