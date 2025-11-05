# What Happens When You Release Payroll

## Simple Answer

**When you click "Release Payroll", all non-mandatory "other deductions" are DELETED from the database.**

---

## What Gets Deleted?

✅ **Deleted (one-time only):**
- Uniform fees
- Penalties
- Special adjustments
- Any deduction with "Is Mandatory" = NO

❌ **NOT Deleted (recurring):**
- PhilHealth
- SSS
- Pag-IBIG
- Any deduction with "Is Mandatory" = YES

---

## The Flow

```
1. Generate Payroll
   ↓
   Other deductions INCLUDED in calculation
   Other deductions VISIBLE in breakdown
   
2. Release Payroll
   ↓
   Other deductions DELETED from database
   Other deductions DISAPPEAR from breakdown
   Net pay stays the same (already calculated)
   
3. Generate Next Period
   ↓
   Other deductions DON'T appear (they're deleted)
   Only mandatory deductions reappear
```

---

## Example

### Before Release:
- Employee: Mike Johnson
- Uniform Fee: ₱2,400 (non-mandatory)
- PhilHealth: ₱500 (mandatory)
- SSS: ₱600 (mandatory)
- Total Deductions: ₱3,500
- Net Pay: ₱6,500

### After Release:
- Uniform Fee: **DELETED** ❌
- PhilHealth: ₱500 ✅
- SSS: ₱600 ✅
- Net Pay: ₱6,500 (unchanged)
- Breakdown: Only shows PhilHealth + SSS

### Next Period Generate:
- Uniform Fee: Not included (deleted)
- PhilHealth: ₱500 (recurring)
- SSS: ₱600 (recurring)
- Total Deductions: ₱1,100
- Net Pay: ₱8,900

---

## Key Points

1. **One-time use**: Non-mandatory deductions are used once and deleted
2. **Permanent deletion**: Cannot be recovered, no archive
3. **Clean breakdown**: Released payroll only shows mandatory deductions
4. **Automatic**: Happens automatically when you release

---

## Important

⚠️ **You currently have an old PENDING payroll** (generated before the fix)

To see the fix in action:
1. Regenerate the current payroll (click "Generate Payroll")
2. The old ₱2,400 Uniform deduction will be excluded (it was already deleted)
3. Release the new payroll
4. Any new non-mandatory deductions will be deleted

Going forward, everything will work automatically! ✅
