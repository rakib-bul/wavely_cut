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