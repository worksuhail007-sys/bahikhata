'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { 
  getWorkers, getAttendance, getPayments, Worker, Attendance, 
  Payment, getWorkerBalance, getProjects, Project 
} from '@/lib/storage';

export default function Home() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [todayLogs, setTodayLogs] = useState<Attendance[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    const w = getWorkers();
    const a = getAttendance();
    const p = getPayments();
    const proj = getProjects();
    
    // Filter out data from deleted workers for a clean dashboard
    const activeWorkers = w.filter(worker => worker.status === 'active');
    const activeAttendance = a.filter(log => activeWorkers.some(worker => worker.id === log.workerId));
    const activePayments = p.filter(pay => activeWorkers.some(worker => worker.id === pay.workerId));

    setWorkers(activeWorkers);
    setAttendance(activeAttendance);
    setPayments(activePayments);
    setProjects(proj);

    const today = new Date().toISOString().split('T')[0];
    setTodayLogs(activeAttendance.filter(log => log.date.startsWith(today)));

    const balance = activeWorkers.reduce((sum, worker) => {
      return sum + getWorkerBalance(worker.id).balance;
    }, 0);
    setTotalBalance(balance);
  }, []);

  return (
    <div className={`${styles.container} container fade-in`}>
      <header className={styles.header}>
        <h1 className="section-title">Project Overview</h1>
        <div className={styles.actions}>
          <Link href="/logs?action=new" className="btn-primary">
            <span>+</span> Attendance
          </Link>
          <Link href="/payments?action=new" className="btn-primary" style={{ background: 'var(--secondary)', color: '#fff' }}>
            <span>+</span> Payment
          </Link>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className="card">
          <p className={styles.statLabel}>Active Workers</p>
          <h3 className={styles.statValue}>{workers.length}</h3>
          <p className={styles.statSub}>Across {projects.length} sites</p>
        </div>
        <div className="card">
          <p className={styles.statLabel}>Today's Attendance</p>
          <h3 className={styles.statValue}>{todayLogs.length}</h3>
          <p className={styles.statSub}>Logged for today</p>
        </div>
        <div className="card">
          <p className={styles.statLabel}>Total Balance Due</p>
          <h3 className={`${styles.statValue} ${totalBalance > 0 ? styles.due : ''}`}>₹{totalBalance}</h3>
          <p className={styles.statSub}>Pending across all sites</p>
        </div>
      </div>

      <div className={styles.grid2Col}>
        <section className={styles.section}>
          <h2 className={styles.subTitle}>Recent Activity</h2>
          <div className={styles.activityList}>
            {attendance.length === 0 ? (
              <div className={`${styles.empty} glass`}>
                <p>No active logs yet.</p>
              </div>
            ) : (
              attendance.slice(-6).reverse().map((log) => {
                const worker = workers.find(w => w.id === log.workerId);
                const project = projects.find(p => p.id === log.projectId);
                return (
                  <div key={log.id} className={`${styles.activityItem} glass`}>
                    <div className={styles.activityInfo}>
                      <p className={styles.activityWorker}>{worker?.name || 'Worker'}</p>
                      <p className={styles.activityMeta}>{new Date(log.date).toLocaleDateString()} • {project?.name || 'Site'}</p>
                    </div>
                    <span className={styles.badge}>
                      {log.status === 'Half' ? 'Half' : 'Full'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subTitle}>Recent Payments</h2>
          <div className={styles.activityList}>
            {payments.length === 0 ? (
              <div className={`${styles.empty} glass`}>
                <p>No payments recorded yet.</p>
              </div>
            ) : (
              payments.slice(-6).reverse().map((p) => {
                const worker = workers.find(w => w.id === p.workerId);
                return (
                  <div key={p.id} className={`${styles.activityItem} glass`}>
                    <div className={styles.activityInfo}>
                      <p className={styles.activityWorker}>{worker?.name || 'Worker'}</p>
                      <p className={styles.activityMeta}>{new Date(p.date).toLocaleDateString()}</p>
                    </div>
                    <p className={styles.paymentVal}>₹{p.amount}</p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
      
      <section className={styles.siteSummarySection}>
        <h2 className={styles.subTitle}>Site-wise Distribution</h2>
        <div className={styles.siteGrid}>
          {projects.map(proj => {
            const siteWorkers = workers.filter(w => w.projectId === proj.id);
            const siteBalance = siteWorkers.reduce((sum, w) => sum + getWorkerBalance(w.id).balance, 0);
            return (
              <div key={proj.id} className="card">
                <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{proj.name}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                   <span>{siteWorkers.length} Workers</span>
                   <span style={{ fontWeight: 700 }}>₹{siteBalance} Due</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
