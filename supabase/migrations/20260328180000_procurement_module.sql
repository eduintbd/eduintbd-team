-- =============================================
-- PROCUREMENT MODULE - Database Schema
-- Stationary is a sub-category under Procurement
-- =============================================

-- Procurement Categories (e.g., Stationary, IT Equipment, Furniture, Cleaning Supplies)
CREATE TABLE IF NOT EXISTS procurement_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default categories
INSERT INTO procurement_categories (name, description) VALUES
    ('Stationary', 'Office stationery and writing supplies'),
    ('IT Equipment', 'Computers, peripherals, and tech accessories'),
    ('Furniture', 'Office desks, chairs, and storage'),
    ('Cleaning Supplies', 'Cleaning and hygiene products'),
    ('Pantry Supplies', 'Kitchen and pantry consumables'),
    ('Printing & Packaging', 'Printers, cartridges, and packaging materials'),
    ('General', 'Miscellaneous office supplies')
ON CONFLICT (name) DO NOTHING;

-- Vendors / Suppliers
CREATE TABLE IF NOT EXISTS vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Procurement Items Catalog
CREATE TABLE IF NOT EXISTS procurement_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT DEFAULT 'pcs',
    category_id UUID REFERENCES procurement_categories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Orders
CREATE TYPE purchase_order_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'ordered', 'received', 'cancelled');

CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    po_number TEXT NOT NULL UNIQUE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor_id UUID REFERENCES vendors(id),
    category_id UUID REFERENCES procurement_categories(id),
    requested_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    status purchase_order_status DEFAULT 'draft',
    total_amount NUMERIC(12,2) DEFAULT 0,
    paid_amount NUMERIC(12,2) DEFAULT 0,
    credit_amount NUMERIC(12,2) DEFAULT 0,
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
    notes TEXT,
    approved_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Order Line Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES procurement_items(id),
    item_name TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Procurement Payments
CREATE TABLE IF NOT EXISTS procurement_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_order_id UUID REFERENCES purchase_orders(id),
    vendor_id UUID REFERENCES vendors(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'mobile_banking', 'card')),
    reference_number TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
    year_prefix TEXT;
BEGIN
    year_prefix := to_char(CURRENT_DATE, 'YYYY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 8) AS INTEGER)), 0) + 1
    INTO next_num
    FROM purchase_orders
    WHERE po_number LIKE 'PO-' || year_prefix || '-%';

    NEW.po_number := 'PO-' || year_prefix || '-' || LPAD(next_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_po_number
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW
    WHEN (NEW.po_number IS NULL OR NEW.po_number = '')
    EXECUTE FUNCTION generate_po_number();

-- Update payment totals on purchase order when payment is made
CREATE OR REPLACE FUNCTION update_po_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
    total_paid NUMERIC(12,2);
    po_total NUMERIC(12,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM procurement_payments
    WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    SELECT total_amount INTO po_total
    FROM purchase_orders
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    UPDATE purchase_orders
    SET paid_amount = total_paid,
        credit_amount = po_total - total_paid,
        payment_status = CASE
            WHEN total_paid >= po_total THEN 'paid'
            WHEN total_paid > 0 THEN 'partial'
            ELSE 'unpaid'
        END,
        updated_at = now()
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_procurement_payment
    AFTER INSERT OR UPDATE OR DELETE ON procurement_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_po_payment_totals();

-- Update PO total when line items change
CREATE OR REPLACE FUNCTION update_po_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE purchase_orders
    SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM purchase_order_items
        WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
    ),
    updated_at = now()
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_po_item_change
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_po_total();

-- Enable RLS
ALTER TABLE procurement_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: authenticated users can read, admin/procurement roles can write
CREATE POLICY "Authenticated users can view procurement_categories" ON procurement_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage procurement_categories" ON procurement_categories FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin'))
);

CREATE POLICY "Authenticated users can view vendors" ON vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage vendors" ON vendors FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin'))
);

CREATE POLICY "Authenticated users can view procurement_items" ON procurement_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage procurement_items" ON procurement_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin'))
);

CREATE POLICY "Authenticated users can view purchase_orders" ON purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage purchase_orders" ON purchase_orders FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin'))
);

CREATE POLICY "Authenticated users can view purchase_order_items" ON purchase_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage purchase_order_items" ON purchase_order_items FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin'))
);

CREATE POLICY "Authenticated users can view procurement_payments" ON procurement_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage procurement_payments" ON procurement_payments FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin'))
);
