'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import styles from './ViewInvoice.module.css';

export default function ViewInvoice() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/invoices/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Error loading invoice');
        }

        if (isMounted) {
          setInvoice(data.invoice || data);
        }
      } catch (fetchError) {
        console.error('Error fetching invoice:', fetchError);
        if (isMounted) {
          setError(fetchError.message || 'Error loading invoice');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchInvoice();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();

        if (res.ok && isMounted) {
          setSettings(data.settings || data);
        }
      } catch (settingsError) {
        console.error('Error fetching settings:', settingsError);
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const safeNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  };

  const formatCurrency = (amount) =>
    safeNumber(amount).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
    });

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    try {
      const element = document.getElementById('invoice-content');
      if (!element) return;

      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${invoice?.invoiceNumber || 'Invoice'}.pdf`);
    } catch (downloadError) {
      console.error('Error generating PDF:', downloadError);
      alert('Error generating PDF');
    }
  };

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
        <p className={styles.errorText}>{error}</p>
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

  const customer = invoice.customerId || {};
  const address = customer.address || {};
  const shopAddress = settings?.shopAddress || '';
  const shopPhone = settings?.shopPhone || '';
  const shopEmail = settings?.shopEmail || '';
  const shopGSTIN = settings?.shopGSTIN || '';
  const companyDetails = settings?.companyDetails || {};
  const shopLogo = settings?.shopLogo || '';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const customerId =
    typeof invoice.customerId === 'string'
      ? invoice.customerId
      : invoice.customerId?._id;
  const customerInvoicePath = customerId
    ? `/customer-invoice/${customerId}/${invoice._id}`
    : `/invoices/${invoice._id}`;
  const invoiceLink = `${baseUrl}${customerInvoicePath}`;
  const invoiceAmount = {
    subtotal: safeNumber(invoice.subtotal),
    discount: safeNumber(invoice.discount),
    taxableAmount: Math.max(0, safeNumber(invoice.subtotal) - safeNumber(invoice.discount)),
    cgst: safeNumber(invoice.cgst),
    sgst: safeNumber(invoice.sgst),
    igst: safeNumber(invoice.igst),
    totalGST: safeNumber(invoice.totalGST),
    totalAmount: safeNumber(invoice.totalAmount),
    amountPaid: safeNumber(invoice.amountPaid),
    amountPending: safeNumber(invoice.amountPending),
  };

  const dueDate = new Date(new Date(invoice.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className={styles.container}>
      <div className={styles.actionBar}>
        <button className={styles.primaryBtn} onClick={handlePrint} type="button">
          🖨️ Print
        </button>
        <button className={styles.secondaryBtn} onClick={handleDownloadPDF} type="button">
          📄 Download PDF
        </button>
      </div>

      <div id="invoice-content" className={styles.invoiceContent}>
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
              {shopLogo ? (
                <Image
                  src={shopLogo}
                  alt="Laxmi Alankar logo"
                  width={48}
                  height={48}
                  unoptimized
                  className={styles.logoImage}
                />
              ) : (
                <div className={styles.brandMarkLarge}>LM</div>
              )}
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
            <p>{shopAddress || '-'}</p>
            <p>{shopPhone ? `Phone: ${shopPhone}` : 'Phone: -'}</p>
            <p>{shopEmail ? `Email: ${shopEmail}` : 'Email: -'}</p>
            <p>{shopGSTIN ? `GSTIN: ${shopGSTIN}` : 'GSTIN: -'}</p>
            {companyDetails.pan && <p>PAN: {companyDetails.pan}</p>}
          </div>

          <div className={styles.partyCard}>
            <div className={styles.partyLabel}>Billed to</div>
            <h3>{customer.name || '-'}</h3>
            <p>{address.street ? `${address.street}, ` : ''}{address.city ? `${address.city}, ` : ''}{address.state ? `${address.state} ` : ''}{address.pincode ? `- ${address.pincode}` : ''}</p>
            <p>{customer.mobileNumber || 'Mobile: -'}</p>
            <p>{customer.email || 'Email: -'}</p>
            {customer.customerGSTIN && <p>GSTIN: {customer.customerGSTIN}</p>}
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
              {(invoice.items || []).map((item, index) => {
                const qty = safeNumber(item.quantity) || 1;
                const lineAmount = safeNumber(item.itemTotal ?? item.subtotal);
                const rate = qty > 0 ? lineAmount / qty : lineAmount;

                return (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{item.productName || item.itemName || 'Jewellery Item'}</strong>
                      <div className={styles.itemDesc}>{safeNumber(item.weight).toFixed(2)} gm · {item.purity || '-'} purity</div>
                    </td>
                    <td>{item.hsn || item.sac || '-'}</td>
                    <td>{item.gstRate ? `${safeNumber(item.gstRate)}%` : '3%'}</td>
                    <td>{qty}</td>
                    <td>{formatCurrency(rate)}</td>
                    <td>{formatCurrency(item.igst || 0)}</td>
                    <td>{formatCurrency(lineAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className={styles.bottomGrid}>
          <div className={styles.bottomLeft}>
            <div className={styles.totalCard}>
              <div className={styles.totalRow}>
                <span>Subtotal</span>
                <strong>{formatCurrency(invoiceAmount.subtotal)}</strong>
              </div>
              {invoiceAmount.discount > 0 && (
                <div className={styles.totalRow}>
                  <span>Discount</span>
                  <strong>-{formatCurrency(invoiceAmount.discount)}</strong>
                </div>
              )}
              <div className={styles.totalRow}>
                <span>Taxable Amount</span>
                <strong>{formatCurrency(invoiceAmount.taxableAmount)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>CGST</span>
                <strong>{formatCurrency(invoiceAmount.cgst)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>SGST</span>
                <strong>{formatCurrency(invoiceAmount.sgst)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>IGST</span>
                <strong>{formatCurrency(invoiceAmount.igst)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>Total GST</span>
                <strong>{formatCurrency(invoiceAmount.totalGST)}</strong>
              </div>
              <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                <span>Total</span>
                <strong>{formatCurrency(invoiceAmount.totalAmount)}</strong>
              </div>
              <div className={styles.totalRow}>
                <span>Paid</span>
                <strong>{formatCurrency(invoiceAmount.amountPaid)}</strong>
              </div>
              <div className={`${styles.totalRow} ${styles.pendingTotal}`}>
                <span>Balance Due</span>
                <strong>{formatCurrency(invoiceAmount.amountPending)}</strong>
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

            {invoice.notes && (
              <div className={styles.detailCard}>
                <h3>Additional Notes</h3>
                <p className={styles.noteText}>{invoice.notes}</p>
              </div>
            )}
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
                <p>
                  Use the invoice number for reference when making payment or sharing this bill with your accountant.
                </p>
                <p>
                  {invoice.invoiceType !== 'Estimate' ? 'GST invoice generated successfully.' : 'Estimate prepared successfully.'}
                </p>
              </div>
            </div>

            <div className={styles.signaturePanel}>
              <p>For Laxmi Alankar</p>
              <span>Authorised Signatory</span>
            </div>
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
