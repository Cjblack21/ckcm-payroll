-- Fix mandatory deduction flags
UPDATE deduction_types 
SET isMandatory = 1 
WHERE name IN ('SSS', 'PHILHEALTH', 'PhilHealth', 'BIR', 'PAG-IBIG', 'Pag-IBIG', 'PAGIBIG');

-- Verify the update
SELECT name, isMandatory, isActive FROM deduction_types;
