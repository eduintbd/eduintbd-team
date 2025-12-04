-- Create internal messages table
CREATE TABLE public.internal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  parent_message_id UUID REFERENCES public.internal_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message recipients table (supports multiple recipients)
CREATE TABLE public.message_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.internal_messages(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL DEFAULT 'to' CHECK (recipient_type IN ('to', 'cc', 'bcc')),
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;

-- RLS policies for internal_messages
CREATE POLICY "Users can view messages they sent"
  ON public.internal_messages FOR SELECT
  USING (sender_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert messages"
  ON public.internal_messages FOR INSERT
  WITH CHECK (sender_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their sent messages"
  ON public.internal_messages FOR UPDATE
  USING (sender_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- RLS policies for message_recipients
CREATE POLICY "Users can view messages sent to them"
  ON public.message_recipients FOR SELECT
  USING (recipient_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "Users can view recipients of messages they sent"
  ON public.message_recipients FOR SELECT
  USING (message_id IN (
    SELECT id FROM internal_messages WHERE sender_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  ));

CREATE POLICY "Users can insert message recipients"
  ON public.message_recipients FOR INSERT
  WITH CHECK (message_id IN (
    SELECT id FROM internal_messages WHERE sender_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  ));

CREATE POLICY "Recipients can update their own recipient record"
  ON public.message_recipients FOR UPDATE
  USING (recipient_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_recipients;

-- Create indexes for performance
CREATE INDEX idx_messages_sender ON public.internal_messages(sender_id);
CREATE INDEX idx_messages_created ON public.internal_messages(created_at DESC);
CREATE INDEX idx_recipients_message ON public.message_recipients(message_id);
CREATE INDEX idx_recipients_recipient ON public.message_recipients(recipient_id);

-- Update timestamp trigger
CREATE TRIGGER update_internal_messages_updated_at
  BEFORE UPDATE ON public.internal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();