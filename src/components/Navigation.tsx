'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Navigation.module.css';

export default function Navigation() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className={styles.nav}>
      <div className={`${styles.container} container`}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>📔</span>
          <span className={styles.logoText}>BahiKhata</span>
        </Link>
        <div className={styles.links}>
          <Link href="/" className={styles.link}>
            <span className={styles.navIcon}>🏠</span>
            <span className={styles.navLabel}>Home</span>
          </Link>
          <Link href="/workers" className={styles.link}>
            <span className={styles.navIcon}>👷</span>
            <span className={styles.navLabel}>Workers</span>
          </Link>
          <Link href="/logs" className={styles.link}>
            <span className={styles.navIcon}>📅</span>
            <span className={styles.navLabel}>Logs</span>
          </Link>
          <Link href="/materials" className={styles.link}>
            <span className={styles.navIcon}>🧱</span>
            <span className={styles.navLabel}>Materials</span>
          </Link>
          <Link href="/payments" className={styles.link}>
            <span className={styles.navIcon}>💸</span>
            <span className={styles.navLabel}>Payments</span>
          </Link>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <span className={styles.navIcon}>🔓</span>
            <span className={styles.navLabel}>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
