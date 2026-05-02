'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './workers.module.css';
import { 
  getWorkers, addWorker, Worker, getWorkerBalance, archiveWorker, 
  restoreWorker, deleteWorkerWithHistory, getProjects, addProject, Project 
} from '@/lib/storage';

function WorkersContent() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  
  const [newWorker, setNewWorker] = useState({ name: '', role: '', dailyRate: 0, projectId: '' });
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  const searchParams = useSearchParams();

  useEffect(() => {
    const p = getProjects();
    setProjects(p);
    setWorkers(getWorkers());
    
    if (p.length > 0) {
      setNewWorker(prev => ({ ...prev, projectId: p[0].id }));
    }

    if (searchParams.get('action') === 'new') {
      setShowForm(true);
    }
  }, [searchParams]);

  const handleWorkerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorker.name || !newWorker.role || !newWorker.projectId) return;
    
    const added = addWorker({ ...newWorker, status: 'active' });
    setWorkers([...workers, added]);
    setNewWorker({ ...newWorker, name: '', role: '', dailyRate: 0 });
    setShowForm(false);
  };

  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name) return;
    const added = addProject(newProject.name, newProject.description);
    setProjects([...projects, added]);
    setNewProject({ name: '', description: '' });
    setShowProjectForm(false);
  };

  const handleArchive = (id: string) => {
    if (confirm('Archive this worker? They will be moved to the "Past Workers" list.')) {
      archiveWorker(id);
      setWorkers(getWorkers());
    }
  };

  const handleRestore = (id: string) => {
    restoreWorker(id);
    setWorkers(getWorkers());
  };

  const filteredWorkers = workers.filter(w => (w.status || 'active') === activeTab);

  // Group workers by project
  const groupedWorkers = projects.map(p => ({
    ...p,
    workers: filteredWorkers.filter(w => w.projectId === p.id)
  })).filter(group => activeTab === 'archived' ? group.workers.length > 0 : true);

  return (
    <div className="container fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className="section-title" style={{ marginBottom: '1rem' }}>Worker Directory</h1>
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'active' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Active Workers
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'archived' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('archived')}
            >
              Past Workers
            </button>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className="btn-secondary" onClick={() => setShowProjectForm(true)}>
            + New Project/Site
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Add Worker
          </button>
        </div>
      </header>

      {showProjectForm && (
        <section className={`${styles.formSection} card`}>
          <h2 className={styles.formTitle}>Add New Site / Project</h2>
          <form onSubmit={handleProjectSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Project Name</label>
              <input 
                type="text" 
                value={newProject.name} 
                onChange={e => setNewProject({...newProject, name: e.target.value})}
                placeholder="e.g., Grand Villa Site"
                required
              />
            </div>
            <div className={styles.formActions}>
              <button type="submit" className="btn-primary">Create Project</button>
              <button type="button" className="btn-secondary" onClick={() => setShowProjectForm(false)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      {showForm && (
        <section className={`${styles.formSection} card`}>
          <h2 className={styles.formTitle}>Add New Worker</h2>
          <form onSubmit={handleWorkerSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.inputGroup}>
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={newWorker.name} 
                  onChange={e => setNewWorker({...newWorker, name: e.target.value})}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Assigned Site/Project</label>
                <select 
                  value={newWorker.projectId} 
                  onChange={e => setNewWorker({...newWorker, projectId: e.target.value})}
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
                <label>Role</label>
                <input 
                  type="text" 
                  value={newWorker.role} 
                  onChange={e => setNewWorker({...newWorker, role: e.target.value})}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Daily Rate (₹)</label>
                <input 
                  type="number" 
                  value={newWorker.dailyRate || ''} 
                  onChange={e => setNewWorker({...newWorker, dailyRate: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <button type="submit" className="btn-primary">Save Worker</button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <div className={styles.projectGroups}>
        {groupedWorkers.map(group => (
          <section key={group.id} className={styles.projectSection}>
            <div className={styles.projectHeader}>
               <h2 className={styles.projectName}>{group.name}</h2>
               <span className={styles.workerCount}>{group.workers.length} Workers</span>
            </div>
            
            <div className={styles.workerGrid}>
              {group.workers.length === 0 ? (
                <div className={`${styles.emptyGroup} glass`}>
                  <p>No workers assigned to this site yet.</p>
                </div>
              ) : (
                group.workers.map(worker => {
                  const { earned, paid, balance } = getWorkerBalance(worker.id);
                  return (
                    <div key={worker.id} className="card">
                      <div className={styles.workerCardHeader}>
                        <div className={styles.workerAvatar}>{worker.name.charAt(0)}</div>
                        <div className={styles.workerActions}>
                          {activeTab === 'active' ? (
                            <button onClick={() => handleArchive(worker.id)}>📦</button>
                          ) : (
                            <button onClick={() => handleRestore(worker.id)}>🔄</button>
                          )}
                        </div>
                      </div>
                      <h3 className={styles.workerName}>{worker.name}</h3>
                      <p className={styles.workerRole}>{worker.role}</p>
                      
                      <div className={styles.balanceGrid}>
                        <div className={styles.balanceItem}>
                          <span>Earned</span>
                          <p>₹{earned}</p>
                        </div>
                        <div className={styles.balanceItem}>
                          <span>Paid</span>
                          <p>₹{paid}</p>
                        </div>
                        <div className={`${styles.balanceItem} ${balance > 0 ? styles.due : ''}`}>
                          <span>Balance</span>
                          <p>₹{balance}</p>
                        </div>
                      </div>

                      <div className={styles.workerFooter}>
                        <div className={styles.statItem}>
                          <span>Daily Rate</span>
                          <p>₹{worker.dailyRate || 0}</p>
                        </div>
                        <Link href={`/workers/${worker.id}`} className={styles.ledgerLink}>
                          View Ledger →
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default function WorkersPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: '3rem' }}><p>Loading...</p></div>}>
      <WorkersContent />
    </Suspense>
  );
}
