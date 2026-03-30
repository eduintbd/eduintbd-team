-- Seed accounting data: chart_of_accounts, journal_entries, and journal_entry_lines
-- Data exported from existing database on 2026-03-29

-- ============================================================
-- 1. Chart of Accounts (upsert to avoid duplicates)
-- ============================================================
INSERT INTO public.chart_of_accounts (id, account_code, account_name, account_type, account_subtype, parent_account_id, description, is_active, created_at, updated_at)
VALUES
  ('98a05975-ae4e-4246-9cd8-8900020ebc7a', '1000', 'Cash & Bank', 'asset', 'current_asset', NULL, NULL, true, '2025-11-26 23:33:17.614077+00', '2025-11-26 23:33:17.614077+00'),
  ('129e4f54-8db2-464b-a8ec-8f598f893104', '1500', 'IT Equipment', 'asset', 'fixed_asset', NULL, NULL, true, '2025-11-26 23:33:17.614077+00', '2025-11-26 23:33:17.614077+00'),
  ('8f1e2e84-cd03-45d9-bab7-d83e05fda0d2', '2000', 'Accounts Payable', 'liability', 'current_liability', NULL, NULL, true, '2025-11-26 23:33:17.614077+00', '2025-11-26 23:33:17.614077+00'),
  ('d85336e0-0a8a-4ebd-a4dd-f5af786861e3', '3000', 'Owner''s Equity', 'equity', 'shareholders_equity', NULL, NULL, true, '2025-11-26 23:33:17.614077+00', '2025-11-26 23:33:17.614077+00'),
  ('09e6b673-e191-444e-a7fc-08a0d183e0bf', '4000', 'Agent Income', 'revenue', 'operating_revenue', NULL, NULL, true, '2025-11-26 23:33:17.614077+00', '2025-11-26 23:33:17.614077+00'),
  ('8abbb082-8f1a-4c8b-82f2-c94f5184b47c', '5000', 'Salaries Expense', 'expense', 'operating_expense', NULL, NULL, true, '2025-11-26 23:33:17.614077+00', '2025-11-26 23:33:17.614077+00'),
  ('09678104-ac5c-4cac-b5ea-d9c65ced2c77', '5100', 'Legal Expense', 'expense', 'operating_expense', NULL, NULL, true, '2025-11-26 23:33:17.614077+00', '2025-11-26 23:33:17.614077+00'),
  ('7c39ddaf-e22e-4bd3-a005-e65727ee65a3', '5200', 'Website Expense', 'expense', 'operating_expense', NULL, NULL, true, '2025-11-26 23:33:17.614077+00', '2025-11-26 23:33:17.614077+00'),
  ('29fa9aec-8cb6-437d-be45-50a7ffc49935', '5300', 'Online Subscription Exp.', 'expense', 'operating_expense', NULL, NULL, true, '2025-11-26 23:33:17.614077+00', '2025-11-26 23:33:17.614077+00'),
  ('31d7ca6e-bdb1-47b3-90ff-671106f8247e', '5400', 'Digital Marketing', 'expense', 'operating_expense', NULL, NULL, true, '2025-11-26 23:33:17.614077+00', '2025-11-26 23:33:17.614077+00'),
  ('85b34245-84cf-4ad2-8d34-b91ed88baa4b', '5500', 'Printing & Publications Exp.', 'expense', 'operating_expense', NULL, NULL, true, '2025-11-26 23:33:17.614077+00', '2025-11-26 23:33:17.614077+00'),
  ('b51168a5-d1e5-410f-8d67-31d4e7c7b52f', '5600', 'Mobile Bill', 'expense', 'operating_expense', NULL, NULL, true, '2025-11-26 23:33:17.614077+00', '2025-11-26 23:33:17.614077+00'),
  ('7e632183-d888-46b0-b2b7-924f15b311a4', '5700', 'Rent Expense', 'expense', 'operating_expense', NULL, NULL, true, '2025-11-26 23:33:17.614077+00', '2025-11-26 23:33:17.614077+00'),
  ('828876b7-c611-4df6-acab-5e40f5848ced', '1550', 'Accumulated Depreciation - IT Equipment', 'asset', 'fixed_asset', NULL, 'Contra-asset account for IT equipment depreciation', true, '2025-11-26 23:37:17.162446+00', '2025-11-26 23:37:17.162446+00'),
  ('d0457a4b-69a5-4518-abaa-9f3f9ba5bd17', '5800', 'Depreciation Expense', 'expense', 'operating_expense', NULL, 'Annual depreciation expense for fixed assets', true, '2025-11-26 23:37:17.162446+00', '2025-11-26 23:37:17.162446+00'),
  ('d3ebf3ea-9f36-4faf-b5bc-125293b977ee', '5900', 'Interest Expense', 'expense', 'other_expense', NULL, 'Interest expense on loans and payables', true, '2025-11-26 23:37:17.162446+00', '2025-11-26 23:37:17.162446+00'),
  ('bd3fc1ae-322f-48a7-96fa-e60d6b130f69', '2100', 'Interest Payable', 'liability', 'current_liability', NULL, 'Accrued interest on loans', true, '2025-11-26 23:37:17.162446+00', '2025-11-26 23:37:17.162446+00'),
  ('967d8e61-5994-404a-8ee8-d6eb570b9c72', '3100', 'Adnan''s Capital', 'equity', 'shareholders_equity', 'd85336e0-0a8a-4ebd-a4dd-f5af786861e3', 'Adnan''s ownership equity', true, '2025-11-27 05:45:14.123755+00', '2025-11-27 05:45:14.123755+00'),
  ('b6944a54-d968-463c-9eaa-ceac53afa0ca', '3200', 'Pronoy''s Capital', 'equity', 'shareholders_equity', 'd85336e0-0a8a-4ebd-a4dd-f5af786861e3', 'Pronoy''s ownership equity', true, '2025-11-27 05:45:14.123755+00', '2025-11-27 05:45:14.123755+00'),
  ('bcaf6d67-3c38-49da-84cd-2b63491b4c98', '3300', 'Shomudro''s Capital', 'equity', 'shareholders_equity', 'd85336e0-0a8a-4ebd-a4dd-f5af786861e3', 'Shomudro''s ownership equity', true, '2025-11-27 05:45:14.123755+00', '2025-11-27 05:45:14.123755+00'),
  ('28f50ca4-0a56-4db3-9a06-c9ab597cbe21', '3400', 'Marshal''s Capital', 'equity', 'shareholders_equity', 'd85336e0-0a8a-4ebd-a4dd-f5af786861e3', 'Marshal''s ownership equity', true, '2025-11-27 05:45:14.123755+00', '2025-11-27 05:45:14.123755+00'),
  ('5be38bf3-6630-4e8b-9e93-75c18b09b72c', '3500', 'Rocky''s Capital', 'equity', 'shareholders_equity', 'd85336e0-0a8a-4ebd-a4dd-f5af786861e3', 'Rocky''s ownership equity', true, '2025-11-27 05:45:14.123755+00', '2025-11-27 05:45:14.123755+00'),
  ('d96572cc-b0c8-44d8-8716-60a8f5ab3613', '1001', 'Director Loan', 'liability', 'long_term_liability', NULL, NULL, true, '2025-11-27 07:31:44.93117+00', '2025-11-27 07:31:44.93117+00'),
  ('0506cc4f-cb31-4353-b1f6-18ea8d54261d', '1002', 'Entertainment Expense', 'expense', 'operating_expense', NULL, NULL, true, '2025-11-27 16:59:47.560399+00', '2025-11-27 16:59:47.560399+00'),
  ('1fe3dcad-2cdf-466c-83c6-17a89f2487d7', '1003', 'Entertainment Expense', 'expense', 'operating_expense', NULL, NULL, true, '2025-11-27 17:02:03.97159+00', '2025-11-27 17:02:03.97159+00'),
  ('3e7fb578-a19e-40e2-85bc-3df92ea1dff5', '1004', 'NFC Cards', 'asset', 'current_asset', NULL, NULL, true, '2026-01-10 10:16:28.417894+00', '2026-01-10 10:16:28.417894+00'),
  ('feb2fd30-a46a-4c69-b5a2-4e3327d245b2', '1005', 'Marketing Expenses', 'expense', 'current_asset', NULL, NULL, true, '2026-01-19 13:44:40.763391+00', '2026-01-19 13:44:40.763391+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Journal Entries (parent records derived from journal_entry_lines)
-- ============================================================
INSERT INTO public.journal_entries (id, entry_number, entry_date, description, status, entry_type, created_at, updated_at)
VALUES
  ('f9abd31a-698e-45d7-87ac-f6a5d72710cb', 'JE-001', '2025-11-26', 'UCB Stock income and salary payments', 'posted', 'journal', '2025-11-26 23:38:03.643625+00', '2025-11-26 23:38:03.643625+00'),
  ('61341f85-7a5e-41d1-9143-c1a473dab17f', 'JE-002', '2025-11-26', 'Asif salary and Elephant rent payment', 'posted', 'journal', '2025-11-26 23:38:27.62744+00', '2025-11-26 23:38:27.62744+00'),
  ('97bb85c4-308f-45c3-a099-44bb74395f8d', 'JE-003', '2025-11-26', 'Adnan deposit and subscription expenses', 'posted', 'journal', '2025-11-26 23:38:38.208949+00', '2025-11-26 23:38:38.208949+00'),
  ('577befb8-038d-4dc8-9593-ea80dcddb968', 'JE-004', '2025-11-27', 'Partner deposits and operational expenses', 'posted', 'journal', '2025-11-27 00:05:49.564634+00', '2025-11-27 00:05:49.564634+00'),
  ('92137644-4eed-48de-865c-31f7a9aad1cd', 'JE-005', '2025-11-27', 'Owner equity deposits from all partners', 'posted', 'journal', '2025-11-27 07:32:30.372079+00', '2025-11-27 07:32:30.372079+00'),
  ('d5e0f2d9-2324-44cf-a8b2-f5c9d436cbb0', 'JE-006', '2025-11-27', 'IT equipment purchase and legal/website expenses', 'posted', 'journal', '2025-11-27 07:34:18.615523+00', '2025-11-27 07:34:18.615523+00'),
  ('38682b6e-6b06-47e0-a1fe-b0603da83bcd', 'JE-007', '2025-11-27', 'Cash received from director loan', 'posted', 'journal', '2025-11-27 10:26:49.829672+00', '2025-11-27 10:26:49.829672+00'),
  ('209033fa-e531-40c4-a49a-e2ce1260e712', 'JE-008', '2025-11-27', 'Agent income received', 'posted', 'journal', '2025-11-27 13:17:43.045531+00', '2025-11-27 13:17:43.045531+00'),
  ('ad531b97-65f7-417e-a4c9-3c2ab238b8aa', 'JE-009', '2025-11-27', 'Capital adjustments between partners', 'posted', 'journal', '2025-11-27 13:15:42.233914+00', '2025-11-27 13:15:42.233914+00'),
  ('9b5931f2-3fe5-4e17-b983-74eca9527e1f', 'JE-010', '2025-11-27', 'Director loan repayment and partner capital adjustments', 'posted', 'journal', '2025-11-27 13:31:13.306201+00', '2025-11-27 13:31:13.306201+00'),
  ('aecc5642-02d0-4fbd-a593-3e570753a165', 'JE-011', '2025-11-27', 'Entertainment expense - payable to Adnan', 'posted', 'journal', '2025-11-27 17:04:30.357766+00', '2025-11-27 17:04:30.357766+00'),
  ('3bd37a2a-bd2d-4bff-abde-e2c40f9ebde0', 'JE-012', '2025-12-02', 'Entertainment expense from director loan', 'posted', 'journal', '2025-12-02 15:50:17.876416+00', '2025-12-02 15:50:17.876416+00'),
  ('40a35f5f-fa32-4866-8a80-3c6db5a7210b', 'JE-013', '2025-12-07', 'Director loan transaction', 'posted', 'journal', '2025-12-07 15:52:53.905654+00', '2025-12-07 15:52:53.905654+00'),
  ('438c519c-22fd-4717-a4a5-f778d4a07aed', 'JE-014', '2025-12-07', 'Online subscription from director loan', 'posted', 'journal', '2025-12-07 15:50:12.512741+00', '2025-12-07 15:50:12.512741+00'),
  ('a58f1cb4-d1db-4018-9e30-b036fae9b54b', 'JE-015', '2025-12-07', 'Cash received from director loan', 'posted', 'journal', '2025-12-07 15:55:39.680611+00', '2025-12-07 15:55:39.680611+00'),
  ('a567694a-3da7-4918-9a95-591a4fef8109', 'JE-016', '2025-12-27', 'Six Deco E4 Router purchase', 'posted', 'journal', '2025-12-27 12:13:37.397126+00', '2025-12-27 12:13:37.397126+00'),
  ('4577261e-c8a3-4b65-ae9a-34cd7c1644f2', 'JE-017', '2025-12-27', 'Asif salary - November', 'posted', 'journal', '2025-12-27 12:15:46.065446+00', '2025-12-27 12:15:46.065446+00'),
  ('36a27f11-f0d1-4ecf-a2c7-a8b91e6e1cb5', 'JE-018', '2025-12-27', 'Purchased 8 NFC Cards', 'posted', 'journal', '2025-12-27 12:17:37.18059+00', '2025-12-27 12:17:37.18059+00'),
  ('d2293e3a-432d-49d4-b5f7-a998e825428e', 'JE-019', '2025-12-27', 'Agent income received', 'posted', 'journal', '2025-12-27 12:20:37.076968+00', '2025-12-27 12:20:37.076968+00'),
  ('c5dca353-ca0b-459b-b744-c84a0fb0cbac', 'JE-020', '2026-01-10', '.ai domain purchase', 'posted', 'journal', '2026-01-10 10:20:28.58222+00', '2026-01-10 10:20:28.58222+00'),
  ('30924c14-7159-4386-b94a-f5b45bf02788', 'JE-021', '2026-01-10', 'Online subscription expense', 'posted', 'journal', '2026-01-10 10:25:08.952787+00', '2026-01-10 10:25:08.952787+00'),
  ('8dd42b89-c154-406c-92af-8216d70cde0d', 'JE-022', '2026-01-10', 'Lovable subscription expense', 'posted', 'journal', '2026-01-10 10:40:43.917266+00', '2026-01-10 10:40:43.917266+00'),
  ('f91ecd92-1936-40e8-9f6b-dd07e42889df', 'JE-023', '2026-01-10', 'NFC Cards purchase', 'posted', 'journal', '2026-01-10 10:53:59.17601+00', '2026-01-10 10:53:59.17601+00'),
  ('b79de335-5321-4c8c-b5c3-e759603ce323', 'JE-024', '2026-01-10', 'Salary payment', 'posted', 'journal', '2026-01-10 11:08:48.13571+00', '2026-01-10 11:08:48.13571+00'),
  ('26829de4-8804-4b86-9a37-1c3f67553208', 'JE-025', '2026-03-10', 'Asif salary payment', 'posted', 'journal', '2026-03-10 11:13:33.452927+00', '2026-03-10 11:13:33.452927+00'),
  ('03b86f2b-8123-4633-ad78-21b280933871', 'JE-026', '2026-03-10', 'Siam salary payment', 'posted', 'journal', '2026-03-10 11:14:53.599556+00', '2026-03-10 11:14:53.599556+00'),
  ('36642fdb-27c6-40d6-8d9e-b1717abce385', 'JE-027', '2026-03-10', 'Shamudro conveyance payment', 'posted', 'journal', '2026-03-10 11:16:46.565432+00', '2026-03-10 11:16:46.565432+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Journal Entry Lines (all 82 lines from export)
-- ============================================================
INSERT INTO public.journal_entry_lines (id, journal_entry_id, account_id, description, debit, credit, line_number, created_at)
VALUES
  -- JE-001: UCB Stock income and salary payments
  ('d6877dd5-78c2-4f0f-9a90-55982a9d93ee', 'f9abd31a-698e-45d7-87ac-f6a5d72710cb', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Cash received from UCB Stock', 45190.00, 0.00, 1, '2025-11-26 23:38:03.643625+00'),
  ('6c304cbd-7e6c-4ea2-a5a8-27a5f92b63e2', 'f9abd31a-698e-45d7-87ac-f6a5d72710cb', '09e6b673-e191-444e-a7fc-08a0d183e0bf', 'Income from UCB Stock', 0.00, 45190.00, 2, '2025-11-26 23:38:03.643625+00'),
  ('38e5c52f-95e1-4ca0-800d-8c16f61bc1ed', 'f9abd31a-698e-45d7-87ac-f6a5d72710cb', '8abbb082-8f1a-4c8b-82f2-c94f5184b47c', 'Salaries for Asif and Shomudro', 67000.00, 0.00, 3, '2025-11-26 23:38:03.643625+00'),
  ('2f2cfc88-1ff2-45ca-99d8-b9c0587dfb92', 'f9abd31a-698e-45d7-87ac-f6a5d72710cb', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Cash paid for salaries', 0.00, 67000.00, 4, '2025-11-26 23:38:03.643625+00'),

  -- JE-002: Asif salary and rent
  ('34263a38-ba77-49fe-be63-cdf7df367150', '61341f85-7a5e-41d1-9143-c1a473dab17f', '8abbb082-8f1a-4c8b-82f2-c94f5184b47c', 'Asif Eduint', 15000.00, 0.00, 1, '2025-11-26 23:38:27.62744+00'),
  ('03567061-796f-4d9e-9090-00b2c7f9ce0f', '61341f85-7a5e-41d1-9143-c1a473dab17f', '7e632183-d888-46b0-b2b7-924f15b311a4', 'Elephant Rent', 25000.00, 0.00, 2, '2025-11-26 23:38:27.62744+00'),
  ('6af8814c-4c6c-42c6-89b1-5eebce1be626', '61341f85-7a5e-41d1-9143-c1a473dab17f', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Cash paid for salary and rent', 0.00, 40000.00, 3, '2025-11-26 23:38:27.62744+00'),

  -- JE-003: Adnan deposit and subscriptions
  ('1b129b13-44f1-46ac-a47e-76651eacb9e2', '97bb85c4-308f-45c3-a099-44bb74395f8d', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Adnan''s Deposit', 24600.00, 0.00, 1, '2025-11-26 23:38:38.208949+00'),
  ('2380036d-69d1-48ba-b65e-0bfaa481cad1', '97bb85c4-308f-45c3-a099-44bb74395f8d', '967d8e61-5994-404a-8ee8-d6eb570b9c72', 'Additional deposit - Adnan', 0.00, 24600.00, 2, '2025-11-27 05:46:15.666815+00'),
  ('8854aec6-6515-4648-a86d-28eae7fbc3fb', '97bb85c4-308f-45c3-a099-44bb74395f8d', '29fa9aec-8cb6-437d-be45-50a7ffc49935', 'Office365, Canva, and Lovable subscriptions', 27000.00, 0.00, 3, '2025-11-26 23:38:38.208949+00'),
  ('0f1de1b4-da76-49fd-8dcc-a3e68d9623ca', '97bb85c4-308f-45c3-a099-44bb74395f8d', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Cash paid for subscriptions', 0.00, 27000.00, 4, '2025-11-26 23:38:38.208949+00'),

  -- JE-004: Partner deposits and operational expenses
  ('745c0934-2c83-42e8-9a49-3dc1f5f1698b', '577befb8-038d-4dc8-9593-ea80dcddb968', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Cash deposits from Rocky, Shomudro, and Pronoy', 44909.99, 0.00, 1, '2025-11-27 00:05:49.564634+00'),
  ('8a31be19-373e-4a37-a417-8e41a6e71297', '577befb8-038d-4dc8-9593-ea80dcddb968', 'b6944a54-d968-463c-9eaa-ceac53afa0ca', 'Additional deposit - Pronoy', 0.00, 20000.00, 2, '2025-11-27 05:46:15.666815+00'),
  ('da61662c-6a91-4252-8e78-c48674a20d88', '577befb8-038d-4dc8-9593-ea80dcddb968', '09678104-ac5c-4cac-b5ea-d9c65ced2c77', 'Rental Deed Process Fee', 500.00, 0.00, 3, '2025-11-27 00:05:49.564634+00'),
  ('f65850f2-27cb-4fd2-94ab-59cceefc6474', '577befb8-038d-4dc8-9593-ea80dcddb968', '29fa9aec-8cb6-437d-be45-50a7ffc49935', 'Adobe Subscription Purchase', 600.00, 0.00, 4, '2025-11-27 00:05:49.564634+00'),
  ('d55693e3-f17c-40af-ab8f-62f80735f829', '577befb8-038d-4dc8-9593-ea80dcddb968', '31d7ca6e-bdb1-47b3-90ff-671106f8247e', 'Digital Marketing on FB', 23000.00, 0.00, 5, '2025-11-27 00:05:49.564634+00'),
  ('1f0bcceb-38e4-4dcf-ba25-f2fbd4161394', '577befb8-038d-4dc8-9593-ea80dcddb968', '7c39ddaf-e22e-4bd3-a005-e65727ee65a3', 'Paid to Joy for Website', 10000.00, 0.00, 6, '2025-11-27 00:05:49.564634+00'),
  ('104e6a6b-1c45-4567-9b01-dd127051c46d', '577befb8-038d-4dc8-9593-ea80dcddb968', '85b34245-84cf-4ad2-8d34-b91ed88baa4b', 'Banner, Letterhead & Seal Print', 3600.00, 0.00, 7, '2025-11-27 00:05:49.564634+00'),
  ('2fc059f3-0643-4726-a621-ef520f2eaf38', '577befb8-038d-4dc8-9593-ea80dcddb968', 'b51168a5-d1e5-410f-8d67-31d4e7c7b52f', 'Sim Purchase', 500.00, 0.00, 8, '2025-11-27 00:05:49.564634+00'),
  ('3699a7c7-d3cf-4058-8838-fa0801934818', '577befb8-038d-4dc8-9593-ea80dcddb968', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Cash paid for expenses', 0.00, 38200.00, 9, '2025-11-27 00:05:49.564634+00'),
  ('4dc120ee-a760-48d9-8d39-b2cdf70b7097', '577befb8-038d-4dc8-9593-ea80dcddb968', 'bcaf6d67-3c38-49da-84cd-2b63491b4c98', 'Additional deposit - Shomudro', 0.00, 20000.00, 10, '2025-11-27 05:46:15.666815+00'),
  ('b0856600-8b3c-46ad-ab95-7a7a887759f2', '577befb8-038d-4dc8-9593-ea80dcddb968', '5be38bf3-6630-4e8b-9e93-75c18b09b72c', 'Additional deposit - Rocky', 0.00, 4909.99, 11, '2025-11-27 05:46:15.666815+00'),

  -- JE-005: Owner equity deposits
  ('6d3bab4c-068f-4c9e-90d5-7c95458a37d1', '92137644-4eed-48de-865c-31f7a9aad1cd', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Owner Equity Deposits from Adnan, Rocky, Pronoy, Shomudro, Marshal', 250135.00, 0.00, 1, '2025-11-27 07:32:30.372079+00'),
  ('0ed29514-0754-40a8-b67f-922485d225b7', '92137644-4eed-48de-865c-31f7a9aad1cd', '967d8e61-5994-404a-8ee8-d6eb570b9c72', 'Initial equity deposit - Adnan', 0.00, 170135.00, 2, '2025-11-27 07:32:30.372079+00'),
  ('9caf4455-1e93-46e0-aa33-b2a2654d8c24', '92137644-4eed-48de-865c-31f7a9aad1cd', 'b6944a54-d968-463c-9eaa-ceac53afa0ca', 'Initial equity deposit - Pronoy', 0.00, 20000.00, 3, '2025-11-27 07:32:30.372079+00'),
  ('c38cfd83-e336-4425-ace9-8cdda6d973bb', '92137644-4eed-48de-865c-31f7a9aad1cd', 'bcaf6d67-3c38-49da-84cd-2b63491b4c98', 'Initial equity deposit - Shomudro', 0.00, 14810.00, 4, '2025-11-27 07:32:30.372079+00'),
  ('4786c67e-5480-45aa-9ded-ee0e5cdccfa4', '92137644-4eed-48de-865c-31f7a9aad1cd', '28f50ca4-0a56-4db3-9a06-c9ab597cbe21', 'Initial equity deposit - Marshal', 0.00, 20000.00, 5, '2025-11-27 07:32:30.372079+00'),
  ('f1046fe0-231d-4000-918b-2c64cd25b17a', '92137644-4eed-48de-865c-31f7a9aad1cd', '5be38bf3-6630-4e8b-9e93-75c18b09b72c', 'Initial equity deposit - Rocky', 0.00, 25190.00, 6, '2025-11-27 07:32:30.372079+00'),

  -- JE-006: IT equipment, legal, website expenses
  ('4ebc50d9-2c9b-4673-b840-b23d2cb55e0f', 'd5e0f2d9-2324-44cf-a8b2-f5c9d436cbb0', '129e4f54-8db2-464b-a8ec-8f598f893104', 'IT Equipment Purchase (Laptop, iPad Etc)', 467500.00, 0.00, 1, '2025-11-27 07:34:18.615523+00'),
  ('1e94e89f-c03d-42b1-b56b-2cd52f67264b', 'd5e0f2d9-2324-44cf-a8b2-f5c9d436cbb0', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Cash portion of IT equipment', 0.00, 67500.00, 2, '2025-11-27 07:34:18.615523+00'),
  ('5126561e-76e2-458d-bca4-e7bbe3e8920a', 'd5e0f2d9-2324-44cf-a8b2-f5c9d436cbb0', 'd96572cc-b0c8-44d8-8716-60a8f5ab3613', 'Loan from Adnan for office equipment', 0.00, 400000.00, 3, '2025-11-27 07:34:18.615523+00'),
  ('26d0a2e9-0f12-4ea4-8ffd-9443930bbc0e', 'd5e0f2d9-2324-44cf-a8b2-f5c9d436cbb0', '09678104-ac5c-4cac-b5ea-d9c65ced2c77', 'Legal Expense for RJSC and Trade License', 95000.00, 0.00, 4, '2025-11-27 07:34:18.615523+00'),
  ('5304b819-be5c-4a7d-b198-57d841a34ede', 'd5e0f2d9-2324-44cf-a8b2-f5c9d436cbb0', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Cash paid for legal fees', 0.00, 95000.00, 5, '2025-11-27 07:34:18.615523+00'),
  ('4178b384-bdf1-4235-b540-b4c6421c7920', 'd5e0f2d9-2324-44cf-a8b2-f5c9d436cbb0', '7c39ddaf-e22e-4bd3-a005-e65727ee65a3', 'Domain and subscription expenses', 30135.00, 0.00, 6, '2025-11-27 07:34:18.615523+00'),
  ('0c6fe678-da40-4bdd-a231-742b32393805', 'd5e0f2d9-2324-44cf-a8b2-f5c9d436cbb0', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Cash paid for website', 0.00, 30135.00, 7, '2025-11-27 07:34:18.615523+00'),

  -- JE-007: Cash from director loan
  ('2210eded-2673-4af1-9c04-ac386de3963d', '38682b6e-6b06-47e0-a1fe-b0603da83bcd', '98a05975-ae4e-4246-9cd8-8900020ebc7a', NULL, 50000.00, 0.00, 1, '2025-11-27 10:26:49.829672+00'),
  ('1dbee59f-2ac9-44f2-afdf-c2897868e5fd', '38682b6e-6b06-47e0-a1fe-b0603da83bcd', 'd96572cc-b0c8-44d8-8716-60a8f5ab3613', NULL, 0.00, 50000.00, 2, '2025-11-27 10:26:49.829672+00'),

  -- JE-008: Agent income
  ('39b4cdd2-60d1-4467-b6f0-27af1a6e1dc8', '209033fa-e531-40c4-a49a-e2ce1260e712', '98a05975-ae4e-4246-9cd8-8900020ebc7a', NULL, 10100.00, 0.00, 1, '2025-11-27 13:17:43.045531+00'),
  ('c11ff57b-51a6-4850-9831-e2651971f798', '209033fa-e531-40c4-a49a-e2ce1260e712', '09e6b673-e191-444e-a7fc-08a0d183e0bf', NULL, 0.00, 10100.00, 2, '2025-11-27 13:17:43.045531+00'),

  -- JE-009: Capital adjustments
  ('d1c96120-f7d1-45f4-a9f3-dbd61f19d82c', 'ad531b97-65f7-417e-a4c9-3c2ab238b8aa', '967d8e61-5994-404a-8ee8-d6eb570b9c72', NULL, 35100.00, 0.00, 1, '2025-11-27 13:15:42.233914+00'),
  ('f7f927d4-0428-4591-ac0b-c5e7737c15c4', 'ad531b97-65f7-417e-a4c9-3c2ab238b8aa', 'b6944a54-d968-463c-9eaa-ceac53afa0ca', NULL, 0.00, 10000.00, 2, '2025-11-27 13:15:42.233914+00'),
  ('dbb45ec5-0f5b-4ffb-8c37-99bd53ccf7c7', 'ad531b97-65f7-417e-a4c9-3c2ab238b8aa', 'bcaf6d67-3c38-49da-84cd-2b63491b4c98', NULL, 0.00, 5100.00, 3, '2025-11-27 13:15:42.233914+00'),
  ('ec31b642-08f4-410a-9279-385e59b30e04', 'ad531b97-65f7-417e-a4c9-3c2ab238b8aa', '5be38bf3-6630-4e8b-9e93-75c18b09b72c', NULL, 0.00, 20000.00, 4, '2025-11-27 13:15:42.233914+00'),

  -- JE-010: Director loan and partner capital
  ('2a9abcef-9a70-4a79-af97-2513cb103351', '9b5931f2-3fe5-4e17-b983-74eca9527e1f', 'd96572cc-b0c8-44d8-8716-60a8f5ab3613', NULL, 450000.00, 0.00, 1, '2025-11-27 13:31:13.306201+00'),
  ('b0053bed-5ac6-42e8-a925-701a25d551b6', '9b5931f2-3fe5-4e17-b983-74eca9527e1f', 'b6944a54-d968-463c-9eaa-ceac53afa0ca', NULL, 0.00, 100000.00, 2, '2025-11-27 13:31:13.306201+00'),
  ('8f6489eb-bdc3-4461-a4e4-560d4e012220', '9b5931f2-3fe5-4e17-b983-74eca9527e1f', '5be38bf3-6630-4e8b-9e93-75c18b09b72c', NULL, 0.00, 20000.00, 3, '2025-11-27 13:31:13.306201+00'),
  ('01519cb5-d7ec-45f8-bf80-e04b55392fc2', '9b5931f2-3fe5-4e17-b983-74eca9527e1f', '28f50ca4-0a56-4db3-9a06-c9ab597cbe21', NULL, 0.00, 30000.00, 4, '2025-11-27 13:31:13.306201+00'),
  ('eaec7b55-20b4-4889-93b0-3e0f6f297c5a', '9b5931f2-3fe5-4e17-b983-74eca9527e1f', '98a05975-ae4e-4246-9cd8-8900020ebc7a', NULL, 100000.00, 0.00, 5, '2025-11-27 13:31:13.306201+00'),
  ('164c5ab1-1f19-481c-922a-7d7b8a07ca12', '9b5931f2-3fe5-4e17-b983-74eca9527e1f', '967d8e61-5994-404a-8ee8-d6eb570b9c72', NULL, 0.00, 400000.00, 6, '2025-11-27 13:31:13.306201+00'),

  -- JE-011: Entertainment expense
  ('fdb9c3b4-532b-4b91-a565-9b7cd3e7db30', 'aecc5642-02d0-4fbd-a593-3e570753a165', '0506cc4f-cb31-4353-b1f6-18ea8d54261d', NULL, 3140.00, 0.00, 1, '2025-11-27 17:04:30.357766+00'),
  ('7159dd3f-3675-4f66-aa79-0def416dc696', 'aecc5642-02d0-4fbd-a593-3e570753a165', '8f1e2e84-cd03-45d9-bab7-d83e05fda0d2', 'Payable to adnan', 0.00, 3140.00, 2, '2025-11-27 17:04:30.357766+00'),

  -- JE-012: Entertainment from director loan
  ('35f31eba-4053-4681-bc48-d12e2e1b5b3f', '3bd37a2a-bd2d-4bff-abde-e2c40f9ebde0', '0506cc4f-cb31-4353-b1f6-18ea8d54261d', NULL, 2450.00, 0.00, 1, '2025-12-02 15:50:17.876416+00'),
  ('cffe5c25-ce90-4148-8830-600e39489756', '3bd37a2a-bd2d-4bff-abde-e2c40f9ebde0', 'd96572cc-b0c8-44d8-8716-60a8f5ab3613', NULL, 0.00, 2450.00, 2, '2025-12-02 15:50:17.876416+00'),

  -- JE-013: Director loan transaction
  ('fa675058-3642-4cd5-8292-ed2310c255e9', '40a35f5f-fa32-4866-8a80-3c6db5a7210b', 'd96572cc-b0c8-44d8-8716-60a8f5ab3613', NULL, 3000.00, 0.00, 1, '2025-12-07 15:52:53.905654+00'),
  ('003b9971-95ad-4033-8121-d80d8e764427', '40a35f5f-fa32-4866-8a80-3c6db5a7210b', '98a05975-ae4e-4246-9cd8-8900020ebc7a', NULL, 0.00, 3000.00, 2, '2025-12-07 15:52:53.905654+00'),

  -- JE-014: Online subscription from director loan
  ('2aaa36b1-eb37-4336-ae4e-299a6b894251', '438c519c-22fd-4717-a4a5-f778d4a07aed', '29fa9aec-8cb6-437d-be45-50a7ffc49935', NULL, 3000.00, 0.00, 1, '2025-12-07 15:50:12.512741+00'),
  ('c197ee81-9acb-4be8-8bf0-1f3c3b554276', '438c519c-22fd-4717-a4a5-f778d4a07aed', 'd96572cc-b0c8-44d8-8716-60a8f5ab3613', NULL, 0.00, 3000.00, 2, '2025-12-07 15:50:12.512741+00'),

  -- JE-015: Cash from director loan
  ('c09d4492-8dd8-4d25-aaef-dfab667173c3', 'a58f1cb4-d1db-4018-9e30-b036fae9b54b', '98a05975-ae4e-4246-9cd8-8900020ebc7a', NULL, 3000.00, 0.00, 1, '2025-12-07 15:55:39.680611+00'),
  ('e25f3a57-ec28-4456-bcee-bd318154489d', 'a58f1cb4-d1db-4018-9e30-b036fae9b54b', 'd96572cc-b0c8-44d8-8716-60a8f5ab3613', NULL, 0.00, 3000.00, 2, '2025-12-07 15:55:39.680611+00'),

  -- JE-016: Router purchase
  ('9a775948-bd32-446f-9eb6-beca43b106ec', 'a567694a-3da7-4918-9a95-591a4fef8109', '129e4f54-8db2-464b-a8ec-8f598f893104', 'Six Deco E4 Router', 16000.00, 0.00, 1, '2025-12-27 12:13:37.397126+00'),
  ('ee8605ed-e4ec-4b11-88c7-bd35d3950731', 'a567694a-3da7-4918-9a95-591a4fef8109', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Cheque No. 0869586', 0.00, 16000.00, 2, '2025-12-27 12:13:37.397126+00'),

  -- JE-017: Asif salary November
  ('297d10c6-45bb-493e-9174-3c26f6e3efba', '4577261e-c8a3-4b65-ae9a-34cd7c1644f2', '8abbb082-8f1a-4c8b-82f2-c94f5184b47c', 'Asif''s Salary - November', 15000.00, 0.00, 1, '2025-12-27 12:15:46.065446+00'),
  ('70bc6889-4a6b-4ddd-97ad-f26d114959eb', '4577261e-c8a3-4b65-ae9a-34cd7c1644f2', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Cheque No. 0869587', 0.00, 15000.00, 2, '2025-12-27 12:15:46.065446+00'),

  -- JE-018: NFC Cards
  ('5dca6c21-5168-4e80-af8c-dfbf3a8c6bd6', '36a27f11-f0d1-4ecf-a2c7-a8b91e6e1cb5', '85b34245-84cf-4ad2-8d34-b91ed88baa4b', 'Purchased 8 NFC Cards', 720.00, 0.00, 1, '2025-12-27 12:17:37.18059+00'),
  ('191e3f2f-8099-4eb7-b0ed-60f588607094', '36a27f11-f0d1-4ecf-a2c7-a8b91e6e1cb5', '98a05975-ae4e-4246-9cd8-8900020ebc7a', 'Cheque No. 0869587', 0.00, 720.00, 2, '2025-12-27 12:17:37.18059+00'),

  -- JE-019: Agent income
  ('5b55d7ec-e240-46a5-a608-87dc27ef95ee', 'd2293e3a-432d-49d4-b5f7-a998e825428e', '98a05975-ae4e-4246-9cd8-8900020ebc7a', NULL, 7383.00, 0.00, 1, '2025-12-27 12:20:37.076968+00'),
  ('ab7577f3-7e75-468f-8ce8-31a23501398b', 'd2293e3a-432d-49d4-b5f7-a998e825428e', '09e6b673-e191-444e-a7fc-08a0d183e0bf', NULL, 0.00, 7383.00, 2, '2025-12-27 12:20:37.076968+00'),

  -- JE-020: .ai domain
  ('01905dfa-a99c-4731-9e37-e32dc96a84dd', 'c5dca353-ca0b-459b-b744-c84a0fb0cbac', '7c39ddaf-e22e-4bd3-a005-e65727ee65a3', '.ai domain', 26875.00, 0.00, 1, '2026-01-10 10:20:28.58222+00'),
  ('65ace7ed-b5f4-4bd1-a15e-91dc17e2d6cd', 'c5dca353-ca0b-459b-b744-c84a0fb0cbac', '967d8e61-5994-404a-8ee8-d6eb570b9c72', NULL, 0.00, 26875.00, 2, '2026-01-10 10:20:28.58222+00'),

  -- JE-021: Online subscription
  ('894a5822-6ff7-42ac-8a8c-4119f3add8c8', '30924c14-7159-4386-b94a-f5b45bf02788', '29fa9aec-8cb6-437d-be45-50a7ffc49935', NULL, 3125.00, 0.00, 1, '2026-01-10 10:25:08.952787+00'),
  ('270b75ba-b5c6-4dcc-9270-bc9230cf365c', '30924c14-7159-4386-b94a-f5b45bf02788', '967d8e61-5994-404a-8ee8-d6eb570b9c72', NULL, 0.00, 3125.00, 2, '2026-01-10 10:25:08.952787+00'),

  -- JE-022: Lovable expense
  ('3d8dfcf9-e051-4fc6-bed4-342a1e79051f', '8dd42b89-c154-406c-92af-8216d70cde0d', '29fa9aec-8cb6-437d-be45-50a7ffc49935', 'Lovable expense', 67313.00, 0.00, 1, '2026-01-10 10:40:43.917266+00'),
  ('3041527c-c224-45a0-88b0-cdf5f011afb7', '8dd42b89-c154-406c-92af-8216d70cde0d', '967d8e61-5994-404a-8ee8-d6eb570b9c72', NULL, 0.00, 67313.00, 2, '2026-01-10 10:40:43.917266+00'),

  -- JE-023: NFC Cards
  ('3abf6565-df04-4f64-afe1-8577c9841b6b', 'f91ecd92-1936-40e8-9f6b-dd07e42889df', '3e7fb578-a19e-40e2-85bc-3df92ea1dff5', NULL, 9375.00, 0.00, 1, '2026-01-10 10:53:59.17601+00'),
  ('532fa5e9-51f5-44e8-8fb2-f730ec0aeab3', 'f91ecd92-1936-40e8-9f6b-dd07e42889df', '967d8e61-5994-404a-8ee8-d6eb570b9c72', NULL, 0.00, 9375.00, 2, '2026-01-10 10:53:59.17601+00'),

  -- JE-024: Salary payment
  ('8275884d-a87c-45c3-9b43-d5a6b1b2dfc7', 'b79de335-5321-4c8c-b5c3-e759603ce323', '8abbb082-8f1a-4c8b-82f2-c94f5184b47c', NULL, 8000.00, 0.00, 1, '2026-01-10 11:08:48.13571+00'),
  ('8bd67ad1-3ae5-4b1d-8ee2-3123155eb91a', 'b79de335-5321-4c8c-b5c3-e759603ce323', '98a05975-ae4e-4246-9cd8-8900020ebc7a', NULL, 0.00, 8000.00, 2, '2026-01-10 11:08:48.13571+00'),

  -- JE-025: Asif salary
  ('53dd2f1c-8ca9-44a7-951a-b596d27bf52d', '26829de4-8804-4b86-9a37-1c3f67553208', '8abbb082-8f1a-4c8b-82f2-c94f5184b47c', 'Asif Salary', 15000.00, 0.00, 1, '2026-03-10 11:13:33.452927+00'),
  ('2d5c1a33-fe83-4fb7-be08-197a0f816630', '26829de4-8804-4b86-9a37-1c3f67553208', '967d8e61-5994-404a-8ee8-d6eb570b9c72', 'Asif Salary', 0.00, 15000.00, 2, '2026-03-10 11:13:33.452927+00'),

  -- JE-026: Siam salary
  ('344ba21e-2a49-41db-a854-150ffd85ea0b', '03b86f2b-8123-4633-ad78-21b280933871', '8abbb082-8f1a-4c8b-82f2-c94f5184b47c', 'Siam Salary', 15000.00, 0.00, 1, '2026-03-10 11:14:53.599556+00'),
  ('b4d5a7a7-c884-4f57-a314-b9437549a02b', '03b86f2b-8123-4633-ad78-21b280933871', '967d8e61-5994-404a-8ee8-d6eb570b9c72', 'Siam Salary', 0.00, 15000.00, 2, '2026-03-10 11:14:53.599556+00'),

  -- JE-027: Shamudro conveyance
  ('47c9818c-d026-4bda-b139-186db57954a4', '36642fdb-27c6-40d6-8d9e-b1717abce385', '8abbb082-8f1a-4c8b-82f2-c94f5184b47c', 'Shamudro''s Convence', 20000.00, 0.00, 1, '2026-03-10 11:16:46.565432+00'),
  ('0a8efb8a-f4f6-4f0e-8ac5-f0e125d42291', '36642fdb-27c6-40d6-8d9e-b1717abce385', '967d8e61-5994-404a-8ee8-d6eb570b9c72', 'Shamudro''s convence', 0.00, 20000.00, 2, '2026-03-10 11:16:46.565432+00')
ON CONFLICT (id) DO NOTHING;
