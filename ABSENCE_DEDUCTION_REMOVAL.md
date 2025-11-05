pm# Absence Deduction Removal - Complete Fix

## Problem
The "Absence Deduction" type was being auto-created by the attendance system, causing conflicts with the payroll system's real-time deduction calculations.

## Solution Applied

### 1. ✅ Removed from Seed Data
**File:** `prisma/seed.ts`
- Removed "Absence Deduction" from default deduction types
- Only "Late Penalty" and "Uniform" remain as seed data

### 2. ✅ Filtered from Deduction Type Management
**File:** `src/app/api/admin/deduction-types/route.ts`
- GET endpoint now excludes all attendance-related deduction types:
  - Late Arrival
  - Late Penalty
  - Absence Deduction
  - Absent
  - Late
  - Tardiness
  - Partial Attendance
  - Early Time-Out
- POST endpoint prevents creation of attendance-related types with validation error

### 3. ✅ Removed from Deduction Management
**File:** `src/app/api/admin/deductions/route.ts`
- Already filtering out attendance-related deductions (no changes needed)

### 4. ✅ Removed Auto-Creation Logic
**File:** `src/app/api/admin/attendance-settings/route.ts`
- Removed code that auto-created "Absence" deduction type
- Removed code that created individual absence deduction records
- Attendance records are still created with ABSENT status
- Deductions are now calculated in real-time by the payroll system

### 5. ✅ Database Cleanup
**Script:** `scripts/force-remove-absence.ts`
- Created cleanup script that:
  - Finds all "Absence" related deduction types
  - Deletes all associated deduction records
  - Deletes the deduction types themselves
  - Checks for orphaned records
- Script can be re-run anytime to ensure clean state

## How It Works Now

### Attendance System
1. Creates attendance records with status: PENDING, PRESENT, LATE, or ABSENT
2. Does NOT create any deduction records
3. Attendance records are used as source of truth

### Payroll System
1. Reads attendance records during payroll generation
2. Calculates deductions in real-time based on:
   - ABSENT status → full daily salary deduction
   - LATE status → per-second deduction based on minutes late
   - PARTIAL status → hourly deduction based on hours short
3. These calculated deductions are included in payroll totals
4. No database deduction records are created for attendance-related deductions

### Deduction Management (Admin)
1. Only shows manually-added deductions (Uniform, etc.)
2. Cannot create attendance-related deduction types
3. Attendance-related types are hidden from the UI

## Benefits
- ✅ No more conflicts between attendance and deduction systems
- ✅ Single source of truth (attendance records)
- ✅ Real-time calculations in payroll
- ✅ No duplicate deduction entries
- ✅ Cleaner deduction management UI

## Running the Cleanup Script

If you ever need to remove absence deductions again:

```bash
npx tsx scripts/force-remove-absence.ts
```

This will safely remove all absence-related deduction types and records from the database.
