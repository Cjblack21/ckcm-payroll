-- Check current attendance settings
SELECT * FROM AttendanceSettings;

-- Fix period dates if they're inverted (start after end)
-- Replace with correct dates for your payroll period
UPDATE AttendanceSettings 
SET periodStart = '2025-10-21T00:00:00.000Z',
    periodEnd = '2025-11-05T23:59:59.999Z'
WHERE periodStart > periodEnd;

-- Verify the fix
SELECT * FROM AttendanceSettings;
