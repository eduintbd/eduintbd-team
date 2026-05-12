-- User email management: track email provider per employee

-- Add email provider fields to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email_provider text DEFAULT 'password' CHECK (email_provider IN ('google', 'purelymail', 'password'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_email_provider text CHECK (company_email_provider IN ('google', 'purelymail'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS purelymail_password text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email_aliases text[] DEFAULT '{}';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email_active boolean DEFAULT true;
