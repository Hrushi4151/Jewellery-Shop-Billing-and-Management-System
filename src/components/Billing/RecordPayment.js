'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './RecordPayment.module.css';

export default function RecordPayment() {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [allPayments, setAllPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsStatusFilter, setPaymentsStatusFilter] = useState('All');
  const [paymentsModeFilter, setPaymentsModeFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('pending');
  const searchBoxRef = useRef(null);

  const paymentModes = ['Cash', 'UPI', 'Card', 'NetBanking', 'Cheque'];

  const getPaymentStatus = (status) => {
    const statusClasses = {
      Pending: 'badge-error',
      PartialPaid: 'badge-warning',
      Paid: 'badge-success',
      Confirmed: 'badge-success',
      Failed: 'badge-error',
      Cancelled: 'badge-default',
    };

    return statusClasses[status] || 'badge-default';
  };

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page,
        limit: 10,
        status: 'Finalized',
        ...(invoiceSearch && { search: invoiceSearch }),
      });

      const res = await fetch(`/api/invoices?${query}`);
      const data = await res.json();

      const unpaidInvoices = (data.invoices || []).filter(
        (invoice) => (invoice.amountPending || 0) > 0
      );

      setInvoices(unpaidInvoices);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [page, invoiceSearch]);

  const fetchAllPayments = useCallback(async () => {
    try {
      setPaymentsLoading(true);
      const query = new URLSearchParams({
        page: paymentsPage,
        limit: 10,
        ...(paymentsSearch && { search: paymentsSearch }),
        ...(paymentsStatusFilter && { status: paymentsStatusFilter }),
        ...(paymentsModeFilter && { paymentMode: paymentsModeFilter }),
      });

      const res = await fetch(`/api/payments?${query}`);
      const data = await res.json();

      setAllPayments(data.payments || []);
      setPaymentsTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching all payments:', error);
    } finally {
      setPaymentsLoading(false);
    }
  }, [paymentsPage, paymentsSearch, paymentsStatusFilter, paymentsModeFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    fetchAllPayments();
  }, [fetchAllPayments]);

  useEffect(() => {
    const onFocus = () => {
      fetchAllPayments();
      fetchInvoices();
    };

    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchAllPayments, fetchInvoices]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target)) {
        setShowInvoiceDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInvoiceSearch = (value) => {
    setInvoiceSearch(value);
    setShowInvoiceDropdown(true);
    setPage(1);
  };

  const closePaymentModal = () => {
    setSelectedInvoice(null);
    setPaymentAmount('');
    setPaymentMode('Cash');
    setReferenceNumber('');
    setPaymentHistory([]);
  };

  const selectInvoice = async (invoice) => {
    setSelectedInvoice(invoice);
    setActiveTab('pending');
    setInvoiceSearch('');
    setShowInvoiceDropdown(false);
    setPaymentAmount('');
    setPaymentMode('Cash');
    setReferenceNumber('');

    try {
      const res = await fetch(`/api/payments?invoiceId=${invoice._id}`);
      const data = await res.json();
      setPaymentHistory(data.payments || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (!selectedInvoice) {
      alert('Please select an invoice');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (amount > selectedInvoice.amountPending) {
      alert(
        `Payment amount cannot exceed pending amount (₹${selectedInvoice.amountPending.toLocaleString('en-IN')})`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice._id,
          customerId: selectedInvoice.customerId,
          amount,
          paymentMode,
          referenceNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Error recording payment');
        return;
      }

      setSelectedInvoice(
        data.invoice || {
          ...selectedInvoice,
          amountPending: selectedInvoice.amountPending - amount,
        }
      );

      const newPaymentHistory = Array.isArray(paymentHistory) ? paymentHistory : [];
      setPaymentHistory([data.payment, ...newPaymentHistory]);

      setPaymentAmount('');
      setPaymentMode('Cash');
      setReferenceNumber('');

      fetchInvoices();
      fetchAllPayments();

      const historyRes = await fetch(`/api/payments?invoiceId=${selectedInvoice._id}`);
      const historyData = await historyRes.json();
      setPaymentHistory(historyData.payments || []);
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Record Payment</h1>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'pending' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Payments
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === 'all' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Payments
        </button>
      </div>

      {activeTab === 'pending' ? (
        <div className={styles.tabPanel}>
          <div className={styles.pendingTabLayout}>
            <div className={styles.card}>
              <h2>Pending Invoice Search</h2>

              <div className={styles.searchBox} ref={searchBoxRef}>
                <input
                  type="text"
                  placeholder="Search invoice number or customer name..."
                  value={invoiceSearch}
                  onChange={(e) => handleInvoiceSearch(e.target.value)}
                  onFocus={() => setShowInvoiceDropdown(true)}
                  onBlur={() => setTimeout(() => setShowInvoiceDropdown(false), 120)}
                />
                {showInvoiceDropdown && invoices.length > 0 && (
                  <div className={styles.dropdown}>
                    {invoices.map((invoice) => (
                      <div
                        key={invoice._id}
                        className={styles.dropdownItem}
                        onClick={() => selectInvoice(invoice)}
                      >
                        <div className={styles.invoiceDropdownName}>
                          {invoice.invoiceNumber}
                        </div>
                        <div className={styles.invoiceDropdownDetail}>
                          {invoice.customerId?.name} - Pending: ₹{invoice.amountPending?.toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <h2>Pending Invoices</h2>
              {loading ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                  Loading invoices...
                </p>
              ) : invoices.length > 0 ? (
                <>
                  <div className={styles.invoicesTable}>
                    <table>
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Customer</th>
                          <th>Date</th>
                          <th>Total</th>
                          <th>Pending</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr
                            key={invoice._id}
                            className={styles.invoiceRow}
                            onClick={() => selectInvoice(invoice)}
                          >
                            <td className={styles.invoiceNum}>{invoice.invoiceNumber}</td>
                            <td>{invoice.customerId?.name || '-'}</td>
                            <td>{new Date(invoice.createdAt).toLocaleDateString('en-IN')}</td>
                            <td>₹{invoice.totalAmount?.toLocaleString('en-IN')}</td>
                            <td className={styles.pendingAmount}>₹{invoice.amountPending?.toLocaleString('en-IN')}</td>
                            <td>
                              <span className={`badge ${getPaymentStatus(invoice.paymentStatus)}`}>
                                {invoice.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.pagination}>
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="btn-secondary"
                    >
                      ← Previous
                    </button>
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                      className="btn-primary"
                    >
                      Next →
                    </button>
                  </div>
                </>
              ) : (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  No pending invoices found
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.card} style={{ marginTop: '2rem' }}>
          <h2>All Payments</h2>
          <p className={styles.helperText}>
            Each row is a payment transaction. One invoice can have multiple payments.
          </p>

          <div className={styles.paymentsFilters}>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Search by invoice no, customer name, mobile..."
              value={paymentsSearch}
              onChange={(e) => {
                setPaymentsSearch(e.target.value);
                setPaymentsPage(1);
              }}
            />

            <select
              className={styles.filterSelect}
              value={paymentsStatusFilter}
              onChange={(e) => {
                setPaymentsStatusFilter(e.target.value);
                setPaymentsPage(1);
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Failed">Failed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              className={styles.filterSelect}
              value={paymentsModeFilter}
              onChange={(e) => {
                setPaymentsModeFilter(e.target.value);
                setPaymentsPage(1);
              }}
            >
              <option value="All">All Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="NetBanking">NetBanking</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {paymentsLoading ? (
            <p style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
              Loading payments...
            </p>
          ) : allPayments.length > 0 ? (
            <>
              <div className={styles.invoicesTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Mobile</th>
                      <th>Amount</th>
                      <th>Mode</th>
                      <th>Status</th>
                      <th>Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPayments.map((payment) => (
                      <tr key={payment._id}>
                        <td>{new Date(payment.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className={styles.invoiceNum}>{payment.invoiceId?.invoiceNumber || '-'}</td>
                        <td>{payment.customerId?.name || '-'}</td>
                        <td>{payment.customerId?.mobileNumber || '-'}</td>
                        <td>₹{payment.amount?.toLocaleString('en-IN')}</td>
                        <td>{payment.paymentMode}</td>
                        <td>
                          <span className={`badge ${getPaymentStatus(payment.status)}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td>{payment.referenceNumber || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.pagination}>
                <button
                  disabled={paymentsPage === 1}
                  onClick={() => setPaymentsPage(paymentsPage - 1)}
                  className="btn-secondary"
                >
                  ← Previous
                </button>
                <span>
                  Page {paymentsPage} of {paymentsTotalPages}
                </span>
                <button
                  disabled={paymentsPage === paymentsTotalPages}
                  onClick={() => setPaymentsPage(paymentsPage + 1)}
                  className="btn-primary"
                >
                  Next →
                </button>
              </div>
            </>
          ) : (
            <p style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>
              No payments found
            </p>
          )}
        </div>
      )}

      {selectedInvoice && (
        <div className={styles.modalOverlay} onClick={closePaymentModal}>
          <div className={styles.modalWindow} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Record Payment</h2>
                <p className={styles.modalSubtitle}>
                  {selectedInvoice.invoiceNumber} · {selectedInvoice.customerId?.name || 'N/A'}
                </p>
              </div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={closePaymentModal}
                aria-label="Close payment window"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalColumn}>
                <div className={styles.modalSection}>
                  <h3>Invoice Details</h3>
                  <div className={styles.invoiceHeader}>
                    <div>
                      <p className={styles.invoiceNumber}>{selectedInvoice.invoiceNumber}</p>
                      <p className={styles.customerName}>
                        {selectedInvoice.customerId?.name || 'N/A'}
                      </p>
                    </div>
                    <span className={`badge ${getPaymentStatus(selectedInvoice.paymentStatus)}`}>
                      {selectedInvoice.paymentStatus}
                    </span>
                  </div>

                  <div className={styles.invoiceDetails}>
                    <div className={styles.detailRow}>
                      <span>Invoice Date:</span>
                      <strong>{new Date(selectedInvoice.createdAt).toLocaleDateString('en-IN')}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Total Amount:</span>
                      <strong>₹{selectedInvoice.totalAmount?.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Amount Paid:</span>
                      <strong className={styles.paid}>
                        ₹{selectedInvoice.amountPaid?.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>Amount Pending:</span>
                      <strong className={styles.pending}>
                        ₹{selectedInvoice.amountPending?.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className={styles.modalSection}>
                  <h3>Payment History</h3>
                  {paymentHistory.length > 0 ? (
                    <div className={styles.paymentList}>
                      {paymentHistory.map((payment) => (
                        <div key={payment._id} className={styles.paymentItem}>
                          <div className={styles.paymentMainInfo}>
                            <div>
                              <div className={styles.paymentAmount}>
                                ₹{payment.amount?.toLocaleString('en-IN')}
                              </div>
                              <div className={styles.paymentDate}>
                                {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                              </div>
                            </div>
                            <div>
                              <div className={styles.paymentMode}>{payment.paymentMode}</div>
                              <span className={`badge ${getPaymentStatus(payment.status)}`}>
                                {payment.status}
                              </span>
                            </div>
                          </div>
                          {payment.referenceNumber && (
                            <div className={styles.paymentRef}>
                              Ref: {payment.referenceNumber}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.modalEmptyState}>No payments recorded yet.</p>
                  )}
                </div>
              </div>

              <div className={styles.modalColumn}>
                <div className={styles.modalSection}>
                  <h3>Record New Payment</h3>

                  <form onSubmit={handlePaymentSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                      <label>Payment Amount (Required) *</label>
                      <div className={styles.amountInputWrapper}>
                        <span className={styles.currency}>₹</span>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          max={selectedInvoice.amountPending}
                          required
                        />
                      </div>
                      <div className={styles.amountHelper}>
                        <small>
                          Max: ₹{selectedInvoice.amountPending?.toLocaleString('en-IN')}
                        </small>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Payment Mode</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                      >
                        {paymentModes.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Reference Number</label>
                      <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="UPI ID / Cheque No / Card Ref..."
                      />
                    </div>

                    <div className={styles.summaryBox}>
                      <div className={styles.summaryRow}>
                        <span>Invoice Pending:</span>
                        <strong>
                          ₹{selectedInvoice.amountPending?.toLocaleString('en-IN')}
                        </strong>
                      </div>
                      {paymentAmount && (
                        <>
                          <div className={styles.summaryRow}>
                            <span>This Payment:</span>
                            <strong className={styles.paymentBold}>
                              ₹{parseFloat(paymentAmount || 0).toLocaleString('en-IN')}
                            </strong>
                          </div>
                          <div className={styles.summaryRow}>
                            <span>Remaining:</span>
                            <strong>
                              ₹{(selectedInvoice.amountPending - (parseFloat(paymentAmount) || 0)).toLocaleString('en-IN')}
                            </strong>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={loading || !paymentAmount}
                      style={{ width: '100%' }}
                    >
                      {loading ? 'Processing...' : '✓ Record Payment'}
                    </button>
                  </form>
                </div>

                <div className={styles.modalSection}>
                  <h3>Invoice Items</h3>
                  <div className={styles.itemsList}>
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                      selectedInvoice.items.map((item, idx) => (
                        <div key={idx} className={styles.invoiceItem}>
                          <div className={styles.itemName}>{item.productName || 'Item'}</div>
                          <div className={styles.itemDetail}>
                            {item.quantity} × {item.purity}
                          </div>
                          <div className={styles.itemPrice}>
                            ₹{item.itemTotal?.toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className={styles.modalEmptyState}>No items available.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
