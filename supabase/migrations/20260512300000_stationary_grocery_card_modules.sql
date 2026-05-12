-- =============================================
-- AIB-101: Stationary Management
-- =============================================

CREATE TABLE IF NOT EXISTS stationary_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('pens', 'paper', 'folders', 'adhesives', 'tech', 'cleaning', 'general')),
  unit text DEFAULT 'pcs',
  current_stock integer DEFAULT 0,
  min_stock_level integer DEFAULT 5,
  reorder_quantity integer DEFAULT 10,
  unit_price numeric(10,2) DEFAULT 0,
  vendor_id uuid,
  location text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stationary_vendors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stationary_items ADD CONSTRAINT fk_stationary_vendor FOREIGN KEY (vendor_id) REFERENCES stationary_vendors(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS stationary_purchase_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number text,
  item_id uuid REFERENCES stationary_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  estimated_cost numeric(10,2),
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'ordered', 'received')),
  requested_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejection_reason text,
  department_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stationary_usage_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid REFERENCES stationary_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  department_id uuid,
  used_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stationary_stock_movements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid REFERENCES stationary_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity integer NOT NULL,
  reference text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE stationary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stationary_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE stationary_purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stationary_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE stationary_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read stationary_items" ON stationary_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage stationary_items" ON stationary_items FOR ALL TO authenticated USING (true);
CREATE POLICY "auth read stationary_vendors" ON stationary_vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage stationary_vendors" ON stationary_vendors FOR ALL TO authenticated USING (true);
CREATE POLICY "auth read stationary_purchase_requests" ON stationary_purchase_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage stationary_purchase_requests" ON stationary_purchase_requests FOR ALL TO authenticated USING (true);
CREATE POLICY "auth read stationary_usage_log" ON stationary_usage_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage stationary_usage_log" ON stationary_usage_log FOR ALL TO authenticated USING (true);
CREATE POLICY "auth read stationary_stock_movements" ON stationary_stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage stationary_stock_movements" ON stationary_stock_movements FOR ALL TO authenticated USING (true);

-- Seed vendors
INSERT INTO stationary_vendors (name, contact_person, phone, email) VALUES
  ('BD Office Supplies', 'Karim Ahmed', '+880 1711-000001', 'karim@bdoffice.com'),
  ('Dhaka Stationery House', 'Rahim Uddin', '+880 1711-000002', 'rahim@dhakastationery.com')
ON CONFLICT DO NOTHING;

-- Seed items
INSERT INTO stationary_items (name, category, unit, current_stock, min_stock_level, unit_price) VALUES
  ('A4 Paper (500 sheets)', 'paper', 'ream', 25, 10, 450),
  ('Ball Point Pen (Blue)', 'pens', 'pcs', 100, 20, 15),
  ('Ball Point Pen (Black)', 'pens', 'pcs', 80, 20, 15),
  ('Highlighter Set', 'pens', 'set', 15, 5, 120),
  ('File Folder (A4)', 'folders', 'pcs', 50, 15, 25),
  ('Sticky Notes (3x3)', 'adhesives', 'pack', 30, 10, 60),
  ('Scotch Tape', 'adhesives', 'roll', 20, 5, 35),
  ('Stapler', 'general', 'pcs', 10, 3, 250),
  ('Stapler Pins', 'general', 'box', 25, 5, 30),
  ('Whiteboard Marker', 'pens', 'pcs', 40, 10, 45),
  ('Printer Toner (Black)', 'tech', 'pcs', 5, 2, 3500),
  ('USB Flash Drive 32GB', 'tech', 'pcs', 8, 3, 450)
ON CONFLICT DO NOTHING;

-- =============================================
-- AIB-102: Grocery Management
-- =============================================

CREATE TABLE IF NOT EXISTS grocery_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  icon text,
  budget_limit numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grocery_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category_id uuid REFERENCES grocery_categories(id) ON DELETE SET NULL,
  unit text DEFAULT 'pcs',
  current_stock integer DEFAULT 0,
  min_stock integer DEFAULT 2,
  unit_price numeric(10,2) DEFAULT 0,
  expiry_date date,
  brand text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grocery_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'ordered', 'delivered', 'cancelled')),
  order_date date DEFAULT CURRENT_DATE,
  delivery_date date,
  total_amount numeric(10,2) DEFAULT 0,
  is_recurring boolean DEFAULT false,
  recurrence_interval text CHECK (recurrence_interval IN ('weekly', 'biweekly', 'monthly')),
  next_order_date date,
  notes text,
  receipt_url text,
  ordered_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grocery_order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES grocery_orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES grocery_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric(10,2) DEFAULT 0,
  total_price numeric(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS grocery_staff_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name text NOT NULL,
  category text DEFAULT 'snacks',
  quantity integer DEFAULT 1,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  requested_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grocery_budget_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES grocery_categories(id) ON DELETE CASCADE,
  month date NOT NULL,
  budget numeric(10,2) DEFAULT 0,
  spent numeric(10,2) DEFAULT 0,
  UNIQUE(category_id, month)
);

-- RLS
ALTER TABLE grocery_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_staff_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_budget_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read grocery_categories" ON grocery_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage grocery_categories" ON grocery_categories FOR ALL TO authenticated USING (true);
CREATE POLICY "auth read grocery_items" ON grocery_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage grocery_items" ON grocery_items FOR ALL TO authenticated USING (true);
CREATE POLICY "auth read grocery_orders" ON grocery_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage grocery_orders" ON grocery_orders FOR ALL TO authenticated USING (true);
CREATE POLICY "auth read grocery_order_items" ON grocery_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage grocery_order_items" ON grocery_order_items FOR ALL TO authenticated USING (true);
CREATE POLICY "auth read grocery_staff_requests" ON grocery_staff_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage grocery_staff_requests" ON grocery_staff_requests FOR ALL TO authenticated USING (true);
CREATE POLICY "auth read grocery_budget_tracking" ON grocery_budget_tracking FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage grocery_budget_tracking" ON grocery_budget_tracking FOR ALL TO authenticated USING (true);

-- Seed categories
INSERT INTO grocery_categories (name, icon, budget_limit) VALUES
  ('Snacks', 'cookie', 5000),
  ('Beverages', 'coffee', 8000),
  ('Cleaning Supplies', 'spray-can', 3000),
  ('Kitchen Essentials', 'utensils', 4000),
  ('Fruits & Fresh', 'apple', 3000)
ON CONFLICT (name) DO NOTHING;

-- Seed items
INSERT INTO grocery_items (name, unit, current_stock, min_stock, unit_price, brand) VALUES
  ('Instant Coffee', 'jar', 3, 1, 350, 'Nescafe'),
  ('Tea Bags', 'box', 5, 2, 180, 'Tetley'),
  ('Sugar (1kg)', 'kg', 4, 2, 120, NULL),
  ('Milk Powder', 'pack', 3, 1, 280, 'Diploma'),
  ('Biscuits', 'pack', 10, 5, 40, 'Olympic'),
  ('Mineral Water (1.5L)', 'bottle', 20, 10, 25, 'MUM'),
  ('Hand Wash', 'bottle', 4, 2, 150, 'Dettol'),
  ('Tissue Paper', 'box', 8, 3, 65, 'Fresh'),
  ('Floor Cleaner', 'bottle', 2, 1, 180, 'Lizol'),
  ('Paper Towels', 'roll', 6, 3, 45, NULL)
ON CONFLICT DO NOTHING;

-- =============================================
-- AIB-103: Card Management
-- =============================================

CREATE TABLE IF NOT EXISTS managed_cards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  card_type text NOT NULL CHECK (card_type IN ('business', 'access', 'corporate')),
  card_number text,
  card_name text NOT NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lost', 'expired', 'returned', 'ordered')),
  assigned_to uuid REFERENCES auth.users(id),
  assigned_employee_name text,
  department_id uuid,
  issued_date date,
  expiry_date date,
  returned_date date,

  -- Corporate card specific
  spending_limit numeric(12,2),
  current_balance numeric(12,2) DEFAULT 0,
  bank_name text,
  card_brand text CHECK (card_brand IN ('visa', 'mastercard', 'amex', 'other', NULL)),

  -- Business card specific
  design_template text,
  print_quantity integer,

  -- Access card specific
  access_level text CHECK (access_level IN ('full', 'floor', 'department', 'visitor', NULL)),
  access_zones text[] DEFAULT '{}',

  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id uuid REFERENCES managed_cards(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  merchant text,
  category text,
  transaction_date timestamptz DEFAULT now(),
  description text,
  receipt_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id uuid REFERENCES managed_cards(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id),
  assigned_by uuid REFERENCES auth.users(id),
  action text NOT NULL CHECK (action IN ('assigned', 'returned', 'lost_reported', 'replaced', 'renewed')),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_bulk_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  card_type text NOT NULL CHECK (card_type IN ('business', 'access')),
  quantity integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'cancelled')),
  vendor text,
  estimated_cost numeric(10,2),
  actual_cost numeric(10,2),
  order_date date,
  expected_delivery date,
  notes text,
  ordered_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cards_type ON managed_cards(card_type);
CREATE INDEX IF NOT EXISTS idx_cards_status ON managed_cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_assigned ON managed_cards(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cards_expiry ON managed_cards(expiry_date);
CREATE INDEX IF NOT EXISTS idx_card_transactions_card ON card_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_date ON card_transactions(transaction_date DESC);

-- RLS
ALTER TABLE managed_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_bulk_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read managed_cards" ON managed_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage managed_cards" ON managed_cards FOR ALL TO authenticated USING (true);
CREATE POLICY "auth read card_transactions" ON card_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage card_transactions" ON card_transactions FOR ALL TO authenticated USING (true);
CREATE POLICY "auth read card_assignments" ON card_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage card_assignments" ON card_assignments FOR ALL TO authenticated USING (true);
CREATE POLICY "auth read card_bulk_orders" ON card_bulk_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage card_bulk_orders" ON card_bulk_orders FOR ALL TO authenticated USING (true);

-- Seed sample cards
INSERT INTO managed_cards (card_type, card_name, status, description) VALUES
  ('access', 'Main Office Entry Card', 'active', 'Standard office access card'),
  ('access', 'Server Room Access', 'active', 'Restricted server room access'),
  ('business', 'Standard Business Card', 'active', 'EDUINT branded business card template'),
  ('corporate', 'Company Credit Card', 'active', 'Corporate Visa card for business expenses')
ON CONFLICT DO NOTHING;
