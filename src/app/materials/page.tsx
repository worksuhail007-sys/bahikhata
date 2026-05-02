'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './materials.module.css';
import { getMaterials, addMaterial, updateMaterial, deleteMaterial, Material, Project, getProjects, Vendor, getVendors } from '@/lib/storage';
import ImageUpload from '@/components/ImageUpload';
import Link from 'next/link';

function MaterialsContent() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | string>('All');
  const [isCustomMaterial, setIsCustomMaterial] = useState(false);
  
  const [newMaterial, setNewMaterial] = useState({
    projectId: '',
    vendorId: '',
    name: '',
    quantity: 1,
    unit: 'bags',
    unitPrice: 0,
    totalCost: 0,
    amountPaid: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    image: undefined as string | undefined
  });

  const searchParams = useSearchParams();

  const loadData = async () => {
    try {
      const [p, m, v] = await Promise.all([getProjects(), getMaterials(), getVendors()]);
      setProjects(p);
      setMaterials(m);
      setVendors(v);
      
      if (p.length > 0 && !newMaterial.projectId) {
        setNewMaterial(prev => ({ ...prev, projectId: p[0].id }));
      }
      if (v.length > 0 && !newMaterial.vendorId) {
        setNewMaterial(prev => ({ ...prev, vendorId: v[0].id }));
      }
    } catch (err) {
      console.error('Error loading materials:', err);
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

  // Auto-calculate total cost
  useEffect(() => {
    setNewMaterial(prev => ({
      ...prev,
      totalCost: prev.quantity * prev.unitPrice
    }));
  }, [newMaterial.quantity, newMaterial.unitPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterial.projectId || !newMaterial.name || newMaterial.totalCost <= 0) return;

    try {
      if (editingId) {
        await updateMaterial(editingId, newMaterial);
      } else {
        await addMaterial(newMaterial);
      }
      await loadData();
      setNewMaterial({
        ...newMaterial,
        name: '',
        quantity: 1,
        unitPrice: 0,
        totalCost: 0,
        amountPaid: 0,
        notes: '',
        image: undefined
      });
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      alert('Failed to save material entry');
    }
  };

  const predefinedMaterials = [
    'Cement', 'Sand', 'Aggregates (Gravel)', 'Steel / TMT Bars', 
    'Bricks', 'Concrete Blocks', 'Wood / Timber', 'Paint & Primer', 
    'Tiles / Marble', 'Plumbing Pipes', 'Electrical Wires', 
    'Hardware / Fittings', 'Glass', 'Other'
  ];

  const handleEdit = (m: Material) => {
    const isCustom = !predefinedMaterials.includes(m.name);
    setIsCustomMaterial(isCustom);
    setNewMaterial({
      projectId: m.projectId,
      vendorId: m.vendorId || '',
      name: m.name,
      quantity: m.quantity,
      unit: m.unit,
      unitPrice: m.unitPrice,
      totalCost: m.totalCost,
      amountPaid: m.amountPaid || 0,
      date: m.date,
      notes: m.notes || '',
      image: m.image
    });
    setEditingId(m.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this material record?')) {
      await deleteMaterial(id);
      await loadData();
    }
  };

  const filteredMaterials = materials.filter(m => filter === 'All' || m.projectId === filter);

  if (loading && materials.length === 0) {
    return <div className="container" style={{ paddingTop: '5rem', textAlign: 'center' }}><p>Loading materials...</p></div>;
  }

  return (
    <div className="container fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <header className={styles.header}>
        <h1 className="section-title">Material Cost Tracker</h1>
        
        <div className={styles.headerActions}>
          <div className={styles.filterGroup}>
            <button 
              className={`${styles.filterBtn} ${filter === 'All' ? styles.active : ''}`}
              onClick={() => setFilter('All')}
            >All Sites</button>
            {projects.map(p => (
              <button 
                key={p.id}
                className={`${styles.filterBtn} ${filter === p.id ? styles.active : ''}`}
                onClick={() => setFilter(p.id)}
              >{p.name}</button>
            ))}
          </div>
          {!showForm && (
            <>
              <Link href="/materials/vendors" className="btn-secondary">
                View Suppliers
              </Link>
              <button className="btn-primary" style={{ background: '#f59e0b', color: '#fff', border: 'none' }} onClick={() => {
                setEditingId(null);
                setIsCustomMaterial(false);
                setNewMaterial({
                  projectId: projects.length > 0 ? projects[0].id : '',
                  vendorId: vendors.length > 0 ? vendors[0].id : '',
                  name: '', quantity: 1, unit: 'bags', unitPrice: 0, totalCost: 0, amountPaid: 0,
                  date: new Date().toISOString().split('T')[0], notes: '', image: undefined
                });
                setShowForm(true);
              }}>
                + Add Material
              </button>
            </>
          )}
        </div>
      </header>

      {showForm && (
        <section className={`${styles.formSection} card`}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>
            {editingId ? 'Edit Material Entry' : 'New Material Entry'}
          </h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label>Site / Project</label>
                <select 
                  value={newMaterial.projectId} 
                  onChange={e => setNewMaterial({...newMaterial, projectId: e.target.value})}
                  required
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Date</label>
                <input 
                  type="date" 
                  value={newMaterial.date} 
                  onChange={e => setNewMaterial({...newMaterial, date: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label>Material Name</label>
                {isCustomMaterial ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      value={newMaterial.name} 
                      onChange={e => setNewMaterial({...newMaterial, name: e.target.value})}
                      placeholder="Type custom material name"
                      required
                      autoFocus
                    />
                    <button type="button" onClick={() => { setIsCustomMaterial(false); setNewMaterial({...newMaterial, name: ''}); }} className="btn-secondary" style={{ padding: '0.75rem' }}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <select
                    value={predefinedMaterials.includes(newMaterial.name) ? newMaterial.name : (newMaterial.name ? 'Other' : '')}
                    onChange={e => {
                      if (e.target.value === 'Other') {
                        setIsCustomMaterial(true);
                        setNewMaterial({...newMaterial, name: ''});
                      } else {
                        setNewMaterial({...newMaterial, name: e.target.value});
                      }
                    }}
                    required
                  >
                    <option value="" disabled>Select material type</option>
                    {predefinedMaterials.map(mat => (
                      <option key={mat} value={mat}>{mat}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className={styles.inputGroup}>
                <label>Vendor / Supplier</label>
                <select 
                  value={newMaterial.vendorId} 
                  onChange={e => setNewMaterial({...newMaterial, vendorId: e.target.value})}
                  required
                >
                  <option value="" disabled>Select a supplier</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                {vendors.length === 0 && (
                  <small style={{ color: '#ef4444' }}>No suppliers found. Create one from the Suppliers page.</small>
                )}
              </div>
            </div>

            <div className={styles.formRow} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className={styles.inputGroup}>
                <label>Quantity</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={newMaterial.quantity} 
                  onChange={e => setNewMaterial({...newMaterial, quantity: Number(e.target.value)})}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Unit</label>
                <select 
                  value={newMaterial.unit} 
                  onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})}
                >
                  <option value="bags">Bags</option>
                  <option value="kg">Kg</option>
                  <option value="tons">Tons</option>
                  <option value="cft">Cft (Cubic Feet)</option>
                  <option value="pieces">Pieces</option>
                  <option value="trucks">Trucks/Tractors</option>
                  <option value="liters">Liters</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Price per Unit (₹)</label>
                <input 
                  type="number" 
                  value={newMaterial.unitPrice || ''} 
                  onChange={e => setNewMaterial({...newMaterial, unitPrice: Number(e.target.value)})}
                  required
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label>Total Bill Amount (Auto-calculated)</label>
                <input 
                  type="text" 
                  value={`₹${newMaterial.totalCost}`} 
                  readOnly
                  style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontWeight: 'bold', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Amount Paid Now (₹)</label>
                <input 
                  type="number" 
                  value={newMaterial.amountPaid || ''} 
                  onChange={e => setNewMaterial({...newMaterial, amountPaid: Number(e.target.value)})}
                  placeholder="How much paid to vendor?"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Notes (Optional)</label>
              <input 
                type="text" 
                value={newMaterial.notes} 
                onChange={e => setNewMaterial({...newMaterial, notes: e.target.value})}
                placeholder="e.g., Delivery charges included"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Photo of Bill/Receipt (Optional)</label>
              <ImageUpload onImageAction={(base64) => setNewMaterial({...newMaterial, image: base64})} />
            </div>
            
            <div className={styles.formActions}>
              <button type="submit" className="btn-primary" style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>
                {editingId ? 'Update Entry' : 'Save Entry'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <div className={styles.materialList}>
        {filteredMaterials.length === 0 ? (
          <div className="glass" style={{ padding: '4rem', textAlign: 'center', gridColumn: '1 / -1' }}>
            <p style={{ color: '#666' }}>No materials recorded for this site yet.</p>
          </div>
        ) : (
          filteredMaterials.map(m => {
            const project = projects.find(p => p.id === m.projectId);
            const vendor = vendors.find(v => v.id === m.vendorId);
            const balance = m.totalCost - m.amountPaid;
            return (
              <div key={m.id} className={styles.materialItem}>
                <div className={styles.materialHeader}>
                  <div>
                    <h3 className={styles.materialName}>{m.name}</h3>
                    <p className={styles.vendorName}>{vendor?.name || 'Unknown Vendor'}</p>
                  </div>
                  <span className={styles.materialDate}>{new Date(m.date).toLocaleDateString()}</span>
                </div>
                
                <div className={styles.materialDetails}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Quantity</span>
                    <span className={styles.detailValue}>{m.quantity} {m.unit}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Rate</span>
                    <span className={styles.detailValue}>₹{m.unitPrice}/{m.unit}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                   <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Paid</span>
                      <span className={styles.detailValue} style={{ color: '#10b981' }}>₹{m.amountPaid}</span>
                   </div>
                   <div className={styles.detailItem} style={{ textAlign: 'right' }}>
                      <span className={styles.detailLabel}>Pending</span>
                      <span className={styles.detailValue} style={{ color: balance > 0 ? '#ef4444' : '#10b981' }}>
                        ₹{balance}
                      </span>
                   </div>
                </div>

                <div className={styles.materialFooter} style={{ paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '0.5rem' }}>
                  <div className={styles.totalCost}>Total: ₹{m.totalCost}</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleEdit(m)} className={styles.filterBtn} style={{ background: 'rgba(255,255,255,0.1)' }}>✏️</button>
                    <button onClick={() => handleDelete(m.id)} className={styles.deleteBtn}>×</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: '3rem' }}><p>Loading...</p></div>}>
      <MaterialsContent />
    </Suspense>
  );
}
