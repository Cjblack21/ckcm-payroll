# Payroll Release Feature - Period End Date Restriction

## Changes Made

### 1. Release Button Restriction
The "Release Payroll" button is now **only active on or after the Period End date**.

#### Logic:
- Compares current date with the period end date (both normalized to start of day)
- Button is disabled if current date is before period end date
- Button shows helpful tooltip: "Release only available on or after [Period End Date]"
- Button text changes to "Release (Not Yet Period End)" when disabled due to date

### 2. Visual Indicators

#### Current Period Card
Added a new "Can Release" column showing:
- **Green badge "Yes"** + "Ready to release" when date allows release
- **Red badge "No"** + "Wait until [date]" when too early to release

### 3. Auto-Generate Payslips
When payroll is successfully released:
- System automatically generates payslips
- Opens payslips in new window for printing
- If auto-generation fails, shows error but payroll remains released
- User can manually generate payslips if needed

## User Workflow

### Before Period End Date
1. Generate Payroll ✅ (available anytime)
2. Release Payroll ❌ (disabled - shows "Release (Not Yet Period End)")
3. Generate Payslips ❌ (disabled until released)

### On or After Period End Date
1. Generate Payroll ✅ (if not already generated)
2. Release Payroll ✅ (now enabled)
3. Release automatically triggers payslip generation ✅
4. Payslips open in new window for printing ✅

## Technical Implementation

### State Management
```typescript
const [canRelease, setCanRelease] = useState(false)
```

### Date Comparison
```typescript
const periodEnd = new Date(result.summary.settings.periodEnd)
const today = new Date()
periodEnd.setHours(0, 0, 0, 0)
today.setHours(0, 0, 0, 0)
const canReleaseNow = today >= periodEnd
setCanRelease(canReleaseNow)
```

### Button Condition
```typescript
<Button 
  onClick={handleReleasePayroll} 
  disabled={loading || !hasGeneratedForSettings || currentPeriod?.status === 'Released' || !canRelease}
  title={!canRelease && currentPeriod?.periodEnd ? 
    `Release only available on or after ${formatDateForDisplay(new Date(currentPeriod.periodEnd))}` : 
    ''}
>
```

### Auto-Generate Payslips
```typescript
// After successful release
toast.loading('Generating payslips...', { id: 'auto-generate-payslips' })
setTimeout(async () => {
  try {
    await handleGeneratePayslips()
    toast.success('Payslips generated successfully!', { id: 'auto-generate-payslips' })
  } catch (error) {
    toast.error('Payroll released but failed to auto-generate payslips. Please generate manually.', 
      { id: 'auto-generate-payslips' })
  }
}, 1000)
```

## Benefits

1. **Prevents Early Release**: Ensures payroll is only released after the pay period actually ends
2. **Clear Feedback**: Users see exactly when they can release payroll
3. **Automated Workflow**: Payslips automatically generate after release
4. **Error Tolerance**: If auto-generation fails, payroll is still released and user can retry manually
5. **Better UX**: Visual indicators make the state clear at a glance

## Testing

### Test Scenarios

1. **Before Period End**
   - Release button should be disabled
   - Button shows "Release (Not Yet Period End)"
   - Hover shows tooltip with exact date
   - "Can Release" shows red "No" badge

2. **On Period End Date**
   - Release button becomes enabled (if payroll generated)
   - Button shows "Release Payroll"
   - "Can Release" shows green "Yes" badge
   - Clicking release triggers payslip generation

3. **After Period End**
   - Same as "On Period End Date"
   - System should work normally

4. **Edge Cases**
   - No period end date set: Release disabled
   - Payroll not generated: Release disabled
   - Already released: Button shows "Payroll Released" and is disabled

## Files Modified

- `src/app/admin/payroll/page.tsx`

## Environment Considerations

- Date comparison uses local time zone
- Normalizes dates to start of day (00:00:00) for fair comparison
- Works across different time zones
- Console logs for debugging: Shows comparison dates in ISO format
