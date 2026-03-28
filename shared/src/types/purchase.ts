export interface PurchaseItem {
  id?: number;
  purchase_id?: number;
  item_id?: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Purchase {
  id?: number;
  date: string;
  total_amount: number;
  paid_amount: number;
  credit_amount: number;
  payment_status: 'paid' | 'credit' | 'partial';
  notes?: string;
  company_id?: number;
  employee_id?: number;
  company_name?: string;
  employee_name?: string;
  items?: PurchaseItem[];
  created_at?: string;
  updated_at?: string;
}

export interface CreatePurchaseRequest {
  date: string;
  paid_amount: number;
  notes?: string;
  items: Omit<PurchaseItem, 'id' | 'purchase_id'>[];
  company_id?: number;
  employee_id?: number;
}

export interface UpdatePurchaseRequest extends Partial<CreatePurchaseRequest> {}
