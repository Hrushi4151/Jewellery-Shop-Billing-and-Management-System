'use client';
import React, { useState, useEffect } from 'react';
import styles from './ReturnExchange.module.css';

export default function ReturnExchange() {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    returnType: 'Return',
    returnReason: '',
    returnItems: [],
    returnAmount: 0,
    refundMode: 'Cash',
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/invoices?status=Finalized');
      const data = await response.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch invoices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInvoice = async (invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      returnType: 'Return',
      returnReason: '',
      returnItems: (invoice.items || []).map((item) => ({
        ...item,
        includeInReturn: false,
      })),
      returnAmount: 0,
      refundMode: 'Cash',
    });
    setShowForm(true);

    // Fetch existing returns for this invoice
    try {
      const response = await fetch(
        `/api/invoices/return-exchange?originalInvoiceId=${invoice._id}`
      );
      const data = await response.json();
      setReturns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching returns:', err);
    }
  };

  const handleItemToggle = (index) => {
    const updatedItems = [...formData.returnItems];
    updatedItems[index].includeInReturn = !updatedItems[index].includeInReturn;
    setFormData({ ...formData, returnItems: updatedItems });

    // Recalculate return amount
    const totalAmount = updatedItems
      .filter((item) => item.includeInReturn)
      .reduce((sum, item) => sum + (item.itemAmount || 0), 0);
    setFormData({ ...formData, returnItems: updatedItems, returnAmount: totalAmount });
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();

    const selectedItems = formData.returnItems.filter((item) => item.includeInReturn);

    if (selectedItems.length === 0) {
      setError('Please select at least one item to return');
      return;
    }

    if (!formData.returnReason.trim()) {
      setError('Please provide a reason for the return');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/invoices/return-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalInvoiceId: selectedInvoice._id,
          returnType: formData.returnType,
          returnReason: formData.returnReason,
          returnItems: selectedItems,
          returnAmount: formData.returnAmount,
          refundMode: formData.refundMode,
          customerId: selectedInvoice.customerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create return');
      }

      setSuccessMessage(
        `${formData.returnType} created successfully - Reference: ${data.returnInvoice.invoiceNumber}`
      );
      setShowForm(false);
      handleSelectInvoice(selectedInvoice); // Refresh returns list

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Error creating return');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && invoices.length === 0) {
    return <div className={styles.loading}>Loading invoices...</div>;
  }

  return (
    <div className={styles.container}>
      <h2>Return & Exchange Management</h2>

      {error && <div className={styles.error}>{error}</div>}
      {successMessage && <div className={styles.success}>{successMessage}</div>}

      <div className={styles.mainGrid}>
        <div className={styles.invoicesList}>
          <h3>Select Invoice</h3>
          <div className={styles.list}>
            {invoices.length === 0 ? (
              <p className={styles.noData}>No finalized invoices found</p>
            ) : (
              invoices.map((invoice) => (
                <div
                  key={invoice._id}
                  className={`${styles.invoiceItem} ${
                    selectedInvoice?._id === invoice._id ? styles.selected : ''
                  }`}
                  onClick={() => handleSelectInvoice(invoice)}
                >
                  <div className={styles.invoiceInfo}>
                    <strong>{invoice.invoiceNumber}</strong>
                    <span className={styles.date}>
                      {new Date(invoice.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className={styles.amount}>
                    ₹{(invoice.totalAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedInvoice && (
          <div className={styles.detailsSection}>
            <div className={styles.invoiceDetails}>
              <h3>Invoice Details</h3>
              <div className={styles.detail}>
                <span>Invoice Number:</span>
                <strong>{selectedInvoice.invoiceNumber}</strong>
              </div>
              <div className={styles.detail}>
                <span>Customer:</span>
                <strong>{selectedInvoice.customerId?.name || 'N/A'}</strong>
              </div>
              <div className={styles.detail}>
                <span>Total Amount:</span>
                <strong>₹{(selectedInvoice.totalAmount || 0).toLocaleString('en-IN')}</strong>
              </div>

              {returns.length > 0 && (
                <div className={styles.returnsHistory}>
                  <h4>Return/Exchange History</h4>
                  {returns.map((ret, idx) => (
                    <div key={idx} className={styles.returnItem}>
                      <div className={styles.returnItemInfo}>
                        <span className={styles.refNo}>{ret.invoiceNumber}</span>
                        <span className={styles.returnType}>{ret.invoiceType}</span>
                      </div>
                      <div className={styles.returnItemAmount}>
                        ₹{Math.abs(ret.totalAmount).toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {showForm && (
              <form className={styles.returnForm} onSubmit={handleSubmitReturn}>
                <h3>Create {formData.returnType}</h3>

                <div className={styles.formGroup}>
                  <label>Return Type</label>
                  <div className={styles.radioGroup}>
                    <label>
                      <input
                        type="radio"
                        value="Return"
                        checked={formData.returnType === 'Return'}
                        onChange={(e) =>
                          setFormData({ ...formData, returnType: e.target.value })
                        }
                      />
                      Return
                    </label>
                    <label>
                      <input
                        type="radio"
                        value="Exchange"
                        checked={formData.returnType === 'Exchange'}
                        onChange={(e) =>
                          setFormData({ ...formData, returnType: e.target.value })
                        }
                      />
                      Exchange
                    </label>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Return Reason</label>
                  <textarea
                    value={formData.returnReason}
                    onChange={(e) =>
                      setFormData({ ...formData, returnReason: e.target.value })
                    }
                    placeholder="Describe the reason for return..."
                    rows="3"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Items to Return</label>
                  <div className={styles.itemsCheckbox}>
                    {formData.returnItems.map((item, idx) => (
                      <div key={idx} className={styles.checkboxItem}>
                        <input
                          type="checkbox"
                          id={`item-${idx}`}
                          checked={item.includeInReturn}
                          onChange={() => handleItemToggle(idx)}
                        />
                        <label htmlFor={`item-${idx}`}>
                          <span className={styles.itemName}>{item.productName}</span>
                          <span className={styles.itemDetails}>
                            {item.weight}g - ₹{(item.itemAmount || 0).toLocaleString('en-IN')}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Return Amount</label>
                  <input
                    type="text"
                    value={`₹${formData.returnAmount.toLocaleString('en-IN')}`}
                    disabled
                    className={styles.disabledInput}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Refund Mode</label>
                  <select
                    value={formData.refundMode}
                    onChange={(e) =>
                      setFormData({ ...formData, refundMode: e.target.value })
                    }
                  >
                    <option value="Cash">Cash</option>
                    <option value="CreditNote">Credit Note</option>
                    <option value="Online">Online Transfer</option>
                  </select>
                </div>

                {formData.refundMode === 'CreditNote' && (
                  <div className={styles.info}>
                    ℹ️ A credit note for ₹{formData.returnAmount.toLocaleString('en-IN')} will be
                    issued for future purchases
                  </div>
                )}

                <div className={styles.formActions}>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading || formData.returnAmount === 0}
                  >
                    {loading ? 'Processing...' : `Create ${formData.returnType}`}
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setShowForm(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {!showForm && (
              <button
                className={styles.createBtn}
                onClick={() => setShowForm(true)}
              >
                + Create Return/Exchange
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
