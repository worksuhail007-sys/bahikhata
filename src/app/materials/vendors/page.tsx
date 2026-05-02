'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './vendors.module.css';
import { getMaterials, Material, Project, getProjects } from '@/lib/storage';

interface VendorSummary {
  name: string;
  totalBilled: number;
  totalPaid: number;
  balance: number;
  lastPurchase: string;
  itemCount: number;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVendorData() {
      try {
        const [m, p] = await Promise.all([getMaterials(), getProjects()]);
        setProjects(p);

        // Group by vendor
        const vendorMap = new Map<string, VendorSummary>();

        m.forEach(item => {
          const vName = item.vendor || 'Unknown Vendor';
          const existing = vendorMap.get(vName) || {
            name: vName,
            totalBilled: 0,
            totalPaid: 0,
            balance: 0,
            lastPurchase: item.date,
            itemCount: 0
          };

          existing.totalBilled += item.totalCost;
          existing.totalPaid += item.amountPaid;
          existing.balance += (item.totalCost - item.amountPaid);
          existing.itemCount += 1;
          
          if (new Date(item.date) > new Date(existing.lastPurchase)) {
            existing.lastPurchase = item.date;
          }

          vendorMap.set(vName, existing);
        });

        setVendors(Array.from(vendorMap.values()).sort((a, b) => b.balance - a.balance));
      } catch (err) {
        console.error('Error loading vendors:', err);
      } finally {
        setLoading(false);
      }
    }

    loadVendorData();
  }, []);

  if (loading) return <div className="container" style={{ paddingTop: '5rem' }}><p>Loading supplier list...</p></div>;

  return (
    <div className="container fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Link href="/materials" className={styles.backLink}>← Back to Materials</Link>
          <h1 className="section-title">Supplier Management</h1>
          <p style={{ color: '#888' }}>Overview of all material vendors and pending balances</p>
        </div>
      </header>

      <div className={styles.vendorGrid}>
        {vendors.length === 0 ? (
          <div className="glass" style={{ padding: '4rem', textAlign: 'center', gridColumn: '1 / -1' }}>
            <p style={{ color: '#666' }}>No vendors found. Log some material purchases first.</p>
          </div>
        ) : (
          vendors.map(vendor => (
            <div key={vendor.name} className={`${styles.vendorCard} card`}>
              <div className={styles.cardHeader}>
                <h3 className={styles.vendorName}>{vendor.name}</h3>
                <span className={styles.itemBadge}>{vendor.itemCount} Bills</span>
              </div>
              
              <div className={styles.statsRow}>
                <div className={styles.stat}>
                  <span>Total Billed</span>
                  <p>₹{vendor.totalBilled}</p>
                </div>
                <div className={styles.stat}>
                  <span>Total Paid</span>
                  <p style={{ color: '#10b981' }}>₹{vendor.totalPaid}</p>
                </div>
              </div>

              <div className={`${styles.balanceBox} ${vendor.balance > 0 ? styles.due : ''}`}>
                 <span>Current Balance Owed</span>
                 <h3>₹{vendor.balance}</h3>
              </div>

              <div className={styles.cardFooter}>
                <p className={styles.lastPurchase}>Last purchase: {new Date(vendor.lastPurchase).toLocaleDateString()}</p>
                <Link href={`/materials/vendors/${encodeURIComponent(vendor.name)}`} className="btn-secondary">
                  View Ledger →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
