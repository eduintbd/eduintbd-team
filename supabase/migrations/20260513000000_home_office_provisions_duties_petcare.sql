-- =============================================
-- Home & Office Management Expansion
-- Monthly provisions, facility tasks, pet care
-- =============================================

-- ---------------------------------------------------------------------------
-- 1. Seed new grocery categories for staff food
-- ---------------------------------------------------------------------------

INSERT INTO grocery_categories (name, icon, budget_limit) VALUES
  ('Rice & Grains',        'wheat',     8000),
  ('Lentils & Pulses',     'bean',      4000),
  ('Cooking Oil & Spices', 'flame',     6000),
  ('Protein',              'drumstick', 10000),
  ('Vegetables',           'carrot',    5000),
  ('Condiments & Sauces',  'droplet',   2000)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Seed Bangladeshi staff food staples
-- ---------------------------------------------------------------------------

INSERT INTO grocery_items (name, category_id, unit, current_stock, min_stock, unit_price, brand) VALUES
  ('Miniket Rice (5kg)',     (SELECT id FROM grocery_categories WHERE name = 'Rice & Grains'),        'bag',    4, 2, 420,  'Pran'),
  ('Nazirshail Rice (5kg)',  (SELECT id FROM grocery_categories WHERE name = 'Rice & Grains'),        'bag',    2, 1, 480,  'ACI'),
  ('Atta / Flour (2kg)',     (SELECT id FROM grocery_categories WHERE name = 'Rice & Grains'),        'pack',   3, 1, 110,  'Teer'),
  ('Chira / Flattened Rice', (SELECT id FROM grocery_categories WHERE name = 'Rice & Grains'),        'kg',     2, 1,  80,  NULL),
  ('Masoor Dal (1kg)',       (SELECT id FROM grocery_categories WHERE name = 'Lentils & Pulses'),     'kg',     4, 2, 140,  NULL),
  ('Moog Dal (1kg)',         (SELECT id FROM grocery_categories WHERE name = 'Lentils & Pulses'),     'kg',     2, 1, 180,  NULL),
  ('Cholar Dal (1kg)',       (SELECT id FROM grocery_categories WHERE name = 'Lentils & Pulses'),     'kg',     2, 1, 160,  NULL),
  ('Soybean Oil (5L)',       (SELECT id FROM grocery_categories WHERE name = 'Cooking Oil & Spices'), 'bottle', 2, 1, 850,  'Teer'),
  ('Mustard Oil (1L)',       (SELECT id FROM grocery_categories WHERE name = 'Cooking Oil & Spices'), 'bottle', 3, 1, 220,  'Radhuni'),
  ('Turmeric Powder (200g)', (SELECT id FROM grocery_categories WHERE name = 'Cooking Oil & Spices'), 'pack',   4, 2,  60,  'Radhuni'),
  ('Chili Powder (200g)',    (SELECT id FROM grocery_categories WHERE name = 'Cooking Oil & Spices'), 'pack',   4, 2,  55,  'Radhuni'),
  ('Cumin Powder (100g)',    (SELECT id FROM grocery_categories WHERE name = 'Cooking Oil & Spices'), 'pack',   3, 1,  70,  'Pran'),
  ('Coriander Powder (100g)',(SELECT id FROM grocery_categories WHERE name = 'Cooking Oil & Spices'), 'pack',   3, 1,  50,  'Radhuni'),
  ('Salt (1kg)',             (SELECT id FROM grocery_categories WHERE name = 'Cooking Oil & Spices'), 'kg',     5, 2,  35,  'ACI'),
  ('Bay Leaves (50g)',       (SELECT id FROM grocery_categories WHERE name = 'Cooking Oil & Spices'), 'pack',   3, 1,  25,  NULL),
  ('Chicken (1kg)',          (SELECT id FROM grocery_categories WHERE name = 'Protein'),              'kg',     3, 1, 220,  NULL),
  ('Eggs (12 pcs)',          (SELECT id FROM grocery_categories WHERE name = 'Protein'),              'dozen',  4, 2, 160,  NULL),
  ('Rui Fish (1kg)',         (SELECT id FROM grocery_categories WHERE name = 'Protein'),              'kg',     2, 1, 350,  NULL),
  ('Pangas Fish (1kg)',      (SELECT id FROM grocery_categories WHERE name = 'Protein'),              'kg',     2, 1, 180,  NULL),
  ('Onions (1kg)',           (SELECT id FROM grocery_categories WHERE name = 'Vegetables'),           'kg',     5, 2,  60,  NULL),
  ('Garlic (500g)',          (SELECT id FROM grocery_categories WHERE name = 'Vegetables'),           'pack',   4, 2, 120,  NULL),
  ('Ginger (250g)',          (SELECT id FROM grocery_categories WHERE name = 'Vegetables'),           'pack',   4, 2,  80,  NULL),
  ('Potatoes (1kg)',         (SELECT id FROM grocery_categories WHERE name = 'Vegetables'),           'kg',     5, 2,  40,  NULL),
  ('Green Chili (250g)',     (SELECT id FROM grocery_categories WHERE name = 'Vegetables'),           'pack',   6, 3,  30,  NULL),
  ('Tomatoes (500g)',        (SELECT id FROM grocery_categories WHERE name = 'Vegetables'),           'pack',   4, 2,  35,  NULL),
  ('Tomato Ketchup (500ml)', (SELECT id FROM grocery_categories WHERE name = 'Condiments & Sauces'), 'bottle', 2, 1, 140,  'Pran'),
  ('Soy Sauce (250ml)',      (SELECT id FROM grocery_categories WHERE name = 'Condiments & Sauces'), 'bottle', 2, 1,  95,  'BD Food'),
  ('Vinegar (500ml)',        (SELECT id FROM grocery_categories WHERE name = 'Condiments & Sauces'), 'bottle', 2, 1,  60,  NULL);

-- ---------------------------------------------------------------------------
-- 3. Monthly provisions checklist
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grocery_monthly_provisions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id uuid REFERENCES grocery_items(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category_name text,
  month date NOT NULL,
  quantity_needed integer DEFAULT 0,
  quantity_purchased integer DEFAULT 0,
  is_purchased boolean DEFAULT false,
  estimated_unit_price numeric(10,2) DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_id, month)
);

-- ---------------------------------------------------------------------------
-- 4. Facility tasks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS facility_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text DEFAULT 'general',
  frequency text DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  assigned_to text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS facility_task_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES facility_tasks(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_by text,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, date)
);

-- Seed default facility tasks
INSERT INTO facility_tasks (name, category, frequency, assigned_to) VALUES
  ('Outside Cleaning',  'cleaning', 'daily', NULL),
  ('Gate Keeping',      'security', 'daily', NULL),
  ('Garbage Disposal',  'cleaning', 'daily', NULL),
  ('Office Cleaning',   'cleaning', 'daily', NULL),
  ('Coffee / Cooking',  'kitchen',  'daily', NULL);

-- ---------------------------------------------------------------------------
-- 5. Pet care
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pet_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  species text DEFAULT 'dog',
  breed text,
  date_of_birth date,
  photo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pet_food_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id uuid REFERENCES pet_profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  food_type text NOT NULL,
  brand text,
  quantity text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pet_grooming_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id uuid REFERENCES pet_profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  type text DEFAULT 'bath' CHECK (type IN ('bath', 'grooming', 'nail_trim', 'other')),
  next_due_date date,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pet_vaccines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id uuid REFERENCES pet_profiles(id) ON DELETE CASCADE,
  vaccine_name text NOT NULL,
  date_given date NOT NULL,
  next_due_date date,
  vet_name text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. RLS policies
-- ---------------------------------------------------------------------------

ALTER TABLE grocery_monthly_provisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_task_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_grooming_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_vaccines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read grocery_monthly_provisions" ON grocery_monthly_provisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage grocery_monthly_provisions" ON grocery_monthly_provisions FOR ALL TO authenticated USING (true);

CREATE POLICY "auth read facility_tasks" ON facility_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage facility_tasks" ON facility_tasks FOR ALL TO authenticated USING (true);

CREATE POLICY "auth read facility_task_logs" ON facility_task_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage facility_task_logs" ON facility_task_logs FOR ALL TO authenticated USING (true);

CREATE POLICY "auth read pet_profiles" ON pet_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage pet_profiles" ON pet_profiles FOR ALL TO authenticated USING (true);

CREATE POLICY "auth read pet_food_logs" ON pet_food_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage pet_food_logs" ON pet_food_logs FOR ALL TO authenticated USING (true);

CREATE POLICY "auth read pet_grooming_logs" ON pet_grooming_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage pet_grooming_logs" ON pet_grooming_logs FOR ALL TO authenticated USING (true);

CREATE POLICY "auth read pet_vaccines" ON pet_vaccines FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage pet_vaccines" ON pet_vaccines FOR ALL TO authenticated USING (true);
