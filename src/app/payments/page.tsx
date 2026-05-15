'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './payments.module.css';
import { getWorkers, getPayments, addPayment, deletePayment, Worker, Payment } from '@/lib/storage';
import ImageUpload from '@/components/ImageUpload';

function PaymentsContent() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newPayment, setNewPayment] = useState({
    workerId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    image: undefined as string | undefined
  });

  const searchParams = useSearchParams();

  const loadData = async () => {
    try {
      const [w, p] = await Promise.all([getWorkers(), getPayments()]);
      setWorkers(w);
      setPayments(p);
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (searchParams.get('action') === 'new') {
      setShowForm(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.workerId || !newPayment.amount || isSaving) return;

    setIsSaving(true);
    try {
      await addPayment(newPayment);
      await loadData();
      setNewPayment({ ...newPayment, workerId: '', amount: 0, notes: '', image: undefined });
      setShowForm(false);
    } catch (err) {
      alert('Failed to save payment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this payment record?')) {
      await deletePayment(id);
      await loadData();
    }
  };

  const filteredPayments = payments.filter(p => {
    const worker = workers.find(w => w.id === p.workerId);
    const isWorkerActive = worker?.status === 'active';
    return showArchived || isWorkerActive;
  });

  const activeWorkers = workers.filter(w => w.status === 'active');

  if (loading && payments.length === 0) {
    return <div className="container" style={{ paddingTop: '5rem', textAlign: 'center' }}><p>Loading payments...</p></div>;
  }

  return (
    <div className="container fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h1 className="section-title">Payments & Advances</h1>
          <label className={styles.archivedToggle}>
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={e => setShowArchived(e.target.checked)} 
            />
            Show past worker history
          </label>
        </div>
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Log Payment
          </button>
        )}
      </header>

      {showForm && (
        <section className={`${styles.formSection} card`}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>New Payment Entry</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Worker</label>
              <select 
                value={newPayment.workerId} 
                onChange={e => setNewPayment({...newPayment, workerId: e.target.value})}
                required
              >
                <option value="">Select a worker...</option>
                {activeWorkers.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                ))}
              </select>
            </div>
            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label>Amount (₹)</label>
                <input 
                  type="number" 
                  value={newPayment.amount || ''} 
                  onChange={e => setNewPayment({...newPayment, amount: Number(e.target.value)})}
                  placeholder="0"
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Date</label>
                <input 
                  type="date" 
                  value={newPayment.date} 
                  onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                  required
                />
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label>Notes (Optional)</label>
              <input 
                type="text" 
                value={newPayment.notes} 
                onChange={e => setNewPayment({...newPayment, notes: e.target.value})}
                placeholder="e.g., Advance for weekly expenses"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Photo of Receipt (Optional)</label>
              <ImageUpload onImageAction={(base64) => setNewPayment({...newPayment, image: base64})} />
            </div>
            <div className={styles.formActions}>
              <button type="submit" disabled={isSaving} className="btn-primary" style={{ background: isSaving ? '#9ca3af' : '', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                {isSaving ? 'Saving...' : 'Save Payment'}
              </button>
              <button type="button" disabled={isSaving} className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <div className={styles.paymentList}>
        {filteredPayments.length === 0 ? (
          <div className="glass" style={{ padding: '4rem', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>No records found.</p>
          </div>
        ) : (
          filteredPayments.map(payment => {
            const worker = workers.find(w => w.id === payment.workerId);
            return (
              <div key={payment.id} className={`${styles.paymentItem} glass`}>
                <div className={styles.paymentMain}>
                  <h3 className={styles.workerName}>{worker?.name || 'Deleted Worker'}</h3>
                  <p className={styles.paymentDate}>{new Date(payment.date).toLocaleDateString()}</p>
                  {payment.notes && <p className={styles.notes}>"{payment.notes}"</p>}
                  {payment.image && (
                    <div className={styles.attachmentPreview}>
                      <img src={payment.image} alt="Receipt" onClick={() => window.open(payment.image)} />
                    </div>
                  )}
                </div>
                <div className={styles.paymentAmount}>
                  <span className={styles.currency}>₹</span>
                  <span className={styles.value}>{payment.amount}</span>
                  <button onClick={() => handleDelete(payment.id)} className={styles.deleteBtn}>×</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: '3rem' }}><p>Loading...</p></div>}>
      <PaymentsContent />
    </Suspense>
  );
}
