'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Common/Header';
import ManageCustomers from '@/components/Customer/ManageCustomers';

export default function CustomersPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <>
      <Header user={JSON.parse(localStorage.getItem('user') || '{}')} />
      <ManageCustomers />
    </>
  );
}
