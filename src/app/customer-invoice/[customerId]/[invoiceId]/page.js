'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import styles from './invoice.module.css';

export default function CustomerInvoiceDetailsPage() {
  const params = useParams();
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const customerId = Array.isArray(params.customerId) ? params.customerId[0] : params.customerId;
        const invoiceId = Array.isArray(params.invoiceId) ? params.invoiceId[0] : params.invoiceId;

        const response = await fetch(`/api/invoice-details/${invoiceId}?customerId=${customerId}`);

        if (!response.ok) {
          let message = 'Failed to load invoice';
          try {
            const errorData = await response.json();
            if (errorData?.message) message = errorData.message;
          } catch {
            // keep default message
          }
          throw new Error(message);
        }

        const data = await response.json();
        setInvoice(data.invoice);

        try {
          const settingsRes = await fetch('/api/settings');
          const settingsData = await settingsRes.json();
          if (settingsRes.ok) {
            setSettings(settingsData.settings || settingsData);
          }
        } catch (settingsError) {
          console.error('Error loading settings:', settingsError);
        }
      } catch (err) {
        setError(err.message || 'Error loading invoice');
      } finally {
        setLoading(false);
      }
    };

    if (params?.customerId && params?.invoiceId) {
      fetchInvoice();
    }
  }, [params?.customerId, params?.invoiceId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.stateText}>Loading invoice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <p className={styles.errorText}>Error: {error}</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className={styles.container}>
        <p className={styles.stateText}>Invoice not found</p>
      </div>
    );
  }

  const getSafeNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const formatCurrency = (amount) =>
    getSafeNumber(amount).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
    });

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const itemAmount = (item) => {
    const subtotal = getSafeNumber(item?.subtotal);
    if (subtotal > 0) return subtotal;
    return getSafeNumber(item?.itemTotal);
  };

  const itemQty = (item) => {
    const quantity = getSafeNumber(item?.quantity);
    return quantity > 0 ? quantity : 1;
  };

  const itemUnitPrice = (item) => {
    const amount = itemAmount(item);
    const qty = itemQty(item);
    return qty > 0 ? amount / qty : amount;
  };

  const amounts = invoice.amounts || {};
  const subtotal = getSafeNumber(amounts.subtotal ?? invoice.subtotal);
  const discount = getSafeNumber(amounts.discount ?? invoice.discount);
  const discountedAmount = getSafeNumber(amounts.discountedAmount ?? subtotal - discount);
  const cgst = getSafeNumber(amounts.cgst ?? invoice.cgst);
  const sgst = getSafeNumber(amounts.sgst ?? invoice.sgst);
  const igst = getSafeNumber(amounts.igst ?? invoice.igst);
  const totalGST = getSafeNumber(amounts.totalGST ?? invoice.totalGST);
  const totalAmount = getSafeNumber(amounts.totalAmount ?? invoice.totalAmount);
  const amountPaid = getSafeNumber(amounts.amountPaid ?? invoice.amountPaid);
  const amountPending = getSafeNumber(amounts.amountPending ?? invoice.amountPending);

  const customerName = invoice.customer?.name || 'Customer';
  const customerPhone = invoice.customer?.mobileNumber || 'Mobile: -';
  const customerEmail = invoice.customer?.email || 'Email: -';
  const customerAddress = invoice.customer?.address;

  const shopAddress = settings?.shopAddress || '-';
  const shopPhone = settings?.shopPhone || '';
  const shopEmail = settings?.shopEmail || '';
  const shopGSTIN = settings?.shopGSTIN || '';
  const companyDetails = settings?.companyDetails || {};

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const invoiceLink = `${baseUrl}/customer-invoice/${params.customerId}/${params.invoiceId}`;
  const dueDate = new Date(new Date(invoice.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className={styles.container}>
      <div className={styles.actionBar}>
        <Link href={`/customer-invoice/${invoice.customer?.id || params.customerId}`} className={styles.secondaryBtn}>
          Back to Purchases
        </Link>
        <button onClick={() => window.print()} className={styles.primaryBtn} type="button">
          Print
        </button>
      </div>

      <div className={styles.invoiceContent}>
        <header className={styles.billHeader}>
          <div className={styles.billTitleBlock}>
            <h1>GST Invoice</h1>
            <div className={styles.billMetaInline}>
              <span>Invoice #: {invoice.invoiceNumber}</span>
              <span>Date: {formatDate(invoice.createdAt)}</span>
              {invoice.invoiceType !== 'Estimate' && <span>Due Date: {formatDate(dueDate)}</span>}
            </div>
          </div>
          <div className={styles.billLogoBlock}>
            <div className={styles.logoShell}>
              <div className={styles.brandMarkLarge}>LA</div>
            </div>
            <div>
              <strong>Laxmi Alankar</strong>
              <p>Jewellery Billing & Management</p>
            </div>
          </div>
        </header>

        <section className={styles.partyGrid}>
          <div className={styles.partyCard}>
            <div className={styles.partyLabel}>Billed by</div>
            <h3>Laxmi Alankar</h3>
            <p>{shopAddress}</p>
            <p>{shopPhone ? `Phone: ${shopPhone}` : 'Phone: -'}</p>
            <p>{shopEmail ? `Email: ${shopEmail}` : 'Email: -'}</p>
            <p>{shopGSTIN ? `GSTIN: ${shopGSTIN}` : 'GSTIN: -'}</p>
          </div>

          <div className={styles.partyCard}>
            <div className={styles.partyLabel}>Billed to</div>
            <h3>{customerName}</h3>
            <p>
              {customerAddress?.street ? `${customerAddress.street}, ` : ''}
              {customerAddress?.city ? `${customerAddress.city}, ` : ''}
              {customerAddress?.state ? `${customerAddress.state} ` : ''}
              {customerAddress?.pincode ? `- ${customerAddress.pincode}` : ''}
            </p>
            <p>{customerPhone}</p>
            <p>{customerEmail}</p>
          </div>
        </section>

        <section className={styles.tableSection}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Sr.</th>
                <th>Item Name & Description</th>
                <th>HSN/SAC</th>
                <th>GST Rate</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>IGST</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{item.productName || item.itemName || 'Manual Item'}</strong>
                    <div className={styles.itemDesc}>
                      {getSafeNumber(item.weight).toFixed(2)} gm · {item.purity || '-'} purity
                    </div>
                  </td>
                  <td>{item.hsn || item.sac || '-'}</td>
                  <td>{item.gstRate ? `${getSafeNumber(item.gstRate)}%` : '3%'}</td>
                  <td>{itemQty(item)}</td>
                  <td>{formatCurrency(itemUnitPrice(item))}</td>
                  <td>{formatCurrency(item.igst || 0)}</td>
                  <td>{formatCurrency(itemAmount(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.bottomGrid}>
          <div className={styles.bottomLeft}>
            <div className={styles.totalCard}>
              <div className={styles.totalRow}>
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              {discount > 0 && (
                <div className={styles.totalRow}>
                  <span>Discount</span>
                  <strong>-{formatCurrency(discount)}</strong>
                </div>
              )}
              <div className={styles.totalRow}>
                <span>Taxable Amount</span>
                <strong>{formatCurrency(discountedAmount)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>CGST</span>
                <strong>{formatCurrency(cgst)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>SGST</span>
                <strong>{formatCurrency(sgst)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>IGST</span>
                <strong>{formatCurrency(igst)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>Total GST</span>
                <strong>{formatCurrency(totalGST)}</strong>
              </div>
              <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                <span>Total</span>
                <strong>{formatCurrency(totalAmount)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>Paid</span>
                <strong>{formatCurrency(amountPaid)}</strong>
              </div>
              <div className={`${styles.totalRow} ${styles.pendingTotal}`}>
                <span>Balance Due</span>
                <strong>{formatCurrency(amountPending)}</strong>
              </div>
            </div>

            <div className={styles.detailCard}>
              <h3>Bank & UPI details</h3>
              <div className={styles.detailRow}><span>Bank Name</span><strong>{companyDetails.bankName || '-'}</strong></div>
              <div className={styles.detailRow}><span>Account No.</span><strong>{companyDetails.bankAccount || '-'}</strong></div>
              <div className={styles.detailRow}><span>IFSC</span><strong>{companyDetails.ifscCode || '-'}</strong></div>
              <div className={styles.detailRow}><span>PAN</span><strong>{companyDetails.pan || '-'}</strong></div>
              <div className={styles.detailRow}><span>CIN</span><strong>{companyDetails.cin || '-'}</strong></div>
            </div>
          </div>

          <div className={styles.bottomRight}>
            <div className={styles.qrNoteGrid}>
              <div className={styles.qrCard}>
                <h3>Scan to view invoice</h3>
                <div className={styles.qrWrap}>
                  <QRCodeCanvas value={invoiceLink} size={110} includeMargin />
                </div>
                <p>{invoiceLink}</p>
              </div>

              <div className={styles.qrCard}>
                <h3>Payment note</h3>
                <p>Use the invoice number for reference when making payment or sharing this bill with your accountant.</p>
                <p>{invoice.invoiceType !== 'Estimate' ? 'GST invoice generated successfully.' : 'Estimate prepared successfully.'}</p>
              </div>
            </div>

            <div className={styles.signaturePanel}>
              <p>For Laxmi Alankar</p>
              <span>Authorised Signatory</span>
            </div>

            {invoice.notes && (
              <div className={styles.detailCard}>
                <h3>Additional Notes</h3>
                <p className={styles.noteText}>{invoice.notes}</p>
              </div>
            )}
          </div>
        </section>

        <section className={styles.footerStrip}>
          <div className={styles.termsCard}>
            <h3>Terms and Conditions</h3>
            <p>Thank you for your business. Goods once sold will be subject to shop policy and applicable laws.</p>
            <p>Contact us within 7 days for any billing discrepancy.</p>
          </div>

          <div className={styles.termsCard}>
            <h3>Invoice Remarks</h3>
            <p className={styles.noteText}>This is a computer-generated invoice. No signature is required.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
