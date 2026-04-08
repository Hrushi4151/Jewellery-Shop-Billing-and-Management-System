'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Common/Header';
import CreateInvoice from '@/components/Billing/CreateInvoice';
import styles from './invoices.module.css';

export default function InvoicesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('create');
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const query = new URLSearchParams({
        page: String(page),
        limit: '10',
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(statusFilter !== 'All' ? { status: statusFilter } : {}),
        ...(typeFilter !== 'All' ? { invoiceType: typeFilter } : {}),
      });

      const response = await fetch(`/api/invoices?${query.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to load invoices');
      }

      setInvoices(data?.invoices || []);
      setTotalPages(data?.pagination?.pages || 1);
    } catch (error) {
      console.error('Load invoices error:', error);
      setInvoices([]);
      setTotalPages(1);
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchInvoices();
    }
  }, [activeTab, page, search, statusFilter, typeFilter]);

  return (
    <>
      <Header />
      <div className={styles.wrapper}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabButton} ${activeTab === 'create' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('create')}
            type="button"
          >
            Create Invoice
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'list' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('list')}
            type="button"
          >
            View All Invoices
          </button>
        </div>

        {activeTab === 'create' ? (
          <CreateInvoice />
        ) : (
          <section className={styles.listSection}>
            <div className={styles.listHeader}>
              <h2>All Invoices</h2>
              <div className={styles.filterRow}>
                <input
                  type="text"
                  placeholder="Search by invoice no, customer name, mobile, email..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  className={styles.searchInput}
                />

                <select
                  className={styles.filterSelect}
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Finalized">Finalized</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Returned">Returned</option>
                </select>

                <select
                  className={styles.filterSelect}
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="All">All Types</option>
                  <option value="Invoice">Invoice</option>
                  <option value="Estimate">Estimate</option>
                  <option value="ReturnInvoice">Return</option>
                  <option value="ExchangeInvoice">Exchange</option>
                </select>
              </div>
            </div>

            {loadingInvoices ? (
              <p className={styles.stateText}>Loading invoices...</p>
            ) : invoices.length === 0 ? (
              <p className={styles.stateText}>No invoices found</p>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Invoice #</th>
                        <th>Customer</th>
                        <th>Mobile</th>
                        <th>Total</th>
                        <th>Pending</th>
                        <th>Payment Status</th>
                        <th>Type</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => (
                        <tr key={invoice._id}>
                          <td>{new Date(invoice.createdAt).toLocaleDateString('en-IN')}</td>
                          <td className={styles.invoiceNumber}>{invoice.invoiceNumber}</td>
                          <td>{invoice.customerId?.name || invoice.customerName || '-'}</td>
                          <td>{invoice.customerId?.mobileNumber || invoice.customerMobile || '-'}</td>
                          <td>₹{(invoice.totalAmount || 0).toLocaleString('en-IN')}</td>
                          <td>₹{(invoice.amountPending || 0).toLocaleString('en-IN')}</td>
                          <td>
                            <span className={`${styles.badge} ${styles[invoice.paymentStatus] || ''}`}>
                              {invoice.paymentStatus}
                            </span>
                          </td>
                          <td>{invoice.invoiceType}</td>
                          <td>
                            <button
                              type="button"
                              className={styles.viewBtn}
                              onClick={() => router.push(`/invoices/${invoice._id}`)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.pagination}>
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </>
  );
}
