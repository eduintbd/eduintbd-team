-- Create table for role upgrade requests
CREATE TABLE IF NOT EXISTS public.role_upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  requested_role app_role NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by UUID REFERENCES public.employees(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_upgrade_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view their own requests
CREATE POLICY "Employees can view their own role requests"
ON public.role_upgrade_requests
FOR SELECT
TO authenticated
USING (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
);

-- Employees can create their own role upgrade requests
CREATE POLICY "Employees can create role upgrade requests"
ON public.role_upgrade_requests
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id IN (
    SELECT id FROM public.employees WHERE user_id = auth.uid()
  )
  AND status = 'pending'
);

-- Only admin can view all requests
CREATE POLICY "Admin can view all role requests"
ON public.role_upgrade_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Only admin can update requests (approve/reject)
CREATE POLICY "Admin can manage role requests"
ON public.role_upgrade_requests
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_role_upgrade_requests_updated_at
BEFORE UPDATE ON public.role_upgrade_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();