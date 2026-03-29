-- =============================================
-- Add 'manager' to app_role enum
-- =============================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';

-- =============================================
-- Create auth users (with temp password: Eduint@2026!)
-- Password hash for 'Eduint@2026!' using bcrypt
-- =============================================
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('240dcb74-81eb-48b4-8f71-420512428581', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'syed@eduintbd.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-11-25 04:47:57+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('6c923aab-e508-468f-9bc7-8a8185303fa2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marshal@eduintbd.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-11-25 14:16:39+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('f1e6c9a8-6d52-4c96-af0b-13bbde1d4434', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'legalempire2121@gmail.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-12-02 15:17:23+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('80d8cc64-a428-48d6-ae4a-79855fa7a8da', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'najmul@eduintbd.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-12-07 14:56:15+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('ff8449c4-4892-4848-b13e-72f95da6e0d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rakib@eduintbd.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-11-25 14:16:01+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('49d13174-daaf-4027-9bf8-16d91db9a241', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'limonahmed2642025@gmail.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-12-12 12:23:42+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('afe29622-9403-45d6-af7c-ac38dd082997', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'praggosaha@gmail.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-11-25 14:23:40+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('2cfd3e52-e058-4c64-ad52-30590dfd6194', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ashiqur.tanim@gmail.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-11-27 07:59:35+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('fb39ec6c-428d-4ccd-90b2-110e72ba8d14', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'imahfuz911@gmail.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-11-27 10:49:01+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('78a0cdc8-15c7-4de5-bb28-fd87f73b649f', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zaman.tonmoy@yahoo.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-11-27 11:25:15+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('2f777ea9-d731-415e-ac7e-309b1b3e2b36', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tuhinislam1264@gmail.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-11-27 11:57:07+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('affe5e74-1372-4831-bd06-b707ff74d27b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'iqbell.hossain@ucbstock.com.bd', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-12-03 05:57:40+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('1f739bd0-4322-49cd-87e9-928059b798e4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rashed.feroze@icloud.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-12-03 09:58:41+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('a602bd65-b282-42eb-b752-3b18456535f4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sohag.h0193@gmail.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-12-03 15:06:38+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('c2651d7d-8865-4ce2-8897-db38a0bddee6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ridoy@eduintbd.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-12-16 14:36:58+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('872fad6d-346b-4664-97d0-9924cdddb800', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rahil04u@gmail.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-12-21 15:11:53+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('c56356fc-f99e-4047-acbd-63e26c6b1f2a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rahil04utest@gmail.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2025-12-21 15:20:48+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('af013c97-3a15-419b-937f-a56b426f192d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hemel@eduintbd.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2026-01-03 19:32:14+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('ef44a924-3715-4932-ade8-0db91a21de63', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@herostock.ai', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2026-03-11 14:52:40+00', now(), '', '{"provider":"email","providers":["email"]}', '{}'),
  ('8bf1fec3-b59a-48b8-9cac-e3279df32fd1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'siam@eduintbd.com', extensions.crypt('Eduint@2026!', extensions.gen_salt('bf')), now(), '2026-01-21 07:27:01+00', now(), '', '{"provider":"email","providers":["email"]}', '{}')
ON CONFLICT (id) DO NOTHING;

-- Create identities for each user (required for email login)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT id, id, jsonb_build_object('sub', id::text, 'email', email), 'email', id::text, now(), created_at, now()
FROM auth.users
WHERE id IN (
  '240dcb74-81eb-48b4-8f71-420512428581','6c923aab-e508-468f-9bc7-8a8185303fa2','f1e6c9a8-6d52-4c96-af0b-13bbde1d4434',
  '80d8cc64-a428-48d6-ae4a-79855fa7a8da','ff8449c4-4892-4848-b13e-72f95da6e0d1','49d13174-daaf-4027-9bf8-16d91db9a241',
  'afe29622-9403-45d6-af7c-ac38dd082997','2cfd3e52-e058-4c64-ad52-30590dfd6194','fb39ec6c-428d-4ccd-90b2-110e72ba8d14',
  '78a0cdc8-15c7-4de5-bb28-fd87f73b649f','2f777ea9-d731-415e-ac7e-309b1b3e2b36','affe5e74-1372-4831-bd06-b707ff74d27b',
  '1f739bd0-4322-49cd-87e9-928059b798e4','a602bd65-b282-42eb-b752-3b18456535f4','c2651d7d-8865-4ce2-8897-db38a0bddee6',
  '872fad6d-346b-4664-97d0-9924cdddb800','c56356fc-f99e-4047-acbd-63e26c6b1f2a','af013c97-3a15-419b-937f-a56b426f192d',
  'ef44a924-3715-4932-ade8-0db91a21de63','8bf1fec3-b59a-48b8-9cac-e3279df32fd1'
)
ON CONFLICT DO NOTHING;

-- =============================================
-- Insert user roles
-- =============================================
INSERT INTO public.user_roles (id, user_id, role, created_at, updated_at) VALUES
  ('45435758-473a-449e-84ed-92352be1e77a', '240dcb74-81eb-48b4-8f71-420512428581', 'admin', '2025-11-25 04:47:57.2724+00', '2025-11-25 04:47:57.2724+00'),
  ('caaed2d2-46a0-4689-9b2f-55ced19adcb0', '6c923aab-e508-468f-9bc7-8a8185303fa2', 'manager', '2025-11-29 09:29:17.646876+00', '2025-11-29 09:29:17.646876+00'),
  ('9c8a99a8-6235-4965-9dd4-7c9da54c6b66', 'f1e6c9a8-6d52-4c96-af0b-13bbde1d4434', 'employee', '2025-12-02 15:17:23.745249+00', '2025-12-02 15:17:23.745249+00'),
  ('693fdf0b-a635-4769-b33d-ee2d85c053df', '80d8cc64-a428-48d6-ae4a-79855fa7a8da', 'manager', '2025-12-07 14:56:15.977818+00', '2025-12-07 14:56:15.977818+00'),
  ('5810ffd7-1417-4d73-950b-be4c8a283e8e', 'ff8449c4-4892-4848-b13e-72f95da6e0d1', 'manager', '2025-12-07 15:34:45.579322+00', '2025-12-07 15:34:45.579322+00'),
  ('5c9df3c7-b9ef-4d97-9e49-64b37af120bc', '49d13174-daaf-4027-9bf8-16d91db9a241', 'employee', '2025-12-12 12:23:42.744673+00', '2025-12-12 12:23:42.744673+00'),
  ('817b1f6e-bc49-4fa2-8b25-16cf38efcc52', 'afe29622-9403-45d6-af7c-ac38dd082997', 'employee', '2025-12-16 11:31:17.236107+00', '2025-12-16 11:31:17.236107+00'),
  ('de282893-a42d-4c1c-a96d-a0fd31c09e46', '2cfd3e52-e058-4c64-ad52-30590dfd6194', 'employee', '2025-12-16 11:31:17.236107+00', '2025-12-16 11:31:17.236107+00'),
  ('15b4a5d1-a700-4e64-8445-16ef54500f95', 'fb39ec6c-428d-4ccd-90b2-110e72ba8d14', 'employee', '2025-12-16 11:31:17.236107+00', '2025-12-16 11:31:17.236107+00'),
  ('c5aced37-4b99-45ea-a39d-7a3803b83253', '78a0cdc8-15c7-4de5-bb28-fd87f73b649f', 'employee', '2025-12-16 11:31:17.236107+00', '2025-12-16 11:31:17.236107+00'),
  ('37d3c0aa-8645-4e68-85eb-9a75546b612c', '2f777ea9-d731-415e-ac7e-309b1b3e2b36', 'employee', '2025-12-16 11:31:17.236107+00', '2025-12-16 11:31:17.236107+00'),
  ('1f702acd-a57b-432d-a9cf-99062c418e2d', 'affe5e74-1372-4831-bd06-b707ff74d27b', 'employee', '2025-12-16 11:31:17.236107+00', '2025-12-16 11:31:17.236107+00'),
  ('8fa10f5c-9fbb-45aa-a701-c31944d37da2', '1f739bd0-4322-49cd-87e9-928059b798e4', 'employee', '2025-12-16 11:31:17.236107+00', '2025-12-16 11:31:17.236107+00'),
  ('acd60af0-a9d0-4439-9713-0fe84d413619', 'a602bd65-b282-42eb-b752-3b18456535f4', 'employee', '2025-12-16 11:31:17.236107+00', '2025-12-16 11:31:17.236107+00'),
  ('721f72f7-5baf-4e60-b8cd-d265ce315d6d', 'c2651d7d-8865-4ce2-8897-db38a0bddee6', 'employee', '2025-12-16 18:50:36.150772+00', '2025-12-16 18:50:36.150772+00'),
  ('5a44505f-adf8-4a72-a3a9-365b6fb7bf5c', '78a0cdc8-15c7-4de5-bb28-fd87f73b649f', 'manager', '2026-01-03 19:44:14.549733+00', '2026-01-03 19:44:14.549733+00'),
  ('3e45dd25-f5b2-4329-8b74-9ac7e2125621', '240dcb74-81eb-48b4-8f71-420512428581', 'employee', '2026-01-03 19:46:50.421707+00', '2026-01-03 19:46:50.421707+00'),
  ('f817e9e0-f9f1-472b-a274-765ef680b402', '80d8cc64-a428-48d6-ae4a-79855fa7a8da', 'employee', '2026-01-03 19:46:50.421707+00', '2026-01-03 19:46:50.421707+00'),
  ('21720314-254d-4e27-8bec-707ca874fb66', 'ff8449c4-4892-4848-b13e-72f95da6e0d1', 'employee', '2026-01-03 19:46:50.421707+00', '2026-01-03 19:46:50.421707+00'),
  ('3613c89b-8b16-4a19-b28e-6ac3359ed2b3', '6c923aab-e508-468f-9bc7-8a8185303fa2', 'employee', '2026-01-03 19:46:50.421707+00', '2026-01-03 19:46:50.421707+00'),
  ('f849fda3-57ee-46b0-9b5c-1213e7f0fe9a', '872fad6d-346b-4664-97d0-9924cdddb800', 'employee', '2026-01-03 19:46:50.421707+00', '2026-01-03 19:46:50.421707+00'),
  ('d3065463-4210-4961-a0ed-5492ff2a82d6', 'c56356fc-f99e-4047-acbd-63e26c6b1f2a', 'employee', '2026-01-03 19:46:50.421707+00', '2026-01-03 19:46:50.421707+00'),
  ('169123a7-7cbf-4e25-88cb-b00843fedc3d', 'af013c97-3a15-419b-937f-a56b426f192d', 'employee', '2026-01-03 19:46:50.421707+00', '2026-01-03 19:46:50.421707+00')
ON CONFLICT (id) DO NOTHING;
