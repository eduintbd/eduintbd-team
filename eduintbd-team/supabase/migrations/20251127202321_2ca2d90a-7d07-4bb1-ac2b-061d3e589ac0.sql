-- Create task_comments table
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_attachments table
CREATE TABLE public.task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_comments
-- Users can view comments on tasks they're assigned to or created
CREATE POLICY "Users can view comments on their tasks"
ON public.task_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_comments.task_id
    AND (tasks.assigned_to = (SELECT id FROM public.employees WHERE user_id = auth.uid())
         OR tasks.assigned_by = (SELECT id FROM public.employees WHERE user_id = auth.uid()))
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr_manager')
);

-- Users can add comments to tasks they're assigned to or created
CREATE POLICY "Users can add comments to their tasks"
ON public.task_comments
FOR INSERT
WITH CHECK (
  employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_comments.task_id
    AND (tasks.assigned_to = employee_id
         OR tasks.assigned_by = employee_id
         OR public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'hr_manager'))
  )
);

-- RLS Policies for task_attachments
-- Users can view attachments on tasks they're assigned to or created
CREATE POLICY "Users can view attachments on their tasks"
ON public.task_attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_attachments.task_id
    AND (tasks.assigned_to = (SELECT id FROM public.employees WHERE user_id = auth.uid())
         OR tasks.assigned_by = (SELECT id FROM public.employees WHERE user_id = auth.uid()))
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr_manager')
);

-- Users can upload attachments to tasks they're assigned to or created
CREATE POLICY "Users can upload attachments to their tasks"
ON public.task_attachments
FOR INSERT
WITH CHECK (
  employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = task_attachments.task_id
    AND (tasks.assigned_to = employee_id
         OR tasks.assigned_by = employee_id
         OR public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'hr_manager'))
  )
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON public.task_attachments
FOR DELETE
USING (
  employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'hr_manager')
);

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false);

-- Storage policies for task-attachments bucket
-- Users can view attachments for tasks they're involved in
CREATE POLICY "Users can view task attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'task-attachments'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr_manager')
    OR EXISTS (
      SELECT 1 FROM public.task_attachments ta
      JOIN public.tasks t ON t.id = ta.task_id
      WHERE ta.file_path = name
      AND (t.assigned_to = (SELECT id FROM public.employees WHERE user_id = auth.uid())
           OR t.assigned_by = (SELECT id FROM public.employees WHERE user_id = auth.uid()))
    )
  )
);

-- Users can upload attachments for tasks they're involved in
CREATE POLICY "Users can upload task attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr_manager')
    OR auth.uid() IS NOT NULL
  )
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete their task attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'task-attachments'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'hr_manager')
    OR EXISTS (
      SELECT 1 FROM public.task_attachments ta
      WHERE ta.file_path = name
      AND ta.employee_id = (SELECT id FROM public.employees WHERE user_id = auth.uid())
    )
  )
);

-- Create indexes for better performance
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_employee_id ON public.task_comments(employee_id);
CREATE INDEX idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX idx_task_attachments_employee_id ON public.task_attachments(employee_id);