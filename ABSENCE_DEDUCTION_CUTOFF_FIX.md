# Absence Deduction Cutoff Time Bug Fix

## Problem
The system was showing absence deductions **before** the cutoff time (9:10 AM), even though users should only be marked absent **after** the cutoff time passes.

## Root Cause
The absence deduction calculation logic was not properly checking whether the current time had passed the cutoff time (`timeOutEnd` = 9:10 AM) before:
1. Marking users as ABSENT
2. Calculating and displaying absence deductions
3. Including absence deductions in payroll calculations

## Fixed Files

### 1. `src/app/api/admin/attendance/current-day/route.ts`
**Changes:**
- Added clear comments explaining that absence status should only be set AFTER cutoff
- Ensured PENDING status records show `deductions = 0` before cutoff
- Ensured users without attendance records remain PENDING (not ABSENT) before cutoff

**Key Logic:**
```typescript
const isTimeOutWindowPassed = () => {
  if (!attendanceSettings || attendanceSettings.noTimeOutCutoff) {
    return false
  }
  if (!attendanceSettings.timeOutEnd) {
    return false
  }
  // IMPORTANT: Only mark as absent AFTER the cutoff time
  return nowHHmm > attendanceSettings.timeOutEnd
}
```

### 2. `src/app/api/personnel/payroll/breakdown/route.ts`
**Changes:**
- Added logic to filter out TODAY's absence deductions if current time is before cutoff
- Prevents premature absence deductions from showing in personnel payroll breakdown

**Key Logic:**
```typescript
const isBeforeCutoff = attendanceSettings?.timeOutEnd ? nowHHmm <= attendanceSettings.timeOutEnd : false

// Filter out TODAY's absence deductions if we're before cutoff
const attendanceDeductions = allDeductions.filter(d => {
  if (d.deductionType.name === 'Absence Deduction' && isBeforeCutoff) {
    const deductionDate = new Date(d.appliedAt)
    const isToday = deductionDate >= startOfToday && deductionDate <= endOfToday
    if (isToday) {
      return false // Exclude this deduction
    }
  }
  return true
})
```

### 3. Created Cleanup Scripts

**`scripts/remove-premature-absence-deductions.ts`**
- Removes any "Absence Deduction" records created today before cutoff
- Run with: `npx tsx scripts/remove-premature-absence-deductions.ts`

**`scripts/check-premature-absent-records.ts`**
- Checks for ABSENT attendance records created before cutoff
- Run with: `npx tsx scripts/check-premature-absent-records.ts`

## How It Works Now

### Before Cutoff (e.g., 7:12 AM < 9:10 AM)
- Users without attendance records: **PENDING** status, **₱0** deductions
- Payroll breakdown: **No absence deductions** shown
- Users can still clock in without being marked absent

### After Cutoff (e.g., 9:15 AM > 9:10 AM)
- Users without attendance records: **ABSENT** status, **Full day deduction**
- Payroll breakdown: **Absence deductions** calculated and shown
- Auto-check-absent cron job marks pending users as absent

## Testing

Run these commands to verify the fix:

```bash
# Check current time and cutoff status
npx tsx scripts/check-premature-absent-records.ts

# If any premature deductions found, clean them up
npx tsx scripts/remove-premature-absence-deductions.ts
```

## Expected Behavior

1. **At 7:12 AM** (before 9:10 AM cutoff):
   - No absence deductions shown
   - All users without clock-in show as PENDING
   - Net pay does NOT include absence deductions

2. **At 9:11 AM** (after 9:10 AM cutoff):
   - Absence deductions calculated and shown
   - Users without clock-in marked as ABSENT
   - Net pay includes absence deductions

## Related Files
- `src/app/api/admin/attendance/auto-check-absent/route.ts` - Auto-marks absent after cutoff
- `src/app/api/cron/check-absent/route.ts` - Cron job that triggers auto-check
- `src/lib/attendance-calculations.ts` - Absence deduction calculation logic

## Notes
- The cutoff time is configured in the Attendance Settings as `timeOutEnd`
- The system uses Philippines timezone for all time comparisons
- String comparison works for HH:MM format (e.g., "07:12" < "09:10")
