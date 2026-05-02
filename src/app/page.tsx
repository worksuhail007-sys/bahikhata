'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { 
  getWorkers, getAttendance, getPayments, getMaterials, Worker, Attendance, 
  Payment, Material, getWorkerBalance, getProjects, Project, getVendorPayments, VendorPayment 
} from '@/lib/storage';

export default function Home() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [todayLogs, setTodayLogs] = useState<Attendance[]>([]);
  const [totalWorkerBalance, setTotalWorkerBalance] = useState(0);
  const [totalWorkerPaid, setTotalWorkerPaid] = useState(0);
  const [totalMaterialCost, setTotalMaterialCost] = useState(0);
  const [totalMaterialPaid, setTotalMaterialPaid] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [w, a, p, proj, m, vp] = await Promise.all([
          getWorkers(),
          getAttendance(),
          getPayments(),
          getProjects(),
          getMaterials(),
          getVendorPayments()
        ]);
        
        const activeWorkers = w.filter(worker => worker.status === 'active');
        const activeAttendance = a.filter(log => activeWorkers.some(worker => worker.id === log.workerId));
        const activePayments = p.filter(pay => activeWorkers.some(worker => worker.id === pay.workerId));

        setWorkers(activeWorkers);
        setAttendance(activeAttendance);
        setPayments(activePayments);
        setProjects(proj);
        setMaterials(m);

        const today = new Date().toISOString().split('T')[0];
        setTodayLogs(activeAttendance.filter(log => log.date === today));

        // Calculate Worker Stats
        const balances = await Promise.all(
          activeWorkers.map(worker => getWorkerBalance(worker.id))
        );
        const totalBal = balances.reduce((sum, b) => sum + b.balance, 0);
        setTotalWorkerBalance(totalBal);
        
        const totalWPaid = p.reduce((sum, pay) => sum + pay.amount, 0);
        setTotalWorkerPaid(totalWPaid);
        
        // Calculate Supplier Stats
        const totalMatCost = m.reduce((sum, mat) => sum + mat.totalCost, 0);
        const totalMatPaidOnBills = m.reduce((sum, mat) => sum + mat.amountPaid, 0);
        const totalLumpSumPaid = vp.reduce((sum, pay) => sum + pay.amount, 0);
        
        setTotalMaterialCost(totalMatCost);
        setTotalMaterialPaid(totalMatPaidOnBills + totalLumpSumPaid);

      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '5rem', textAlign: 'center' }}>
        <div className="fade-in">
          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Loading BahiKhata...</h2>
          <p style={{ color: '#666' }}>Fetching your latest site data from cloud</p>
        </div>
      </div>
    );
  }

  const matBalance = totalMaterialCost - totalMaterialPaid;
  const grandTotalDue = totalWorkerBalance + matBalance;

  return (
    <div className={`${styles.container} container fade-in`}>
      <header className={styles.header}>
        <h1 className="section-title">Project Overview</h1>
        <div className={styles.actions}>
          <Link href="/logs?action=new" className="btn-primary">
            <span>+</span> Attendance
          </Link>
          <Link href="/materials?action=new" className="btn-primary" style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>
            <span>+</span> Material
          </Link>
        </div>
      </header>

      <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card">
          <p className={styles.statLabel}>Active Workers</p>
          <h3 className={styles.statValue}>{workers.length}</h3>
          <p className={styles.statSub}>Across {projects.length} sites</p>
        </div>
        <div className="card">
          <p className={styles.statLabel}>Paid to Workers</p>
          <h3 className={styles.statValue} style={{ color: '#10b981' }}>₹{totalWorkerPaid}</h3>
          <p className={styles.statSub}>Total advances/salaries given</p>
        </div>
        <div className="card">
          <p className={styles.statLabel}>Paid to Suppliers</p>
          <h3 className={styles.statValue} style={{ color: '#10b981' }}>₹{totalMaterialPaid}</h3>
          <p className={styles.statSub}>Out of ₹{totalMaterialCost} billed</p>
        </div>
        <div className="card" style={{ border: totalWorkerBalance > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '' }}>
          <p className={styles.statLabel}>Balance: Workers</p>
          <h3 className={`${styles.statValue} ${totalWorkerBalance > 0 ? styles.due : ''}`}>₹{totalWorkerBalance}</h3>
          <p className={styles.statSub}>Owed to labour right now</p>
        </div>
        <div className="card" style={{ border: matBalance > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '' }}>
          <p className={styles.statLabel}>Balance: Suppliers</p>
          <h3 className={`${styles.statValue} ${matBalance > 0 ? styles.due : ''}`}>₹{matBalance}</h3>
          <p className={styles.statSub}>Owed for materials</p>
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
              attendance.slice(0, 6).map((log) => {
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
          <h2 className={styles.subTitle}>Material Bill Status</h2>
          <div className={styles.activityList}>
            {materials.length === 0 ? (
              <div className={`${styles.empty} glass`}>
                <p>No materials recorded yet.</p>
              </div>
            ) : (
              materials.slice(0, 6).map((m) => {
                const project = projects.find(p => p.id === m.projectId);
                const bal = m.totalCost - m.amountPaid;
                return (
                  <div key={m.id} className={`${styles.activityItem} glass`}>
                    <div className={styles.activityInfo}>
                      <p className={styles.activityWorker}>{m.name}</p>
                      <p className={styles.activityMeta}>{new Date(m.date).toLocaleDateString()} • {project?.name || 'Site'}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <p className={styles.paymentVal} style={{ color: bal > 0 ? '#ef4444' : '#10b981' }}>
                         {bal > 0 ? `Due: ₹${bal}` : 'Fully Paid'}
                       </p>
                       <p style={{ fontSize: '0.7rem', color: '#666' }}>Total: ₹{m.totalCost}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
      
      {projects.length > 0 && (
        <section className={styles.siteSummarySection}>
          <h2 className={styles.subTitle}>Site-wise Distribution</h2>
          <div className={styles.siteGrid}>
            {projects.map(proj => {
              const siteWorkers = workers.filter(w => w.projectId === proj.id);
              const siteMaterials = materials.filter(m => m.projectId === proj.id);
              const siteMatCost = siteMaterials.reduce((sum, m) => sum + m.totalCost, 0);
              const siteMatPaid = siteMaterials.reduce((sum, m) => sum + m.amountPaid, 0);
              const siteMatDue = siteMatCost - siteMatPaid;
              
              return (
                <div key={proj.id} className="card">
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{proj.name}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                     <span>{siteWorkers.length} Workers Active</span>
                     <span style={{ color: siteMatDue > 0 ? '#ef4444' : '#10b981' }}>
                        Material Due: ₹{siteMatDue}
                     </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
