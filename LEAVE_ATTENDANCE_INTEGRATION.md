# Leave-Attendance Integration

## Overview
This system integrates leave management with attendance tracking to prevent double penalties and ensure employees on approved leave are properly tracked.

## How It Works

### When Admin Approves Leave (Paid or Unpaid)

**Automatic Actions:**
1. ✅ **Attendance Records Created** - System creates attendance records with `ON_LEAVE` status for ALL days in the leave period
2. 🚫 **Blocks Time In/Out** - Attendance portal prevents employee from punching in/out during leave period
3. 💰 **Unpaid Leave Deduction** - For unpaid leave only, salary deduction is automatically calculated and applied

---

## Example Scenario: 3-Day Unpaid Leave

**Employee Request:**
- Requests 3-day unpaid leave (Monday-Wednesday)
- Admin approves the request

**System Actions:**

### 1. Attendance Records
```
Monday:    Status = ON_LEAVE (no timeIn/timeOut)
Tuesday:   Status = ON_LEAVE (no timeIn/timeOut)
Wednesday: Status = ON_LEAVE (no timeIn/timeOut)
```

### 2. Attendance Portal Behavior
- If employee tries to use attendance portal during these dates:
  - ❌ Blocked from timing in/out
  - 📋 Shows message: "You are on approved unpaid leave from [date] to [date]. Attendance cannot be recorded during leave."

### 3. Salary Deduction (Unpaid Leave Only)
```
Basic Salary: ₱22,000/month
Working Days: 22 days/month
Daily Rate: ₱22,000 ÷ 22 = ₱1,000/day

Leave Days Calculation:
- Monday: Working day = ₱1,000
- Tuesday: Working day = ₱1,000  
- Wednesday: Working day = ₱1,000

Total Deduction: ₱3,000
(Sundays excluded from deduction calculation)
```

---

## Paid vs Unpaid Leave

### Paid Leave
✅ Attendance: Marked `ON_LEAVE`
✅ Portal: Blocked from time in/out  
✅ Salary: **NO deduction**
✅ Payroll: Full pay maintained

### Unpaid Leave
✅ Attendance: Marked `ON_LEAVE`
✅ Portal: Blocked from time in/out
💰 Salary: **Deducted for working days**
💰 Payroll: Pay reduced by daily rate × working days

---

## Database Schema Addition

**New Attendance Status:**
```prisma
enum AttendanceStatus {
  PENDING
  PRESENT
  ABSENT
  LATE
  PARTIAL
  ON_LEAVE  // ← NEW
}
```

**Migration Required:**
```bash
npx prisma migrate dev --name add_on_leave_status
```

---

## Leave Deletion Cleanup

When an approved leave is deleted:
1. 🧹 **Removes attendance records** (only those with no timeIn/timeOut - leave-generated records)
2. 🧹 **Removes unpaid leave deductions** (if applicable)
3. ✅ **Clean state** - No orphaned records

---

## Key Benefits

### 1. No Double Penalties
❌ **Before:** Employee on unpaid leave could be marked ABSENT + lose pay = double penalty
✅ **After:** Employee marked ON_LEAVE + lose pay only for unpaid leave = single penalty

### 2. Clear Status Tracking
- Attendance records show employee was on approved leave
- Admin can see ON_LEAVE status in attendance reports
- No confusion between absent and on-leave

### 3. Portal Prevention
- Employees cannot accidentally punch in/out during leave
- Clear message explains they're on approved leave
- Prevents attendance errors

### 4. Automatic Workflow
- Admin approves → Everything happens automatically
- No manual attendance marking needed
- No manual deduction creation needed

---

## Implementation Files Modified

### 1. Database Schema
- `prisma/schema.prisma` - Added `ON_LEAVE` to `AttendanceStatus` enum

### 2. Leave Approval API
- `src/app/api/admin/leave-requests/[id]/route.ts`
  - Creates attendance records with `ON_LEAVE` status
  - Handles both paid and unpaid leave
  - Creates salary deductions for unpaid leave
  - Uses timezone-aware date handling

### 3. Leave Deletion API
- `src/app/api/leave-requests/[id]/route.ts`
  - Cleans up attendance records when leave deleted
  - Removes associated deductions
  - Only deletes leave-generated records (no timeIn/timeOut)

### 4. Attendance Punch API
- `src/app/api/attendance/punch/route.ts`
  - Already checks for approved leave before allowing punch
  - Returns clear error message with leave details
  - Prevents attendance during leave period

---

## Testing Checklist

### Before Migration
- [ ] Backup database
- [ ] Review current attendance records

### After Migration
- [ ] Run: `npx prisma migrate dev --name add_on_leave_status`
- [ ] Test paid leave approval
  - [ ] Attendance records created with ON_LEAVE status
  - [ ] No salary deduction created
  - [ ] Portal blocks time in/out
- [ ] Test unpaid leave approval
  - [ ] Attendance records created with ON_LEAVE status
  - [ ] Salary deduction created correctly
  - [ ] Portal blocks time in/out
- [ ] Test leave deletion
  - [ ] Attendance records removed
  - [ ] Deductions removed (for unpaid)
- [ ] Test attendance portal during leave
  - [ ] Shows proper error message
  - [ ] Displays leave dates

---

## Technical Details

### Timezone Handling
All date calculations use Philippines timezone (`Asia/Manila`) via timezone utilities:
- `toPhilippinesDateString()` - Convert dates to YYYY-MM-DD
- `generateWorkingDaysInPhilippines()` - Calculate working days excluding Sundays
- `getPhilippinesDayOfWeek()` - Get day of week in Philippines timezone

### Working Days Calculation
```javascript
// Excludes Sundays only
// Example: Mon-Fri = 5 days, Mon-Sun = 6 days (no Sunday)
const workingDays = generateWorkingDaysInPhilippines(startDate, endDate).length
```

### Deduction Formula
```javascript
const basicSalary = user.personnelType.basicSalary
const workingDaysInMonth = 22 // Standard
const dailySalary = basicSalary / workingDaysInMonth
const deductionAmount = dailySalary * workingDays
```

---

## Notes

1. **Weekends Included:** Attendance records are created for ALL days including weekends, but deductions only apply to working days.

2. **Holiday Handling:** Currently, holidays are not automatically excluded from deduction calculation. This may need to be added in the future.

3. **Existing Attendance:** If an attendance record already exists for a leave date (e.g., employee punched in before leave was approved), the system updates the status to ON_LEAVE.

4. **Portal Check:** The attendance portal checks for approved leave in real-time at every punch attempt, so it works immediately after approval.

5. **Admin Override:** System behavior assumes admin leave approvals are final. There's no provision for employees to override or bypass the leave status.

---

## Future Enhancements

- [ ] Add holiday exclusion to deduction calculations
- [ ] Support for half-day leaves
- [ ] Email notifications when leave affects payroll
- [ ] Attendance dashboard showing ON_LEAVE statistics
- [ ] Leave balance tracking integration
