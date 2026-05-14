"use client";

import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './layout.module.css';

export default function DashboardLayout({ children }) {
  const { user, logout } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If no user is found after context mounts, redirect to login
    // This is simple client-side protection
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (!user) return null; // Avoid hydration mismatch or flash

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { name: 'POS / Sales', path: '/dashboard/pos', roles: ['Sales', 'Manager', 'SuperAdmin'] },
    { name: 'Kitchen', path: '/dashboard/kitchen', roles: ['Kitchen', 'Manager', 'SuperAdmin'] },
    { name: 'Store / Inventory', path: '/dashboard/store', roles: ['Store', 'Manager', 'SuperAdmin'] },
    { name: 'Finance', path: '/dashboard/finance', roles: ['Finance', 'Manager', 'SuperAdmin'] },
    { name: 'Manager Overview', path: '/dashboard/manager', roles: ['Manager', 'SuperAdmin'] },
    { name: 'Admin', path: '/dashboard/admin', roles: ['SuperAdmin'] },
  ];

  const visibleLinks = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className={styles.container}>
      {/* Mobile Header */}
      <header className={styles.mobileHeader}>
        <Link href="/">
          <img src="/logo.png" alt="Logo" style={{ height: '30px' }} />
        </Link>
        <button className={styles.hamburger} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      <aside className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <Link href="/">
            <img src="/logo.png" alt="Logo" style={{ width: '120px' }} />
          </Link>
        </div>
        
        <nav className={styles.navLinks}>
          {visibleLinks.map((link) => (
            <div key={link.path}>
              <Link 
                href={link.path}
                className={`${styles.link} ${pathname === link.path ? styles.active : ''}`}
              >
                {link.name}
              </Link>
            </div>
          ))}
        </nav>

        <div className={styles.userInfo}>
          <div className={styles.userName}>{user.username} ({user.role})</div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
