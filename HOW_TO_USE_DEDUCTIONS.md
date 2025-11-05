# How to Use Percentage & Fixed Deductions

## What Changed?

Now deductions can be calculated in two ways:
1. **FIXED** - A fixed amount (e.g., ₱500)
2. **PERCENTAGE** - A percentage of the employee's salary (e.g., 20%)

---

## How to Use

### Option 1: Using API Directly (Postman/Thunder Client)

#### Create a FIXED Deduction
```http
POST /api/admin/deduction-types
Content-Type: application/json

{
  "name": "Uniform Fee",
  "description": "Monthly uniform maintenance fee",
  "amount": 500,
  "calculationType": "FIXED",
  "isMandatory": true,
  "isActive": true
}
```
**Result**: Every employee gets ₱500 deducted

---

#### Create a PERCENTAGE Deduction
```http
POST /api/admin/deduction-types
Content-Type: application/json

{
  "name": "Health Insurance",
  "description": "20% health insurance contribution",
  "amount": 0,
  "calculationType": "PERCENTAGE",
  "percentageValue": 20,
  "isMandatory": true,
  "isActive": true
}
```
**Result**: 
- Employee with ₱20,000 salary → ₱4,000 deduction (20% of ₱20,000)
- Employee with ₱30,000 salary → ₱6,000 deduction (20% of ₱30,000)

---

### Option 2: Update Your Frontend Form

If you have a form for creating deduction types, add these fields:

```tsx
// Add to your deduction type form
<select name="calculationType">
  <option value="FIXED">Fixed Amount</option>
  <option value="PERCENTAGE">Percentage of Salary</option>
</select>

{calculationType === 'PERCENTAGE' && (
  <input 
    type="number" 
    name="percentageValue" 
    placeholder="Percentage (e.g., 20 for 20%)"
    min="0"
    max="100"
  />
)}

{calculationType === 'FIXED' && (
  <input 
    type="number" 
    name="amount" 
    placeholder="Fixed amount (e.g., 500)"
    min="0"
  />
)}
```

---

## Examples

### Example 1: SSS (Percentage-based)
```json
{
  "name": "SSS",
  "description": "Social Security System - 4.5% contribution",
  "amount": 0,
  "calculationType": "PERCENTAGE",
  "percentageValue": 4.5,
  "isMandatory": true
}
```

### Example 2: Meal Allowance Deduction (Fixed)
```json
{
  "name": "Meal Allowance Deduction",
  "description": "Fixed meal deduction",
  "amount": 1000,
  "calculationType": "FIXED",
  "isMandatory": false
}
```

### Example 3: PhilHealth (Percentage-based)
```json
{
  "name": "PhilHealth",
  "description": "Philippine Health Insurance - 5% contribution",
  "amount": 0,
  "calculationType": "PERCENTAGE",
  "percentageValue": 5,
  "isMandatory": true
}
```

---

## How It Works Automatically

When you create a **mandatory** deduction:
1. System finds all active personnel
2. Gets their basic salary
3. Calculates the deduction:
   - **FIXED**: Uses the `amount` value directly
   - **PERCENTAGE**: Calculates `salary × percentageValue ÷ 100`
4. Creates individual deduction records for each employee

---

## Database Schema

The system added these fields to `deduction_types` table:
- `calculationType` - Either 'FIXED' or 'PERCENTAGE' (default: 'FIXED')
- `percentageValue` - The percentage value (0-100), used only when calculationType is 'PERCENTAGE'

---

## Testing

### Step 1: Restart your dev server
```bash
npm run dev
```

### Step 2: Test with Postman/Thunder Client
Create a percentage deduction and check if it calculates correctly for different salary levels.

### Step 3: Check the deductions in your admin panel
Go to your deductions page and verify the amounts are calculated correctly.

---

## Questions?

- **Q: Can I mix fixed and percentage deductions?**
  - Yes! Each deduction type is independent.

- **Q: What happens if employee has no salary?**
  - Percentage deductions will fallback to 0.

- **Q: Can I change a deduction from FIXED to PERCENTAGE later?**
  - Yes, but existing deduction records keep their calculated amounts. Only new deductions will use the new calculation type.
