'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { 
  getWorkers, getAttendance, getPayments, getMaterials, Worker, Attendance, 
  Payment, Material, getWorkerBalance, getProjects, Project 
} from '@/lib/storage';

export default function Home() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [todayLogs, setTodayLogs] = useState<Attendance[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalMaterialCost, setTotalMaterialCost] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [w, a, p, proj, m] = await Promise.all([
          getWorkers(),
          getAttendance(),
          getPayments(),
          getProjects(),
          getMaterials()
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

        // Calculate balances for active workers
        const balances = await Promise.all(
          activeWorkers.map(worker => getWorkerBalance(worker.id))
        );
        const totalBal = balances.reduce((sum, b) => sum + b.balance, 0);
        setTotalBalance(totalBal);
        
        // Calculate Total Material Cost
        const totalMat = m.reduce((sum, mat) => sum + mat.totalCost, 0);
        setTotalMaterialCost(totalMat);

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

  const grandTotalCost = totalBalance + totalMaterialCost;

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

      <div className={styles.statsGrid}>
        <div className="card">
          <p className={styles.statLabel}>Active Workers</p>
          <h3 className={styles.statValue}>{workers.length}</h3>
          <p className={styles.statSub}>Across {projects.length} sites</p>
        </div>
        <div className="card">
          <p className={styles.statLabel}>Total Project Cost</p>
          <h3 className={`${styles.statValue} ${styles.due}`}>₹{grandTotalCost}</h3>
          <p className={styles.statSub}>Materials (₹{totalMaterialCost}) + Labour Due (₹{totalBalance})</p>
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
          <h2 className={styles.subTitle}>Recent Material Purchases</h2>
          <div className={styles.activityList}>
            {materials.length === 0 ? (
              <div className={`${styles.empty} glass`}>
                <p>No materials recorded yet.</p>
              </div>
            ) : (
              materials.slice(0, 6).map((m) => {
                const project = projects.find(p => p.id === m.projectId);
                return (
                  <div key={m.id} className={`${styles.activityItem} glass`}>
                    <div className={styles.activityInfo}>
                      <p className={styles.activityWorker}>{m.name}</p>
                      <p className={styles.activityMeta}>{new Date(m.date).toLocaleDateString()} • {project?.name || 'Site'}</p>
                    </div>
                    <p className={styles.paymentVal}>₹{m.totalCost}</p>
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
              const siteMaterialCost = siteMaterials.reduce((sum, m) => sum + m.totalCost, 0);
              
              return (
                <div key={proj.id} className="card">
                  <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{proj.name}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                     <span>{siteWorkers.length} Workers</span>
                     <span>Material Cost: ₹{siteMaterialCost}</span>
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
