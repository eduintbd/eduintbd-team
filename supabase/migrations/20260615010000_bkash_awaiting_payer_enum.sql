-- Tokenized Checkout is a front-channel flow: create -> payer confirms on the
-- hosted bKash page -> execute. Add an interim state for "payment created at
-- bKash, waiting for the payer to complete it".
-- (Kept in its own migration so the new enum value is committed before the
--  trigger logic in the next migration references it.)
ALTER TYPE public.expense_payment_status ADD VALUE IF NOT EXISTS 'awaiting_payer';
