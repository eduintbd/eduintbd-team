-- Server-side journal voucher numbering.
-- entry_number is UNIQUE and was generated client-side by scanning visible
-- entries. Now that makers only see their OWN entries (RLS), that scan would
-- miss others' numbers and collide. This SECURITY DEFINER function computes the
-- next voucher number across ALL entries of the type/month, bypassing RLS, so
-- any maker gets a correct, non-colliding number.

CREATE OR REPLACE FUNCTION public.next_journal_voucher_number(
  p_prefix     text,
  p_entry_type text,
  p_entry_date date
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year  text := to_char(p_entry_date, 'YYYY');
  v_month text := to_char(p_entry_date, 'MM');
  v_start date := date_trunc('month', p_entry_date)::date;
  v_end   date := (date_trunc('month', p_entry_date) + interval '1 month')::date;
  v_max   int  := 0;
BEGIN
  SELECT COALESCE(MAX((substring(entry_number from '-(\d+)$'))::int), 0)
  INTO v_max
  FROM public.journal_entries
  WHERE entry_type = p_entry_type
    AND entry_date >= v_start
    AND entry_date <  v_end
    AND entry_number ~ '-(\d+)$';

  RETURN p_prefix || '-' || v_year || '-' || v_month || '-' || lpad((v_max + 1)::text, 5, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_journal_voucher_number(text, text, date) TO authenticated;
