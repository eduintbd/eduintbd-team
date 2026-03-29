-- First ensure the parent Owner's Equity account exists
INSERT INTO public.chart_of_accounts (
  account_code, account_name, account_type, account_subtype, description, is_active
)
VALUES ('3000', 'Owner''s Equity', 'equity', 'shareholders_equity', 'Total owner equity', true)
ON CONFLICT (account_code) DO NOTHING;

-- Create individual owner capital accounts as sub-accounts
INSERT INTO public.chart_of_accounts (
  account_code,
  account_name,
  account_type,
  account_subtype,
  parent_account_id,
  description,
  is_active
)
VALUES
  ('3100', 'Adnan''s Capital', 'equity', 'shareholders_equity',
   (SELECT id FROM public.chart_of_accounts WHERE account_code = '3000'), 'Adnan''s ownership equity', true),
  ('3200', 'Pronoy''s Capital', 'equity', 'shareholders_equity',
   (SELECT id FROM public.chart_of_accounts WHERE account_code = '3000'), 'Pronoy''s ownership equity', true),
  ('3300', 'Shomudro''s Capital', 'equity', 'shareholders_equity',
   (SELECT id FROM public.chart_of_accounts WHERE account_code = '3000'), 'Shomudro''s ownership equity', true),
  ('3400', 'Marshal''s Capital', 'equity', 'shareholders_equity',
   (SELECT id FROM public.chart_of_accounts WHERE account_code = '3000'), 'Marshal''s ownership equity', true),
  ('3500', 'Rocky''s Capital', 'equity', 'shareholders_equity',
   (SELECT id FROM public.chart_of_accounts WHERE account_code = '3000'), 'Rocky''s ownership equity', true);