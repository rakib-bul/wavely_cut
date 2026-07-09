export const SCHEMA_DDL_STRING = `
-- ====================================================================
-- PRODUCTION-READY GARMENTS CUTTING MANAGEMENT SYSTEM SCHEMA
-- TARGET DATABASE: PostgreSQL (Supabase / Cloud SQL)
-- AUTHOR: Rakib Hasan
-- TIMESTAMP: 2026-06-23
-- ====================================================================

-- 1. Enable UUID Extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_role type if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('operator', 'supervisor', 'manager', 'admin');
    END IF;
END$$;

-- 2. Profiles Table (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role public.user_role NOT NULL DEFAULT 'operator'::public.user_role,
    department VARCHAR(100) NOT NULL DEFAULT 'Cutting',
    avatar_url TEXT,
    can_access_cutting_entry BOOLEAN NOT NULL DEFAULT true,
    can_access_remnant_entry BOOLEAN NOT NULL DEFAULT true,
    can_access_heat_seal_entry BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Machines Table
CREATE TABLE IF NOT EXISTS public.machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_name VARCHAR(100) NOT NULL UNIQUE,
    machine_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Machines Data
INSERT INTO public.machines (machine_name, machine_type)
VALUES 
    ('Auto Cutter Machine 1', 'Auto'),
    ('Auto Cutter Machine 2', 'Auto'),
    ('Manual Cutting Machine', 'Manual'),
    ('Stripe Cutting', 'Stripe')
ON CONFLICT (machine_name) DO NOTHING;

-- 4. Cutting Entries Table
CREATE TABLE IF NOT EXISTS public.cutting_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_date DATE NOT NULL,
    shift CHAR(1) NOT NULL CHECK (shift IN ('A', 'B', 'C')),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE RESTRICT,
    buyer VARCHAR(100) NOT NULL,
    job_no VARCHAR(100) NOT NULL,
    color VARCHAR(100) NOT NULL,
    po_no VARCHAR(100),
    item VARCHAR(100) NOT NULL,
    cut_no VARCHAR(50) NOT NULL,
    lay INT NOT NULL CHECK (lay > 0),
    ratio INT NOT NULL CHECK (ratio > 0),
    table_no VARCHAR(50) NOT NULL,
    fabric_type VARCHAR(100) NOT NULL,
    parts VARCHAR(255) NOT NULL,
    fabric_used_kg NUMERIC(10, 3) NOT NULL CHECK (fabric_used_kg >= 0),
    remnant_weight_kg NUMERIC(10, 3) NOT NULL CHECK (remnant_weight_kg >= 0),
    booking_consumption NUMERIC(10, 3),
    cutting_consumption NUMERIC(10, 3),
    cutting_scrap_weight_kg NUMERIC(10, 3) NOT NULL CHECK (cutting_scrap_weight_kg >= 0),
    reject_qty INT NOT NULL DEFAULT 0 CHECK (reject_qty >= 0),
    remnants_scrap_weight_kg NUMERIC(10, 3) NOT NULL DEFAULT 0.000 CHECK (remnants_scrap_weight_kg >= 0),
    marker_length_inch NUMERIC(10, 2) NOT NULL CHECK (marker_length_inch > 0),
    marker_consumption NUMERIC(10, 3),
    marker_efficiency_percent NUMERIC(5, 2) NOT NULL CHECK (marker_efficiency_percent > 0 AND marker_efficiency_percent <= 100),
    remarks TEXT,
    supervisor_name VARCHAR(150),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Calculated values persisted for rapid analytics querying
    total_length_inch NUMERIC(12, 2) GENERATED ALWAYS AS (marker_length_inch * lay) STORED,
    spreading_scrap_kg NUMERIC(10, 3) GENERATED ALWAYS AS (fabric_used_kg * 0.025) STORED,
    scrap_percent_per_marker NUMERIC(5, 2) GENERATED ALWAYS AS (100.00 - marker_efficiency_percent) STORED
);

-- Indexes for performance filtering (thousands of records per month)
CREATE INDEX IF NOT EXISTS idx_entries_date ON public.cutting_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_entries_buyer ON public.cutting_entries(buyer);
CREATE INDEX IF NOT EXISTS idx_entries_job_no ON public.cutting_entries(job_no);
CREATE INDEX IF NOT EXISTS idx_entries_machine_id ON public.cutting_entries(machine_id);
CREATE INDEX IF NOT EXISTS idx_entries_fabric_type ON public.cutting_entries(fabric_type);
CREATE INDEX IF NOT EXISTS idx_entries_status ON public.cutting_entries(status);

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'edit', 'delete', 'approve')),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for Audit logs view
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_logs(created_at DESC);

-- 6. Trigger to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_cutting_entries_modtime
    BEFORE UPDATE ON public.cutting_entries
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

-- 8. System Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Settings
INSERT INTO public.settings (key, value)
VALUES ('app_settings', '{"job_no_digits": 7, "is_po_number_required": false, "poly_price": 1.50}')
ON CONFLICT (key) DO NOTHING;

-- Buyers Table
CREATE TABLE IF NOT EXISTS public.buyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Buyers Data
INSERT INTO public.buyers (name)
VALUES 
    ('ZARA CO.'),
    ('GAP GLOBAL'),
    ('H&M IND.'),
    ('UNIQLO GROUP'),
    ('LEVI''S CO.'),
    ('ADIDAS AG')
ON CONFLICT (name) DO NOTHING;

-- 9. Poly Entries Table
CREATE TABLE IF NOT EXISTS public.poly_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_date DATE NOT NULL,
    total_received_poly NUMERIC NOT NULL DEFAULT 0,
    total_reused_poly NUMERIC NOT NULL DEFAULT 0,
    price NUMERIC,
    save NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Heat Seal Operators Table
CREATE TABLE IF NOT EXISTS public.heat_seal_operators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_name VARCHAR(255) NOT NULL,
    operator_id VARCHAR(100) NOT NULL UNIQUE,
    designation VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Heat Seal Operators
INSERT INTO public.heat_seal_operators (operator_name, operator_id, designation)
VALUES 
    ('John Doe', 'HS-001', 'Heat-Seal Operator'),
    ('Jane Smith', 'HS-002', 'Senior Operator'),
    ('Robert Johnson', 'HS-003', 'Junior Operator'),
    ('Emily Davis', 'HS-004', 'Heat-Seal Operator')
ON CONFLICT (operator_id) DO NOTHING;

-- 11. Heat Seal Targets Table
CREATE TABLE IF NOT EXISTS public.heat_seal_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_date DATE NOT NULL,
    shift CHAR(1) NOT NULL CHECK (shift IN ('A', 'B', 'C', 'D', 'N')),
    operator_id VARCHAR(100) NOT NULL REFERENCES public.heat_seal_operators(operator_id) ON DELETE CASCADE,
    operator_name VARCHAR(255) NOT NULL,
    job_no VARCHAR(100) NOT NULL,
    color VARCHAR(100) NOT NULL,
    po_no VARCHAR(100) NOT NULL,
    hourly_target INT NOT NULL DEFAULT 100,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_heat_seal_target_date ON public.heat_seal_targets(target_date);

-- 12. Heat Seal Entries Table
CREATE TABLE IF NOT EXISTS public.heat_seal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_date DATE NOT NULL,
    shift CHAR(1) NOT NULL CHECK (shift IN ('A', 'B', 'C', 'D', 'N')),
    operator_name VARCHAR(255) NOT NULL,
    operator_id VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    job_no VARCHAR(100),
    color VARCHAR(100),
    po_no VARCHAR(100),
    target_id UUID REFERENCES public.heat_seal_targets(id) ON DELETE SET NULL,
    hourly_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_heat_seal_date ON public.heat_seal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_heat_seal_status ON public.heat_seal_entries(status);

CREATE TRIGGER update_heat_seal_entries_modtime
    BEFORE UPDATE ON public.heat_seal_entries
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();

CREATE OR REPLACE FUNCTION update_heat_seal_targets_modtime_fn()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_heat_seal_targets_modtime
    BEFORE UPDATE ON public.heat_seal_targets
    FOR EACH ROW
    EXECUTE PROCEDURE update_heat_seal_targets_modtime_fn();

`;
export const RLS_DDL_STRING = `
-- ====================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- TARGET DATABASE: PostgreSQL
-- AUTHOR: Rakib Hasan
-- TIMESTAMP: 2026-06-23
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role from public.profiles
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS VARCHAR AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;


-- ==========================================
-- 1. PROFILES TABLE POLICIES
-- ==========================================

-- Admins can do anything on profiles
CREATE POLICY admin_all_profiles ON public.profiles
    FOR ALL
    USING (public.get_user_role() = 'admin')
    WITH CHECK (public.get_user_role() = 'admin');

-- All authenticated users can read profiles (needed for displays/approvals)
CREATE POLICY all_read_profiles ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- User can update their own profile details (excluding role)
CREATE POLICY user_update_own_profile ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- ==========================================
-- 2. MACHINES TABLE POLICIES
-- ==========================================

-- All users can view machines list
CREATE POLICY all_read_machines ON public.machines
    FOR SELECT
    TO authenticated
    USING (true);

-- Admins and Supervisors can insert/update/delete machines
CREATE POLICY admin_super_write_machines ON public.machines
    FOR ALL
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'supervisor'))
    WITH CHECK (public.get_user_role() IN ('admin', 'supervisor'));


-- ==========================================
-- 3. CUTTING ENTRIES TABLE POLICIES
-- ==========================================

-- SELECT: All authenticated users can view all entries (unified access policy)
CREATE POLICY select_cutting_entries ON public.cutting_entries
    FOR SELECT
    TO authenticated
    USING (
        true
    );

-- INSERT: Operators and Supervisors can insert entries
CREATE POLICY insert_cutting_entries ON public.cutting_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role() IN ('operator', 'supervisor', 'admin')
    );

-- UPDATE:
-- Operator can only edit their OWN entry, and ONLY if it is still a 'draft'
CREATE POLICY operator_update_own_draft ON public.cutting_entries
    FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role() = 'operator' 
        AND created_by = auth.uid() 
        AND status = 'draft'
    )
    WITH CHECK (
        public.get_user_role() = 'operator' 
        AND created_by = auth.uid() 
        AND status IN ('draft', 'submitted')
    );

-- Supervisor & Admin can update any entries (and approve them)
CREATE POLICY supervisor_admin_update_all ON public.cutting_entries
    FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role() IN ('supervisor', 'admin')
    )
    WITH CHECK (
        public.get_user_role() IN ('supervisor', 'admin')
    );

-- DELETE:
-- Only Supervisors and Admins can delete entries
CREATE POLICY delete_cutting_entries ON public.cutting_entries
    FOR DELETE
    TO authenticated
    USING (
        public.get_user_role() IN ('supervisor', 'admin')
    );


-- ==========================================
-- 4. AUDIT LOGS TABLE POLICIES
-- ==========================================

-- SELECT: Only Admins can select audit logs
CREATE POLICY select_audit_logs ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        public.get_user_role() = 'admin'
    );

-- INSERT: System can write audit logs (automatic trigger or service backend)
CREATE POLICY insert_audit_logs ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ==========================================
-- 5. POLY ENTRIES TABLE POLICIES
-- ==========================================

ALTER TABLE public.poly_entries ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can view poly entries
CREATE POLICY select_poly_entries ON public.poly_entries
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Officers and Admins can insert poly entries
CREATE POLICY insert_poly_entries ON public.poly_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role() IN ('officer', 'supervisor', 'admin')
    );

-- UPDATE: Officers, Supervisors, and Admins can update poly entries
CREATE POLICY update_poly_entries ON public.poly_entries
    FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role() IN ('officer', 'supervisor', 'admin')
    );

-- DELETE: Officers and Admins can delete poly entries
CREATE POLICY delete_poly_entries ON public.poly_entries
    FOR DELETE
    TO authenticated
    USING (
        public.get_user_role() IN ('officer', 'supervisor', 'admin')
    );

-- ==========================================
-- 6. HEAT SEAL ENTRIES TABLE POLICIES
-- ==========================================

ALTER TABLE public.heat_seal_entries ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can view heat seal entries
CREATE POLICY select_heat_seal_entries ON public.heat_seal_entries
    FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Operators, Supervisors and Admins can insert heat seal entries
CREATE POLICY insert_heat_seal_entries ON public.heat_seal_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_user_role() IN ('operator', 'supervisor', 'admin')
    );

-- UPDATE: Operator can only edit their OWN entry, and ONLY if it is still a 'draft'
CREATE POLICY operator_update_own_draft_heat_seal ON public.heat_seal_entries
    FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role() = 'operator' 
        AND created_by = auth.uid() 
        AND status = 'draft'
    );

-- UPDATE: Supervisors and Admins can update any heat seal entries
CREATE POLICY supervisor_admin_update_heat_seal ON public.heat_seal_entries
    FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role() IN ('supervisor', 'admin')
    );

-- DELETE: Supervisors and Admins can delete heat seal entries
CREATE POLICY delete_heat_seal_entries ON public.heat_seal_entries
    FOR DELETE
    TO authenticated
    USING (
        public.get_user_role() IN ('supervisor', 'admin')
    );

-- ==========================================
-- 7. HEAT SEAL OPERATORS & TARGETS POLICIES
-- ==========================================

ALTER TABLE public.heat_seal_operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_heat_seal_operators ON public.heat_seal_operators
    FOR SELECT TO authenticated USING (true);

CREATE POLICY all_heat_seal_operators_admin ON public.heat_seal_operators
    FOR ALL TO authenticated USING (public.get_user_role() IN ('supervisor', 'admin'));

ALTER TABLE public.heat_seal_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_heat_seal_targets ON public.heat_seal_targets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY all_heat_seal_targets_admin ON public.heat_seal_targets
    FOR ALL TO authenticated USING (public.get_user_role() IN ('supervisor', 'admin'));`;
