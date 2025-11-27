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
   'd85336e0-0a8a-4ebd-a4dd-f5af786861e3', 'Adnan''s ownership equity', true),
  ('3200', 'Pronoy''s Capital', 'equity', 'shareholders_equity', 
   'd85336e0-0a8a-4ebd-a4dd-f5af786861e3', 'Pronoy''s ownership equity', true),
  ('3300', 'Shomudro''s Capital', 'equity', 'shareholders_equity', 
   'd85336e0-0a8a-4ebd-a4dd-f5af786861e3', 'Shomudro''s ownership equity', true),
  ('3400', 'Marshal''s Capital', 'equity', 'shareholders_equity', 
   'd85336e0-0a8a-4ebd-a4dd-f5af786861e3', 'Marshal''s ownership equity', true),
  ('3500', 'Rocky''s Capital', 'equity', 'shareholders_equity', 
   'd85336e0-0a8a-4ebd-a4dd-f5af786861e3', 'Rocky''s ownership equity', true);