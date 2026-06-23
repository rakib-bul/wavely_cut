-- ====================================================================
-- PRODUCTION-READY GARMENTS CUTTING MANAGEMENT SYSTEM SCHEMA
-- TARGET DATABASE: PostgreSQL (Supabase / Cloud SQL)
-- AUTHOR: AI Studio Build
-- TIMESTAMP: 2026-06-23
-- ====================================================================

-- 1. Enable UUID Extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('operator', 'supervisor', 'manager', 'admin')),
    department VARCHAR(100) NOT NULL DEFAULT 'Cutting',
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
    item VARCHAR(100) NOT NULL,
    cut_no VARCHAR(50) NOT NULL,
    lay INT NOT NULL CHECK (lay > 0),
    ratio INT NOT NULL CHECK (ratio > 0),
    table_no VARCHAR(50) NOT NULL,
    fabric_type VARCHAR(100) NOT NULL,
    parts VARCHAR(255) NOT NULL,
    fabric_used_kg NUMERIC(10, 3) NOT NULL CHECK (fabric_used_kg >= 0),
    remnant_weight_kg NUMERIC(10, 3) NOT NULL CHECK (remnant_weight_kg >= 0),
    cutting_scrap_weight_kg NUMERIC(10, 3) NOT NULL CHECK (cutting_scrap_weight_kg >= 0),
    marker_length_inch NUMERIC(10, 2) NOT NULL CHECK (marker_length_inch > 0),
    marker_efficiency_percent NUMERIC(5, 2) NOT NULL CHECK (marker_efficiency_percent > 0 AND marker_efficiency_percent <= 100),
    remarks TEXT,
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

-- 7. Buyers Table
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

