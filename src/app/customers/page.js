'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Common/Header';
import ManageCustomers from '@/components/Customer/ManageCustomers';

export default function CustomersPage() {
  const router = useRouter();
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, [router]);

  // Loading state
  if (user === undefined) return <div>Loading...</div>;

  return (
    <>
      <Header user={user} />
      <ManageCustomers />
    </>
  );
}