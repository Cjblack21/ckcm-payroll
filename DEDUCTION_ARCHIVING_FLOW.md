# Deduction Management Flow

## Overview
This document explains how deductions are handled throughout the payroll lifecycle.

**Important: Non-mandatory deductions are DELETED (not archived) when you release payroll.**

---

## Payroll Workflow

### 1. **GENERATE PAYROLL**
**Action:** Click "Generate Payroll" button

**What happens:**
- System fetches all active deductions (with `archivedAt = null`)
  - **Mandatory deductions** (PhilHealth, SSS, Pag-IBIG) - always included
  - **Non-mandatory deductions** (penalties, adjustments) - only for current period
- Calculates net pay including all deductions
- Saves payroll entries with status = **PENDING**
- ⚠️ **Deductions are NOT archived yet** - they remain visible in admin/deductions

**Result:**
- Payroll status: **PENDING**
- Other deductions: **Still visible** in breakdown and admin/deductions page

---

### 2. **RELEASE PAYROLL**
**Action:** Click "Release Payroll" button

**What happens:**
1. Updates payroll entry status: PENDING → **RELEASED**
2. Updates loan balances (deducts payment from balance)
3. **DELETES non-mandatory deductions** for this period:
   ```sql
   DELETE FROM deductions 
   WHERE isMandatory = false 
   AND appliedAt BETWEEN periodStart AND periodEnd
   ```
4. Sends notifications to employees
5. Updates next period dates in settings

**Result:**
- Payroll status: **RELEASED**
- Non-mandatory deductions: **DELETED** (completely removed from database)
- Mandatory deductions: **Still active** (will appear in next period)
- Net pay: **Unchanged** (already calculated and stored)
- Breakdown: **Other deductions disappear** (deleted from system)

---

### 3. **VIEW RELEASED PAYROLL**
**Action:** View payroll breakdown after release

**What happens:**
- System fetches existing deductions from database
- Only shows:
  - ✅ **Mandatory deductions** (PhilHealth, SSS, Pag-IBIG)
  - ❌ **Deleted non-mandatory deductions** (don't exist anymore)

**Result:**
- Breakdown shows only mandatory deductions
- Deleted deductions are gone permanently (no archived section)

---

### 4. **GENERATE NEXT PAYROLL**
**Action:** Generate payroll for next period

**What happens:**
- Auto-archives old released payroll (status: RELEASED → ARCHIVED)
- Fetches deductions for new period from database
- Only includes:
  - ✅ **Mandatory deductions** (recurring every period)
  - ❌ **Previously deleted deductions** (don't exist)
- Fresh calculation for new period

**Result:**
- New payroll period starts fresh
- Mandatory deductions reappear (recurring)
- One-time deductions don't reappear (deleted)

---

## Deduction Types

| Type | When Created | After Generate | After Release | Next Period |
|------|-------------|----------------|---------------|-------------|
| **Mandatory** (PhilHealth, SSS) | admin/deductions | ✅ Shows | ✅ Shows | ✅ Reappears |
| **Non-Mandatory** (Penalties) | admin/deductions | ✅ Shows | ❌ **DELETED** | ❌ Gone |
| **Attendance** (Late, Absent) | Auto-calculated | ✅ Shows | ✅ Shows | N/A (recalculated) |

---

## What Happens to Deleted Deductions

Deleted deductions are **permanently removed** from the database when you release payroll.

- ❌ No archived section
- ❌ Cannot be recovered
- ✅ Clean slate for next period
- ✅ Breakdown only shows what's needed

---

## Key Points

✅ **Deductions are DELETED on RELEASE, not on GENERATE**
- This allows you to review the breakdown before finalizing
- Once released, non-mandatory deductions are permanently deleted

✅ **Net pay doesn't change when deductions are deleted**
- The amounts are already stored in the payroll entry

✅ **Mandatory deductions are never deleted**
- They automatically appear in every payroll period

✅ **Deleted deductions cannot be recovered**
- They are permanently removed from the database

---

## Code Changes Made

### File: `src/lib/actions/payroll.ts`

**Line 968-973:** Removed deletion from Generate function
```typescript
// Note: Deductions will be deleted when payroll is RELEASED, not during generation
// This allows viewing the breakdown before release
```

**Line 1466-1524:** Added deletion to Release function
```typescript
// Delete non-mandatory deductions after payroll is released
for (const entry of entriesToRelease) {
  // Fetch and DELETE non-mandatory deductions
  await prisma.deduction.deleteMany({
    where: { deductions_id: { in: idsToDelete } }
  })
}
```

**Line 383:** Filter still works (deleted deductions don't exist)
```typescript
archivedAt: null, // Not needed anymore, but doesn't hurt
```
