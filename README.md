# Trackio — Fleet Management Platform

Multi-tenant fleet vehicle tracking & telematics web application. Ingested IoT telemetry data (from an external Rust-based ingestion service) is persisted to MariaDB and served through a real-time dashboard for fleet managers.

---

## Architecture Overview

```
IoT Device → External Rust Ingester → Redis (cache + queue) → MariaDB
                                        ↓
Client Pages ← API Routes (getSession → prisma queries) ←  
```

- **Ingestion is external**: A dedicated Rust service receives raw device telemetry, writes latest state to Redis, queues data for persistence, and broadcasts live updates via Redis pub/sub. That service lives in a **separate repository** — not in this codebase.
- This Next.js app is the **web UI + API layer only**. It reads from MariaDB (via Prisma) and subscribes to Redis live channels for real-time map updates.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, standalone output) |
| UI | React 19, Tailwind CSS 4, shadcn/ui (Radix), Lucide icons |
| Database | MariaDB via Prisma 7 (MariaDB adapter) |
| Cache/Queue | Redis (ioredis) — state caching, telemetry buffering, pub/sub |
| Auth | JWT via `jose` (HS256), httpOnly cookies, auto-rotation |
| Maps | Leaflet + React-Leaflet |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Email | Nodemailer (SMTP) |
| Container | Docker (multi-stage, standalone output) |

---

## Pages Completion Status

| Page | Status | Lines | Notes |
|---|---|---|---|
| Landing (`/`) | Complete | 828 | Marketing + login/register dialogs |
| Auth (login/register/logout/verify) | Complete | — | Full flow with email verification |
| **Dashboard** | **Complete** | ~1100 | KPIs, live map, alerts panel, 4-tab analytics (overview, fuel, drivers, maintenance) |
| **Vehicles** | **Complete** | ~1007 | Grid, CRUD, subscription tiers, custom sensor builder, search/filter, bulk ops |
| **Drivers** | **Complete** | ~882 | CRUD, vehicle assignment, license compliance, performance chart, pagination, alerts |
| Vehicle Detail (`/vehicles/[id]`) | Complete | ~600 | Individual map, SSE telemetry, history |
| **Reports Hub** | **Partial** | ~354 | General fleet report works; type-specific pages (tractors, trucks, cars, bus) mostly stubs |
| **Trips** | **Stub** | 13 | Bare `<div>Trip Management</div>` placeholder |
| **Maintenance Portal** | **Not built** | 0 | No dedicated page — only a dashboard tab |
| **Mechanic Portal** | **Not built** | 0 | `MECHANIC` role exists in schema, `MAINTENANCE_ONLY` permission exists — no UI |

---

## What's Well-Implemented

### Dashboard (`app/(main)/dashboard/page.tsx`)
- 5 KPI metric cards (Active, Idle, Offline, Utilization, Alerts)
- Live fleet tracking map via dynamic Leaflet import with SSE updates
- Notifications + Active Alerts panels with severity-color-coded items
- 4-tab analytics: Overview (7-day Recharts area chart), Fuel Analytics, Driver Performance, Maintenance
- Full state coverage: skeleton loaders (4 variants), error banner with retry, empty state, week summary footer

### Vehicle Management (`app/(main)/vehicles/page.tsx`)
- Full CRUD via slide-out drawers (Add/Edit) using server actions
- 5-tier subscription model: BASIC → STANDARD → ADVANCED → CUSTOM → ENTERPRISE
- Custom sensor builder for CUSTOM tier (name, type, unit, min/max, alert thresholds/conditions)
- 16 feature flags per vehicle (GPS, fuel, OBD, geofencing, driver behavior, cargo sensors, etc.)
- Search (name/plate/IMEI), type/status filters, bulk selection and delete
- Each card shows: type icon, status badge, IMEI, location, speed, fuel bar (color-coded), data level

### Driver Management (`app/(main)/driver/page.tsx`)
- Full CRUD with slide-out registration/edit sheets
- Vehicle assignment/unassignment workflow with available-vehicle picker
- Performance tracking with color-coded scores and distribution bar chart
- License expiry compliance monitoring with red/emerald indicators
- Driver-level alert viewer dialog
- Paginated table with search

### Authentication
- JWT with httpOnly cookies (45-min access token, 7-day refresh token)
- Automatic token rotation via client-side `SessionManager` (polls every 60s)
- Multi-role system: `USER`, `ADMIN`, `MECHANIC`, `OWNER`
- Email verification flow
- Session persisted in DB with expiry tracking

### Data Schema (`prisma/schema.prisma` — 705 lines)
- 16 models spanning companies, users, vehicles, drivers, telemetry, maintenance, faults, alerts, trips, subscriptions, features, audit log
- 14 enums (vehicle types, subscription tiers, feature flags, alert categories, fault systems, etc.)
- Well-indexed for query performance
- Multi-tenant isolation via `companyId` on every query

### Design Strengths
- **Consistent UI language** — Shared patterns (MetricCard, skeleton loaders, gradient icons, status badges) across all pages
- **Subscription-driven architecture** — Feature toggles per vehicle scale to any service plan
- **Redis as a hot-path buffer** — Separates live tracking (Redis) from historical analytics (MariaDB)
- **Centralized session management** — All JWT operations in `_lib/sessions.ts`

---

## What's Missing / Needs Work

### 1. Trips Management (`/trips`) — HIGH Priority
**Status:** 13-line placeholder rendering `"Trip Management"` with an unused Prisma query.

**What's needed:**
- Trip list with date range / vehicle / driver filters
- Trip detail: route polyline from GPS events, timeline, metrics (distance, duration, avg speed, fuel)
- Trip creation (manual or auto-detected from telemetry patterns)
- CSV/PDF export

**Data ready:** `trip` model, `gps_events` for route reconstruction, `dailySummary` for aggregates.

### 2. Reports (`/reports/*`) — HIGH Priority
**Status:** General fleet report works (daily/weekly/monthly/yearly drill-down, CSV export, in-memory cache). But **bus, cars, and trucks pages use hardcoded mock data**. Tractor pages are real.

**What's needed:**
- Replace mock data in bus/cars/trucks with real API queries
- Fuel efficiency reports (cost analysis, consumption trends, anomaly detection)
- Driver scorecard (performance ranking, harsh events, safety incidents)
- Maintenance report (service history, upcoming schedule, cost tracking)
- Comparison reports (period-over-period, vehicle-to-vehicle)
- PDF generation (jsPDF / puppeteer)

### 3. Maintenance Portal — HIGH Priority
**Status:** Only visible as a dashboard tab. No dedicated management interface.

**What's needed:**
- Maintenance dashboard: list of scheduled/in-progress/completed services
- Schedule maintenance form (type, date, mechanic, cost, notes)
- Maintenance calendar
- Per-vehicle service history
- Odometer/hour-based auto-triggers for maintenance alerts
- Fault code viewer with lookup from `fault_code_definitions`

**Data ready:** `maintenance`, `maintenance_data`, `vehicle_faults`, `fault_code_definitions`, `alert` (MAINTENANCE_DUE type).

### 4. Mechanic Portal — MEDIUM Priority
**Status:** `MECHANIC` role and `MAINTENANCE_ONLY` access level exist in the database, but no UI.

**What's needed:**
- Mechanic workspace with restricted view (only assigned vehicles/tasks)
- Work order management (accept, progress, complete)
- Parts & cost logging
- Notes and photo attachments per job

### 5. Middleware (`middleware.ts`) — HIGH Priority
**Status:** Does not exist. There is no server-side route protection.

**Impact:** Auth relies entirely on client-side checks and per-API session verification. Protected pages have no redirect if unauthenticated.

### 6. Audit Log UI
**Status:** `audit_log` model exists but there is no UI to view change history for vehicles, drivers, or maintenance records.

### 7. Alert Management UI
**Status:** Alerts display on the dashboard but no dedicated page for list/acknowledge/resolve/configure threshold management.

### 8. Geofencing
**Status:** Schema supports `GEOFENCE_EXIT`/`GEOFENCE_ENTER` alert types, but no geofence drawing or configuration UI exists.

### 9. User Management
**Status:** No admin panel for managing users within a company (invitations, role assignment, activation).

---

## Technical Observations

### Inconsistencies
- **Data-fetching patterns**: Dashboard uses REST API + `useEffect`. Vehicles uses server actions. Drivers uses REST API. Three different patterns for the same operation type.
- **TypeScript**: Heavy use of `any` in `vehicles/actions.ts` for enum casting. Vehicle display mapper returns `any` typed objects. Reports API has multiple type errors (`RunningTime` vs `runningTime`, `BattVoltage` vs `battVoltage`, `alert` vs `alerts`).
- **N+1 queries**: Dashboard API queries `dailySummary` once per day in a 7-day loop. Could batch into a single query.
- **Duplicated components**: `MetricCard`, `SkeletonCard`, and `EmptyState` patterns repeated across dashboard, vehicles, and drivers pages.

### Security
- No rate limiting on auth endpoints
- Cookie `secure` flag commented out for development — needs enabling for production
- No middleware for server-side route protection

### Missing Infrastructure
- **No background worker**: Redis `telemetry_queue` is written to but never consumed (handled by external Rust service per the architecture)
- **No tests**: Zero unit, integration, or E2E tests in the project
- **No seed script**: No development data seeding for onboarding
- **No WebSocket/SSE in frontend**: Redis pub/sub exists but the frontend map uses polling rather than true push

---

## Prioritized Roadmap

### P0 — Complete ASAP
| Item | Reason |
|---|---|
| middleware.ts | No server-side route protection |
| Trips Management | Major missing feature |
| Maintenance Portal | Major missing feature — data model is complete unused |
| Reports type pages | Mock data will mislead users |

### P1 — Next Sprint
| Item | Reason |
|---|---|
| Mechanic Portal | `MECHANIC` role exists with no interface |
| Alert Management UI | Alerts are trapped on dashboard only |
| Fix TS errors in Reports API | Build-breaking type errors |
| Extract shared components | Reduce duplication across pages |

### P2 — Medium-term
| Item | Reason |
|---|---|
| Audit Log UI | Compliance requirement |
| Geofencing UI | Needed for real fleet operations |
| User Management | Admin functionality gap |
| PDF Report Export | Requested feature |
| Rate limiting on auth | Security hardening |
| Seed script | Developer onboarding |

### P3 — Nice to Have
| Item | Reason |
|---|---|
| SWR/React Query integration | Better client data-fetching |
| Redis-based report caching | Survives restarts + multi-instance |
| Notification bell in navbar | UX improvement |
| Push/Email/SMS for CRITICAL alerts | Production alerting |
| PWA or mobile app | Driver/mechanic field use |

---

## Data Flow Diagram

```
┌──────────────┐    ┌──────────────────────┐
│   IoT Device  │───▶│ Rust Ingestion       │───┐
│  (GPS + OBD)  │    │ Service (separate    │   │
└──────────────┘    │  repo)                │   │
                    └──────────────────────┘   │
                                              ▼
                                     ┌──────────────────┐
                                     │     Redis         │
                                     │  ┌────────────┐  │
                                     │  │ Latest      │  │
                                     │  │ State Cache │  │
                                     │  ├────────────┤  │
                                     │  │ Telemetry   │  │
                                     │  │ Queue       │  │
                                     │  ├────────────┤  │
                                     │  │ Pub/Sub     │──←──── SSE Endpoints
                                     │  │ Channels    │  │    subscribe here
                                     │  └────────────┘  │
                                     └────────┬─────────┘
                                              │ persist
                                              ▼
                                     ┌──────────────┐
                                     │   MariaDB    │
                                     │  (Prisma 7)  │
                                     └──────┬───────┘
                                            │
                                    ┌───────┴────────┐
                                    │   API Routes   │
                                    │   /api/*       │
                                    └───────┬────────┘
                                            │
                                    ┌───────┴────────┐
                                    │  Next.js Pages │
                                    │  Dashboard ·   │
                                    │  Vehicles ·    │
                                    │  Drivers ·     │
                                    │  Reports       │
                                    └────────────────┘
```