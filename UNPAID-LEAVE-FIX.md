# Unpaid Leave Deduction Fix - Implementation Summary

## Problem Identified
The system was **double-deducting** unpaid leave:
1. **First deduction**: Created as database record when admin approved leave
2. **Second deduction**: Recalculated during payroll generation

This resulted in employees being deducted twice the correct amount for unpaid leave.

## Solution Implemented: Option 2B
**Keep payroll calculation only** - Remove deduction creation at approval time.

### Why This Approach?
✅ **No double deduction** - Single source of truth (payroll)
✅ **Flexible** - Auto-adjusts for leaves spanning multiple pay periods
✅ **Pro-rated** - Only deducts days within each payroll period
✅ **Consistent** - Matches how attendance and loan deductions work
✅ **Clean** - No manual cleanup if leave dates change

## Changes Made

### File Modified: `src/app/api/admin/leave-requests/[id]/route.ts`

#### 1. Removed Deduction Creation Logic (Lines 116-164)
**Before:**
- Created "Unpaid Leave" deduction type if not exists
- Calculated working days in leave period
- Created deduction record in database
- Stored fixed amount based on approval date

**After:**
- Added comment explaining deductions are calculated during payroll
- Removed all database deduction creation code
- Keeps attendance record creation (ON_LEAVE status)

#### 2. Cleaned Up Imports (Line 5)
**Before:**
```typescript
import { getPhilippinesDayOfWeek, generateWorkingDaysInPhilippines, toPhilippinesDateString, toZonedTime } from "@/lib/timezone"
```

**After:**
```typescript
import { toPhilippinesDateString } from "@/lib/timezone"
```

## What Still Works

### ✅ Leave Approval Process
1. Admin approves leave request
2. System creates attendance records with `status: "ON_LEAVE"`
3. Employee blocked from time in/out during leave period
4. Leave status visible in attendance portal and personnel view

### ✅ Payroll Calculation
Unpaid leave deductions are calculated during payroll generation:
- Location: `src/lib/actions/payroll.ts` (lines 843-914)
- Queries approved unpaid leaves for the period
- Counts working days (excludes Sundays)
- Calculates: `totalUnpaidLeaveDays × dailySalary`
- Includes in `finalTotalDeductions`

### ✅ UI Display
All existing UI components continue to work:
- Admin payroll page
- Personnel payroll view
- Payroll breakdown dialog
- PDF payslips
- Print/screenshot generation

## Testing Checklist

### Test Scenario 1: Single Period Leave
- [ ] Approve unpaid leave within one payroll period
- [ ] Generate payroll
- [ ] Verify deduction appears once (not doubled)
- [ ] Check amount = days × daily salary

### Test Scenario 2: Multi-Period Leave
- [ ] Approve leave spanning two payroll periods
- [ ] Generate payroll for first period
- [ ] Verify only overlapping days deducted
- [ ] Generate payroll for second period
- [ ] Verify remaining days deducted

### Test Scenario 3: Paid Leave
- [ ] Approve paid leave
- [ ] Generate payroll
- [ ] Verify NO deduction applied
- [ ] Verify employee still blocked from attendance

### Test Scenario 4: Attendance Blocking
- [ ] User on approved leave tries to time in
- [ ] Should see: "You are on approved leave..."
- [ ] Attendance record status = ON_LEAVE

## Rollback Instructions
If issues arise, revert this commit:
```bash
git revert <commit-hash>
```

Or manually restore lines 116-164 in:
`src/app/api/admin/leave-requests/[id]/route.ts`

## Related Files (No Changes Needed)
These files already handle unpaid leave correctly:
- `src/lib/actions/payroll.ts` - Payroll calculation
- `src/app/api/personnel/payroll/route.ts` - Personnel view
- `src/app/admin/payroll/page.tsx` - Admin UI
- `src/components/payroll/PayrollBreakdownDialog.tsx` - Breakdown
- `src/lib/pdf-payslip-generator.tsx` - PDF generation
- `src/app/api/admin/payroll/print-screenshot/route.ts` - Print

## Date Implemented
2025-10-20

## Implemented By
AI Assistant via user request
