# Fix Current Payroll to Remove Archived Deductions

## Problem
The current PENDING payroll (2025-12-01 to 2025-12-03) was generated **before** the "Uniform" deduction was archived. It still shows ₱3,250 in deductions (which includes the archived ₱2,400 Uniform deduction).

## Solution
**Regenerate the current payroll** to exclude archived deductions.

---

## Steps to Fix

### Option 1: Via Admin UI (Recommended)
1. Go to **admin/payroll**
2. Click **"Generate Payroll"** button
3. This will:
   - Delete the old PENDING payroll
   - Generate fresh payroll with only active deductions
   - Exclude archived deductions

### Option 2: Via Script
Run this command:
```bash
npx tsx scripts/regenerate-current-payroll.ts
```

---

## What Will Happen

**Before:**
- Deductions: ₱3,250 (includes ₱2,400 Uniform + ₱850 others)
- Other Deductions breakdown shows "Uniform ₱2,400"

**After:**
- Deductions: ₱850 (only active deductions)
- Other Deductions breakdown: empty or only active deductions
- Uniform deduction: still in admin/deductions → Archived

---

## Important Notes

✅ **Net pay will change** because the archived deduction is excluded
✅ **This is correct behavior** - archived deductions shouldn't be in new payroll
✅ **Going forward**, when you release and generate, this will happen automatically

The workflow is now:
1. Generate → includes all active deductions
2. Release → archives non-mandatory deductions
3. Generate next period → excludes archived deductions ✅
