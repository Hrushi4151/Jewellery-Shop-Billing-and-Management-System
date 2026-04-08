import React, { useState, useEffect } from 'react';
import styles from './ManageEstimates.module.css';

export default function ManageEstimates() {
  const [estimates, setEstimates] = useState([]);
  const [selectedEstimate, setSelectedEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchEstimates();
  }, []);

  const fetchEstimates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/invoices?type=Estimate');
      const data = await response.json();
      setEstimates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to fetch estimates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToInvoice = async (estimateId) => {
    if (!window.confirm('Convert this estimate to invoice?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/invoices/convert-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimateId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to convert estimate');
      }

      setSuccessMessage(`Estimate converted to Invoice #${data.invoice.invoiceNumber}`);
      setSelectedEstimate(null);
      fetchEstimates();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Error converting estimate');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEstimate = async (estimateId) => {
    if (!window.confirm('Delete this estimate?')) return;

    try {
      const response = await fetch(`/api/invoices/${estimateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete estimate');
      }

      setSuccessMessage('Estimate deleted successfully');
      setSelectedEstimate(null);
      fetchEstimates();

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Error deleting estimate');
    }
  };

  if (loading && estimates.length === 0) {
    return <div className={styles.loading}>Loading estimates...</div>;
  }

  return (
    <div className={styles.container}>
      <h2>Manage Estimates</h2>

      {error && <div className={styles.error}>{error}</div>}
      {successMessage && <div className={styles.success}>{successMessage}</div>}

      <div className={styles.estimatesList}>
        {estimates.length === 0 ? (
          <p className={styles.noData}>No estimates found</p>
        ) : (
          estimates.map((estimate) => (
            <div
              key={estimate._id}
              className={`${styles.estimateCard} ${
                selectedEstimate?._id === estimate._id ? styles.selected : ''
              }`}
              onClick={() => setSelectedEstimate(estimate)}
            >
              <div className={styles.header}>
                <h3>{estimate.invoiceNumber}</h3>
                <span className={styles.date}>
                  {new Date(estimate.createdAt).toLocaleDateString('en-IN')}
                </span>
              </div>

              <div className={styles.details}>
                <p>
                  <strong>Customer:</strong> {estimate.customerId?.name || 'N/A'}
                </p>
                <p>
                  <strong>Amount:</strong> ₹
                  {(estimate.totalAmount || 0).toLocaleString('en-IN')}
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={styles.status}>{estimate.status}</span>
                </p>
              </div>

              {selectedEstimate?._id === estimate._id && (
                <div className={styles.actions}>
                  <button
                    className={styles.convertBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConvertToInvoice(estimate._id);
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Converting...' : 'Convert to Invoice'}
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEstimate(estimate._id);
                    }}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {selectedEstimate && (
        <div className={styles.detailsPanel}>
          <h3>Estimate Details</h3>

          <div className={styles.itemsList}>
            <h4>Items</h4>
            {(selectedEstimate.items || []).map((item, idx) => (
              <div key={idx} className={styles.itemRow}>
                <span>{item.productName}</span>
                <span>{item.weight}g</span>
                <span>₹{(item.itemAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Subtotal:</span>
              <span>
                ₹
                {(
                  (selectedEstimate.totalAmount || 0) - (selectedEstimate.totalGST || 0)
                ).toLocaleString('en-IN')}
              </span>
            </div>
            {selectedEstimate.totalGST > 0 && (
              <div className={styles.summaryRow}>
                <span>GST:</span>
                <span>
                  ₹{(selectedEstimate.totalGST || 0).toLocaleString('en-IN')}
                </span>
              </div>
            )}
            <div className={styles.summaryRow + ' ' + styles.total}>
              <span>Total:</span>
              <span>
                ₹{(selectedEstimate.totalAmount || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {selectedEstimate.notes && (
            <div className={styles.notes}>
              <strong>Notes:</strong>
              <p>{selectedEstimate.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
