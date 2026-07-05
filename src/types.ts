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
  cutting_scrap_weight_kg: number;
  marker_length_inch: number;
  marker_efficiency_percent: number;
  remarks: string;
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
