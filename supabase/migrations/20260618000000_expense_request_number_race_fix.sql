-- Fix: EXP-YYYY-NNNN request numbers could collide under concurrent inserts.
-- The generator used MAX(num)+1 with no lock, so two inserts racing together
-- both read the same MAX and produced the same request_number, tripping the
-- unique constraint (expense_payment_requests_request_number_key).
--
-- Serialize number assignment per-year with a transaction-scoped advisory lock:
-- a concurrent insert now blocks until the in-flight one commits, then reads the
-- updated MAX. The lock auto-releases at end of transaction (commit or rollback).

CREATE OR REPLACE FUNCTION public.generate_expense_request_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  next_num INTEGER;
  year_prefix TEXT := to_char(CURRENT_DATE, 'YYYY');
BEGIN
  -- Serialize concurrent number assignment for this year.
  PERFORM pg_advisory_xact_lock(hashtext('expense_request_number_' || year_prefix));

  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.expense_payment_requests
  WHERE request_number LIKE 'EXP-' || year_prefix || '-%';

  NEW.request_number := 'EXP-' || year_prefix || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;
