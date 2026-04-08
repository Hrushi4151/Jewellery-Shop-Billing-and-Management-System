'use client';

import React, { useState, useEffect } from 'react';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ManageCustomers.module.css';

export default function ManageCustomers() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // SMS Verification States
  const [smsVerification, setSmsVerification] = useState({
    mobileNumber: '',
    isVerificationSent: false,
    isVerified: false,
    otpCode: '',
    verificationError: '',
    isVerifying: false,
  });

  const [formData, setFormData] = useState({
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

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
      });

      const res = await fetch(`/api/customers?${query}`);
      const data = await res.json();

      setCustomers(data.customers || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [field]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  // Send SMS OTP
  const handleSendOTP = async () => {
    const mobileNumber = formData.mobileNumber;

    if (!mobileNumber || mobileNumber.length < 10) {
      setSmsVerification((prev) => ({
        ...prev,
        verificationError: 'Please enter a valid 10-digit mobile number',
      }));
      return;
    }

    setSmsVerification((prev) => ({
      ...prev,
      isVerifying: true,
      verificationError: '',
    }));

    try {
      const res = await fetch('/api/customers/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSmsVerification((prev) => ({
          ...prev,
          isVerifying: false,
          verificationError: data.message || 'Failed to send OTP',
        }));
        return;
      }

      setSmsVerification((prev) => ({
        ...prev,
        mobileNumber,
        isVerificationSent: true,
        isVerifying: false,
        verificationError: '',
        otpCode: '',
      }));

      alert('✅ OTP sent successfully! Check your mobile phone.');
    } catch (error) {
      setSmsVerification((prev) => ({
        ...prev,
        isVerifying: false,
        verificationError: 'Error sending OTP: ' + error.message,
      }));
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    const { otpCode, mobileNumber } = smsVerification;

    if (!otpCode || otpCode.length !== 6) {
      setSmsVerification((prev) => ({
        ...prev,
        verificationError: 'Please enter 6-digit OTP',
      }));
      return;
    }

    setSmsVerification((prev) => ({
      ...prev,
      isVerifying: true,
      verificationError: '',
    }));

    try {
      const res = await fetch('/api/customers/verify-sms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, code: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSmsVerification((prev) => ({
          ...prev,
          isVerifying: false,
          verificationError: data.message || 'Invalid OTP',
        }));
        return;
      }

      setSmsVerification((prev) => ({
        ...prev,
        isVerified: true,
        isVerifying: false,
        verificationError: '',
      }));

      alert('✅ Mobile number verified successfully!');
    } catch (error) {
      setSmsVerification((prev) => ({
        ...prev,
        isVerifying: false,
        verificationError: 'Error verifying OTP: ' + error.message,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if mobile verification is done for new customers
    if (!editingId && !smsVerification.isVerified) {
      alert('❌ Please verify your mobile number with SMS OTP first');
      return;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/customers/${editingId}` : '/api/customers';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Error saving customer');
        return;
      }

      alert('✅ Customer saved successfully');
      setShowForm(false);
      setEditingId(null);
      setSmsVerification({
        mobileNumber: '',
        isVerificationSent: false,
        isVerified: false,
        otpCode: '',
        verificationError: '',
        isVerifying: false,
      });
      setFormData({
        name: '',
        mobileNumber: '',
        email: '',
        address: { street: '', city: '', state: '', pincode: '' },
      });
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Error saving customer');
    }
  };

  const handleEdit = (customer) => {
    setFormData(customer);
    setEditingId(customer._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Error deleting customer');
        return;
      }

      alert('Customer deleted successfully');
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setSmsVerification({
      mobileNumber: '',
      isVerificationSent: false,
      isVerified: false,
      otpCode: '',
      verificationError: '',
      isVerifying: false,
    });
    setFormData({
      name: '',
      mobileNumber: '',
      email: '',
      address: { street: '', city: '', state: '', pincode: '' },
    });
  };

  const goToCustomerDetails = (customerId) => {
    router.push(`/customers/${customerId}`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Customer Management</h1>
        <button
          className="btn-primary"
          onClick={() => setShowForm(true)}
        >
          + Add New Customer
        </button>
      </div>

      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search by name, mobile, or email..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {showForm && (
        <div className={styles.formModal}>
          <div className={styles.formContent}>
            <h2>{editingId ? 'Edit Customer' : 'Add New Customer'}</h2>

            <form onSubmit={handleSubmit}>
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Mobile Number *</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="tel"
                        name="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={handleInputChange}
                        placeholder="10-digit number"
                        required
                        disabled={smsVerification.isVerified}
                      />
                      
                      {/* SMS Verification UI */}
                      {!editingId && (
                        <div style={{ marginTop: '8px' }}>
                          {!smsVerification.isVerificationSent ? (
                            <button
                              type="button"
                              onClick={handleSendOTP}
                              disabled={smsVerification.isVerifying || !formData.mobileNumber}
                              style={{
                                padding: '8px 16px',
                                background: '#1976d2',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: smsVerification.isVerifying ? 'not-allowed' : 'pointer',
                                opacity: smsVerification.isVerifying ? 0.6 : 1,
                                fontSize: '14px',
                                fontWeight: '600',
                              }}
                            >
                              {smsVerification.isVerifying ? 'Sending...' : 'Send OTP'}
                            </button>
                          ) : smsVerification.isVerified ? (
                            <div
                              style={{
                                padding: '8px 12px',
                                background: '#e8f5e9',
                                color: '#2e7d32',
                                borderRadius: '4px',
                                fontSize: '14px',
                                fontWeight: '600',
                              }}
                            >
                              ✅ Verified
                            </div>
                          ) : (
                            <div>
                              <input
                                type="text"
                                placeholder="Enter 6-digit OTP"
                                maxLength="6"
                                value={smsVerification.otpCode}
                                onChange={(e) =>
                                  setSmsVerification((prev) => ({
                                    ...prev,
                                    otpCode: e.target.value.replace(/\D/g, ''),
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  marginBottom: '8px',
                                  fontSize: '16px',
                                  letterSpacing: '2px',
                                }}
                              />
                              <button
                                type="button"
                                onClick={handleVerifyOTP}
                                disabled={smsVerification.isVerifying}
                                style={{
                                  padding: '8px 16px',
                                  background: '#2e7d32',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: smsVerification.isVerifying ? 'not-allowed' : 'pointer',
                                  opacity: smsVerification.isVerifying ? 0.6 : 1,
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  marginRight: '8px',
                                }}
                              >
                                {smsVerification.isVerifying ? 'Verifying...' : 'Verify OTP'}
                              </button>
                              <button
                                type="button"
                                onClick={handleSendOTP}
                                disabled={smsVerification.isVerifying}
                                style={{
                                  padding: '8px 16px',
                                  background: '#f57f17',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: smsVerification.isVerifying ? 'not-allowed' : 'pointer',
                                  opacity: smsVerification.isVerifying ? 0.6 : 1,
                                  fontSize: '14px',
                                  fontWeight: '600',
                                }}
                              >
                                Resend OTP
                              </button>
                            </div>
                          )}
                          {smsVerification.verificationError && (
                            <div
                              style={{
                                color: '#d32f2f',
                                fontSize: '12px',
                                marginTop: '6px',
                              }}
                            >
                              ❌ {smsVerification.verificationError}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>State</label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleInputChange}
                    placeholder="e.g., Maharashtra"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>City</label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleInputChange}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Pincode</label>
                  <input
                    type="text"
                    name="address.pincode"
                    value={formData.address.pincode}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Street Address</label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleInputChange}
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!editingId && !smsVerification.isVerified}
                  style={{
                    opacity: !editingId && !smsVerification.isVerified ? 0.5 : 1,
                    cursor: !editingId && !smsVerification.isVerified ? 'not-allowed' : 'pointer',
                  }}
                >
                  {editingId ? 'Update Customer' : 'Add Customer'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
          <div
            className={styles.formBackdrop}
            onClick={handleCancel}
          ></div>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading customers...</div>
      ) : customers.length > 0 ? (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>City</th>
                <th>Total Purchase</th>
                <th>Total Paid</th>
                <th>Pending</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer._id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => goToCustomerDetails(customer._id)}
                >
                  <td className={styles.strong}>{customer.name}</td>
                  <td>{customer.mobileNumber}</td>
                  <td>{customer.email || '-'}</td>
                  <td>{customer.address?.city || '-'}</td>
                  <td>₹{customer.totalPurchase.toLocaleString('en-IN')}</td>
                  <td style={{ color: '#10b981' }}>
                    ₹{customer.totalPaid.toLocaleString('en-IN')}
                  </td>
                  <td style={{ color: '#f59e0b' }}>
                    ₹{customer.totalPending.toLocaleString('en-IN')}
                  </td>
                  <td className={styles.actions}>
                    <button
                      className={styles.editBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToCustomerDetails(customer._id);
                      }}
                      title="View details"
                    >
                      👁️
                    </button>
                    <button
                      className={styles.editBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(customer);
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(customer._id);
                      }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
        <div className={styles.noData}>
          <p>No customers found. Create your first customer!</p>
        </div>
      )}
    </div>
  );
}
