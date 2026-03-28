
-- Create task_templates table
CREATE TABLE public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  auto_assign_on_employee_creation BOOLEAN DEFAULT false,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create task_template_items table
CREATE TABLE public.task_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  priority VARCHAR DEFAULT 'medium',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR,
  visibility_level VARCHAR DEFAULT 'private',
  due_days_offset INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_template_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_templates
CREATE POLICY "Admins and managers can manage templates"
ON public.task_templates
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated users can view active templates"
ON public.task_templates
FOR SELECT
USING (is_active = true);

-- RLS Policies for task_template_items
CREATE POLICY "Admins and managers can manage template items"
ON public.task_template_items
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Authenticated users can view template items"
ON public.task_template_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM task_templates 
  WHERE task_templates.id = task_template_items.template_id 
  AND task_templates.is_active = true
));

-- Add updated_at trigger for task_templates
CREATE TRIGGER update_task_templates_updated_at
BEFORE UPDATE ON public.task_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
