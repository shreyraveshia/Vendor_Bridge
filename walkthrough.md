# Walkthrough - Layout Refactoring, Dashboard Sourcing & Quotations Implementation

Restructured the application Layout system, implemented a fully-functional React Query-powered Dashboard, built out advanced RFQ detail page and Quotation submission wizard, rewired routes, and cleaned up obsolete folders.

---

## 1. Modular Layout Refactoring

Decomposed the monolithic `Layout.jsx` container into distinct, specialized subcomponents inside [frontend/src/components/layout/](file:///c:/Users/SHREY/Desktop/Vendor_Bridge/frontend/src/components/layout/):

| File | Purpose | Key Features |
|---|---|---|
- **Role Permissions Verification:** Sidebar views, page components, and actions are locked down based on user roles (`admin`, `procurement_officer`, `manager`, `vendor`).
