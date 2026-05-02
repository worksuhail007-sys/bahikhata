'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../vendors.module.css';
import { getMaterials, Material, Project, getProjects, getVendors, Vendor, getVendorPayments, VendorPayment, addVendorPayment, deleteVendorPayment } from '@/lib/storage';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function VendorLedger({ params }: { params: Promise<{ id: string }> }) {
  const { id: vendorId } = use(params);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const router = useRouter();

  useEffect(() => {
    async function loadLedger() {
      try {
        const [m, p, v, vp] = await Promise.all([getMaterials(), getProjects(), getVendors(), getVendorPayments()]);
        const currentVendor = v.find(ven => ven.id === vendorId);
        
        if (!currentVendor) {
          router.push('/materials/vendors');
          return;
        }

        const vendorBills = m.filter(item => item.vendorId === vendorId);
        const lumpSums = vp.filter(payment => payment.vendorId === vendorId);
        
        setVendor(currentVendor);
        setMaterials(vendorBills);
        setVendorPayments(lumpSums);
        setProjects(p);
      } catch (err) {
        console.error('Error loading vendor ledger:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLedger();
  }, [vendorId, router]);

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.amount || newPayment.amount <= 0) return;
    try {
      await addVendorPayment({ ...newPayment, vendorId });
      const vp = await getVendorPayments();
      setVendorPayments(vp.filter(p => p.vendorId === vendorId));
      setNewPayment({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
      setShowPaymentForm(false);
    } catch (err) {
      alert('Failed to save payment');
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (confirm('Delete this payment record?')) {
      await deleteVendorPayment(id);
      const vp = await getVendorPayments();
      setVendorPayments(vp.filter(p => p.vendorId === vendorId));
    }
  };

  if (loading) return <div className="container" style={{ paddingTop: '5rem' }}><p>Loading ledger...</p></div>;
  if (!vendor) return null;

  const totalBilled = materials.reduce((sum, curr) => sum + curr.totalCost, 0);
  const totalPaidOnBills = materials.reduce((sum, curr) => sum + curr.amountPaid, 0);
  const totalLumpSumPaid = vendorPayments.reduce((sum, curr) => sum + curr.amount, 0);
  
  const summary = {
    totalBilled,
    totalPaid: totalPaidOnBills + totalLumpSumPaid,
    balance: totalBilled - (totalPaidOnBills + totalLumpSumPaid)
  };

  // Combine bills and payments for the ledger timeline
  type LedgerEntry = 
    | { type: 'bill'; id: string; date: string; title: string; subtitle: string; amount: number; paid: number; notes: string }
    | { type: 'payment'; id: string; date: string; title: string; amount: number; notes: string };

  const ledgerEntries: LedgerEntry[] = [
    ...materials.map(m => ({
      type: 'bill' as const, id: m.id, date: m.date, title: m.name, 
      subtitle: projects.find(p => p.id === m.projectId)?.name || 'Unknown',
      amount: m.totalCost, paid: m.amountPaid, notes: m.notes || ''
    })),
    ...vendorPayments.map(p => ({
      type: 'payment' as const, id: p.id, date: p.date, title: 'Lump-Sum Payment', 
      amount: p.amount, notes: p.notes || ''
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

    const tableData = ledgerEntries.map(item => {
      if (item.type === 'bill') {
        return [
          new Date(item.date).toLocaleDateString(),
          item.title,
          item.subtitle,
          `Rs. ${item.amount}`,
          `Rs. ${item.paid}`,
          `Rs. ${item.amount - item.paid}`
        ];
      } else {
        return [
          new Date(item.date).toLocaleDateString(),
          'Payment',
          '-',
          '-',
          `Rs. ${item.amount}`,
          '-'
        ];
      }
    });

    autoTable(doc, {
      startY: 85,
      head: [['Date', 'Item', 'Site/Desc', 'Billed', 'Paid', 'Bal']],
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
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowPaymentForm(true)} className="btn-primary" style={{ background: '#3b82f6', color: '#fff', border: 'none' }}>
            💳 Pay Supplier
          </button>
          <button onClick={exportPDF} className="btn-secondary">📄 Download Statement</button>
          <button onClick={shareWhatsApp} className="btn-primary" style={{ background: '#25D366', color: '#fff', border: 'none' }}>
            💬 Share via WhatsApp
          </button>
        </div>
      </header>

      {showPaymentForm && (
        <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--glass-border)', background: 'rgba(20,20,20,0.8)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: '#3b82f6' }}>Log Supplier Payment</h2>
          <form onSubmit={handleSavePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: '#aaa' }}>Payment Amount (₹)</label>
                <input 
                  type="number" 
                  value={newPayment.amount || ''} 
                  onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})}
                  required
                  placeholder="0"
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '8px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: '#aaa' }}>Date</label>
                <input 
                  type="date" 
                  value={newPayment.date} 
                  onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                  required
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '8px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: '#aaa' }}>Notes / Ref No. (Optional)</label>
              <input 
                type="text" 
                value={newPayment.notes} 
                onChange={e => setNewPayment({...newPayment, notes: e.target.value})}
                placeholder="e.g. Cheque No. 123456"
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '0.75rem', borderRadius: '8px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn-primary" style={{ background: '#3b82f6', color: '#fff', border: 'none' }}>Save Payment</button>
              <button type="button" className="btn-secondary" onClick={() => setShowPaymentForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

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
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Account Ledger</h2>
        <div className={styles.billList}>
          {ledgerEntries.length === 0 ? (
            <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
               <p style={{ color: '#666' }}>No transactions recorded yet.</p>
            </div>
          ) : (
            ledgerEntries.map(item => (
              <div key={item.id} className={`${styles.billItem} glass`} style={{ borderLeft: item.type === 'payment' ? '4px solid #10b981' : '4px solid #f59e0b' }}>
                <div className={styles.billDate}>
                  {new Date(item.date).toLocaleDateString()}
                </div>
                <div className={styles.billMain}>
                  <h4 style={{ color: item.type === 'payment' ? '#10b981' : '#fff' }}>{item.title}</h4>
                  {item.type === 'bill' && <p>Site: {item.subtitle}</p>}
                  {item.notes && <p style={{ fontStyle: 'italic', color: '#666' }}>"{item.notes}"</p>}
                </div>
                {item.type === 'bill' ? (
                  <>
                    <div className={styles.billAmount}>
                      <p>Billed: ₹{item.amount}</p>
                    </div>
                    <div className={styles.billStatus}>
                      <span style={{ color: '#10b981', display: 'block', fontSize: '0.875rem' }}>Paid: ₹{item.paid}</span>
                      <span style={{ color: (item.amount - item.paid) > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                        Bal: ₹{item.amount - item.paid}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.billAmount}>
                      <p style={{ color: '#10b981', fontWeight: 'bold' }}>- ₹{item.amount}</p>
                    </div>
                    <div className={styles.billStatus} style={{ textAlign: 'right' }}>
                       <button onClick={() => handleDeletePayment(item.id)} style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
