import { supabase } from './supabase';

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
  projectId?: string;
}

export interface Attendance {
  id: string;
  workerId: string;
  date: string;
  projectId: string;
  status: AttendanceStatus;
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

export interface Material {
  id: string;
  projectId: string;
  vendorId?: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  amountPaid: number;
  date: string;
  notes?: string;
  image?: string;
}

export interface Vendor {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt?: string;
}

export interface VendorPayment {
  id: string;
  vendorId: string;
  amount: number;
  date: string;
  notes?: string;
}

// --- Projects ---
export const getProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase.from('projects').select('*').order('name');
  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
  return data || [];
};

export const addProject = async (name: string, description?: string) => {
  const { data, error } = await supabase
    .from('projects')
    .insert([{ name, description }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteProject = async (id: string) => {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
};

// --- Workers ---
export const getWorkers = async (): Promise<Worker[]> => {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching workers:', error);
    return [];
  }

  return (data || []).map(w => ({
    ...w,
    dailyRate: Number(w.daily_rate),
    projectId: w.project_id
  }));
};

export const addWorker = async (worker: Omit<Worker, 'id'>) => {
  const { data, error } = await supabase
    .from('workers')
    .insert([{
      name: worker.name,
      role: worker.role,
      daily_rate: worker.dailyRate,
      status: worker.status || 'active',
      project_id: worker.projectId
    }])
    .select()
    .single();

  if (error) throw error;
  return { ...data, dailyRate: Number(data.daily_rate), projectId: data.project_id };
};

export const archiveWorker = async (workerId: string) => {
  const { error } = await supabase
    .from('workers')
    .update({ status: 'archived' })
    .eq('id', workerId);
  if (error) throw error;
};

export const restoreWorker = async (workerId: string) => {
  const { error } = await supabase
    .from('workers')
    .update({ status: 'active' })
    .eq('id', workerId);
  if (error) throw error;
};

export const updateWorker = async (id: string, updates: Partial<Worker>) => {
  const { data, error } = await supabase
    .from('workers')
    .update({
      name: updates.name,
      role: updates.role,
      daily_rate: updates.dailyRate,
      status: updates.status,
      project_id: updates.projectId
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return { ...data, dailyRate: Number(data.daily_rate), projectId: data.project_id };
};

export const deleteWorkerWithHistory = async (workerId: string) => {
  // Cascading deletes handled by Postgres foreign keys (ON DELETE CASCADE)
  const { error } = await supabase.from('workers').delete().eq('id', workerId);
  if (error) throw error;
};

// --- Attendance ---
export const getAttendance = async (): Promise<Attendance[]> => {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }

  return (data || []).map(a => ({
    ...a,
    workerId: a.worker_id,
    projectId: a.project_id,
    overtimeAmount: Number(a.overtime_amount),
    image: a.image_url
  }));
};

export const logAttendance = async (entry: Omit<Attendance, 'id'>) => {
  const { data, error } = await supabase
    .from('attendance')
    .insert([{
      worker_id: entry.workerId,
      project_id: entry.projectId,
      date: entry.date,
      status: entry.status,
      overtime_amount: entry.overtimeAmount,
      notes: entry.notes,
      image_url: entry.image
    }])
    .select()
    .single();

  if (error) throw error;
  return { ...data, workerId: data.worker_id, projectId: data.project_id, overtimeAmount: Number(data.overtime_amount), image: data.image_url };
};

export const deleteAttendance = async (id: string) => {
  const { error } = await supabase.from('attendance').delete().eq('id', id);
  if (error) throw error;
};

export const updateAttendance = async (id: string, updates: Partial<Attendance>) => {
  const { data, error } = await supabase
    .from('attendance')
    .update({
      worker_id: updates.workerId,
      project_id: updates.projectId,
      date: updates.date,
      status: updates.status,
      overtime_amount: updates.overtimeAmount,
      notes: updates.notes,
      image_url: updates.image
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return { ...data, workerId: data.worker_id, projectId: data.project_id, overtimeAmount: Number(data.overtime_amount), image: data.image_url };
};

// --- Payments ---
export const getPayments = async (): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching payments:', error);
    return [];
  }

  return (data || []).map(p => ({
    ...p,
    workerId: p.worker_id,
    amount: Number(p.amount),
    image: p.image_url
  }));
};

export const addPayment = async (payment: Omit<Payment, 'id'>) => {
  const { data, error } = await supabase
    .from('payments')
    .insert([{
      worker_id: payment.workerId,
      amount: payment.amount,
      date: payment.date,
      notes: payment.notes,
      image_url: payment.image
    }])
    .select()
    .single();

  if (error) throw error;
  return { ...data, workerId: data.worker_id, amount: Number(data.amount), image: data.image_url };
};

export const deletePayment = async (id: string) => {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
};

export const updatePayment = async (id: string, updates: Partial<Payment>) => {
  const { data, error } = await supabase
    .from('payments')
    .update({
      worker_id: updates.workerId,
      amount: updates.amount,
      date: updates.date,
      notes: updates.notes,
      image_url: updates.image
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return { ...data, workerId: data.worker_id, amount: Number(data.amount), image: data.image_url };
};

// --- Vendors ---
export const getVendors = async (): Promise<Vendor[]> => {
  const { data, error } = await supabase.from('vendors').select('*').order('name');
  if (error) {
    console.error('Error fetching vendors:', error);
    return [];
  }
  return data;
};

export const addVendor = async (vendor: Omit<Vendor, 'id'>) => {
  const { data, error } = await supabase.from('vendors').insert([vendor]).select().single();
  if (error) throw error;
  return data;
};

export const getVendorPayments = async (): Promise<VendorPayment[]> => {
  const { data, error } = await supabase.from('vendor_payments').select('*').order('date', { ascending: false });
  if (error) {
    console.error('Error fetching vendor payments:', error);
    return [];
  }
  return (data || []).map(vp => ({
    id: vp.id,
    vendorId: vp.vendor_id,
    amount: Number(vp.amount),
    date: vp.date,
    notes: vp.notes
  }));
};

export const addVendorPayment = async (payment: Omit<VendorPayment, 'id'>) => {
  const { data, error } = await supabase.from('vendor_payments').insert([{
    vendor_id: payment.vendorId,
    amount: payment.amount,
    date: payment.date,
    notes: payment.notes
  }]).select().single();
  
  if (error) throw error;
  return {
    id: data.id,
    vendorId: data.vendor_id,
    amount: Number(data.amount),
    date: data.date,
    notes: data.notes
  };
};

export const deleteVendorPayment = async (id: string) => {
  const { error } = await supabase.from('vendor_payments').delete().eq('id', id);
  if (error) throw error;
};

// --- Materials ---
export const getMaterials = async (): Promise<Material[]> => {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching materials:', error);
    return [];
  }

  return (data || []).map(m => ({
    ...m,
    projectId: m.project_id,
    vendorId: m.vendor_id,
    unitPrice: Number(m.unit_price),
    totalCost: Number(m.total_cost),
    amountPaid: Number(m.amount_paid),
    image: m.image_url
  }));
};

export const addMaterial = async (material: Omit<Material, 'id'>) => {
  const { data, error } = await supabase
    .from('materials')
    .insert([{
      project_id: material.projectId,
      vendor_id: material.vendorId,
      name: material.name,
      quantity: material.quantity,
      unit: material.unit,
      unit_price: material.unitPrice,
      total_cost: material.totalCost,
      amount_paid: material.amountPaid,
      date: material.date,
      notes: material.notes,
      image_url: material.image
    }])
    .select()
    .single();

  if (error) throw error;
  return { 
    ...data, 
    projectId: data.project_id, 
    vendorId: data.vendor_id,
    unitPrice: Number(data.unit_price), 
    totalCost: Number(data.total_cost), 
    amountPaid: Number(data.amount_paid),
    image: data.image_url 
  };
};

export const deleteMaterial = async (id: string) => {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  if (error) throw error;
};

export const updateMaterial = async (id: string, updates: Partial<Material>) => {
  const { data, error } = await supabase
    .from('materials')
    .update({
      project_id: updates.projectId,
      vendor_id: updates.vendorId,
      name: updates.name,
      quantity: updates.quantity,
      unit: updates.unit,
      unit_price: updates.unitPrice,
      total_cost: updates.totalCost,
      amount_paid: updates.amountPaid,
      date: updates.date,
      notes: updates.notes,
      image_url: updates.image
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return { 
    ...data, 
    projectId: data.project_id, 
    vendorId: data.vendor_id,
    unitPrice: Number(data.unit_price), 
    totalCost: Number(data.total_cost), 
    amountPaid: Number(data.amount_paid),
    image: data.image_url 
  };
};

// --- Balance Calculations ---
export const getWorkerBalance = async (workerId: string) => {
  const { data: worker } = await supabase.from('workers').select('*').eq('id', workerId).single();
  const { data: attendance } = await supabase.from('attendance').select('*').eq('worker_id', workerId);
  const { data: payments } = await supabase.from('payments').select('*').eq('worker_id', workerId);

  if (!worker) return { earned: 0, paid: 0, balance: 0, daysWorked: 0 };

  const dailyRate = Number(worker.daily_rate);
  const earned = (attendance || []).reduce((sum, a) => {
    const dayValue = a.status === 'Half' ? dailyRate / 2 : dailyRate;
    return sum + dayValue + Number(a.overtime_amount || 0);
  }, 0);

  const paid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  
  return {
    earned,
    paid,
    balance: earned - paid,
    daysWorked: (attendance || []).reduce((sum, a) => sum + (a.status === 'Half' ? 0.5 : 1), 0)
  };
};

export const getWorkerLedger = async (workerId: string) => {
  const { data: attendance } = await supabase.from('attendance').select('*').eq('worker_id', workerId);
  const { data: payments } = await supabase.from('payments').select('*').eq('worker_id', workerId);

  const aLogs = (attendance || []).map(a => ({
    ...a,
    workerId: a.worker_id,
    projectId: a.project_id,
    overtimeAmount: Number(a.overtime_amount),
    image: a.image_url,
    type: 'attendance' as const
  }));

  const pLogs = (payments || []).map(p => ({
    ...p,
    workerId: p.worker_id,
    amount: Number(p.amount),
    image: p.image_url,
    type: 'payment' as const
  }));

  return [...aLogs, ...pLogs].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};
