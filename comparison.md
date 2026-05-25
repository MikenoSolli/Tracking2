# Schema Comparison: `schema.prisma` (Root) vs `prisma/schema.prisma`

## Overview

| Aspect | Root `schema.prisma` | `prisma/schema.prisma` |
|---|---|---|
| **Purpose** | Target/evolved schema | Current/working schema |
| **Models** | 15 models | 9 models |
| **Enums** | 11 enums | 5 enums |
| **Lines** | 507 | 217 |
| **Used by** | Not in active use (planned) | Generates `app/generated/prisma/` |

---

## Model Comparison

### 1. `companies`

| Field | Root | prisma/ |
|---|---|---|
| `companyType` | ✅ `company_type` enum (INDIVIDUAL/COMPANY) | ❌ |
| `ownerId` | ✅ Links to the user who owns the company | ❌ |
| `isActive` | ✅ Soft delete support | ❌ |
| `@map()` snake_case | ✅ All columns mapped to snake_case | ❌ Raw camelCase |
| `mechanics` relation | ✅ `mechanic` role users | ❌ |
| Timestamps | `@updatedAt` | Manual `updatedAt DateTime` |

### 2. `user` (maps to `users`)

| Field | Root | prisma/ |
|---|---|---|
| `mechanicCompanyId` | ✅ Mechanics can belong to a separate mechanic company | ❌ |
| `isActive` | ✅ Soft delete | ❌ |
| `role` | 4 roles: USER, ADMIN, MECHANIC, OWNER | 2 roles: USER, ADMIN |
| `@map("users")` | ✅ Explicit table mapping | ✅ |
| Relations to: | `ownedVehicles`, `vehicleAccess`, `maintenanceAssigned`, `alertsAcknowledged`, `alertsAssigned`, `faultsCleared`, `auditLogs` | Only `vehicle[]` |
| Indexes | `[companyId, role]`, `[mechanicCompanyId]`, `[email]` | `[companyId]` only |

### 3. `vehicle`

| Field | Root | prisma/ |
|---|---|---|
| `year` | ✅ `Int?` | ❌ |
| `isActive` | ✅ Soft delete | ❌ |
| `createdAt` / `updatedAt` | ✅ Proper timestamps | ❌ |
| Relations to: | `gpsEvents`, `telemetryData`, `vehicleFaults`, `vehicleAccess` | ❌ |
| `@map()` snake_case | ✅ | ❌ |
| Indexes | `[Imei]`, `[isActive]` added | Only `[companyId]`, `[ownerId]` |

### 4. `driver`

| Field | Root | prisma/ |
|---|---|---|
| `licenseNo @map("license_no")` | ✅ Correctly mapped | Raw `licenseNo` |
| `licenceExp @map("licence_exp")` | ✅ Still misspelled but mapped | Misspelled and unmapped |
| `isActive` | ✅ Soft delete | ❌ |
| `createdAt` | ✅ | ❌ |

### 5. `status`

| Field | Root | prisma/ |
|---|---|---|
| `@map()` snake_case | ✅ All columns | ❌ |
| `index [state]` | ✅ Added | ❌ |
| Structure | **Identical** fields to prisma/ | — |

Both schemas still have the **same monolithic `status` table** — the root schema didn't restructure it yet.

### 6. `gps_events` (NEW — only in root)

```prisma
model gps_events {
  id               BigInt   @id @default(autoincrement())
  vehicleId        String
  timestamp        DateTime
  latitude         Float
  longitude        Float
  speed            Float?
  course           Float?
  satellites       Int?
  altitude         Float?
  eventType        String
  distanceFromLast Float    @default(0)
  createdAt        DateTime @default(now())
  vehicle          vehicle  @relation(onDelete: Cascade)
}
```

**Purpose**: High-frequency GPS location log.
**Key differences from `status`**: BigInt PK (faster inserts), Cascade delete, `distanceFromLast` field, separate timestamp, excludes all telemetry fields.

### 7. `telemetry_data` (NEW — only in root)

```prisma
model telemetry_data {
  id             BigInt    @id @default(autoincrement())
  vehicleId      String
  timestamp      DateTime
  engineRPM      Int?
  engineTemp     Float?
  engineLoad     Float?
  engineHours    Float?
  fuelLevel      Float?
  fuelUsed       Float?
  oilPressure    Float?
  batteryVoltage Float?
  odometer       Float?
  createdAt      DateTime  @default(now())
  vehicle        vehicle   @relation(onDelete: Cascade)
}
```

**Purpose**: Lower-frequency engine/diagnostic telemetry log.
**Key features**: BigInt PK, Cascade delete, separate from GPS, focused on engine data only.

### 8. `vehicle_faults` (NEW — only in root)

```prisma
model vehicle_faults {
  id          BigInt
  vehicleId   String
  faultCode   String   @db.VarChar(10)
  description String?  @db.Text
  severity    fault_severity
  detectedAt  DateTime
  clearedAt   DateTime?
  clearedBy   Int?
  isActive    Boolean  @default(true)
}
```

Structured DTC (Diagnostic Trouble Code) logging with clearance tracking.

### 9. `fault_code_definitions` (NEW — only in root)

Lookup table for fault codes with descriptions, system type, severity, and recommended actions.

### 10. `vehicle_access` (NEW — only in root)

Many-to-many between `user` and `vehicle` with access levels (FULL, MAINTENANCE_ONLY, VIEW_ONLY), expiry, and grantor tracking.

### 11. `audit_log` (NEW — only in root)

```prisma
model audit_log {
  id         BigInt   @id @default(autoincrement())
  userId     Int
  action     String   @db.VarChar(50)
  entityType String   @db.VarChar(50)
  entityId   String   @db.VarChar(50)
  oldValue   String?  @db.Text
  newValue   String?  @db.Text
  ipAddress  String?  @db.VarChar(45)
  timestamp  DateTime
}
```

Complete user action audit trail with before/after values.

### 12. `maintenance` (enhanced in root)

| Field | Root | prisma/ |
|---|---|---|
| `mechanicId` | ✅ Assigned mechanic link | ❌ |
| `scheduledDate` | ✅ Separate from `serviceDate` | Uses `serviceDate` for both |
| `nextServiceDate` | ✅ Renamed from `nextService` | `nextService` |
| `status` | ✅ SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED | ❌ |
| `severity` | ✅ LOW/MEDIUM/HIGH/CRITICAL | ❌ |
| `notes` | ✅ `@db.Text` | ❌ |
| `completedAt` | ✅ | ❌ |
| `description` | ✅ Same | ✅ |

### 13. `alert` (enhanced in root)

| Field | Root | prisma/ |
|---|---|---|
| `alertCategory` | ✅ GEOFENCE/SPEED/MAINTENANCE/MECHANICAL/FUEL/BATTERY/ENGINE/SECURITY/OTHER | ❌ |
| `isMaintenanceRelated` | ✅ Flag for mechanic filtering | ❌ |
| `assignedMechanicId` | ✅ Direct mechanic assignment | ❌ |
| `acknowledgedAt` / `acknowledgedBy` | ✅ Acknowledgment tracking | ❌ |
| `resolvedAt` | ✅ Resolution timestamp | ❌ |
| Indexes | `[isMaintenanceRelated, vehicleId, createdAt]`, `[assignedMechanicId, acknowledgedAt]`, `[isResolved, severity]` | Only basic FK indexes |

### 14. `dailySummary` / `trip`

Nearly identical, but root uses `@map()` snake_case + `@updatedAt`.

---

## Enum Comparison

| Enum | Root | prisma/ |
|---|---|---|
| `vehicle_Type` | TRACTOR, TRUCK, CAR, BUS, MOTORCYCLE, **VAN**, **PICKUP** | TRACTOR, TRUCK, CAR, BUS, MOTORCYCLE |
| `users_role` | USER, ADMIN, **MECHANIC**, **OWNER** | USER, ADMIN |
| `alert_type` | + GEOFENCE_ENTER, HARSH_BRAKING, HARSH_ACCELERATION, OVERSPEED, ENGINE_OVERHEAT, LOW_BATTERY, MECHANICAL_FAULT | SPEEDING, GEOFENCE_EXIT, LOW_FUEL, MAINTENANCE_DUE, FAULT, STOP |
| `alert_severity` | LOW, MEDIUM, HIGH, **CRITICAL** | LOW, MEDIUM, HIGH |
| `company_type` | **INDIVIDUAL**, **COMPANY** | ❌ |
| `access_type` | **FULL**, **MAINTENANCE_ONLY**, **VIEW_ONLY** | ❌ |
| `maintenance_status` | **SCHEDULED**, **IN_PROGRESS**, **COMPLETED**, **CANCELLED** | ❌ |
| `maintenance_severity` | **LOW**, **MEDIUM**, **HIGH**, **CRITICAL** | ❌ |
| `fault_severity` | **LOW**, **MEDIUM**, **HIGH**, **CRITICAL** | ❌ |
| `fault_system` | **ENGINE**, **TRANSMISSION**, **ABS**, **AIRBAG**, **EMISSION**, **ELECTRICAL**, **FUEL**, **COOLING**, **OTHER** | ❌ |
| `alert_category` | **GEOFENCE**, **SPEED**, **MAINTENANCE**, **MECHANICAL**, **FUEL**, **BATTERY**, **ENGINE**, **SECURITY**, **OTHER** | ❌ |

---

## Analysis

### Root `schema.prisma` — Strengths

1. **Location/telemetry separation**: `gps_events` + `telemetry_data` properly split by frequency, each with BigInt autoincrement PK and Cascade delete
2. **Role-based access**: 4 roles (including MECHANIC and OWNER) + `vehicle_access` table for granular per-user vehicle permissions
3. **Maintenance lifecycle**: Full status workflow (SCHEDULED → COMPLETED/CANCELLED), severity, mechanic assignment
4. **Fault management**: Dedicated `vehicle_faults` + `fault_code_definitions` with DTC codes, clearance tracking
5. **Audit trail**: `audit_log` for all user actions
6. **Soft deletes**: `isActive` on companies, users, vehicles, drivers, vehicle_access
7. **Snake case**: Proper `@map()` column naming for database convention
8. **Cascade deletes**: `gps_events`, `telemetry_data`, `vehicle_faults`, `vehicle_access` use `onDelete: Cascade` (child rows auto-deleted with vehicle)
9. **Index strategy**: More targeted indexes covering real query patterns

### Root `schema.prisma` — Weaknesses

1. **Still keeps `status`**: The old monolithic table is duplicated alongside the new split tables — creates write amplification (Rust must write to both `status` + `gps_events`/`telemetry_data`)
2. **`licenceExp` still misspelled**: In `driver` model (`@map("licence_exp")`)
3. **`Alert.DriverId` still required**: Alerts still force a driver link even for vehicle-level events
4. **No `current_state` table**: Missing a dedicated latest-state table for fast real-time reads (still relies on querying `status` with `ORDER BY lastUpdate DESC LIMIT 1`)
5. **`maintenance` still uses CUID**: For a table with fewer rows this is fine, but inconsistent with the BigInt pattern used elsewhere
6. **`@map("dailysummary")`**: Table name is one word, inconsistent with snake_case convention used elsewhere

### `prisma/schema.prisma` — Strengths

1. **Working**: Actually generates the Prisma client used by the app
2. **Simplicity**: 9 models, straightforward relations, easy to understand
3. **Consistent patterns**: All CUIDs, all camelCase, all NoAction deletes
4. **Minimal**: No unused tables or fields

### `prisma/schema.prisma` — Weaknesses

1. **Monolithic `status` table**: GPS + telemetry + events all in one table, no frequency separation (the core issue)
2. **No role granularity**: Only USER/ADMIN, no MECHANIC or OWNER
3. **No soft deletes**: Hard deletes everywhere, no `isActive`
4. **No audit trail**: No record of who did what
5. **No access control**: No per-user vehicle permissions
6. **No fault management**: No structured DTC tracking
7. **Maintenance is basic**: No status workflow, no mechanic assignment, no severity
8. **Weak indexing**: Minimal indexes compared to query patterns

---

## Recommendation

The root `schema.prisma` is clearly the **intended target schema** — it solves nearly every issue identified in the project review. However, it has one remaining flaw: it keeps the old `status` table alongside the new split tables instead of replacing it with a lean `vehicle_current_state` table.

**Suggested final structure**: Use the root schema as the base, but:
1. Remove the `status` model (replace with a `vehicle_current_state` single-row-per-vehicle table)
2. `gps_events` → location history (Rust writes here)
3. `telemetry_data` → telemetry history (Rust writes here)
4. `vehicle_current_state` → latest known state from both sources (Rust UPSERTs here)
5. The Rust app no longer touches `status` at all
