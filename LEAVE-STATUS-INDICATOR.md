# Leave Status Indicator - User Management

## Feature Added
Real-time "On Leave" badge in the User Management page showing which employees are currently on approved leave.

## Changes Made

### 1. Frontend: `src/components/user-management.tsx`

#### User Interface Update
- Added `currentLeave` field to `User` interface
- Imported Tooltip components
- Added badge display with tooltip

#### Visual Indicator
```tsx
Status Column now shows:
┌──────────────────┐
│ ✅ Active        │ ← Account status
│ 🏖️ On Leave    │ ← NEW: Leave badge (if applicable)
└──────────────────┘
```

#### Tooltip on Hover
When hovering over "On Leave" badge:
```
╔══════════════════╗
║ VACATION         ║ ← Leave type
║ Jan 10 - Jan 15  ║ ← Date range
║ Paid             ║ ← Paid/Unpaid
╚══════════════════╝
```

### 2. Backend: `src/app/api/admin/users/route.ts`

#### Query Enhancement
Added leave request query to user fetch:
```typescript
leaveRequests: {
  where: {
    status: 'APPROVED',
    startDate: { lte: new Date() },  // Started
    endDate: { gte: new Date() }      // Not ended yet
  },
  take: 1
}
```

#### Response Transform
Converts leave data to `currentLeave` object:
```typescript
currentLeave: {
  startDate: "2025-01-10",
  endDate: "2025-01-15",
  type: "VACATION",
  isPaid: true
}
```

## How It Works

### Real-Time Detection
```
1. User Management page loads
   ↓
2. API fetches all users
   ↓
3. For each user, query checks:
   - Approved leaves (status: APPROVED)
   - Currently active (startDate <= today <= endDate)
   ↓
4. If found → Add "On Leave" badge
   If not → Show only Active/Inactive status
```

### Leave Badge Logic
```typescript
Show badge IF:
- Leave status = APPROVED ✅
- Today >= startDate ✅
- Today <= endDate ✅

Badge appears automatically when:
- Leave period starts
- Admin approves leave mid-period

Badge disappears automatically when:
- Leave period ends
- Leave is denied/deleted
```

## UI Features

### Badge Styling
- **Color**: Blue background with blue border
- **Icon**: 🏖️ emoji
- **Text**: "On Leave"
- **Cursor**: Help cursor (indicates tooltip)

### Tooltip Information
- **Leave Type**: VACATION, SICK, EMERGENCY, etc.
- **Date Range**: Start and end dates (localized format)
- **Payment Status**: Paid or Unpaid

## Benefits

✅ **Quick Overview** - See who's on leave at a glance
✅ **Real-Time** - Updates automatically based on dates
✅ **Detailed Info** - Hover for leave details
✅ **No Manual Updates** - Fully automatic
✅ **Visual Clarity** - Clear blue badge stands out

## Example Scenarios

### Scenario 1: Employee on Active Leave
```
User: John Doe
Leave: Jan 10-15 (Vacation, Paid)
Today: Jan 12

Status Column Shows:
┌────────────────┐
│ ✅ Active      │
│ 🏖️ On Leave  │ ← Visible
└────────────────┘
```

### Scenario 2: Leave Ended
```
User: Jane Smith
Leave: Jan 5-10 (Sick, Paid)
Today: Jan 15

Status Column Shows:
┌────────────────┐
│ ✅ Active      │ ← Badge removed
└────────────────┘
```

### Scenario 3: Future Leave
```
User: Bob Wilson
Leave: Jan 20-25 (Vacation, Paid)
Today: Jan 15

Status Column Shows:
┌────────────────┐
│ ✅ Active      │ ← No badge yet
└────────────────┘
```

### Scenario 4: Multiple Users
```
User List View:
┌──────────────────────────────────────┐
│ Alice Brown    │ ✅ Active           │
│ Bob Wilson     │ ✅ Active           │
│                │ 🏖️ On Leave        │
│ Carol Davis    │ ✅ Active           │
│ David Lee      │ ✅ Active           │
│                │ 🏖️ On Leave        │
│ Eve Martinez   │ ❌ Inactive         │
└──────────────────────────────────────┘
```

## Admin Workflow

### Managing Users on Leave
1. Open `/admin/user-management`
2. Scan Status column for 🏖️ badges
3. Hover over badge to see leave details
4. Know who's unavailable without checking leave page

### Quick Reference
- **Blue badge** = Currently on leave
- **No badge** = Available
- **Red badge** = Inactive account

## Performance

- **Efficient Query**: Uses Prisma's `take: 1` to limit results
- **Date Filtering**: Database-level date comparison
- **Minimal Overhead**: Only fetches current leaves
- **No Extra API Calls**: Integrated in main user fetch

## Testing Checklist

- [ ] Badge appears when leave period starts
- [ ] Badge disappears when leave period ends
- [ ] Tooltip shows correct leave details
- [ ] Works for paid and unpaid leaves
- [ ] Works for all leave types
- [ ] Multiple users can have badges simultaneously
- [ ] Badge updates after page refresh
- [ ] No badge for pending/denied leaves
- [ ] Badge only shows for approved leaves

## Date Implemented
2025-10-20

## Related Files
- `src/components/user-management.tsx` - Frontend UI
- `src/app/api/admin/users/route.ts` - Backend API
- `src/app/admin/leaves/page.tsx` - Leave management (related)
