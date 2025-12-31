-- Add location columns to attendance_records for clock in/out with GPS coordinates
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS clock_in_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS clock_in_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS clock_out_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS clock_out_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS clock_in_address TEXT,
ADD COLUMN IF NOT EXISTS clock_out_address TEXT;