'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './Reports.module.css';

export default function Reports() {
  const [reportType, setReportType] = useState('sales');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPaid: 0,
    totalPending: 0,
    invoiceCount: 0,
    averageOrderValue: 0,
  });

  useEffect(() => {
    // Set default date range (last 30 days)
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        startDate,
        endDate,
        limit: 1000,
      });

      const res = await fetch(`/api/invoices?${query}`);
      const data = await res.json();

      const invoicesList = data.invoices || [];
      setInvoices(invoicesList);

      // Calculate statistics
      const totalSales = invoicesList.reduce(
        (sum, inv) => sum + (inv.totalAmount || 0),
        0
      );
      const totalPaid = invoicesList.reduce(
        (sum, inv) => sum + (inv.amountPaid || 0),
        0
      );
      const totalPending = invoicesList.reduce(
        (sum, inv) => sum + (inv.amountPending || 0),
        0
      );

      setStats({
        totalSales,
        totalPaid,
        totalPending,
        invoiceCount: invoicesList.length,
        averageOrderValue: invoicesList.length > 0 ? totalSales / invoicesList.length : 0,
      });
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [reportType, startDate, endDate, fetchReport]);

  const getPaymentModeBreakdown = () => {
    const breakdown = {};
    invoices.forEach((invoice) => {
      // Note: Payment mode data would come from payments collection
      // This is a placeholder for the structure
    });
    return breakdown;
  };

  const handleExportCSV = () => {
    if (invoices.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'Invoice #',
      'Customer',
      'Date',
      'Total Amount',
      'Amount Paid',
      'Pending',
      'Status',
    ];

    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      inv.customerId?.name || 'N/A',
      new Date(inv.createdAt).toLocaleDateString('en-IN'),
      inv.totalAmount?.toFixed(2),
      inv.amountPaid?.toFixed(2),
      inv.amountPending?.toFixed(2),
      inv.paymentStatus,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sales_Report_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className={styles.container}>
      <h1>Sales Reports & Analytics</h1>

      {/* Filter Section */}
      <div className={styles.filterSection}>
        <div className={styles.filterGroup}>
          <label>Report Type</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="sales">Sales Report</option>
            <option value="payment">Payment Status Report</option>
            <option value="customer">Customer Wise Report</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <button className="btn-primary" onClick={fetchReport} disabled={loading}>
          {loading ? 'Loading...' : 'Generate Report'}
        </button>

        {invoices.length > 0 && (
          <button className={styles.exportBtn} onClick={handleExportCSV}>
            📥 Export CSV
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Sales</div>
          <div className={styles.statValue}>
            ₹{stats.totalSales.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Paid</div>
          <div className={styles.statValue} style={{ color: '#2e7d32' }}>
            ₹{stats.totalPaid.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Pending Amount</div>
          <div className={styles.statValue} style={{ color: '#f57f17' }}>
            ₹{stats.totalPending.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>No. of Invoices</div>
          <div className={styles.statValue}>{stats.invoiceCount}</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Average Order Value</div>
          <div className={styles.statValue}>
            ₹{stats.averageOrderValue.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Collection %</div>
          <div
            className={styles.statValue}
            style={{
              color:
                stats.totalSales > 0
                  ? ((stats.totalPaid / stats.totalSales) * 100 > 80
                      ? '#2e7d32'
                      : '#f57f17')
                  : '#666',
            }}
          >
            {stats.totalSales > 0
              ? ((stats.totalPaid / stats.totalSales) * 100).toFixed(1)
              : '0'}
            %
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className={styles.card}>
        <h2>
          {reportType === 'sales'
            ? 'Sales Details'
            : reportType === 'payment'
            ? 'Payment Status Details'
            : 'Customer Wise Details'}
        </h2>

        {loading ? (
          <p className={styles.loading}>Loading data...</p>
        ) : invoices.length > 0 ? (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total Amount</th>
                    <th>Amount Paid</th>
                    <th>Pending</th>
                    <th>Payment %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice._id}>
                      <td className={styles.invoiceNum}>
                        {invoice.invoiceNumber}
                      </td>
                      <td>{invoice.customerId?.name || 'N/A'}</td>
                      <td>
                        {new Date(invoice.createdAt).toLocaleDateString(
                          'en-IN'
                        )}
                      </td>
                      <td>
                        ₹{invoice.totalAmount?.toLocaleString('en-IN')}
                      </td>
                      <td className={styles.paid}>
                        ₹{invoice.amountPaid?.toLocaleString('en-IN')}
                      </td>
                      <td className={styles.pending}>
                        ₹{invoice.amountPending?.toLocaleString('en-IN')}
                      </td>
                      <td>
                        {invoice.totalAmount > 0
                          ? (
                              ((invoice.amountPaid || 0) /
                                invoice.totalAmount) *
                              100
                            ).toFixed(1)
                          : '0'}
                        %
                      </td>
                      <td>
                        <span
                          className={`badge badge-${
                            invoice.paymentStatus === 'Paid'
                              ? 'success'
                              : invoice.paymentStatus === 'PartialPaid'
                              ? 'warning'
                              : 'error'
                          }`}
                        >
                          {invoice.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className={styles.summaryFooter}>
              <div className={styles.summaryRow}>
                <span>Total Invoices:</span>
                <strong>{stats.invoiceCount}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Total Sales:</span>
                <strong>
                  ₹{stats.totalSales.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Total Collected:</span>
                <strong className={styles.collectedAmount}>
                  ₹{stats.totalPaid.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Total Pending:</span>
                <strong className={styles.pendingAmount}>
                  ₹{stats.totalPending.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>
            </div>
          </>
        ) : (
          <p className={styles.noData}>No data available for selected period</p>
        )}
      </div>
    </div>
  );
}
