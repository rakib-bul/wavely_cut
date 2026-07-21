ALTER TABLE public.poly_entries ADD PRIMARY KEY (id);

-- 1. Add missing permission column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_access_requisition BOOLEAN NOT NULL DEFAULT true;

-- 2. Create the requisitions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.requisitions (
    id VARCHAR(255) PRIMARY KEY,
    req_id VARCHAR(100) NOT NULL UNIQUE,
    item_description TEXT NOT NULL,
    request_person VARCHAR(255) NOT NULL,
    qty NUMERIC NOT NULL CHECK (qty > 0),
    sent_date DATE NOT NULL,
    received_date DATE,
    work_order_no VARCHAR(100) NOT NULL,
    mrri_no VARCHAR(100),
    issue_no VARCHAR(100),
    remarks TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    approved_by VARCHAR(255),
    approved_at DATE
);

-- 3. Enable RLS on the requisitions table
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for requisitions table
DROP POLICY IF EXISTS select_requisitions ON public.requisitions;
CREATE POLICY select_requisitions ON public.requisitions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS insert_requisitions ON public.requisitions;
CREATE POLICY insert_requisitions ON public.requisitions
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS update_requisitions ON public.requisitions;
CREATE POLICY update_requisitions ON public.requisitions
    FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS delete_requisitions ON public.requisitions;
CREATE POLICY delete_requisitions ON public.requisitions
    FOR DELETE TO authenticated USING (
        public.get_user_role() IN ('supervisor', 'admin', 'manager')
    );

-- 5. Add color_type and order_qty to cutting_entries for color type wise metrics
ALTER TABLE public.cutting_entries ADD COLUMN IF NOT EXISTS order_qty INT;
ALTER TABLE public.cutting_entries ADD COLUMN IF NOT EXISTS color_type VARCHAR(100);

