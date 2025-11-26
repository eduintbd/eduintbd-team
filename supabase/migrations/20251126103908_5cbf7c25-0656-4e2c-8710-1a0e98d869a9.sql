-- Add bank statement storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('bank-documents', 'bank-documents', false);

-- Add RLS policies for bank documents bucket
CREATE POLICY "Users can upload their own bank documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'bank-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own bank documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'bank-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own bank documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'bank-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own bank documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'bank-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins and HR managers can view all bank documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'bank-documents' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'hr_manager'::app_role))
);

-- Add bank verification fields to employees table
ALTER TABLE employees
ADD COLUMN bank_statement_url text,
ADD COLUMN bank_details_verified boolean DEFAULT false,
ADD COLUMN bank_details_update_requested boolean DEFAULT false,
ADD COLUMN verified_by uuid REFERENCES employees(id),
ADD COLUMN verified_at timestamp with time zone;