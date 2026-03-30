-- Fix corrupted auth.users records that were imported from old DB
-- These records exist in auth.users but GoTrue cannot read them (missing identities/metadata)
-- The employees table has already been re-linked to new valid auth users

-- Old corrupted user IDs (no longer referenced by any table)
DO $$
DECLARE
  old_ids uuid[] := ARRAY[
    '98ab82c6-e4ac-43c2-ba85-d6a710a8a040',
    'f7d9e699-2cf9-485e-93f9-c2a46fdbc529',
    '63935414-2038-4269-8ae8-a37d24a595e4',
    'db67f5e4-9226-409c-8ea3-a6b11f11eb51',
    'e6fdca8e-8c43-4aa4-ae0f-c75e9af57787',
    '05f754e5-992d-44ec-bc69-e5685d5903ec',
    '4105f703-074e-490a-a796-950b4daeb52c',
    '82480219-c809-40fe-b80d-1a748a5ad734',
    '16bf91c6-e462-4d5d-b4ca-82861409a01a',
    '340622e7-0e22-453c-8c49-2207ab0b229a',
    'dd73eab3-a181-4f7e-8915-e8a758974097',
    'c7643831-dbba-47dd-8b54-535f2c7073e2',
    '79a2e810-d1b0-469c-aa01-4038cbc0f568',
    'ce3df7b3-cb63-4295-80d5-e9fb5bb2621f',
    'c05d6efa-8ce3-4128-b8ce-32cdd3c90666',
    'fa0d5cc2-6532-43f6-b39d-d4cd96ed5f37',
    '6cad0731-a565-4349-b193-e72c3fc9efc2',
    '84c50904-753e-4311-a735-4732879c5610'
  ];
BEGIN
  -- Clean up related auth tables
  DELETE FROM auth.identities WHERE user_id = ANY(old_ids);
  DELETE FROM auth.sessions WHERE user_id = ANY(old_ids);
  DELETE FROM auth.mfa_factors WHERE user_id = ANY(old_ids);
  DELETE FROM auth.users WHERE id = ANY(old_ids);
END $$;
