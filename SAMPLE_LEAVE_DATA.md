# Sample Leave Request Data & Workflow

## Sample Personnel Users

```json
{
  "personnel": [
    {
      "users_id": "PER-001",
      "name": "Maria Santos",
      "email": "maria.santos@school.edu",
      "role": "PERSONNEL",
      "personnelType": "Teaching Staff",
      "basicSalary": 30000
    },
    {
      "users_id": "PER-002",
      "name": "Juan dela Cruz",
      "email": "juan.delacruz@school.edu",
      "role": "PERSONNEL",
      "personnelType": "Non-Teaching Staff",
      "basicSalary": 25000
    },
    {
      "users_id": "PER-003",
      "name": "Ana Reyes",
      "email": "ana.reyes@school.edu",
      "role": "PERSONNEL",
      "personnelType": "Teaching Staff",
      "basicSalary": 32000
    }
  ]
}
```

---

## Sample Leave Requests

### Scenario 1: Approved Paid Leave (No Payroll Impact)

```json
{
  "leave_requests_id": "LR-001",
  "users_id": "PER-001",
  "type": "VACATION",
  "customLeaveType": null,
  "startDate": "2025-10-18",
  "endDate": "2025-10-22",
  "days": 5,
  "isPaid": true,
  "reason": "Family vacation trip to Boracay",
  "status": "APPROVED",
  "admin_id": "ADM-001",
  "adminComment": "Approved. Enjoy your vacation!",
  "createdAt": "2025-10-12T08:30:00Z",
  "updatedAt": "2025-10-13T10:15:00Z"
}
```

**Result**: ✅ Approved but **NO DEDUCTION** (isPaid: true)

---

### Scenario 2: Approved Unpaid Leave (DEDUCTED FROM PAYROLL)

```json
{
  "leave_requests_id": "LR-002",
  "users_id": "PER-002",
  "type": "UNPAID",
  "customLeaveType": null,
  "startDate": "2025-10-21",
  "endDate": "2025-10-23",
  "days": 3,
  "isPaid": false,
  "reason": "Need to attend to urgent family matters in province",
  "status": "APPROVED",
  "admin_id": "ADM-001",
  "adminComment": "Approved as unpaid leave. Take care.",
  "createdAt": "2025-10-14T09:00:00Z",
  "updatedAt": "2025-10-15T14:30:00Z"
}
```

**Payroll Calculation** (Assuming period: Oct 16-29, 12 working days):
- **Basic Salary**: ₱25,000/month
- **Daily Rate**: ₱25,000 ÷ 12 = ₱2,083.33
- **Unpaid Days**: 3 days (Oct 21, 22, 23 - all weekdays)
- **Deduction**: 3 × ₱2,083.33 = **₱6,250.00**
- **Net Pay Impact**: Reduced by ₱6,250

**Payroll Entry**:
```json
{
  "users_id": "PER-002",
  "periodStart": "2025-10-16",
  "periodEnd": "2025-10-29",
  "basicSalary": 25000,
  "overtime": 0,
  "deductions": 6250,  // ← Includes unpaid leave
  "netPay": 18750,     // ← 25000 - 6250
  "breakdown": {
    "unpaidLeaveDeduction": 6250,
    "unpaidLeaveDays": 3
  }
}
```

---

### Scenario 3: Denied Leave Request

```json
{
  "leave_requests_id": "LR-003",
  "users_id": "PER-003",
  "type": "SICK",
  "customLeaveType": null,
  "startDate": "2025-10-25",
  "endDate": "2025-10-27",
  "days": 3,
  "isPaid": true,
  "reason": "Medical checkup and recovery",
  "status": "DENIED",
  "admin_id": "ADM-001",
  "adminComment": "Please provide medical certificate. Resubmit with documentation.",
  "createdAt": "2025-10-15T11:45:00Z",
  "updatedAt": "2025-10-16T08:00:00Z"
}
```

**Result**: ❌ Denied - **NO PAYROLL IMPACT**

---

### Scenario 4: Pending Leave Request

```json
{
  "leave_requests_id": "LR-004",
  "users_id": "PER-001",
  "type": "PARENTAL",
  "customLeaveType": null,
  "startDate": "2025-11-01",
  "endDate": "2025-11-15",
  "days": 15,
  "isPaid": true,
  "reason": "Paternity leave - newborn baby",
  "status": "PENDING",
  "admin_id": null,
  "adminComment": null,
  "createdAt": "2025-10-16T07:00:00Z",
  "updatedAt": "2025-10-16T07:00:00Z"
}
```

**Result**: ⏳ Waiting for admin approval - **NO PAYROLL IMPACT YET**

---

### Scenario 5: Custom Leave Type (Approved Unpaid)

```json
{
  "leave_requests_id": "LR-005",
  "users_id": "PER-003",
  "type": "CUSTOM",
  "customLeaveType": "Study Leave - Board Exam Review",
  "startDate": "2025-10-28",
  "endDate": "2025-10-29",
  "days": 2,
  "isPaid": false,
  "reason": "Attending professional licensure board exam review sessions",
  "status": "APPROVED",
  "admin_id": "ADM-001",
  "adminComment": "Good luck on your exam! Approved as unpaid.",
  "createdAt": "2025-10-10T13:20:00Z",
  "updatedAt": "2025-10-12T09:45:00Z"
}
```

**Payroll Impact**:
- **Daily Rate**: ₱32,000 ÷ 12 = ₱2,666.67
- **Deduction**: 2 × ₱2,666.67 = **₱5,333.33**

---

## API Request Examples

### Personnel: Submit Leave Request

```bash
POST /api/personnel/leaves
Content-Type: application/json

{
  "type": "UNPAID",
  "customLeaveType": null,
  "startDate": "2025-10-21",
  "endDate": "2025-10-23",
  "days": 3,
  "isPaid": false,
  "reason": "Personal emergency"
}
```

**Response**:
```json
{
  "leave_requests_id": "LR-002",
  "users_id": "PER-002",
  "status": "PENDING",
  "createdAt": "2025-10-14T09:00:00Z"
}
```

---

### Admin: Approve Leave

```bash
PATCH /api/admin/leave-requests/LR-002
Content-Type: application/json

{
  "action": "APPROVE",
  "comment": "Approved as unpaid leave. Take care."
}
```

**Response**:
```json
{
  "leave_requests_id": "LR-002",
  "status": "APPROVED",
  "admin_id": "ADM-001",
  "adminComment": "Approved as unpaid leave. Take care.",
  "updatedAt": "2025-10-15T14:30:00Z"
}
```

---

### Admin: Deny Leave

```bash
PATCH /api/admin/leave-requests/LR-003
Content-Type: application/json

{
  "action": "DENY",
  "comment": "Please provide medical certificate"
}
```

---

## Payroll Deduction Examples

### Example 1: Single Unpaid Leave

**Personnel**: Juan dela Cruz (PER-002)  
**Period**: Oct 16-29, 2025 (12 working days)  
**Salary**: ₱25,000/month  
**Leave**: 3 days unpaid (Oct 21-23)

```
Daily Rate = ₱25,000 ÷ 12 = ₱2,083.33
Unpaid Leave Deduction = 3 × ₱2,083.33 = ₱6,250.00

Payroll Calculation:
- Basic Salary:        ₱25,000.00
- Attendance Ded:      ₱    0.00
- Other Deductions:    ₱    0.00
- Unpaid Leave:        ₱ 6,250.00  ← DEDUCTED
- Loans:               ₱    0.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- NET PAY:             ₱18,750.00
```

---

### Example 2: Multiple Unpaid Leaves

**Personnel**: Ana Reyes (PER-003)  
**Period**: Oct 16-29, 2025 (12 working days)  
**Salary**: ₱32,000/month  
**Leaves**: 
- 2 days unpaid (Oct 28-29) - Study leave
- 1 day unpaid (Oct 24) - Personal

```
Daily Rate = ₱32,000 ÷ 12 = ₱2,666.67
Total Unpaid Days = 3
Unpaid Leave Deduction = 3 × ₱2,666.67 = ₱8,000.00

Payroll Calculation:
- Basic Salary:        ₱32,000.00
- Attendance Ded:      ₱    0.00
- Other Deductions:    ₱ 1,500.00 (SSS, PhilHealth)
- Unpaid Leave:        ₱ 8,000.00  ← DEDUCTED
- Loans:               ₱    0.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- NET PAY:             ₱22,500.00
```

---

## Key Rules Summary

### ✅ Leave WILL Deduct from Payroll If:
1. `status === 'APPROVED'`
2. `isPaid === false`
3. Leave dates overlap with payroll period
4. Deduction = working days × daily salary

### ❌ Leave WON'T Deduct from Payroll If:
1. `status === 'PENDING'` or `'DENIED'`
2. `isPaid === true` (paid leave)
3. Leave dates outside payroll period
4. Leave falls on Sundays (excluded from calculation)

---

## Personnel View (Payslip)

When unpaid leave is deducted, personnel sees:

```
═══════════════════════════════════════════
              PAYSLIP
═══════════════════════════════════════════
Employee: Juan dela Cruz
Period: Oct 16, 2025 - Oct 29, 2025

EARNINGS
  Basic Salary:              ₱25,000.00
  Overtime:                  ₱     0.00
  ─────────────────────────────────────
  GROSS PAY:                 ₱25,000.00

DEDUCTIONS
  Attendance Deductions:     ₱     0.00
  Other Deductions:          ₱     0.00
  Loan Payments:             ₱     0.00
  
  Unpaid Leave:
    └─ Unpaid Leave (3 days) ₱ 6,250.00  ← SHOWN
  ─────────────────────────────────────
  Total Deductions:          ₱ 6,250.00

═══════════════════════════════════════════
NET PAY:                     ₱18,750.00
═══════════════════════════════════════════
Status: RELEASED
```

---

## Testing Workflow

1. **Login as Personnel** → Request unpaid leave
2. **Login as Admin** → Approve the leave
3. **Admin generates payroll** → System auto-calculates unpaid leave deduction
4. **Admin releases payroll** → Personnel sees deduction on payslip
5. **Verify**: Net pay reduced by (unpaid days × daily rate)
