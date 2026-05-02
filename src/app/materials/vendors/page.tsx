'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './vendors.module.css';
import { getMaterials, Material, getVendors, Vendor, addVendor } from '@/lib/storage';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [newVendor, setNewVendor] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const loadData = async () => {
    try {
      const [v, m] = await Promise.all([getVendors(), getMaterials()]);
      setVendors(v);
      setMaterials(m);
    } catch (err) {
      console.error('Error loading vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.name) return;
    
    try {
      await addVendor(newVendor);
      await loadData();
      setNewVendor({ name: '', phone: '', address: '' });
      setShowForm(false);
    } catch (err) {
      alert('Failed to add supplier. Ensure the name is unique.');
      console.error(err);
    }
  };

  const getVendorStats = (vendorId: string) => {
    const vendorBills = materials.filter(m => m.vendorId === vendorId);
    return vendorBills.reduce((acc, curr) => ({
      totalBilled: acc.totalBilled + curr.totalCost,
      totalPaid: acc.totalPaid + curr.amountPaid,
      balance: acc.balance + (curr.totalCost - curr.amountPaid),
      itemCount: acc.itemCount + 1,
      lastPurchase: curr.date > acc.lastPurchase ? curr.date : acc.lastPurchase
    }), { totalBilled: 0, totalPaid: 0, balance: 0, itemCount: 0, lastPurchase: '' });
  };

  if (loading) return <div className="container" style={{ paddingTop: '5rem' }}><p>Loading supplier list...</p></div>;

  return (
    <div className="container fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Link href="/materials" className={styles.backLink}>← Back to Materials</Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="section-title">Supplier Management</h1>
              <p style={{ color: '#888' }}>Overview of all material vendors and pending balances</p>
            </div>
            {!showForm && (
              <button className="btn-primary" style={{ background: '#f59e0b', color: '#fff', border: 'none' }} onClick={() => setShowForm(true)}>
                + Add Supplier
              </button>
            )}
          </div>
        </div>
      </header>

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--glass-border)', background: 'rgba(20,20,20,0.8)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>New Supplier</h2>
          <form onSubmit={handleAddVendor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: '#aaa' }}>Supplier / Shop Name</label>
                <input 
                  type="text" 
                  value={newVendor.name} 
                  onChange={e => setNewVendor({...newVendor, name: e.target.value})}
                  required
                  placeholder="e.g. Sharma Hardwares"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: '#aaa' }}>Phone Number (Optional)</label>
                <input 
                  type="text" 
                  value={newVendor.phone} 
                  onChange={e => setNewVendor({...newVendor, phone: e.target.value})}
                  placeholder="e.g. 9876543210"
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', color: '#aaa' }}>Address / Location (Optional)</label>
              <input 
                type="text" 
                value={newVendor.address} 
                onChange={e => setNewVendor({...newVendor, address: e.target.value})}
                placeholder="e.g. Main Market, City"
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn-primary" style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>Save Supplier</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.vendorGrid}>
        {vendors.length === 0 ? (
          <div className="glass" style={{ padding: '4rem', textAlign: 'center', gridColumn: '1 / -1' }}>
            <p style={{ color: '#666' }}>No suppliers created yet.</p>
          </div>
        ) : (
          vendors.map(vendor => {
            const stats = getVendorStats(vendor.id);
            return (
              <div key={vendor.id} className={`${styles.vendorCard} card`}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.vendorName}>{vendor.name}</h3>
                  <span className={styles.itemBadge}>{stats.itemCount} Bills</span>
                </div>
                
                <div className={styles.statsRow}>
                  <div className={styles.stat}>
                    <span>Total Billed</span>
                    <p>₹{stats.totalBilled}</p>
                  </div>
                  <div className={styles.stat}>
                    <span>Total Paid</span>
                    <p style={{ color: '#10b981' }}>₹{stats.totalPaid}</p>
                  </div>
                </div>

                <div className={`${styles.balanceBox} ${stats.balance > 0 ? styles.due : ''}`}>
                   <span>Current Balance Owed</span>
                   <h3>₹{stats.balance}</h3>
                </div>

                <div className={styles.cardFooter}>
                  <p className={styles.lastPurchase}>
                    {stats.lastPurchase ? `Last purchase: ${new Date(stats.lastPurchase).toLocaleDateString()}` : 'No purchases yet'}
                  </p>
                  <Link href={`/materials/vendors/${vendor.id}`} className="btn-secondary">
                    View Ledger →
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
