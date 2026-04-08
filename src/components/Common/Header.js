'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Header.module.css';

export default function Header({ user = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 3h8v8H3V3zm10 0h8v5h-8V3zM3 13h5v8H3v-8zm7 4h11v4H10v-4zm3-7h8v5h-8v-5z" />
        </svg>
      ),
    },
    {
      href: '/invoices',
      label: 'Invoices',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.5V8h4.5" />
          <path d="M8 12h8M8 16h8M8 20h5" />
        </svg>
      ),
    },
    {
      href: '/customers',
      label: 'Customers',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM8 13a3 3 0 1 0-3-3 3 3 0 0 0 3 3z" />
          <path d="M2 21a6 6 0 0 1 12 0M13 21a6 6 0 0 1 9 0" />
        </svg>
      ),
    },
    {
      href: '/products',
      label: 'Products',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7l9-4 9 4-9 4-9-4z" />
          <path d="M3 7v10l9 4 9-4V7" />
        </svg>
      ),
    },
    {
      href: '/payments',
      label: 'Payments',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20M16 15h3" />
        </svg>
      ),
    },
    {
      href: '/reports',
      label: 'Reports',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h16M7 16V9M12 16V4M17 16v-6" />
        </svg>
      ),
    },
    {
      href: '/admin',
      label: 'Admin Panel',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
          <path d="M12 6v6l4 2.4" />
        </svg>
      ),
    },
    {
      href: '/admin/inventory',
      label: 'Inventory',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 2h6v2H9V2zm-4 4h16v2H5V6zm1 4h14v10H6V10zm2 2v6h10v-6H8z" />
        </svg>
      ),
    },
    {
      href: '/admin/settings',
      label: 'Settings',
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 8.5a3.5 3.5 0 1 0 3.5 3.5A3.5 3.5 0 0 0 12 8.5z" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.2 1.2 0 0 1 0 1.7l-1 1a1.2 1.2 0 0 1-1.7 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.2 1.2 0 0 1-1.2 1.2h-1.6A1.2 1.2 0 0 1 9.2 20v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.2 1.2 0 0 1-1.7 0l-1-1a1.2 1.2 0 0 1 0-1.7l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.2 1.2 0 0 1-1.2-1.2v-1.6A1.2 1.2 0 0 1 4 10.8h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.2 1.2 0 0 1 0-1.7l1-1a1.2 1.2 0 0 1 1.7 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1.2 1.2 0 0 1 1.2-1.2h1.6A1.2 1.2 0 0 1 14.8 4v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.2 1.2 0 0 1 1.7 0l1 1a1.2 1.2 0 0 1 0 1.7l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2A1.2 1.2 0 0 1 21.2 12v1.6A1.2 1.2 0 0 1 20 14.8h-.2a1 1 0 0 0-.4.2z" />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      document.body.classList.add('app-sidebar-layout');
    } else {
      document.body.classList.remove('app-sidebar-layout');
    }

    return () => {
      document.body.classList.remove('app-sidebar-layout');
    };
  }, [isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (!isLoggedIn) {
    return (
      <header className={styles.topHeader}>
        <div className={styles.topContainer}>
          <div className={styles.logo}>
            <Link href="/">
              <h1>Laxmi Alankar</h1>
            </Link>
          </div>

          <nav className={styles.authLinks}>
            <Link href="/login" className="btn-secondary">Login</Link>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <Link href="/dashboard" className={styles.brandLink}>
          <span className={styles.brandIcon}>LA</span>
          <div>
            <strong>Laxmi Alankar</strong>
            <p>Jewellery Billing</p>
          </div>
        </Link>
      </div>

      <nav className={styles.sidebarNav}>
        <ul className={styles.navLinks}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link href={item.href} className={`${styles.navLink} ${isActive ? styles.active : ''}`}>
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.sidebarFooter}>
        <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
      </div>
    </aside>
  );
}
