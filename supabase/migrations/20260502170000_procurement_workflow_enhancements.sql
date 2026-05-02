-- Enhanced Procurement Workflow: Pre-approval, Fund Transfer, Voucher Verification

-- 1a. Extend purchase_order_status enum with new statuses
ALTER TYPE purchase_order_status ADD VALUE IF NOT EXISTS 'pending_pre_approval';
ALTER TYPE purchase_order_status ADD VALUE IF NOT EXISTS 'pre_approved';
ALTER TYPE purchase_order_status ADD VALUE IF NOT EXISTS 'pending_verification';

-- 1b. Add pre-approval columns to purchase_orders
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS pre_approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS pre_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pre_approval_notes TEXT;

-- 1c. Add voucher verification columns to purchase_orders
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS voucher_number TEXT,
  ADD COLUMN IF NOT EXISTS voucher_date DATE,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voucher_notes TEXT;

-- 1d. Add journal entry linkage to procurement_payments
ALTER TABLE procurement_payments
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES journal_entries(id),
  ADD COLUMN IF NOT EXISTS expense_account_id UUID REFERENCES chart_of_accounts(id);

-- 1e. Seed Procurement Expense account
INSERT INTO chart_of_accounts (account_code, account_name, account_type, account_subtype, description, is_active)
VALUES ('6000', 'Procurement Expense', 'expense', 'operating_expense', 'General procurement and purchasing expenses', true)
ON CONFLICT (account_code) DO NOTHING;

-- 1f. RLS: Managers can pre-approve purchase orders
CREATE POLICY "Managers can pre-approve purchase_orders"
ON purchase_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager', 'admin'))
  AND status = 'pending_pre_approval'
)
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager', 'admin'))
  AND status IN ('pre_approved', 'rejected')
);

-- 1g. RLS: PO creators can submit their own drafts for pre-approval
CREATE POLICY "Users can submit own drafts for pre-approval"
ON purchase_orders
FOR UPDATE
TO authenticated
USING (
  status = 'draft'
  AND requested_by = auth.uid()
)
WITH CHECK (
  status = 'pending_pre_approval'
);

-- 1h. RPC function for auto-creating journal entries on fund transfer
CREATE OR REPLACE FUNCTION create_procurement_journal_entry(
  p_payment_id UUID,
  p_expense_account_id UUID,
  p_cash_account_id UUID DEFAULT '98a05975-ae4e-4246-9cd8-8900020ebc7a'
)
RETURNS UUID AS $$
DECLARE
  v_payment RECORD;
  v_entry_id UUID;
  v_entry_number TEXT;
  v_max_num INT;
BEGIN
  -- Fetch payment details
  SELECT pp.*, po.po_number, v.name as vendor_name
  INTO v_payment
  FROM procurement_payments pp
  LEFT JOIN purchase_orders po ON pp.purchase_order_id = po.id
  LEFT JOIN vendors v ON pp.vendor_id = v.id
  WHERE pp.id = p_payment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_payment.journal_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'Journal entry already exists for this payment';
  END IF;

  -- Generate entry number (BP-YYYY-NNNNN pattern)
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(entry_number FROM '(\d+)$') AS INT)
  ), 0) INTO v_max_num
  FROM journal_entries
  WHERE entry_number LIKE 'BP-%';

  v_entry_number := 'BP-' || to_char(v_payment.date, 'YYYY') || '-' || LPAD((v_max_num + 1)::TEXT, 5, '0');

  -- Create journal entry
  INSERT INTO journal_entries (entry_number, entry_date, description, reference, status, entry_type, created_by)
  VALUES (
    v_entry_number,
    v_payment.date,
    'Procurement payment' ||
      COALESCE(' for PO ' || v_payment.po_number, '') ||
      COALESCE(' to ' || v_payment.vendor_name, ''),
    v_payment.reference_number,
    'posted',
    'payment',
    v_payment.recorded_by
  )
  RETURNING id INTO v_entry_id;

  -- Line 1: Debit the expense account
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, line_number)
  VALUES (v_entry_id, p_expense_account_id,
    'Procurement payment' || COALESCE(' - PO ' || v_payment.po_number, ''),
    v_payment.amount, 0, 1);

  -- Line 2: Credit Cash & Bank
  INSERT INTO journal_entry_lines (journal_entry_id, account_id, description, debit, credit, line_number)
  VALUES (v_entry_id, p_cash_account_id,
    'Bank transfer' || COALESCE(' - PO ' || v_payment.po_number, ''),
    0, v_payment.amount, 2);

  -- Link journal entry back to the payment
  UPDATE procurement_payments
  SET journal_entry_id = v_entry_id,
      expense_account_id = p_expense_account_id
  WHERE id = p_payment_id;

  RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
