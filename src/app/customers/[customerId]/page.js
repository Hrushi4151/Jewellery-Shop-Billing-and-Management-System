'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Common/Header';
import styles from './customer-details.module.css';

export default function CustomerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = Array.isArray(params.customerId)
    ? params.customerId[0]
    : params.customerId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');

  const [editForm, setEditForm] = useState({
    name: '',
    mobileNumber: '',
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
    },
  });

  const [paymentForms, setPaymentForms] = useState({});

  const fetchCustomerData = useCallback(async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      setError('');

      const [customerRes, invoicesRes] = await Promise.all([
        fetch(`/api/customers/${customerId}`),
        fetch(`/api/invoices?customerId=${customerId}&limit=100`),
      ]);

      const customerData = await customerRes.json();
      const invoicesData = await invoicesRes.json();

      if (!customerRes.ok) {
        throw new Error(customerData.message || 'Failed to fetch customer details');
      }

      if (!invoicesRes.ok) {
        throw new Error(invoicesData.message || 'Failed to fetch customer invoices');
      }

      setCustomer(customerData.customer);
      setInvoices(invoicesData.invoices || []);

      setEditForm({
        name: customerData.customer.name || '',
        mobileNumber: customerData.customer.mobileNumber || '',
        email: customerData.customer.email || '',
        address: {
          street: customerData.customer.address?.street || '',
          city: customerData.customer.address?.city || '',
          state: customerData.customer.address?.state || '',
          pincode: customerData.customer.address?.pincode || '',
        },
      });

      const initialPaymentForms = {};
      (invoicesData.invoices || []).forEach((invoice) => {
        initialPaymentForms[invoice._id] = {
          amount: '',
          paymentMode: 'Cash',
          referenceNumber: '',
          loading: false,
        };
      });
      setPaymentForms(initialPaymentForms);
    } catch (err) {
      setError(err.message || 'Error loading customer details');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchCustomerData();
  }, [router, fetchCustomerData]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setEditForm((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value,
        },
      }));
      return;
    }

    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveCustomerChanges = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to update customer');
        return;
      }

      alert('Customer updated successfully');
      fetchCustomerData();
    } catch (err) {
      alert(err.message || 'Error updating customer');
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentFormChange = (invoiceId, field, value) => {
    setPaymentForms((prev) => ({
      ...prev,
      [invoiceId]: {
        ...prev[invoiceId],
        [field]: value,
      },
    }));
  };

  const payPendingAmount = async (invoice) => {
    const form = paymentForms[invoice._id];
    const amount = parseFloat(form?.amount || 0);

    if (!amount || amount <= 0) {
      alert('Enter valid payment amount');
      return;
    }

    if (amount > (invoice.amountPending || 0)) {
      alert('Payment amount cannot exceed pending amount');
      return;
    }

    try {
      setPaymentForms((prev) => ({
        ...prev,
        [invoice._id]: { ...prev[invoice._id], loading: true },
      }));

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice._id,
          amount,
          paymentMode: form.paymentMode || 'Cash',
          referenceNumber: form.referenceNumber || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to record payment');
        return;
      }

      alert('Payment recorded successfully');
      await fetchCustomerData();
    } catch (err) {
      alert(err.message || 'Error recording payment');
    } finally {
      setPaymentForms((prev) => ({
        ...prev,
        [invoice._id]: {
          ...prev[invoice._id],
          loading: false,
          amount: '',
          paymentMode: 'Cash',
          referenceNumber: '',
        },
      }));
    }
  };

  const formatCurrency = (value) =>
    `₹${(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <>
        <Header user={JSON.parse(localStorage.getItem('user') || '{}')} />
        <div className={styles.container}>
          <div className={styles.loading}>Loading customer details...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header user={JSON.parse(localStorage.getItem('user') || '{}')} />
        <div className={styles.container}>
          <div className={styles.error}>{error}</div>
        </div>
      </>
    );
  }

  const totalPurchase = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
  const totalPending = invoices.reduce((sum, inv) => sum + (inv.amountPending || 0), 0);

  return (
    <>
      <Header user={JSON.parse(localStorage.getItem('user') || '{}')} />
      <div className={styles.container}>
        <div className={styles.topBar}>
          <h1>Customer Details</h1>
          <Link href="/customers" className={styles.backBtn}>
            Back to Customers
          </Link>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span>Total Purchases</span>
            <strong>{formatCurrency(totalPurchase)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Total Paid</span>
            <strong className={styles.paid}>{formatCurrency(totalPaid)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Total Pending</span>
            <strong className={styles.pending}>{formatCurrency(totalPending)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Total Invoices</span>
            <strong>{invoices.length}</strong>
          </div>
        </div>

        <div className={styles.card}>
          <h2>Edit Customer</h2>
          <div className={styles.formGrid}>
            <input name="name" value={editForm.name} onChange={handleEditChange} placeholder="Name" />
            <input name="mobileNumber" value={editForm.mobileNumber} onChange={handleEditChange} placeholder="Mobile" />
            <input name="email" value={editForm.email} onChange={handleEditChange} placeholder="Email" />
            <input name="address.city" value={editForm.address.city} onChange={handleEditChange} placeholder="City" />
            <input name="address.state" value={editForm.address.state} onChange={handleEditChange} placeholder="State" />
            <input name="address.pincode" value={editForm.address.pincode} onChange={handleEditChange} placeholder="Pincode" />
            <input name="address.street" value={editForm.address.street} onChange={handleEditChange} placeholder="Street" className={styles.streetInput} />
          </div>
          <button onClick={saveCustomerChanges} disabled={saving} className={styles.primaryBtn}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className={styles.card}>
          <h2>Purchases</h2>
          {invoices.length === 0 ? (
            <div className={styles.noData}>No purchases found for this customer.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Invoice No.</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Pending</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => {
                    const form = paymentForms[invoice._id] || {
                      amount: '',
                      paymentMode: 'Cash',
                      referenceNumber: '',
                      loading: false,
                    };

                    return (
                      <tr key={invoice._id}>
                        <td>
                          <Link href={`/customer-invoice/${customerId}/${invoice._id}`} className={styles.invoiceLink}>
                            {invoice.invoiceNumber}
                          </Link>
                        </td>
                        <td>{new Date(invoice.createdAt).toLocaleDateString('en-IN')}</td>
                        <td>{formatCurrency(invoice.totalAmount)}</td>
                        <td className={styles.paid}>{formatCurrency(invoice.amountPaid)}</td>
                        <td className={styles.pending}>{formatCurrency(invoice.amountPending)}</td>
                        <td>{invoice.paymentStatus}</td>
                        <td>
                          {invoice.amountPending > 0 ? (
                            <div className={styles.paymentRow}>
                              <input
                                type="number"
                                placeholder="Amount"
                                value={form.amount}
                                min="0"
                                max={invoice.amountPending}
                                onChange={(e) =>
                                  handlePaymentFormChange(invoice._id, 'amount', e.target.value)
                                }
                              />
                              <select
                                value={form.paymentMode}
                                onChange={(e) =>
                                  handlePaymentFormChange(invoice._id, 'paymentMode', e.target.value)
                                }
                              >
                                <option value="Cash">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="Card">Card</option>
                                <option value="NetBanking">NetBanking</option>
                                <option value="Cheque">Cheque</option>
                              </select>
                              <input
                                type="text"
                                placeholder="Ref"
                                value={form.referenceNumber}
                                onChange={(e) =>
                                  handlePaymentFormChange(
                                    invoice._id,
                                    'referenceNumber',
                                    e.target.value
                                  )
                                }
                              />
                              <button
                                onClick={() => payPendingAmount(invoice)}
                                disabled={form.loading}
                                className={styles.primaryBtn}
                              >
                                {form.loading ? 'Paying...' : 'Pay'}
                              </button>
                            </div>
                          ) : (
                            <span className={styles.paidTag}>Fully Paid</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
