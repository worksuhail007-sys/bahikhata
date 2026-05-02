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
    workerId: '',
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

  const handleWorkerChange = (id: string) => {
    const worker = workers.find(w => w.id === id);
    setNewLog(prev => ({ 
      ...prev, 
      workerId: id,
      projectId: worker?.projectId || prev.projectId 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.workerId || !newLog.projectId) return;

    try {
      await logAttendance(newLog);
      await loadData();
      setNewLog({ ...newLog, workerId: '', notes: '', image: undefined, overtimeAmount: 0, status: 'Full' });
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
            <div className={styles.inputGroup}>
              <label>Worker</label>
              <select 
                value={newLog.workerId} 
                onChange={e => handleWorkerChange(e.target.value)}
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
