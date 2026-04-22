"use client";

import { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './layout.module.css';

export default function DashboardLayout({ children }) {
  const { user, logout } = useAppContext();
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

  if (!user) return null; // Avoid hydration mismatch or flash

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { name: 'POS / Sales', path: '/dashboard/pos', roles: ['Sales', 'Manager', 'SuperAdmin'] },
    { name: 'Kitchen', path: '/dashboard/kitchen', roles: ['Kitchen', 'Manager', 'SuperAdmin'] },
    { name: 'Store / Inventory', path: '/dashboard/store', roles: ['Store', 'Manager', 'SuperAdmin'] },
    { name: 'Manager Overview', path: '/dashboard/manager', roles: ['Manager', 'SuperAdmin'] },
    { name: 'Admin', path: '/dashboard/admin', roles: ['SuperAdmin'] },
    { name: 'Attendance', path: '/dashboard/attendance', roles: ['Sales', 'Kitchen', 'Store', 'Manager', 'SuperAdmin'] },
  ];

  const visibleLinks = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>Cyril's Foods</div>
        
        <nav className={styles.navLinks}>
          {visibleLinks.map((link) => (
            <Link 
              key={link.path} 
              href={link.path}
              className={`${styles.link} ${pathname === link.path ? styles.active : ''}`}
            >
              {link.name}
            </Link>
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
