-- Update the expense-payment state machine for the bKash Tokenized Checkout
-- create -> (payer) -> execute flow.
--
-- Status lifecycle:
--   pending_approval --admin--> approved | rejected
--   approved | payment_failed --system--> payment_processing   (claim for "create")
--   payment_processing --system--> awaiting_payer              (bKash create OK)
--   payment_processing --system--> payment_failed              (bKash create failed)
--   awaiting_payer --system--> payment_processing              (claim for "execute")
--   awaiting_payer --system--> payment_failed                  (payer cancelled/failed)
--   payment_processing --system--> paid                        (bKash execute OK)
--   payment_processing --system--> payment_failed              (bKash execute failed)
-- Terminal: paid, rejected.
--
-- "system" = the service-role edge functions (auth.uid() IS NULL). Human (admin)
-- transitions are limited to approve/reject. Field-immutability rules are
-- unchanged from the original migration.

CREATE OR REPLACE FUNCTION public.validate_expense_payment_transition()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor    UUID    := auth.uid();
  v_is_system BOOLEAN := (auth.uid() IS NULL);
  v_is_admin BOOLEAN := false;
BEGIN
  IF v_actor IS NOT NULL THEN
    v_is_admin := public.has_role(v_actor, 'admin'::public.app_role);
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

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Human (admin) transitions
  IF OLD.status = 'pending_approval' AND NEW.status = 'approved' THEN
    IF NOT v_is_admin THEN RAISE EXCEPTION 'Only an admin can approve a request'; END IF;
    NEW.approved_by := v_actor; NEW.approved_at := now();
    RETURN NEW;
  ELSIF OLD.status = 'pending_approval' AND NEW.status = 'rejected' THEN
    IF NOT v_is_admin THEN RAISE EXCEPTION 'Only an admin can reject a request'; END IF;
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
    -- System: payer cancelled/failed at the gateway. Admin: manually abandon a
    -- payment the payer never completed (so it can be retried). Production
    -- should reconcile via the bKash Query API before abandoning, to avoid
    -- abandoning a payment the payer actually completed.
    IF NOT (v_is_system OR v_is_admin) THEN RAISE EXCEPTION 'Only the payment service or an admin can fail a payment'; END IF;
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

-- Audit-action labels for the new intermediate states (no requester notification
-- on the transient states; paid/rejected/failed/approved still notify as before).
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
    WHEN 'payment_processing' THEN (CASE WHEN OLD.status = 'awaiting_payer' THEN 'payment_executing'
                                         WHEN OLD.status = 'payment_failed' THEN 'payment_retried'
                                         ELSE 'payment_initiated' END)
    WHEN 'awaiting_payer'     THEN 'payment_created'
    WHEN 'paid'               THEN 'payment_succeeded'
    WHEN 'payment_failed'     THEN 'payment_failed'
    ELSE 'status_changed' END;

  INSERT INTO public.expense_payment_audit_log(request_id, action, actor_user_id, from_status, to_status, detail)
  VALUES (NEW.id, v_action, auth.uid(), OLD.status, NEW.status,
          jsonb_build_object('rejection_reason', NEW.rejection_reason,
                             'bkash_payment_id', NEW.bkash_payment_id,
                             'bkash_trx_id', NEW.bkash_trx_id,
                             'payment_error', NEW.payment_error));

  SELECT id INTO v_emp FROM public.employees WHERE user_id = NEW.requested_by;
  IF v_emp IS NOT NULL AND NEW.status IN ('approved','rejected','paid','payment_failed') THEN
    v_title := CASE NEW.status
      WHEN 'approved'       THEN 'Expense Request Approved'
      WHEN 'rejected'       THEN 'Expense Request Rejected'
      WHEN 'paid'           THEN 'Expense Payment Completed'
      WHEN 'payment_failed' THEN 'Expense Payment Failed' END;
    v_msg := 'Request ' || NEW.request_number || ' (' || NEW.amount::text || ') ' ||
      CASE NEW.status
        WHEN 'approved'       THEN 'was approved and is ready for payment.'
        WHEN 'rejected'       THEN 'was rejected' || COALESCE(': ' || NEW.rejection_reason, '.')
        WHEN 'paid'           THEN 'has been paid via bKash.'
        WHEN 'payment_failed' THEN 'failed to process. An admin will review it.' END;
    INSERT INTO public.notifications (employee_id, title, message, type, reference_id)
    VALUES (v_emp, v_title, v_msg, 'expense_payment_update', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
