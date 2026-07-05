export const SCHEMA_DDL_STRING = `-- ====================================================================
-- PRODUCTION-READY GARMENTS CUTTING MANAGEMENT SYSTEM SCHEMA
-- TARGET DATABASE: PostgreSQL (Supabase / Cloud SQL)
-- AUTHOR: Platform
-- TIMESTAMP: 2026-06-23
-- ====================================================================

-- Enable UUID Extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles Table (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('operator', 'supervisor', 'manager', 'admin')),
    department VARCHAR(100) NOT NULL DEFAULT 'Cutting',
    avatar_url TEXT,
    can_access_cutting_entry BOOLEAN NOT NULL DEFAULT true,
    can_access_remnant_entry BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Machines Table
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

-- Cutting Entries Table
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
    reject_qty INT NOT NULL DEFAULT 0 CHECK (reject_qty >= 0),
    remnants_scrap_weight_kg NUMERIC(10, 3) NOT NULL DEFAULT 0.000 CHECK (remnants_scrap_weight_kg >= 0),
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

-- Buyers Table
CREATE TABLE IF NOT EXISTS public.buyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Buyers
INSERT INTO public.buyers (name)
VALUES 
    ('ZARA CO.'),
    ('GAP GLOBAL'),
    ('H&M IND.'),
    ('UNIQLO GROUP'),
    ('LEVI''S CO.'),
    ('ADIDAS AG')
ON CONFLICT (name) DO NOTHING;
`;

export const RLS_DDL_STRING = `-- ====================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- TARGET DATABASE: PostgreSQL
-- AUTHOR: Platform
-- TIMESTAMP: 2026-06-23
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutting_entries ENABLE ROW LEVEL SECURITY;

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

-- Operator can only edit their OWN entry, and ONLY if it is still a 'draft'
CREATE POLICY operator_update_own_draft ON public.cutting_entries
    FOR UPDATE
    TO authenticated
    USING (
        public.get_user_role() = 'operator' 
        AND created_by = auth.uid() 
        AND status = 'draft'
    );
`;
