# Leave Archive Feature - Implementation Summary

## Feature Added
Automatic separation of leave requests into **Active** and **Archived** sections based on leave end date.

## Changes Made

### File Modified: `src/app/admin/leaves/page.tsx`

## New Leave Categories

### 1. **Pending Leaves** (Unchanged)
- Status: `PENDING`
- Requires admin action (Approve/Reject)
- Displayed at top of page

### 2. **Active Leaves** (NEW)
- Status: `APPROVED`
- End date is **today or in the future**
- Currently ongoing or upcoming leaves
- View-only (can't delete active leaves)

### 3. **Archived Leaves** (NEW)
- Two types:
  - **Completed approved leaves**: End date has passed
  - **Denied leaves**: Any denied leave request
- Collapsible section (starts hidden)
- Shows count in collapse button
- Slightly faded display (`opacity-75`)
- Can be deleted by admin

## Logic Implementation

```typescript
const today = new Date()
today.setHours(0, 0, 0, 0)

// Active: Approved AND end date >= today
const activeLeaves = leaves.filter(l => {
  const endDate = new Date(l.endDate)
  endDate.setHours(0, 0, 0, 0)
  return l.status === "APPROVED" && endDate >= today
})

// Archived: (Approved AND end date < today) OR denied
const archivedLeaves = leaves.filter(l => {
  const endDate = new Date(l.endDate)
  endDate.setHours(0, 0, 0, 0)
  return (l.status === "APPROVED" && endDate < today) || l.status === "DENIED"
})
```

## UI Changes

### Page Structure (Top to Bottom)
1. **Pending Leave Requests** - Yellow badge, action buttons
2. **Active Leaves** - Green checkmark icon, view only
3. **Archived Leaves** - Collapsible, history icon, faded appearance

### Visual Indicators
- **Active section**: Green checkmark icon
- **Archived section**: History icon, collapse/expand button
- **Archived rows**: 75% opacity for visual distinction
- **Count badge**: Shows number of archived leaves

## Benefits

✅ **Better Organization** - Clear separation of active vs completed leaves
✅ **Reduced Clutter** - Hides old leaves by default
✅ **Quick Overview** - See who's currently on leave at a glance
✅ **Historical Records** - All past leaves preserved in archive
✅ **Auto-sorting** - Leaves automatically move to archive after end date

## Example Scenarios

### Scenario 1: Leave in Progress
- Start: Jan 10
- End: Jan 15
- Today: Jan 12
- **Result**: Shows in "Active Leaves"

### Scenario 2: Leave Completed
- Start: Jan 5
- End: Jan 10
- Today: Jan 15
- **Result**: Moves to "Archived Leaves"

### Scenario 3: Denied Leave
- Status: DENIED
- Any dates
- **Result**: Immediately in "Archived Leaves"

### Scenario 4: Future Leave
- Start: Jan 20
- End: Jan 25
- Today: Jan 15
- **Result**: Shows in "Active Leaves" (approved and not past end date)

## User Workflow

### Admin View
1. Review **Pending** → Approve/Reject
2. Monitor **Active** → See who's currently on leave
3. Check **Archived** → Review past leave history

### Automatic Transitions
```
PENDING (awaiting review)
   ↓ (admin approves)
ACTIVE LEAVES (ongoing/upcoming)
   ↓ (end date passes)
ARCHIVED LEAVES (completed)
```

## Testing Checklist

- [ ] Pending leaves show at top
- [ ] Approved ongoing leaves in "Active" section
- [ ] Approved past leaves in "Archived" section
- [ ] Denied leaves in "Archived" section
- [ ] Archive section starts collapsed
- [ ] Count shows correctly in collapse button
- [ ] Can view details of archived leaves
- [ ] Can delete archived leaves
- [ ] Cannot delete active leaves

## Date Implemented
2025-10-20

## Related Files
- `src/app/admin/leaves/page.tsx` - Main implementation
- `src/app/api/admin/leave-requests/route.ts` - Backend API
- `src/app/api/admin/leave-requests/[id]/route.ts` - Approval logic
