:: this poroject has two parts 1. Ingestion and data analysis part, this is a rust program(set of programs) 2. the webApp for viewing, settings and management.., now I am dealing with the webApp only and I dont want to intertwin these two, beacause I know my analytics engine should be highly optimized and lightweight, I think that changes the prompt, we are only integrating a part of that maintaance management, access and few settings, but not the maintanace engine in the webApp, okay yes, things like schedule management, assigning mechanics blablabla are part of it eeh

in this project we are not handling the maintanance Intelligent engine part we are just dealling with the maintanance workflow subsystem

here is a reference::
# Trackio Fleet Maintenance Management System
## Comprehensive Architecture & Product Planning Document

---

## Executive Summary

This document outlines the architecture, workflows, and operational design for the **Trackio Maintenance Management Subsystem**—a comprehensive addition to the existing fleet tracking and telematics platform. The subsystem transforms raw OBD diagnostics, telemetry streams, and operational data into actionable maintenance intelligence while providing enterprise-grade workflow management for fleet managers, mechanics, and service companies.

**Core Philosophy:** Shift from reactive "vehicle broke down" responses to proactive, data-driven maintenance orchestration.

---

## 1. System Architecture Overview

### 1.1 Integration Points with Existing Platform

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXISTING TRACKIO PLATFORM                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Vehicle    │  │  Telemetry   │  │     OBD      │          │
│  │   Tracking   │  │    Engine    │  │  Diagnostics │          │
│  │   (Redis)    │  │   (Prisma)   │  │   (Faults)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                   │
│                            ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │          MAINTENANCE INTELLIGENCE ENGINE (NEW)              │ │
│  │  • OBD Fault Analysis      • Predictive Triggers            │ │
│  │  • Interval Calculators    • Health Scoring                 │ │
│  │  • Alert Generator         • Workload Optimizer             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │           MAINTENANCE WORKFLOW SUBSYSTEM (NEW)              │ │
│  │                                                               │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │
│  │  │  Scheduling  │  │ Work Orders  │  │   Mechanic   │      │ │
│  │  │    Engine    │  │   Lifecycle  │  │    Portal    │      │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │ │
│  │                                                               │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │
│  │  │  Assignment  │  │    Fleet     │  │  Analytics   │      │ │
│  │  │     Logic    │  │   Health     │  │   Dashboard  │      │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        DATA INGESTION                           │
└────────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┴─────────────────────┐
        │                                             │
        ↓                                             ↓
┌──────────────┐                            ┌──────────────┐
│ Telemetry    │                            │  OBD Fault   │
│   Stream     │                            │   Events     │
│ (odometer,   │                            │ (P0171, etc) │
│ engine hrs)  │                            │              │
└──────┬───────┘                            └──────┬───────┘
       │                                            │
       ↓                                            ↓
┌──────────────────────────────────────────────────────────┐
│           MAINTENANCE INTELLIGENCE ENGINE                 │
│                                                            │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐│
│  │ Interval       │  │ Fault Analyzer │  │ Predictive  ││
│  │ Calculator     │  │ • Severity     │  │ Models      ││
│  │ • Time-based   │  │ • Recurrence   │  │ • Trend     ││
│  │ • Mileage      │  │ • System       │  │ • Pattern   ││
│  │ • Engine hrs   │  │   impact       │  │ • Anomaly   ││
│  └────────┬───────┘  └────────┬───────┘  └──────┬──────┘│
│           │                   │                   │       │
│           └───────────────────┴───────────────────┘       │
│                              ↓                             │
│           ┌──────────────────────────────────┐            │
│           │  Maintenance Event Generator     │            │
│           │  • Schedule violations           │            │
│           │  • Health score thresholds       │            │
│           │  • Fault escalations             │            │
│           └──────────────┬───────────────────┘            │
└────────────────────────────┴──────────────────────────────┘
                              ↓
        ┌─────────────────────┴─────────────────────┐
        │                                             │
        ↓                                             ↓
┌──────────────┐                            ┌──────────────┐
│ Work Order   │                            │    Alert     │
│  Creation    │                            │  Generation  │
│ (maintenance │                            │ (alert table)│
│    table)    │                            │              │
└──────┬───────┘                            └──────┬───────┘
       │                                            │
       ↓                                            ↓
┌──────────────────────────────────────────────────────────┐
│              WORKFLOW ORCHESTRATION                       │
│  • Assignment routing                                     │
│  • Mechanic notifications                                 │
│  • Status transitions                                     │
│  • Completion tracking                                    │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Maintenance Intelligence Engine

### 2.1 OBD Fault Analysis System

**Purpose:** Transform raw fault codes into maintenance intelligence.

#### Fault Processing Pipeline

```
vehicle_faults event → fault_code_definitions lookup → Severity Analysis
                                                              ↓
                                                    ┌─────────┴─────────┐
                                                    │                   │
                                               CRITICAL              MEDIUM/LOW
                                                    │                   │
                                            Immediate WO          Pattern Tracker
                                            Creation              (Redis cache)
                                                    │                   │
                                            Mechanic              Recurrence check:
                                            Assignment            • 3+ in 7 days?
                                                                  • Same system?
                                                                  → Escalate to WO
```

#### Intelligence Layers

**Layer 1: Fault Enrichment**
- Cross-reference `fault_code_definitions` for system type, severity, recommended action
- Analyze fault history: recurrence patterns (same code on same vehicle in past 30/90 days)
- System-level grouping: multiple faults in same system (e.g., ENGINE) = compound issue
- Cost prediction: estimate repair cost based on historical maintenance records for similar faults

**Layer 2: Health Scoring**
- Vehicle health score (0-100) based on:
  - Active fault count (weighted by severity)
  - Maintenance compliance (overdue vs scheduled ratio)
  - Telemetry anomalies (engine temp spikes, oil pressure drops)
  - Operational stress (hard usage patterns from telemetry_data)
- Score decay rate: how fast health deteriorates without intervention
- Comparative scoring: vehicle vs fleet average, vehicle vs similar type

**Layer 3: Predictive Triggers**
- Pattern detection:
  - "P0171 (lean fuel) followed by P0300 (misfire) within 14 days → fuel system degradation"
  - "Oil pressure drop + engine temp rise → imminent failure"
- Trend analysis from `telemetry_data`:
  - Fuel efficiency declining over 30 days → injector/filter issue
  - Engine load increasing for same operations → drivetrain wear
- Time-to-failure estimation: based on fault progression rate and historical data

### 2.2 Interval-Based Scheduling Engine

**Multi-Dimensional Interval Tracking**

```
Maintenance Type: "Oil Change"
├─ Time Interval: Every 6 months → check (current_date - last_service_date)
├─ Mileage Interval: Every 10,000 km → check (odometer - last_service_odometer)
├─ Engine Hours Interval: Every 300 hrs → check (engineHours - last_service_hours)
└─ Trigger Condition: FIRST threshold crossed = schedule due
```

**Implementation Strategy:**

1. **Maintenance Templates** (new concept, stored in maintenance table metadata or config JSON):
   - Define service types: Oil Change, Brake Inspection, Tire Rotation, Annual DOT Inspection
   - Each template has: `timeInterval`, `mileageInterval`, `engineHoursInterval`
   - Optional: vehicle type specificity (TRACTOR templates ≠ CAR templates)

2. **Scheduled Job (Cron/Background Worker):**
   - Runs every 6 hours
   - Queries all active vehicles
   - For each vehicle:
     - Fetch latest `maintenance` record per service type
     - Fetch current `odometer`, `engineHours` from `status` table
     - Calculate delta for each interval dimension
     - If ANY threshold crossed → create `maintenance` record with `status: SCHEDULED`
     - Generate corresponding `alert` with `type: MAINTENANCE_DUE`

3. **Smart Scheduling Windows:**
   - **Upcoming:** Due in 7-30 days (warning state)
   - **Due Soon:** Due in 0-7 days (action required)
   - **Overdue:** Past due date (critical)
   - Escalation: overdue > 14 days → increase alert severity, notify fleet manager

4. **Grace Periods & Tolerance:**
   - Mileage: ±500 km grace (don't alert at 9,950 km for 10,000 km service)
   - Time: ±3 days grace for monthly services
   - Engine hours: ±10 hrs grace

### 2.3 Predictive Maintenance Models

**Data Inputs:**
- 30-day rolling window of `telemetry_data` for each vehicle
- Fault occurrence frequency and clustering
- Driver behavior patterns (harsh braking from dashboard analytics)
- Seasonal patterns (winter = battery failures, summer = cooling system)

**Prediction Targets:**

1. **Component Failure Prediction:**
   - Battery: voltage trend + cold cranking performance → predict failure 2-4 weeks out
   - Brakes: detect degradation from speed/deceleration patterns in GPS events
   - Cooling system: engine temp volatility + coolant sensor trends

2. **Maintenance Urgency Scoring:**
   - Combine: overdue status + fault severity + health score + operational criticality
   - Operational criticality: vehicles on active trips or high-utilization routes get priority
   - Output: Priority queue for mechanic assignment (P0 = critical, P1 = high, P2 = medium, P3 = low)

3. **Cost Optimization:**
   - Batch scheduling: group maintenance for nearby vehicles to reduce mechanic travel
   - Downtime minimization: schedule during low-utilization windows (identify from trip history)
   - Preventive bundling: "vehicle due for oil change + has minor fault → bundle into one service"

---

## 3. Work Order Lifecycle Management

### 3.1 Work Order States & Transitions

```
┌──────────────┐
│  SCHEDULED   │ ← Interval engine or manual creation
└──────┬───────┘
       │
       │ (Mechanic assigned OR service company assigned)
       ↓
┌──────────────┐
│   ASSIGNED   │ ← Assignment locked, mechanic notified
└──────┬───────┘
       │
       │ (Mechanic accepts & starts work)
       ↓
┌──────────────┐
│ IN_PROGRESS  │ ← Real-time status tracking (mechanic updates via mobile/portal)
└──────┬───────┘
       │
       │ (Work completed, parts/cost logged)
       ↓
┌──────────────┐
│  COMPLETED   │ ← Final sign-off, invoice ready
└──────┬───────┘
       │
       │ (Fleet manager review & approval)
       ↓
┌──────────────┐
│   APPROVED   │ ← Closed, archived for reporting
└──────────────┘

    ┌──────────────┐
    │  CANCELLED   │ ← Abort at any stage (reason required)
    └──────────────┘
```

**Additional States:**
- **PENDING_PARTS:** Mechanic identified required parts, waiting on procurement
- **ON_HOLD:** Temporary pause (awaiting authorization, external dependency)
- **ESCALATED:** Requires specialist or external service company

### 3.2 Work Order Data Model Enhancements

**Existing `maintenance` table is well-designed. Augment with:**

**Virtual Computed Fields (API layer, not DB):**
- `daysOverdue`: `scheduledDate - current_date` (if negative)
- `priorityScore`: computed from severity + overdue + vehicle health score
- `estimatedDuration`: based on service type average from historical data
- `estimatedCost`: from historical averages or predefined templates

**Metadata JSON Field Additions (in `notes` or new `metadata` JSON column):**
```json
{
  "parts_used": [
    {"part_name": "Oil Filter", "part_number": "OF-123", "quantity": 1, "cost": 25.00},
    {"part_name": "Engine Oil 5W-30", "quantity": 5, "unit": "liters", "cost": 60.00}
  ],
  "labor_hours": 2.5,
  "diagnostic_notes": "Detected P0171 fault, cleaned MAF sensor, reset code",
  "before_images": ["url1", "url2"],
  "after_images": ["url3", "url4"],
  "customer_complaint": "Engine rough idle",
  "root_cause": "Dirty air filter + MAF sensor contamination",
  "preventive_recommendations": "Replace air filter every 15k km"
}
```

### 3.3 Work Order Creation Flows

**Flow 1: Automatic (Interval-Triggered)**
```
Cron Job detects: Vehicle VH-001 odometer = 50,200 km
Last oil change: 40,100 km (10,100 km ago, threshold = 10,000 km)
→ Create maintenance record:
   - scheduledDate = current_date + 7 days (grace buffer)
   - status = SCHEDULED
   - description = "Scheduled Oil Change - 50K km service"
   - severity = MEDIUM
→ Create alert:
   - type = MAINTENANCE_DUE
   - severity = MEDIUM
   - message = "Oil change due for VH-001"
```

**Flow 2: Fault-Triggered**
```
OBD fault event: P0118 (Engine Coolant Temp Sensor High)
fault_code_definitions.severity = HIGH
→ Immediate work order creation:
   - scheduledDate = current_date (immediate)
   - status = SCHEDULED
   - description = "URGENT: Coolant temp sensor fault (P0118)"
   - severity = HIGH
   - link to vehicle_faults record via faultId
→ Create alert:
   - type = MECHANICAL_FAULT
   - severity = HIGH
   - isMaintenanceRelated = true
```

**Flow 3: Manual (Fleet Manager Initiated)**
```
Fleet manager creates custom service via UI:
→ Fill form: service type, description, scheduled date, vehicle(s)
→ Optional: assign specific mechanic or service company
→ Create maintenance record with status = SCHEDULED
→ Generate alert for assigned party
```

**Flow 4: Driver-Reported Issue**
```
Driver submits issue via mobile app (future enhancement):
"Brake pedal feels soft"
→ Creates maintenance record with status = PENDING_REVIEW
→ Fleet manager reviews, escalates to SCHEDULED if valid
→ Assigns mechanic
```

---

## 4. Mechanic & Service Company Management

### 4.1 Mechanic Roles & Permissions

**Role Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│                        USER TYPES                            │
├─────────────────────────────────────────────────────────────┤
│  ADMIN / OWNER        → Full fleet visibility, all controls │
│  USER (Fleet Mgr)     → Manage fleet, assign work orders    │
│  MECHANIC (Internal)  → View assigned work, update status   │
│  MECHANIC (External)  → Service company employee            │
└─────────────────────────────────────────────────────────────┘
```

**Mechanic Access Model:**

Existing `vehicle_access` table supports this perfectly:
- `accessType: MAINTENANCE_ONLY` = mechanic can only view/update maintenance records for specific vehicles
- `accessType: FULL` = internal mechanic with broader permissions
- `expiresAt`: temporary access for contract mechanics

**Service Company Model:**

Leverage existing `companies` table:
- `companyType: COMPANY` + `serviceType: MECHANIC` = external service provider
- Fleet company can assign maintenance to service company via `maintenance.serviceCompanyId`
- Service company mechanics are `user` records with `companyId` pointing to service company

### 4.2 Assignment Strategies

**Strategy 1: Direct Assignment (Manual)**
```
Fleet manager selects:
- Single work order → assign to specific mechanic (user.role = MECHANIC)
- Mechanic receives notification (email + in-app alert)
- Work order status: SCHEDULED → ASSIGNED
```

**Strategy 2: Service Company Assignment**
```
Fleet manager selects:
- Work order → assign to service company (maintenance.serviceCompanyId)
- Service company's internal admin assigns to their mechanic
- Work order status: SCHEDULED → ASSIGNED (assigned to company)
  → IN_PROGRESS (when mechanic accepts)
```

**Strategy 3: Bulk Assignment (Filtered)**
```
Fleet manager creates assignment rule:
- Filter: vehicle type = TRACTOR + location within 50km of mechanic base
- Assignment target: Mechanic John Doe
- System automatically assigns all matching NEW work orders to John
- Stored as reusable assignment template (new concept, cached in Redis or DB)
```

**Strategy 4: Smart Assignment (Automated)**
```
Factors:
- Mechanic specialization (stored in user metadata JSON): "OBD_DIAGNOSTICS", "BRAKE_SPECIALIST"
- Current workload (count of IN_PROGRESS work orders)
- Geographic proximity (mechanic location vs vehicle location)
- Availability (mechanic calendar/schedule)

Algorithm:
1. Fetch all available mechanics (isActive = true, role = MECHANIC)
2. Filter by specialization match (if work order requires specific skill)
3. Score by: workload (lower = better) + proximity (closer = better)
4. Assign to top-scored mechanic
5. Log assignment decision in audit_log
```

**Strategy 5: Batch Assignment by Category**
```
Use case: "Assign all brake-related maintenance to Mechanic A"
- Filter: description contains "brake" OR linked fault codes in BRAKING system
- Create persistent rule (stored in new table or Redis)
- Auto-apply on new work order creation
```

### 4.3 Mechanic Portal Architecture

**Dedicated Route:** `/mechanic` (separate from main dashboard)

**Portal Capabilities:**

1. **My Work Orders** (Default View)
   - List of assigned work orders, grouped by status:
     - **Urgent** (overdue or severity = CRITICAL)
     - **Today** (scheduledDate = today)
     - **This Week** (scheduledDate within 7 days)
     - **Upcoming** (scheduledDate > 7 days)
   - Quick actions: Start Work, View Details, Report Issue

2. **Work Order Detail Page**
   - Vehicle info: make, model, plate, current location (map)
   - Service description, fault codes (if applicable)
   - Fault history timeline (past 90 days for same vehicle)
   - Telemetry snapshot (current engine stats from status table)
   - Recommended parts list (from maintenance metadata or template)
   - **Status Update Panel:**
     - Start Work → set status = IN_PROGRESS, log timestamp
     - Add Notes → update notes field with timestamped entry
     - Log Parts → add to metadata.parts_used array
     - Upload Photos → store URLs in metadata.before_images / after_images
     - Complete Work → transition to COMPLETED, require cost & labor hours input
   - **Fault Code Actions:**
     - Mark Fault as Resolved → update vehicle_faults.clearedAt, clearedBy
     - Request Diagnostic Report → generate PDF with fault timeline

3. **Calendar View**
   - Visual schedule of assigned work orders
   - Drag-to-reschedule (updates scheduledDate, notifies fleet manager)
   - Availability blocking (mark dates unavailable)

4. **Performance Dashboard**
   - Mechanic KPIs:
     - Work orders completed (this week/month)
     - Average completion time
     - On-time completion rate
     - Cost accuracy (estimated vs actual)
   - Leaderboard (gamification): top mechanics by completion rate

5. **Mobile Optimization**
   - Mechanic portal is primarily mobile-first (mechanics in field, not at desks)
   - PWA with offline support: cache work order details, sync updates when online
   - Push notifications for new assignments

---

## 5. Dashboard & UI Architecture

### 5.1 Fleet Manager: Maintenance Dashboard

**Route:** `/maintenance` (new top-level page)

**Layout Structure:**

```
┌─────────────────────────────────────────────────────────────────┐
│  MAINTENANCE OVERVIEW DASHBOARD                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐│
│  │   Overdue    │ │  Due Today   │ │   Upcoming   │ │  Active ││
│  │      12      │ │      5       │ │      23      │ │   8 WOs ││
│  │  ▲ RED ICON  │ │ ▲ AMBER ICON │ │ ▲ GREEN ICON │ │   •••   ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────┘│
├─────────────────────────────────────────────────────────────────┤
│  QUICK FILTERS: [All] [Critical] [Scheduled] [In Progress]     │
├─────────────────────────────────────────────────────────────────┤
│  WORK ORDER LIST                                         [+New] │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Priority | Vehicle | Service Type | Mechanic | Status | Due││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ 🔴 P0   │ TRC-001│ Coolant Fault│ John Doe│IN_PROG│Overdue││
│  │ 🟡 P1   │ TRK-045│ Oil Change   │ Unassign│SCHEDUL│ Today ││
│  │ 🟢 P2   │ CAR-012│ Brake Inspec │ Jane S. │SCHEDUL│ 5 days││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  FLEET HEALTH MAP                                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [Interactive Map: Vehicles color-coded by health score]    ││
│  │  🔴 <50 (critical) | 🟡 50-75 (warning) | 🟢 >75 (healthy) ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**KPI Metric Cards:**

1. **Overdue Work Orders**
   - Count of `maintenance` where `scheduledDate < current_date AND status IN (SCHEDULED, ASSIGNED)`
   - Trend indicator: ↑ if count increased vs last week
   - Click → filter list to overdue only

2. **Due Today**
   - Count where `scheduledDate = current_date`
   - Click → filter to today's schedule

3. **Upcoming (7 Days)**
   - Count where `scheduledDate BETWEEN current_date AND current_date + 7`
   - Click → filter to upcoming

4. **Active Work Orders**
   - Count where `status = IN_PROGRESS`
   - Avg completion time displayed as subtext
   - Click → filter to active only

5. **Fleet Health Score (Aggregate)**
   - Average health score across all active vehicles
   - Calculated from: fault count, overdue maintenance, telemetry anomalies
   - Display: large circular progress indicator (0-100)
   - Color zones: 0-50 red, 51-75 amber, 76-100 green

6. **Maintenance Compliance Rate**
   - Percentage: (completed_on_time / total_scheduled) * 100
   - Historical trend sparkline (30-day)

**Work Order List Features:**

- **Sortable Columns:** Priority, Due Date, Vehicle, Mechanic, Status
- **Inline Actions:**
  - Assign Mechanic (dropdown selector)
  - View Details (slide-out drawer)
  - Quick Edit (change scheduled date, add notes)
  - Cancel (requires reason)
- **Bulk Actions:**
  - Select multiple → Assign to mechanic/service company
  - Select multiple → Export to CSV/PDF
  - Select multiple → Reschedule (batch date change)
- **Search & Filters:**
  - Text search: vehicle plate, service type, mechanic name
  - Date range picker: show work orders within custom range
  - Vehicle type filter: TRACTOR, TRUCK, CAR, etc.
  - Status filter: multi-select (SCHEDULED + ASSIGNED)
  - Severity filter: CRITICAL, HIGH, MEDIUM, LOW

**Fleet Health Map:**
- Same Leaflet map as dashboard, but vehicles color-coded by health score
- Click vehicle → popup with:
  - Health score breakdown (faults, overdue maintenance, telemetry alerts)
  - Quick action: "Schedule Maintenance"
- Filter by health zone: show only critical vehicles (<50 score)

### 5.2 Maintenance Calendar View

**Route:** `/maintenance/calendar`

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│  MAINTENANCE CALENDAR                           [Month] [Week]  │
├─────────────────────────────────────────────────────────────────┤
│  < May 2026 >                                                   │
│  ┌───────┬───────┬───────┬───────┬───────┬───────┬───────┐     │
│  │  Mon  │  Tue  │  Wed  │  Thu  │  Fri  │  Sat  │  Sun  │     │
│  ├───────┼───────┼───────┼───────┼───────┼───────┼───────┤     │
│  │   1   │   2   │   3   │   4   │   5   │   6   │   7   │     │
│  │       │ 🔴3WO │       │ 🟡1WO │       │       │       │     │
│  ├───────┼───────┼───────┼───────┼───────┼───────┼───────┤     │
│  │   8   │   9   │  10   │  11   │  12   │  13   │  14   │     │
│  │ 🟢2WO │       │ 🔴5WO │       │       │       │       │     │
│  └───────┴───────┴───────┴───────┴───────┴───────┴───────┘     │
├─────────────────────────────────────────────────────────────────┤
│  SELECTED DAY: May 10, 2026                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 08:00 - TRC-001 - Oil Change - John Doe - SCHEDULED        ││
│  │ 10:00 - TRK-045 - Brake Service - Jane Smith - IN_PROGRESS ││
│  │ 14:00 - CAR-012 - Annual Inspection - UNASSIGNED           ││
│  │ [+] Add Maintenance                                         ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Features:**

- **Drag & Drop Rescheduling:** Drag work order card to different date → updates `scheduledDate`
- **Color Coding by Severity:**
  - Red dot = CRITICAL severity
  - Amber dot = HIGH severity
  - Green dot = MEDIUM/LOW severity
- **Mechanic View Filter:** Show only work orders assigned to specific mechanic
- **Resource Capacity Indicator:**
  - Display mechanic availability: if John Doe has 8 hours of work scheduled on May 10, calendar shows "John: 100% capacity"
  - Prevent over-scheduling: warn if assigning beyond mechanic's daily capacity
- **Recurring Maintenance Setup:**
  - Click "Add Recurring" → define interval (e.g., oil change every 3 months)
  - System auto-generates scheduled work orders for next 12 months
  - Stored as template in maintenance table with `recurring: true` flag in metadata

### 5.3 Vehicle Maintenance Detail Page

**Route:** `/vehicles/[id]/maintenance`

**Purpose:** Deep dive into single vehicle's maintenance history, health, and upcoming services.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│  VEHICLE: TRC-001 - John Deere 8R - Plate: ABC-1234            │
├─────────────────────────────────────────────────────────────────┤
│  HEALTH OVERVIEW                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │ Health Score │ │ Active Faults│ │Last Service  │           │
│  │      72      │ │      2       │ │  14 days ago │           │
│  │   🟡 FAIR    │ │  ⚠️ WARNING  │ │ Oil Change   │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
├─────────────────────────────────────────────────────────────────┤
│  TABS: [Upcoming] [History] [Faults] [Telemetry Trends]       │
├─────────────────────────────────────────────────────────────────┤
│  === UPCOMING MAINTENANCE ===                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Due in 3 days: Brake Inspection - SCHEDULED - Unassigned   ││
│  │ Due in 12 days: 50K km Service - SCHEDULED - John Doe      ││
│  │ [+] Schedule New Service                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  === ACTIVE FAULTS ===                                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ P0171 - System Too Lean (Bank 1) - MEDIUM - 5 days ago     ││
│  │   └─ Linked Work Order: Fuel System Diagnostic - ASSIGNED  ││
│  │ P0420 - Catalyst Efficiency Below Threshold - LOW - 2 days ││
│  │   └─ No work order yet [Create Maintenance]                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  === MAINTENANCE HISTORY (Last 6 months) ===                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Apr 10, 2026 - Oil Change - $85 - John Doe - COMPLETED     ││
│  │ Mar 5, 2026 - Tire Rotation - $50 - Jane Smith - COMPLETED ││
│  │ Jan 20, 2026 - Annual DOT Inspection - $120 - External Co. ││
│  │ [View Full History]                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  === TELEMETRY TRENDS (30 days) ===                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ [Line Chart: Engine Temp, Oil Pressure, Fuel Efficiency]   ││
│  │  • Engine temp: stable ~85°C (normal)                       ││
│  │  • Oil pressure: declining trend (⚠️ watch)                 ││
│  │  • Fuel efficiency: -8% vs baseline (investigate)           ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**

1. **Health Score Breakdown (Click to Expand):**
   - Fault Impact: 2 active faults = -15 points
   - Overdue Maintenance: 0 overdue = +0 penalty
   - Telemetry Anomalies: Oil pressure declining = -10 points
   - Operational Stress: Hard usage detected = -3 points
   - **Total Score: 72/100**

2. **Fault Timeline View:**
   - Visual timeline of fault occurrence over past 90 days
   - Clusters indicate recurring issues
   - Click fault → view linked work orders, telemetry at fault time

3. **Predictive Insights Panel:**
   - "Based on current trends, oil change will be due in 18 days (est. odometer: 50,200 km)"
   - "Fuel efficiency declining; recommend injector cleaning within 2 weeks"

4. **Quick Actions:**
   - Schedule Maintenance (opens creation modal)
   - Request Diagnostic Report (generates PDF with all fault/telemetry data)
   - View Maintenance Costs (chart of costs over time)

### 5.4 Maintenance Analytics Dashboard

**Route:** `/maintenance/analytics`

**Purpose:** High-level insights for fleet managers and executives.

**Sections:**

1. **Cost Analysis**
   - **Total Maintenance Spend:** Monthly/quarterly/yearly
   - **Cost per Vehicle:** Identify high-cost vehicles
   - **Cost by Category:** Engine, Brakes, Electrical, etc. (pie chart)
   - **Preventive vs Reactive:** % of maintenance that was scheduled vs fault-triggered
   - **Trend:** Cost per km/mile (efficiency metric)

2. **Downtime Analysis**
   - **Total Downtime:** Sum of (completedAt - scheduledDate) for all completed maintenance
   - **Downtime by Vehicle Type:** TRACTOR vs TRUCK vs CAR
   - **Downtime Causes:** Fault-related vs scheduled maintenance
   - **Cost of Downtime:** Estimated revenue loss (if trip data integrated)

3. **Mechanic Performance**
   - **Completion Rate:** % of assigned work orders completed on time
   - **Average Repair Time:** By mechanic, by service type
   - **Cost Accuracy:** Estimated vs actual cost variance
   - **Workload Distribution:** Chart showing work order distribution across mechanics (identify overloaded/underutilized)

4. **Fleet Health Trends**
   - **Health Score Over Time:** Line chart for entire fleet (30/90 days)
   - **Vehicles at Risk:** List of vehicles with declining health scores
   - **Fault Frequency:** Most common fault codes across fleet (bar chart)
   - **Compliance Rate:** % of vehicles with up-to-date maintenance

5. **Predictive Insights**
   - **Upcoming Maintenance Surge:** "35 oil changes due in next 30 days" (capacity planning)
   - **High-Risk Vehicles:** Vehicles with health score <50 + overdue maintenance
   - **Cost Forecast:** Predicted maintenance spend for next quarter based on historical data

---

## 6. Scheduling & Assignment Architecture

### 6.1 Scheduling Strategies

**Strategy 1: Fixed Interval Scheduling**
- As described in Section 2.2: time/mileage/engine hours based
- Background job creates work orders automatically
- Fleet manager reviews and assigns

**Strategy 2: Condition-Based Scheduling**
- Triggered by telemetry thresholds:
  - Oil pressure < 20 psi for 3 consecutive readings → schedule oil system check
  - Engine temp > 105°C twice in 7 days → schedule cooling system service
  - Battery voltage < 12.0V → schedule battery replacement
- Stored as alert rules in Redis or DB:
  ```json
  {
    "rule_id": "R001",
    "condition": "oilPressure < 20",
    "consecutive_count": 3,
    "action": "create_maintenance",
    "service_type": "Oil System Check",
    "severity": "HIGH"
  }
  ```

**Strategy 3: Fault-Reactive Scheduling**
- Immediate work order creation on CRITICAL faults (as in Section 2.1)
- Delayed work order creation on MEDIUM/LOW faults if recurrence detected

**Strategy 4: Manual Scheduling**
- Fleet manager creates custom work order via UI
- Flexible: any service type, any vehicle, any date

**Strategy 5: Batch Scheduling (Efficiency Optimization)**
- Scenario: 15 vehicles due for oil change in next 30 days
- System suggests: "Schedule all 15 for same week to optimize mechanic utilization"
- Algorithm:
  1. Group vehicles by geographic cluster (from status.latitude/longitude)
  2. Identify shared maintenance types
  3. Propose consolidated schedule (e.g., Mon: 5 tractors, Tue: 10 trucks)
  4. Fleet manager approves or tweaks

### 6.2 Assignment Logic Deep Dive

**Assignment Decision Tree:**

```
New Work Order Created (status = SCHEDULED)
│
├─ Is there a persistent assignment rule matching this work order?
│  (e.g., "All TRACTOR brake services → Mechanic John")
│  └─ YES → Auto-assign to John, status = ASSIGNED, notify John
│  └─ NO → Continue
│
├─ Is severity = CRITICAL?
│  └─ YES → Trigger smart assignment (highest-skilled available mechanic)
│  └─ NO → Leave unassigned, await manual assignment
│
└─ Fleet manager manually assigns via UI
```

**Smart Assignment Scoring Algorithm:**

```python
def calculate_mechanic_score(mechanic, work_order):
    score = 100  # Start with perfect score
    
    # Skill match
    required_skill = work_order.get_required_skill()  # e.g., "OBD_DIAGNOSTICS"
    if required_skill not in mechanic.skills:
        score -= 30  # Heavy penalty for skill mismatch
    
    # Workload penalty
    current_workload = mechanic.get_active_work_orders_count()
    score -= (current_workload * 5)  # -5 points per active work order
    
    # Distance penalty (if mechanic has base location)
    distance_km = calculate_distance(mechanic.location, work_order.vehicle.location)
    score -= (distance_km * 0.5)  # -0.5 points per km
    
    # Availability (calendar integration)
    if not mechanic.is_available_on(work_order.scheduled_date):
        score -= 50  # Major penalty if unavailable
    
    # Performance bonus (historical)
    completion_rate = mechanic.get_on_time_completion_rate()
    score += (completion_rate * 10)  # Up to +10 points for 100% on-time rate
    
    return max(score, 0)  # Floor at 0

# Select mechanic with highest score
best_mechanic = max(available_mechanics, key=lambda m: calculate_mechanic_score(m, wo))
```

**Assignment to Service Companies:**

- Fleet manager selects service company instead of individual mechanic
- Work order `serviceCompanyId` is set, `mechanicId` remains NULL
- Service company's admin (user with `companyId = service_company.id` and `role = ADMIN`) logs into their portal
- They see all work orders assigned to their company
- They internally assign to their mechanics (creates `vehicle_access` record for mechanic, updates `mechanicId`)

**Bulk Assignment Flows:**

1. **Filter-Based:**
   - UI: Select filters (vehicle type = TRUCK, service type = "Oil Change")
   - Action: "Assign all to Mechanic Jane"
   - System: Updates all matching `SCHEDULED` work orders, sets `mechanicId = Jane.id`, `status = ASSIGNED`

2. **Rule-Based (Persistent):**
   - Create rule: "All future brake services on TRACTOR vehicles → assign to Mechanic Bob"
   - Stored in new `assignment_rules` table (or Redis cache):
     ```sql
     {
       "rule_id": "AR-001",
       "vehicle_type": "TRACTOR",
       "service_type_pattern": "%brake%",
       "mechanic_id": 123,
       "is_active": true
     }
     ```
   - On work order creation, check rules → auto-assign if match

### 6.3 Notification & Escalation Flows

**Notification Triggers:**

| Event | Recipient | Channel | Content |
|-------|-----------|---------|---------|
| Work order assigned | Mechanic | Email + In-app | "New work order: TRC-001 Oil Change, due May 27" |
| Work order overdue | Fleet Manager | Email + In-app | "5 work orders overdue, total downtime: 12 days" |
| CRITICAL fault detected | Fleet Manager + Mechanic | Email + SMS | "URGENT: P0300 Multiple Cylinder Misfire on TRC-001" |
| Work order completed | Fleet Manager | In-app | "John Doe completed Oil Change on TRC-001, cost: $85" |
| Maintenance due (7 days) | Fleet Manager | In-app | "TRC-001 oil change due in 7 days, currently unassigned" |
| Parts on hold | Mechanic + Fleet Manager | Email | "Work order paused: awaiting brake pads for TRK-045" |

**Escalation Workflow:**

```
Work Order Overdue by 7 days
│
├─ Send reminder to assigned mechanic
│  └─ Mechanic responds with status update → Escalation ends
│  └─ No response in 24 hours → Continue
│
├─ Notify Fleet Manager
│  └─ Fleet Manager reviews, reassigns, or cancels
│  └─ No action in 48 hours → Continue
│
├─ Escalate to Company Admin/Owner
│  └─ Admin takes action
│  └─ Log escalation in audit_log
```

**Implementation:**
- Scheduled job runs every 6 hours
- Queries `maintenance` where `status IN (SCHEDULED, ASSIGNED) AND scheduledDate < current_date - interval '7 days'`
- For each, check escalation state (stored in metadata or separate table)
- Send notifications via email queue (existing Nodemailer) + create in-app alerts

---

## 7. Real-Time & Redis Strategy

### 7.1 Real-Time Data Needs

**What Needs to be Real-Time:**

1. **Live Vehicle Health Status**
   - As telemetry streams in → update health score in Redis cache
   - Dashboard/map polls health scores every 30s (or use SSE/WebSocket for push)

2. **Work Order Status Updates**
   - Mechanic marks work as IN_PROGRESS → broadcast to fleet manager dashboard
   - Use Redis pub/sub: `PUBLISH maintenance:updates {workOrderId, newStatus, timestamp}`
   - Dashboard subscribes to channel, updates UI on receive

3. **Fault Alerts**
   - OBD fault event → immediate alert to fleet manager
   - Use existing Redis pub/sub `live_map_updates` or create dedicated `fault_alerts` channel

4. **Mechanic Location Tracking (Future)**
   - Mobile app sends mechanic GPS coordinates
   - Cache in Redis: `SET mechanic:{mechanic_id}:location {lat, lng, timestamp}`
   - Fleet manager sees mechanic locations on map (optimize dispatch)

**What Can Be Cached/Periodic:**

1. **Maintenance History**
   - Historical data, fetched from DB on page load
   - Cache in Redis for 5-10 minutes: `GET maintenance:history:{vehicleId}`

2. **Analytics Dashboard Data**
   - Aggregated metrics, updated every 30 minutes via cron
   - Cache in Redis: `GET maintenance:analytics:monthly`

3. **Assignment Rules**
   - Rarely change, load on server startup, cache indefinitely
   - Invalidate on rule update

### 7.2 Redis Data Structures

**Health Scores:**
```
Key: fleet:health:{vehicleId}
Type: Hash
TTL: 300s (5 min, refreshed on telemetry update)
Fields:
  score: 72
  fault_count: 2
  overdue_count: 0
  last_updated: 2026-05-25T14:30:00Z
```

**Work Order Status Cache:**
```
Key: maintenance:wo:{workOrderId}
Type: Hash
TTL: 600s (10 min)
Fields:
  status: IN_PROGRESS
  mechanic_id: 123
  scheduled_date: 2026-05-27
  priority: P1
```

**Active Faults (Fast Lookup):**
```
Key: vehicle:faults:{vehicleId}
Type: Sorted Set (score = detectedAt timestamp)
Members: fault_code:severity (e.g., "P0171:MEDIUM")
TTL: None (persist until fault cleared)
```

**Assignment Rules:**
```
Key: maintenance:rules:assignments
Type: Hash
Fields:
  rule:AR-001: JSON(rule_config)
  rule:AR-002: JSON(rule_config)
```

**Notification Queue:**
```
Key: notifications:queue
Type: List (LPUSH/RPOP)
Items: JSON({type, recipient, message, timestamp})
Background worker consumes queue, sends emails/SMS
```

### 7.3 Cache Invalidation Strategy

**Trigger-Based Invalidation:**
- Work order status change → delete `maintenance:wo:{id}`, publish update to pub/sub
- Telemetry update → recalculate health score, update `fleet:health:{vehicleId}`
- Fault cleared → remove from `vehicle:faults:{vehicleId}` sorted set

**TTL-Based Expiry:**
- Analytics data: 1800s (30 min)
- Health scores: 300s (5 min)
- Work order cache: 600s (10 min)

**Manual Invalidation:**
- On bulk assignment: delete all affected `maintenance:wo:{id}` keys
- On rule update: delete `maintenance:rules:assignments`, reload from DB

---

## 8. Reporting & Export Features

### 8.1 Report Types

**1. Maintenance Summary Report**
- **Scope:** Fleet-wide or per vehicle
- **Time Range:** Daily/Weekly/Monthly/Quarterly/Yearly
- **Content:**
  - Total work orders completed
  - Total cost
  - Downtime hours
  - Cost per vehicle
  - Most common service types (pie chart)
  - Cost trend (line chart over time)
- **Export:** PDF (formatted with charts), CSV (raw data)

**2. Vehicle Health Report**
- **Scope:** Single vehicle or fleet
- **Content:**
  - Current health score + breakdown
  - Active faults list
  - Maintenance compliance status
  - Telemetry trends (30/90 days)
  - Recommended actions (based on predictive model)
- **Export:** PDF only (includes charts & maps)

**3. Mechanic Performance Report**
- **Scope:** Single mechanic or all mechanics
- **Time Range:** Weekly/Monthly/Quarterly
- **Content:**
  - Work orders completed
  - On-time completion rate
  - Average repair time
  - Cost accuracy (estimated vs actual)
  - Customer satisfaction (if feedback collected)
- **Export:** PDF + CSV

**4. Fault Analysis Report**
- **Scope:** Fleet-wide
- **Time Range:** 30/90/180 days
- **Content:**
  - Most common fault codes (bar chart)
  - Fault recurrence patterns (same code, same vehicle)
  - Fault resolution time
  - Cost of fault-related repairs
  - Preventive maintenance impact (fault rate before/after scheduled services)
- **Export:** PDF + CSV

**5. Compliance Report**
- **Scope:** Fleet-wide
- **Content:**
  - Vehicles with overdue maintenance (list)
  - Compliance rate by vehicle type
  - Regulatory inspection status (DOT, emissions, etc.)
  - License/certification expiry (driver licenses, mechanic certs)
- **Export:** PDF (for regulatory submission)

**6. Cost-Benefit Analysis Report**
- **Purpose:** ROI of maintenance program
- **Content:**
  - Preventive maintenance cost vs reactive repair cost
  - Downtime reduction (before/after implementing scheduled maintenance)
  - Fuel efficiency gains (properly maintained vehicles)
  - Extended vehicle lifespan (estimated)
- **Export:** PDF (executive summary format)

### 8.2 Scheduled Reports

**Implementation:**
- New table: `scheduled_reports` (or metadata in existing reports structure)
  ```sql
  {
    "report_id": "SR-001",
    "report_type": "MAINTENANCE_SUMMARY",
    "frequency": "WEEKLY",  // DAILY, WEEKLY, MONTHLY
    "delivery_day": "Monday",
    "delivery_time": "08:00",
    "recipients": ["manager@fleet.com", "admin@fleet.com"],
    "format": "PDF",
    "is_active": true
  }
  ```
- Cron job triggers report generation, emails PDF to recipients
- Recipients receive: "Your weekly maintenance summary for Fleet XYZ is attached"

### 8.3 Export Features

**CSV Export:**
- Work order list → CSV with columns: vehicle, service type, mechanic, cost, status, scheduled date, completed date
- Fault history → CSV: fault code, description, detected date, cleared date, vehicle, severity

**PDF Export:**
- Use library: jsPDF (client-side) or Puppeteer (server-side, headless Chrome)
- Template: company logo, report title, date range, data tables, charts (rendered as images)
- Work order detail PDF: includes vehicle info, service description, parts used, before/after photos, mechanic signature (future: digital signature)

**Excel Export:**
- Use existing xlsx skill/library
- Multi-sheet workbook:
  - Sheet 1: Summary
  - Sheet 2: Work Orders (all data)
  - Sheet 3: Cost Breakdown
  - Sheet 4: Charts (embedded)

---

## 9. Filtering & Search Architecture

### 9.1 Work Order Filtering

**Filter Dimensions:**

1. **Status:** Multi-select (SCHEDULED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
2. **Severity:** Multi-select (CRITICAL, HIGH, MEDIUM, LOW)
3. **Date Range:** Scheduled date, completed date, created date (date picker)
4. **Vehicle:** Autocomplete search (plate number, make/model)
5. **Vehicle Type:** Multi-select (TRACTOR, TRUCK, CAR, BUS)
6. **Mechanic:** Dropdown (all mechanics + "Unassigned")
7. **Service Type:** Text search or dropdown (Oil Change, Brake Service, etc.)
8. **Service Company:** Dropdown (for external services)
9. **Overdue:** Boolean toggle (show only overdue)
10. **Fault-Related:** Boolean toggle (show only maintenance linked to faults)

**Implementation:**

- **Frontend:** Filter state in React (useState), debounced API call on filter change
- **Backend:** Dynamic query builder
  ```javascript
  let query = prisma.maintenance.findMany({
    where: {
      companyId: session.companyId,
      ...(filters.status?.length && { status: { in: filters.status } }),
      ...(filters.vehicleType?.length && { vehicle: { Type: { in: filters.vehicleType } } }),
      ...(filters.mechanicId && { mechanicId: filters.mechanicId }),
      ...(filters.overdue && { scheduledDate: { lt: new Date() }, status: { in: ['SCHEDULED', 'ASSIGNED'] } }),
      ...(filters.dateRange && { 
        scheduledDate: { 
          gte: filters.dateRange.start, 
          lte: filters.dateRange.end 
        } 
      }),
    },
    include: { vehicle: true, mechanic: true },
    orderBy: filters.sortBy || { scheduledDate: 'asc' },
  });
  ```

**Performance:**
- Index on: `(companyId, status, scheduledDate)`, `(vehicleId, status)`, `(mechanicId, status)`
- For large fleets (>10,000 vehicles), implement pagination + cursor-based navigation

### 9.2 Vehicle Health Filtering

**Use Case:** "Show me all vehicles with health score < 50 and overdue maintenance"

**Filter Options:**

1. **Health Score Range:** Slider (0-100)
2. **Active Fault Count:** Min/max input
3. **Overdue Maintenance:** Boolean
4. **Vehicle Type:** Multi-select
5. **Location:** Geofence (draw on map or select radius around point)

**Implementation:**

- Health scores cached in Redis (Section 7.2)
- API endpoint: `/api/fleet/health/filter`
  ```javascript
  // Fetch health scores from Redis
  const vehicleHealthKeys = await redis.keys('fleet:health:*');
  const healthScores = await Promise.all(
    vehicleHealthKeys.map(k => redis.hgetall(k))
  );
  
  // Filter by criteria
  const filtered = healthScores.filter(h => 
    h.score >= filters.minScore && 
    h.score <= filters.maxScore &&
    (filters.overdueOnly ? h.overdue_count > 0 : true)
  );
  
  // Fetch full vehicle details from DB
  const vehicleIds = filtered.map(h => h.vehicleId);
  const vehicles = await prisma.vehicle.findMany({
    where: { id: { in: vehicleIds }, Type: { in: filters.vehicleTypes } },
    include: { status: true, alerts: { where: { isResolved: false } } },
  });
  ```

### 9.3 Fault Search & Analysis

**Search Features:**

1. **Fault Code Search:** Input field, autocomplete from `fault_code_definitions`
2. **System Type Filter:** Dropdown (ENGINE, TRANSMISSION, ABS, etc.)
3. **Severity Filter:** Multi-select
4. **Date Range:** Detected date, cleared date
5. **Vehicle Search:** Plate number, VIN
6. **Active Only:** Boolean (show only uncleared faults)
7. **Recurrence Detection:** "Show faults that occurred 3+ times in past 30 days"

**Advanced Analysis:**

- **Pattern Search:** "Find vehicles with P0171 AND P0300 within 14 days of each other"
  - Requires temporal join query:
    ```sql
    SELECT v1.vehicleId, v1.faultCode as code1, v2.faultCode as code2, 
           v1.detectedAt as date1, v2.detectedAt as date2
    FROM vehicle_faults v1
    JOIN vehicle_faults v2 ON v1.vehicleId = v2.vehicleId
    WHERE v1.faultCode = 'P0171' AND v2.faultCode = 'P0300'
      AND ABS(DATEDIFF(v1.detectedAt, v2.detectedAt)) <= 14
    ```

- **Fault Clustering:** Group vehicles by similar fault patterns (ML-based, future enhancement)

---

## 10. Mobile & Field Mechanic Experience

### 10.1 Mobile Portal Requirements

**Target Users:** Mechanics working in the field (at vehicle locations, not at desks)

**Core Features:**

1. **Work Order List (Mobile-Optimized)**
   - Card-based layout (not table)
   - Swipe actions: Swipe left to "Start Work", swipe right to "View Details"
   - Priority badges (color-coded: red, amber, green)
   - Distance to vehicle (if mechanic location tracked)

2. **Work Order Detail (Mobile)**
   - Vehicle info at top: plate, make/model, location map (tap to open navigation app)
   - Service description (large, readable font)
   - Fault codes with expandable descriptions
   - **Action Buttons (Bottom Sheet):**
     - Start Work (one-tap)
     - Add Notes (voice-to-text support)
     - Log Parts (barcode scanner for part numbers, future)
     - Upload Photos (camera integration)
     - Complete Work (requires cost & labor input)
   - Offline support: cache work order details, queue updates for sync when online

3. **Photo Upload Flow**
   - Take photo → auto-tag as "Before" or "After"
   - Compress image before upload (reduce bandwidth)
   - Store in cloud storage (S3, Cloudinary), save URL in `maintenance.metadata`

4. **Voice Notes**
   - Mechanic speaks diagnostic notes
   - Transcribe via Web Speech API or external service (Google Cloud Speech-to-Text)
   - Append to `maintenance.notes`

5. **Navigation Integration**
   - Tap vehicle location → open in Google Maps / Apple Maps / Waze (user choice)
   - Calculate route from mechanic's current location

6. **Push Notifications**
   - New work order assigned → push notification with sound/vibration
   - Work order rescheduled → notification
   - Fleet manager message → notification
   - Implement via Firebase Cloud Messaging (FCM) or native push

### 10.2 Offline Capabilities

**Scenario:** Mechanic at remote site with poor/no connectivity.

**Offline-First Architecture:**

1. **Service Worker + Cache API**
   - Cache work order data, vehicle info, fault definitions
   - Store pending updates in IndexedDB
   - On reconnect, sync to server (POST queued updates)

2. **Conflict Resolution**
   - If work order status changed on server while mechanic offline:
     - Detect conflict on sync
     - Show diff to mechanic: "Server shows IN_PROGRESS, your local is COMPLETED. Which is correct?"
     - Mechanic resolves, system logs conflict in audit_log

3. **Limited Offline Actions**
   - Can: View work orders, add notes, take photos
   - Cannot: Assign work orders, view real-time telemetry (requires server)

### 10.3 Barcode/QR Code Integration (Future)

**Use Cases:**

1. **Vehicle Identification**
   - QR code sticker on vehicle (encodes vehicleId)
   - Mechanic scans → auto-loads vehicle info, work orders, fault history
   - Eliminates manual search/typing

2. **Part Logging**
   - Part packaging has barcode (standard UPC or custom)
   - Scan → auto-fill part name, number, cost (lookup from parts catalog)
   - Add to `maintenance.metadata.parts_used`

3. **Signature Capture**
   - Digital signature pad (canvas element)
   - Mechanic signs on completion
   - Store signature as image, attach to work order
   - Useful for warranty claims, audit trails

---

## 11. Enterprise Scalability & Performance

### 11.1 Large Fleet Considerations

**Challenges at Scale (10,000+ vehicles):**

1. **Dashboard Load Times**
   - Problem: Fetching all vehicle statuses + health scores is slow
   - Solution:
     - Pagination: Load 50 vehicles at a time, infinite scroll
     - Health score pre-computation: Cron job calculates scores every 5 min, caches in Redis
     - Map clustering: Group nearby vehicles into clusters (Leaflet.markercluster plugin)

2. **Work Order Volume**
   - Problem: 10,000 vehicles × 4 maintenance events/year = 40,000 work orders/year
   - Solution:
     - Database partitioning: Partition `maintenance` table by year (historical data separate from active)
     - Archival: Move COMPLETED/CANCELLED work orders older than 2 years to archive table
     - Search indexing: Full-text search on description (MySQL FULLTEXT or Elasticsearch)

3. **Real-Time Updates**
   - Problem: Broadcasting every telemetry update to all connected clients is bandwidth-heavy
   - Solution:
     - Selective subscriptions: Clients subscribe only to vehicles they're viewing
     - Redis pub/sub channels per vehicle: `vehicle:{vehicleId}:updates`
     - Rate limiting: Throttle updates to max 1 per second per vehicle

4. **Mechanic Assignment at Scale**
   - Problem: Smart assignment algorithm becomes slow with 500+ mechanics
   - Solution:
     - Pre-filter mechanics by geographic zone (divide fleet into regions)
     - Cache mechanic availability in Redis (updated on assignment/completion)
     - Use priority queue (heap) to quickly find top-scored mechanic

### 11.2 Database Optimization

**Query Optimization:**

1. **Composite Indexes (Already in Schema):**
   - `(vehicleId, status, scheduledDate)` on maintenance → fast filtering
   - `(vehicleId, timestamp)` on telemetry_data → fast time-series queries

2. **Materialized Views (MariaDB 10.5+):**
   - Create view for "active work orders with vehicle details":
     ```sql
     CREATE VIEW active_maintenance AS
     SELECT m.*, v.plateNumber, v.make, v.model, u.name as mechanicName
     FROM maintenance m
     JOIN vehicle v ON m.vehicleId = v.id
     LEFT JOIN user u ON m.mechanicId = u.id
     WHERE m.status IN ('SCHEDULED', 'ASSIGNED', 'IN_PROGRESS');
     ```
   - Query view instead of joining tables repeatedly

3. **Read Replicas:**
   - For large fleets, use MariaDB replication
   - Master: Write operations (create/update work orders)
   - Replicas: Read operations (dashboard, reports)
   - Prisma supports read replicas via connection strings

4. **Data Archival:**
   - Cron job monthly: Move completed work orders older than 24 months to `maintenance_archive` table
   - Keeps primary table lean, improves query performance
   - Archive still queryable for historical reports

### 11.3 Caching Strategy at Scale

**Multi-Tier Caching:**

1. **L1 Cache: In-Memory (Node.js Process)**
   - Very hot data: assignment rules, fault code definitions
   - Loaded on server startup, invalidated on update
   - Use Map or LRU cache (node-cache library)

2. **L2 Cache: Redis**
   - Hot data: health scores, work order summaries, vehicle statuses
   - TTL: 1-10 minutes
   - Shared across all server instances (for horizontal scaling)

3. **L3 Cache: Database Query Results**
   - Expensive aggregations (analytics dashboard data)
   - Cache for 30 minutes
   - Use Redis or dedicated cache layer (Memcached)

**Cache Warming:**
- On server startup, pre-populate critical caches:
  - Load all assignment rules into L1
  - Pre-calculate today's work order counts, store in Redis
- Prevents "cold start" latency on first requests

---

## 12. Integration with Existing Platform Components

### 12.1 Dashboard Integration

**Changes to Main Dashboard (`/dashboard`):**

1. **Add Maintenance Widget:**
   - Position: Below "Active Alerts" panel
   - Content: "5 Maintenance Due Today" with red/amber/green indicator
   - Click → navigate to `/maintenance`

2. **Alert Panel Updates:**
   - Current alert panel already shows maintenance alerts (via `alert` table)
   - Enhance: Add "Assign Mechanic" quick action button on MAINTENANCE_DUE alerts
   - Click → opens assignment modal, creates work order if doesn't exist

3. **Vehicle Status Indicators:**
   - On fleet map, add health score overlay
   - Marker color: Green (healthy), Amber (warning), Red (critical)
   - Click marker → popup shows health score + "View Maintenance" link

### 12.2 Vehicle Detail Page Integration

**Current Page:** `/vehicles/[id]`

**Add Tab:** "Maintenance" (alongside Map, Telemetry History)

**Tab Content:**
- Upcoming maintenance (next 3 services)
- Recent maintenance history (last 5 services)
- Active faults linked to this vehicle
- Quick action: "Schedule New Service"

**Telemetry Tab Enhancement:**
- Overlay maintenance events on telemetry charts
- Example: Engine temp chart with markers at "Oil Change on Apr 10" → shows impact of service on telemetry

### 12.3 Alerts Integration

**Current Alert System:**
- Already supports `type: MAINTENANCE_DUE` and `isMaintenanceRelated: true`

**Enhancements:**

1. **Auto-Link Alerts to Work Orders:**
   - When maintenance is created for a fault, set `alert.maintenanceId`
   - Alert detail view shows "Linked Work Order: #WO-12345, Status: IN_PROGRESS"

2. **Alert Resolution via Maintenance:**
   - When work order for a fault is COMPLETED, auto-resolve linked alert
   - Set `alert.isResolved = true`, `resolvedAt = current_timestamp`

3. **Escalation Alerts:**
   - If work order overdue by 7+ days, create new alert:
     - `type: MAINTENANCE_DUE`
     - `severity: HIGH` (escalated from original MEDIUM)
     - `message: "Work order #WO-123 is 7 days overdue"`

### 12.4 Reporting Integration

**Current Reports Hub:** `/reports`

**Add Maintenance Reports Section:**
- New card: "Maintenance Reports"
- Links to:
  - Maintenance Summary
  - Vehicle Health Report
  - Mechanic Performance
  - Fault Analysis
- Integrate with existing report caching mechanism (5-min TTL)

---

## 13. Future Enhancements & Extensibility

### 13.1 Predictive Maintenance AI/ML

**Phase 1 (Rule-Based):**
- Current design: threshold-based triggers (oil pressure < 20 psi → alert)

**Phase 2 (ML Models):**
- **Failure Prediction Model:**
  - Input features: telemetry trends (30-day rolling avg), fault history, vehicle age, mileage, usage patterns
  - Output: Probability of component failure in next 30/60/90 days
  - Model: Random Forest or Gradient Boosting (scikit-learn, TensorFlow)
  - Training data: historical maintenance records + telemetry leading up to failures
- **Anomaly Detection:**
  - Detect unusual telemetry patterns (e.g., gradual oil pressure decline over 14 days)
  - Model: Isolation Forest, Autoencoders (unsupervised learning)
  - Alert when anomaly score exceeds threshold
- **Cost Optimization:**
  - Recommend optimal maintenance intervals based on cost-benefit analysis
  - Model: Reinforcement learning (minimize total cost = maintenance cost + downtime cost)

**Implementation:**
- Separate Python service (FastAPI) for ML predictions
- Expose REST endpoint: `/predict/failure/{vehicleId}`
- Next.js backend calls ML service, caches predictions in Redis

### 13.2 IoT Sensor Expansion

**Current:** Basic OBD telemetry (engine RPM, temp, fuel)

**Future Sensors:**
- **Tire Pressure Monitoring (TPMS):** Alert on low pressure, recommend rotation/replacement
- **Brake Wear Sensors:** Predict brake pad life, schedule replacement before failure
- **DEF (Diesel Exhaust Fluid) Level:** Critical for emissions compliance, alert on low level
- **Refrigeration Temp (for reefer trucks):** Monitor cargo temperature, alert on deviations
- **Load Sensors (for cargo trucks):** Track cargo weight, prevent overloading, optimize fuel efficiency

**Integration:**
- Extend `custom_sensor` model (already in schema) to support these sensors
- Ingest data via same Redis pipeline as OBD telemetry
- Create sensor-specific alert rules

### 13.3 Warranty & Parts Management

**Warranty Tracking:**
- Add fields to `maintenance`: `isWarrantyCovered: boolean`, `warrantyClaimNumber: string`
- Track warranty expiry per vehicle (new field in `vehicle` table: `warrantyExpiresAt`)
- Report: "Warranty utilization rate" (% of maintenance covered by warranty)

**Parts Inventory:**
- New models: `parts_catalog`, `parts_inventory`, `parts_usage`
- Mechanic logs parts used → decrements inventory
- Low inventory alerts (e.g., "Oil filters below 10 units, reorder")
- Integration with suppliers: auto-generate purchase orders when inventory low

### 13.4 Telematics Video Integration

**Dashcam Footage:**
- Link video clips to fault events (e.g., harsh braking event → capture 30s video)
- Store URLs in `maintenance.metadata` or new `media` table
- Mechanic reviews video to diagnose driver behavior vs mechanical issue

**AI Video Analysis:**
- Detect distracted driving, lane departure, collision near-misses
- Create alerts, link to driver performance score

### 13.5 Customer/Driver Feedback

**Driver Maintenance Requests:**
- Mobile app for drivers (separate from mechanic portal)
- Driver reports issue: "Brake pedal feels soft"
- Creates maintenance request, fleet manager reviews & approves

**Post-Service Feedback:**
- After work order completion, send survey to driver: "Rate the service quality"
- Track mechanic satisfaction scores, use in performance reports

### 13.6 API & Third-Party Integrations

**Public API for Maintenance Data:**
- RESTful API (or GraphQL) for external systems
- Use cases:
  - Accounting software integration (sync maintenance costs to QuickBooks)
  - Fleet management platforms (integrate with Samsara, Geotab)
  - Insurance providers (provide maintenance compliance data for premium discounts)

**Webhook Support:**
- External systems subscribe to events: `maintenance.completed`, `fault.detected`
- System POSTs event data to subscriber URLs
- Useful for custom automation workflows

---

## 14. Implementation Roadmap (Phased Approach)

### Phase 1: Core Maintenance Workflows (6-8 weeks)

**Deliverables:**
1. Maintenance Dashboard (`/maintenance`) with KPI cards, work order list, filters
2. Work order CRUD (create, update, delete via API routes + UI)
3. Interval-based scheduling engine (cron job)
4. Fault-triggered work order creation
5. Mechanic assignment (manual + smart assignment v1)
6. Basic mechanic portal (`/mechanic`) with work order list & detail
7. Vehicle maintenance detail page (`/vehicles/[id]/maintenance`)
8. Integration with existing alerts system

**Database:**
- No schema changes (existing `maintenance` table is sufficient)
- Add indexes if not already present

**Redis:**
- Health score caching
- Work order status caching
- Pub/sub for real-time updates

### Phase 2: Scheduling & Calendar (4 weeks)

**Deliverables:**
1. Maintenance calendar view (`/maintenance/calendar`)
2. Drag-to-reschedule functionality
3. Recurring maintenance templates
4. Batch scheduling UI
5. Assignment rules (filter-based auto-assignment)
6. Escalation workflows (overdue notifications)

**Enhancements:**
- Email notifications (leverage existing Nodemailer)
- In-app notification bell (new component)

### Phase 3: Analytics & Reporting (4 weeks)

**Deliverables:**
1. Maintenance analytics dashboard (`/maintenance/analytics`)
2. Cost analysis, downtime analysis, mechanic performance reports
3. Fault analysis report
4. PDF export (jsPDF or Puppeteer integration)
5. Scheduled reports (email delivery)
6. Fleet health trends visualization

**Performance:**
- Optimize dashboard queries (N+1 fix)
- Implement report caching (Redis)

### Phase 4: OBD Intelligence & Predictive Maintenance (6 weeks)

**Deliverables:**
1. Enhanced fault analysis (recurrence detection, pattern matching)
2. Health scoring algorithm (multi-factor)
3. Predictive triggers (telemetry trend analysis)
4. Condition-based scheduling (threshold-based)
5. Vehicle health report (PDF)
6. Maintenance urgency scoring

**Technical:**
- Background worker for telemetry processing (separate Node.js process or serverless function)
- ML models (Phase 2 future, but prepare data pipeline)

### Phase 5: Mobile & Field Mechanic (4 weeks)

**Deliverables:**
1. Mobile-optimized mechanic portal (responsive UI)
2. Photo upload & compression
3. Voice notes (speech-to-text)
4. Offline support (service worker + IndexedDB)
5. Push notifications (FCM)
6. Navigation integration

**Testing:**
- Field testing with real mechanics
- Iterate based on feedback

### Phase 6: Service Company Management (3 weeks)

**Deliverables:**
1. Service company assignment flow
2. Service company portal (separate login, filtered view)
3. Multi-company support (if not already present)
4. External mechanic access control

**Database:**
- Leverage existing `companies` table with `serviceType: MECHANIC`
- No new models needed

### Phase 7: Polish & Optimization (Ongoing)

**Deliverables:**
1. Performance tuning (query optimization, caching)
2. UI/UX refinements (animations, skeleton states)
3. Accessibility improvements (WCAG compliance)
4. Security audit (rate limiting, input validation)
5. Load testing (simulate 10,000+ vehicles)
6. Documentation (user guides, API docs)

---

## 15. Key Performance Indicators (KPIs)

**Operational KPIs:**
1. **Maintenance Compliance Rate:** % of maintenance completed on time
   - Target: >90%
2. **Average Downtime per Vehicle:** Hours per month in maintenance
   - Target: <2 hours/month
3. **Cost per Vehicle per Month:** Total maintenance spend / vehicle count
   - Track trend: should decrease as preventive maintenance increases
4. **Fault Resolution Time:** Average hours from fault detection to clearance
   - Target: <24 hours for CRITICAL, <72 hours for HIGH
5. **Work Order Completion Rate:** % of assigned work orders completed within SLA
   - Target: >95%

**Predictive KPIs:**
1. **Preventive vs Reactive Ratio:** % of maintenance that was scheduled vs fault-triggered
   - Ideal: 70% preventive, 30% reactive (shift over time)
2. **Health Score Trend:** Fleet average health score over time
   - Goal: maintain >75
3. **Fault Recurrence Rate:** % of faults that reoccur within 30 days
   - Target: <10%

**Efficiency KPIs:**
1. **Mechanic Utilization:** % of mechanic work hours on billable work vs idle time
   - Target: >80%
2. **Assignment Accuracy:** % of auto-assignments that were not manually changed
   - Target: >70%
3. **Dashboard Load Time:** P95 latency for maintenance dashboard
   - Target: <2 seconds

---

## 16. Security & Access Control

### 16.1 Role-Based Permissions

**Permission Matrix:**

| Action | ADMIN | OWNER | USER (Fleet Mgr) | MECHANIC (Internal) | MECHANIC (External) |
|--------|-------|-------|------------------|---------------------|---------------------|
| View all work orders | ✅ | ✅ | ✅ (company vehicles only) | ❌ (assigned only) | ❌ (assigned only) |
| Create work order | ✅ | ✅ | ✅ | ❌ | ❌ |
| Assign mechanic | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update work order status | ✅ | ✅ | ✅ | ✅ (assigned only) | ✅ (assigned only) |
| View vehicle telemetry | ✅ | ✅ | ✅ | ✅ (if access granted) | ❌ |
| Delete work order | ✅ | ✅ | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage mechanics | ✅ | ✅ | ✅ | ❌ | ❌ |

**Implementation:**
- Middleware checks `session.user.role` before allowing action
- For mechanics, additionally check `vehicle_access` table:
  - If `userId = mechanic.id AND vehicleId = workOrder.vehicleId AND accessType IN (FULL, MAINTENANCE_ONLY)`
  - Then allow, else deny

### 16.2 Audit Logging

**Events to Log:**
- Work order created, updated, deleted (capture old/new values)
- Mechanic assigned, reassigned
- Fault code cleared (who, when, which fault)
- Bulk operations (e.g., "Assigned 15 work orders to John Doe")

**Implementation:**
- Already exists in `audit_log` table
- Log on every mutation (create, update, delete) via Prisma middleware:
  ```javascript
  prisma.$use(async (params, next) => {
    const result = await next(params);
    if (params.action === 'create' || params.action === 'update' || params.action === 'delete') {
      await prisma.audit_log.create({
        data: {
          userId: session.user.id,
          action: params.action,
          entityType: params.model,
          entityId: result.id,
          oldValue: params.action === 'update' ? JSON.stringify(params.args.where) : null,
          newValue: JSON.stringify(result),
          ipAddress: request.headers['x-forwarded-for'] || request.connection.remoteAddress,
        },
      });
    }
    return result;
  });
  ```

### 16.3 Data Privacy

**Multi-Tenant Isolation:**
- EVERY query filters by `companyId` (already implemented)
- Ensure no cross-tenant data leakage (test: create two companies, verify user from Co. A cannot see Co. B's work orders)

**PII Protection:**
- Mechanic personal info (phone, email) not exposed to external service companies
- Driver personal info visible only to fleet managers, not mechanics (unless necessary)

**GDPR Compliance:**
- Right to be forgotten: Delete user → cascade delete all related data (foreign keys with `onDelete: Cascade`)
- Data export: Provide user with all their data in JSON/CSV format

---

## 17. Testing & Quality Assurance

### 17.1 Unit Tests

**Critical Functions to Test:**
1. Health score calculation (given telemetry, faults, overdue → correct score)
2. Interval trigger logic (mileage/time/hours → correct due date)
3. Smart assignment scoring (given mechanic workload, distance → correct priority)
4. Fault pattern detection (given fault history → detect recurrence)

**Tools:** Jest, Vitest (for Next.js)

### 17.2 Integration Tests

**Scenarios:**
1. Create work order → assign mechanic → update status → complete → verify data flow
2. OBD fault event → auto-create work order → link fault → verify alert created
3. Overdue work order → trigger escalation → verify notification sent
4. Bulk assignment → verify all work orders updated, audit logs created

**Tools:** Playwright, Cypress (E2E)

### 17.3 Performance Tests

**Load Scenarios:**
1. 10,000 vehicles, 40,000 work orders → dashboard loads in <2s
2. 500 concurrent mechanics updating work order status → no race conditions
3. 1,000 telemetry events/second ingested → health scores update in <5s

**Tools:** k6, Artillery (load testing)

### 17.4 User Acceptance Testing (UAT)

**Test with Real Users:**
- Fleet managers: test assignment workflows, calendar, analytics
- Mechanics: test mobile portal, photo upload, offline sync
- Executives: test reports, KPIs, export features

**Feedback Loop:**
- Weekly demos during development
- Collect feedback in shared doc, prioritize fixes/enhancements

---

## 18. Documentation Requirements

### 18.1 User Guides

**Fleet Manager Guide:**
- How to create a work order
- How to assign mechanics (manual vs automatic)
- How to interpret health scores
- How to schedule recurring maintenance
- How to export reports

**Mechanic Guide:**
- How to log in to mechanic portal
- How to update work order status
- How to upload photos
- How to log parts used
- How to use offline mode

**Admin Guide:**
- How to configure assignment rules
- How to manage mechanics & service companies
- How to set up scheduled reports
- How to troubleshoot common issues

### 18.2 Technical Documentation

**API Documentation:**
- Swagger/OpenAPI spec for all maintenance API endpoints
- Example requests/responses
- Error codes & handling

**Database Schema:**
- ER diagram for maintenance-related tables
- Field descriptions, constraints, relationships

**Architecture Diagrams:**
- Data flow (telemetry → intelligence → work order)
- System components (frontend, backend, Redis, cron jobs)
- Deployment architecture (Docker, Redis, MariaDB)

**Developer Setup Guide:**
- How to run locally (Docker Compose setup)
- How to seed test data
- How to run tests
- How to deploy

---

## 19. Conclusion

This comprehensive architecture document outlines a **production-ready, enterprise-grade maintenance management subsystem** for the Trackio fleet tracking platform. The design emphasizes:

✅ **Operational Excellence:** Clear workflows from fault detection → work order → assignment → completion  
✅ **Data-Driven Intelligence:** OBD fault analysis, health scoring, predictive triggers  
✅ **Scalability:** Redis caching, database optimization, multi-tier architecture  
✅ **Usability:** Intuitive dashboards, mobile-first mechanic portal, powerful filtering  
✅ **Flexibility:** Manual + automatic scheduling, smart assignment, extensible for future enhancements  
✅ **Real-Time Responsiveness:** Pub/sub updates, live health scores, instant fault alerts  
✅ **Enterprise-Grade:** Audit logging, role-based access, multi-tenant isolation, compliance reporting  

**Next Steps:**
1. Review & refine this document with stakeholders
2. Prioritize features for MVP (suggest Phase 1 + Phase 2)
3. Begin implementation following the phased roadmap
4. Establish KPIs & success metrics
5. Plan UAT with pilot fleet

The system is designed to **integrate seamlessly** with the existing Trackio platform while adding transformative maintenance intelligence that shifts fleet operations from reactive firefighting to proactive, optimized vehicle health management.