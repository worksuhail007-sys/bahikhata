'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './ledger.module.css';
import { 
  getWorkers, getWorkerBalance, getWorkerLedger, Worker, getProjects, Project 
} from '@/lib/storage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function WorkerLedger({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [balance, setBalance] = useState({ earned: 0, paid: 0, balance: 0, daysWorked: 0 });
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadWorkerData() {
      try {
        const [allWorkers, allProjects, bal, logs] = await Promise.all([
          getWorkers(),
          getProjects(),
          getWorkerBalance(id),
          getWorkerLedger(id)
        ]);

        const currentWorker = allWorkers.find(w => w.id === id);
        if (!currentWorker) {
          router.push('/workers');
          return;
        }

        setWorker(currentWorker);
        setProjects(allProjects);
        setBalance(bal);
        setLedger(logs);
      } catch (err) {
        console.error('Error loading worker details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWorkerData();
  }, [id, router]);

  const exportPDF = () => {
    if (!worker) return;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('BahiKhata - Worker Ledger', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Worker: ${worker.name}`, 14, 32);
    doc.text(`Role: ${worker.role}`, 14, 38);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 44);
    
    doc.text(`Total Earned: Rs. ${balance.earned}`, 14, 54);
    doc.text(`Total Paid: Rs. ${balance.paid}`, 14, 60);
    doc.text(`Current Balance: Rs. ${balance.balance}`, 14, 66);

    const tableData = ledger.map(item => [
      new Date(item.date).toLocaleDateString(),
      item.type === 'attendance' ? `Work Log (${item.status})` : 'Payment',
      item.projectId ? projects.find(p => p.id === item.projectId)?.name || '-' : '-',
      item.type === 'attendance' ? `Rs. ${item.status === 'Half' ? worker.dailyRate/2 : worker.dailyRate}${item.overtimeAmount > 0 ? ' + '+item.overtimeAmount : ''}` : '-',
      item.type === 'payment' ? `Rs. ${item.amount}` : '-'
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['Date', 'Description', 'Site', 'Earned', 'Paid']],
      body: tableData,
    });

    doc.save(`${worker.name}_Ledger.pdf`);
  };

  const shareWhatsApp = () => {
    if (!worker) return;
    const message = `📔 *BahiKhata Ledger: ${worker.name}*\n\n` +
      `🏗️ *Role:* ${worker.role}\n` +
      `💰 *Total Earned:* ₹${balance.earned}\n` +
      `💸 *Total Paid:* ₹${balance.paid}\n` +
      `⚖️ *Balance Due:* ₹${balance.balance}\n\n` +
      `📅 *Days Worked:* ${balance.daysWorked}\n\n` +
      `Generated via BahiKhata App`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  if (loading) return <div className="container" style={{ paddingTop: '5rem' }}><p>Loading ledger...</p></div>;
  if (!worker) return null;

  return (
    <div className="container fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <header className={styles.header}>
        <div className={styles.workerBrief}>
          <Link href="/workers" className={styles.backLink}>← Back to Directory</Link>
          <h1 className="section-title">{worker.name}</h1>
          <p className={styles.roleLabel}>{worker.role} • Site: {projects.find(p => p.id === worker.projectId)?.name || 'Multiple'}</p>
        </div>
        <div className={styles.headerActions}>
           <button onClick={exportPDF} className="btn-secondary">📄 Export PDF</button>
           <button onClick={shareWhatsApp} className="btn-primary" style={{ background: '#25D366', color: '#fff', border: 'none' }}>
             💬 Share WhatsApp
           </button>
        </div>
      </header>

      <div className={styles.summaryGrid}>
        <div className="card">
          <span>Earned</span>
          <h3>₹{balance.earned}</h3>
          <p>{balance.daysWorked} days logged</p>
        </div>
        <div className="card">
          <span>Paid</span>
          <h3>₹{balance.paid}</h3>
          <p>Advance + Payments</p>
        </div>
        <div className={`${styles.balanceCard} card ${balance.balance > 0 ? styles.due : ''}`}>
          <span>Remaining Balance</span>
          <h3>₹{balance.balance}</h3>
          <p>{balance.balance > 0 ? 'Pending Payment' : 'Settled'}</p>
        </div>
      </div>

      <section className={styles.historySection}>
        <h2 className={styles.subTitle}>Transaction History</h2>
        <div className={styles.timeline}>
          {ledger.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>No history found for this worker.</p>
          ) : (
            ledger.map((item, idx) => (
              <div key={item.id} className={`${styles.timelineItem} glass`}>
                <div className={styles.itemDate}>
                   <span className={styles.day}>{new Date(item.date).getDate()}</span>
                   <span className={styles.month}>{new Date(item.date).toLocaleString('default', { month: 'short' })}</span>
                </div>
                <div className={styles.itemContent}>
                  <div className={styles.itemMain}>
                    <h4>{item.type === 'attendance' ? `Attendance (${item.status})` : 'Payment Logged'}</h4>
                    <p>{item.projectId ? projects.find(p => p.id === item.projectId)?.name : ''} {item.notes ? `• "${item.notes}"` : ''}</p>
                    {item.image && (
                      <div className={styles.itemImage}>
                        <img src={item.image} alt="Attachment" onClick={() => window.open(item.image)} />
                      </div>
                    )}
                  </div>
                  <div className={styles.itemVal}>
                    {item.type === 'attendance' ? (
                       <span className={styles.earned}>+₹{(item.status === 'Half' ? worker.dailyRate/2 : worker.dailyRate) + (item.overtimeAmount || 0)}</span>
                    ) : (
                       <span className={styles.paid}>-₹{item.amount}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
