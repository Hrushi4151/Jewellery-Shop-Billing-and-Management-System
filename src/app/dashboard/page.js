'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Common/Header';
import Dashboard from '@/components/Dashboard/Dashboard';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
  }, [router]);

  return (
    <>
      <Header />
      <Dashboard />
    </>
  );
}
