-- Fix the tasks table foreign key constraint on assigned_by
-- The assigned_by column should be nullable and not strictly enforce foreign key
-- since the task creator might not always be an employee in the system

-- Drop the existing foreign key constraint if it exists
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_assigned_by_fkey;

-- Add a new foreign key constraint that allows NULL values
-- This allows tasks to be created even if assigned_by is not set
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_assigned_by_fkey 
FOREIGN KEY (assigned_by) 
REFERENCES public.employees(id) 
ON DELETE SET NULL;