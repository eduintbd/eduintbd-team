export interface Item {
  id?: number;
  name: string;
  unit: string;
  category: string;
  created_at?: string;
}

export interface CreateItemRequest {
  name: string;
  unit?: string;
  category?: string;
}
