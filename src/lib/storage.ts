export type AttendanceStatus = 'Full' | 'Half';

export interface Project {
  id: string;
  name: string;
  description?: string;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  dailyRate: number;
  status?: 'active' | 'archived';
  projectId?: string; // Linked project
}

export interface Attendance {
  id: string;
  workerId: string;
  date: string;
  projectId: string; // Linked project ID
  status: 'Full' | 'Half';
  overtimeAmount: number;
  notes?: string;
  image?: string;
}

export interface Payment {
  id: string;
  workerId: string;
  amount: number;
  date: string;
  notes?: string;
  image?: string;
}

const STORAGE_KEYS = {
  PROJECTS: 'bahikhata_projects',
  WORKERS: 'bahikhata_workers',
  ATTENDANCE: 'bahikhata_attendance',
  PAYMENTS: 'bahikhata_payments',
};

// --- Projects ---
export const getProjects = (): Project[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  if (!stored) {
    // Default initial projects
    const defaults = [
      { id: 'p1', name: 'Home' },
      { id: 'p2', name: 'Shop' }
    ];
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(stored);
};

export const addProject = (name: string, description?: string) => {
  const projects = getProjects();
  const newProject = { id: crypto.randomUUID(), name, description };
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([...projects, newProject]));
  return newProject;
};

export const deleteProject = (id: string) => {
  const projects = getProjects().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
};

// --- Workers ---
export const getWorkers = (): Worker[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.WORKERS);
  const data = stored ? JSON.parse(stored) : [];
  return data.map((w: any) => ({
    ...w,
    status: w.status || 'active',
    projectId: w.projectId || 'p1' // Default to Home if not set
  }));
};

export const saveWorkers = (workers: Worker[]) => {
  localStorage.setItem(STORAGE_KEYS.WORKERS, JSON.stringify(workers));
};

export const addWorker = (worker: Omit<Worker, 'id'>) => {
  const workers = getWorkers();
  const newWorker = { ...worker, id: crypto.randomUUID() };
  saveWorkers([...workers, newWorker]);
  return newWorker;
};

export const archiveWorker = (workerId: string) => {
  const workers = getWorkers().map(w => 
    w.id === workerId ? { ...w, status: 'archived' as const } : w
  );
  saveWorkers(workers);
};

export const restoreWorker = (workerId: string) => {
  const workers = getWorkers().map(w => 
    w.id === workerId ? { ...w, status: 'active' as const } : w
  );
  saveWorkers(workers);
};

export const deleteWorkerWithHistory = (workerId: string) => {
  const workers = getWorkers().filter(w => w.id !== workerId);
  const attendance = getAttendance().filter(a => a.workerId !== workerId);
  const payments = getPayments().filter(p => p.workerId !== workerId);
  
  saveWorkers(workers);
  saveAttendance(attendance);
  savePayments(payments);
};

// --- Attendance ---
export const getAttendance = (): Attendance[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  const data = stored ? JSON.parse(stored) : [];
  return data.map((a: any) => ({
    ...a,
    status: a.status || 'Full',
    overtimeAmount: a.overtimeAmount || 0,
    projectId: a.projectId || a.project || 'p1' // Migration for old 'project' string
  }));
};

export const saveAttendance = (attendance: Attendance[]) => {
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
};

export const logAttendance = (entry: Omit<Attendance, 'id'>) => {
  const attendance = getAttendance();
  const newEntry = { ...entry, id: crypto.randomUUID() };
  saveAttendance([...attendance, newEntry]);
  return newEntry;
};

// --- Payments ---
export const getPayments = (): Payment[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
  return stored ? JSON.parse(stored) : [];
};

export const savePayments = (payments: Payment[]) => {
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
};

export const addPayment = (payment: Omit<Payment, 'id'>) => {
  const payments = getPayments();
  const newPayment = { ...payment, id: crypto.randomUUID() };
  savePayments([...payments, newPayment]);
  return newPayment;
};

// --- Balance Calculations ---
export const getWorkerBalance = (workerId: string) => {
  const worker = getWorkers().find(w => w.id === workerId);
  const attendance = getAttendance().filter(a => a.workerId === workerId);
  const payments = getPayments().filter(p => p.workerId === workerId);

  if (!worker) return { earned: 0, paid: 0, balance: 0, daysWorked: 0 };

  const earned = attendance.reduce((sum, a) => {
    const dayValue = a.status === 'Half' ? worker.dailyRate / 2 : worker.dailyRate;
    return sum + dayValue + (a.overtimeAmount || 0);
  }, 0);

  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    earned,
    paid,
    balance: earned - paid,
    daysWorked: attendance.reduce((sum, a) => sum + (a.status === 'Half' ? 0.5 : 1), 0)
  };
};

export const getWorkerLedger = (workerId: string) => {
  const attendance = getAttendance()
    .filter(a => a.workerId === workerId)
    .map(a => ({ ...a, type: 'attendance' as const }));
  
  const payments = getPayments()
    .filter(p => p.workerId === workerId)
    .map(p => ({ ...p, type: 'payment' as const }));

  return [...attendance, ...payments].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};
