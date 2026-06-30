# WavelyCut - Garments Cutting Management ERP

WavelyCut is a robust, production-ready, full-stack Enterprise Resource Planning (ERP) platform designed specifically for garment cutting room operations. By digitizing paper logbooks and automating material utilization mathematics, WavelyCut bridges the gap between the shop floor and administrative management. Supervisors, managers, and system administrators can track fabric consumption, minimize cutting room waste, optimize lay scheduling, and maximize raw material yield through interactive analytics, daily reports, and spreadsheet exports.

---

## Table of Contents
1. [System Architecture](#1-system-architecture)
2. [Role-Based Access Control (RBAC)](#2-role-based-access-control-rbac)
3. [Core Functional Modules](#3-core-functional-modules)
4. [Mathematical & Business Logic Formulas](#4-mathematical--business-logic-formulas)
5. [Database Schema & Row Level Security (RLS)](#5-database-schema--row-level-security-rls)
6. [Codebase & Module Layout](#6-codebase--module-layout)
7. [Getting Started & Local Development](#7-getting-started--local-development)
8. [Production Deployment Strategy](#8-production-deployment-strategy)

---

## 1. System Architecture

WavelyCut is built with a highly cohesive, high-performance full-stack architecture tailored for real-time data input and dense visualization:

```
                  +-----------------------------------+
                  |          React Frontend           |
                  |     (Vite + Tailwind CSS)         |
                  +-----------------+-----------------+
                                    |
                                    v (REST API over HTTPS)
                  +-----------------+-----------------+
                  |         Express Backend           |
                  |     (Node.js / tsx / esbuild)     |
                  +-----------------+-----------------+
                                    |
                                    v (PostgreSQL Connection)
                  +-----------------+-----------------+
                  |       Supabase PostgreSQL         |
                  |   (Row Level Security & Triggers) |
                  +-----------------------------------+
```

- **Frontend (SPA):** Built with **React 18** and **Vite** for sub-millisecond hot reloads, stylized with **Tailwind CSS**, and animated with **Motion (formerly Framer Motion)**. Key charting modules are powered by **Recharts** and vector icon elements by **Lucide React**.
- **Backend (Express):** A custom, lightweight Node.js Express server configured to bind to port `3000`. It features:
  - Vite development middleware in non-production mode (single port proxy).
  - Robust backend validation rules.
  - Automatic injection and normalization of calculated fields using shared business logic.
- **Database (Supabase / PostgreSQL):** A relational SQL storage engine. Relies on Postgres constraints, triggers to audit logs, and JWT-authenticated Row Level Security (RLS) to enforce data boundaries at the database level.

---

## 2. Role-Based Access Control (RBAC)

The system features four distinct authorization roles that govern access to API endpoints, views, and write privileges:

| Role | Dashboard & Analytics | Reports & Export | Add / Edit Entries | Approval Controls | Admin System Settings |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Admin** | Read | Read & Download | Create, Edit, Delete | Approve & Reject | Manage Users & Machines |
| **Manager** | Read | Read & Download | View Only | View Only | View Only |
| **Supervisor** | Read | Read & Download | Create, Edit Own (Pending) | View Only | Blocked |
| **Viewer** | Read | Read Only | View Only | Blocked | Blocked |

### Workflow Safeguards:
- **Pending vs. Approved State:** When a **Supervisor** inputs a cutting sheet entry, its status remains `Pending`. The record is highlighted, visible, and editable by the creator. Once an **Admin** reviews the physical parameters and clicks **Approve**, the entry transitions to `Approved`. 
- **Immutable Approvals:** Once an entry is approved, it becomes read-only for supervisors to prevent retrospective data alterations.
- **Audit Logs:** Every status change, edit, or deletion is captured in a dedicated database audit trail (`audit_logs`) documenting the timestamp, performer, event type, and row identifiers.

---

## 3. Core Functional Modules

### 📊 Interactive Dashboard & KPIs
- **Material Summaries:** Displays Total Fabric Used (KG), Total Fabric Spread (KG), Total Cutting Scrap (KG), and Overall Remnants Issued vs. Reusable Remnants.
- **Efficiency Trends:** Tracks the Weighted Marker Efficiency vs. actual End-To-End (ETE) Physical Efficiency to display the "Efficiency Gap" — exposing real-world losses due to improper laying, roll ends, or buffer cuts.
- **Visual Gauges:** Color-coded charts depicting cutting volume distributions across machines and daily supervisor output.

### 📋 Intelligent Data Entry Form (`DataEntryForm.tsx`)
- Provides input fields for crucial parameters: *Lay Plies*, *Size Ratio* (e.g., `1:2:2:1`), *Marker Length*, *Marker Efficiency %*, *Fabric Used (KG)*, *Spreading Scrap (KG)*, and *Remnants Weight (KG)* (remarks mapped as roll-end weight).
- **Auto-Calculations on Input:** Instantly computes Total Lay Length, Planned Cut Quantity, Cutting Scrap %, and ETE Physical Efficiency in real-time as the user types, eliminating human calculator errors before form submission.

### 📈 Multi-Dimensional Analytics (`AnalyticsModule.tsx`)
- **Machine Comparison Charts:** Visualizes actual physical yields against target marker efficiencies across machines, highlighting underperforming spreading tables.
- **Buyer Account rankings:** Tracks the average scrap rate and fabric yield per customer account to detect challenging fabric blends or tight margins.
- **Knit Fabric Quality Yields:** Grouped charts by fabric blend (e.g., 100% Cotton, Knit Blend, Fleece) showing how weight variations affect waste.

### 🧾 Comprehensive Reports & Excel Export (`ReportsModule.tsx`)
- Includes filters for Dates, Buyers, Fabric Blends, Shifts, and Machines.
- **Fabric Metrics Ledger:** Displays a dense spreadsheet-style log of all individual fabric plies and scrap values.
- **Daily Executive Digest (`DailyReport.tsx`):** A beautiful, high-fidelity daily summary including:
  - Supervisor Performance & Machine throughput summaries.
  - Overall Fabric Metrics Summary.
  - Date-wise monthly consolidation.
- **Excel (.xls) Generation Engine:** Creates native HTML-based spreadsheet templates directly compatible with Microsoft Excel, styled with professional corporate headers, color coding, and correct alignment, ensuring that **Remnants and Spreading Scrap Calculations** match the UI perfectly.

---

## 4. Mathematical & Business Logic Formulas

WavelyCut guarantees complete logical alignment between the client interface, server databases, and exported spreadsheets using a single, unified mathematical calculations engine defined in `src/utils/calculations.ts`.

### 1. Total Cut Quantity (Planned Pcs)
Calculates the expected yield based on lay plies and size ratios:
$$\text{Total Ratio} = \sum (\text{individual values in the size ratio string, e.g., } 1:2:2:1 = 6)$$
$$\text{Planned Cut Qty} = \text{Lay Plies} \times \text{Total Ratio}$$

### 2. Physical Scrap Weights
- **Cutting Scrap Weight (KG):** Fabric scraps left over after cutting parts from lay piles.
- **Spreading Scrap Weight (KG) / Edge Scrap:** Scrap generated on the margins of the spreading table during laying or end-cutting.
- **Remnants Weight (Issued KG):** Leftover fabric rolls (roll ends) that can be re-entered into inventory or re-utilized.
- **Net Fabric Used (KG):** Actual net fabric weight embedded in the cut garment parts.
$$\text{Net Fabric Used} = \max(0, \text{Fabric Used (KG)} - \text{Remnant Weight (KG)} - \text{Spreading Scrap (KG)})$$

### 3. Fabric Length Calculations
Translates linear marker parameters into cumulative production length:
$$\text{Total Marker Length (Inch)} = \text{Marker Length (Inch)} \times \text{Lay Plies}$$
$$\text{Total Used Fabric (Inch)} = \frac{\text{Total Marker Length (Inch)}}{\text{Marker Efficiency \%}}$$

### 4. Scrap Rates
$$\text{Scrap \% Per Marker} = 100 - \text{Marker Efficiency \%}$$
$$\text{Actual Cutting Scrap \%} = \frac{\text{Cutting Scrap Weight (KG)}}{\text{Fabric Used (KG)}} \times 100 \quad (\text{if Fabric Used} > 0)$$
$$\text{Actual Spreading Scrap \%} = \frac{\text{Spreading Scrap Weight (KG)}}{\text{Fabric Used (KG)}} \times 100 \quad (\text{if Fabric Used} > 0)$$

### 5. Remnant & Re-use Analytics
$$\text{Remnants Issued \%} = \frac{\text{Total Remnants Issued (KG)}}{\text{Total Fabric Used (KG)}} \times 100$$
$$\text{Remnants Re-used (KG)} = \text{Total Remnants Issued (KG)} \times 0.45 \quad (\text{Assumes } 45\% \text{ of issued remnants are reclaimed and re-used})$$
$$\text{Remnants Real Scrap (KG)} = \text{Total Remnants Issued (KG)} - \text{Remnants Re-used (KG)}$$
$$\text{Remnants Scrap \%} = \frac{\text{Remnants Real Scrap (KG)}}{\text{Total Remnants Issued (KG)}} \times 100$$
$$\text{Remnants Utilization \%} = \frac{\text{Remnants Re-used (KG)}}{\text{Total Remnants Issued (KG)}} \times 100$$

### 6. End-to-End (ETE) Physical Efficiency %
Represents the true percentage of raw fabric weight converted into finished cut panels, accounting for both marker voids and cutting scrap:
$$\text{ETE Physical Efficiency \%} = \left( \frac{\text{Net Fabric Used (KG)} - \text{Cutting Scrap Weight (KG)}}{\text{Fabric Used (KG)}} \right) \times 100$$
*(Clamped safely between $0\%$ and $100\%$)*

---

## 5. Database Schema & Row Level Security (RLS)

WavelyCut structures its relations to ensure relational integrity, scalability, and strict tenant security:

### Key Relational Tables:
1. **`profiles`**: Stores platform users, authorization roles (`admin`, `manager`, `supervisor`, `viewer`), and details. Linked via foreign key to Supabase standard auth users.
2. **`machines`**: Holds table configuration, operating status, and identifying labels (e.g., "Spreading Machine A").
3. **`cutting_entries`**: The core table containing primary cutting logs, plies, ratios, and raw weights. All computed metrics are indexed here for performant reporting.
4. **`audit_logs`**: Tracks action parameters (`user_id`, `action_type`, `table_name`, `record_id`, `timestamp`).

```sql
-- DDL Blueprint Example for Cutting Entries
CREATE TABLE cutting_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift VARCHAR(10) NOT NULL CHECK (shift IN ('A', 'B', 'C', 'Day', 'Night')),
    machine_id UUID REFERENCES machines(id) ON DELETE RESTRICT,
    buyer VARCHAR(100) NOT NULL,
    job_no VARCHAR(50) NOT NULL,
    color VARCHAR(50) NOT NULL,
    item VARCHAR(100) NOT NULL,
    cut_no VARCHAR(50) NOT NULL,
    lay_plies INTEGER NOT NULL CHECK (lay_plies > 0),
    size_ratio VARCHAR(50) NOT NULL,
    total_cut_qty INTEGER NOT NULL CHECK (total_cut_qty >= 0),
    table_no VARCHAR(50) NOT NULL,
    fabric_type VARCHAR(100) NOT NULL,
    parts_to_cut TEXT NOT NULL,
    fabric_used_kg NUMERIC(10, 3) NOT NULL CHECK (fabric_used_kg >= 0),
    remnant_weight_kg NUMERIC(10, 3) NOT NULL CHECK (remnant_weight_kg >= 0),
    cutting_scrap_weight_kg NUMERIC(10, 3) NOT NULL CHECK (cutting_scrap_weight_kg >= 0),
    marker_length_inch NUMERIC(10, 3) NOT NULL CHECK (marker_length_inch > 0),
    marker_efficiency_percent NUMERIC(5, 2) NOT NULL CHECK (marker_efficiency_percent BETWEEN 0 AND 100),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approved_by UUID REFERENCES profiles(id),
    created_by UUID REFERENCES profiles(id),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Row Level Security (RLS)
The Postgres tables feature active Row Level Security to isolate data based on user metadata claims:
- **Supervisor Policies:** Restrict insert, update, and read commands exclusively to entries where `created_by` matches the supervisor's authenticated ID. They can only modify entries if `status` is `'Pending'`.
- **Manager Policies:** Grant read-only access to all entries across all active machines. Block write, update, and delete access.
- **Admin Policies:** Override RLS criteria, allowing total administrative control over all records, approvals, machine adjustments, and profile settings.

---

## 6. Codebase & Module Layout

The codebase is engineered to keep visual components, state management, and business logic decoupled:

```
src/
├── App.tsx                        # Main state hub, view routing, user profile handlers
├── types.ts                       # Explicit TypeScript typings and structural definitions
├── main.tsx                       # React application bootstrap
├── index.css                      # Global styling imports and Tailwind CSS variables
│
├── components/                    # Self-contained modular React components
│   ├── Sidebar.tsx                # Interactive lateral panel with responsive states
│   ├── KPICards.tsx               # Quick-glance metric card layouts
│   ├── DashboardCharts.tsx        # Responsive dashboard visual elements (Recharts)
│   ├── DataEntryForm.tsx          # Real-time computed entry creation system
│   ├── DailyReport.tsx            # Corporate Executive daily digest print/export view
│   ├── ReportsModule.tsx          # High-density material ledger & Excel download engine
│   ├── AnalyticsModule.tsx        # Comparative charts, buyer analysis, fabric weight yields
│   └── AdminModule.tsx            # Access controls, machine creator, and system log audits
│
├── utils/
│   └── calculations.ts            # Central mathematical engine (Shared frontend & backend)
│
└── db/
    ├── ddl_strings.ts             # Direct SQL schemas utilized for database initialization
    ├── schema.sql                 # Primary database table definitions (Supabase setup)
    └── rls.sql                    # Row Level Security script policies
```

---

## 7. Getting Started & Local Development

### Prerequisites:
- **Node.js:** v18 or higher.
- **npm:** v9 or higher.

### Step-by-Step Local Setup:

1. **Clone the Repository and Navigate to Root:**
   ```bash
   cd garments-cutting-erp
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Establish Environment Configuration:**
   Create a `.env` file in the project root directory using the parameters outlined in `.env.example`:
   ```env
   # PostgreSQL connection pooled string
   DATABASE_URL=postgresql://postgres:[password]@db.[id].supabase.co:5432/postgres
   # Supabase Access Keys
   SUPABASE_URL=https://[id].supabase.co
   SUPABASE_KEY=[anon-dashboard-key]
   ```

4. **Boot Development Environment:**
   Runs the unified tsx-wrapped Express server on port `3000`:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your web browser to view the application.

5. **Lint and Verify Type Safety:**
   Before staging files or pushing commits, execute standard validation:
   ```bash
   npm run lint
   ```

---

## 8. Production Deployment Strategy

To transition WavelyCut from a local development sandbox to a production-grade enterprise deployment, follow these deployment patterns:

### Frontend & Backend (Vercel Integration)
Since WavelyCut uses an Express + Vite full-stack server setup, deploy it as a unified Vercel Project:
1. Create a Vercel project connected to your GitHub repository.
2. In the Vercel Project Dashboard, navigate to **Settings** -> **Environment Variables** and add `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_KEY`.
3. Vercel utilizes the `vercel.json` file to route all `/api/*` traffic to our Express serverless handler (`server.ts`) while letting static builds serve client assets from `dist/` directly.

### Relational Database & Policies (Supabase Integration)
1. Provision a free-tier database in your **Supabase Dashboard**.
2. Run the SQL script found in `src/db/schema.sql` to generate database tables, schemas, and default machines.
3. Apply the security controls found in `src/db/rls.sql` to establish Role-Level Security (RLS) rules and tie login accounts safely to user profiles.
4. Enable the **Email Auth** provider inside your Supabase project under **Auth** -> **Providers** -> **Email**. You may opt to disable **Confirm Email** to allow rapid testing and login credentials on the shop floor.

---
*Developed as a high-fidelity Garments ERP material utilization system.*
