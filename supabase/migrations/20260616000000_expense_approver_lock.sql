-- Lock expense-payment approval + bKash execution to a SINGLE account:
-- syed@eduintbd.com. Employees can still create and view their OWN requests,
-- but only this account can view all requests, approve/reject, or pay.
--
-- Enforced in the database (RLS + the state-machine trigger). The edge function
-- and UI add matching checks, but the DB is the real boundary.
--
-- To change the approver later, update is_expense_approver() (one place) and the
-- email constants in the edge function + frontend.

-- 1. Single-approver predicate (reads the caller's JWT email).
CREATE OR REPLACE FUNCTION public.is_expense_approver()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'syed@eduintbd.com';
$$;

-- 2. SELECT: owner sees own; the approver sees all.
DROP POLICY IF EXISTS "View own or admin all expense requests" ON public.expense_payment_requests;
CREATE POLICY "View own or approver all expense requests"
ON public.expense_payment_requests FOR SELECT TO authenticated
USING (requested_by = auth.uid() OR public.is_expense_approver());

-- 3. UPDATE: approver only (transition trigger further restricts which changes).
DROP POLICY IF EXISTS "Only admin updates expense requests" ON public.expense_payment_requests;
CREATE POLICY "Only approver updates expense requests"
ON public.expense_payment_requests FOR UPDATE TO authenticated
USING (public.is_expense_approver())
WITH CHECK (public.is_expense_approver());

-- 4. Audit log: approver or the request owner may read.
DROP POLICY IF EXISTS "View expense audit for own or admin" ON public.expense_payment_audit_log;
CREATE POLICY "View expense audit for own or approver"
ON public.expense_payment_audit_log FOR SELECT TO authenticated
USING (
  public.is_expense_approver()
  OR EXISTS (SELECT 1 FROM public.expense_payment_requests r
             WHERE r.id = request_id AND r.requested_by = auth.uid())
);

-- 5. State-machine trigger: human (approve/reject/cancel) transitions require the
--    approver account; system (service-role) transitions unchanged.
CREATE OR REPLACE FUNCTION public.validate_expense_payment_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor      UUID    := auth.uid();
  v_is_system  BOOLEAN := (auth.uid() IS NULL);
  v_is_approver BOOLEAN := false;
BEGIN
  IF v_actor IS NOT NULL THEN
    v_is_approver := public.is_expense_approver();
  END IF;

  -- Core request fields immutable after creation (everyone).
  IF NEW.amount        IS DISTINCT FROM OLD.amount
   OR NEW.merchant_id   IS DISTINCT FROM OLD.merchant_id
   OR NEW.purpose       IS DISTINCT FROM OLD.purpose
   OR NEW.expected_date IS DISTINCT FROM OLD.expected_date
   OR NEW.requested_by  IS DISTINCT FROM OLD.requested_by
   OR NEW.request_number IS DISTINCT FROM OLD.request_number THEN
    RAISE EXCEPTION 'Core request fields are immutable after creation';
  END IF;

  -- Payment-execution fields writable by the system (service role) only.
  IF NOT v_is_system THEN
    IF NEW.bkash_payment_id     IS DISTINCT FROM OLD.bkash_payment_id
     OR NEW.bkash_trx_id         IS DISTINCT FROM OLD.bkash_trx_id
     OR NEW.paid_at              IS DISTINCT FROM OLD.paid_at
     OR NEW.payment_attempted_at IS DISTINCT FROM OLD.payment_attempted_at
     OR NEW.payment_error        IS DISTINCT FROM OLD.payment_error THEN
      RAISE EXCEPTION 'Payment execution fields can only be written by the payment service';
    END IF;
  END IF;

  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  -- Human (approver) transitions
  IF OLD.status = 'pending_approval' AND NEW.status = 'approved' THEN
    IF NOT v_is_approver THEN RAISE EXCEPTION 'Only the designated approver can approve a request'; END IF;
    NEW.approved_by := v_actor; NEW.approved_at := now();
    RETURN NEW;
  ELSIF OLD.status = 'pending_approval' AND NEW.status = 'rejected' THEN
    IF NOT v_is_approver THEN RAISE EXCEPTION 'Only the designated approver can reject a request'; END IF;
    NEW.approved_by := v_actor; NEW.approved_at := now();
    RETURN NEW;

  -- System (service role) transitions
  ELSIF OLD.status = 'approved'           AND NEW.status = 'payment_processing' THEN
    IF NOT v_is_system THEN RAISE EXCEPTION 'Payment is initiated by the payment service only'; END IF;
    RETURN NEW;
  ELSIF OLD.status = 'payment_failed'     AND NEW.status = 'payment_processing' THEN
    IF NOT v_is_system THEN RAISE EXCEPTION 'Payment retry is initiated by the payment service only'; END IF;
    RETURN NEW;
  ELSIF OLD.status = 'awaiting_payer'     AND NEW.status = 'payment_processing' THEN
    IF NOT v_is_system THEN RAISE EXCEPTION 'Payment execution is performed by the payment service only'; END IF;
    RETURN NEW;
  ELSIF OLD.status = 'payment_processing' AND NEW.status = 'awaiting_payer' THEN
    IF NOT v_is_system THEN RAISE EXCEPTION 'Only the payment service can move to awaiting_payer'; END IF;
    RETURN NEW;
  ELSIF OLD.status = 'awaiting_payer'     AND NEW.status = 'payment_failed' THEN
    -- System (gateway cancel/fail) or the approver (manually abandon to retry).
    IF NOT (v_is_system OR v_is_approver) THEN RAISE EXCEPTION 'Only the payment service or the approver can fail a payment'; END IF;
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

-- 6. On creation, notify the approver account (instead of all admins).
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

  INSERT INTO public.notifications (employee_id, title, message, type, reference_id)
  SELECT e.id,
         'New Expense Payment Request',
         COALESCE(v_requester_name, 'An employee') || ' requested ' || NEW.amount::text ||
           ' (' || NEW.request_number || ') for: ' || NEW.purpose,
         'expense_payment_request',
         NEW.id
  FROM public.employees e
  JOIN auth.users u ON u.id = e.user_id
  WHERE lower(u.email) = 'syed@eduintbd.com';

  RETURN NEW;
END;
$$;
