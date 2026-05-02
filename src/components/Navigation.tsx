import Link from 'next/link';
import styles from './Navigation.module.css';

export default function Navigation() {
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
        </div>
      </div>
    </nav>
  );
}
