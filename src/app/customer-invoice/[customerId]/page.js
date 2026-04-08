'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import styles from './customer-invoices.module.css';

export default function CustomerInvoicesPage() {
  const params = useParams();
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const customerId = Array.isArray(params.customerId)
          ? params.customerId[0]
          : params.customerId;

        if (!customerId) {
          setError('Customer ID is required');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/customer-invoices/${customerId}`);

        if (!response.ok) {
          let message = 'Failed to load customer invoices';
          try {
            const errorData = await response.json();
            if (errorData?.message) {
              message = errorData.message;
            }
          } catch {
            // keep default message
          }
          throw new Error(message);
        }

        const data = await response.json();
        setCustomer(data.customer);
        setInvoices(data.invoices || []);
        setSummary(data.summary || null);
      } catch (err) {
        setError(err.message || 'Error loading customer invoices');
      } finally {
        setLoading(false);
      }
    };

    if (params?.customerId) {
      fetchInvoices();
    }
  }, [params?.customerId]);

  useEffect(() => {
    const fetchShopSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) return;

        const data = await response.json();
        setShop(data.settings || data);
      } catch (settingsError) {
        console.error('Error loading shop settings:', settingsError);
      }
    };

    fetchShopSettings();
  }, []);

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFirstFilled = (...values) => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  };

  const companyDetails = shop?.companyDetails || {};
  const shopName = getFirstFilled(shop?.shopName, shop?.name, 'Laxmi Alankar');
  const shopAddress = getFirstFilled(
    shop?.shopAddress,
    shop?.address,
    companyDetails?.address
  );
  const shopPhone = getFirstFilled(
    shop?.shopPhone,
    shop?.phone,
    shop?.mobile,
    companyDetails?.phone
  );
  const shopEmail = getFirstFilled(
    shop?.shopEmail,
    shop?.email,
    companyDetails?.email
  );
  const shopGSTIN = getFirstFilled(
    shop?.shopGSTIN,
    shop?.gstin,
    shop?.gstNumber,
    companyDetails?.gstin
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading purchases...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.shopBanner}>
          <div className={styles.shopIdentity}>
            <div className={styles.shopLogoShell}>
              {shop?.shopLogo ? (
                <Image
                  src={shop.shopLogo}
                  alt="Shop logo"
                  width={52}
                  height={52}
                  unoptimized
                  className={styles.shopLogo}
                />
              ) : (
                <span>{shopName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className={styles.shopTitle}>{shopName}</p>
              <p className={styles.shopTagline}>Customer Invoice Portal</p>
            </div>
          </div>

          <div className={styles.shopMeta}>
            <p>{shopAddress || 'Address not set'}</p>
            <p>{shopPhone ? `Phone: ${shopPhone}` : 'Phone: -'}</p>
            <p>{shopEmail ? `Email: ${shopEmail}` : 'Email: -'}</p>
            <p>{shopGSTIN ? `GSTIN: ${shopGSTIN}` : 'GSTIN: -'}</p>
          </div>
        </div>

        <div className={styles.header}>
          <h1>Customer Purchase History</h1>
          {customer && (
            <div className={styles.customerCard}>
              <p className={styles.customerName}>{customer.name}</p>
              <p>{customer.mobileNumber}</p>
              {customer.email && <p>{customer.email}</p>}
            </div>
          )}
        </div>

        {summary && (
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span>Total Purchases</span>
              <strong>{summary.totalInvoices || 0}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Total Amount</span>
              <strong>{formatCurrency(summary.totalAmount)}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Total Paid</span>
              <strong>{formatCurrency(summary.totalPaid)}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Total Pending</span>
              <strong>{formatCurrency(summary.totalPending)}</strong>
            </div>
          </div>
        )}

        {invoices.length === 0 ? (
          <div className={styles.empty}>No purchases found for this customer.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Pending</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber}</td>
                    <td>{formatDate(invoice.date)}</td>
                    <td>{invoice.itemCount}</td>
                    <td>{formatCurrency(invoice.totalAmount)}</td>
                    <td>{formatCurrency(invoice.amountPending)}</td>
                    <td>
                      <Link href={invoice.invoiceLink} className={styles.viewBtn}>
                        View Invoice
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
