'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Common/Header';
import ViewInvoice from '@/components/Invoice/ViewInvoice';
import styles from '@/components/Invoice/ViewInvoice.module.css';

export default function InvoiceDetailPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className={styles.invoicePageShell}>
      <div className={styles.screenOnly}>
        <Header />
      </div>
      <div className={styles.invoicePageBody}>
        <ViewInvoice />
      </div>
    </div>
  );
}
