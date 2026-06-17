-- =============================================================================
-- bKash Expense Payments
-- Employee submits an expense payment request -> admin approves/rejects ->
-- (on approval) a server-side edge function executes the bKash payment.
--
-- Data-integrity model (three independent gates):
--   1. RLS                  - who may INSERT/SELECT/UPDATE which rows
--   2. transition trigger   - which status changes are legal + who may make them
--   3. edge function        - re-verifies role + status server-side, atomic claim
--
-- Reuses existing primitives: public.has_role(uuid, app_role), public.notifications,
-- public.employees(user_id), public.update_updated_at_column().
-- =============================================================================

-- 1. Status enum -------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.expense_payment_status AS ENUM (
    'pending_approval',   -- created by employee, awaiting admin decision
    'approved',           -- admin approved; eligible for bKash execution
    'rejected',           -- admin rejected (terminal)
    'payment_processing', -- claimed by the payment service (system only)
    'paid',               -- bKash confirmed (terminal)
    'payment_failed'      -- bKash failed; admin may re-queue back to 'approved'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Requests table ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_payment_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number  TEXT UNIQUE,                              -- auto: EXP-YYYY-NNNN
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  merchant_id     TEXT NOT NULL,                            -- bKash merchant / receiver
  purpose         TEXT NOT NULL,
  expected_date   DATE NOT NULL,
  status          public.expense_payment_status NOT NULL DEFAULT 'pending_approval',

  requested_by    UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  approved_by     UUID REFERENCES auth.users(id),
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Payment execution fields: writable by the service role ONLY (enforced below)
  payment_attempted_at TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  bkash_payment_id TEXT,
  bkash_trx_id    TEXT,
  payment_error   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_requests_requested_by ON public.expense_payment_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_expense_requests_status ON public.expense_payment_requests(status);

-- 3. Immutable audit log -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expense_payment_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID REFERENCES public.expense_payment_requests(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,           -- created | approved | rejected | payment_initiated | payment_succeeded | payment_failed | requeued
  actor_user_id UUID,                    -- auth.users(id); NULL when performed by the system (service role)
  from_status   public.expense_payment_status,
  to_status     public.expense_payment_status,
  detail        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_audit_request ON public.expense_payment_audit_log(request_id);

-- 4. Auto request number (EXP-YYYY-NNNN) -------------------------------------
CREATE OR REPLACE FUNCTION public.generate_expense_request_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  next_num INTEGER;
  year_prefix TEXT := to_char(CURRENT_DATE, 'YYYY');
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.expense_payment_requests
  WHERE request_number LIKE 'EXP-' || year_prefix || '-%';

  NEW.request_number := 'EXP-' || year_prefix || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_expense_request_number
  BEFORE INSERT ON public.expense_payment_requests
  FOR EACH ROW
  WHEN (NEW.request_number IS NULL OR NEW.request_number = '')
  EXECUTE FUNCTION public.generate_expense_request_number();

CREATE TRIGGER set_expense_request_updated_at
  BEFORE UPDATE ON public.expense_payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. State-machine + field-immutability trigger ------------------------------
-- This is the heart of data integrity: it runs no matter how the UPDATE arrives
-- (client, RPC, or service role) and rejects anything that is not an explicitly
-- whitelisted transition by an authorized actor.
CREATE OR REPLACE FUNCTION public.validate_expense_payment_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor    UUID    := auth.uid();
  v_is_system BOOLEAN := (auth.uid() IS NULL);  -- service role has no auth.uid()
  v_is_admin BOOLEAN := false;
BEGIN
  IF v_actor IS NOT NULL THEN
    v_is_admin := public.has_role(v_actor, 'admin'::public.app_role);
  END IF;

  -- 5a. Core request fields are immutable after creation (for everyone).
  IF NEW.amount        IS DISTINCT FROM OLD.amount
   OR NEW.merchant_id   IS DISTINCT FROM OLD.merchant_id
   OR NEW.purpose       IS DISTINCT FROM OLD.purpose
   OR NEW.expected_date IS DISTINCT FROM OLD.expected_date
   OR NEW.requested_by  IS DISTINCT FROM OLD.requested_by
   OR NEW.request_number IS DISTINCT FROM OLD.request_number THEN
    RAISE EXCEPTION 'Core request fields are immutable after creation';
  END IF;

  -- 5b. Payment-execution fields may be written by the system (service role) only.
  IF NOT v_is_system THEN
    IF NEW.bkash_payment_id     IS DISTINCT FROM OLD.bkash_payment_id
     OR NEW.bkash_trx_id         IS DISTINCT FROM OLD.bkash_trx_id
     OR NEW.paid_at              IS DISTINCT FROM OLD.paid_at
     OR NEW.payment_attempted_at IS DISTINCT FROM OLD.payment_attempted_at
     OR NEW.payment_error        IS DISTINCT FROM OLD.payment_error THEN
      RAISE EXCEPTION 'Payment execution fields can only be written by the payment service';
    END IF;
  END IF;

  -- 5c. Metadata-only update (no status change) is allowed past the guards above.
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- 5d. Whitelisted transitions.
  -- Human (admin) transitions:
  IF OLD.status = 'pending_approval' AND NEW.status = 'approved' THEN
    IF NOT v_is_admin THEN RAISE EXCEPTION 'Only an admin can approve a request'; END IF;
    NEW.approved_by := v_actor;
    NEW.approved_at := now();
    RETURN NEW;

  ELSIF OLD.status = 'pending_approval' AND NEW.status = 'rejected' THEN
    IF NOT v_is_admin THEN RAISE EXCEPTION 'Only an admin can reject a request'; END IF;
    NEW.approved_by := v_actor;   -- records who actioned the decision
    NEW.approved_at := now();
    RETURN NEW;

  -- System (service role) transitions:
  ELSIF OLD.status = 'approved' AND NEW.status = 'payment_processing' THEN
    IF NOT v_is_system THEN RAISE EXCEPTION 'Payment processing is initiated by the payment service only'; END IF;
    RETURN NEW;
  ELSIF OLD.status = 'payment_failed' AND NEW.status = 'payment_processing' THEN
    -- Retry of a failed payment, re-initiated by the payment service.
    IF NOT v_is_system THEN RAISE EXCEPTION 'Payment retry is initiated by the payment service only'; END IF;
    RETURN NEW;
  ELSIF OLD.status = 'payment_processing' AND NEW.status = 'paid' THEN
    IF NOT v_is_system THEN RAISE EXCEPTION 'Only the payment service can mark a request paid'; END IF;
    RETURN NEW;
  ELSIF OLD.status = 'payment_processing' AND NEW.status = 'payment_failed' THEN
    IF NOT v_is_system THEN RAISE EXCEPTION 'Only the payment service can mark a payment failed'; END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Illegal status transition: % -> %', OLD.status, NEW.status;
END;
$$;

CREATE TRIGGER validate_expense_payment_transition
  BEFORE UPDATE ON public.expense_payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_expense_payment_transition();

-- 6. Audit + notification on creation ----------------------------------------
CREATE OR REPLACE FUNCTION public.handle_expense_payment_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_requester_name TEXT;
BEGIN
  INSERT INTO public.expense_payment_audit_log(request_id, action, actor_user_id, from_status, to_status, detail)
  VALUES (NEW.id, 'created', NEW.requested_by, NULL, NEW.status,
          jsonb_build_object('amount', NEW.amount, 'merchant_id', NEW.merchant_id,
                             'purpose', NEW.purpose, 'expected_date', NEW.expected_date));

  SELECT first_name || ' ' || last_name INTO v_requester_name
  FROM public.employees WHERE user_id = NEW.requested_by;

  -- Notify every admin (the approver(s)).
  INSERT INTO public.notifications (employee_id, title, message, type, reference_id)
  SELECT DISTINCT e.id,
         'New Expense Payment Request',
         COALESCE(v_requester_name, 'An employee') || ' requested ' || NEW.amount::text ||
           ' (' || NEW.request_number || ') for: ' || NEW.purpose,
         'expense_payment_request',
         NEW.id
  FROM public.employees e
  JOIN public.user_roles ur ON ur.user_id = e.user_id
  WHERE ur.role = 'admin'::public.app_role;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_expense_payment_created
  AFTER INSERT ON public.expense_payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_expense_payment_created();

-- 7. Audit + notification on status change -----------------------------------
CREATE OR REPLACE FUNCTION public.handle_expense_payment_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_action TEXT;
  v_emp    UUID;
  v_title  TEXT;
  v_msg    TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  v_action := CASE NEW.status
    WHEN 'approved'           THEN 'approved'
    WHEN 'rejected'           THEN 'rejected'
    WHEN 'payment_processing' THEN (CASE WHEN OLD.status = 'payment_failed' THEN 'payment_retried' ELSE 'payment_initiated' END)
    WHEN 'paid'               THEN 'payment_succeeded'
    WHEN 'payment_failed'     THEN 'payment_failed'
    ELSE 'status_changed' END;

  INSERT INTO public.expense_payment_audit_log(request_id, action, actor_user_id, from_status, to_status, detail)
  VALUES (NEW.id, v_action, auth.uid(), OLD.status, NEW.status,
          jsonb_build_object('rejection_reason', NEW.rejection_reason,
                             'bkash_trx_id', NEW.bkash_trx_id,
                             'payment_error', NEW.payment_error));

  -- Notify the requester on meaningful transitions.
  SELECT id INTO v_emp FROM public.employees WHERE user_id = NEW.requested_by;
  IF v_emp IS NOT NULL AND NEW.status IN ('approved','rejected','paid','payment_failed') THEN
    v_title := CASE NEW.status
      WHEN 'approved'       THEN 'Expense Request Approved'
      WHEN 'rejected'       THEN 'Expense Request Rejected'
      WHEN 'paid'           THEN 'Expense Payment Completed'
      WHEN 'payment_failed' THEN 'Expense Payment Failed' END;
    v_msg := 'Request ' || NEW.request_number || ' (' || NEW.amount::text || ') ' ||
      CASE NEW.status
        WHEN 'approved'       THEN 'was approved and queued for payment.'
        WHEN 'rejected'       THEN 'was rejected' || COALESCE(': ' || NEW.rejection_reason, '.')
        WHEN 'paid'           THEN 'has been paid via bKash.'
        WHEN 'payment_failed' THEN 'failed to process. An admin will review it.' END;
    INSERT INTO public.notifications (employee_id, title, message, type, reference_id)
    VALUES (v_emp, v_title, v_msg, 'expense_payment_update', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_expense_payment_status_change
  AFTER UPDATE ON public.expense_payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_expense_payment_status_change();

-- 8. Row Level Security ------------------------------------------------------
ALTER TABLE public.expense_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Employees create their own requests; status is forced to pending_approval.
CREATE POLICY "Employees create own expense requests"
ON public.expense_payment_requests FOR INSERT TO authenticated
WITH CHECK (requested_by = auth.uid() AND status = 'pending_approval');

-- Owners read their own; admins read all.
CREATE POLICY "View own or admin all expense requests"
ON public.expense_payment_requests FOR SELECT TO authenticated
USING (requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Only admins can UPDATE (approve / reject / re-queue). The transition trigger
-- further restricts WHICH transitions are valid. The payment service uses the
-- service role, which bypasses RLS but is still bound by the trigger.
CREATE POLICY "Only admin updates expense requests"
ON public.expense_payment_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- No DELETE policy => deletes are denied for all clients (preserve audit trail).

-- Audit log is readable by admins and by the request owner; never client-writable
-- (rows are inserted only by the SECURITY DEFINER triggers above).
CREATE POLICY "View expense audit for own or admin"
ON public.expense_payment_audit_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.expense_payment_requests r
             WHERE r.id = request_id AND r.requested_by = auth.uid())
);
