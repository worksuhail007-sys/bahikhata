'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './logs.module.css';
import { 
  getWorkers, getAttendance, logAttendance, deleteAttendance, Worker, 
  Attendance, Project, getProjects, AttendanceStatus 
} from '@/lib/storage';
import ImageUpload from '@/components/ImageUpload';

function LogsContent() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [logs, setLogs] = useState<Attendance[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'All' | string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  const [newLog, setNewLog] = useState({
    workerIds: [] as string[],
    date: new Date().toISOString().split('T')[0],
    projectId: '',
    status: 'Full' as AttendanceStatus,
    overtimeAmount: 0,
    notes: '',
    image: undefined as string | undefined
  });

  const searchParams = useSearchParams();

  const loadData = async () => {
    try {
      const [p, w, a] = await Promise.all([getProjects(), getWorkers(), getAttendance()]);
      setProjects(p);
      setWorkers(w);
      setLogs(a);
      
      if (p.length > 0 && !newLog.projectId) {
        setNewLog(prev => ({ ...prev, projectId: p[0].id }));
      }
    } catch (err) {
      console.error('Error loading logs:', err);
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

  const toggleWorker = (id: string) => {
    setNewLog(prev => {
      const currentIds = prev.workerIds;
      if (currentIds.includes(id)) {
        return { ...prev, workerIds: currentIds.filter(wId => wId !== id) };
      } else {
        // Find worker to auto-set project if it's the first selected
        const worker = workers.find(w => w.id === id);
        return { 
          ...prev, 
          workerIds: [...currentIds, id],
          projectId: currentIds.length === 0 ? (worker?.projectId || prev.projectId) : prev.projectId
        };
      }
    });
  };

  const selectAllWorkers = () => {
    setNewLog(prev => ({ ...prev, workerIds: activeWorkers.map(w => w.id) }));
  };

  const deselectAllWorkers = () => {
    setNewLog(prev => ({ ...prev, workerIds: [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newLog.workerIds.length === 0 || !newLog.projectId) return;

    try {
      const promises = newLog.workerIds.map(workerId => 
        logAttendance({
          workerId,
          date: newLog.date,
          projectId: newLog.projectId,
          status: newLog.status,
          overtimeAmount: newLog.overtimeAmount,
          notes: newLog.notes,
          image: newLog.image
        })
      );
      
      await Promise.all(promises);
      await loadData();
      setNewLog({ ...newLog, workerIds: [], notes: '', image: undefined, overtimeAmount: 0, status: 'Full' });
      setShowForm(false);
    } catch (err) {
      alert('Failed to save log');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this attendance record?')) {
      await deleteAttendance(id);
      await loadData();
    }
  };

  const filteredLogs = logs.filter(l => {
    const worker = workers.find(w => w.id === l.workerId);
    const isWorkerActive = worker?.status === 'active';
    
    const matchesArchived = showArchived || isWorkerActive;
    const matchesProject = filter === 'All' || l.projectId === filter;
    const matchesStart = !startDate || l.date >= startDate;
    const matchesEnd = !endDate || l.date <= endDate;
    
    return matchesArchived && matchesProject && matchesStart && matchesEnd;
  });

  const activeWorkers = workers.filter(w => w.status === 'active');

  if (loading && logs.length === 0) {
    return <div className="container" style={{ paddingTop: '5rem', textAlign: 'center' }}><p>Loading logs...</p></div>;
  }

  return (
    <div className="container fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <header className={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h1 className="section-title">Attendance Logs</h1>
          <label className={styles.archivedToggle}>
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={e => setShowArchived(e.target.checked)} 
            />
            Show history of past workers
          </label>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.filterRow}>
             <div className={styles.inputGroup}>
                <label>From</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.dateFilter} />
             </div>
             <div className={styles.inputGroup}>
                <label>To</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={styles.dateFilter} />
             </div>
          </div>
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
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + Log Attendance
            </button>
          )}
        </div>
      </header>

      {showForm && (
        <section className={`${styles.formSection} card`}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Log Work Day</h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label>Select Workers ({newLog.workerIds.length} selected)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={selectAllWorkers} style={{ fontSize: '0.75rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>Select All</button>
                  <button type="button" onClick={deselectAllWorkers} style={{ fontSize: '0.75rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>Clear</button>
                </div>
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '0.5rem',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '0.5rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}>
                {activeWorkers.map(w => (
                  <label key={w.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    padding: '0.5rem', 
                    background: newLog.workerIds.includes(w.id) ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)', 
                    borderRadius: '6px',
                    border: newLog.workerIds.includes(w.id) ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={newLog.workerIds.includes(w.id)}
                      onChange={() => toggleWorker(w.id)}
                      style={{ width: 'auto', margin: 0, accentColor: '#f59e0b', transform: 'scale(1.2)' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{w.name}</span>
                      <span style={{ fontSize: '0.7rem', color: '#888' }}>{w.role}</span>
                    </div>
                  </label>
                ))}
              </div>
              {newLog.workerIds.length === 0 && <small style={{ color: '#ef4444', marginTop: '0.25rem' }}>Please select at least one worker.</small>}
            </div>
            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label>Date</label>
                <input 
                  type="date" 
                  value={newLog.date} 
                  onChange={e => setNewLog({...newLog, date: e.target.value})}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Site / Project</label>
                <select 
                  value={newLog.projectId} 
                  onChange={e => setNewLog({...newLog, projectId: e.target.value})}
                  required
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label>Day Status</label>
                <select 
                  value={newLog.status} 
                  onChange={e => setNewLog({...newLog, status: e.target.value as AttendanceStatus})}
                >
                  <option value="Full">Full Day</option>
                  <option value="Half">Half Day</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Overtime Amount (₹)</label>
                <input 
                  type="number" 
                  value={newLog.overtimeAmount || ''} 
                  onChange={e => setNewLog({...newLog, overtimeAmount: Number(e.target.value)})}
                  placeholder="0"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Notes (Optional)</label>
              <input 
                type="text" 
                value={newLog.notes} 
                onChange={e => setNewLog({...newLog, notes: e.target.value})}
                placeholder="e.g., worked extra hours"
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Photo Attachment (Optional)</label>
              <ImageUpload onImageAction={(base64) => setNewLog({...newLog, image: base64})} />
            </div>
            <div className={styles.formActions}>
              <button type="submit" className="btn-primary">Save Log</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <div className={styles.logTableContainer}>
        {filteredLogs.length === 0 ? (
          <div className="glass" style={{ padding: '4rem', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>No records found for this period.</p>
          </div>
        ) : (
          <div className={styles.logList}>
            {filteredLogs.map(log => {
              const worker = workers.find(w => w.id === log.workerId);
              const project = projects.find(p => p.id === log.projectId);
              return (
                <div key={log.id} className={`${styles.logItem} glass`}>
                  <div className={styles.logDate}>
                    <span className={styles.day}>{new Date(log.date).getDate()}</span>
                    <span className={styles.month}>{new Date(log.date).toLocaleString('default', { month: 'short' })}</span>
                  </div>
                  <div className={styles.logMain}>
                    <h3 className={styles.workerName}>{worker?.name || 'Deleted Worker'}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <p className={styles.workerRole}>{worker?.role || 'History Only'}</p>
                      <span className={`${styles.statusBadge} ${log.status === 'Half' ? styles.half : styles.full}`}>
                        {log.status === 'Half' ? 'Half Day' : 'Full Day'}
                      </span>
                      {log.overtimeAmount > 0 && (
                        <span className={styles.otBadge}>+₹{log.overtimeAmount} OT</span>
                      )}
                    </div>
                    {log.notes && <p className={styles.notes}>"{log.notes}"</p>}
                    {log.image && (
                      <div className={styles.attachmentPreview}>
                        <img src={log.image} alt="Proof" onClick={() => window.open(log.image)} />
                      </div>
                    )}
                  </div>
                  <div className={styles.logMeta}>
                    <span className={styles.badge}>
                      {project?.name || 'Unknown Site'}
                    </span>
                    <button onClick={() => handleDelete(log.id)} className={styles.deleteBtn}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: '3rem' }}><p>Loading...</p></div>}>
      <LogsContent />
    </Suspense>
  );
}
