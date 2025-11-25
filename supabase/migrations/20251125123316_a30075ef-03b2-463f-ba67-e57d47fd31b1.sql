-- Create employee-cvs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-cvs', 'employee-cvs', false);

-- Allow users to upload their own CV during registration
CREATE POLICY "Users can upload their own CV"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'employee-cvs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own CV
CREATE POLICY "Users can view their own CV"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'employee-cvs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins and HR managers to view all CVs
CREATE POLICY "Admins and HR can view all CVs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'employee-cvs' 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'hr_manager'::app_role)
  )
);