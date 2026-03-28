export const STORE_NAME = 'Bhai Bhai Store';

export const PAYMENT_STATUS = {
  PAID: 'paid' as const,
  CREDIT: 'credit' as const,
  PARTIAL: 'partial' as const,
};

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bkash', label: 'bKash' },
  { value: 'bank', label: 'Bank Transfer' },
];

export const ITEM_UNITS = [
  { value: 'pcs', label: 'Pieces' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'g', label: 'Gram' },
  { value: 'litre', label: 'Litre' },
  { value: 'pack', label: 'Pack' },
  { value: 'dozen', label: 'Dozen' },
  { value: 'bag', label: 'Bag' },
];

export const ITEM_CATEGORIES = [
  'general',
  'vegetables',
  'fruits',
  'dairy',
  'spices',
  'oil',
  'rice & grains',
  'snacks',
  'beverages',
  'cleaning',
  'other',
];
