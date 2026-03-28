-- Add missing accounts for adjusting entries
INSERT INTO public.chart_of_accounts (account_code, account_name, account_type, account_subtype, description, is_active)
VALUES 
  ('1550', 'Accumulated Depreciation - IT Equipment', 'asset', 'fixed_asset', 'Contra-asset account for IT equipment depreciation', true),
  ('5800', 'Depreciation Expense', 'expense', 'operating_expense', 'Annual depreciation expense for fixed assets', true),
  ('5900', 'Interest Expense', 'expense', 'other_expense', 'Interest expense on loans and payables', true),
  ('2100', 'Interest Payable', 'liability', 'current_liability', 'Accrued interest on loans', true);