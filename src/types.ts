export type UserRole = 'operator' | 'supervisor' | 'manager' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar_url?: string;
  created_at: string;
  can_access_cutting_entry?: boolean;
  can_access_remnant_entry?: boolean;
  can_access_heat_seal_entry?: boolean;
  can_access_poly_entry?: boolean;
  can_access_requisition?: boolean;
}

export interface Machine {
  id: string;
  machine_name: string;
  machine_type: string;
}

export interface Buyer {
  id: string;
  name: string;
  created_at?: string;
}

export type EntryStatus = 'draft' | 'submitted' | 'approved';

export interface CuttingEntry {
  id: string;
  entry_date: string; // YYYY-MM-DD
  shift: string; // 'A' | 'B' | 'C'
  machine_id: string;
  buyer: string;
  job_no: string;
  color: string;
  item: string;
  cut_no: string;
  lay: number;
  ratio: number;
  table_no: string;
  fabric_type: string;
  parts: string; // e.g., 'Front, Back, Sleeves'
  fabric_used_kg: number;
  remnant_weight_kg: number;
  booking_consumption?: number;
  cutting_consumption?: number;
  cutting_scrap_weight_kg: number;
  reject_qty?: number; // explicitly in interface or in remarks? Wait, reject_qty is in DB and interface but let's check. Wait, reject_qty is already part of the DB and calculations.
  marker_length_inch: number;
  marker_consumption?: number; // Added
  marker_efficiency_percent: number;
  remarks: string;
  po_no?: string;
  order_qty?: number;
  color_type?: string;
  supervisor_name?: string;
  created_by: string; // profile_id / email
  approved_by?: string; // profile_id / email
  status: EntryStatus;
  created_at: string;
  updated_at: string;
  
  // Calculated Fields
  total_length_inch?: number;
  total_used_fabric_inch?: number;
  spreading_scrap_kg?: number;
  scrap_percent_per_marker?: number;
  cutting_scrap_percent?: number;
  deviation_percent?: number;
  efficiency_gap?: number;
  actual_marker_scrap_kg?: number;
  actual_marker_scrap_percent?: number;
  actual_physical_marker_efficiency_ete?: number;
}

export interface AuditLog {
  id: string;
  user_email: string;
  action: 'create' | 'edit' | 'delete' | 'approve';
  entity_type: string; // 'cutting_entry' | 'machine' | 'profile'
  entity_id: string;
  old_value?: string; // JSON string
  new_value?: string; // JSON string
  created_at: string;
}

export interface PolyEntry {
  id: string;
  entry_date: string; // YYYY-MM-DD
  total_received_poly: number;
  total_reused_poly: number;
  price: number;
  save: number;
  created_by?: string; // profile_id / email
  created_at?: string;
  updated_at?: string;
}

export interface HourlyHeatSealData {
  hour_slot: string; // "8-9 AM", "9-10 AM"
  target: number;
  production: number;
  shortfall: number;
  efficiency: number;
}

export interface HeatSealOperator {
  id: string;
  operator_name: string;
  operator_id: string; // unique company code
  designation: string;
  created_at?: string;
}

export interface HeatSealTarget {
  id: string;
  target_date: string;
  shift: 'A' | 'B' | 'C' | 'D' | 'N';
  operator_id: string;
  operator_name: string;
  job_no: string;
  color: string;
  po_no: string;
  hourly_target: number;
  status?: 'active' | 'completed';
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HeatSealEntry {
  id: string;
  entry_date: string; // YYYY-MM-DD
  shift: 'A' | 'B' | 'C' | 'D' | 'N';
  operator_name: string;
  operator_id: string;
  designation: string;
  job_no?: string;
  color?: string;
  po_no?: string;
  target_id?: string;
  hourly_data: HourlyHeatSealData[];
  created_by?: string;
  status: 'draft' | 'submitted' | 'approved';
  created_at?: string;
  updated_at?: string;
}

export interface Requisition {
  id: string;
  req_id: string;
  item_description: string;
  request_person: string;
  qty: number;
  sent_date: string;
  received_date?: string;
  work_order_no: string;
  mrri_no: string;
  issue_no: string;
  remarks: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by?: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
}

