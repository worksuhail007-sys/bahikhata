'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../vendors.module.css';
import { getMaterials, Material, Project, getProjects, getVendors, Vendor } from '@/lib/storage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VendorLedger({ params }: { params: Promise<{ id: string }> }) {
  const { id: vendorId } = use(params);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadLedger() {
      try {
        const [m, p, v] = await Promise.all([getMaterials(), getProjects(), getVendors()]);
        const currentVendor = v.find(ven => ven.id === vendorId);
        
        if (!currentVendor) {
          router.push('/materials/vendors');
          return;
        }

        const vendorBills = m.filter(item => item.vendorId === vendorId);
        
        setVendor(currentVendor);
        setMaterials(vendorBills);
        setProjects(p);
      } catch (err) {
        console.error('Error loading vendor ledger:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLedger();
  }, [vendorId, router]);

  if (loading) return <div className="container" style={{ paddingTop: '5rem' }}><p>Loading ledger...</p></div>;
  if (!vendor) return null;

  const summary = materials.reduce((acc, curr) => ({
    totalBilled: acc.totalBilled + curr.totalCost,
    totalPaid: acc.totalPaid + curr.amountPaid,
    balance: acc.balance + (curr.totalCost - curr.amountPaid)
  }), { totalBilled: 0, totalPaid: 0, balance: 0 });

  const exportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text('BahiKhata - Supplier Statement', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Supplier: ${vendor.name}`, 14, 32);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 38);
    
    // Summary Box
    doc.setDrawColor(200);
    doc.rect(14, 45, 182, 30);
    doc.setTextColor(0);
    doc.text(`Total Billed: Rs. ${summary.totalBilled}`, 20, 55);
    doc.text(`Total Paid: Rs. ${summary.totalPaid}`, 20, 62);
    doc.setFontSize(14);
    doc.text(`Current Balance Owed: Rs. ${summary.balance}`, 20, 71);

    const tableData = materials.map(item => [
      new Date(item.date).toLocaleDateString(),
      item.name,
      projects.find(p => p.id === item.projectId)?.name || '-',
      `${item.quantity} ${item.unit}`,
      `Rs. ${item.totalCost}`,
      `Rs. ${item.amountPaid}`,
      `Rs. ${item.totalCost - item.amountPaid}`
    ]);

    autoTable(doc, {
      startY: 85,
      head: [['Date', 'Item', 'Site', 'Qty', 'Total', 'Paid', 'Bal']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] }
    });

    doc.save(`Statement_${vendor.name.replace(/\s+/g, '_')}.pdf`);
  };

  const shareWhatsApp = () => {
    const message = `📑 *Supplier Statement: ${vendor.name}*\n\n` +
      `💰 *Total Billed:* ₹${summary.totalBilled}\n` +
      `✅ *Total Paid:* ₹${summary.totalPaid}\n` +
      `⚖️ *Balance Owed:* ₹${summary.balance}\n\n` +
      `📅 *Bills Logged:* ${materials.length}\n\n` +
      `Generated via BahiKhata App`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  return (
    <div className="container fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <header className={styles.ledgerHeader}>
        <div className={styles.vendorInfo}>
          <Link href="/materials/vendors" className={styles.backLink}>← Back to Suppliers</Link>
          <p style={{ color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem' }}>Supplier Ledger</p>
          <h1>{vendor.name}</h1>
          {vendor.phone && <p style={{ color: '#aaa', fontSize: '0.875rem' }}>📞 {vendor.phone}</p>}
          {vendor.address && <p style={{ color: '#aaa', fontSize: '0.875rem' }}>📍 {vendor.address}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={exportPDF} className="btn-secondary">📄 Download Statement</button>
          <button onClick={shareWhatsApp} className="btn-primary" style={{ background: '#25D366', color: '#fff', border: 'none' }}>
            💬 Share via WhatsApp
          </button>
        </div>
      </header>

      <div className={styles.summaryGrid}>
        <div className="card">
          <span>Total Billed</span>
          <h3>₹{summary.totalBilled}</h3>
        </div>
        <div className="card">
          <span>Total Paid</span>
          <h3 style={{ color: '#10b981' }}>₹{summary.totalPaid}</h3>
        </div>
        <div className={`${styles.balanceBox} card ${summary.balance > 0 ? styles.due : ''}`}>
          <span>Remaining Balance</span>
          <h3>₹{summary.balance}</h3>
        </div>
      </div>

      <section>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Purchase History</h2>
        <div className={styles.billList}>
          {materials.length === 0 ? (
            <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
               <p style={{ color: '#666' }}>No bills recorded yet.</p>
            </div>
          ) : (
            materials.map(item => (
              <div key={item.id} className={`${styles.billItem} glass`}>
                <div className={styles.billDate}>
                  {new Date(item.date).toLocaleDateString()}
                </div>
                <div className={styles.billMain}>
                  <h4>{item.name}</h4>
                  <p>Site: {projects.find(p => p.id === item.projectId)?.name || 'Unknown'}</p>
                  {item.notes && <p style={{ fontStyle: 'italic', color: '#666' }}>"{item.notes}"</p>}
                </div>
                <div className={styles.billAmount}>
                  <span>{item.quantity} {item.unit} @ ₹{item.unitPrice}</span>
                  <p>Total: ₹{item.totalCost}</p>
                </div>
                <div className={styles.billStatus}>
                  <span style={{ color: '#10b981', display: 'block', fontSize: '0.875rem' }}>Paid: ₹{item.amountPaid}</span>
                  <span style={{ color: (item.totalCost - item.amountPaid) > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                    Bal: ₹{item.totalCost - item.amountPaid}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
