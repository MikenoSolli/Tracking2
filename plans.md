# Maintenance Subsystem — Implementation Plan

## 1. Schema Refinements

### 1.1 Add Missing Status Values

The current `maintenance_status` enum has: `SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED`

Project.md defines a richer lifecycle: `SCHEDULED → ASSIGNED → IN_PROGRESS → COMPLETED → APPROVED`, plus `PENDING_PARTS, ON_HOLD, ESCALATED`.

**Change:** Expand `maintenance_status` to:
```
SCHEDULED, ASSIGNED, IN_PROGRESS, PENDING_PARTS, ON_HOLD, COMPLETED, APPROVED, CANCELLED, ESCALATED
```

This enables real-world mechanic workflows without shoving state into `notes`.

### 1.2 Add `metadata` JSON Column to `maintenance`

The `notes` field is currently `@db.Text` — used for everything from diagnostic notes to parts tracking. This makes querying structured data (parts lists, costs, images) impossible without string parsing.

**Change:** Add a `Json?` metadata column:
```
metadata Json?   // parts_used, before_images, after_images, labor_hours, root_cause, customer_complaint
```

This keeps `notes` for free-form text and `metadata` for structured data.

### 1.3 Add `origin` Field to `maintenance`

Work orders can originate from: interval engine, fault trigger, manual creation, driver report. Tracking this is essential for analytics and audit.

**Change:**
```
origin     maintenance_origin @default(MANUAL)
```
New enum:
```
enum maintenance_origin { INTERVAL, FAULT, MANUAL, DRIVER }
```

### 1.4 Create `maintenance_template` Model

Interval-based scheduling needs templates defining service intervals per vehicle type.

**New model:**
```
model maintenance_template {
  id                  String     @id @default(cuid())
  companyId           Int        @map("company_id")
  name                String     // "Oil Change", "Brake Inspection"
  description         String?
  vehicleType         vehicle_Type?
  timeIntervalDays    Int?       // e.g., 180 for 6 months
  mileageIntervalKm   Float?     // e.g., 10000
  engineHoursInterval Float?     // e.g., 300
  defaultSeverity     maintenance_severity @default(MEDIUM)
  estimatedCost       Float?
  estimatedDuration   Float?     // hours
  isActive            Boolean    @default(true)
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt
}
```

This replaces the Project.md idea of "storing config in maintenance table metadata" — a dedicated model is cleaner, queryable, and type-safe.

### 1.5 Schema Summary — What Changes

| Change | Risk | Reason |
|--------|------|--------|
| Expand `maintenance_status` enum | Low — existing records use only SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED | Enables proper work order lifecycle |
| Add `metadata` Json to `maintenance` | Low — nullable, existing records unaffected | Structured parts/images storage |
| Add `origin` field to `maintenance` | Low — nullable with default | Audit trail for auto-vs-manual creation |
| Add `maintenance_template` model | Low — new table, no migration impact | Clean interval scheduling config |

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    MAINTENANCE SUBSYSTEM                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐    ┌──────────────────────────────────┐    │
│  │  Scheduling      │    │  Fleet Manager Dashboard         │    │
│  │  Cron/Worker     │───▶│  /maintenance                    │    │
│  │  (route hit by   │    │  - KPI cards                     │    │
│  │   external cron) │    │  - Work order list               │    │
│  └────────┬─────────┘    │  - Fleet health map              │    │
│           │              │  - Create WO form                 │    │
│           │              │  - Calendar view                  │    │
│           │              └────────────────┬─────────────────┘    │
│           │                               │                      │
│           │              ┌────────────────▼─────────────────┐    │
│           │              │  Mechanic Portal                 │    │
│           │              │  /mechanic                       │    │
│           │              │  - My work orders                │    │
│           │              │  - Work order detail             │    │
│           │              │  - Status updates                │    │
│           │              │  - Parts/cost logging            │    │
│           │              │  - Fault code management         │    │
│           │              └──────────────────────────────────┘    │
│           │                                                      │
│  ┌────────▼─────────┐                                            │
│  │  External Rust    │  (separate repo)                          │
│  │  Ingestion        │                                            │
│  │  (fault detection,│                                            │
│  │   alert creation) │                                            │
│  └──────────────────┘                                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementation Phases

### Phase 1 — Schema & Foundation (estimated: 2-3 days)

**Tasks:**
1. Update Prisma schema with changes from §1
2. Run migration
3. Create seed data for `fault_code_definitions` (common OBD-II codes) and `maintenance_template` presets
4. Build `lib/maintenance.ts` — shared utilities:
   - `calculateHealthScore(vehicleId)` — 0-100 from faults, overdue, telemetry anomalies
   - `getNextServiceDate(template, lastService)` — date calculation based on multi-dimensional intervals
   - `getMaintenancePriority(maintenance)` — urgency score combining severity + overdue + health

**Why seed data matters:** Without pre-populated `fault_code_definitions`, fault enrichment (layer 1 intelligence) is dead. Without `maintenance_template` presets, the interval scheduler has nothing to check against.

### Phase 2 — Maintenance Dashboard UI (estimated: 4-5 days)

**Route:** `/maintenance` (new top-level page)

**Components to build:**

| Component | Description | Notes |
|-----------|-------------|-------|
| `MaintenanceLayout` | Layout wrapper with sub-nav (Overview, Calendar) | New route group `(maintenance)` |
| `MetricCards` | Overdue, Due Today, Upcoming, Active WOs, Health Score, Compliance | Reuse pattern from dashboard, add health score gauge |
| `WorkOrderList` | Sortable table with priority badges, inline actions, bulk select | Reuse table pattern from reports page |
| `WorkOrderDrawer` | Slide-out sheet for detail view + status transitions | Reuse Sheet pattern from vehicles/drivers |
| `CreateWorkOrderForm` | Form: vehicle, service type, description, scheduled date, mechanic, severity | Server action for creation |
| `FleetHealthMap` | Leaflet map with color-coded markers by health score | Reuse map component pattern from dashboard |
| `CalendarView` | Month/week view showing scheduled work orders | `/maintenance/calendar` sub-route |

**Key UI patterns:**
- Priority badges: P0 (red), P1 (amber), P2 (green), P3 (grey) — computed from `getMaintenancePriority()`
- Status badges with color mapping: SCHEDULED=blue, ASSIGNED=indigo, IN_PROGRESS=amber, COMPLETED=emerald, APPROVED=teal, CANCELLED=slate
- Inline mechanic assignment dropdown
- Empty states for: "No overdue", "No upcoming", "All caught up"

**API Routes needed:**
| Route | Purpose |
|-------|---------|
| `GET /api/maintenance` | List work orders with filters (status, date range, vehicle type, severity, search) |
| `GET /api/maintenance/[id]` | Single work order detail with faults, alerts, history |
| `POST /api/maintenance` | Create work order |
| `PATCH /api/maintenance/[id]` | Update status, assign mechanic, log parts |
| `DELETE /api/maintenance/[id]` | Cancel work order (soft delete, requires reason) |
| `GET /api/maintenance/stats` | KPI data (overdue count, due today, compliance rate, health score) |
| `GET /api/maintenance/calendar` | Calendar aggregation (work orders grouped by date) |
| `GET /api/maintenance/health` | Fleet health scores (all vehicles with scores) |

### Phase 3 — Mechanic Portal UI (estimated: 4-5 days)

**Route:** `/mechanic` (new top-level page, separate from main dashboard)

**Important:** The mechanic portal must enforce access via middleware. Mechanics should only see:
- Work orders where `maintenance.mechanicId` matches their `user.id`
- OR work orders where their assigned service company (`maintenance.serviceCompanyId` matches their `user.companyId`)

**Components to build:**

| Component | Description | Notes |
|-----------|-------------|-------|
| `MechanicLayout` | Minimal layout without fleet management nav | Different sidebar/nav |
| `MyWorkOrders` | Grouped list (Urgent, Today, This Week, Upcoming) | Default view on load |
| `WorkOrderDetail` | Full detail view with status update panel | Contains sub-components below |
| `StatusUpdatePanel` | Buttons: Start Work, Add Note, Log Part, Upload Photo, Complete | Triggers server actions |
| `PartsLogger` | Inline form: part name, number, quantity, cost | Appends to `metadata.parts_used` |
| `FaultResolver` | List active faults for vehicle, mark resolved | Updates `vehicle_faults.clearedAt` |
| `PhotoUploader` | Upload before/after images | Stores URLs in `metadata` |

**API Routes needed:**
| Route | Purpose |
|-------|---------|
| `GET /api/mechanic/work-orders` | List assigned work orders (scoped to current user) |
| `GET /api/mechanic/work-orders/[id]` | Single work order with faults, telemetry snapshot |
| `PATCH /api/mechanic/work-orders/[id]` | Status update, add notes, log parts |
| `POST /api/mechanic/work-orders/[id]/photos` | Upload images |
| `POST /api/mechanic/work-orders/[id]/resolve-fault` | Mark fault as cleared |

**Authorization:** Every mechanic endpoint must verify:
1. `user.role === "MECHANIC"` OR the user has `MAINTENANCE_ONLY` access to the vehicle
2. The work order is assigned to this mechanic or their service company

### Phase 4 — Interval Scheduling Engine (estimated: 1-2 days)

**Note:** This runs as an external cron hitting a Next.js API route. No worker process needed initially.

**Route:** `GET /api/cron/maintenance-check` (protected by API key, not session auth)

**Logic flow:**
1. Fetch all `maintenance_template` records (grouped by `vehicleType` or global)
2. For each active vehicle:
   - For each template matching the vehicle's type (or global templates):
     - Fetch the latest completed `maintenance` record for that vehicle with matching description keywords
     - Fetch current `odometer`, `engineHours` from vehicle's `status` table
     - Calculate deltas for time/mileage/engine-hours from last service
     - If ANY threshold crossed (accounting for grace periods):
       - Create `maintenance` record with `status: SCHEDULED`, `origin: INTERVAL`
       - Create `alert` with `type: MAINTENANCE_DUE`

**Grace periods:** Mileage ±500km, Time ±3 days, Engine hours ±10h

**Smart scheduling:** Add 7-day grace buffer to `scheduledDate` (create due-date, not overdue-date).

---

## 4. Refinements I'd Recommend

### 4.1 Simplified Phasing

Project.md is highly ambitious with predictive models, smart assignment, batch scheduling, and cost optimization. For a first pass, **skip everything under §§2.3, 4.2 (all strategies), and implement:**

1. **Core CRUD** — Create, view, update, complete work orders
2. **Manual assignment** — Assign a mechanic dropdown (not smart assignment)
3. **Interval scheduling** — Basic cron check (not predictive)
4. **Mechanic portal** — View assigned WOs, update status, log parts (no calendar, no performance dashboard, no mobile PWA, no leaderboard)

Predictive models, smart routing, and gamification should be Phase 5+ — they depend on months of accumulated data to be useful anyway.

### 4.2 Move `maintenance_template` to the Database

Project.md suggests storing interval config "in maintenance table metadata or config JSON." A dedicated model is better:
- Type-safe (Prisma validates fields)
- Queryable ("find all templates for TRACTOR")
- UI-manageable (fleet manager can edit templates)
- Migration-safe (JSON blobs are opaque to schema evolution)

### 4.3 Separate Mechanic Portal from Fleet Dashboard

Project.md suggests `/mechanic` as a separate route. I agree — mechanics should not see fleet management nav. Use middleware to:
- Check `user.role === "MECHANIC"` → redirect `/` to `/mechanic`
- Check `user.role` for `MAINTENANCE_ONLY` vehicle access → limit nav

The current app has no middleware. Building middleware should be done before the mechanic portal or the route will be accessible to anyone.

### 4.4 Use Server Actions for Mutations, API Routes for Reads

Follow the existing vehicle management pattern:
- **Server actions** for mechanic status updates, part logging, fault resolution (quick, inline)
- **API routes** for work order listing, stats, health scores (support filters, pagination, caching)

### 4.5 Health Score is a Computed Field, Not a DB Column

Don't add a `healthScore` column to `vehicle`. Compute it server-side from:
- Active fault count (weighted: CRITICAL=40, HIGH=20, MEDIUM=10, LOW=5)
- Overdue maintenance (each overdue WO = -15 points)
- Telemetry anomalies (engine temp spikes, oil pressure drops in last 7 days)
- Recent completion (completed WO in last 30 days = +10)

Formula: `100 - sum(penalties) + sum(bonuses)`, clamped to 0-100.

Cache the result in Redis with a 5-minute TTL (frequent reads, infrequent changes). This avoids a costly query on every page load.

---

## 5. Data Flow Summary

```
Manual WO Creation
  Fleet Manager → CreateWorkOrderForm → server action → MariaDB
    
Interval-Triggered WO
  Cron → /api/cron/maintenance-check → check templates vs vehicle state → MariaDB + Alerts
    
Fault-Triggered WO
  External Rust Ingester → detects fault → Redis queue → worker → MariaDB + Alerts
    
Mechanic Update
  Mechanic Portal → server action → update maintenance status + metadata → MariaDB
```

---

## 6. Effort Estimate

| Phase | Days | Dependencies |
|-------|------|-------------|
| Phase 1: Schema & Foundation | 2-3 | None |
| Phase 2: Fleet Manager Dashboard | 4-5 | Phase 1 |
| Phase 3: Mechanic Portal | 4-5 | Phase 1 + middleware |
| Phase 4: Interval Scheduling | 1-2 | Phase 1 |
| **Total** | **11-15** | |