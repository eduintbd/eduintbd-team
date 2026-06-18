-- Fix: EXP-YYYY-NNNN request numbers collided on the unique constraint
-- (expense_payment_requests_request_number_key).
--
-- Two problems with the original MAX(num)+1 generator:
--   1. RACE: no lock, so concurrent inserts could read the same MAX.
--   2. DETERMINISTIC COLLISION: it parsed the counter with SUBSTRING(... FROM 10)
--      and filtered with LIKE 'EXP-YYYY-%'. Any row whose suffix isn't a clean
--      4+ digit integer (or a stray/legacy value) was either miscounted or
--      excluded from MAX, so MAX+1 could land on an already-used number.
--
-- This version:
--   * takes a per-year transaction advisory lock (kills the race),
--   * only considers rows matching the strict EXP-YYYY-<digits> shape when
--     seeding the counter (so a malformed suffix can't break CAST or MAX),
--   * then LOOPS, incrementing until it finds a number not present in ANY row,
--     guaranteeing the generated request_number is unique before insert.

CREATE OR REPLACE FUNCTION public.generate_expense_request_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  next_num INTEGER;
  year_prefix TEXT := to_char(CURRENT_DATE, 'YYYY');
  candidate TEXT;
BEGIN
  -- Serialize concurrent number assignment for this year.
  PERFORM pg_advisory_xact_lock(hashtext('expense_request_number_' || year_prefix));

  -- Seed from the highest cleanly-formatted number for this year.
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.expense_payment_requests
  WHERE request_number ~ ('^EXP-' || year_prefix || '-[0-9]+$');

  -- Bump until the candidate is unused by ANY row (handles gaps / odd data).
  LOOP
    candidate := 'EXP-' || year_prefix || '-' || LPAD(next_num::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.expense_payment_requests WHERE request_number = candidate
    );
    next_num := next_num + 1;
  END LOOP;

  NEW.request_number := candidate;
  RETURN NEW;
END;
$$;
