# High-Performance Architectural & Cost-Optimization Rules

You must strictly adhere to the following senior-level development guidelines to ensure minimal database costs, low operational overhead, and high responsiveness.

## Core Design Principles

1. **Client-Side Calculations**: All math, KPIs, summaries, and aggregations must run in the browser using JavaScript/TypeScript. Do not query PostgreSQL for calculations that can easily be processed locally on already-loaded datasets.
2. **Client-Generated Reports**: Generate all Excel, PDF, CSV, and printable documents directly on the client side using libraries like **SheetJS (xlsx)** and **jsPDF**. Never use server-side routes or Server Actions for report rendering.
3. **Optimized Session Caching**: Cache all fetched data in memory (using React Query or a central state) for the duration of the user's session.
4. **Lazy & Minimal Fetching**: Only select required columns (avoiding `.select("*")`). Reuse cached responses across widgets to avoid multiple repetitive database queries.
5. **Local-First Interactivity**: Implement search, sorting, and filtering entirely in-browser for datasets that have already been loaded locally.

## Architecture Guidelines

- **Database Constraints**: Supabase acts only as a secure, fast data-store and auth mechanism, not as an active processing or computation engine.
- **Client Components Preference**: For highly interactive dashboards, favor client components with responsive in-memory computation rather than server components that query database resources on every state shift.
- **Image Compressions**: All uploaded images must be converted to WebP, compressed client-side, and cached aggressively.
- **Selective Realtime**: Disable Supabase Realtime globally; enable it selectively only where immediate, instantaneous updates are critical (e.g., live production alerts).
