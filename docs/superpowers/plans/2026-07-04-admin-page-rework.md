# Admin Page Rework — Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic `AdminPage.tsx` (1415 lines) with a sidebar-based admin dashboard using separate routes and decomposed components.

**Architecture:** Sidebar admin layout with 6 routes via react-router. Each route renders a dedicated page component. The old `AdminPage.tsx` becomes a redirect to `/admin`. Visual style shifts to clean/professional with more whitespace.

**Tech Stack:** React 19, TypeScript, react-router-dom 7, lucide-react, CSS (existing design system variables)

## Global Constraints

- `role === 'ADMIN'` required for all `/admin/*` routes
- Services (`adminService.ts`, `setoresService.ts`) are NOT modified
- Reuse existing: `ConfirmDialog`, `SearchableSelect`, `EmptyState`, `Toast`
- Theme: light/dark via `stp-theme` localStorage, CSS variables
- Mobile-first: all layouts work at 320px+
- No comments in code unless explicitly requested
- PascalCase for components, camelCase for functions/variables

---

## File Structure

```
src/
  components/
    admin/                    (NEW directory)
      AdminLayout.tsx         — Sidebar + <Outlet/> wrapper
      AdminSidebar.tsx        — Navigation sidebar
      AdminDashboard.tsx      — Dashboard with stat cards
      AdminUsers.tsx          — Users page (state + orchestration)
      AdminSectors.tsx        — Sectors page (state + orchestration)
      AdminFunctions.tsx      — Functions page (state + orchestration)
      AdminSettings.tsx       — Settings page
      AdminHistory.tsx        — History/audit page
      UserForm.tsx            — Create user form (modal)
      UserTable.tsx           — Users list table
      UserEditModal.tsx       — Edit user modal
      UserResetModal.tsx      — Reset password modal
      SectorCard.tsx          — Single sector card
      SectorMembers.tsx       — Members table for a sector
      SectorLinkForm.tsx      — Link member form
      SectorCreateForm.tsx    — Create sector form
      FunctionForm.tsx        — Create function form
      FunctionTable.tsx       — Functions list table
      ConfigCard.tsx          — Single config card with edit
      HistoryTable.tsx        — History table with pagination
      StatCard.tsx            — Dashboard stat card
  pages/
    AdminPage.tsx             — MODIFIED: redirect to /admin
  App.tsx                     — MODIFIED: add admin nested routes
  styles.css                  — MODIFIED: add admin-specific styles
```

---

### Task 1: AdminSidebar Component

**Files:**
- Create: `src/components/admin/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `useLocation()` from react-router, `useAuth()` from AuthContext
- Produces: `<AdminSidebar />` component exported for use in AdminLayout

- [ ] **Step 1: Create the AdminSidebar component**

```tsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Settings,
  ScrollText,
  LogOut,
} from 'lucide-react';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/users', icon: Users, label: 'Usuários' },
  { to: '/admin/sectors', icon: Building2, label: 'Setores' },
  { to: '/admin/functions', icon: Briefcase, label: 'Funções' },
  { to: '/admin/settings', icon: Settings, label: 'Configurações' },
  { to: '/admin/history', icon: ScrollText, label: 'Histórico' },
];

export default function AdminSidebar() {
  const { signOut } = useAuth();

  return (
    <nav className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <span className="admin-sidebar-logo">STP</span>
        <span className="admin-sidebar-title">Admin</span>
      </div>

      <ul className="admin-sidebar-nav">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <button className="admin-sidebar-logout" onClick={signOut}>
        <LogOut size={18} />
        <span>Sair</span>
      </button>
    </nav>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors (or only errors from missing imports we'll create later)

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminSidebar.tsx
git commit -m "feat(admin): add AdminSidebar component"
```

---

### Task 2: AdminLayout Component

**Files:**
- Create: `src/components/admin/AdminLayout.tsx`

**Interfaces:**
- Consumes: `AdminSidebar` (Task 1), `Outlet` from react-router, `useAuth()` for profile
- Produces: `<AdminLayout />` wrapping sidebar + content area

- [ ] **Step 1: Create the AdminLayout component**

```tsx
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (profile?.role !== 'ADMIN') {
    return (
      <div className="admin-denied">
        <h2>Acesso negado</h2>
        <p>Você não tem permissão para acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <button
        className="admin-sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`admin-sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
        <AdminSidebar />
      </div>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminLayout.tsx
git commit -m "feat(admin): add AdminLayout with sidebar toggle"
```

---

### Task 3: Add Admin Routes to App.tsx

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `AdminLayout` (Task 2), page components (Tasks 4-9)
- Produces: Nested routes under `/admin` in the router

- [ ] **Step 1: Add admin routes**

Replace the `ProtectedArea` role-based routing. When `profile.role === 'ADMIN'`, render a nested route structure under `/admin` with `AdminLayout` as the layout route.

The key change in `App.tsx`: replace the single `<AdminPage />` render with a `<Routes>` block that uses `AdminLayout` as a layout route and individual admin pages as child routes.

```tsx
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUsers from './components/admin/AdminUsers';
import AdminSectors from './components/admin/AdminSectors';
import AdminFunctions from './components/admin/AdminFunctions';
import AdminSettings from './components/admin/AdminSettings';
import AdminHistory from './components/admin/AdminHistory';
```

Inside `ProtectedArea`, when `profile.role === 'ADMIN'`:

```tsx
return (
  <Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<AdminDashboard />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="sectors" element={<AdminSectors />} />
      <Route path="functions" element={<AdminFunctions />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="history" element={<AdminHistory />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Route>
  </Routes>
);
```

The root `/` route should redirect ADMIN users to `/admin`:

```tsx
if (profile.role === 'ADMIN') {
  return <Navigate to="/admin" replace />;
}
```

- [ ] **Step 2: Create placeholder components**

Create minimal placeholder files for each admin page so the app compiles:

```tsx
// src/components/admin/AdminDashboard.tsx
export default function AdminDashboard() {
  return <div className="admin-page">Dashboard</div>;
}

// src/components/admin/AdminUsers.tsx
export default function AdminUsers() {
  return <div className="admin-page">Usuários</div>;
}

// src/components/admin/AdminSectors.tsx
export default function AdminSectors() {
  return <div className="admin-page">Setores</div>;
}

// src/components/admin/AdminFunctions.tsx
export default function AdminFunctions() {
  return <div className="admin-page">Funções</div>;
}

// src/components/admin/AdminSettings.tsx
export default function AdminSettings() {
  return <div className="admin-page">Configurações</div>;
}

// src/components/admin/AdminHistory.tsx
export default function AdminHistory() {
  return <div className="admin-page">Histórico</div>;
}
```

- [ ] **Step 3: Verify app compiles and runs**

Run: `npx tsc --noEmit && npm run dev`
Expected: App loads, ADMIN user redirected to `/admin`, sidebar visible, all routes accessible

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/admin/Admin*.tsx
git commit -m "feat(admin): add nested admin routes with AdminLayout"
```

---

### Task 4: Admin CSS Styles

**Files:**
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: CSS variables from existing `:root` (e.g., `--panel-bg`, `--border`, `--primary`)
- Produces: All `.admin-*` classes used by admin components

- [ ] **Step 1: Add admin layout styles**

Append to `styles.css`:

```css
/* ===== ADMIN LAYOUT ===== */
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}

.admin-sidebar-wrapper {
  width: 220px;
  flex-shrink: 0;
  background: var(--panel-bg);
  border-right: 1px solid var(--border);
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
  overflow-y: auto;
}

.admin-main {
  flex: 1;
  margin-left: 220px;
  padding: 24px;
  max-width: 960px;
}

.admin-sidebar-toggle {
  display: none;
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 200;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  color: var(--text);
}

.admin-sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 90;
}

.admin-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  color: var(--text-muted);
}

/* ===== ADMIN SIDEBAR ===== */
.admin-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 0;
}

.admin-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
}

.admin-sidebar-logo {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--primary);
}

.admin-sidebar-title {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.admin-sidebar-nav {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
}

.admin-sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.875rem;
  transition: all 0.15s ease;
  border-left: 3px solid transparent;
}

.admin-sidebar-link:hover {
  color: var(--text);
  background: var(--hover-bg, rgba(0, 0, 0, 0.04));
}

.admin-sidebar-link.active {
  color: var(--primary);
  background: var(--primary-bg, rgba(59, 130, 246, 0.08));
  border-left-color: var(--primary);
  font-weight: 500;
}

.admin-sidebar-logout {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  margin: 8px 8px 0;
  color: var(--text-muted);
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.admin-sidebar-logout:hover {
  color: var(--danger, #ef4444);
  border-color: var(--danger, #ef4444);
}

/* ===== ADMIN PAGES ===== */
.admin-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.admin-page-title {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-page-title svg {
  color: var(--primary);
}

/* ===== STAT CARDS ===== */
.stat-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  text-decoration: none;
  color: var(--text);
  transition: all 0.15s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--primary-bg, rgba(59, 130, 246, 0.1));
  color: var(--primary);
  flex-shrink: 0;
}

.stat-card-icon.alert {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger, #ef4444);
}

.stat-card-value {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.stat-card-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 2px;
}

/* ===== QUICK ACTIONS ===== */
.quick-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.quick-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
}

.quick-action-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* ===== ADMIN TABLES ===== */
.admin-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 2px solid var(--border);
}

.admin-table td {
  padding: 10px 12px;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

.admin-table tr:hover td {
  background: var(--hover-bg, rgba(0, 0, 0, 0.02));
}

.admin-table .td-matricula {
  font-weight: 600;
  font-size: 0.8rem;
  font-family: monospace;
}

.admin-table .td-nome {
  font-weight: 500;
}

.admin-table .td-actions {
  white-space: nowrap;
}

.admin-table .inativo {
  opacity: 0.5;
}

/* ===== ADMIN FILTERS ===== */
.admin-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.admin-filters input,
.admin-filters select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.85rem;
  background: var(--panel-bg);
  color: var(--text);
  outline: none;
  transition: border-color 0.15s ease;
}

.admin-filters input {
  flex: 1;
  min-width: 180px;
}

.admin-filters input:focus,
.admin-filters select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-glow, rgba(59, 130, 246, 0.15));
}

/* ===== ADMIN BADGES ===== */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.badge-admin {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.badge-funcionario {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.badge-gestor {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
}

.badge-membro {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.badge-active {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.badge-inactive {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

/* ===== ADMIN SECTOR CARDS ===== */
.sector-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.sector-card {
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

.sector-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.sector-card-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.sector-card-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.sector-card-actions {
  display: flex;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
}

/* ===== ADMIN CONFIG CARDS ===== */
.config-card {
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 12px;
}

.config-card-title {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.config-card-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.config-card-edit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-card-edit input {
  width: 100px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.85rem;
  background: var(--bg);
  color: var(--text);
}

.config-card-edit input:focus {
  border-color: var(--primary);
  outline: none;
}

.config-card-timestamp {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 8px;
}

/* ===== ADMIN BUTTONS ===== */
.admin-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.admin-btn-primary {
  background: var(--primary);
  color: white;
}

.admin-btn-primary:hover {
  opacity: 0.9;
}

.admin-btn-ghost {
  background: none;
  border-color: var(--border);
  color: var(--text);
}

.admin-btn-ghost:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.admin-btn-danger {
  background: none;
  border-color: var(--danger, #ef4444);
  color: var(--danger, #ef4444);
}

.admin-btn-danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.admin-btn-icon {
  padding: 6px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.admin-btn-icon:hover {
  color: var(--text);
  background: var(--hover-bg, rgba(0, 0, 0, 0.04));
}

/* ===== ADMIN FORMS ===== */
.admin-form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.admin-form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-form-group.full-width {
  grid-column: 1 / -1;
}

.admin-form-group label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
}

.admin-form-group input,
.admin-form-group select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.85rem;
  background: var(--bg);
  color: var(--text);
  outline: none;
}

.admin-form-group input:focus,
.admin-form-group select:focus {
  border-color: var(--primary);
}

/* ===== ADMIN PAGINATION ===== */
.admin-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.admin-pagination buttons {
  display: flex;
  gap: 6px;
}

/* ===== MODAL (reuses existing pattern) ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-title {
  font-family: var(--font-heading);
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

/* ===== SKELETON LOADING ===== */
.skeleton {
  background: linear-gradient(90deg, var(--border) 25%, var(--hover-bg, rgba(0,0,0,0.04)) 50%, var(--border) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: 6px;
}

@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-row {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.skeleton-cell {
  height: 14px;
}

/* ===== MOBILE RESPONSIVE ===== */
@media (max-width: 767px) {
  .admin-sidebar-wrapper {
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .admin-sidebar-wrapper.open {
    transform: translateX(0);
  }

  .admin-sidebar-toggle {
    display: flex;
  }

  .admin-sidebar-overlay {
    display: block;
  }

  .admin-main {
    margin-left: 0;
    padding: 16px;
    padding-top: 56px;
  }

  .stat-cards-grid {
    grid-template-columns: 1fr;
  }

  .sector-cards-grid {
    grid-template-columns: 1fr;
  }

  .admin-form-grid {
    grid-template-columns: 1fr;
  }

  .admin-table {
    display: block;
  }

  .admin-table thead {
    display: none;
  }

  .admin-table tbody {
    display: block;
  }

  .admin-table tr {
    display: block;
    padding: 12px;
    margin-bottom: 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
  }

  .admin-table td {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: none;
  }

  .admin-table td::before {
    content: attr(data-label);
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--text-muted);
  }
}

@media (max-width: 639px) {
  .admin-page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .quick-actions {
    flex-direction: column;
  }
}
```

- [ ] **Step 2: Verify styles compile**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat(admin): add admin layout and component styles"
```

---

### Task 5: StatCard Component

**Files:**
- Create: `src/components/admin/StatCard.tsx`

**Interfaces:**
- Consumes: lucide-react icons
- Produces: `<StatCard />` for dashboard

- [ ] **Step 1: Create the StatCard component**

```tsx
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  href?: string;
  alert?: boolean;
}

export default function StatCard({ icon: Icon, label, value, href, alert }: StatCardProps) {
  const content = (
    <div className={`stat-card ${alert ? 'stat-card-alert' : ''}`}>
      <div className={`stat-card-icon ${alert ? 'alert' : ''}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-label">{label}</div>
      </div>
    </div>
  );

  return href ? <Link to={href}>{content}</Link> : content;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/StatCard.tsx
git commit -m "feat(admin): add StatCard component"
```

---

### Task 6: AdminDashboard Page

**Files:**
- Modify: `src/components/admin/AdminDashboard.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `adminService.listarUsuarios`, `setoresService.listarSetores`, `adminService.listarConfiguracoes`, `adminService.listarFuncoes`, `adminService.listarHistoricoAdmin`, `StatCard` (Task 5)
- Produces: Full dashboard page with stat cards and quick actions

- [ ] **Step 1: Implement AdminDashboard**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Building2, FileText, Briefcase, AlertTriangle, Settings, Plus } from 'lucide-react';
import { listarUsuarios } from '../../services/adminService';
import { listarSetores } from '../../services/setoresService';
import { listarConfiguracoes, listarFuncoes, listarHistoricoAdmin } from '../../services/adminService';
import StatCard from './StatCard';

export default function AdminDashboard() {
  const [userCount, setUserCount] = useState(0);
  const [sectorCount, setSectorCount] = useState(0);
  const [sectorsWithoutManager, setSectorsWithoutManager] = useState(0);
  const [functionCount, setFunctionCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState('5');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [users, setores, configs, funcoes, historico] = await Promise.all([
          listarUsuarios(),
          listarSetores(),
          listarConfiguracoes(),
          listarFuncoes(),
          listarHistoricoAdmin(1, 1),
        ]);

        setUserCount(users.filter((u) => u.ativo).length);
        setSectorCount(setores.filter((s) => s.ativo).length);
        setSectorsWithoutManager(setores.filter((s) => s.ativo && !s.gestor).length);
        setFunctionCount(funcoes.filter((f) => f.ativo).length);
        setRequestCount(historico.pagination?.total ?? 0);

        const limiteConfig = configs.find((c) => c.chave === 'limite_solicitacoes_mensal');
        if (limiteConfig) setMonthlyLimit(limiteConfig.valor);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <h1 className="admin-page-title">
            <Users size={24} /> Dashboard
          </h1>
        </div>
        <div className="stat-cards-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="stat-card">
              <div className="skeleton skeleton-cell" style={{ width: 44, height: 44 }} />
              <div>
                <div className="skeleton skeleton-cell" style={{ width: 40, height: 20 }} />
                <div className="skeleton skeleton-cell" style={{ width: 80, height: 12, marginTop: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <Users size={24} /> Dashboard
        </h1>
      </div>

      <div className="stat-cards-grid">
        <StatCard icon={Users} label="Usuários Ativos" value={userCount} href="/admin/users" />
        <StatCard icon={Building2} label="Setores Ativos" value={sectorCount} href="/admin/sectors" />
        <StatCard icon={FileText} label="Solicitações no Mês" value={requestCount} href="/admin/history" />
        <StatCard icon={Briefcase} label="Funções Ativas" value={functionCount} href="/admin/functions" />
        <StatCard
          icon={AlertTriangle}
          label="Setores sem Gestor"
          value={sectorsWithoutManager}
          href="/admin/sectors"
          alert={sectorsWithoutManager > 0}
        />
        <StatCard icon={Settings} label="Limite Mensal" value={monthlyLimit} href="/admin/settings" />
      </div>

      <div className="quick-actions">
        <Link to="/admin/users" className="quick-action-btn">
          <Plus size={16} /> Novo Usuário
        </Link>
        <Link to="/admin/sectors" className="quick-action-btn">
          <Plus size={16} /> Novo Setor
        </Link>
        <Link to="/admin/sectors" className="quick-action-btn">
          <Plus size={16} /> Vincular Membro
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles and renders**

Run: `npx tsc --noEmit && npm run dev`
Expected: Dashboard loads with stat cards, clicking cards navigates to correct routes

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminDashboard.tsx
git commit -m "feat(admin): implement AdminDashboard with stat cards"
```

---

### Task 7: UserForm and UserEditModal and UserResetModal

**Files:**
- Create: `src/components/admin/UserForm.tsx`
- Create: `src/components/admin/UserEditModal.tsx`
- Create: `src/components/admin/UserResetModal.tsx`

**Interfaces:**
- Consumes: `setoresService.listarSetores`, `adminService.listarFuncoes`, `adminService.editarUsuario`, `adminService.resetarSenha`, `Toast`
- Produces: `<UserForm />`, `<UserEditModal />`, `<UserResetModal />`

- [ ] **Step 1: Create UserForm**

```tsx
import { useState, useEffect } from 'react';
import { listarSetores } from '../../services/setoresService';
import { listarFuncoes } from '../../services/adminService';
import { createUser } from '../../services/adminService';
import type { SetorListItem, TipoFuncao } from '../../lib/types';
import { addToast } from '../Toast';

interface UserFormProps {
  onCreated: () => void;
}

export default function UserForm({ onCreated }: UserFormProps) {
  const [matricula, setMatricula] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'FUNCIONARIO' | 'ADMIN'>('FUNCIONARIO');
  const [setorId, setSetorId] = useState<number | ''>('');
  const [roleSetor, setRoleSetor] = useState<'MEMBRO' | 'GESTOR'>('MEMBRO');
  const [funcao, setFuncao] = useState('');
  const [setores, setSetores] = useState<SetorListItem[]>([]);
  const [funcoes, setFuncoes] = useState<TipoFuncao[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([listarSetores(), listarFuncoes()]).then(([s, f]) => {
      setSetores(s.filter((s) => s.ativo));
      setFuncoes(f.filter((f) => f.ativo));
    });
  }, []);

  function validate(): boolean {
    if (matricula.length < 4 || matricula.length > 12) {
      addToast({ text: 'Matrícula deve ter 4-12 caracteres', error: true });
      return false;
    }
    if (nomeCompleto.length < 10 || nomeCompleto.length > 64) {
      addToast({ text: 'Nome deve ter 10-64 caracteres', error: true });
      return false;
    }
    if (password.length < 6) {
      addToast({ text: 'Senha deve ter no mínimo 6 caracteres', error: true });
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await createUser({
        matricula,
        nome_completo: nomeCompleto,
        password,
        role,
        setor_id: setorId !== '' ? Number(setorId) : undefined,
        role_setor: setorId !== '' ? roleSetor : undefined,
        funcao: setorId !== '' && funcao ? funcao : undefined,
      });
      addToast({ text: 'Usuário criado com sucesso' });
      setMatricula('');
      setNomeCompleto('');
      setPassword('');
      setRole('FUNCIONARIO');
      setSetorId('');
      setRoleSetor('MEMBRO');
      setFuncao('');
      onCreated();
    } catch (err: any) {
      addToast({ text: err.message || 'Erro ao criar usuário', error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form-grid">
      <div className="admin-form-group">
        <label>Matrícula</label>
        <input
          value={matricula}
          onChange={(e) => setMatricula(e.target.value.toUpperCase())}
          placeholder="MAT001"
          maxLength={12}
        />
      </div>
      <div className="admin-form-group">
        <label>Nome Completo</label>
        <input
          value={nomeCompleto}
          onChange={(e) => setNomeCompleto(e.target.value)}
          placeholder="Nome completo"
          maxLength={64}
        />
      </div>
      <div className="admin-form-group">
        <label>Senha Inicial</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      <div className="admin-form-group">
        <label>Perfil</label>
        <select value={role} onChange={(e) => setRole(e.target.value as 'FUNCIONARIO' | 'ADMIN')}>
          <option value="FUNCIONARIO">Funcionário</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>
      {role === 'FUNCIONARIO' && (
        <>
          <div className="admin-form-group">
            <label>Setor</label>
            <select value={setorId} onChange={(e) => setSetorId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Nenhum</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          {setorId !== '' && (
            <>
              <div className="admin-form-group">
                <label>Papel no Setor</label>
                <select value={roleSetor} onChange={(e) => setRoleSetor(e.target.value as 'MEMBRO' | 'GESTOR')}>
                  <option value="MEMBRO">Membro</option>
                  <option value="GESTOR">Gestor</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label>Função</label>
                <select value={funcao} onChange={(e) => setFuncao(e.target.value)}>
                  <option value="">Nenhuma</option>
                  {funcoes.map((f) => (
                    <option key={f.codigo} value={f.codigo}>{f.codigo} — {f.descricao}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </>
      )}
      <div className="admin-form-group full-width">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
          {loading ? 'Criando...' : 'Criar Usuário'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create UserEditModal**

```tsx
import { useState } from 'react';
import { editarUsuario } from '../../services/adminService';
import { addToast } from '../Toast';
import type { AdminUsuario } from '../../lib/types';

interface UserEditModalProps {
  user: AdminUsuario;
  onClose: () => void;
  onSaved: () => void;
}

export default function UserEditModal({ user, onClose, onSaved }: UserEditModalProps) {
  const [nome, setNome] = useState(user.nome_completo);
  const [matricula, setMatricula] = useState(user.matricula);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nome.length < 10 || nome.length > 64) {
      addToast({ text: 'Nome deve ter 10-64 caracteres', error: true });
      return;
    }
    if (matricula.length < 4 || matricula.length > 12) {
      addToast({ text: 'Matrícula deve ter 4-12 caracteres', error: true });
      return;
    }

    setLoading(true);
    try {
      await editarUsuario({ profile_id: user.id, nome_completo: nome, matricula });
      addToast({ text: 'Usuário atualizado' });
      onSaved();
    } catch (err: any) {
      addToast({ text: err.message || 'Erro ao editar', error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Editar Usuário</h3>
        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            <div className="admin-form-group">
              <label>Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={64} />
            </div>
            <div className="admin-form-group">
              <label>Matrícula</label>
              <input
                value={matricula}
                onChange={(e) => setMatricula(e.target.value.toUpperCase())}
                maxLength={12}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create UserResetModal**

```tsx
import { useState } from 'react';
import { resetarSenha } from '../../services/adminService';
import { addToast } from '../Toast';

interface UserResetModalProps {
  profileId: string;
  userName: string;
  onClose: () => void;
}

export default function UserResetModal({ profileId, userName, onClose }: UserResetModalProps) {
  const [novaSenha, setNovaSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (novaSenha.length < 6) {
      addToast({ text: 'Senha deve ter no mínimo 6 caracteres', error: true });
      return;
    }

    setLoading(true);
    try {
      await resetarSenha({ profile_id: profileId, nova_senha: novaSenha });
      addToast({ text: `Senha de ${userName} resetada com sucesso` });
      onClose();
    } catch (err: any) {
      addToast({ text: err.message || 'Erro ao resetar senha', error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Resetar Senha — {userName}</h3>
        <form onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label>Nova Senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
              {loading ? 'Resetando...' : 'Resetar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/UserForm.tsx src/components/admin/UserEditModal.tsx src/components/admin/UserResetModal.tsx
git commit -m "feat(admin): add UserForm, UserEditModal, UserResetModal"
```

---

### Task 8: UserTable and AdminUsers Page

**Files:**
- Create: `src/components/admin/UserTable.tsx`
- Modify: `src/components/admin/AdminUsers.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `adminService.listarUsuarios`, `adminService.desativarUsuario`, `UserForm` (Task 7), `UserEditModal` (Task 7), `UserResetModal` (Task 7), `ConfirmDialog`, `Toast`
- Produces: Full users page with table, filters, create/edit/reset functionality

- [ ] **Step 1: Create UserTable**

```tsx
import { Shield, ShieldOff, Lock, Pencil } from 'lucide-react';
import type { AdminUsuario } from '../../lib/types';

interface UserTableProps {
  users: AdminUsuario[];
  currentUserId?: string;
  onEdit: (user: AdminUsuario) => void;
  onResetPassword: (user: AdminUsuario) => void;
  onToggleActive: (user: AdminUsuario) => void;
}

export default function UserTable({ users, currentUserId, onEdit, onResetPassword, onToggleActive }: UserTableProps) {
  if (users.length === 0) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>Nenhum usuário encontrado.</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Matrícula</th>
          <th>Nome</th>
          <th>Perfil</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} className={u.ativo ? '' : 'inativo'}>
            <td className="td-matricula" data-label="Matrícula">{u.matricula}</td>
            <td className="td-nome" data-label="Nome">{u.nome_completo}</td>
            <td data-label="Perfil">
              <span className={`badge ${u.role === 'ADMIN' ? 'badge-admin' : 'badge-funcionario'}`}>
                {u.role}
              </span>
            </td>
            <td data-label="Status">
              <span className={`badge ${u.ativo ? 'badge-active' : 'badge-inactive'}`}>
                {u.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </td>
            <td className="td-actions" data-label="Ações">
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="admin-btn-icon" title="Editar" onClick={() => onEdit(u)}>
                  <Pencil size={15} />
                </button>
                <button className="admin-btn-icon" title="Resetar senha" onClick={() => onResetPassword(u)}>
                  <Lock size={15} />
                </button>
                {u.id !== currentUserId && (
                  <button
                    className="admin-btn-icon"
                    title={u.ativo ? 'Desativar' : 'Ativar'}
                    onClick={() => onToggleActive(u)}
                  >
                    {u.ativo ? <ShieldOff size={15} /> : <Shield size={15} />}
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Implement AdminUsers page**

```tsx
import { useEffect, useState, useMemo } from 'react';
import { Users, Plus } from 'lucide-react';
import { listarUsuarios, desativarUsuario } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import type { AdminUsuario } from '../../lib/types';
import { addToast } from '../Toast';
import ConfirmDialog from '../ConfirmDialog';
import UserForm from './UserForm';
import UserTable from './UserTable';
import UserEditModal from './UserEditModal';
import UserResetModal from './UserResetModal';

export default function AdminUsers() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editTarget, setEditTarget] = useState<AdminUsuario | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUsuario | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUsuario | null>(null);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await listarUsuarios();
      setUsers(data);
    } catch {
      addToast({ text: 'Erro ao carregar usuários', error: true });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!u.nome_completo.toLowerCase().includes(term) && !u.matricula.toLowerCase().includes(term)) return false;
      }
      if (roleFilter && u.role !== roleFilter) return false;
      if (statusFilter === 'true' && !u.ativo) return false;
      if (statusFilter === 'false' && u.ativo) return false;
      return true;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  async function handleToggleActive(user: AdminUsuario) {
    try {
      const result = await desativarUsuario(user.id);
      if (result.aviso) {
        addToast({ text: result.aviso, error: true });
      } else {
        addToast({ text: user.ativo ? 'Usuário desativado' : 'Usuário ativado' });
      }
      loadUsers();
    } catch (err: any) {
      addToast({ text: err.message || 'Erro ao alterar status', error: true });
    }
    setDeactivateTarget(null);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <Users size={24} /> Usuários
        </h1>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 24, padding: 16, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <UserForm onCreated={() => { loadUsers(); setShowForm(false); }} />
        </div>
      )}

      <div className="admin-filters">
        <input
          placeholder="Buscar por nome ou matrícula..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Todos os perfis</option>
          <option value="ADMIN">Admin</option>
          <option value="FUNCIONARIO">Funcionário</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </div>

      {loading ? (
        <div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-row">
              <div className="skeleton skeleton-cell" style={{ width: 80 }} />
              <div className="skeleton skeleton-cell" style={{ flex: 1 }} />
              <div className="skeleton skeleton-cell" style={{ width: 60 }} />
            </div>
          ))}
        </div>
      ) : (
        <UserTable
          users={filtered}
          currentUserId={profile?.id}
          onEdit={setEditTarget}
          onResetPassword={setResetTarget}
          onToggleActive={(u) => u.ativo ? setDeactivateTarget(u) : handleToggleActive(u)}
        />
      )}

      {editTarget && (
        <UserEditModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { loadUsers(); setEditTarget(null); }} />
      )}

      {resetTarget && (
        <UserResetModal profileId={resetTarget.id} userName={resetTarget.nome_completo} onClose={() => setResetTarget(null)} />
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Desativar Usuário"
        message={`Tem certeza que deseja desativar ${deactivateTarget?.nome_completo}?`}
        confirmLabel="Desativar"
        confirmClass="danger"
        onConfirm={() => deactivateTarget && handleToggleActive(deactivateTarget)}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify it works**

Run: `npm run dev`
Expected: Users page loads, table renders, filters work, create/edit/reset modals function

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/UserTable.tsx src/components/admin/AdminUsers.tsx
git commit -m "feat(admin): implement AdminUsers with table, filters, CRUD"
```

---

### Task 9: SectorCard, SectorMembers, SectorLinkForm, SectorCreateForm, AdminSectors

**Files:**
- Create: `src/components/admin/SectorCard.tsx`
- Create: `src/components/admin/SectorMembers.tsx`
- Create: `src/components/admin/SectorLinkForm.tsx`
- Create: `src/components/admin/SectorCreateForm.tsx`
- Modify: `src/components/admin/AdminSectors.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `setoresService.*`, `adminService.listarFuncoes`, `ConfirmDialog`, `Toast`
- Produces: Full sectors page with create, link, cards, members

- [ ] **Step 1: Create SectorCreateForm**

```tsx
import { useState } from 'react';
import { criarSetor } from '../../services/setoresService';
import { addToast } from '../Toast';

interface SectorCreateFormProps {
  onCreated: () => void;
}

export default function SectorCreateForm({ onCreated }: SectorCreateFormProps) {
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      addToast({ text: 'Nome do setor é obrigatório', error: true });
      return;
    }

    setLoading(true);
    try {
      await criarSetor(nome.trim());
      addToast({ text: 'Setor criado com sucesso' });
      setNome('');
      onCreated();
    } catch (err: any) {
      addToast({ text: err.message || 'Erro ao criar setor', error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <div className="admin-form-group" style={{ flex: 1 }}>
        <label>Nome do Setor</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: UTI" maxLength={64} />
      </div>
      <button type="submit" className="admin-btn admin-btn-primary" disabled={loading} style={{ height: 36 }}>
        {loading ? 'Criando...' : 'Criar'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create SectorLinkForm**

```tsx
import { useState, useEffect } from 'react';
import { vincularMembro } from '../../services/setoresService';
import { listarUsuarios, listarFuncoes } from '../../services/adminService';
import { addToast } from '../Toast';
import type { AdminUsuario, TipoFuncao } from '../../lib/types';

interface SectorLinkFormProps {
  setores: { id: number; nome: string }[];
  onLinked: () => void;
}

export default function SectorLinkForm({ setores, onLinked }: SectorLinkFormProps) {
  const [setorId, setSetorId] = useState<number | ''>('');
  const [profileId, setProfileId] = useState('');
  const [roleSetor, setRoleSetor] = useState<'MEMBRO' | 'GESTOR'>('MEMBRO');
  const [funcao, setFuncao] = useState('');
  const [usuarios, setUsuarios] = useState<AdminUsuario[]>([]);
  const [funcoes, setFuncoes] = useState<TipoFuncao[]>([]);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    Promise.all([listarUsuarios(), listarFuncoes()]).then(([u, f]) => {
      setUsuarios(u.filter((u) => u.ativo));
      setFuncoes(f.filter((f) => f.ativo));
    });
  }, []);

  const filteredUsers = usuarios.filter((u) => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return u.nome_completo.toLowerCase().includes(term) || u.matricula.toLowerCase().includes(term);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!setorId || !profileId) {
      addToast({ text: 'Selecione setor e usuário', error: true });
      return;
    }

    setLoading(true);
    try {
      await vincularMembro({
        profile_id: profileId,
        setor_id: Number(setorId),
        role_setor: roleSetor,
        funcao: funcao || undefined,
      });
      addToast({ text: 'Membro vinculado com sucesso' });
      setProfileId('');
      setUserSearch('');
      onLinked();
    } catch (err: any) {
      addToast({ text: err.message || 'Erro ao vincular', error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form-grid">
      <div className="admin-form-group">
        <label>Setor</label>
        <select value={setorId} onChange={(e) => setSetorId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">Selecione...</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </select>
      </div>
      <div className="admin-form-group">
        <label>Usuário</label>
        <input
          placeholder="Buscar por nome ou matrícula..."
          value={userSearch}
          onChange={(e) => { setUserSearch(e.target.value); setProfileId(''); }}
        />
        {userSearch && !profileId && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 150, overflow: 'auto', marginTop: 4 }}>
            {filteredUsers.slice(0, 10).map((u) => (
              <div
                key={u.id}
                style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.85rem' }}
                onClick={() => { setProfileId(u.id); setUserSearch(`${u.matricula} — ${u.nome_completo}`); }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '')}
              >
                {u.matricula} — {u.nome_completo}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="admin-form-group">
        <label>Papel no Setor</label>
        <select value={roleSetor} onChange={(e) => setRoleSetor(e.target.value as 'MEMBRO' | 'GESTOR')}>
          <option value="MEMBRO">Membro</option>
          <option value="GESTOR">Gestor</option>
        </select>
      </div>
      <div className="admin-form-group">
        <label>Função</label>
        <select value={funcao} onChange={(e) => setFuncao(e.target.value)}>
          <option value="">Nenhuma</option>
          {funcoes.map((f) => (
            <option key={f.codigo} value={f.codigo}>{f.codigo} — {f.descricao}</option>
          ))}
        </select>
      </div>
      <div className="admin-form-group full-width">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
          {loading ? 'Vinculando...' : 'Vincular Membro'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create SectorCard**

```tsx
import { Pencil, Trash2, Users } from 'lucide-react';
import type { SetorListItem } from '../../lib/types';

interface SectorCardProps {
  setor: SetorListItem;
  isSelected: boolean;
  onEdit: (setor: SetorListItem) => void;
  onToggleActive: (setor: SetorListItem) => void;
  onViewMembers: (setorId: number) => void;
}

export default function SectorCard({ setor, isSelected, onEdit, onToggleActive, onViewMembers }: SectorCardProps) {
  return (
    <div
      className="sector-card"
      style={isSelected ? { borderColor: 'var(--primary)' } : undefined}
    >
      <div className="sector-card-header">
        <span className="sector-card-name">{setor.nome}</span>
        <span className={`badge ${setor.ativo ? 'badge-active' : 'badge-inactive'}`}>
          {setor.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </div>
      <div className="sector-card-meta">
        <div>Gestor: {setor.gestor ? setor.gestor.nome_completo : <em style={{ color: 'var(--danger, #ef4444)' }}>Sem gestor</em>}</div>
        <div>Membros: {setor.total_membros}</div>
      </div>
      <div className="sector-card-actions">
        <button className="admin-btn-icon" title="Ver membros" onClick={() => onViewMembers(setor.id)}>
          <Users size={15} />
        </button>
        <button className="admin-btn-icon" title="Editar" onClick={() => onEdit(setor)}>
          <Pencil size={15} />
        </button>
        <button className="admin-btn-icon" title={setor.ativo ? 'Desativar' : 'Reativar'} onClick={() => onToggleActive(setor)}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create SectorMembers**

```tsx
import type { MembroSetor } from '../../lib/types';

interface SectorMembersProps {
  members: MembroSetor[];
  onDeactivate: (profileId: string, setorId: number) => void;
}

export default function SectorMembers({ members, onDeactivate }: SectorMembersProps) {
  if (members.length === 0) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Nenhum membro neste setor.</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Matrícula</th>
          <th>Papel</th>
          <th>Função</th>
          <th>Status</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.profile_id} className={m.ativo ? '' : 'inativo'}>
            <td className="td-nome" data-label="Nome">{m.nome_completo}</td>
            <td className="td-matricula" data-label="Matrícula">{m.matricula}</td>
            <td data-label="Papel">
              <span className={`badge ${m.role_setor === 'GESTOR' ? 'badge-gestor' : 'badge-membro'}`}>
                {m.role_setor}
              </span>
            </td>
            <td data-label="Função">{m.funcao || '—'}</td>
            <td data-label="Status">
              <span className={`badge ${m.ativo ? 'badge-active' : 'badge-inactive'}`}>
                {m.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </td>
            <td data-label="Ação">
              {m.ativo && (
                <button
                  className="admin-btn admin-btn-danger"
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  onClick={() => onDeactivate(m.profile_id, m.setor_id)}
                >
                  Desativar vínculo
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 5: Implement AdminSectors page**

```tsx
import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { listarSetores, desativarSetor, reativarSetor, editarSetor, desativarMembro, listarMembrosSetor } from '../../services/setoresService';
import type { SetorListItem, MembroSetor } from '../../lib/types';
import { addToast } from '../Toast';
import ConfirmDialog from '../ConfirmDialog';
import SectorCreateForm from './SectorCreateForm';
import SectorLinkForm from './SectorLinkForm';
import SectorCard from './SectorCard';
import SectorMembers from './SectorMembers';

export default function AdminSectors() {
  const [setores, setSetores] = useState<SetorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSetorId, setSelectedSetorId] = useState<number | null>(null);
  const [membros, setMembros] = useState<MembroSetor[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<SetorListItem | null>(null);
  const [editTarget, setEditTarget] = useState<SetorListItem | null>(null);
  const [editNome, setEditNome] = useState('');
  const [deactivateMemberTarget, setDeactivateMemberTarget] = useState<{ profileId: string; setorId: number } | null>(null);

  async function loadSetores() {
    setLoading(true);
    try {
      const data = await listarSetores();
      setSetores(data);
    } catch {
      addToast({ text: 'Erro ao carregar setores', error: true });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSetores(); }, []);

  async function loadMembers(setorId: number) {
    setSelectedSetorId(setorId);
    setLoadingMembers(true);
    try {
      const data = await listarMembrosSetor(setorId);
      setMembros(data);
    } catch {
      addToast({ text: 'Erro ao carregar membros', error: true });
      setMembros([]);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function handleToggleActive(setor: SetorListItem) {
    try {
      if (setor.ativo) {
        await desativarSetor(setor.id);
        addToast({ text: `${setor.nome} desativado` });
      } else {
        await reativarSetor(setor.id);
        addToast({ text: `${setor.nome} reativado` });
      }
      loadSetores();
    } catch (err: any) {
      addToast({ text: err.message || 'Erro', error: true });
    }
    setDeactivateTarget(null);
  }

  async function handleEditSave() {
    if (!editTarget || !editNome.trim()) return;
    try {
      await editarSetor(editTarget.id, editNome.trim());
      addToast({ text: 'Setor atualizado' });
      setEditTarget(null);
      loadSetores();
    } catch (err: any) {
      addToast({ text: err.message || 'Erro ao editar', error: true });
    }
  }

  async function handleDeactivateMember() {
    if (!deactivateMemberTarget) return;
    try {
      await desativarMembro(deactivateMemberTarget.profileId, deactivateMemberTarget.setorId);
      addToast({ text: 'Vínculo desativado' });
      loadMembers(deactivateMemberTarget.setorId);
    } catch (err: any) {
      addToast({ text: err.message || 'Erro', error: true });
    }
    setDeactivateMemberTarget(null);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <Building2 size={24} /> Setores
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ padding: 16, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Criar Setor</h3>
          <SectorCreateForm onCreated={loadSetores} />
        </div>
        <div style={{ padding: 16, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Vincular Membro</h3>
          <SectorLinkForm setores={setores.filter((s) => s.ativo)} onLinked={() => { if (selectedSetorId) loadMembers(selectedSetorId); }} />
        </div>
      </div>

      {loading ? (
        <div className="sector-cards-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="sector-card">
              <div className="skeleton skeleton-cell" style={{ width: 120, height: 18 }} />
              <div className="skeleton skeleton-cell" style={{ width: 80, height: 12, marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="sector-cards-grid">
          {setores.map((s) => (
            <SectorCard
              key={s.id}
              setor={s}
              isSelected={selectedSetorId === s.id}
              onEdit={(s) => { setEditTarget(s); setEditNome(s.nome); }}
              onToggleActive={(s) => s.ativo ? setDeactivateTarget(s) : handleToggleActive(s)}
              onViewMembers={loadMembers}
            />
          ))}
        </div>
      )}

      {selectedSetorId && (
        <div style={{ marginTop: 24, padding: 16, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>
            Membros — {setores.find((s) => s.id === selectedSetorId)?.nome}
          </h3>
          {loadingMembers ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando...</p>
          ) : (
            <SectorMembers members={membros} onDeactivate={(pid, sid) => setDeactivateMemberTarget({ profileId: pid, setorId: sid })} />
          )}
        </div>
      )}

      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Editar Setor</h3>
            <div className="admin-form-group">
              <label>Nome</label>
              <input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="admin-btn admin-btn-ghost" onClick={() => setEditTarget(null)}>Cancelar</button>
              <button className="admin-btn admin-btn-primary" onClick={handleEditSave}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        title={deactivateTarget?.ativo ? 'Desativar Setor' : 'Reativar Setor'}
        message={deactivateTarget?.ativo ? `Desativar ${deactivateTarget?.nome}? Todos os vínculos serão desativados.` : `Reativar ${deactivateTarget?.nome}?`}
        confirmLabel={deactivateTarget?.ativo ? 'Desativar' : 'Reativar'}
        confirmClass={deactivateTarget?.ativo ? 'danger' : 'success'}
        onConfirm={() => deactivateTarget && handleToggleActive(deactivateTarget)}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={!!deactivateMemberTarget}
        title="Desativar Vínculo"
        message="Tem certeza que deseja desativar este vínculo?"
        confirmLabel="Desativar"
        confirmClass="danger"
        onConfirm={handleDeactivateMember}
        onCancel={() => setDeactivateMemberTarget(null)}
      />
    </div>
  );
}
```

- [ ] **Step 6: Verify it works**

Run: `npm run dev`
Expected: Sectors page loads, cards display, create/link forms work, members expand on click

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/Sector*.tsx src/components/admin/AdminSectors.tsx
git commit -m "feat(admin): implement AdminSectors with cards, members, CRUD"
```

---

### Task 10: FunctionForm, FunctionTable, AdminFunctions

**Files:**
- Create: `src/components/admin/FunctionForm.tsx`
- Create: `src/components/admin/FunctionTable.tsx`
- Modify: `src/components/admin/AdminFunctions.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `adminService.criarFuncao`, `adminService.listarFuncoes`, `adminService.desativarFuncao`, `Toast`
- Produces: Full functions page

- [ ] **Step 1: Create FunctionForm**

```tsx
import { useState } from 'react';
import { criarFuncao } from '../../services/adminService';
import { addToast } from '../Toast';

interface FunctionFormProps {
  onCreated: () => void;
}

export default function FunctionForm({ onCreated }: FunctionFormProps) {
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo.trim() || !descricao.trim()) {
      addToast({ text: 'Código e descrição são obrigatórios', error: true });
      return;
    }

    setLoading(true);
    try {
      await criarFuncao({ codigo: codigo.trim(), descricao: descricao.trim() });
      addToast({ text: 'Função criada com sucesso' });
      setCodigo('');
      setDescricao('');
      onCreated();
    } catch (err: any) {
      addToast({ text: err.message || 'Erro ao criar função', error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form-grid">
      <div className="admin-form-group">
        <label>Código</label>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Ex: ENFA"
          maxLength={10}
        />
      </div>
      <div className="admin-form-group">
        <label>Descrição</label>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Enfermeiro(a)"
          maxLength={64}
        />
      </div>
      <div className="admin-form-group full-width">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
          {loading ? 'Criando...' : 'Criar Função'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create FunctionTable**

```tsx
import { Trash2 } from 'lucide-react';
import type { TipoFuncao } from '../../lib/types';

interface FunctionTableProps {
  funcoes: TipoFuncao[];
  onDeactivate: (codigo: string) => void;
}

export default function FunctionTable({ funcoes, onDeactivate }: FunctionTableProps) {
  if (funcoes.length === 0) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Nenhuma função cadastrada.</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Descrição</th>
          <th>Status</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>
        {funcoes.map((f) => (
          <tr key={f.codigo} className={f.ativo ? '' : 'inativo'}>
            <td className="td-matricula" data-label="Código">{f.codigo}</td>
            <td className="td-nome" data-label="Descrição">{f.descricao}</td>
            <td data-label="Status">
              <span className={`badge ${f.ativo ? 'badge-active' : 'badge-inactive'}`}>
                {f.ativo ? 'Ativa' : 'Inativa'}
              </span>
            </td>
            <td data-label="Ação">
              {f.ativo && (
                <button className="admin-btn-icon" title="Desativar" onClick={() => onDeactivate(f.codigo)}>
                  <Trash2 size={15} />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Implement AdminFunctions page**

```tsx
import { useEffect, useState } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import { listarFuncoes, desativarFuncao } from '../../services/adminService';
import type { TipoFuncao } from '../../lib/types';
import { addToast } from '../Toast';
import ConfirmDialog from '../ConfirmDialog';
import FunctionForm from './FunctionForm';
import FunctionTable from './FunctionTable';

export default function AdminFunctions() {
  const [funcoes, setFuncoes] = useState<TipoFuncao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null);

  async function loadFuncoes() {
    setLoading(true);
    try {
      const data = await listarFuncoes();
      setFuncoes(data);
    } catch {
      addToast({ text: 'Erro ao carregar funções', error: true });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFuncoes(); }, []);

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    try {
      const result = await desativarFuncao(deactivateTarget);
      if (result.aviso) {
        addToast({ text: result.aviso, error: true });
      } else {
        addToast({ text: 'Função desativada' });
      }
      loadFuncoes();
    } catch (err: any) {
      addToast({ text: err.message || 'Erro ao desativar', error: true });
    }
    setDeactivateTarget(null);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <Briefcase size={24} /> Funções Profissionais
        </h1>
        <button className="admin-btn admin-btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Nova Função
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 24, padding: 16, background: 'var(--panel-bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <FunctionForm onCreated={() => { loadFuncoes(); setShowForm(false); }} />
        </div>
      )}

      {loading ? (
        <div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-row">
              <div className="skeleton skeleton-cell" style={{ width: 60 }} />
              <div className="skeleton skeleton-cell" style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      ) : (
        <FunctionTable funcoes={funcoes} onDeactivate={(codigo) => setDeactivateTarget(codigo)} />
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Desativar Função"
        message={`Desativar a função ${deactivateTarget}?`}
        confirmLabel="Desativar"
        confirmClass="danger"
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify it works**

Run: `npm run dev`
Expected: Functions page loads, create form works, table displays, deactivation with warning

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/FunctionForm.tsx src/components/admin/FunctionTable.tsx src/components/admin/AdminFunctions.tsx
git commit -m "feat(admin): implement AdminFunctions with form and table"
```

---

### Task 11: ConfigCard and AdminSettings

**Files:**
- Create: `src/components/admin/ConfigCard.tsx`
- Modify: `src/components/admin/AdminSettings.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `adminService.listarConfiguracoes`, `adminService.atualizarConfiguracao`, `Toast`
- Produces: Full settings page with config cards

- [ ] **Step 1: Create ConfigCard**

```tsx
import { useState } from 'react';
import { atualizarConfiguracao } from '../../services/adminService';
import { addToast } from '../Toast';
import { formatDateTime } from '../../lib/utils';
import type { Configuracao } from '../../lib/types';

interface ConfigCardProps {
  config: Configuracao;
  onSaved: () => void;
}

export default function ConfigCard({ config, onSaved }: ConfigCardProps) {
  const [value, setValue] = useState(config.valor);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function handleSave() {
    if (value === config.valor) return;

    setLoading(true);
    try {
      await atualizarConfiguracao(config.chave, value);
      addToast({ text: `${config.chave} atualizada` });
      setDirty(false);
      onSaved();
    } catch (err: any) {
      addToast({ text: err.message || 'Erro ao atualizar', error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="config-card">
      <div className="config-card-title">{config.chave}</div>
      {config.descricao && <div className="config-card-desc">{config.descricao}</div>}
      <div className="config-card-edit">
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setDirty(true); }}
        />
        <button
          className={`admin-btn ${dirty ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
          onClick={handleSave}
          disabled={loading || !dirty}
        >
          {loading ? '...' : 'Salvar'}
        </button>
      </div>
      {config.atualizado_em && (
        <div className="config-card-timestamp">
          Atualizado em: {formatDateTime(config.atualizado_em)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement AdminSettings page**

```tsx
import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { listarConfiguracoes } from '../../services/adminService';
import type { Configuracao } from '../../lib/types';
import { addToast } from '../Toast';
import ConfigCard from './ConfigCard';

export default function AdminSettings() {
  const [configs, setConfigs] = useState<Configuracao[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadConfigs() {
    setLoading(true);
    try {
      const data = await listarConfiguracoes();
      setConfigs(data);
    } catch {
      addToast({ text: 'Erro ao carregar configurações', error: true });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadConfigs(); }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <Settings size={24} /> Configurações
        </h1>
      </div>

      {loading ? (
        <div>
          {[1, 2].map((i) => (
            <div key={i} className="config-card">
              <div className="skeleton skeleton-cell" style={{ width: 200, height: 16 }} />
              <div className="skeleton skeleton-cell" style={{ width: 300, height: 12, marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : configs.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Nenhuma configuração encontrada.</p>
      ) : (
        configs.map((c) => (
          <ConfigCard key={c.chave} config={c} onSaved={loadConfigs} />
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify it works**

Run: `npm run dev`
Expected: Settings page loads, config cards display, inline editing works

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ConfigCard.tsx src/components/admin/AdminSettings.tsx
git commit -m "feat(admin): implement AdminSettings with config cards"
```

---

### Task 12: HistoryTable and AdminHistory

**Files:**
- Create: `src/components/admin/HistoryTable.tsx`
- Modify: `src/components/admin/AdminHistory.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `adminService.listarHistoricoAdmin`, `formatDateTime` from utils, status badge utilities
- Produces: Full history page with server-side pagination

- [ ] **Step 1: Create HistoryTable**

```tsx
import { formatDateTime } from '../../lib/utils';

interface HistoryEntry {
  id: number;
  status_anterior: string | null;
  status_novo: string;
  alterado_em: string;
  solicitacao: { id: number; setor: { nome: string } };
  alterado_por_profile: { nome_completo: string; matricula: string };
}

interface HistoryTableProps {
  entries: HistoryEntry[];
}

const statusColors: Record<string, string> = {
  aguardando_cedente: '#f59e0b',
  pendente: '#3b82f6',
  aprovado: '#22c55e',
  recusado_cedente: '#ef4444',
  recusado_gestor: '#ef4444',
  cancelado: '#6b7280',
  pedido_revogacao: '#a855f7',
  revogado: '#6b7280',
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="badge badge-inativo">—</span>;
  const color = statusColors[status] || '#6b7280';
  return (
    <span
      className="badge"
      style={{ background: `${color}15`, color }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function HistoryTable({ entries }: HistoryTableProps) {
  if (entries.length === 0) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Nenhum registro encontrado.</p>;
  }

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Data/Hora</th>
          <th>Solicitação</th>
          <th>Setor</th>
          <th>De → Para</th>
          <th>Responsável</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.id}>
            <td className="td-date" data-label="Data">{formatDateTime(e.alterado_em)}</td>
            <td data-label="Solicitação">#{e.solicitacao.id}</td>
            <td data-label="Setor">{e.solicitacao.setor.nome}</td>
            <td data-label="De → Para">
              <StatusBadge status={e.status_anterior} /> → <StatusBadge status={e.status_novo} />
            </td>
            <td data-label="Responsável">
              {e.alterado_por_profile.nome_completo}
              <br />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.alterado_por_profile.matricula}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 2: Implement AdminHistory page**

```tsx
import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { listarHistoricoAdmin } from '../../services/adminService';
import { addToast } from '../Toast';
import HistoryTable from './HistoryTable';

export default function AdminHistory() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 50;

  async function loadHistory(p: number) {
    setLoading(true);
    try {
      const data = await listarHistoricoAdmin(p, perPage);
      setEntries(data.data);
      setTotalPages(data.pagination.total_pages);
      setTotal(data.pagination.total);
      setPage(p);
    } catch {
      addToast({ text: 'Erro ao carregar histórico', error: true });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHistory(1); }, []);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1 className="admin-page-title">
          <ScrollText size={24} /> Auditoria de Solicitações
        </h1>
      </div>

      {loading ? (
        <div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-row">
              <div className="skeleton skeleton-cell" style={{ width: 100 }} />
              <div className="skeleton skeleton-cell" style={{ width: 40 }} />
              <div className="skeleton skeleton-cell" style={{ width: 60 }} />
              <div className="skeleton skeleton-cell" style={{ flex: 1 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <HistoryTable entries={entries} />
          {totalPages > 1 && (
            <div className="admin-pagination">
              <span>Página {page} de {totalPages} ({total} registros)</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="admin-btn admin-btn-ghost"
                  onClick={() => loadHistory(page - 1)}
                  disabled={page <= 1}
                >
                  Anterior
                </button>
                <button
                  className="admin-btn admin-btn-ghost"
                  onClick={() => loadHistory(page + 1)}
                  disabled={page >= totalPages}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify it works**

Run: `npm run dev`
Expected: History page loads with server-side pagination, status badges colored correctly

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/HistoryTable.tsx src/components/admin/AdminHistory.tsx
git commit -m "feat(admin): implement AdminHistory with server-side pagination"
```

---

### Task 13: Final Cleanup and Verification

**Files:**
- Modify: `src/pages/AdminPage.tsx` — replace with redirect
- Verify: all routes, all pages, mobile responsive

**Interfaces:**
- Consumes: All Tasks 1-12
- Produces: Clean, working admin section

- [ ] **Step 1: Replace AdminPage.tsx with redirect**

```tsx
import { Navigate } from 'react-router-dom';

export default function AdminPage() {
  return <Navigate to="/admin" replace />;
}
```

- [ ] **Step 2: Run full type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`
Checklist:
- [ ] Login as ADMIN → redirects to `/admin`
- [ ] Sidebar visible with 6 items
- [ ] Dashboard loads with stat cards
- [ ] Users page: table renders, filters work, create/edit/reset modals work
- [ ] Sectors page: cards render, create/link forms work, members expand
- [ ] Functions page: create form works, table renders, deactivate works
- [ ] Settings page: config cards display, inline edit works
- [ ] History page: table loads with pagination
- [ ] Mobile: sidebar collapses, tables convert to cards
- [ ] Dark mode: all components respect theme

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdminPage.tsx
git commit -m "feat(admin): replace AdminPage with redirect to new admin routes"
```
