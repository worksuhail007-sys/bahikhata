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
          <Link href="/" className={styles.link}>Dashboard</Link>
          <Link href="/workers" className={styles.link}>Workers</Link>
          <Link href="/logs" className={styles.link}>Attendance</Link>
          <Link href="/payments" className={styles.link}>Payments</Link>
          <button onClick={handleLogout} className={styles.logoutBtn}>🔓 Logout</button>
        </div>
      </div>
    </nav>
  );
}
